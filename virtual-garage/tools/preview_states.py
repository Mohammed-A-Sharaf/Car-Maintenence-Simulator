#!/usr/bin/env python3
"""
Virtual Garage - static previews of the scene.

The app is SVG in a browser; this script re-creates a few states with Pillow
using the *same* numbers (src/content/layout.js is read as JSON, the sprite
manifest supplies every anchor and scale). It is how the assembly is checked
without a browser, and it doubles as a picture for the docs.

    python3 tools/preview_states.py
    -> docs/state-overview.jpg, docs/state-lifted.jpg,
       docs/state-wrench.jpg, docs/state-brakes.jpg
"""

import json
import math
import os
import re

from PIL import Image, ImageChops, ImageDraw, ImageFont

import garage_paint

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read_json_between(path, start, end):
    txt = open(path, encoding="utf-8").read()
    a = txt.index(start) + len(start)
    b = txt.index(end, a)
    return json.loads(txt[a:b])


SPR = read_json_between(os.path.join(ROOT, "src/content/sprites.js"),
                        "window.VG_SPRITES = ", ";")
L = read_json_between(os.path.join(ROOT, "src/content/layout.js"), "/*L*/", "/*R*/")

PIVOT = L["pitchPivot"]
GROUND = L["groundY"]
FONT = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 26)
FONT_S = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 21)


class Layer:
    """A transparent world-space canvas that sprites are pasted into."""

    def __init__(self, ox, oy, w, h):
        self.ox, self.oy = ox, oy
        self.img = Image.new("RGBA", (w, h), (0, 0, 0, 0))

    def _rotated(self, im, ax, ay, rot):
        if not rot:
            return im, ax, ay
        pad = int(max(im.width, im.height) * 1.7) + 8
        tmp = Image.new("RGBA", (pad, pad), (0, 0, 0, 0))
        cx = cy = pad / 2.0
        tmp.alpha_composite(im, (int(round(cx - ax)), int(round(cy - ay))))
        tmp = tmp.rotate(-rot, center=(cx, cy), resample=Image.BICUBIC)
        return tmp, cx, cy

    def paste(self, key, wx, wy, k=1.0, rot=0.0, alpha=1.0, anchor=None, pivot=None):
        info = SPR[key]
        im = Image.open(os.path.join(ROOT, info["file"])).convert("RGBA")
        s = info["s"] * k
        im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))),
                       Image.LANCZOS)
        a = anchor if anchor else (info["ax"], info["ay"])
        ax, ay = a[0] * s, a[1] * s
        if pivot and rot:
            # rotate about a point in sprite pixels, keep the anchor on the world point
            px, py = pivot[0] * s, pivot[1] * s
            pad = int(max(im.width, im.height) * 1.9) + 8
            tmp = Image.new("RGBA", (pad, pad), (0, 0, 0, 0))
            cx = cy = pad / 2.0
            tmp.alpha_composite(im, (int(round(cx - px)), int(round(cy - py))))
            tmp = tmp.rotate(-rot, center=(cx, cy), resample=Image.BICUBIC)
            # after rotating, the anchor sits at cx + R(anchor-pivot)
            t = math.radians(rot)
            dx, dy = ax - px, ay - py
            nx = cx + dx * math.cos(t) - dy * math.sin(t)
            ny = cy + dx * math.sin(t) + dy * math.cos(t)
            im, ax, ay = tmp, nx, ny
        else:
            im, ax, ay = self._rotated(im, ax, ay, rot)
        if alpha < 1:
            a = im.getchannel("A").point(lambda v: int(v * alpha))
            im.putalpha(a)
        self.img.alpha_composite(im, (int(round(wx - ax - self.ox)), int(round(wy - ay - self.oy))))

    def rotate_about(self, px, py, deg):
        self.img = self.img.rotate(-deg, center=(px - self.ox, py - self.oy),
                                   resample=Image.BICUBIC)

    def draw(self):
        return ImageDraw.Draw(self.img)


WELL_R = 241        # same number as WELL_R in src/scene/scene.js


