import sys
sys.path.insert(0, '.')
from geometry import rounded_square_path
from PIL import Image, ImageDraw
import cairosvg

CANVAS = 1024
CX, CY = CANVAS / 2, CANVAS / 2
SIZE, RADIUS, OFFSET = 520, 150, 135


def panel_path(dx, dy):
    return rounded_square_path(SIZE, RADIUS, cx=CX + dx, cy=CY + dy)


PANEL_A = panel_path(-OFFSET, -OFFSET)
PANEL_B = panel_path(OFFSET, OFFSET)

BRAND_GRADIENT_STOPS = [
    (0.0, '#4A90F7'),
    (0.5, '#4F5FE8'),
    (1.0, '#7C3AED'),
]


def write_svg(path, content):
    with open(path, 'w') as f:
        f.write(content)


def gradient_defs(gid='bg'):
    stops = ''.join(
        f'<stop offset="{o * 100:.0f}%" stop-color="{c}"/>'
        for o, c in BRAND_GRADIENT_STOPS
    )
    return (
        f'<linearGradient id="{gid}" x1="0%" y1="0%" '
        f'x2="100%" y2="100%">{stops}</linearGradient>'
    )


# Base panel masks and flattened assets.
write_svg('out/panel-a.svg', f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CANVAS} {CANVAS}">
<path d="{PANEL_A}" fill="#ffffff"/>
</svg>''')

write_svg('out/panel-b.svg', f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CANVAS} {CANVAS}">
<path d="{PANEL_B}" fill="#ffffff"/>
</svg>''')

write_svg('out/glyph_flat.svg', f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CANVAS} {CANVAS}">
<path d="{PANEL_A}" fill="#ffffff" opacity="0.72"/>
<path d="{PANEL_A}" fill="none" stroke="#ffffff" stroke-width="5" opacity="0.55"/>
<path d="{PANEL_B}" fill="#ffffff" opacity="0.72"/>
<path d="{PANEL_B}" fill="none" stroke="#ffffff" stroke-width="5" opacity="0.65"/>
</svg>''')

write_svg('out/icon_full.svg', f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CANVAS} {CANVAS}">
<defs>{gradient_defs()}</defs>
<rect width="{CANVAS}" height="{CANVAS}" fill="url(#bg)"/>
<path d="{PANEL_A}" fill="#ffffff" opacity="0.55"/>
<path d="{PANEL_A}" fill="none" stroke="#ffffff" stroke-width="4" opacity="0.5"/>
<path d="{PANEL_B}" fill="#ffffff" opacity="0.55"/>
<path d="{PANEL_B}" fill="none" stroke="#ffffff" stroke-width="4" opacity="0.6"/>
</svg>''')

write_svg('out/bg_only.svg', f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CANVAS} {CANVAS}">
<defs>{gradient_defs()}</defs>
<rect width="{CANVAS}" height="{CANVAS}" fill="url(#bg)"/>
</svg>''')

scale = 0.62
write_svg('out/glyph_safezone.svg', f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CANVAS} {CANVAS}">
<g transform="translate({CX},{CY}) scale({scale}) translate({-CX},{-CY})">
<path d="{PANEL_A}" fill="#ffffff" opacity="0.72"/>
<path d="{PANEL_A}" fill="none" stroke="#ffffff" stroke-width="5" opacity="0.55"/>
<path d="{PANEL_B}" fill="#ffffff" opacity="0.72"/>
<path d="{PANEL_B}" fill="none" stroke="#ffffff" stroke-width="5" opacity="0.65"/>
</g>
</svg>''')

write_svg('out/glyph_monochrome.svg', f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CANVAS} {CANVAS}">
<g transform="translate({CX},{CY}) scale({scale}) translate({-CX},{-CY})">
<path d="{PANEL_A}" fill="#ffffff"/>
<path d="{PANEL_B}" fill="#ffffff"/>
</g>
</svg>''')

renders = [
    ('out/panel-a.svg', 'out/panel-a.png'),
    ('out/panel-b.svg', 'out/panel-b.png'),
    ('out/glyph_flat.svg', 'out/glyph_flat.png'),
    ('out/icon_full.svg', 'out/icon_full.png'),
    ('out/bg_only.svg', 'out/bg_only.png'),
    ('out/glyph_safezone.svg', 'out/glyph_safezone.png'),
    ('out/glyph_monochrome.svg', 'out/glyph_monochrome.png'),
]
for src, dst in renders:
    cairosvg.svg2png(url=src, write_to=dst, output_width=CANVAS, output_height=CANVAS)


def make_glass_layers(prefix, mask_path, fill_alpha=72, border_alpha=90):
    mask = Image.open(mask_path).convert('L')
    layer = Image.new('RGBA', (CANVAS, CANVAS), (255, 255, 255, 0))
    layer.putalpha(mask.point(lambda p: p * fill_alpha // 255))
    layer.save(f'out/{prefix}_glass.png')

    border = Image.new('RGBA', (CANVAS, CANVAS), (255, 255, 255, 0))
    draw = ImageDraw.Draw(border)
    draw.bitmap((0, 0), mask, fill=(255, 255, 255, border_alpha))
    border_alpha_mask = mask.filter(ImageFilter.MaxFilter(11)) if False else mask
    border.putalpha(border_alpha_mask.point(lambda p: p * border_alpha // 255))
    border.save(f'out/{prefix}_glass_border.png')

    mask_rgba = Image.new('RGBA', (CANVAS, CANVAS), (255, 255, 255, 0))
    mask_rgba.putalpha(mask)
    mask_rgba.save(f'out/{prefix}_mask.png')


# Names consumed by compose.py and compose_android.py.
make_glass_layers('panel_a', 'out/panel-a.png')
make_glass_layers('panel_b', 'out/panel-b.png')
make_glass_layers('android_panel_a', 'out/glyph_safezone.png')
make_glass_layers('android_panel_b', 'out/glyph_safezone.png')

# Preserve the exact monochrome asset names consumed by compose_android.py.
Image.open('out/glyph_monochrome.png').convert('RGBA').save('out/android_monochrome.png')

print('Rendered base assets and composition inputs')
