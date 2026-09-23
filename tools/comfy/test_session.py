#!/usr/bin/env python3
"""
End-to-end test of run_session.py against a mock ComfyUI server that speaks the
same HTTP API (/object_info, /upload/image, /prompt, /history, /view) and
rejects graphs the way ComfyUI does (unknown node, missing input, unknown model).

    python tools/comfy/test_session.py
"""
from __future__ import annotations

import io
import json
import shutil
import subprocess
import sys
import tempfile
import threading
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from PIL import Image

HERE = Path(__file__).parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE))
import graphs  # noqa: E402

CFG = json.loads((HERE / "session_01.json").read_text())
M = CFG["models"]
MODELS = {
    ("CheckpointLoaderSimple", "ckpt_name"): [M["checkpoint"], "sd_xl_base_1.0.safetensors"],
    ("ControlNetLoader", "control_net_name"): [M["controlnet_depth"]],
    ("UpscaleModelLoader", "model_name"): [M["upscaler"]],
    ("DepthAnythingV2Preprocessor", "ckpt_name"): [M["depth"], "depth_anything_v2_vitl.pth"],
}


def schema() -> dict:
    out = {}
    for node, inputs in graphs.NODE_INPUTS.items():
        req = {}
        for i in inputs:
            # Emulate an older ComfyUI: ControlNetApplyAdvanced without the optional vae.
            req[i] = [MODELS[(node, i)]] if (node, i) in MODELS else ["*"]
        out[node] = {"input": {"required": req, "optional": {}}}
    return out


SCHEMA = schema()
STATE = {"uploads": {}, "history": {}, "prompts": 0}


def fake_output(graph: dict) -> Image.Image:
    # A graph ending in ImageScale produces the master size, otherwise the working size.
    scale = next((n for n in graph.values() if n["class_type"] == "ImageScale"), None)
    w, h = (scale["inputs"]["width"], scale["inputs"]["height"]) if scale else (CFG["working"]["width"], CFG["working"]["height"])
    return Image.new("RGB", (w, h), (120, 110, 100))


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a) -> None:  # silence
        pass

    def _json(self, code: int, obj) -> None:
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path == "/object_info":
            return self._json(200, SCHEMA)
        if self.path.startswith("/history/"):
            pid = self.path.split("/")[-1]
            return self._json(200, {pid: STATE["history"][pid]} if pid in STATE["history"] else {})
        if self.path.startswith("/view"):
            from urllib.parse import parse_qs, urlparse
            name = parse_qs(urlparse(self.path).query)["filename"][0]
            data = STATE["uploads"][name]
            self.send_response(200)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        self._json(404, {})

    def do_POST(self) -> None:
        length = int(self.headers["Content-Length"])
        body = self.rfile.read(length)
        if self.path == "/upload/image":
            boundary = self.headers["Content-Type"].split("boundary=")[1].encode()
            for part in body.split(b"--" + boundary):
                if b'name="image"' in part:
                    head, data = part.split(b"\r\n\r\n", 1)
                    name = head.split(b'filename="')[1].split(b'"')[0].decode()
                    Image.open(io.BytesIO(data[:-2])).verify()
                    STATE["uploads"][name] = data[:-2]
                    return self._json(200, {"name": name, "subfolder": "", "type": "input"})
            return self._json(400, {"error": "no image"})
        if self.path == "/prompt":
            graph = json.loads(body)["prompt"]
            errors = []
            for nid, node in graph.items():
                spec = SCHEMA.get(node["class_type"])
                if not spec:
                    errors.append(f"{nid}: unknown node {node['class_type']}")
                    continue
                req = spec["input"]["required"]
                for k in req:
                    if k not in node["inputs"]:
                        errors.append(f"{nid}: missing {k}")
                for k, v in node["inputs"].items():
                    if k not in req:
                        errors.append(f"{nid}: undeclared input {k}")
                    elif isinstance(req[k][0], list) and v not in req[k][0]:
                        errors.append(f"{nid}: value not in list {k}={v}")
                    if node["class_type"] in ("LoadImage", "LoadImageMask") and k == "image" and v not in STATE["uploads"]:
                        errors.append(f"{nid}: image not uploaded {v}")
            if errors:
                return self._json(400, {"error": "prompt invalid", "node_errors": errors})
            pid = uuid.uuid4().hex
            save = next(nid for nid, n in graph.items() if n["class_type"] == "SaveImage")
            name = f"out_{STATE['prompts']}.png"
            STATE["prompts"] += 1
            buf = io.BytesIO()
            fake_output(graph).save(buf, "PNG")
            STATE["uploads"][name] = buf.getvalue()
            STATE["history"][pid] = {"status": {"status_str": "success"}, "outputs": {save: {"images": [{"filename": name, "subfolder": "", "type": "output"}]}}}
            return self._json(200, {"prompt_id": pid})
        self._json(404, {})