def well_liner(car, cx, cy, r=WELL_R):
    """The inside of a wheel arch. scene.js paints this with a radial gradient
    and two arcs on the lip; here it is stacked translucent circles so the
    stills show the same cavity the app does."""
    ox, oy = car.ox, car.oy
    w, h = car.img.size
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).ellipse([cx - ox - r, cy - oy - r, cx - ox + r, cy - oy + r], fill=255)
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gcy = cy - r * 0.24                     # the light comes from above
    n = 26
    for i in range(n):
        t = i / (n - 1.0)
        rr = r * (1.0 - 0.86 * t)
        a = 4 + int(30 * t * t)
        gd.ellipse([cx - ox - rr, gcy - oy - rr, cx - ox + rr, gcy - oy + rr],
                   fill=(205, 220, 235, a))
    glow.putalpha(ImageChops.multiply(glow.getchannel("A"), mask))
    car.img.alpha_composite(glow)
    d = car.draw()
    box = [cx - ox - r, cy - oy - r, cx - ox + r, cy - oy + r]
    d.arc(box, 180, 360, fill=(57, 67, 78, 140), width=13)
    d.arc([box[0] + 4, box[1] + 4, box[2] - 4, box[3] - 4], 180, 360,
          fill=(140, 156, 173, 77), width=5)
    d.arc([box[0] + 6, box[1] + 6, box[2] - 6, box[3] - 6], 180, 360,
          fill=(174, 194, 212, 51), width=2)


def backdrop(w, h, ox, oy, cw):
    """The workshop, painted from src/content/garage.js - the same shape list
    the app turns into SVG, so the stills show the same room."""
    frame = Image.new("RGB", (w, h), (11, 16, 23))
    garage_paint.paint(frame, ox, oy, w / float(cw))
    return frame


# ------------------------------------------------------------------ helpers
JM = SPR["jackBody"]["meta"]
JS = SPR["jackBody"]["s"]


def saddle_local(arm_deg):
    dx = JM["saddle"][0] - JM["pivot"][0]
    dy = JM["saddle"][1] - JM["pivot"][1]
    t = math.radians(arm_deg)
    return [JM["pivot"][0] + dx * math.cos(t) - dy * math.sin(t),
            JM["pivot"][1] + dx * math.sin(t) + dy * math.cos(t)]


LOW = saddle_local(L["jackArmLow"])
JACK_O = [L["jackSaddleX"] - LOW[0] * JS, GROUND - JM["floorY"] * JS]


def saddle_world(arm_deg):
    p = saddle_local(arm_deg)
    return [JACK_O[0] + p[0] * JS, JACK_O[1] + p[1] * JS]


def nose_under(x):
    n = L["noseLine"]
    t = min(1.0, max(0.0, (x - n[0]) / (n[2] - n[0])))
    return n[1] + (n[3] - n[1]) * t


def nose_y(x, p):
    rx, ry = x - PIVOT[0], nose_under(x) - PIVOT[1]
    return PIVOT[1] + rx * math.sin(p) + ry * math.cos(p)


def solve_pitch(sx, sy):
    if sy >= nose_y(sx, 0):
        return 0.0
    lo, hi = 0.0, L["maxPitchLift"]
    for _ in range(40):
        m = (lo + hi) / 2
        if nose_y(sx, m) > sy:
            lo = m
        else:
            hi = m
    return (lo + hi) / 2


def sill_y(x, p):
    rx, ry = x - PIVOT[0], L["sillY"] - PIVOT[1]
    return PIVOT[1] + rx * math.sin(p) + ry * math.cos(p)


def nut_pos(i):
    a = math.radians(L["nutAngles"][i])
    return [math.cos(a) * L["nutPitch"], -math.sin(a) * L["nutPitch"]]


