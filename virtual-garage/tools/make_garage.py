#!/usr/bin/env python3
"""
Virtual Garage - generate the workshop backdrop.

The backdrop is a list of plain shapes in world units, not a picture: the app
renders it into SVG (src/scene/garage.js) and the stills renderer paints the
same list, so the two cannot drift apart.

World units are pixels of the original car_body.jpeg, so GROUND is the floor
line the car stands on and every prop can be placed against the car's real
roof line (y ~ 200) and tail (x ~ 2600).

    python3 tools/make_garage.py     -> src/content/garage.js
"""

import json
import math as _m
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GROUND = 1174
CEIL = -1500            # underside of the ceiling structure
X0, X1 = -4200, 6400    # the workshop runs well past anything the camera frames
S = []


def rect(x, y, w, h, fill, o=1, r=0, tag=None):
    s = {"k": "rect", "x": round(x, 1), "y": round(y, 1), "w": round(w, 1),
         "h": round(h, 1), "fill": fill, "o": o, "r": r}
    if tag:
        s["tag"] = tag
    S.append(s)


def ell(cx, cy, rx, ry, fill, o=1):
    S.append({"k": "ell", "cx": round(cx, 1), "cy": round(cy, 1),
              "rx": round(rx, 1), "ry": round(ry, 1), "fill": fill, "o": o})


def poly(pts, fill, o=1):
    S.append({"k": "poly", "pts": [[round(a, 1), round(b, 1)] for a, b in pts],
              "fill": fill, "o": o})


def line(x1, y1, x2, y2, w, c, o=1):
    S.append({"k": "line", "x1": round(x1, 1), "y1": round(y1, 1),
              "x2": round(x2, 1), "y2": round(y2, 1), "w": w, "c": c, "o": o})


# ---------------------------------------------------------------- palette --
# Dark blue-grey, low contrast: the car is the only bright thing in the room.
CEIL_DEEP = "#0a0e15"
BEAM = "#1d2733"
BEAM_LIGHT = "#2b3949"
WALL_TOP = "#1f2b39"
WALL_LOW = "#101822"
PANEL = ("#24313f", "#1f2b38", "#27333f", "#212d3a")
SEAM_HI = "#3d5065"
SEAM_LO = "#0c1219"
FLOOR_NEAR = "#1c2733"
FLOOR_FAR = "#0a1017"
STEEL = "#33445a"
GLOW = "rgba(132,182,255,"

# ------------------------------------------------------------------ wall ---
# the wall proper, plus a huge slab above it so a wide zoom-out never shows sky
rect(X0, CEIL, X1 - X0, GROUND - CEIL, [WALL_TOP, WALL_LOW])

# vertical steel cladding, 300 wide, with a folded edge on every panel
PANEL_W = 300
i, px = 0, X0
while px < X1:
    tone = PANEL[i % 4]
    rect(px, CEIL + 480, PANEL_W, GROUND - CEIL - 480, [tone, "#151e29"])
    line(px + 2, CEIL + 480, px + 2, GROUND, 4, SEAM_HI, .38)          # edge catching light
    line(px + 8, CEIL + 480, px + 8, GROUND, 7, SEAM_LO, .55)          # the fold's shadow
    line(px + PANEL_W - 6, CEIL + 480, px + PANEL_W - 6, GROUND, 2, "#3a4c60", .22)
    px += PANEL_W
    i += 1

# ceiling structure: beams on edge, with a dark void between them
rect(X0, -4200, X1 - X0, 2700, CEIL_DEEP)
for bx in range(X0, X1, 640):
    rect(bx, CEIL - 240, 96, 250, [BEAM, "#131b25"])
    line(bx, CEIL - 240, bx, CEIL + 6, 3, BEAM_LIGHT, .3)
    # purlin crossing the beams
rect(X0, CEIL - 60, X1 - X0, 40, [BEAM, "#101821"])
line(X0, CEIL - 60, X1, CEIL - 60, 3, BEAM_LIGHT, .45)
# soffit: everything under the ceiling falls into shadow
rect(X0, CEIL + 6, X1 - X0, 150, ["#101822", "#18222e"], .9)

