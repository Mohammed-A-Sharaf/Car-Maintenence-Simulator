#!/usr/bin/env python3
"""
Virtual Garage - paint the workshop backdrop with Pillow.

src/content/garage.js is a list of plain shapes (rect / ell / poly / line) in
world units. src/scene/garage.js turns that list into SVG for the browser;
this module turns the *same* list into pixels, so the stills in docs/ and the
running app show the same room. Fill rules, in both renderers:

    solid colour            -> flat
    [c0, c1] on a rect/poly -> vertical gradient over the shape's own height
    [c0, c1] on an ellipse  -> radial gradient from its centre
    "o"                     -> extra opacity on top of the colour's own alpha
"""

import json
import math
import os

import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_CACHE = {}


def load(shapes=None):
    """The shape list, straight out of the generated content file."""
    if shapes is not None:
        return shapes
    if "list" not in _CACHE:
        txt = open(os.path.join(ROOT, "src/content/garage.js"), encoding="utf-8").read()
        tag = "window.VG_GARAGE = "
        body = txt[txt.index(tag) + len(tag):]
        _CACHE["list"] = json.loads(body.rstrip().rstrip(";"))
    return _CACHE["list"]


def _rgba(c, extra=1.0):
    """'#rrggbb' / 'rgba(r,g,b,a)' -> (r, g, b, a) with a in 0..1"""
    if isinstance(c, str) and c.startswith("rgba"):
        v = [float(t) for t in c[c.index("(") + 1:c.index(")")].split(",")]
        return (v[0], v[1], v[2], min(1.0, max(0.0, v[3] * extra)))
    h = c.lstrip("#")
    if len(h) == 3:
        h = "".join(ch * 2 for ch in h)
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), extra)


