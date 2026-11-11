/* Virtual Garage - camera.
   The camera is a circle of interest in world units: centre + width. The
   viewBox height follows the stage aspect, so nothing is ever stretched.

   Three ways to drive it, all of them the player's own doing:
     focusPart("wheel") frame one part, sized so it fills about half the stage
     zoomAt(f, x, y)    smooth zoom about a world point (wheel, pinch, keys)
     back()             undo the last move, so a close-up is never a trap

   go("front") is still the way the lessons set a view; it clears the history,
   because a new step is a new place to be. */
(function () {
  "use strict";
  var VG = window.VG, U = VG.util, L = window.VG_LAYOUT;

  var MIN_W = 320, MAX_W = 4600;
  var BOX = { x0: -900, x1: 3820, y0: -600, y1: 2200 };
  var FILL = 2.0;                  /* frame width = part size x FILL (unused) */

  /* Half the width of each part in world units (x1.1 for a margin). Small parts
     are lifted by MIN_W so they still arrive with some context around them. */
  var FOCUS_R = {
    wheel: 233, hub: 58, nut: 18, disc: 124, caliper: 83, pad: 45, bolt: 20,
    jack: 256, stand: 143, jackpoint: 200, standpoint: 190, car: 900
  };
  var FOCUS_LABEL = {
    wheel: "Wheel", hub: "Hub", nut: "Wheel nut", disc: "Brake disc",
    caliper: "Caliper", pad: "Brake pad", bolt: "Guide pin",
    jack: "Trolley jack", stand: "Axle stand", jackpoint: "Jacking point",
    standpoint: "Standing point"
  };

  /* The last handful of places the player has looked at. Every deliberate
     camera move pushes the view it is leaving, so "back" walks out the way it
     came in: disc -> wheel -> the lesson's own view. */
  var hist = [], lastPush = 0;

  function snap() {
    var S = VG.S;
    return { cx: S.cam.cx, cy: S.cam.cy, w: S.cam.w, label: S.camLabel || null, name: S.camName || "custom" };
  }
  function pushView() {
    var S = VG.S;
    if (!S || !S.cam) return;
    var v = snap(), top = hist[hist.length - 1];
    if (top && Math.abs(top.w - v.w) < 1.5 && Math.abs(top.cx - v.cx) < 1.5 &&
        Math.abs(top.cy - v.cy) < 1.5) return;
    hist.push(v);
    if (hist.length > 12) hist.shift();
  }

  function clampX(x) { return U.clamp(x, BOX.x0, BOX.x1); }
  function clampY(y) { return U.clamp(y, BOX.y0, BOX.y1); }
  function clampW(w) { return U.clamp(w, MIN_W, MAX_W); }

  /* How wide the frame must be: width drives the zoom, so a part is the same
     size on a wide or a tall stage, but a very wide window may not crop the
     part vertically (capped, or the framing would blow out). */
  function widthFor(S, r) {
    var a = Math.min(1, Math.max(0.35, S.aspect || 0.5625));
    var byWidth = 4 * r;                       /* part fills ~45% of the width */
    var byHeight = (2 * r * 1.15) / a;
    return clampW(Math.max(byWidth, Math.min(byHeight, byWidth * 1.5)));
  }

  function go(name, animate) {
    var S = VG.S, p = L.camera[name];
    if (!p) return;
    hist.length = 0;                 /* a preset is a fresh start */
    S.camName = name;
    S.camLabel = null;
    var to = { cx: clampX(p[0]), cy: clampY(p[1]), w: clampW(p[2]) };
    if (animate === false) {
      S.cam.cx = to.cx; S.cam.cy = to.cy; S.cam.w = to.w;
    } else {
      U.anim.tween(S.cam, to, 0.7, "inOutCubic");
    }
  }

  /* back to whatever the current lesson says the view should be */
  function goLesson() {
    var les = VG.engine && VG.engine.lesson;
    var st = VG.engine && VG.engine.step ? VG.engine.step() : null;
    go((st && st.cam) || (les && les.cam) || "overview");
  }

  function fit(host, S) {
    var r = host.getBoundingClientRect();
    S.aspect = r.height > 0 && r.width > 0 ? r.height / r.width : 0.5625;
    S.stageW = r.width || 0;
  }

  /* zoom about a world point, keeping that point under the cursor */
  function zoomAt(S, factor, worldX, worldY, dur) {
    var now = Date.now ? Date.now() : 0;
    if (now - lastPush > 450) { pushView(); lastPush = now; }
    var w = clampW(S.cam.w * factor);
    var k = w / S.cam.w;
    var to = {
      w: w,
      cx: clampX(worldX + (S.cam.cx - worldX) * k),
      cy: clampY(worldY + (S.cam.cy - worldY) * k)
    };
    S.camName = "custom";
    if (dur === 0) {
      S.cam.w = to.w; S.cam.cx = to.cx; S.cam.cy = to.cy;
    } else {
      U.anim.tween(S.cam, to, dur == null ? 0.2 : dur, "outCubic");
    }
  }

  /* frame a world point; r is the half-extent that should fill the stage */
  function focusOn(S, x, y, r, dur) {
    pushView();
    var to = { cx: clampX(x), cy: clampY(y), w: widthFor(S, r) };
    S.camName = "custom";
    U.anim.tween(S.cam, to, dur == null ? 0.55 : dur, "inOutCubic");
  }

  /* Where each part lives right now, and how much of it to show. Parts that
     have been taken off are framed where they were dropped, not where they
     came from. */
  function targetFor(hit, axle, i, S) {
    S = S || VG.S || {};
    var a = (axle === "rear" ? L.axles.rear : L.axles.front);
    var G = VG.geom, SPR = window.VG_SPRITES;
    var cal = S.caliper || { dx: 0, dy: 0 };
    var pads = (S.pads && S.pads[i || 0]) || { dx: 0, dy: 0 };
    var disc = S.disc || { dx: 0, dy: 0 };
    var calX = a[0] + L.caliperDx + (cal.dx || 0);
    var calY = a[1] + (L.caliperDy || 0) + (cal.dy || 0);
    var jack = SPR ? SPR.jackBody : null;
    var jw = jack ? jack.w * jack.s : 466, jh = jack ? jack.h * jack.s : 319;

    switch (hit) {
      case "wheel":
        return { x: a[0], y: a[1] - 10, r: FOCUS_R.wheel, label: FOCUS_LABEL.wheel };
      case "hub":
        return { x: a[0], y: a[1], r: FOCUS_R.hub, label: FOCUS_LABEL.hub };
      case "nut":
        return { x: a[0], y: a[1], r: FOCUS_R.nut, label: FOCUS_LABEL.nut };
      case "disc":
        return { x: a[0] + (disc.dx || 0), y: a[1] + (disc.dy || 0), r: FOCUS_R.disc, label: FOCUS_LABEL.disc };
      case "caliper":
        return { x: calX, y: calY, r: FOCUS_R.caliper, label: FOCUS_LABEL.caliper };
      case "bolt":
        return { x: calX, y: calY, r: FOCUS_R.bolt, label: FOCUS_LABEL.bolt };
      case "pad":
        return {
          x: a[0] + L.padPlace[i || 0][0] + (pads.dx || 0),
          y: a[1] + L.padPlace[i || 0][1] + (pads.dy || 0),
          r: FOCUS_R.pad, label: FOCUS_LABEL.pad
        };
      case "jack":
        return {
          x: G.jackOrigin[0] + jw / 2, y: G.jackOrigin[1] + jh / 2,
          r: FOCUS_R.jack, label: FOCUS_LABEL.jack
        };
      case "stand":
        return { x: L.standX, y: L.groundY - 105, r: FOCUS_R.stand, label: FOCUS_LABEL.stand };
      case "jackpoint":
        return { x: L.jackSaddleX, y: L.groundY - 90, r: FOCUS_R.jackpoint, label: FOCUS_LABEL.jackpoint };
      case "standpoint":
        return { x: L.standX, y: L.groundY - 90, r: FOCUS_R.standpoint, label: FOCUS_LABEL.standpoint };
      default:
        return null;
    }
  }

  function focusPart(hit, axle, i, dur) {
    var S = VG.S, t = targetFor(hit, axle, i, S);
    if (!t || !S) return false;
    /* remember where we were *before* the new name is attached, or "back"
       would restore a view labelled with the part we just left */
    pushView();
    S.camLabel = t.label;
    focusOn(S, t.x, t.y, t.r, dur);
    return true;
  }

  /* Undo the last camera move. With nothing left to undo, fall back to the
     view the current step wants, which is where the player naturally belongs. */
  function back() {
    var S = VG.S;
    if (!S) return false;
    var v = hist.pop();
    if (!v) { goLesson(); return false; }
    S.camName = v.name;
    S.camLabel = v.label;
    U.anim.tween(S.cam, { cx: v.cx, cy: v.cy, w: v.w }, 0.55, "inOutCubic");
    return true;
  }

  /* nudge by a number of screen pixels (drag panning) */
  function panBy(S, dxPx, dyPx) {
    var k = S.cam.w / (S.stageW || 1440);
    S.cam.cx = clampX(S.cam.cx - dxPx * k);
    S.cam.cy = clampY(S.cam.cy - dyPx * k);
    S.camName = "custom";
  }

  /* 1.0 = the lesson's own framing, >1 = closer in */
  function zoomLevel(S) {
    var p = L.camera[(VG.engine && VG.engine.lesson && VG.engine.lesson.cam) || "overview"];
    var base = p ? p[2] : 3800;
    return base / S.cam.w;
  }

  function isCustom() { return VG.S && VG.S.camName === "custom"; }

  VG.camera = {
    go: go, goLesson: goLesson, fit: fit, zoomAt: zoomAt, focusOn: focusOn,
    focusPart: focusPart, panBy: panBy, zoomLevel: zoomLevel, isCustom: isCustom,
    back: back, history: function () { return hist.length; },
    targetFor: targetFor, widthFor: widthFor,
    MIN_W: MIN_W, MAX_W: MAX_W
  };
})();