def make_intake(root: Path) -> None:
    W, H = 3375, 6000  # a 2:3 vertical frame, cropped to 9:16 by the runner
    (root / "00_firma").mkdir(parents=True)
    (root / "00_firma" / "firma.txt").write_text("tipo: audio\ndata: ca. 2009\npercepibile: PERCEPIBILE_TEST\n", encoding="utf-8")
    (root / "01_scena").mkdir()
    Image.new("RGB", (W, H), (90, 90, 90)).save(root / "01_scena" / "P1.tif")
    (root / "09_maschere").mkdir()
    for name in ("view", "wall", "vessel", "coat", "gaze", "figure"):
        m = Image.new("L", (W, H), 0)
        m.paste(255, (200, 200, 900, 1200))
        m.save(root / "09_maschere" / f"{name}.png")


def main() -> int:
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    tmp = Path(tempfile.mkdtemp(prefix="sintesi-intake-", dir=ROOT / "archive"))
    try:
        make_intake(tmp)
        cfg = dict(CFG, intake=str(tmp.relative_to(ROOT)), output=str((tmp / "out").relative_to(ROOT)))
        cfg_path = tmp / "session.json"
        cfg_path.write_text(json.dumps(cfg), encoding="utf-8")
        url = f"http://127.0.0.1:{server.server_address[1]}"
        r = subprocess.run([sys.executable, str(HERE / "run_session.py"), str(cfg_path), "--server", url], capture_output=True, text=True)
        print(r.stdout, r.stderr)
        assert r.returncode == 0, "runner failed"
        out = tmp / "out"
        for name in ("observed", "synthesis", "alt-1", "alt-2", "alt-3", "depth", "mask-figure", "mask-gaze"):
            with Image.open(out / f"{name}.png") as im:
                assert im.size == (2160, 3840), f"{name}: {im.size}"
        assert Image.open(out / "observed.png").mode == "L", "observed must be black and white"
        log = json.loads((out / "session.log.json").read_text())
        steps = [s["step"] for s in log["steps"]]
        assert steps[0] == "resynthesis" and steps[-1] == "depth" and len(steps) == 1 + 4 * 5 + 4 + 1, steps
        view = next(s for s in log["steps"] if s["step"] == "synthesis:view")
        texts = [n["inputs"].get("text", "") for n in view["graph"].values()]
        assert any("PERCEPIBILE_TEST" in t for t in texts), "the view must come from firma.txt"
        cn = next(n for s in log["steps"] if s["step"] == "resynthesis" for n in s["graph"].values() if n["class_type"] == "ControlNetApplyAdvanced")
        assert "vae" not in cn["inputs"], "undeclared inputs must be dropped for older ComfyUI"
        # A model that is not installed stops the session at preflight, before anything runs.
        bad = dict(cfg, models=dict(cfg["models"], checkpoint="missing.safetensors"))
        cfg_path.write_text(json.dumps(bad), encoding="utf-8")
        r = subprocess.run([sys.executable, str(HERE / "run_session.py"), str(cfg_path), "--server", url, "--check"], capture_output=True, text=True)
        assert r.returncode == 1 and "missing.safetensors" in r.stdout, r.stdout
        print(f"✓ {len(steps)} graphs accepted, outputs at 2160×3840, view from firma.txt, observed is B/W, missing model caught at preflight")
        return 0
    finally:
        shutil.rmtree(tmp)
        server.shutdown()


if __name__ == "__main__":
    sys.exit(main())