# ------------------------------------------------------------------ LED ----
# The overview camera only frames about 630 units above the car's roof, so the
# ceiling line (-420) is deliberately close above the lamps: cropped either way,
# the lamps read as ceiling fittings rather than as things stuck on a wall.
CEIL_LINE = -420
rect(X0, CEIL_LINE, X1 - X0, 46, ["#1a2430", "#0d141c"])            # deck edge
line(X0, CEIL_LINE, X1, CEIL_LINE, 4, "#415a75", .45)               # lit steel edge
rect(X0, CEIL_LINE + 46, X1 - X0, 190, ["#080d13", "#1d2836"], .85) # soffit shadow on the wall

LED_Y = -364
BARS = [(-1560, 520), (250, 660), (1740, 660), (3060, 560)]
for bx, bw in BARS:
    # hangers up to the ceiling line
    line(bx + 40, LED_Y - 20, bx + 40, CEIL_LINE + 40, 7, "#26333f", 1)
    line(bx + bw - 40, LED_Y - 20, bx + bw - 40, CEIL_LINE + 40, 7, "#26333f", 1)
    # bloom built from plain shapes (no filters) so both renderers agree
    rect(bx - 70, LED_Y - 54, bw + 140, 108, [GLOW + "0)", GLOW + ".10)"], 1, 22)
    rect(bx - 30, LED_Y - 34, bw + 60, 72, [GLOW + ".08)", GLOW + ".20)"], 1, 16)
    rect(bx, LED_Y - 20, bw, 40, "#e4f1ff", .95, 10, tag="led")     # the tube
    rect(bx + 16, LED_Y - 13, bw - 32, 12, "#ffffff", .95, 6)       # hot core
    line(bx + 10, LED_Y + 23, bx + bw - 10, LED_Y + 23, 3, "#8dbcff", .5)
    # the wash the lamp throws on the wall around itself
    ell(bx + bw / 2, LED_Y + 30, bw * .95, 430, [GLOW + ".10)", GLOW + "0)"], 1)
    # the cone of light reaching the floor
    poly([[bx + 26, LED_Y + 36], [bx + bw - 26, LED_Y + 36],
          [bx + bw + 340, GROUND], [bx - 340, GROUND]],
         [GLOW + ".085)", GLOW + ".012)"], 1)

# ----------------------------------------------------------------- fittings -
# Everything in this block lives between the LED line (-470) and the car's roof
# (y ~ 200): that band is the only wall the overview camera can actually see.
def pegboard(x, y, w, h):
    """Perforated tool board with spanners and a hose coil hung on it."""
    rect(x, y, w, h, ["#1b2634", "#131c26"], 1, 8)
    rect(x, y, w, 9, STEEL, .8, 4)
    for gx in range(0, w - 20, 36):
        for gy in range(28, h - 16, 36):
            ell(x + 18 + gx, y + gy, 2.0, 2.0, "#080d13", .8)
    # a row of tools, hanging by their holes
    for k in range(5):
        hx = x + 46 + k * (w - 92) / 4.0
        ln = 58 + (k * 27) % 46
        top = y + 42
        if k == 3:                                   # a hammer
            line(hx, top + 8, hx, top + ln + 26, 9, "#3a2f28", 1)
            rect(hx - 26, top + 2, 52, 20, ["#4a5561", "#2b343d"], 1, 4)
        else:                                        # a combination spanner
            line(hx, top, hx, top + ln, 9, "#2f3d4c", 1)
            ell(hx, top, 13, 13, "#3f5470", 1)       # ring end
            ell(hx, top, 6, 6, "#0d141b", 1)
            ell(hx, top + ln + 12, 15, 15, "#3f5470", 1)   # open end
            ell(hx, top + ln + 12, 7, 7, "#0d141b", 1)
            rect(hx - 6, top + ln + 16, 12, 14, "#131c26", 1)
    # a hose coil, hung by the wall
    cx, cy = x + w - 74, y + h - 74
    ell(cx, cy, 56, 56, "#28353f", 1)
    ell(cx, cy, 37, 37, "#1a242f", 1)
    ell(cx, cy, 13, 13, STEEL, .75)


