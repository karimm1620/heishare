from PIL import Image, ImageFilter, ImageDraw, ImageChops
import math

CANVAS = 1024

def load(name):
    return Image.open(f"out/{name}.png").convert("RGBA")

bg = load("bg_only").convert("RGB")
panel_a = load("panel_a_glass")
panel_b = load("panel_b_glass")
mask_b = load("panel_b_mask").split()[3]  # alpha channel = silhouette

# --- Drop shadow from panel B (the "front" panel), offset down-right, blurred ---
shadow = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
shadow_shape = Image.new("RGBA", (CANVAS, CANVAS), (8, 10, 30, 130))
shadow.paste(shadow_shape, (18, 22), mask_b)
shadow = shadow.filter(ImageFilter.GaussianBlur(22))

# --- Compose base: bg -> shadow -> panel A -> panel B ---
canvas = bg.convert("RGBA")
canvas = Image.alpha_composite(canvas, shadow)
canvas = Image.alpha_composite(canvas, panel_a)
canvas = Image.alpha_composite(canvas, panel_b)

# --- Specular highlight sheen: soft diagonal streak, upper-left, screen-blended ---
highlight = Image.new("L", (CANVAS, CANVAS), 0)
hd = ImageDraw.Draw(highlight)
# an elongated soft ellipse rotated ~-35deg to suggest a glass glint
ell = Image.new("L", (900, 380), 0)
ed = ImageDraw.Draw(ell)
ed.ellipse((0, 0, 900, 380), fill=255)
ell = ell.filter(ImageFilter.GaussianBlur(90))
ell = ell.rotate(-32, expand=True, resample=Image.BICUBIC)
hx, hy = -60, -40
highlight.paste(ell, (hx, hy), ell)

highlight_rgba = Image.new("RGBA", (CANVAS, CANVAS), (255, 255, 255, 0))
highlight_rgba.putalpha(highlight.point(lambda p: int(p * 0.30)))
canvas = Image.alpha_composite(canvas, highlight_rgba)

# --- Very subtle overall vignette for depth ---
vignette = Image.new("L", (CANVAS, CANVAS), 0)
vd = ImageDraw.Draw(vignette)
vd.ellipse((-260, -260, CANVAS + 260, CANVAS + 260), fill=255)
vignette = vignette.filter(ImageFilter.GaussianBlur(180))
vignette = ImageChops.invert(vignette).point(lambda p: int(p * 0.35))
vignette_rgba = Image.new("RGBA", (CANVAS, CANVAS), (5, 8, 25, 0))
vignette_rgba.putalpha(vignette)
canvas = Image.alpha_composite(canvas, vignette_rgba)

canvas.convert("RGB").save("out/icon_final_1024.png")
print("saved", canvas.size)
