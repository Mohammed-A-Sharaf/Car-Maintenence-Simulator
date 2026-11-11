#!/usr/bin/env python3
"""
Virtual Garage - full-window mock-up of the dashboard.

There is no browser in this sandbox, so the chrome (sidebar, header with
level/XP, stage card with its dock, the learning-path rail) is redrawn here with
the *same* numbers styles/main.css uses, over a scene rendered by
preview_states.py. It is how the layout is checked for collisions.

    python3 tools/preview_ui.py
    -> docs/ui-check.jpg
"""

import os
import sys

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import preview_states as P  # noqa: E402  (loads the sprite manifest and layout)

ROOT = P.ROOT
DOCS = os.path.join(ROOT, "docs")

# window + shell geometry, straight out of main.css
W, H = 1680, 980
SIDE = 232
PAD = 26
RAIL = 348
GAP = 20
HEAD = 104
DOCK_H = 54

C_BG = (6, 10, 18)
C_SIDE = (9, 14, 24)
C_CARD = (13, 22, 38)
C_CARD2 = (17, 29, 51)
C_LINE = (25, 39, 64)
C_LINE2 = (38, 64, 99)
C_INK = (232, 239, 251)
C_MUTED = (126, 145, 174)
C_DIM = (93, 112, 145)
C_BLUE = (77, 139, 248)
C_BLUE2 = (125, 176, 255)
C_GREEN = (56, 211, 159)
C_AMBER = (255, 182, 77)

F = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def font(px, bold=False):
    try:
        return ImageFont.truetype(FB if bold else F, px)
    except OSError:
        return ImageFont.load_default()


f29b, f21b, f16b, f14b, f135b, f135, f125b, f125, f115, f11, f105, f95 = (
    font(29, True), font(21, True), font(16, True), font(14, True), font(13.5, True),
    font(13.5), font(12.5, True), font(12.5), font(11.5), font(11), font(10.5), font(9.5))


def txt(d, xy, s, f=f125, fill=C_INK, anchor=None):
    d.text(xy, s, font=f, fill=fill, anchor=anchor)


def rr(d, box, r, fill=None, outline=None, w=1):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=w)


def wrap(d, text, f, width):
    words, lines, line = text.split(" "), [], ""
    for wd in words:
        probe = (line + " " + wd).strip()
        if d.textlength(probe, font=f) <= width or not line:
            line = probe
        else:
            lines.append(line)
            line = wd
    if line:
        lines.append(line)
    return lines


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def vgrad(img, box, top, bottom):
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = box
    for y in range(int(y0), int(y1)):
        t = (y - y0) / max(1, (y1 - y0))
        d.line([(x0, y), (x1, y)], fill=lerp(top, bottom, t))


# --------------------------------------------------------------- icons ----
def ico_home(d, x, y, col):
    d.line([(x - 7, y - 1), (x, y - 7), (x + 7, y - 1)], fill=col, width=2, joint="curve")
    d.line([(x - 5, y - 1), (x - 5, y + 6), (x + 5, y + 6), (x + 5, y - 1)], fill=col, width=2)
    d.line([(x - 1.5, y + 6), (x - 1.5, y + 2)], fill=col, width=2)


def ico_book(d, x, y, col):
    d.rounded_rectangle([x - 6, y - 7, x + 6, y + 7], radius=2, outline=col, width=2)
    d.line([(x - 2.5, y - 7), (x - 2.5, y + 7)], fill=col, width=2)


def ico_tools(d, x, y, col):
    d.line([(x - 6, y + 6), (x + 2, y - 2)], fill=col, width=2)
    d.arc([x + 1, y - 8, x + 9, y], 300, 200, fill=col, width=2)


