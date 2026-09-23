"""
SINTESI — ComfyUI graphs (API format) for the synthesis session.

Only core ComfyUI nodes, plus DepthAnythingV2Preprocessor from
comfyui_controlnet_aux. Each builder returns (graph, output_node_id).

  resynthesis  every pixel of the photograph is regenerated at low denoise,
               held by its own depth: nothing of the archive survives as pixels
  decide       inpaints one region with one proposal, composited back so that
               outside the mask the picture is identical to its source
  upscale      Real-ESRGAN ×2, then Lanczos to the exact master size
  depth        Depth Anything V2 (Small) on the final synthesis
"""
from __future__ import annotations

from typing import Any

Graph = dict[str, dict[str, Any]]

# The inputs each node needs (for validation before anything is queued).
NODE_INPUTS: dict[str, list[str]] = {
    "CheckpointLoaderSimple": ["ckpt_name"],
    "LoadImage": ["image"],
    "LoadImageMask": ["image", "channel"],
    "CLIPTextEncode": ["text", "clip"],
    "VAEEncode": ["pixels", "vae"],
    "VAEDecode": ["samples", "vae"],
    "ControlNetLoader": ["control_net_name"],
    "ControlNetApplyAdvanced": ["positive", "negative", "control_net", "image", "strength", "start_percent", "end_percent"],
    "DepthAnythingV2Preprocessor": ["image", "ckpt_name", "resolution"],
    "KSampler": ["model", "seed", "steps", "cfg", "sampler_name", "scheduler", "positive", "negative", "latent_image", "denoise"],
    "GrowMask": ["mask", "expand", "tapered_corners"],
    "InpaintModelConditioning": ["positive", "negative", "vae", "pixels", "mask", "noise_mask"],
    "ImageCompositeMasked": ["destination", "source", "x", "y", "resize_source", "mask"],
    "UpscaleModelLoader": ["model_name"],
    "ImageUpscaleWithModel": ["upscale_model", "image"],
    "ImageScale": ["image", "upscale_method", "width", "height", "crop"],
    "SaveImage": ["images", "filename_prefix"],
}


class Builder:
    def __init__(self) -> None:
        self.graph: Graph = {}
        self.n = 0

    def add(self, class_type: str, **inputs: Any) -> str:
        self.n += 1
        nid = str(self.n)
        self.graph[nid] = {"class_type": class_type, "inputs": inputs}
        return nid


def out(nid: str, index: int = 0) -> list:
    return [nid, index]


def _sampler(b: Builder, model: str, pos: list, neg: list, latent: list, p: dict, seed: int, denoise: float) -> str:
    return b.add("KSampler", model=out(model), seed=seed, steps=p["steps"], cfg=p["cfg"],
                 sampler_name=p["sampler"], scheduler=p["scheduler"],
                 positive=pos, negative=neg, latent_image=latent, denoise=denoise)


def resynthesis(p: dict, image: str, prefix: str) -> tuple[Graph, str]:
    b = Builder()
    ck = b.add("CheckpointLoaderSimple", ckpt_name=p["models"]["checkpoint"])
    img = b.add("LoadImage", image=image)
    pos = b.add("CLIPTextEncode", text=p["style"]["positive"], clip=out(ck, 1))
    neg = b.add("CLIPTextEncode", text=p["style"]["negative"], clip=out(ck, 1))
    depth = b.add("DepthAnythingV2Preprocessor", image=out(img), ckpt_name=p["models"]["depth"], resolution=1024)
    cn = b.add("ControlNetLoader", control_net_name=p["models"]["controlnet_depth"])
    r = p["resynthesis"]
    apply = b.add("ControlNetApplyAdvanced", positive=out(pos), negative=out(neg), control_net=out(cn), image=out(depth),
                  strength=r["controlnet_strength"], start_percent=0.0, end_percent=r["controlnet_end"], vae=out(ck, 2))
    lat = b.add("VAEEncode", pixels=out(img), vae=out(ck, 2))
    ks = _sampler(b, ck, out(apply, 0), out(apply, 1), out(lat), p["sampler"], r["seed"], r["denoise"])
    dec = b.add("VAEDecode", samples=out(ks), vae=out(ck, 2))
    save = b.add("SaveImage", images=out(dec), filename_prefix=prefix)
    return b.graph, save


def decide(p: dict, image: str, mask: str, proposal: str, denoise: float, seed: int, grow: int, prefix: str) -> tuple[Graph, str]:
    """One proposal for one region. Outside the mask the result equals the input exactly."""
    b = Builder()
    ck = b.add("CheckpointLoaderSimple", ckpt_name=p["models"]["checkpoint"])
    img = b.add("LoadImage", image=image)
    m = b.add("LoadImageMask", image=mask, channel="red")
    mg = b.add("GrowMask", mask=out(m), expand=grow, tapered_corners=True)
    pos = b.add("CLIPTextEncode", text=f'{proposal}, {p["style"]["positive"]}', clip=out(ck, 1))
    neg = b.add("CLIPTextEncode", text=p["style"]["negative"], clip=out(ck, 1))
    cond = b.add("InpaintModelConditioning", positive=out(pos), negative=out(neg), vae=out(ck, 2),
                 pixels=out(img), mask=out(mg), noise_mask=True)
    ks = _sampler(b, ck, out(cond, 0), out(cond, 1), out(cond, 2), p["sampler"], seed, denoise)
    dec = b.add("VAEDecode", samples=out(ks), vae=out(ck, 2))
    comp = b.add("ImageCompositeMasked", destination=out(img), source=out(dec), x=0, y=0, resize_source=False, mask=out(mg))
    save = b.add("SaveImage", images=out(comp), filename_prefix=prefix)
    return b.graph, save


def upscale(p: dict, image: str, prefix: str) -> tuple[Graph, str]:
    b = Builder()
    img = b.add("LoadImage", image=image)
    um = b.add("UpscaleModelLoader", model_name=p["models"]["upscaler"])
    up = b.add("ImageUpscaleWithModel", upscale_model=out(um), image=out(img))
    sc = b.add("ImageScale", image=out(up), upscale_method="lanczos", width=p["master"]["width"], height=p["master"]["height"], crop="disabled")
    save = b.add("SaveImage", images=out(sc), filename_prefix=prefix)
    return b.graph, save


def depth(p: dict, image: str, prefix: str) -> tuple[Graph, str]:
    b = Builder()
    img = b.add("LoadImage", image=image)
    d = b.add("DepthAnythingV2Preprocessor", image=out(img), ckpt_name=p["models"]["depth"], resolution=1024)
    sc = b.add("ImageScale", image=out(d), upscale_method="bilinear", width=p["master"]["width"], height=p["master"]["height"], crop="disabled")
    save = b.add("SaveImage", images=out(sc), filename_prefix=prefix)
    return b.graph, save


def validate(graph: Graph) -> list[str]:
    """Structural check: known nodes, required inputs, links to existing outputs."""
    errors = []
    for nid, node in graph.items():
        ct = node.get("class_type")
        if ct not in NODE_INPUTS:
            errors.append(f"{nid}: unknown node {ct}")
            continue
        for name in NODE_INPUTS[ct]:
            if name not in node["inputs"]:
                errors.append(f"{nid} {ct}: missing input {name}")
        for name, v in node["inputs"].items():
            if isinstance(v, list) and len(v) == 2 and isinstance(v[0], str):
                if v[0] not in graph:
                    errors.append(f"{nid} {ct}.{name}: link to missing node {v[0]}")
                elif int(v[0]) >= int(nid):
                    errors.append(f"{nid} {ct}.{name}: link forward to {v[0]}")
    return errors
