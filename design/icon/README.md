# Icon design source

The heishare mark: two overlapping translucent glass panels (rounded
squares), offset diagonally — two devices meeting/connecting directly,
rendered in Apple's Liquid Glass material. Chosen deliberately over more
literal options (wifi bars, cloud+arrow, radiating signal rings à la
AirDrop) to stay distinctive and legible down to favicon size.

Brand base color: `#4A90F7` → gradient to `#7C3AED` (blue → violet),
matching the app's own `--color-primary` token in `src/global.css`.

## Regenerating

```bash
pip install cairosvg pillow
python3 geometry.py          # sanity-check the vesica/squircle path math
python3 build_assets.py      # SVG layers -> out/*.png (requires ./out dir)
python3 compose.py           # composites the flattened iOS/favicon/splash icon
python3 compose_android.py   # composites the Android adaptive-icon foreground
```

Outputs then get copied to `assets/images/*.png` and, for the SVG layers
specifically, into `assets/expo.icon/Assets/` (see `../../assets/expo.icon/icon.json`
for the actual Liquid Glass layer/translucency/shadow configuration — that
JSON is what makes iOS 26's Icon Composer render real glass refraction,
the PNGs here are the flattened fallback for Android/web/older iOS).

## Adjusting the design

- `SIZE` / `RADIUS` / `OFFSET` in `geometry.py`'s call sites control panel
  size, corner roundness, and how far apart the two panels sit.
- `SAFE_SCALE` in the Android-specific script keeps content inside the
  ~66/108dp adaptive-icon safe zone — don't remove the margin, launcher
  masks (circle/squircle/teardrop) will clip anything closer to the edge.
- Brand gradient stops live in `build_assets.py`'s `BRAND_GRADIENT_STOPS`.
