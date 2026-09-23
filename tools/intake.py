#!/usr/bin/env python3
"""
SINTESI — verify the archive material delivered according to docs/CAPTURE_PROTOCOL.md.

    pip install pillow
    python tools/intake.py archive/intake

Checks presence, formats, resolution, bit depth, audio duration, the text
files' structure, and GPS coordinates left in the files. Writes
<intake>/INTAKE_REPORT.md. It never modifies or uploads anything.
"""
from __future__ import annotations

import re
import sys
import wave
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("Pillow is required: pip install pillow")

Image.MAX_IMAGE_PIXELS = None

RAW_EXT = {".dng", ".cr2", ".cr3", ".nef", ".arw", ".raf", ".orf", ".rw2"}
AUDIO_EXT = {".wav", ".m4a", ".mp3", ".aac", ".flac", ".aiff", ".aif", ".mov", ".mp4"}
MASKS = ["view", "wall", "vessel", "coat", "gaze", "figure"]


class Report:
    def __init__(self) -> None:
        self.lines: list[str] = []
        self.errors = 0
        self.warnings = 0

    def section(self, title: str) -> None:
        self.lines.append(f"\n## {title}\n")

    def ok(self, msg: str) -> None:
        self.lines.append(f"- ✓ {msg}")

    def warn(self, msg: str) -> None:
        self.warnings += 1
        self.lines.append(f"- ⚠ {msg}")

    def err(self, msg: str) -> None:
        self.errors += 1
        self.lines.append(f"- ✗ {msg}")


def find(folder: Path, stem: str, exts: set[str] | None = None) -> list[Path]:
    if not folder.is_dir():
        return []
    out = []
    for p in sorted(folder.iterdir()):
        if p.is_file() and p.stem.lower() == stem.lower() and (exts is None or p.suffix.lower() in exts):
            out.append(p)
    return out


def image_info(path: Path) -> tuple[int, int, int, bool]:
    """(width, height, bits per sample, has GPS)."""
    with Image.open(path) as im:
        w, h = im.size
        bits = 8
        gps = False
        tags = getattr(im, "tag_v2", None)
        if tags is not None:
            b = tags.get(258)
            if b:
                bits = max(b) if isinstance(b, tuple) else int(b)
            gps = 34853 in tags
        else:
            if im.mode in ("I;16", "I;16B", "I;16L", "I"):
                bits = 16
            try:
                gps = bool(im.getexif().get_ifd(0x8825))
            except Exception:
                gps = False
        return w, h, bits, gps


def check_image(r: Report, path: Path, *, min_long: int = 0, bits16: bool = False, label: str = "") -> tuple[int, int] | None:
    try:
        w, h, bits, gps = image_info(path)
    except Exception as e:  # noqa: BLE001
        r.err(f"{label or path.name}: unreadable ({e})")
        return None
    msg = f"{label or path.name}: {w}×{h}, {bits} bit"
    problems = []
    if min_long and max(w, h) < min_long:
        problems.append(f"long side < {min_long} px")
    if bits16 and bits < 16:
        problems.append("expected 16 bit")
    if problems:
        r.err(f"{msg} — {', '.join(problems)}")
    else:
        r.ok(msg)
    if gps:
        r.err(f"{path.name}: contains GPS coordinates — remove them (exiftool -gps:all= FILE)")
    return w, h


def check_text(r: Report, path: Path, label: str) -> str | None:
    if not path.is_file():
        r.err(f"{label}: missing ({path.name})")
        return None
    text = path.read_text(encoding="utf-8").strip()
    if not text:
        r.err(f"{label}: empty")
        return None
    return text


