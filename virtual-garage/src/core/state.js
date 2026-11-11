/* Virtual Garage - world geometry + the game state object.
   Everything the scene draws is derived from here, so a lesson only has to
   nudge a few numbers to get a believable animation. */
(function () {
  "use strict";
  var VG = window.VG, L = window.VG_LAYOUT, SPR = window.VG_SPRITES, U = VG.util;
  var jm = SPR.jackBody.meta, jS = SPR.jackBody.s;

  /* ---------------------------------------------------------- geometry ---- */
  function nutPos(i) {
    var a = U.rad(L.nutAngles[i]);
    return [Math.cos(a) * L.nutPitch, -Math.sin(a) * L.nutPitch];
  }

  /* Where the saddle top sits, in jack-sprite pixels, for a given arm angle. */
  function saddleLocal(armDeg) {
    var dx = jm.saddle[0] - jm.pivot[0], dy = jm.saddle[1] - jm.pivot[1];
    var t = U.rad(armDeg), c = Math.cos(t), s = Math.sin(t);
    return [
      jm.pivot[0] + dx * c - dy * s,
      jm.pivot[1] + dx * s + dy * c
    ];
  }

  /* Jack origin in world coordinates: chosen so that, with the arm fully down,
     the saddle sits just under the jacking point (and the wheels stay on the
     floor). The raised pose then lifts the nose by ~90px. */
  var lowSaddle = saddleLocal(L.jackArmLow);
  var jackOrigin = [
    L.jackSaddleX - lowSaddle[0] * jS,
    L.groundY - jm.floorY * jS
  ];

  function saddleWorld(armDeg) {
    var p = saddleLocal(armDeg);
    return [jackOrigin[0] + p[0] * jS, jackOrigin[1] + p[1] * jS];
  }

  /* The underside of the nose, before any pitch: a short sloped line. */
  function noseUnderside(x) {
    var n = L.noseLine;
    var t = U.clamp((x - n[0]) / (n[2] - n[0]), 0, 1);
    return n[1] + (n[3] - n[1]) * t;
  }

  /* Y of a world point after the body has pitched about the rear axle. */
  function pitched(x, y0, p) {
    var px = L.pitchPivot[0], py = L.pitchPivot[1];
    var rx = x - px, ry = y0 - py;
    return py + rx * Math.sin(p) + ry * Math.cos(p);
  }

  function noseY(x, p) { return pitched(x, noseUnderside(x), p); }
  function sillY(x, p) { return pitched(x, L.sillY, p); }

  /* How far the body must rotate for the nose to rest on the saddle. */
  function solvePitch(saddleX, saddleY) {
    if (saddleY >= noseY(saddleX, 0)) return 0;
    var lo = 0, hi = L.maxPitchLift;
    for (var i = 0; i < 26; i++) {
      var m = (lo + hi) / 2;
      if (noseY(saddleX, m) > saddleY) lo = m; else hi = m;
    }
    return (lo + hi) / 2;
  }

  function standHeight(pitch) { return L.groundY - sillY(L.standX, pitch); }

  /* A point given in car-body coordinates, once the body has pitched. */
  function carPoint(x, y, p) { return [x, pitched(x, y, p)]; }

  /* A nut, in world coordinates, accounting for axle + pitch. */
  function nutWorld(axle, i, p) {
    var a = L.axles[axle], n = nutPos(i);
    var pt = carPoint(a[0] + n[0], a[1] + n[1], p);
    /* pitch also shifts x, so redo it properly */
    var rx = a[0] + n[0] - L.pitchPivot[0], ry = a[1] + n[1] - L.pitchPivot[1];
    return [L.pitchPivot[0] + rx * Math.cos(p) - ry * Math.sin(p),
            L.pitchPivot[1] + rx * Math.sin(p) + ry * Math.cos(p)];
  }

  /* ---------------------------------------------------------- state ------- */
  function newState() {
    var S = {
      aspect: 0.5625,
      cam: { cx: L.camera.overview[0], cy: L.camera.overview[1], w: L.camera.overview[2] },
      camName: "overview",

      tool: null,
      toolboxOpen: false,
      drawerPx: 0,
      pitch: 0,
      pitchHold: 0,
      support: "none",          /* none | jack | stand */
      lifting: false,

      jack: { x: jackOrigin[0] + L.jackParkX, arm: L.jackArmLow, pumps: 0, placed: false, out: false },
      stand: { placed: false, h: 0, slide: 0 },

      /* one corner of lug nuts per wheel: the front is the one you work on,
         the rear keeps its own five so the two can never drive each other */
      nuts: [],
      nutsRear: [],
      /* The front wheel is the one that comes off, and it is a real object:
           mounted  - on the hub, dx/dy/rot/scale all zero (dead centre)
           loose    - taken off, lying on the floor at the park spot, clickable
           moving   - mid-animation, so nothing else may touch it
         The rear wheel has no state of its own: it never comes off. */
      wheel: { removed: false, resting: false, busy: false, scale: 1, dx: 0, dy: 0, rot: 0 },
      caliper: { bolts: [false, false], off: false, dx: 0, dy: 0, rot: 0 },
      pads: [
        { out: false, dx: 0, dy: 0, rot: 0, fresh: false },
        { out: false, dx: 0, dy: 0, rot: 0, fresh: false }
      ],
      disc: { removed: false, dx: 0, dy: 0, rot: 0 },

      hot: [],
      badges: null,
      pointer: { x: 0, y: 0, inside: false },

      lessonId: null,
      step: 0,
      stepDone: false,
      finished: false
    };
    for (var i = 0; i < 5; i++) {
      S.nuts.push({
        loosened: false, removed: false, fly: 0, spin: 0,
        flyDx: -46 - i * 11, flyDy: -96 - i * 14
      });
      /* the rear wheel's nuts: same shape, its own numbers */
      S.nutsRear.push({
        loosened: false, removed: false, fly: 0, spin: 0,
        flyDx: -46 - i * 11, flyDy: -96 - i * 14
      });
    }
    S.jack.homeX = jackOrigin[0];
    return S;
  }

  /* One answer to "where is the wheel?", so the renderer, the click handler and
     the panel all read the same thing instead of guessing from four numbers. */
  function wheelState(S) {
    var W = (S && S.wheel) || {};
    if (W.busy) return "moving";
    return W.removed ? "loose" : "mounted";
  }

  /* The lug nuts that belong to one wheel. Nothing else may reach into the
     arrays directly: a front action can only ever touch front nuts. */
  function nutsFor(S, axle) {
    return (axle === "rear" ? S.nutsRear : S.nuts) || [];
  }

  VG.geom = {
    nutPos: nutPos,
    saddleLocal: saddleLocal,
    saddleWorld: saddleWorld,
    jackOrigin: jackOrigin,
    noseUnderside: noseUnderside,
    noseY: noseY,
    pitched: pitched,
    sillY: sillY,
    solvePitch: solvePitch,
    standHeight: standHeight,
    carPoint: carPoint,
    nutWorld: nutWorld,
    nutsFor: nutsFor,
    wheelState: wheelState
  };
  VG.newState = newState;
  VG.S = null;              /* live state, set in main.js */
})();
