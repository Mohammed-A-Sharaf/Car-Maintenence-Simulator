#!/usr/bin/env python3
"""
Virtual Garage - asset preparation.

Turns the 12 source JPEGs in assets/source/ into cut-out PNG sprites in
assets/sprites/ and writes the sprite manifest to src/content/sprites.js.

Everything here is reproducible: delete assets/sprites/ and re-run

    python3 tools/prepare_assets.py

What it does for every asset
  1. builds an alpha channel by flood-filling the white studio background in
     from the border (so white highlights *inside* a part are kept),
  2. punches the real see-through holes (disc bore, axle-stand triangle,
     jack linkage gap, caliper bracket gap) by finding enclosed pure-white
     regions that are large, flat and not elongated,
  3. trims ~1px off the edge so no pale halo shows on the dark garage floor,
  4. crops to the visible pixels and records an anchor point + world scale.

Special cases
  wheel  - garbled sidewall lettering removed with a local angular median
           filter (keeps the radial shading and the moulded rings), the five
           lug nuts lifted out as a reusable sprite and inpainted away.
  jack   - split into a static chassis and a moving arm. The cut follows a
           circle around the arm pivot, so the seam stays closed while the arm
           rotates down into the chassis.
"""

import json
import os
import re

import cv2
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "source")
OUT = os.path.join(ROOT, "assets", "sprites")
JS = os.path.join(ROOT, "src", "content", "sprites.js")

# ---------------------------------------------------------------- world scale
# world unit = one pixel of car_body.jpeg
CAR_PX_PER_M = 673.0            # from a 630 mm tall tyre
WHEEL_R = 911.0                 # native outer radius of the round parts
WORLD_TYRE_R = 212.0
S_WHEEL = WORLD_TYRE_R / WHEEL_R          # 0.2327
S_DISC = 113.0 / WHEEL_R                  # 0.1240
S_HUB = 53.0 / WHEEL_R                    # 0.0582
S_JACK = 0.25
S_STAND = 0.128
NUT_R = 58.0                              # native radius of one lug nut
LUG_NUTS = [(1187, 975), (1024, 859), (860, 975), (925, 1169), (1124, 1168)]
JACK_PIVOT = (975, 1240)                  # native, centre of the arm pivot boss
JACK_SADDLE = (1562, 727)                 # native, centre of the saddle top


# ---------------------------------------------------------------- utilities
def load(name):
    return np.asarray(Image.open(os.path.join(SRC, name)).convert("RGB"))


def components(mask):
    n, lab, stats, cent = cv2.connectedComponentsWithStats(mask.astype(np.uint8), 8)
    return n, lab, stats, cent


def border_components(mask):
    """Ids of components that touch the image border."""
    n, lab, stats, _ = components(mask)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
    return edge - {0}, n, lab, stats


def background_mask(rgb, tol=245):
    """White regions reachable from the border."""
    white = rgb.min(axis=2) >= tol
    edge, n, lab, stats = border_components(white)
    bg = np.isin(lab, list(edge))
    return bg, white, lab, stats


def punch_holes(rgb, white, lab, stats, bg, min_area=5000, debug=""):
    """Enclosed flat-white regions are real holes in the drawing -> transparent."""
    holes = np.zeros_like(white)
    punched = []
    for i in range(1, len(stats)):
        x, y, w, h, area = stats[i]
        if area < min_area:
            continue
        region = lab == i
        if (region & bg).any():
            continue
        lum = rgb[region].mean(axis=1)
        if lum.mean() < 250 or lum.std() > 3.0:
            continue
        fill = area / float(w * h)
        if fill < 0.12:                      # long thin highlight, not a hole
            continue
        holes |= region
        punched.append((int(x), int(y), int(w), int(h), int(area), round(fill, 2)))
    if debug:
        print(f"    holes {debug}: {punched}")
    return holes


def soft_alpha(solid, erode=1, sigma=0.7):
    m = solid.astype(np.uint8) * 255
    if erode:
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * erode + 1,) * 2)
        m = cv2.erode(m, k)
    return cv2.GaussianBlur(m, (0, 0), sigma)


def crop_rgba(rgb, alpha, pad=0):
    ys, xs = np.nonzero(alpha > 4)
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + 1 + pad, rgb.shape[0])
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + 1 + pad, rgb.shape[1])
    return rgb[y0:y1, x0:x1], alpha[y0:y1, x0:x1], (int(x0), int(y0))


