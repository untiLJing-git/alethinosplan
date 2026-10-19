"""Render a README GIF from local-demo screenshots. Requires Pillow."""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
manifest = json.loads((root / ".test-readme-frames/manifest.json").read_text(encoding="utf-8"))
frames = []
for item in manifest:
    with Image.open(root / item["path"]) as source:
        frame = source.convert("RGB").resize((1000, 633), Image.Resampling.LANCZOS)
        frames.append(frame.quantize(colors=128, method=Image.Quantize.MEDIANCUT))
target = root / "docs/assets/demo.gif"
frames[0].save(target, save_all=True, append_images=frames[1:], duration=[item["duration"] for item in manifest], loop=0, optimize=True, disposal=2)
with Image.open(target) as rendered:
    assert rendered.is_animated and rendered.n_frames > 1
    print(f"Rendered {rendered.n_frames} frames, {target.stat().st_size:,} bytes: {target}")