class Painter(object):
    """Paints the shape list onto an RGB image for one camera frame."""

    def __init__(self, im, ox, oy, k):
        self.base = np.asarray(im.convert("RGB"), np.float32) / 255.0
        self.h, self.w = self.base.shape[:2]
        self.ox, self.oy, self.k = ox, oy, k

    # world -> pixel
    def px(self, x):
        return (x - self.ox) * self.k

    def py(self, y):
        return (y - self.oy) * self.k

    def save_into(self, im):
        out = Image.fromarray(np.clip(self.base * 255.0 + 0.5, 0, 255).astype(np.uint8))
        im.paste(out)

    def _blend(self, box, mask, rgb, alpha):
        """rgba arrays are all the same shape as box's slice"""
        x0, y0, x1, y1 = box
        a = (mask * alpha)[..., None]
        sl = self.base[y0:y1, x0:x1]
        self.base[y0:y1, x0:x1] = sl * (1 - a) + rgb * a

    def _fill(self, spec, box_world, extra):
        """Returns (rgb HxWx3, alpha HxW) for the pixels of one shape."""
        x0, y0, x1, y1 = self._box
        hh, ww = y1 - y0, x1 - x0
        if not isinstance(spec, list):
            r, g, b, a = _rgba(spec, extra)
            rgb = np.empty((hh, ww, 3), np.float32)
            rgb[..., 0], rgb[..., 1], rgb[..., 2] = r / 255.0, g / 255.0, b / 255.0
            return rgb, np.full((hh, ww), a, np.float32)
        c0, c1 = _rgba(spec[0], extra), _rgba(spec[1], extra)
        if self._radial:
            cx, cy = self.px(box_world[0] + box_world[2] / 2.0), self.py(box_world[1] + box_world[3] / 2.0)
            rr = max(1e-6, max(box_world[2], box_world[3]) * self.k / 2.0)
            xs = np.arange(x0, x1)[None, :] + 0.5
            ys = np.arange(y0, y1)[:, None] + 0.5
            t = np.clip(np.sqrt((xs - cx) ** 2 + (ys - cy) ** 2) / rr, 0.0, 1.0)
        else:
            ys = np.arange(y0, y1)[:, None] + 0.5
            y_top, y_bot = self.py(box_world[1]), self.py(box_world[1] + box_world[3])
            span = max(1e-6, y_bot - y_top)
            t = np.clip((ys - y_top) / span, 0.0, 1.0) * np.ones((1, ww), np.float32)
        rgb = np.empty((hh, ww, 3), np.float32)
        for ch in range(3):
            rgb[..., ch] = (c0[ch] * (1 - t) + c1[ch] * t) / 255.0
        return rgb, (c0[3] * (1 - t) + c1[3] * t).astype(np.float32)

    def _clip(self, wx0, wy0, wx1, wy1):
        x0 = max(0, int(math.floor(self.px(wx0))) - 2)
        y0 = max(0, int(math.floor(self.py(wy0))) - 2)
        x1 = min(self.w, int(math.ceil(self.px(wx1))) + 2)
        y1 = min(self.h, int(math.ceil(self.py(wy1))) + 2)
        if x1 <= x0 or y1 <= y0:
            return None
        return (x0, y0, x1, y1)

    def draw(self, s):
        self._radial = False
        kind = s["k"]
        o = s.get("o", 1)
        if kind == "rect" or kind == "ell":
            if kind == "rect":
                wx, wy, ww, wh = s["x"], s["y"], s["w"], s["h"]
            else:
                wx, wy = s["cx"] - s["rx"], s["cy"] - s["ry"]
                ww, wh = s["rx"] * 2, s["ry"] * 2
            box = self._clip(wx, wy, wx + ww, wy + wh)
            if not box:
                return
            self._box = box
            self._radial = kind == "ell"
            mask = Image.new("L", (box[2] - box[0], box[3] - box[1]), 0)
            d = ImageDraw.Draw(mask)
            if kind == "rect":
                r = int(round(s.get("r", 0) * self.k))
                d.rounded_rectangle([self.px(wx) - box[0], self.py(wy) - box[1],
                                     self.px(wx + ww) - box[0] - 1, self.py(wy + wh) - box[1] - 1],
                                    radius=r, fill=255)
            else:
                d.ellipse([self.px(wx) - box[0], self.py(wy) - box[1],
                           self.px(wx + ww) - box[0], self.py(wy + wh) - box[1]], fill=255)
            rgb, alpha = self._fill(s["fill"], (wx, wy, ww, wh), o)
            self._blend(box, np.asarray(mask, np.float32) / 255.0, rgb, alpha)
        elif kind == "poly":
            pts = s["pts"]
            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            box = self._clip(min(xs), min(ys), max(xs), max(ys))
            if not box:
                return
            self._box = box
            mask = Image.new("L", (box[2] - box[0], box[3] - box[1]), 0)
            ImageDraw.Draw(mask).polygon(
                [(self.px(a) - box[0], self.py(b) - box[1]) for a, b in pts], fill=255)
            rgb, alpha = self._fill(s["fill"], (min(xs), min(ys), max(xs) - min(xs),
                                                max(ys) - min(ys)), o)
            self._blend(box, np.asarray(mask, np.float32) / 255.0, rgb, alpha)
        elif kind == "line":
            wid = max(1, int(round(s["w"] * self.k)))
            box = self._clip(min(s["x1"], s["x2"]) - s["w"], min(s["y1"], s["y2"]) - s["w"],
                             max(s["x1"], s["x2"]) + s["w"], max(s["y1"], s["y2"]) + s["w"])
            if not box:
                return
            mask = Image.new("L", (box[2] - box[0], box[3] - box[1]), 0)
            d = ImageDraw.Draw(mask)
            x1, y1 = self.px(s["x1"]) - box[0], self.py(s["y1"]) - box[1]
            x2, y2 = self.px(s["x2"]) - box[0], self.py(s["y2"]) - box[1]
            d.line([(x1, y1), (x2, y2)], fill=255, width=wid)
            for cx, cy in ((x1, y1), (x2, y2)):          # round caps, like the SVG
                d.ellipse([cx - wid / 2.0, cy - wid / 2.0, cx + wid / 2.0, cy + wid / 2.0], fill=255)
            r, g, b, a = _rgba(s["c"], o)
            rgb = np.empty((box[3] - box[1], box[2] - box[0], 3), np.float32)
            rgb[..., 0], rgb[..., 1], rgb[..., 2] = r / 255.0, g / 255.0, b / 255.0
            self._blend(box, np.asarray(mask, np.float32) / 255.0,
                        rgb, np.full(mask.size[::-1], a, np.float32))


def paint(im, ox, oy, k, shapes=None):
    """Paint the whole backdrop onto `im` (RGB) for a frame at world origin
    (ox, oy) and scale k pixels per world unit."""
    p = Painter(im, ox, oy, k)
    for s in load(shapes):
        p.draw(s)
    p.save_into(im)
    return im