def ico_cup(d, x, y, col):
    d.line([(x - 5, y - 7), (x + 5, y - 7)], fill=col, width=2)
    d.line([(x - 5, y - 7), (x - 4, y - 1)], fill=col, width=2)
    d.line([(x + 5, y - 7), (x + 4, y - 1)], fill=col, width=2)
    d.arc([x - 4, y - 2, x + 4, y + 2], 0, 180, fill=col, width=2)
    d.line([(x, y + 2), (x, y + 5)], fill=col, width=2)
    d.line([(x - 3, y + 6), (x + 3, y + 6)], fill=col, width=2)


def ico_gear(d, x, y, col):
    d.ellipse([x - 3, y - 3, x + 3, y + 3], outline=col, width=2)
    for dx, dy in ((0, -7), (0, 7), (-7, 0), (7, 0), (5, -5), (-5, 5), (5, 5), (-5, -5)):
        d.line([(x + dx * 0.72, y + dy * 0.72), (x + dx, y + dy)], fill=col, width=2)


ICONS = {"home": ico_home, "book": ico_book, "tools": ico_tools, "cup": ico_cup, "gear": ico_gear}


def ico_check(d, x, y, col, s=1.0):
    d.line([(x - 4 * s, y), (x - 1 * s, y + 3.4 * s), (x + 4.4 * s, y - 3.6 * s)],
           fill=col, width=int(2 * s) or 1, joint="curve")


def ico_target(d, x, y, col):
    d.ellipse([x - 6.5, y - 6.5, x + 6.5, y + 6.5], outline=col, width=2)
    d.ellipse([x - 2.4, y - 2.4, x + 2.4, y + 2.4], fill=col)


def ico_play(d, x, y, col):
    d.ellipse([x - 6.5, y - 6.5, x + 6.5, y + 6.5], outline=col, width=2)
    d.polygon([(x - 2, y - 3.6), (x - 2, y + 3.6), (x + 3.6, y)], fill=col)


