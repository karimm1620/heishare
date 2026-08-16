import sys
sys.path.insert(0, '.')
from geometry import rounded_square_path
import cairosvg

CANVAS = 1024
CX, CY = CANVAS/2, CANVAS/2
SIZE, RADIUS, OFFSET = 520, 150, 135

def panel_path(dx, dy):
    return rounded_square_path(SIZE, RADIUS, cx=CX+dx, cy=CY+dy)

PANEL_A = panel_path(-OFFSET, -OFFSET)   # back panel (top-left)
PANEL_B = panel_path(OFFSET, OFFSET)     # front panel (bottom-right)

BRAND_GRADIENT_STOPS = [
    (0.0, "#4A90F7"),
    (0.5, "#4F5FE8"),
    (1.0, "#7C3AED"),
]

def write_svg(path, content):
    with open(path, "w") as f:
        f.write(content)

def gradient_defs(gid="bg"):
    stops = "".join(f'<stop offset="{o*100:.0f}%" stop-color="{c}"/>' for o, c in BRAND_GRADIENT_STOPS)
    return f'<linearGradient id="{gid}" x1="0%" y1="0%" x2="100%" y2="100%">{stops}</linearGradient>'

# --- 1) Standalone glass-panel layer SVGs (for the Icon Composer bundle) ---
write_svg("out/panel-a.svg", f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CANVAS} {CANVAS}">
<path d="{PANEL_A}" fill="#ffffff"/>
</svg>''')

write_svg("out/panel-b.svg", f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CANVAS} {CANVAS}">
<path d="{PANEL_B}" fill="#ffffff"/>
</svg>''')

# --- 2) Flattened glyph only (white, transparent bg) — for Android layers, splash ---
write_svg("out/glyph_flat.svg", f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CANVAS} {CANVAS}">
<path d="{PANEL_A}" fill="#ffffff" opacity="0.72"/>
<path d="{PANEL_A}" fill="none" stroke="#ffffff" stroke-width="5" opacity="0.55"/>
<path d="{PANEL_B}" fill="#ffffff" opacity="0.72"/>
<path d="{PANEL_B}" fill="none" stroke="#ffffff" stroke-width="5" opacity="0.65"/>
</svg>''')

# --- 3) Full flattened icon: gradient bg + glass glyph (fallback / iOS 1024 / favicon) ---
write_svg("out/icon_full.svg", f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CANVAS} {CANVAS}">
<defs>{gradient_defs()}</defs>
<rect x="0" y="0" width="{CANVAS}" height="{CANVAS}" fill="url(#bg)"/>
<path d="{PANEL_A}" fill="#ffffff" opacity="0.55"/>
<path d="{PANEL_A}" fill="none" stroke="#ffffff" stroke-width="4" opacity="0.5"/>
<path d="{PANEL_B}" fill="#ffffff" opacity="0.55"/>
<path d="{PANEL_B}" fill="none" stroke="#ffffff" stroke-width="4" opacity="0.6"/>
</svg>''')

# --- 4) Background-only gradient (Android adaptive background layer) ---
write_svg("out/bg_only.svg", f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CANVAS} {CANVAS}">
<defs>{gradient_defs()}</defs>
<rect x="0" y="0" width="{CANVAS}" height="{CANVAS}" fill="url(#bg)"/>
</svg>''')

# --- 5) Android foreground: glyph scaled to the ~66% safe zone, transparent bg ---
scale = 0.62
write_svg("out/glyph_safezone.svg", f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CANVAS} {CANVAS}">
<g transform="translate({CX},{CY}) scale({scale}) translate({-CX},{-CY})">
<path d="{PANEL_A}" fill="#ffffff" opacity="0.72"/>
<path d="{PANEL_A}" fill="none" stroke="#ffffff" stroke-width="5" opacity="0.55"/>
<path d="{PANEL_B}" fill="#ffffff" opacity="0.72"/>
<path d="{PANEL_B}" fill="none" stroke="#ffffff" stroke-width="5" opacity="0.65"/>
</g>
</svg>''')

# --- 6) Monochrome (Android themed-icon layer): solid silhouette, no opacity variance ---
write_svg("out/glyph_monochrome.svg", f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CANVAS} {CANVAS}">
<g transform="translate({CX},{CY}) scale({scale}) translate({-CX},{-CY})">
<path d="{PANEL_A}" fill="#ffffff"/>
<path d="{PANEL_B}" fill="#ffffff"/>
</g>
</svg>''')

renders = [
    ("out/panel-a.svg", "out/panel-a.png", CANVAS),
    ("out/panel-b.svg", "out/panel-b.png", CANVAS),
    ("out/glyph_flat.svg", "out/glyph_flat.png", CANVAS),
    ("out/icon_full.svg", "out/icon_full.png", CANVAS),
    ("out/bg_only.svg", "out/bg_only.png", CANVAS),
    ("out/glyph_safezone.svg", "out/glyph_safezone.png", CANVAS),
    ("out/glyph_monochrome.svg", "out/glyph_monochrome.png", CANVAS),
]
for src, dst, size in renders:
    cairosvg.svg2png(url=src, write_to=dst, output_width=size, output_height=size)

print("Rendered", len(renders), "assets")