def shelf_unit(x, y, w, boards, gap):
    """Steel shelving stacked with boxes and cans."""
    line(x, y, x, y - boards * gap, 9, STEEL, 1)
    line(x + w, y, x + w, y - boards * gap, 9, STEEL, 1)
    for k in range(boards):
        sy = y - k * gap
        rect(x - 12, sy, w + 24, 11, ["#31404f", "#1b242f"])
        line(x - 12, sy, x + w + 12, sy, 2, "#4b6180", .6)
        for j in range(3):
            bw = 46 + ((k * 7 + j * 13) % 34)
            bh = 52 + ((k * 11 + j * 5) % 32)
            bxx = x + 18 + j * (w - 40) / 3.0
            rect(bxx, sy - bh, bw, bh, ["#2a3745", "#1b242f"], 1, 3)
            line(bxx, sy - bh + 11, bxx + bw, sy - bh + 11, 2, "#455a72", .55)


def hose_reel(cx, cy, r):
    """A wall hose reel: bracket, drum, a couple of wraps of hose."""
    line(cx - r - 26, cy, cx - r - 26, cy - 40, 12, "#2b3a48", 1)
    line(cx - r - 26, cy, cx + r + 26, cy, 10, "#243040", 1)
    ell(cx, cy, r, r, "#24313d", 1)
    ell(cx, cy, r - 12, r - 12, "#141d27", 1)
    for k in range(3):
        ell(cx, cy, r - 20 + k * 4, r - 12 - k * 3, "#2e3c4a", .5)
    ell(cx, cy, 16, 16, "#3d5170", .8)
    line(cx + r - 4, cy + 6, cx + r + 40, cy + 66, 9, "#20303f", 1)


def jobs_board(x, y, w, h):
    """A clipboard board with three sheets pinned to it."""
    rect(x, y, w, h, ["#202b38", "#16202b"], 1, 6)
    line(x, y, x + w, y, 3, "#3d4f64", .6)
    for k in range(3):
        pw = w - 44 - (k * 17) % 40
        ph = (h - 40) / 3.0 - 14
        py = y + 16 + k * ((h - 30) / 3.0)
        rect(x + 20, py, pw, ph, "#d7dee6", .17, 2)
        line(x + 32, py + 14, x + 32 + pw * .55, py + 14, 3, "#8fa8c2", .22)


def tyre_lean(cx, base_y, r=104):
    """A tyre standing against the wall, seen at a slight angle: the tread
    band is offset behind the face, which is what gives it thickness."""
    cy = base_y - r
    ell(cx + r * .26, cy, r, r * 1.02, "#1a232d", 1)                  # the far edge
    ell(cx + r * .26, cy, r * .72, r * .74, "#0e151c", 1)
    ell(cx, cy, r, r * 1.02, ["#2b3845", "#1b242e"], 1)               # face
    ell(cx, cy, r * .70, r * .71, "#131b23", 1)                       # sidewall
    ell(cx, cy, r * .40, r * .41, "#0b1117", 1)                       # the hole
    ell(cx, cy, r * .13, r * .13, "#232f3b", 1)
    line(cx - r * .88, cy - r * .2, cx - r * .88, cy + r * .2, 5, "#3b4b5c", .4)
    ell(cx, base_y + 10, r * 1.1, 26, ["rgba(0,0,0,.45)", "rgba(0,0,0,0)"], 1)


def conduit(x, y1, y2):
    """Surface trunking with a few saddle clamps."""
    rect(x, y1, 26, y2 - y1, ["#2a3745", "#171f29"])
    line(x, y1, x, y2, 2, "#405672", .3)
    for by in range(y1 + 70, y2 - 40, 240):
        rect(x - 7, by, 40, 17, STEEL, 1, 4)


pegboard(-700, -318, 1120, 300)
jobs_board(1180, -300, 240, 226)
hose_reel(2250, -172, 88)
shelf_unit(2560, -62, 208, boards=2, gap=118)
conduit(-726, -300, GROUND - 108)
conduit(966, -300, GROUND - 108)
conduit(2872, -300, GROUND - 108)