# --------------------------------------------------------------- scene ----
def stage_image(w, h):
    tmp = os.path.join(DOCS, "_ui_scene.jpg")
    # the camera gives the drawer its room, exactly as safeShift() does
    img = P.scene(tmp, "nose", arm=6.0, jack_x=P.JACK_O[0], stand=False,
                  nuts_loosened=5, wheel_off=False, safe=162 + DRAWER // 2)
    os.remove(tmp)
    s = max(w / img.width, h / img.height)
    img = img.resize((int(round(img.width * s)), int(round(img.height * s))), Image.LANCZOS)
    left = (img.width - w) // 2
    top = (img.height - h) // 3
    return img.crop([left, top, left + w, top + h])


# ------------------------------------------------------------- sidebar ----
def draw_side(out, d):
    vgrad(out, (0, 0, SIDE, H), (10, 17, 32), (7, 11, 20))
    d.line([(SIDE - 1, 0), (SIDE - 1, H)], fill=C_LINE)
    # brand badge
    for i in range(46):
        t = i / 46
        d.line([(26, 22 + i), (72, 22 + i)], fill=lerp(C_BLUE, (42, 92, 203), t))
    rr(d, [26, 22, 72, 68], 13, outline=(120, 165, 250))
    txt(d, (49, 45), "VG", font(15, True), (255, 255, 255), "mm")

    nav = [("home", "My Garage", True, None), ("book", "Lessons", False, None),
           ("tools", "Toolbox", False, None), ("cup", "Achievements", False, None),
           ("gear", "Settings", False, "SOON")]
    y = 96
    for ico, label, active, pill in nav:
        if active:
            for i in range(42):
                t = i / 42
                d.line([(14, y + i), (218, y + i)], fill=lerp((30, 52, 90), (14, 22, 38), t))
            rr(d, [14, y, 218, y + 42], 10, outline=(58, 92, 150))
        ICONS[ico](d, 36, y + 21, C_BLUE2 if active else (95, 122, 158))
        txt(d, (58, y + 12), label, f135, (226, 236, 255) if active else C_MUTED)
        if pill:
            rr(d, [176, y + 13, 208, y + 29], 8, fill=(30, 38, 55))
            txt(d, (192, y + 21), pill, font(8, True), (107, 128, 161), "mm")
        y += 48

    d.ellipse([22, H - 34, 28, H - 28], fill=C_GREEN)
    txt(d, (38, H - 41), "Progress saved on this device", f105, (79, 100, 132))


# -------------------------------------------------------------- header ----
def draw_header(d, title):
    txt(d, (SIDE + PAD, 22), "Virtual Garage", font(12), C_BLUE2)
    txt(d, (SIDE + PAD, 40), title, f29b)

    right = W - PAD
    lvlw = 206
    x = right - lvlw
    txt(d, (x, 34), "Level 2", font(11.5, True), C_BLUE2)
    txt(d, (right, 34), "100 / 600 XP", font(11), C_MUTED, "ra")
    rr(d, [x, 54, right, 60], 3, fill=(30, 40, 60))
    rr(d, [x, 54, x + int(lvlw * (100 / 600)), 60], 3, fill=C_BLUE)

    ax = x - 20 - 22
    d.ellipse([ax - 22, 27, ax + 22, 71], fill=(16, 29, 50), outline=(90, 140, 230), width=2)
    d.ellipse([ax - 29, 20, ax + 29, 78], outline=(38, 60, 96), width=1)
    txt(d, (ax, 49), "GM", font(12, True), (207, 224, 255), "mm")
    txt(d, (ax - 40, 33), "Guest Mechanic", f135b, C_INK, "ra")
    txt(d, (ax - 40, 51), "Junior Technician", f115, C_MUTED, "ra")


# --------------------------------------------------------------- stage ----
def draw_stage(out, d, box, title, step_txt, pct):
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    vgrad(out, (x0, y0, x1, y1), (21, 42, 72), (8, 16, 32))
    # grid
    for gx in range(x0, x1, 74):
        d.line([(gx, y0), (gx, y1)], fill=(30, 52, 84))
    for gy in range(y0, y1, 74):
        d.line([(x0, gy), (x1, gy)], fill=(26, 45, 74))

    img = stage_image(w, h)
    out.paste(img, (x0, y0))
    # a soft shade behind the chips so the text reads over the bodywork
    shade = Image.new("RGBA", (w, 130), (6, 12, 24, 96))
    out.paste(shade, (x0, y0), shade)
    rr(d, box, 16, outline=C_LINE)

    # close-up chip: what the camera is looking at, with a way back
    zc = [x0 + 16, y0 + 14, x0 + 16 + 132, y0 + 48]
    rr(d, zc, 17, fill=(10, 18, 32), outline=(40, 58, 88))
    d.ellipse([zc[0] + 6, y0 + 19, zc[0] + 32, y0 + 45], fill=(24, 34, 52), outline=(44, 60, 88))
    txt(d, (zc[0] + 19, y0 + 24), "\u2039", font(15), (207, 220, 239), "ma")
    txt(d, (zc[0] + 40, y0 + 23), "Trolley jack", f115, (199, 214, 238))

    # toast
    msg = "Slacken the nuts while the tyre is still on the ground."
    tw = d.textlength(msg, font=f125)
    tx0 = x0 + (w - tw) / 2 - 16
    rr(d, [tx0, y0 + 16, tx0 + tw + 32, y0 + 54], 12, fill=(11, 19, 33), outline=(34, 48, 72))
    txt(d, (tx0 + 16, y0 + 26), msg, f125, C_INK)

    draw_taskpanel(out, d, box, step_txt)
    draw_toolbox(out, d, box)


def paste_sprite(out, key, x, y, h):
    path = os.path.join(ROOT, P.SPR[key]["file"])
    im = Image.open(path).convert("RGBA")
    k = h / im.height
    im = im.resize((max(1, int(im.width * k)), h), Image.LANCZOS)
    out.paste(im, (int(x), int(y)), im)


PANEL_W, PANEL_H = 346, 158


def paste_tool(out, key, cx, cy, h):
    """A tool sprite inside the little round tile in the panel."""
    path = os.path.join(ROOT, P.SPR[key]["file"])
    im = Image.open(path).convert("RGBA")
    k = h / im.height
    im = im.resize((max(1, int(im.width * k)), h), Image.LANCZOS)
    out.paste(im, (int(cx - im.width / 2), int(cy - im.height / 2)), im)


def draw_taskpanel(out, d, box, kicker, title="Pump the handle",
                   hint="Click the jack to pump. You will feel it take the weight just "
                        "before the nose starts to rise.",
                   tool="Trolley jack", tool_key="jackBody",
                   nxt="Click the jack to pump it up", done=2, total=7):
    """The one thing that follows the player around: the current task, one line
    of instruction, the tool in hand, the step pips and the next click."""
    x0, y0, x1, y1 = box
    box_ = [x0 + 18, y1 - 18 - PANEL_H, x0 + 18 + PANEL_W, y1 - 18]
    shade = Image.new("RGBA", (PANEL_W, PANEL_H), (0, 0, 0, 0))
    rr(d, box_, 16, fill=(13, 23, 39), outline=(34, 54, 82))
    d.line([(box_[0] + 14, box_[3] - 47), (box_[2] - 14, box_[3] - 47)], fill=(26, 38, 58))

    # head: kicker, pips, restart
    cy = box_[1] + 13
    txt(d, (box_[0] + 15, cy), kicker, font(10, True), C_BLUE2)
    kw = d.textlength(kicker, font=font(10, True))
    px = box_[0] + 15 + kw + 12
    praw = box_[2] - 15 - 30 - px
    step = min(22, praw / float(total))
    for i in range(total):
        col = (77, 139, 248) if i < done - 1 else ((125, 176, 255) if i == done - 1 else (54, 68, 92))
        bx = px + i * (praw / total)
        rr(d, [bx, cy + 2, bx + step, cy + 5], 2, fill=col)
    rx = box_[2] - 15 - 24
    d.ellipse([rx, cy - 1, rx + 22, cy + 21], fill=(20, 30, 47), outline=(44, 60, 88))
    d.arc([rx + 6, cy + 6, rx + 16, cy + 16], 300, 210, fill=(127, 147, 179), width=2)

    # task + instruction
    txt(d, (box_[0] + 15, cy + 27), title, font(15.5, True), (238, 244, 251))
    wrap(d, hint, f115, PANEL_W - 30)
    for i, line in enumerate(wrap(d, hint, f115, PANEL_W - 30)[:2]):
        txt(d, (box_[0] + 15, cy + 51 + i * 17), line, f115, (163, 182, 210))

    # foot: tool in hand, then the next click
    fy = box_[3] - 36
    tw = d.textlength(tool, font=font(11, True)) + 40
    rr(d, [box_[0] + 15, fy, box_[0] + 15 + tw, fy + 26], 13, fill=(24, 34, 52), outline=(40, 54, 78))
    d.ellipse([box_[0] + 19, fy + 3, box_[0] + 39, fy + 23], fill=(232, 239, 247))
    paste_tool(out, tool_key, box_[0] + 29, fy + 13, 16)
    txt(d, (box_[0] + 45, fy + 7), tool, font(11, True), (219, 230, 245))
    d.ellipse([box_[0] + 15 + tw + 12, fy + 10, box_[0] + 15 + tw + 19, fy + 17], fill=C_GREEN)
    txt(d, (box_[0] + 15 + tw + 27, fy + 7), nxt, f115, (207, 220, 239))


DRAWER = 264


def draw_toolbox(out, d, box):
    """The toolbox: a tab on the side of the stage and the drawer it opens.
    One tool in hand, the tool the step wants marked, the rest waiting."""
    x0, y0, x1, y1 = box
    top, bot = y0, y1 - 14 - DOCK_H - 10
    px = x1 - DRAWER

    # drawer
    rr(d, [px, top, x1, bot], 0, fill=(10, 18, 32))
    for i in range(bot - top):
        t = i / max(1, bot - top)
        d.line([(px, top + i), (x1 - 1, top + i)], fill=lerp((15, 27, 46), (8, 15, 27), t))
    d.line([(px, top), (px, bot)], fill=(34, 48, 72))

    txt(d, (px + 16, top + 18), "Toolbox", font(15, True), C_INK)
    rr(d, [x1 - 42, top + 13, x1 - 16, top + 39], 8, fill=(24, 33, 50))
    txt(d, ((x1 - 29), top + 18), "\u2715", font(11), C_MUTED, "ma")

    sub = "One tool at a time. The step tells you which one it wants."
    for i, line in enumerate(wrap(d, sub, font(11), DRAWER - 32)[:2]):
        txt(d, (px + 16, top + 46 + i * 15), line, font(11), C_MUTED)

    # step 3 wants the jack, and the lesson has already put it in your hand
    items = [
        ("Lug wrench", "wheel nuts", "1", "wrench", "not yet"),
        ("Ratchet", "caliper pins", "2", "ratchet", "not yet"),
        ("Trolley jack", "lift the car", "3", "jackBody", "in hand"),
        ("Axle stand", "hold it up", "4", "stand", "not yet"),
    ]
    y = top + 84
    for name, sub2, key, art, flag in items:
        on = flag == "in hand"
        now = True
        h = 54
        if on:
            rr(d, [px + 14, y, x1 - 14, y + h], 11, fill=(24, 44, 78), outline=(64, 116, 190))
        elif now:
            rr(d, [px + 14, y, x1 - 14, y + h], 11, fill=(20, 32, 52), outline=(50, 78, 122))
        else:
            rr(d, [px + 14, y, x1 - 14, y + h], 11, fill=(19, 25, 38), outline=(30, 40, 58))
        box_ico = [px + 24, y + 8, px + 70, y + 46]
        rr(d, box_ico, 9, fill=(112, 126, 146), outline=(150, 165, 186))
        paste_sprite_fit(out, art, box_ico, pad=5)
        col = (255, 255, 255) if on else ((214, 226, 244) if now else (150, 168, 194))
        txt(d, (px + 82, y + 11), name, font(12.5, True), col)
        txt(d, (px + 82, y + 30), sub2, font(10.5), (108, 128, 158))
        fcol = (156, 194, 255) if now else (92, 112, 147)
        txt(d, (x1 - 24, y + 19), flag, font(9.5, True), fcol, "ra")
        y += h + 7

    d.line([(px + 14, bot - 40), (x1 - 14, bot - 40)], fill=(28, 40, 62))
    d.ellipse([px + 16, bot - 29, px + 23, bot - 22], fill=C_GREEN)
    txt(d, (px + 31, bot - 34), "Trolley jack in hand", font(11), C_MUTED)

    # the tab, sitting on the edge of the stage (the app hides it while the
    # drawer is open; drawn here so the control itself is documented)
    # the tab doubles as the drawer's handle: with the drawer open it sits
    # flush against the drawer's left edge
    tw, th = 40, 190
    ty = (top + bot) / 2 - th / 2
    tx = px - tw
    rr(d, [tx, ty, tx + tw, ty + th], 12, fill=(20, 35, 58), outline=(40, 58, 88))
    d.rectangle([tx + tw - 8, ty + 2, tx + tw, ty + th - 2], fill=(20, 35, 58))
    ICONS["tools"](d, tx + tw / 2, ty + 24, (141, 176, 232))
    yy = ty + 46
    for ch in "TOOLBOX":
        txt(d, (tx + tw / 2, yy), ch, font(9.5, True), (150, 172, 202), "ma")
        yy += 14
    rr(d, [tx + tw / 2 - 9, ty + th - 26, tx + tw / 2 + 9, ty + th - 11], 8, fill=C_BLUE)
    txt(d, (tx + tw / 2, ty + th - 25), "4", font(9.5, True), (10, 20, 32), "ma")


def paste_sprite_fit(out, key, box, pad=4):
    path = os.path.join(ROOT, P.SPR[key]["file"])
    im = Image.open(path).convert("RGBA")
    bw, bh = box[2] - box[0] - 2 * pad, box[3] - box[1] - 2 * pad
    k = min(bw / im.width, bh / im.height)
    im = im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.LANCZOS)
    x = box[0] + (box[2] - box[0] - im.width) // 2
    y = box[1] + (box[3] - box[1] - im.height) // 2
    out.paste(im, (int(x), int(y)), im)