# ------------------------------------------------------------------ scene
def scene(name, cam, *, safe=162, arm=L["jackArmLow"], jack_x=None, stand=False, pitch_hold=0.0,
          nuts_removed=0, nuts_loosened=0, wheel_off=False,
          caliper_off=False, pads_out=False, disc_off=False,
          tool=None, wrench_nut=None, label=""):
    cx, cy, cw = cam if isinstance(cam, (list, tuple)) else L["camera"][cam]
    aspect = 0.60
    ch = cw * aspect
    # the app pushes the view left by half the floating panel, in pixels
    ox, oy = cx - cw / 2 + safe, cy - ch / 2
    w, h = int(round(cw)), int(round(ch))

    sw = saddle_world(arm)
    pitch = solve_pitch(sw[0], sw[1]) if jack_x is not None else 0.0
    if stand:
        pitch = pitch_hold or solve_pitch(*saddle_world(0))

    base = backdrop(w, h, ox, oy, cw).convert("RGBA")

    # contact shadows, same math as scene.js render(): the front one lifts
    # and fades as the nose rises
    sh = Layer(ox, oy, w, h)
    d = sh.draw()
    pf, pr = L["axles"]["front"], L["axles"]["rear"]
    pp = L["pitchPivot"]
    ca, sa = math.cos(pitch), math.sin(pitch)
    k = max(0.0, min(1.0, pitch / L["maxPitchLift"]))
    fx = pp[0] + (pf[0] - pp[0]) * ca - (pf[1] - pp[1]) * sa
    rf = 235 * (1 - 0.3 * k)
    # shadow layer draws in image space, so world points are shifted by the origin
    def ell_w(CX, RX, Y0, Y1, alpha):
        d.ellipse([CX - RX - ox, Y0 - oy, CX + RX - ox, Y1 - oy], fill=(0, 0, 0, alpha))

    ell_w(pr[0], 235, GROUND - 10, GROUND + 38, 107)
    ell_w(fx, rf, GROUND - 10, GROUND + 38, int(107 * (1 - 0.92 * k)))
    jx0 = JACK_O[0] if jack_x is None else jack_x
    jw = SPR["jackBody"]["w"] * SPR["jackBody"]["s"]
    ell_w(jx0 + jw * 0.5, 150, GROUND - 4, GROUND + 28, 87)
    if stand:
        ell_w(L["standX"], 110, GROUND - 1, GROUND + 25, 87)
    base.alpha_composite(sh.img)

    # ---- jack (behind the car)
    jl = Layer(ox, oy, w, h)
    jx = JACK_O[0] if jack_x is None else jack_x
    jl.paste("jackBody", jx, JACK_O[1])
    # the arm swings about the pivot, which lives in sprite pixels
    # both jack sprites anchor at their top-left; the arm swings about the
    # shared pivot, exactly like SP.placeRot() does in the app
    jl.paste("jackArm", jx, JACK_O[1], rot=arm, pivot=(JM["pivot"][0], JM["pivot"][1]))
    base.alpha_composite(jl.img)

    # ---- car group (body + axles), then rotated as one
    car = Layer(ox, oy, w, h)
    car.paste("car", L["carAt"][0], L["carAt"][1])
    for _ax in ("front", "rear"):
        well_liner(car, L["axles"][_ax][0], L["axles"][_ax][1])

    for axle in ("front", "rear"):
        ax, ay = L["axles"][axle]
        front = axle == "front"
        car.paste("hub", ax, ay)
        if front and disc_off:
            car.paste("disc", ax + L["discPark"][0], ay + L["discPark"][1], rot=L["discPark"][2])
        else:
            car.paste("disc", ax, ay)
        if front:
            for i, key in ((0, "padFriction"), (1, "padBacking")):
                if pads_out:
                    pxx = L["padsPark"][0] + i * 78
                    pyy = L["padsPark"][1]
                    car.paste(key, ax + pxx, ay + pyy, rot=90)
                else:
                    pxx, pyy = L["padPlace"][i]
                    car.paste(key, ax + pxx, ay + pyy)
            cxx = ax + L["caliperDx"] + (L["caliperPark"][0] if caliper_off else 0)
            cyy = ay + L["caliperDy"] + (L["caliperPark"][1] if caliper_off else 0)
            car.paste("caliper", cxx, cyy, rot=(L["caliperPark"][2] if caliper_off else 0))
        if not (front and wheel_off):
            wx = ax + (L["wheelPark"][0] - L["axles"]["front"][0] if (front and wheel_off) else 0)
            wy = ay + (L["wheelPark"][1] - L["axles"]["front"][1] if (front and wheel_off) else 0)
            car.paste("wheel", wx, wy)
        for i in range(5):
            nx, ny = nut_pos(i)
            if front and i < nuts_removed:
                # the bare stud stays on the hub face, exactly as scene.js draws it
                cd = car.draw()
                for r, fill in ((7.6, (32, 37, 44, 255)), (3.1, (58, 66, 77, 255))):
                    cd.ellipse([ax + nx - r - ox, ay + ny - r - oy,
                                ax + nx + r - ox, ay + ny + r - oy], fill=fill)
                continue
            car.paste("nut", ax + nx, ay + ny, rot=(26 if (front and i < nuts_loosened) else 0))

    if pitch:
        car.rotate_about(PIVOT[0], PIVOT[1], math.degrees(pitch))
    base.alpha_composite(car.img)

    # A wheel that has been taken off comes to rest beside the car and stays
    # there as a real object - the same park spot the app uses.
    if wheel_off:
        sw2 = Layer(ox, oy, w, h)
        ell_w2 = sw2.draw()
        ell_w2.ellipse([L["wheelPark"][0] - 168 - ox, GROUND - 4 - oy,
                        L["wheelPark"][0] + 168 - ox, GROUND + 30 - oy],
                       fill=(0, 0, 0, 104))
        base.alpha_composite(sw2.img)
        wl = Layer(ox, oy, w, h)
        wl.paste("wheel", L["wheelPark"][0], L["wheelPark"][1])
        base.alpha_composite(wl.img)

    # ---- stand
    if stand:
        hgt = GROUND - sill_y(L["standX"], pitch)
        info = SPR["stand"]
        k = hgt / (info["h"] * info["s"])
        sl = Layer(ox, oy, w, h)
        sl.paste("stand", L["standX"], GROUND, k=k)
        base.alpha_composite(sl.img)

    # ---- held tool
    if wrench_nut is not None:
        ax, ay = L["axles"]["front"]
        nx, ny = nut_pos(wrench_nut)
        info = SPR["wrench"]
        tipx = info["w"] * 0.5 + (info["w"] * 0.5 - 62) * 0.7071
        tipy = info["h"] * 0.5 + (info["h"] * 0.5 - 62) * 0.7071
        tl = Layer(ox, oy, w, h)
        # anchor the sprite on its socket tip: shift the anchor by hand
        tl.paste("wrench", ax + nx, ay + ny, k=0.62, rot=42, anchor=(tipx, tipy))
        base.alpha_composite(tl.img)

    # ---- label
    out = base.convert("RGB")
    if label:
        d2 = ImageDraw.Draw(out)
        d2.rectangle([0, 0, 14, 14], fill=(255, 182, 77))
        d2.text((26, 18), label, font=FONT, fill=(240, 245, 250))
        d2.text((26, 52), os.path.basename(name), font=FONT_S, fill=(150, 165, 180))
    out.save(name, quality=90)
    print("wrote", os.path.relpath(name, ROOT), out.size)
    return out