CAP = {"car": 2400, "default": 1200}


def save(name, rgb, alpha, offset):
    """Write the PNG, capping the long side so the browser does not keep
    2000x2000 RGBA buffers alive for parts that are drawn 400px wide."""
    rgba = np.dstack([rgb, alpha]).astype(np.uint8)
    cap = CAP.get(name, CAP["default"])
    long_side = max(rgba.shape[0], rgba.shape[1])
    k = min(1.0, cap / float(long_side))
    if k < 1.0:
        nw, nh = int(round(rgba.shape[1] * k)), int(round(rgba.shape[0] * k))
        img = Image.fromarray(rgba, "RGBA").resize((nw, nh), Image.LANCZOS)
    else:
        img = Image.fromarray(rgba, "RGBA")
    path = os.path.join(OUT, name + ".png")
    img.save(path, optimize=True)
    return {
        "file": f"assets/sprites/{name}.png",
        "w": img.width,
        "h": img.height,
        "ox": offset[0],
        "oy": offset[1],
        "k": round(k, 6),
    }


def standard(name, src, scale, anchor=(WHEEL_R * 1.0 + 114, WHEEL_R * 1.0 + 114),
             min_hole=5000, punch=True, debug=None):
    rgb = load(src)
    bg, white, lab, stats = background_mask(rgb)
    holes = punch_holes(rgb, white, lab, stats, bg, min_hole, debug or src) if punch else np.zeros_like(bg)
    solid = ~bg & ~holes
    alpha = soft_alpha(solid)
    crgb, calpha, off = crop_rgba(rgb, alpha)
    info = save(name, crgb, calpha, off)
    # anchor in sprite-local pixels
    info["ax"] = (anchor[0] - off[0]) * info["k"]
    info["ay"] = (anchor[1] - off[1]) * info["k"]
    info["s"] = scale / info["k"]
    return info


# ---------------------------------------------------------------- wheel work
def clean_sidewall(rgb, cx=1025, cy=1025, r0=578, r1=856, feather=26,
                   tol=42.0, nang=1440):
    """Erase the garbled sidewall lettering.

    The tyre sidewall is a solid of revolution, so its colour depends almost
    only on the radius. We build that radial profile, then repaint only the
    pixels that sit close to it (the faint moulded lettering) and leave
    anything with real contrast - the tread blocks, the valve stem - alone.
    """
    h, w, _ = rgb.shape
    rad = np.arange(500, 950, 1.0)
    ang = np.linspace(0, 2 * np.pi, nang, endpoint=False)
    A, R = np.meshgrid(ang, rad)
    xs = (cx + R * np.cos(A)).round().astype(int).clip(0, w - 1)
    ys = (cy + R * np.sin(A)).round().astype(int).clip(0, h - 1)
    polar = rgb[ys, xs].astype(np.float32)                      # (nr, nang, 3)
    prof = np.median(polar, axis=1)                             # (nr, 3)
    prof = cv2.GaussianBlur(prof.reshape(-1, 1, 3), (1, 9), 0).reshape(-1, 3)

    yy, xx = np.mgrid[0:h, 0:w]
    d = np.hypot(xx - cx, yy - cy)
    prof_px = prof[(d.round().astype(int) - 500).clip(0, len(prof) - 1)]
    prof_px = cv2.GaussianBlur(prof_px.astype(np.float32), (0, 0), 1.2)

    res = np.abs(rgb.astype(np.float32) - prof_px).max(axis=2)
    near = res < tol
    rw = np.clip((d - r0) / feather, 0, 1) * np.clip((r1 - d) / feather, 0, 1)
    m = (near.astype(np.float32) * rw)
    m = cv2.GaussianBlur(m, (0, 0), 2.2)[:, :, None]
    out = rgb.astype(np.float32) * (1 - m) + prof_px * m
    out = cv2.GaussianBlur(out, (0, 0), 0.9)
    return np.clip(out, 0, 255).astype(np.uint8)