# ---------------------------------------------------------------- rail ----
LESSONS = [
    ("Free explore", "Pick a tool, or click any part to read about it.", None, "todo", 0.0),
    ("Lift & wheel off", "Jack it, support it, take the wheel off.", 250, "active", 0.34),
    ("Brake pads", "Undo the pins and swap the front pads.", 250, "done", 1.0),
    ("Brake disc", "Caliper off, disc off, new one on.", 200, "todo", 0.0),
    ("Refit & torque", "Wheel back on, torqued on the ground.", 300, "todo", 0.0),
]
LIFT_STEPS = [
    ("Slacken the five nuts", "In a star pattern, wheel on the ground."),
    ("Slide the jack under the nose", None),
    ("Pump the jack up", "Six pumps, until the stand fits."),
    ("Set the axle stand", None),
    ("Release the jack", None),
    ("Spin the nuts off", None),
    ("Pull the wheel away", None),
]


def draw_rail(d, box, done=1, total=4):
    x0, y0, x1, y1 = box
    # ring
    cx, cy, r = x0 + 26, y0 + 26, 22
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(34, 46, 68), width=4)
    if done:
        d.arc([cx - r, cy - r, cx + r, cy + r], -90, -90 + done / total * 360,
              fill=C_BLUE, width=4)
    txt(d, (cx, cy), "%d/%d" % (done, total), font(12.5, True), C_INK, "mm")

    txt(d, (x0 + 66, y0 + 4), "Learning Path", f21b)
    txt(d, (x0 + 66, y0 + 34), "Complete lessons to earn XP and", f115, C_MUTED)
    txt(d, (x0 + 66, y0 + 50), "level up.", f115, C_MUTED)

    y = y0 + 82
    cw = x1 - x0
    for title, sub, xp, state, pct in LESSONS:
        textw = cw - 60 - 14 - 62            # icon column, padding, XP chip
        sub_lines = wrap(d, sub, f115, textw)
        head_h = 16 + 18 + 4 + len(sub_lines) * 15 + 10 + 6
        body_h = 0
        if state == "active":
            body_h = 12
            for i, (label, detail) in enumerate(LIFT_STEPS):
                body_h += (34 if (i == 2 and detail) else 22)
            body_h += 96                    # divider, two hint lines, button
        h = head_h + body_h
        card = [x0, y, x1, y + h]
        rr(d, card, 14, fill=C_CARD2 if state == "active" else C_CARD,
           outline=(72, 116, 190) if state == "active" else
                   (46, 74, 116) if state == "done" else C_LINE,
           w=2 if state == "active" else 1)

        ic = [x0 + 14, y + 14, x0 + 48, y + 48]
        rr(d, ic, 10, fill=(34, 60, 100) if state == "active" else
           (24, 58, 48) if state == "done" else (24, 34, 52))
        ix, iy = x0 + 31, y + 31
        if state == "done":
            ico_check(d, ix, iy, C_GREEN, 1.3)
        elif state == "active":
            ico_target(d, ix, iy, C_BLUE2)
        else:
            ico_play(d, ix, iy, (107, 128, 161))

        txt(d, (x0 + 60, y + 14), title, f135b)
        for i, line in enumerate(sub_lines):
            txt(d, (x0 + 60, y + 33 + i * 15), line, f115, C_MUTED)
        bar = [x0 + 60, y + head_h - 14, x1 - 14, y + head_h - 10]
        rr(d, bar, 2, fill=(30, 40, 58))
        if pct:
            rr(d, [bar[0], bar[1], bar[0] + int((bar[2] - bar[0]) * pct), bar[3]], 2,
               fill=C_GREEN if state == "done" else C_BLUE)

        xplabel = "Free play" if xp is None else ("+%d XP" % xp if state != "done" else "\u2713 %d XP" % xp)
        txt(d, (x1 - 14, y + 16), xplabel, font(11.5, True),
            C_GREEN if state == "done" else C_BLUE2, "ra")

        if state == "active":
            sy = y + head_h + 12
            for i, (label, detail) in enumerate(LIFT_STEPS):
                cur, dn = i == 2, i < 2
                ny = sy + i * 22 + (12 if i > 2 else 0)
                nx = x0 + 31
                if dn:
                    d.ellipse([nx - 9, ny - 8, nx + 9, ny + 10], fill=(24, 58, 48),
                              outline=(50, 130, 105))
                    ico_check(d, nx, ny + 1, C_GREEN, 0.85)
                    txt(d, (nx + 18, ny - 6), label, font(12), (94, 118, 153))
                elif cur:
                    d.ellipse([nx - 9, ny - 8, nx + 9, ny + 10], fill=C_BLUE)
                    txt(d, (nx, ny + 1), str(i + 1), font(9.5), (255, 255, 255), "mm")
                    txt(d, (nx + 18, ny - 6), label, font(12), (228, 238, 252))
                    if detail:
                        txt(d, (nx + 18, ny + 10), detail, font(10.5), (95, 115, 145))
                else:
                    d.ellipse([nx - 9, ny - 8, nx + 9, ny + 10], outline=(46, 64, 94))
                    txt(d, (nx, ny + 1), str(i + 1), font(9.5), C_DIM, "mm")
                    txt(d, (nx + 18, ny - 6), label, font(12), C_MUTED)

            hy = card[3] - 96
            d.line([(x0 + 14, hy), (x1 - 14, hy)], fill=C_LINE)
            txt(d, (x0 + 16, hy + 9), "Pump the jack up.", font(11.5, True), C_BLUE2)
            txt(d, (x0 + 16, hy + 25), "Click the jack handle, or press the button below.", font(11.5), (182, 199, 226))
            txt(d, (x0 + 16, hy + 40), "Six pumps lift the nose clear of the stand.", font(11.5), (182, 199, 226))
            rr(d, [x0 + 14, hy + 56, x1 - 14, hy + 92], 10, fill=(30, 56, 96), outline=(64, 116, 190))
            txt(d, (x0 + 26, hy + 63), "Pump", font(12, True), (227, 239, 255))
            txt(d, (x0 + 26, hy + 78), "one stroke at a time", font(10), (150, 175, 210))

        y = card[3] + 10


def main():
    os.makedirs(DOCS, exist_ok=True)
    out = Image.new("RGB", (W, H), C_BG)
    d = ImageDraw.Draw(out, "RGBA")

    draw_side(out, d)
    draw_header(d, "Lift safely & remove a wheel")

    stage = [SIDE + PAD, HEAD, W - PAD - RAIL - GAP, H - 22]
    draw_stage(out, d, stage, "Lift safely & remove a wheel",
               "Step 3 of 7 · 3 of 6 done", 0.34)
    draw_rail(d, [W - PAD - RAIL, HEAD, W - PAD, H - 22], done=1, total=4)

    path = os.path.join(DOCS, "ui-check.jpg")
    out.save(path, quality=88)
    print("wrote", os.path.relpath(path, ROOT), out.size)


if __name__ == "__main__":
    main()
