from PIL import Image, ImageFilter, ImageDraw

CANVAS = 1024

def load(name):
    return Image.open(f"out/{name}.png").convert("RGBA")

panel_a = load("android_panel_a_glass")
panel_b = load("android_panel_b_glass")
mask_b = load("android_panel_b_mask").split()[3]

# Foreground: transparent background, shadow + both glass panels + highlight
fg = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))

shadow = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
shadow_shape = Image.new("RGBA", (CANVAS, CANVAS), (8, 10, 30, 110))
shadow.paste(shadow_shape, (14, 16), mask_b)
shadow = shadow.filter(ImageFilter.GaussianBlur(16))

fg = Image.alpha_composite(fg, shadow)
fg = Image.alpha_composite(fg, panel_a)
fg = Image.alpha_composite(fg, panel_b)

# soft highlight streak, same technique as the main icon, masked to content
highlight = Image.new("L", (CANVAS, CANVAS), 0)
ell = Image.new("L", (620, 260), 0)
ed = ImageDraw.Draw(ell)
ed.ellipse((0, 0, 620, 260), fill=255)
ell = ell.filter(ImageFilter.GaussianBlur(60))
ell = ell.rotate(-32, expand=True, resample=Image.BICUBIC)
highlight.paste(ell, (60, 120), ell)
highlight_rgba = Image.new("RGBA", (CANVAS, CANVAS), (255, 255, 255, 0))
highlight_rgba.putalpha(highlight.point(lambda p: int(p * 0.28)))
fg = Image.alpha_composite(fg, highlight_rgba)

fg.save("out/android_foreground_1024.png")

# Monochrome layer: solid white silhouette on transparent (Android tints this itself)
mono = load("android_monochrome")
mono.save("out/android_monochrome_1024.png")

print("done", fg.size)
