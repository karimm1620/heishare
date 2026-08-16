import math

def vesica_path(r, o, cx=0, cy=0):
    """
    Vertical pointed-leaf (vesica piscis) formed by two circles of radius r,
    centered at (cx-o, cy) and (cx+o, cy). Returns an SVG path string for the
    tall petal (pointed top/bottom, bulging left/right), centered at (cx, cy).
    """
    h = math.sqrt(r * r - o * o)  # top/bottom tip y-offset
    top = (cx, cy - h)
    bottom = (cx, cy + h)
    # Right arc: part of the LEFT circle (center cx-o) bulging to the right
    # Left arc: part of the RIGHT circle (center cx+o) bulging to the left
    left_circle = (cx - o, cy)
    right_circle = (cx + o, cy)
    # sweep flags chosen so arcs bulge outward (away from the vesica's own center)
    d = (
        f"M {top[0]:.3f},{top[1]:.3f} "
        f"A {r:.3f},{r:.3f} 0 0 1 {bottom[0]:.3f},{bottom[1]:.3f} "  # bulge right (arc of left circle)
        f"A {r:.3f},{r:.3f} 0 0 1 {top[0]:.3f},{top[1]:.3f} "        # bulge left (arc of right circle)
        f"Z"
    )
    return d, (2 * (r - o)), (2 * h)  # path, width, height

if __name__ == "__main__":
    r, o = 300, 165
    d, w, h = vesica_path(r, o)
    print(d)
    print("width", w, "height", h)

def rounded_square_path(size, radius, cx=0, cy=0):
    """Squircle-ish rounded square centered at (cx,cy)."""
    s = size / 2
    r = radius
    x0, y0 = cx - s, cy - s
    x1, y1 = cx + s, cy + s
    d = (
        f"M {x0+r},{y0} "
        f"L {x1-r},{y0} Q {x1},{y0} {x1},{y0+r} "
        f"L {x1},{y1-r} Q {x1},{y1} {x1-r},{y1} "
        f"L {x0+r},{y1} Q {x0},{y1} {x0},{y1-r} "
        f"L {x0},{y0+r} Q {x0},{y0} {x0+r},{y0} "
        f"Z"
    )
    return d