def main(root: Path) -> int:
    r = Report()
    if not root.is_dir():
        sys.exit(f"not a folder: {root}")

    # F1 — signature trace
    r.section("F1 · traccia firma")
    d = root / "00_firma"
    trace = [p for p in (d.iterdir() if d.is_dir() else []) if p.stem.lower() == "firma" and p.suffix.lower() != ".txt"]
    if not trace:
        r.err("firma.<ext>: missing")
    else:
        r.ok(f"{trace[0].name} ({trace[0].stat().st_size / 1e6:.1f} MB)")
        if trace[0].suffix.lower() in {".tif", ".tiff", ".jpg", ".jpeg", ".png"}:
            check_image(r, trace[0], label=trace[0].name)
    t = check_text(r, d / "firma.txt", "firma.txt")
    if t:
        fields = dict(re.findall(r"^\s*([a-zà ]+?)\s*:\s*(.+?)\s*$", t, flags=re.M | re.I))
        fields = {k.strip().lower(): v for k, v in fields.items()}
        for key in ("tipo", "data", "percepibile"):
            (r.ok if fields.get(key) else r.err)(f"firma.txt · {key}: {fields.get(key, 'missing')}")
        if fields.get("tipo", "").lower() not in {"audio", "foto", "documento"}:
            r.err("firma.txt · tipo must be audio | foto | documento")
        words = [w for w in re.split(r"[,;]\s*", fields.get("percepibile", "")) if w]
        if not 1 <= len(words) <= 3:
            r.err("firma.txt · percepibile: 1–3 nouns")

    # P / D — the session in the room
    r.section("Sessione nella stanza")
    s = root / "01_scena"
    p1 = find(s, "P1", {".tif", ".tiff"})
    plate_size = None
    if p1:
        plate_size = check_image(r, p1[0], min_long=4000, bits16=True, label="P1 (TIFF)")
        if plate_size and plate_size[0] > plate_size[1]:
            r.err("P1 is horizontal: the work is vertical 9:16")
    else:
        r.err("P1.tif: missing")
    p2 = find(s, "P2", {".tif", ".tiff"})
    if p2:
        size = check_image(r, p2[0], min_long=4000, bits16=True, label="P2 (TIFF)")
        if size and plate_size and size != plate_size:
            r.err("P2 must have exactly the size of P1 (same framing, camera untouched)")
    else:
        r.err("P2.tif: missing")
    for stem in ("P0", "P1", "P2"):
        (r.ok if find(s, stem, RAW_EXT) else r.warn)(f"{stem}: RAW {'present' if find(s, stem, RAW_EXT) else 'missing (keep the original!)'}")
    raws = [p for p in (s.iterdir() if s.is_dir() else []) if p.suffix.lower() in RAW_EXT]
    if raws:
        r.warn("RAW files are not inspected for GPS: strip it before any transfer (exiftool -gps:all= *.dng)")

    dd = root / "02_dettagli"
    for stem in ("D1_cappotto", "D2_intonaco", "D3_legno", "D4_tazza"):
        f = find(dd, stem, {".tif", ".tiff"})
        if f:
            check_image(r, f[0], min_long=2000, bits16=True)
        else:
            r.err(f"{stem}.tif: missing")

    # S — prints
    r.section("S · stampe")
    sd = root / "03_stampe"
    fronts = sorted(sd.glob("S*_fronte.tif*")) if sd.is_dir() else []
    if not 2 <= len(fronts) <= 3:
        r.err(f"{len(fronts)} prints (expected 2–3)")
    for f in fronts:
        check_image(r, f, min_long=1500, bits16=True)
        back = f.with_name(f.name.replace("_fronte", "_retro"))
        (r.ok if back.exists() else r.err)(f"{back.name}: {'present' if back.exists() else 'missing'}")

    # T — testimony
    r.section("T · testimonianze")
    t = check_text(r, root / "04_testimonianze" / "testimonianze.txt", "testimonianze.txt")
    if t:
        lines = re.findall(r"^\[([A-Z])\]\s*(.+)$", t, flags=re.M)
        people = sorted({p for p, _ in lines})
        (r.ok if 5 <= len(lines) <= 8 else r.err)(f"{len(lines)} sentences (expected 5–8)")
        (r.ok if 2 <= len(people) <= 3 else r.err)(f"{len(people)} people: {', '.join(people)} (expected 2–3)")
        consents = root / "04_testimonianze" / "consensi"
        n = len([p for p in consents.iterdir() if p.is_file()]) if consents.is_dir() else 0
        (r.ok if n >= len(people) else r.err)(f"{n} consent(s) for {len(people)} people")

    # A — audio
    r.section("A · audio")
    ad = root / "05_audio"
    voice = [p for p in (ad.iterdir() if ad.is_dir() else []) if p.stem.lower() == "a1_voce"]
    (r.ok if voice else r.err)(f"A1_voce: {voice[0].name if voice else 'missing'}")
    tone = find(ad, "A2_room_tone", {".wav"})
    if tone:
        try:
            with wave.open(str(tone[0])) as w:
                dur = w.getnframes() / w.getframerate()
                msg = f"A2_room_tone.wav: {w.getframerate()} Hz, {w.getsampwidth() * 8} bit, {dur:.0f} s"
                (r.ok if dur >= 80 and w.getframerate() >= 44100 else r.err)(msg + ("" if dur >= 80 else " — needs ≥ 90 s"))
        except wave.Error as e:
            r.err(f"A2_room_tone.wav: not a PCM WAV ({e})")
    else:
        r.err("A2_room_tone.wav: missing")

    # G, dates, absences
    r.section("G · misure, date, assenze")
    t = check_text(r, root / "06_geometria" / "misure.txt", "misure.txt")
    if t:
        for key in ("stanza", "finestra", "tavolo", "fotocamera", "città"):
            (r.ok if re.search(rf"^\s*{key}\s*:", t, flags=re.M | re.I) else r.err)(f"misure.txt · {key}")
    t = check_text(r, root / "07_date" / "date.txt", "date.txt")
    if t:
        n = len([l for l in t.splitlines() if re.search(r"\d{4}", l)])
        (r.ok if n >= 3 else r.err)(f"{n} dates (expected ≥ 3)")
    t = check_text(r, root / "08_assenze" / "assenze.txt", "assenze.txt")
    if t:
        n = len([l for l in t.splitlines() if ":" in l and l.split(":", 1)[1].strip()])
        (r.ok if 3 <= n <= 4 else r.err)(f"{n} absences (expected 3–4)")

    # M — masks
    r.section("M · maschere")
    md = root / "09_maschere"
    for name in MASKS:
        f = find(md, name, {".png"})
        if not f:
            r.err(f"{name}.png: missing")
            continue
        with Image.open(f[0]) as im:
            g = im.convert("L")
            if plate_size and g.size != plate_size:
                r.err(f"{name}.png: {g.size[0]}×{g.size[1]} ≠ P1 {plate_size[0]}×{plate_size[1]}")
                continue
            small = g.resize((max(1, g.size[0] // 16), max(1, g.size[1] // 16)))
            hist = small.histogram()
            cover = sum(hist[128:]) / max(1, sum(hist))
            if cover <= 0.0005:
                r.err(f"{name}.png: empty")
            elif cover > 0.6:
                r.err(f"{name}.png: covers {cover:.0%} of the picture (inverted?)")
            else:
                r.ok(f"{name}.png: {cover:.1%} of the picture")

    head = [
        "# SINTESI — intake report",
        "",
        f"`{root}` · {r.errors} error(s), {r.warnings} warning(s)",
        "",
        "Material verified against docs/CAPTURE_PROTOCOL.md. Nothing has been modified or transferred.",
    ]
    out = root / "INTAKE_REPORT.md"
    out.write_text("\n".join(head + r.lines) + "\n", encoding="utf-8")
    print("\n".join(head + r.lines))
    return 1 if r.errors else 0


if __name__ == "__main__":
    sys.exit(main(Path(sys.argv[1] if len(sys.argv) > 1 else "archive/intake")))
