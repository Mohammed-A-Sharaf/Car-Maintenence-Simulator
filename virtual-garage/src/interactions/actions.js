/* Virtual Garage - what the hands do.
   Pointer gestures produce actions ("nutLoosen", "placeJack"...). Every action
   goes through VG.act(), which asks the lesson engine whether it is in order,
   then runs the effect. Effects are pure state changes plus tweens, so the
   renderer can always catch up from wherever an animation is interrupted. */
(function () {
  "use strict";
  var VG = window.VG, U = VG.util, L = window.VG_LAYOUT, G = VG.geom,
      SP = VG.sprite, SPR = window.VG_SPRITES, A = U.anim;

  function S() { return VG.S; }
  function toast(m, kind) { if (VG.hud) VG.hud.toast(m, kind); }

  /* count what the hands just did; toast anything it unlocks */
  function bump(key) {
    if (!VG.progress || !VG.progress.bump) return;
    VG.progress.bump(key, 1).forEach(function (nm) {
      toast("Achievement earned — " + nm, "good");
    });
  }

  var MSG = {
    nojack: "Pick up the trolley jack first.",
    notlifted: "Get the car up in the air first — the stand has to fit under the sill.",
    nostand: "Put the axle stand in place before you lower the jack.",
    stillload: "The jack is still carrying the car. Set the stand down first.",
    nuts_on: "The nuts are still on — take all five off before pulling the wheel.",
    tight: "That nut is still tight. Slacken it off first.",
    bolts: "Both guide pins have to come out before the caliper will lift off.",
    caliper_on: "The caliper is in the way — unbolt and lift it off first.",
    pads_out: "Fit both pads before the caliper goes back on.",
    wheel_on: "Take the wheel off before you go any further in.",
    caliper_off: "The caliper is off the disc — put it back before you tighten anything.",
    locked: "That is not the next step.",
    car_up: "Let the car back down before you torque the nuts — you need the tyre on the ground.",
    car_supported: "The stand is still carrying the car. Get the jack under it and pull the stand out first.",
    no_stand_out: "The stand is holding the car up — the jack has to take the weight first.",
    wheel_needed: "The wheel goes on before the nuts go back on.",
    already_mounted: "The wheel is already on the hub — start the nuts by hand.",
    wheel_moving: "Give it a second — the wheel is still moving.",
    caliper_loose: "The caliper is hanging off the disc. Hang it back on before the wheel goes on.",
    disc_missing: "The disc is off the hub. Fit it before the wheel goes back on.",
    pads_missing: "The pads are still out. Fit them and the caliper before the wheel.",
    nuts_in_way: "There are nuts on the studs — spin them off before the wheel goes on.",
    unsupported: "Get the car on an axle stand first — never pull a wheel off a car the jack is holding."
  };

  function ping(x, y, colour) {
    if (VG.scene && VG.scene.pulse) VG.scene.pulse(x, y, 12, colour);
  }
  function pingNut(i) {
    var s = S(), p = VG.geom.nutWorld("front", i, s.pitch);
    ping(p[0], p[1]);
  }
  function pingJack() {
    var s = S();
    var f = SPR.jackBody.meta.floorY * SPR.jackBody.s;
    ping(s.jack.x + f * 0.55, G.jackOrigin[1] + f * 0.55, "#63d2e8");
  }

  /* ------------------------------------------------------------- effects -- */

  /* May this part leave its place right now? One answer, asked twice: by the
     pointer gesture (so the part never moves under the hand while it is
     forbidden) and by the effect itself (so no other route can slip past).
     Returns a message key, or null when the part may come off. */
  var CAN = {
    wheel: function (s) {
      if (G.wheelState(s) === "moving") return "wheel_moving";
      for (var i = 0; i < 5; i++) if (!s.nuts[i].removed) return "nuts_on";
      if (!s.stand.placed || s.support !== "stand") return "unsupported";
      return null;
    },
    caliper: function (s) {
      if (G.wheelState(s) !== "loose") return "wheel_on";
      if (!s.caliper.bolts[0] || !s.caliper.bolts[1]) return "bolts";
      return null;
    },
    disc: function (s) {
      if (!s.caliper.off) return "caliper_on";
      return null;
    },
    /* May this loose wheel go back on the hub? The corner has to be complete
       again first: pads in, caliper bolted on, disc on, studs bare. */
    wheelOn: function (s) {
      var ws = G.wheelState(s);
      if (ws === "mounted") return "already_mounted";
      if (ws === "moving") return "wheel_moving";
      if (s.caliper.off) return "caliper_loose";
      if (s.pads[0].out || s.pads[1].out) return "pads_missing";
      if (s.disc.removed) return "disc_missing";
      for (var i = 0; i < 5; i++) if (!s.nuts[i].removed) return "nuts_in_way";
      return null;
    }
  };

  var EF = {};

  EF.nutLoosen = function (i) {
    var st = S().nuts[i];
    if (st.removed || st.loosened) return false;
    st.loosened = true;
    A.tween(st, { spin: 26 }, 0.3, "outCubic");
    pingNut(i);
    bump("nutLoosen");
    return true;
  };

  EF.nutRemove = function (i) {
    var s = S(), st = s.nuts[i];
    if (st.removed) return false;
    if (!st.loosened) return "tight";
    st.removed = true;
    A.tween(st, { fly: 1 }, 0.6, "outCubic");
    pingNut(i);
    bump("nutRemove");
    return true;
  };

  EF.placeJack = function () {
    var s = S();
    if (s.jack.placed) return false;
    s.jack.out = false;
    s.jack.placed = true;
    s.jack.x = G.jackOrigin[0] + L.jackParkX;
    A.tween(s.jack, { x: G.jackOrigin[0] }, 0.95, "outCubic");
    return true;
  };

  EF.pump = function () {
    var s = S();
    if (!s.jack.placed) return "nojack";
    pingJack();

    /* With the car on a stand, pumping is about taking the weight back:
       three strokes lift the saddle to the height the stand is holding. */
    if (s.stand.placed && s.support !== "jack") {
      if (s.jack.pumps >= 3) return false;
      s.jack.pumps++;
      if (s.jack.pumps === 1) bump("lift");
      A.tween(s.jack, { arm: L.jackArmLow * (1 - s.jack.pumps / 3) }, 0.36, "outCubic");
      if (s.jack.pumps >= 3) {
        A.after(0.5, function () { if (S().jack.placed) S().support = "jack"; });
      }
      return true;
    }

    if (s.jack.pumps >= L.jackPumps) return false;
    s.jack.pumps++;
    if (s.jack.pumps === 1) bump("lift");
    s.support = "jack";
    A.tween(s.jack, { arm: L.jackArmLow * (1 - s.jack.pumps / L.jackPumps) }, 0.32, "outCubic");
    return true;
  };

  /* pull the stand out from under a car the jack is now holding */
  EF.standOut = function () {
    var s = S();
    if (!s.stand.placed) return false;
    if (s.support !== "jack") {
      if (s.jack.pumps >= 3 && s.jack.placed) s.support = "jack";
      else return "no_stand_out";
    }
    A.tween(s.stand, { slide: 0 }, 0.6, "inOutCubic", function () {
      s.stand.placed = false;
    });
    return true;
  };

  /* let the car down onto its wheels */
  EF.lowerJack = function () {
    var s = S();
    if (!s.jack.placed) return "nojack";
    if (s.support !== "jack") return "car_supported";
    A.tween(s.jack, { arm: L.jackArmLow }, 1.7, "inOutCubic", function () {
      s.support = "none";
      s.jack.pumps = 0;
      ping(s.jack.x + 260, G.groundY - 8, "#57d68a");
    });
    return true;
  };

  /* threading the nuts back on, by hand */
  EF.nutFit = function (i) {
    var s = S(), st = s.nuts[i];
    if (!st.removed) return false;
    /* the one question "is the wheel on?" - so a nut can never be started on a
       wheel that is off the car or still in the air */
    var ws = G.wheelState(s);
    if (ws !== "mounted") return ws === "moving" ? "wheel_moving" : "wheel_needed";
    st.removed = false;
    st.loosened = true;
    st.fly = 1;
    A.tween(st, { fly: 0 }, 0.45, "outCubic");
    A.tween(st, { spin: 0 }, 0.45, "outCubic");
    pingNut(i);
    return true;
  };

  /* final torque, car back on the ground */
  EF.nutTorque = function (i) {
    var s = S(), st = s.nuts[i];
    if (st.removed) return false;
    if (s.pitch > 0.002) return "car_up";
    A.tween(st, { spin: st.spin + 14 }, 0.22, "outCubic");
    pingNut(i);
    bump("torque");
    return true;
  };

  EF.placeStand = function () {
    var s = S();
    if (s.stand.placed) return false;
    if (s.pitch < 0.004) return "notlifted";
    s.pitchHold = s.pitch;
    s.support = "stand";
    s.stand.placed = true;
    s.stand.h = G.standHeight(s.pitchHold);
    s.stand.slide = 0;
    A.tween(s.stand, { slide: 1 }, 0.55, "outCubic");
    bump("stand");
    return true;
  };

  EF.releaseJack = function () {
    var s = S();
    if (!s.jack.placed) return "nojack";
    if (!s.stand.placed) return "nostand";
    s.support = "stand";
    s.pitchHold = Math.max(s.pitchHold, s.pitch);
    s.stand.h = G.standHeight(s.pitchHold);
    s.jack.pumps = 0;
    A.tween(s.jack, { arm: L.jackArmLow }, 1.5, "inOutCubic");
    return true;
  };

  EF.jackOut = function () {
    var s = S();
    if (!s.jack.placed) return false;
    if (s.support === "jack") return "stillload";
    s.jack.placed = false;
    A.tween(s.jack, { x: G.jackOrigin[0] + L.jackParkX }, 1.0, "inOutCubic", function () {
      if (!S().jack.placed) S().jack.out = true;
    });
    return true;
  };

  /* Taking a wheel off is three moves, not one teleport: it pulls off the
     studs towards you, travels away from the car, and comes to rest on the
     floor beside it. It stays a real, visible, clickable object from the moment
     it leaves the hub: `resting` marks it as loose, and the renderer never
     hides or duplicates it. */
  EF.wheelOff = function () {
    var s = S(), W = s.wheel, ax = L.axles.front;
    var ws = G.wheelState(s);
    if (ws === "moving") return "wheel_moving";
    if (ws !== "mounted") return false;
    var why = CAN.wheel(s);
    if (why) return why;
    W.removed = true;
    W.resting = false;              /* in hand, not on the floor yet */
    W.busy = true;
    W.scale = 1;
    /* 1. off the hub, towards the viewer */
    A.tween(W, { dx: -132, dy: -18, rot: -9, scale: 1.07 }, 0.46, "outCubic");
    /* 2. down beside the car, where it waits to go back on */
    A.after(0.40, function () {
      A.tween(W, {
        dx: L.wheelPark[0] - ax[0],
        dy: L.wheelPark[1] - ax[1],
        rot: 0,                     /* standing on its tread beside the car */
        scale: 1.0
      }, 0.66, "inOutCubic");
    });
    /* 3. it has landed: from here on it is a loose part you can click */
    A.after(1.12, function () {
      W.busy = false;
      W.resting = true;
      if (VG.hud) VG.hud.refresh();
    });
    /* frame the empty corner *and* the wheel it is waiting for */
    VG.camera.go("wheelback");
    bump("wheel");
    return true;
  };

  /* Putting it back on. Two moves - up off the floor, then onto the studs -
     and the last frame is hard-set to dx/dy/rot = 0, scale = 1, so the wheel
     lands dead centre on the hub instead of wherever the tween happened to
     stop. `deferred` means the lesson is told about it only once the wheel is
     actually home, so "start the nuts" cannot be ticked off mid-flight. */
  EF.wheelOn = function (i, a) {
    var s = S(), W = s.wheel, ax = L.axles.front;
    var ws = G.wheelState(s);
    if (ws === "mounted") return "already_mounted";
    if (ws === "moving") return "wheel_moving";
    var why = CAN.wheelOn(s);
    if (why) return why;
    if (a) a.__deferred = true;        /* the step advances when the wheel is home */

    W.busy = true;
    W.resting = false;                 /* lifted: no longer lying loose */
    var went = { dx: W.dx, dy: W.dy, rot: W.rot, scale: W.scale || 1 };

    /* 1. off the floor, stood up in front of the hub */
    A.tween(W, {
      dx: went.dx * 0.5,
      dy: went.dy * 0.5 - 34,
      rot: went.rot * 0.35,
      scale: 1.05
    }, 0.34, "outCubic");
    /* 2. onto the studs */
    A.after(0.30, function () {
      A.tween(W, { dx: 0, dy: 0, rot: 0, scale: 1 }, 0.46, "inOutCubic");
    });
    /* 3. home: exact alignment, then tell the lesson */
    A.after(0.80, function () {
      W.dx = 0; W.dy = 0; W.rot = 0; W.scale = 1;
      W.removed = false;
      W.resting = false;
      W.busy = false;
      ping(ax[0], ax[1], "#57d68a");
      toast("Wheel on the hub — start the five nuts by hand.", "good");
      if (a && a.__deferred && VG.engine) VG.engine.after(a);
      if (VG.hud) VG.hud.refresh();
    });
    return true;
  };

  EF.bolt = function (i) {
    var s = S();
    if (s.caliper.bolts[i]) return false;
    if (G.wheelState(s) !== "loose") return "wheel_on";
    s.caliper.bolts[i] = true;
    pingBolt(i);
    return true;
  };

  EF.boltTighten = function (i) {
    var s = S();
    if (!s.caliper.bolts[i]) return false;
    if (s.caliper.off) return "caliper_off";
    s.caliper.bolts[i] = false;
    pingBolt(i);
    return true;
  };

  EF.caliperOff = function () {
    var s = S();
    if (s.caliper.off) return false;
    if (!s.caliper.bolts[0] || !s.caliper.bolts[1]) return "bolts";
    s.caliper.off = true;
    A.tween(s.caliper, { dx: L.caliperPark[0], dy: L.caliperPark[1], rot: L.caliperPark[2] }, 0.85, "outCubic");
    bump("caliper");
    return true;
  };

  EF.caliperOn = function () {
    var s = S();
    if (!s.caliper.off) return false;
    if (s.pads[0].out || s.pads[1].out) return "pads_out";
    s.caliper.off = false;
    A.tween(s.caliper, { dx: 0, dy: 0, rot: 0 }, 0.8, "inOutCubic");
    return true;
  };

  EF.padOut = function (i) {
    var s = S(), p = s.pads[i];
    if (p.out) return false;
    if (!s.caliper.off) return "caliper_on";
    p.out = true;
    var tp = L.padPlace[i];
    A.tween(p, {
      dx: L.padsPark[0] + i * 78 - tp[0],
      dy: L.padsPark[1] - tp[1]
    }, 0.75, "outCubic");
    A.tween(p, { rot: 90 }, 0.75, "outCubic");
    return true;
  };

  EF.padsIn = function () {
    var s = S();
    if (!s.pads[0].out && !s.pads[1].out) return false;
    s.pads.forEach(function (p, i) {
      p.out = false;
      p.fresh = true;
      A.tween(p, { dx: 0, dy: 0, rot: 0 }, 0.6, "outCubic");
    });
    bump("pads");
    return true;
  };

  EF.discOff = function () {
    var s = S();
    if (s.disc.removed) return false;
    var why = CAN.disc(s);
    if (why) return why;
    s.disc.removed = true;
    A.tween(s.disc, { dx: L.discPark[0], dy: L.discPark[1], rot: L.discPark[2] }, 0.9, "outCubic");
    bump("disc");
    return true;
  };

  EF.discIn = function () {
    var s = S();
    if (!s.disc.removed) return false;
    s.disc.removed = false;
    A.tween(s.disc, { dx: 0, dy: 0, rot: 0 }, 0.9, "outCubic");
    return true;
  };

  /* put the front corner back together, one click */
  EF.reassemble = function () {
    var s = S();
    A.after(0.05, function () { if (s.pads[0].out) EF.padsIn(); });
    A.after(0.9, function () { if (s.caliper.off) EF.caliperOn(); });
    A.after(1.9, function () {
      s.caliper.bolts = [true, true];
      if (G.wheelState(s) === "loose") EF.wheelOn();
    });
    A.after(2.9, function () {
      s.nuts.forEach(function (n) {
        if (n.removed) { n.removed = false; n.fly = 1; n.flyDx = 0; n.flyDy = 0; n.spin = 26; A.tween(n, { fly: 0 }, 0.4); }
      });
    });
    A.after(3.4, function () { toast("Wheel torqued, caliper back on the disc.", "good"); });
    return true;
  };

  /* lower the car off the stand and clear the jack away */
  EF.lowerCar = function () {
    var s = S();
    if (!s.jack.placed) {
      s.jack.out = false;
      s.jack.placed = true;
      s.jack.x = G.jackOrigin[0] + L.jackParkX;
      A.tween(s.jack, { x: G.jackOrigin[0] }, 0.8, "outCubic");
    }
    A.after(0.9, function () {
      s.support = "jack";
      A.tween(s.jack, { arm: 0 }, 1.1, "inOutCubic");
    });
    A.after(2.1, function () {
      s.stand.placed = false;
      s.stand.slide = 0;
      A.tween(s.stand, { slide: 0 }, 0.01);
    });
    A.after(2.4, function () {
      A.tween(s.jack, { arm: L.jackArmLow }, 1.6, "inOutCubic");
    });
    A.after(4.2, function () {
      A.tween(s.jack, { x: G.jackOrigin[0] + L.jackParkX }, 1.2, "inOutCubic", function () {
        s.jack.out = true;
        s.jack.placed = false;
        s.support = "none";
      });
    });
    A.after(4.4, function () { toast("Back on its wheels. Nice work.", "good"); });
    return true;
  };

  function pingBolt(i) {
    var s = S(), ci = SPR.caliper;
    var nat = [[1254, 564], [1219, 1535]][i];
    var sp = SP.nativeToSprite(ci, nat[0], nat[1]);
    var bx = L.axles.front[0] + L.caliperDx + s.caliper.dx + (sp[0] - ci.ax) * ci.s;
    var by = L.axles.front[1] + L.caliperDy + s.caliper.dy + (sp[1] - ci.ay) * ci.s;
    ping(bx, by, "#63d2e8");
  }

  /* ----------------------------------------------------------- dispatcher -- */
  function act(a) {
    var gate = VG.engine ? VG.engine.gate(a) : { ok: true };
    if (!gate.ok) {
      if (gate.msg) toast(gate.msg, "warn");
      return false;
    }
    var fn = EF[a.type];
    if (!fn) return false;
    var r = fn(a.i, a);
    if (typeof r === "string") { toast(MSG[r] || r, "warn"); return false; }
    if (r === false) return false;
    /* an effect may defer its own step advance (see EF.wheelOn): it sets
       __deferred on the action and reports back once it has finished, so the
       lesson cannot move on while the wheel is still in the air */
    if (!a.__deferred && VG.engine) VG.engine.after(a);
    if (VG.hud) VG.hud.refresh();
    return true;
  }

  /* ------------------------------------------------------------ gestures -- */
  var holdG = null, gesture = null, pan = null;
  var svg = null, tip = null, hoverNode = null;

  /* every hotspot ring under a [data-hit] node */
  function eachRing(node, fn) {
    (function walk(n) {
      var c = n.getAttribute && n.getAttribute("class");
      if (c && c.split(" ").indexOf("hotspot") >= 0) fn(n);
      for (var q = 0; q < n.children.length; q++) walk(n.children[q]);
    })(node);
  }

  function positionTip(ev) {
    if (!tip || tip.hidden || !ev) return;
    var r = svg.getBoundingClientRect();
    var x = (ev.clientX || 0) - (r.left || 0) + 14;
    var y = (ev.clientY || 0) - (r.top || 0) + 18;
    if (r.width) x = Math.min(x, r.width - 160);
    tip.style.left = x + "px";
    tip.style.top = y + "px";
  }

  /* hovering any part lights its ring amber and floats its name next to the
     pointer; lesson-highlighted parts stay blue and pulse (CSS decides) */
  function setHover(t, ev) {
    if (hoverNode === t) { positionTip(ev); return; }
    if (hoverNode) eachRing(hoverNode, function (r) { r.classList.remove("is-hover"); });
    hoverNode = t || null;
    var info = hoverNode && window.VG_PARTS[hoverNode.getAttribute("data-part")];
    if (hoverNode && info && tip) {
      eachRing(hoverNode, function (r) { r.classList.add("is-hover"); });
      tip.innerHTML = "";
      var b = document.createElement("b");
      b.textContent = info.name;
      var sp = document.createElement("span");
      /* a wheel lying on the floor says what it is waiting for */
      sp.textContent = hoverNode.getAttribute("data-part") === "wheel" &&
        G.wheelState(S()) === "loose" ? "Loose · click to fit" : info.role;
      tip.appendChild(b);
      tip.appendChild(sp);
      tip.hidden = false;
    } else if (tip) {
      tip.hidden = true;
    }
    positionTip(ev);
  }

  function toWorld(e) {
    var pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    var m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    var p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }

  var WRENCH_TIP = null, RATCHET_TIP = null;
  function wrenchTip() {
    if (!WRENCH_TIP) {
      var i = SPR.wrench, half = i.w * 0.5;
      WRENCH_TIP = [half + (half - 62) * 0.7071, i.h * 0.5 + (i.h * 0.5 - 62) * 0.7071];
    }
    return WRENCH_TIP;
  }
  function ratchetTip() {
    if (!RATCHET_TIP) RATCHET_TIP = SP.nativeToSprite(SPR.ratchet, 331, 1668);
    return RATCHET_TIP;
  }

  function toolSprite(key, anchor) {
    var g = SP.make(key);
    var img = g.firstChild;
    if (anchor) { img.setAttribute("x", -anchor[0]); img.setAttribute("y", -anchor[1]); }
    return g;
  }

  function updateHold() {
    var s = S();
    if (holdG) { holdG.remove(); holdG = null; }
    if (s.tool === "wrench") holdG = toolSprite("wrench", wrenchTip());
    else if (s.tool === "ratchet") holdG = toolSprite("ratchet", ratchetTip());
    if (holdG) {
      VG.scene.nodes.fx.appendChild(holdG);
      SP.place(holdG, s.pointer.x, s.pointer.y, 0.62, -14);
      /* only show it once the pointer is actually over the scene */
      holdG.style.display = s.pointer.inside ? "" : "none";
    }
    svg.classList.toggle("tool-active", !!s.tool);
  }

  function setTool(name) {
    var s = S();
    s.tool = s.tool === name ? null : name;
    updateHold();
    if (VG.hud) VG.hud.refresh();
  }

  /* a tool in use: swing it on the fastener, then disappear */
  function flashTool(kind, x, y, base, dur) {
    var key = kind === "ratchet" ? "ratchet" : "wrench";
    var g = toolSprite(key, kind === "ratchet" ? ratchetTip() : wrenchTip());
    VG.scene.nodes.fx.appendChild(g);
    var t0 = performance.now(), D = dur || 760;
    (function loop(now) {
      var t = Math.min(1, (now - t0) / D);
      var wob = Math.sin(t * Math.PI * 3) * 13 * (1 - t);
      SP.place(g, x, y, 0.62, base + wob);
      if (t < 1) requestAnimationFrame(loop); else g.remove();
    })(t0);
  }

  /* Which action does the current step want? A click should do the sensible
     thing: the lesson decides between undo/tighten, loosen/fit and so on, and
     free play falls back to what the parts look like. */
  function stepAccepts(type) {
    var st = VG.engine && VG.engine.step ? VG.engine.step() : null;
    return !!(st && st.accept && st.accept.indexOf(type) >= 0);
  }
  function firstWanted(list, fallback) {
    for (var i = 0; i < list.length; i++) if (stepAccepts(list[i])) return list[i];
    return fallback;
  }

  /* which tool does each part need, and what do we call them out loud */
  var NEED = {
    nut: "wrench", bolt: "ratchet", caliper: "ratchet", disc: "ratchet",
    pad: "ratchet", jackpoint: "jack", jack: "jack", standpoint: "stand"
  };
  var TOOL_NAME = {
    wrench: "lug wrench", ratchet: "ratchet", jack: "trolley jack", stand: "axle stand"
  };
  var PART_NAME = {
    nut: "wheel nut", bolt: "caliper pin", caliper: "caliper", disc: "brake disc",
    pad: "brake pad", jackpoint: "jacking point", jack: "jack", standpoint: "axle stand point"
  };

  /* a tool in hand that cannot do the job: say which one would, and shake the
     toolbox row so the mistake is visible as well as readable */
  function wrongTool(part, tool) {
    var want = NEED[part];
    toast("The " + (TOOL_NAME[tool] || tool) + " will not do that — it wants the " +
      (TOOL_NAME[want] || want) + " on the " + (PART_NAME[part] || part) + ".", "warn");
    if (VG.hud && VG.hud.toolFeedback) VG.hud.toolFeedback(tool, "bad");
    return false;
  }

  /* run the action and light up the tool that did it */
  function used(tool, a) {
    var ok = act(a);
    if (ok && tool && VG.hud && VG.hud.toolFeedback) VG.hud.toolFeedback(tool, "good");
    return ok;
  }

  /* One way in for "put the wheel back on", used by the click and by a drag
     that ends near the hub: ask the gate, then ask the lesson, then go. */
  function fitWheel() {
    var s = S();
    if (G.wheelState(s) !== "loose") return false;
    var why = CAN.wheelOn(s);
    if (why) { toast(MSG[why] || why, "warn"); return false; }
    var gate = VG.engine ? VG.engine.gate({ type: "wheelOn" }) : { ok: true };
    if (!gate.ok) {
      toast("Not yet — the wheel is the last thing to go back on this corner.", "warn");
      return false;
    }
    return act({ type: "wheelOn" });
  }

  function clickNode(t) {
    var s = S();
    var hit = t.getAttribute("data-hit");
    var i = parseInt(t.getAttribute("data-i"), 10);
    var tool = s.tool;
    /* Any click that is not a tool action answers "what is this?" — show the
       card and frame the part, so nobody has to hunt with the scroll wheel. */
    var card = function () {
      if (VG.partcard) VG.partcard.show(t.getAttribute("data-part"));
      VG.camera.focusPart(hit, t.getAttribute("data-axle"), i);
    };

    /* Only the front corner is fully modelled: on the rear axle everything
       still has a part card, but nothing acts on it yet. */
    if (t.getAttribute("data-axle") === "rear") return card();

    if (hit === "wheel") {
      /* A loose wheel is a thing you pick up: one click puts it back on the
         hub. A wheel that is still mounted comes off on a click - but only
         when the wheels-off job is genuinely at that point. Anything else is
         just a click on the wheel, and a click on the wheel answers with its
         card instead of a lesson's "not yet" line, which would be nonsense
         once the wheel is already on its studs. */
      if (G.wheelState(s) === "loose") return fitWheel();
      var gateOff = VG.engine ? VG.engine.gate({ type: "wheelOff" }) : { ok: true };
      if (!CAN.wheel(s) && gateOff.ok) {
        var pulled = act({ type: "wheelOff" });
        if (pulled) return true;
      }
      return card();
    }

    if (hit === "nut") {
      if (tool !== "wrench" && tool !== "ratchet") return tool ? wrongTool("nut", tool) : card();
      /* a nut cannot be started on a wheel that is off the car or still in the
         air - say so plainly instead of opening a part card mid-job */
      var wsNut = G.wheelState(s);
      if (wsNut !== "mounted") {
        toast(wsNut === "moving" ? MSG.wheel_moving : MSG.wheel_needed, "warn");
        return false;
      }
      var nut = s.nuts[i];
      var want = firstWanted(["nutFit", "nutTorque", "nutLoosen", "nutRemove"],
        nut.removed ? "nutFit" : (nut.loosened ? "nutRemove" : "nutLoosen"));
      var p = G.nutPos(i);
      flashTool(tool, L.axles.front[0] + p[0], L.axles.front[1] + p[1], 42);
      return used(tool, { type: want, i: i });
    }

    if (hit === "bolt") {
      if (tool !== "ratchet") return tool ? wrongTool("bolt", tool) : card();
      var ci = SPR.caliper;
      var nat = [[1254, 564], [1219, 1535]][i];
      var sp = SP.nativeToSprite(ci, nat[0], nat[1]);
      var bx = L.axles.front[0] + L.caliperDx + s.caliper.dx + (sp[0] - ci.ax) * ci.s;
      var by = L.axles.front[1] + L.caliperDy + s.caliper.dy + (sp[1] - ci.ay) * ci.s;
      flashTool("ratchet", bx, by, -30);
      return used("ratchet", { type: firstWanted(["boltTighten", "bolt"],
        s.caliper.bolts[i] ? "boltTighten" : "bolt"), i: i });
    }

    if (hit === "jackpoint") {
      if (tool === "jack") return used("jack", { type: "placeJack" });
      return tool ? wrongTool("jackpoint", tool) : card();
    }

    if (hit === "jack") {
      if (tool !== "jack") return tool ? wrongTool("jack", tool) : card();
      if (!s.jack.placed) return used("jack", { type: "placeJack" });
      /* the lesson decides whether this click pumps, hands over or lowers */
      var jackWanted = firstWanted(["lowerJack", "releaseJack", "pump"], null);
      if (jackWanted) return used("jack", { type: jackWanted });
      /* free play: pump until the arm is up, then release the valve */
      var ceiling = s.stand.placed && s.support !== "jack" ? 3 : L.jackPumps;
      if (s.jack.pumps < ceiling) return used("jack", { type: "pump" });
      return used("jack", { type: "releaseJack" });
    }

    if (hit === "standpoint") {
      if (tool === "stand") return used("stand", { type: "placeStand" });
      return tool ? wrongTool("standpoint", tool) : card();
    }

    if (hit === "stand") {
      if (s.stand.placed && (tool === "stand" || stepAccepts("standOut"))) {
        return used("stand", { type: "standOut" });
      }
      return card();
    }

    if (hit === "caliper") {
      if (stepAccepts("caliperOn") && s.caliper.off) return act({ type: "caliperOn" });
      if (stepAccepts("caliperOff")) return used(tool, { type: "caliperOff" });
      if (s.caliper.off) return act({ type: "caliperOn" });
      if (tool === "ratchet") return used("ratchet", { type: "caliperOff" });
      return tool ? wrongTool("caliper", tool) : card();
    }

    if (hit === "pad") {
      if (!s.caliper.off) return card();
      if (s.pads[i].out) return act({ type: "padsIn" });
      return used(tool, { type: "padOut", i: i });
    }

    if (hit === "disc") {
      if (s.disc.removed) return act({ type: "discIn" });
      if (s.caliper.off) return used(tool, { type: "discOff" });
      return tool ? wrongTool("disc", tool) : card();
    }

    return card();
  }

  function draggableKind(t) {
    if (!t) return null;
    if (t.getAttribute("data-axle") === "rear") return null;
    /* the wheel is draggable when it is on the hub (to pull it off) and when it
       is lying loose on the floor (to move it about) - but never mid-animation */
    if (t.getAttribute("data-drag") === "wheel") {
      var wsDrag = G.wheelState(S());
      if (wsDrag === "moving") return null;
      if (wsDrag === "loose" && !S().wheel.resting) return null;
    }
    var d = t.getAttribute("data-drag");
    if (d) return d;
    var h = t.getAttribute("data-hit");
    if (h === "caliper" || h === "disc") return h;
    return null;
  }

  function stateFor(kind) {
    var s = S();
    if (kind === "wheel") return s.wheel;
    if (kind === "caliper") return s.caliper;
    if (kind === "disc") return s.disc;
    return null;
  }

  function onDown(e) {
    var s = S();
    var pt = toWorld(e);
    s.pointer.x = pt.x; s.pointer.y = pt.y; s.pointer.inside = true;
    var t = e.target.closest ? e.target.closest("[data-hit]") : null;

    if (e.button === 1 || (e.button === 0 && (e.altKey || e.shiftKey))) {
      pan = { lx: e.clientX, ly: e.clientY };
      svg.classList.add("grabbing");
      e.preventDefault();
      return;
    }
    if (e.button !== 0) return;
    e.preventDefault();

    var kind = draggableKind(t);
    gesture = {
      t: t, kind: kind, sx: pt.x, sy: pt.y, moved: 0,
      /* a part that may not come off yet must not follow the hand at all -
         but a wheel already on the floor is nobody's problem to gate */
      blocked: kind === "wheel" && G.wheelState(s) === "loose"
        ? null
        : (kind && CAN[kind] ? CAN[kind](s) : null),
      st: kind ? stateFor(kind) : null, tx: 0, ty: 0, trot: 0
    };
    if (gesture.blocked && VG.hud && VG.hud.tick) svg.classList.add("blocked");
    if (gesture.st) {
      gesture.tx = gesture.st.dx; gesture.ty = gesture.st.dy;
      gesture.trot = gesture.st.rot || 0;
    }
  }

  function onMove(e) {
    var s = S();
    var pt = toWorld(e);
    s.pointer.x = pt.x; s.pointer.y = pt.y; s.pointer.inside = true;
    setHover(e.target && e.target.closest ? e.target.closest("[data-hit]") : null, e);

    if (pan) {
      VG.camera.panBy(s, e.clientX - pan.lx, e.clientY - pan.ly);
      pan.lx = e.clientX;
      pan.ly = e.clientY;
      return;
    }
    if (gesture) {
      var d = Math.hypot(pt.x - gesture.sx, pt.y - gesture.sy);
      gesture.moved = Math.max(gesture.moved, d);
      if (gesture.st && d > 6 && !gesture.blocked) {
        gesture.st.dx = gesture.tx + (pt.x - gesture.sx);
        gesture.st.dy = gesture.ty + (pt.y - gesture.sy);
        if (gesture.kind === "disc") gesture.st.rot = gesture.trot + (pt.x - gesture.sx) * 0.08;
      }
    }
    if (holdG) SP.place(holdG, pt.x, pt.y, 0.62, -14);
  }

  function onUp(e) {
    var s = S();
    if (pan) { pan = null; svg.classList.remove("grabbing"); return; }
    var g = gesture;
    gesture = null;
    if (!g) return;
    var pt = toWorld(e);
    svg.classList.remove("blocked");

    /* the part never moved, so say why it cannot: one clear message, no
       mystery snap-back */
    if (g.blocked) {
      if (g.moved > 20) toast(MSG[g.blocked] || g.blocked, "warn");
      if (g.moved > 6) springBack(g);
      else if (g.t) clickNode(g.t);
      return;
    }

    if (g.kind === "wheel" && g.moved > 6) {
      if (G.wheelState(s) === "loose") {
        /* dragging a loose wheel: drop it near the hub and it goes back on */
        if (Math.abs(s.wheel.dx) < 150 && Math.abs(s.wheel.dy) < 150) {
          if (!fitWheel()) springBack(g);
        } else springBack(g);
        return;
      }
      if (g.moved > 55) { if (!act({ type: "wheelOff", drag: true })) springBack(g); }
      else springBack(g);
      return;
    }
    if (g.st && g.moved > 55) {
      var type = g.kind === "caliper" ? "caliperOff" : "discOff";
      if (!act({ type: type, drag: true })) springBack(g);
      return;
    }
    if (g.st && g.moved > 6) { springBack(g); return; }
    if (g.t) { clickNode(g.t); return; }
    /* empty floor: back to the view the lesson wants */
    if (VG.camera.isCustom()) VG.camera.goLesson();
    if (VG.partcard) VG.partcard.hide();
  }

  function springBack(g) {
    if (!g.st) return;
    A.tween(g.st, { dx: g.tx, dy: g.ty }, 0.45, "outCubic");
    if (g.kind === "disc") A.tween(g.st, { rot: g.trot }, 0.45, "outCubic");
  }

  function onWheel(e) {
    e.preventDefault();
    var pt = toWorld(e);
    /* normalise the three delta modes, then ease: a mouse notch (~100) is
       about 1.2x, a trackpad flick is a fraction of that, and holding the
       wheel down keeps accelerating because the tween retargets each event */
    var d = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
    var f = Math.pow(1.0018, d);
    f = Math.max(0.82, Math.min(1.22, f));
    VG.camera.zoomAt(S(), f, pt.x, pt.y, 0.24);
  }

  function init() {
    svg = VG.scene.svg;
    tip = document.getElementById("hovertip");
    svg.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    svg.addEventListener("wheel", onWheel, { passive: false });
    svg.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    svg.addEventListener("dblclick", function (e) {
      e.preventDefault();
      VG.camera.goLesson();
    });
    svg.addEventListener("pointerleave", function () {
      S().pointer.inside = false;
      if (holdG) holdG.style.display = "none";
      setHover(null);
    });
    svg.addEventListener("pointerenter", function () {
      if (holdG) holdG.style.display = "";
    });
  }

  function closeHold() {
    if (holdG) { holdG.remove(); holdG = null; }
  }

  VG.act = act;
  VG.tools = {
    init: init, setTool: setTool, updateHold: updateHold, closeHold: closeHold,
    effects: EF,
    /* exposed so the headless test can drive the real click path */
    click: clickNode, dragKind: draggableKind, act: act,
    /* the "may this come off?" rule, so the test can ask the same question
       the gesture asks */
    can: CAN,
    isHolding: function () { return holdG; },
    hoverAt: function (node, x, y) { setHover(node, { clientX: x, clientY: y }); },
    setHover: setHover
  };
})();