# a wall clock, because every workshop has one
ell(1762, -186, 56, 56, "#131c26", 1)
ell(1762, -186, 47, 47, "#202c39", 1)
for _t in range(12):
    _a = _t * 30.0 * 3.14159265 / 180.0
    line(1762 + 37 * _m.sin(_a), -186 - 37 * _m.cos(_a),
         1762 + 43 * _m.sin(_a), -186 - 43 * _m.cos(_a), 3, "#44607c", .75)
line(1762, -186, 1762, -216, 4, "#a8bdd2", .9)
line(1762, -186, 1785, -177, 4, "#a8bdd2", .7)
ell(1762, -186, 5, 5, "#a8bdd2", .9)

# a painted bay line along the wall, the kind of thing every real bay has
rect(X0, 46, X1 - X0, 58, ["#2f3f4f", "#232f3c"], .45)
line(X0, 46, X1, 46, 3, "#4b6178", .28)

# dado / kick plate where the wall meets the floor
rect(X0, GROUND - 108, X1 - X0, 108, ["#1a242f", "#131c25"])
line(X0, GROUND - 108, X1, GROUND - 108, 4, "#3c5270", .45)

# ------------------------------------------------------------------ floor --
rect(X0, GROUND, X1 - X0, 4200, [FLOOR_NEAR, FLOOR_FAR])
line(X0, GROUND + 1, X1, GROUND + 1, 5, "#5b7par", 0)                  # (unused guard)
S.pop()
line(X0, GROUND + 3, X1, GROUND + 3, 4, "#5f7b96", .30)                # wall/floor edge
def soft_ell(cx, cy, rx, ry, alpha, layers=3):
    """A light pool whose edge fades away instead of ending on an ellipse."""
    for k in range(layers):
        f = 1.0 - k * 0.26
        ell(cx, cy, rx * f, ry * f, [GLOW + str(round(alpha, 3)) + ")", GLOW + "0)"], 1)


# light pools: one per lamp, plus the broad wash the car stands in
for bx, bw in BARS:
    soft_ell(bx + bw / 2, GROUND + 230, bw * 1.5, 300, .055)
soft_ell(1400, GROUND + 170, 2500, 300, .045)
# seams in the floor slab, spacing out towards the viewer
for k, fy in enumerate((GROUND + 130, GROUND + 290, GROUND + 500, GROUND + 780,
                        GROUND + 1140, GROUND + 1620)):
    line(X0, fy, X1, fy, 2, "#2b3947", max(.06, .20 - k * .022))
# parking-bay markings painted on the slab: a dashed guide and a stop line
for _dx in range(-160, 2760, 168):
    line(_dx, GROUND + 286, _dx + 104, GROUND + 286, 6, "#8fa8c2", .10)
line(-160, GROUND + 700, 2760, GROUND + 700, 7, "#8fa8c2", .07)

# faint reflection of the tubes in the polished floor
for bx, bw in BARS:
    rect(bx + 40, GROUND + 38, bw - 80, 22, [GLOW + ".12)", GLOW + "0)"], 1, 11)
    rect(bx + 90, GROUND + 58, bw - 180, 14, [GLOW + ".06)", GLOW + "0)"], 1, 7)

# ------------------------------------------------------------- floor props --
tyre_lean(-410, GROUND + 34, 120)          # left of the nose
tyre_lean(2880, GROUND + 34, 104)          # right of the tail
ell(1290, GROUND + 10, 980, 22, ["rgba(0,0,0,.4)", "rgba(0,0,0,0)"], 1)


def main():
    out = os.path.join(ROOT, "src/content/garage.js")
    body = json.dumps(S, separators=(",", ":"))
    with open(out, "w", encoding="utf-8") as f:
        f.write("/* Virtual Garage - the workshop backdrop, generated by\n"
                "   tools/make_garage.py. Shapes are in world units (y down, floor at\n"
                "   y = 1174); the scene turns them into SVG, tools/preview_states.py\n"
                "   paints the same list. Do not hand-edit. */\n")
        f.write("window.VG_GARAGE = " + body + ";\n")
    print("wrote src/content/garage.js :", len(S), "shapes")


if __name__ == "__main__":
    main()
