#!/usr/bin/env python3
"""
SINTESI — run a synthesis session against a local ComfyUI server.

    pip install pillow
    python tools/comfy/run_session.py tools/comfy/session_01.json [--server http://127.0.0.1:8188] [--check]

Steps (all seeds fixed, every call logged in <output>/session.log.json):
  0. preflight  — nodes and model files exist on the server (--check stops here)
  1. prepare    — crop P1 to 9:16, write observed (black and white) at master size,
                  working-size plate and masks (Pillow, deterministic)
  2. resynthesis — the whole photograph regenerated at low denoise → base
  3. synthesis  — the system's decisions, region by region, on the base
  4. alternatives — the other proposals, each on the same base
  5. upscale    — every picture to 2160 × 3840
  6. depth      — Depth Anything V2 Small on the synthesis

Nothing is sent anywhere but the local ComfyUI server.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

from PIL import Image, ImageOps

sys.path.insert(0, str(Path(__file__).parent))
import graphs  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]


class Comfy:
    def __init__(self, server: str, log: list) -> None:
        self.server = server.rstrip("/")
        self.client = str(uuid.uuid4())
        self.log = log
        self.schema: dict = {}

    def _get(self, path: str) -> bytes:
        with urllib.request.urlopen(self.server + path, timeout=60) as r:
            return r.read()

    def object_info(self) -> dict:
        self.schema = json.loads(self._get("/object_info"))
        return self.schema

    def upload(self, path: Path, name: str) -> str:
        boundary = uuid.uuid4().hex
        data = path.read_bytes()
        body = (
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"overwrite\"\r\n\r\ntrue\r\n"
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"{name}\"\r\n"
            f"Content-Type: image/png\r\n\r\n"
        ).encode() + data + f"\r\n--{boundary}--\r\n".encode()
        req = urllib.request.Request(self.server + "/upload/image", data=body, method="POST",
                                     headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
        with urllib.request.urlopen(req, timeout=120) as r:
            res = json.loads(r.read())
        return res["name"] if not res.get("subfolder") else f'{res["subfolder"]}/{res["name"]}'

    def adapt(self, graph: graphs.Graph) -> graphs.Graph:
        """Drop inputs this ComfyUI version does not declare (e.g. the optional vae of ControlNetApplyAdvanced)."""
        for node in graph.values():
            spec = self.schema.get(node["class_type"], {}).get("input", {})
            declared = set(spec.get("required", {})) | set(spec.get("optional", {}))
            if declared:
                node["inputs"] = {k: v for k, v in node["inputs"].items() if k in declared}
        return graph

    def run(self, step: str, graph: graphs.Graph, save_node: str) -> bytes:
        errors = graphs.validate(graph)
        if errors:
            raise SystemExit(f"{step}: invalid graph\n  " + "\n  ".join(errors))
        graph = self.adapt(graph)
        payload = json.dumps({"prompt": graph, "client_id": self.client}).encode()
        req = urllib.request.Request(self.server + "/prompt", data=payload, method="POST", headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                pid = json.loads(r.read())["prompt_id"]
        except urllib.error.HTTPError as e:
            raise SystemExit(f"{step}: ComfyUI refused the graph:\n{e.read().decode(errors='replace')}")
        t0 = time.time()
        while True:
            hist = json.loads(self._get(f"/history/{pid}"))
            if pid in hist:
                entry = hist[pid]
                status = entry.get("status", {})
                if status.get("status_str") == "error":
                    raise SystemExit(f"{step}: execution error: {json.dumps(status)[:2000]}")
                imgs = entry.get("outputs", {}).get(save_node, {}).get("images", [])
                if imgs:
                    im = imgs[0]
                    q = urllib.parse.urlencode({"filename": im["filename"], "subfolder": im.get("subfolder", ""), "type": im.get("type", "output")})
                    data = self._get(f"/view?{q}")
                    self.log.append({"step": step, "prompt_id": pid, "seconds": round(time.time() - t0, 1), "graph": graph})
                    return data
            if time.time() - t0 > 3600:
                raise SystemExit(f"{step}: timed out")
            time.sleep(1.0)


def preflight(c: Comfy, cfg: dict) -> list[str]:
    schema = c.object_info()
    problems = []
    needed = set(graphs.NODE_INPUTS)
    for n in sorted(needed):
        if n not in schema:
            hint = " (install comfyui_controlnet_aux)" if n == "DepthAnythingV2Preprocessor" else ""
            problems.append(f"node missing: {n}{hint}")

    def choices(node: str, inp: str) -> list:
        spec = schema.get(node, {}).get("input", {})
        for group in ("required", "optional"):
            v = spec.get(group, {}).get(inp)
            if v and isinstance(v[0], list):
                return v[0]
        return []

    m = cfg["models"]
    for node, inp, name in [("CheckpointLoaderSimple", "ckpt_name", m["checkpoint"]),
                            ("ControlNetLoader", "control_net_name", m["controlnet_depth"]),
                            ("UpscaleModelLoader", "model_name", m["upscaler"]),
                            ("DepthAnythingV2Preprocessor", "ckpt_name", m["depth"])]:
        if node in schema and name not in choices(node, inp):
            problems.append(f"model not found by {node}: {name} (available: {', '.join(map(str, choices(node, inp)[:6])) or 'none'})")
    return problems


def crop_916(im: Image.Image, cx: float, cy: float) -> Image.Image:
    w, h = im.size
    tw, th = (w, round(w * 16 / 9)) if w * 16 / 9 <= h else (round(h * 9 / 16), h)
    x0 = min(max(0, round(cx * w - tw / 2)), w - tw)
    y0 = min(max(0, round(cy * h - th / 2)), h - th)
    return im.crop((x0, y0, x0 + tw, y0 + th))


def prepare(cfg: dict, out: Path) -> dict:
    intake = ROOT / cfg["intake"]
    W, H = cfg["working"]["width"], cfg["working"]["height"]
    MW, MH = cfg["master"]["width"], cfg["master"]["height"]
    prep = out / "prepared"
    prep.mkdir(parents=True, exist_ok=True)
    with Image.open(intake / cfg["plate"]["file"]) as p:
        full_plate = ImageOps.exif_transpose(p).convert("RGB")
    plate = crop_916(full_plate, cfg["plate"]["crop_x"], cfg["plate"]["crop_y"])
    master = plate.resize((MW, MH), Image.LANCZOS)
    # What the archive recorded: black and white. Never shown in colour, never generated.
    ImageOps.grayscale(master).save(out / "observed.png")
    plate.resize((W, H), Image.LANCZOS).save(prep / "plate.png")
    files = {"plate": prep / "plate.png"}
    # Masks for inpainting (regions) and masks that only tell the engine what the picture is (epistemic).
    masks = {region: r["mask"] for region, r in cfg["regions"].items()} | cfg.get("epistemic_masks", {})
    for region, mask in masks.items():
        with Image.open(intake / mask) as m:
            full = ImageOps.exif_transpose(m).convert("L")
        # Masks are painted on the full P1: they receive exactly the same crop.
        if full.size != full_plate.size:
            raise SystemExit(f"{mask}: {full.size} differs from P1 {full_plate.size}")
        mc = crop_916(full, cfg["plate"]["crop_x"], cfg["plate"]["crop_y"])
        mc.resize((MW, MH), Image.LANCZOS).save(out / f"mask-{region}.png")
        if region in cfg["regions"]:
            mc.resize((W, H), Image.LANCZOS).convert("RGB").save(prep / f"mask-{region}.png")
            files[f"mask-{region}"] = prep / f"mask-{region}.png"
    return files


def percepibile(cfg: dict) -> str:
    text = (ROOT / cfg["intake"] / "00_firma" / "firma.txt").read_text(encoding="utf-8")
    for line in text.splitlines():
        if line.lower().startswith("percepibile"):
            return line.split(":", 1)[1].strip()
    raise SystemExit("firma.txt has no 'percepibile' line")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("config")
    ap.add_argument("--server", default="http://127.0.0.1:8188")
    ap.add_argument("--check", action="store_true", help="preflight only")
    args = ap.parse_args()
    cfg = json.loads(Path(args.config).read_text(encoding="utf-8"))
    out = ROOT / cfg["output"]
    out.mkdir(parents=True, exist_ok=True)
    log: list = []
    c = Comfy(args.server, log)

    problems = preflight(c, cfg)
    for p in problems:
        print("✗", p)
    if problems:
        raise SystemExit(1)
    print("✓ preflight: nodes and models found")
    if args.check:
        return

    files = prepare(cfg, out)
    uploaded = {k: c.upload(v, f"{cfg['session']}-{v.name}") for k, v in files.items()}
    print("✓ prepared and uploaded plate and masks")

    def save(name: str, data: bytes) -> Path:
        path = out / "working" / f"{name}.png"
        path.parent.mkdir(exist_ok=True)
        path.write_bytes(data)
        return path

    g, s = graphs.resynthesis(cfg, uploaded["plate"], f"{cfg['session']}/base")
    base = save("base", c.run("resynthesis", g, s))
    base_name = c.upload(base, f"{cfg['session']}-base.png")
    print("✓ base (every pixel regenerated)")

    view_words = percepibile(cfg)

    def apply(label: str, proposals: dict, order: list, seed: int) -> Path:
        current = base_name
        path = base
        for i, region in enumerate(order):
            r = cfg["regions"][region]
            text = proposals[region].replace("{percepibile}", view_words)
            g, s = graphs.decide(cfg, current, uploaded[f"mask-{region}"], text, r["denoise"], seed + i, r["grow"], f"{cfg['session']}/{label}-{region}")
            path = save(f"{label}-{i + 1}-{region}", c.run(f"{label}:{region}", g, s))
            current = c.upload(path, f"{cfg['session']}-{label}-{region}.png")
        return path

    order = cfg["synthesis"]["order"]
    finals = {"synthesis": apply("synthesis", cfg["synthesis"]["proposals"], order, cfg["synthesis"]["seed"])}
    print("✓ synthesis")
    for alt in cfg["alternatives"]:
        finals[alt["id"]] = apply(alt["id"], alt["proposals"], order, alt["seed"])
        print(f"✓ {alt['id']}")

    for name, path in finals.items():
        g, s = graphs.upscale(cfg, c.upload(path, f"{cfg['session']}-{name}-final.png"), f"{cfg['session']}/{name}-master")
        (out / f"{name}.png").write_bytes(c.run(f"upscale:{name}", g, s))
    print("✓ upscaled to master size")

    g, s = graphs.depth(cfg, c.upload(out / "synthesis.png", f"{cfg['session']}-synthesis-master.png"), f"{cfg['session']}/depth")
    (out / "depth.png").write_bytes(c.run("depth", g, s))
    print("✓ depth")

    (out / "session.log.json").write_text(json.dumps({"config": cfg, "percepibile": view_words, "steps": log}, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"done → {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