def wheel_sprites():
    rgb = load("front_wheel.jpeg")
    rgb = clean_sidewall(rgb)

    # one lug nut as its own sprite (from the untouched wheel)
    orig = load("front_wheel.jpeg")
    cx, cy = LUG_NUTS[1]
    r = int(NUT_R) + 12
    y0, y1, x0, x1 = cy - r, cy + r, cx - r, cx + r
    n_rgb = orig[y0:y1, x0:x1]
    yy, xx = np.mgrid[y0:y1, x0:x1]
    d = np.hypot(xx - LUG_NUTS[1][0], yy - LUG_NUTS[1][1])
    n_alpha = np.clip((NUT_R + 1.5 - d) / 3.0, 0, 1) * 255
    nut = save("nut", n_rgb, n_alpha, (int(x0), int(y0)))
    nut.update({"ax": (NUT_R + 12) * nut["k"], "ay": (NUT_R + 12) * nut["k"],
                "s": S_WHEEL / nut["k"]})
    nut["meta"] = {"worldR": NUT_R * S_WHEEL, "spriteR": (NUT_R + 12) * nut["k"]}

    # Erase the nuts from the wheel face and leave a flat patch of wheel-face
    # colour behind; the app draws a stud hole over it when a nut is removed.
    clean = rgb.copy()
    yy, xx = np.mgrid[0:rgb.shape[0], 0:rgb.shape[1]]
    for nx, ny in LUG_NUTS:
        d = int(NUT_R) + 14
        y0, y1, x0, x1 = ny - d, ny + d, nx - d, nx + d
        py, px2 = np.mgrid[y0:y1, x0:x1]
        dist = np.hypot(px2 - nx, py - ny)
        ring = (dist > NUT_R + 4) & (dist < NUT_R + 12)
        face = np.median(rgb[y0:y1, x0:x1][ring].reshape(-1, 3), axis=0)
        blend = np.clip((NUT_R + 2.0 - dist) / 4.0, 0, 1)[:, :, None]
        reg = clean[y0:y1, x0:x1].astype(np.float32)
        clean[y0:y1, x0:x1] = (reg * (1 - blend) + face * blend).astype(np.uint8)

    bg, white, lab, stats = background_mask(clean)
    solid = ~bg
    alpha = soft_alpha(solid)
    crgb, calpha, off = crop_rgba(clean, alpha)
    wheel = save("wheel", crgb, calpha, off)
    wheel.update({"ax": (911 + 114 - off[0]) * wheel["k"],
                  "ay": (911 + 114 - off[1]) * wheel["k"],
                  "s": S_WHEEL / wheel["k"]})
    return wheel, nut


# ---------------------------------------------------------------- jack split
def jack_sprites():
    rgb = load("hydraulic_jack.jpeg")
    bg, white, lab, stats = background_mask(rgb)
    holes = punch_holes(rgb, white, lab, stats, bg, 5000, "jack")
    solid = ~bg & ~holes

    px, py = JACK_PIVOT
    yy, xx = np.mgrid[0:rgb.shape[0], 0:rgb.shape[1]]
    r = np.hypot(xx - px, yy - py)
    # chassis top edge, from (985,1218) to (1799,1428)
    top = 1218.0 + (xx - 985.0) * (1428.0 - 1218.0) / (1799.0 - 985.0)
    moving = solid & (r > 210) & (yy < top) & (xx > 760)

    body_a = soft_alpha(solid & ~moving)
    arm_a = soft_alpha(solid & moving)
    common = soft_alpha(solid)
    ys, xs = np.nonzero(common > 4)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    off = (int(x0), int(y0))
    body = save("jack_body", rgb[y0:y1, x0:x1], body_a[y0:y1, x0:x1], off)
    arm = save("jack_arm", rgb[y0:y1, x0:x1], arm_a[y0:y1, x0:x1], off)
    k = body["k"]
    meta = {
        "pivot": [(JACK_PIVOT[0] - off[0]) * k, (JACK_PIVOT[1] - off[1]) * k],
        "saddle": [(JACK_SADDLE[0] - off[0]) * k, (JACK_SADDLE[1] - off[1]) * k],
        "floorY": (1680 - off[1]) * k,
    }
    body.update({"ax": 0, "ay": 0, "s": S_JACK / k, "meta": meta})
    arm.update({"ax": 0, "ay": 0, "s": S_JACK / k, "meta": meta})
    return body, arm