def main():
    docs = os.path.join(ROOT, "docs")
    os.makedirs(docs, exist_ok=True)

    scene(os.path.join(docs, "state-overview.jpg"), "overview",
          jack_x=JACK_O[0] + L["jackParkX"] + 220, label="A  at rest, jack parked")

    scene(os.path.join(docs, "state-lifted.jpg"), "brakes",
          arm=0, jack_x=JACK_O[0], stand=True,
          nuts_removed=5, wheel_off=True, label="B  lifted, on the stand, wheel off")

    scene(os.path.join(docs, "state-wrench.jpg"), "front",
          nuts_loosened=1, wrench_nut=0, label="C  wrench on nut 1")

    scene(os.path.join(docs, "state-done.jpg"), "front",
          jack_x=JACK_O[0] + L["jackParkX"] + 220, wrench_nut=0,
          label="E  back together, torqueing on the ground")

    # the framing the app switches to when you take the wheel off yourself: the
    # empty corner on the right, the wheel waiting on the left
    scene(os.path.join(docs, "state-wheeloff.jpg"), "wheelback",
          arm=0, jack_x=JACK_O[0], stand=True, nuts_removed=5, wheel_off=True,
          label="F  wheel off, waiting to go back on")

    scene(os.path.join(docs, "state-brakes.jpg"), "brakes",
          arm=0, jack_x=JACK_O[0], stand=True, nuts_removed=5, wheel_off=True,
          caliper_off=True, pads_out=True, label="D  caliper off, pads out")


if __name__ == "__main__":
    main()