# ---------------------------------------------------------------- pads split
def pad_sprites():
    rgb = load("brake_pads.jpeg")
    bg, white, lab, stats = background_mask(rgb)
    solid = ~bg
    n, plab, pstats, _ = components(solid)
    big = [(i, pstats[i]) for i in range(1, n) if pstats[i][4] > 20000]
    big.sort(key=lambda t: t[1][0])
    out = []
    for name, (i, st) in zip(("pad_friction", "pad_backing"), big[:2]):
        region = (plab == i).astype(np.uint8) * 255
        region = cv2.dilate(region, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
        a = soft_alpha(region > 127, erode=1, sigma=0.8)
        crgb, calpha, off = crop_rgba(rgb, a)
        info = save(name, crgb, calpha, off)
        # a pad is ~105 world px long
        long_side = max(info["w"], info["h"])
        info.update({"ax": info["w"] / 2, "ay": info["h"] / 2,
                     "s": 105.0 / long_side})
        out.append(info)
    return out


# ---------------------------------------------------------------- main
def main():
    os.makedirs(OUT, exist_ok=True)
    src_js = os.path.join(ROOT, "src", "content")
    os.makedirs(src_js, exist_ok=True)

    print("car")
    car = standard("car", "car_body.jpeg", 1.0, anchor=(0, 0))
    print("disc")
    disc = standard("brake_disc", "brake_disc.jpeg", S_DISC)
    print("hub")
    hub = standard("wheel_hub", "wheel_hub.jpeg", S_HUB)
    print("caliper")
    cali = load("brake_caliper.jpeg")
    cbg, cwhite, clab, cstats = background_mask(cali)
    choles = punch_holes(cali, cwhite, clab, cstats, cbg, 5000, "caliper")
    calpha = soft_alpha(~cbg & ~choles)
    crgb, calpha, off = crop_rgba(cali, calpha)
    caliper = save("caliper", crgb, calpha, off)
    caliper.update({"ax": caliper["w"] / 2, "ay": caliper["h"] / 2,
                    "s": 126.6 / (caliper["h"] * caliper["k"]) * caliper["k"]})
    print("stand")
    stand = standard("stand", "jack_stand.jpeg", S_STAND,
                     anchor=(1028, 1844), debug="stand")
    stand["meta"] = {"nativeTall": 1634.0}
    print("wrench")
    wrench = standard("lug_wrench", "lug_wrench.jpeg", 1.0, anchor=(1025, 1042))
    span = float(max(wrench["w"], wrench["h"]))
    wrench["s"] = 255.0 / span
    wrench["ax"], wrench["ay"] = wrench["w"] / 2, wrench["h"] / 2
    wrench["meta"] = {"span": 255.0}
    print("ratchet")
    ratchet = standard("ratchet_socket", "socket_wrench.jpeg", 1.0,
                       anchor=(1024, 1024))
    long_side = float(max(ratchet["w"], ratchet["h"]))
    ratchet["s"] = 170.0 / long_side
    ratchet["ax"], ratchet["ay"] = ratchet["w"] / 2, ratchet["h"] / 2

    wheel, nut = wheel_sprites()
    body, arm = jack_sprites()
    friction, backing = pad_sprites()

    manifest = {
        "car": car, "wheel": wheel, "nut": nut, "hub": hub, "disc": disc,
        "caliper": caliper, "stand": stand, "wrench": wrench,
        "ratchet": ratchet, "jackBody": body, "jackArm": arm,
        "padFriction": friction, "padBacking": backing,
        "const": {
            "pxPerM": CAR_PX_PER_M,
            "tyreR": WORLD_TYRE_R,
            "discR": 113.0,
            "hubR": 53.0,
            "groundY": 1174.0,
            "axles": {"front": [605, 962], "rear": [2286, 962]},
            "nutPitch": 172.0 * S_WHEEL,
            "nutAngles": [18, 90, 162, 234, 306],
        },
    }
    with open(JS, "w", encoding="utf-8") as f:
        f.write("/* generated by tools/prepare_assets.py - do not edit by hand */\n")
        f.write("window.VG_SPRITES = ")
        json.dump(manifest, f, indent=2)
        f.write(";\n")
    print("manifest ->", os.path.relpath(JS, ROOT))
    for k, v in manifest.items():
        if k != "const":
            print(f"  {k:14s} {v['w']}x{v['h']} world={v['w']*v['s']:.0f}px")


if __name__ == "__main__":
    main()
