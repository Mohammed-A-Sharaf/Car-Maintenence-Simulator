/* Virtual Garage - the scene.
   Builds the SVG once, then a single render(state) call positions every part
   from the state numbers. Layer order, back to front:

     floor     wall, floor line, light pool
     behind    trolley jack
     car       car body (rotates about the rear axle) -> axles:
                 hub -> disc -> pads -> caliper -> wheel -> lug nuts
     front     axle stand
     fx        floating tool + sparkle
*/
(function () {
  "use strict";
  var VG = window.VG, U = VG.util, L = window.VG_LAYOUT, SPR = window.VG_SPRITES;
  var el = U.el, G = VG.geom, SP = VG.sprite;

  var n = {};             /* named nodes */
  var svg;
  var hotNodes = [];

  /* Gradients for the wheel wells. One <defs> at the top of the drawing; the
     liner itself is object-fit so the same gradient serves both arches. */
  function wellGradient(defs) {
    var rg = el("radialGradient", {
      id: "wellGlow", cx: "50%", cy: "26%", r: "52%", fx: "50%", fy: "20%"
    });
    rg.appendChild(el("stop", { offset: "0%", "stop-color": "#d7e4f0", "stop-opacity": "0.36" }));
    rg.appendChild(el("stop", { offset: "30%", "stop-color": "#a8bacb", "stop-opacity": "0.19" }));
    rg.appendChild(el("stop", { offset: "66%", "stop-color": "#7d8f9d", "stop-opacity": "0.07" }));
    rg.appendChild(el("stop", { offset: "100%", "stop-color": "#7d8f9d", "stop-opacity": "0" }));
    defs.appendChild(rg);
  }

  /* An arch with no wheel in it is a hole in the bodywork. Paint the inside of
     it - a soft light falloff from the top lip and a liner edge in shadow - so
     the cavity reads as depth instead of a flat black disc. Sits inside the car
     group, behind the hub, disc, pads and caliper. */
  var WELL_R = 241;             /* just inside the arch cut-out of car.png */
  function wheelWell(name) {
    var ax = L.axles[name];
    var g = el("g", { "class": "wheel-well", "data-axle": name });
    g.appendChild(el("circle", {
      cx: ax[0], cy: ax[1], r: WELL_R, fill: "url(#wellGlow)"
    }));
    var arc = "M " + (ax[0] - WELL_R) + " " + ax[1] +
      " A " + WELL_R + " " + WELL_R + " 0 0 1 " + (ax[0] + WELL_R) + " " + ax[1];
    /* the liner edge: shadow against the body, then a thin highlight where the
       painted lip catches the ceiling light */
    g.appendChild(el("path", {
      d: arc, fill: "none", stroke: "#39434e", "stroke-opacity": ".55",
      "stroke-width": "13", "stroke-linecap": "round"
    }));
    g.appendChild(el("path", {
      d: arc, fill: "none", stroke: "#8c9cad", "stroke-opacity": ".30",
      "stroke-width": "5", "stroke-linecap": "round"
    }));
    g.appendChild(el("path", {
      d: arc, fill: "none", stroke: "#aec2d4", "stroke-opacity": ".20",
      "stroke-width": "2", "stroke-linecap": "round"
    }));
    return g;
  }

  function ring(r, extra) {
    var a = { "class": "hotspot", r: r, cx: 0, cy: 0 };
    if (extra) for (var k in extra) a[k] = extra[k];
    return el("circle", a);
  }
  function stud() {
    var g = el("g", { "class": "stud" });
    g.appendChild(el("circle", { r: 7.6, fill: "#20252c" }));
    g.appendChild(el("circle", { r: 7.6, fill: "none", stroke: "#8b97a6", "stroke-width": 1.1, "stroke-opacity": .5 }));
    g.appendChild(el("circle", { r: 3.1, fill: "#3a424d" }));
    return g;
  }
  function grad(id, stops, radial) {
    var g = el(radial ? "radialGradient" : "linearGradient",
      radial ? { id: id } : { id: id, x1: 0, y1: 0, x2: 0, y2: 1 });
    stops.forEach(function (s) {
      g.appendChild(el("stop", { offset: s[0], "stop-color": s[1], "stop-opacity": s[2] == null ? 1 : s[2] }));
    });
    return g;
  }

  /* ---------------------------------------------------------------- axle -- */
  function buildAxle(host, name) {
    var ax = L.axles[name];
    var g = el("g", { "class": "axle axle-" + name, transform: "translate(" + ax[0] + " " + ax[1] + ")" });
    host.appendChild(g);
    var out = { group: g, front: name === "front" };

    var hubG = SP.make("hub");
    SP.place(hubG, 0, 0, 1);
    hubG.setAttribute("data-hit", "hub");
    hubG.setAttribute("data-part", "hub");
    hubG.setAttribute("data-axle", name);
    hubG.appendChild(ring(58));
    g.appendChild(hubG);
    out.hub = hubG;

    var discWrap = el("g", { "class": "wrap-disc", "data-hit": "disc", "data-part": "disc", "data-axle": name });
    var discG = SP.make("disc");
    SP.place(discG, 0, 0, 1);
    discWrap.appendChild(discG);
    discWrap.appendChild(ring(L.discR + 6));
    g.appendChild(discWrap);
    out.discWrap = discWrap;

    out.pads = [];
    ["padFriction", "padBacking"].forEach(function (key, i) {
      var w = el("g", { "class": "wrap-pad", "data-hit": "pad", "data-i": i, "data-part": "pad", "data-axle": name });
      var art = el("g", { "class": "padArt" });
      var p = SP.make(key);
      SP.place(p, L.padPlace[i][0], L.padPlace[i][1], 1);
      art.appendChild(p);
      w.appendChild(art);
      w.appendChild(ring(34, { cx: L.padPlace[i][0], cy: L.padPlace[i][1] }));
      g.appendChild(w);
      out.pads.push({ wrap: w, art: art, sprite: p });
    });

    var cal = el("g", { "class": "wrap-caliper", "data-hit": "caliper", "data-part": "caliper", "data-axle": name });
    var calG = SP.make("caliper");
    SP.place(calG, L.caliperDx, L.caliperDy, 1);
    cal.appendChild(calG);
    cal.appendChild(ring(46, { cx: L.caliperDx, cy: L.caliperDy }));

    var ci = SPR.caliper;
    out.bolts = [];
    [[1254, 564], [1219, 1535]].forEach(function (nat, i) {
      var sp = SP.nativeToSprite(ci, nat[0], nat[1]);
      var bx = L.caliperDx + (sp[0] - ci.ax) * ci.s;
      var by = L.caliperDy + (sp[1] - ci.ay) * ci.s;
      var b = el("g", {
        "class": "wrap-bolt", "data-hit": "bolt", "data-i": i, "data-part": "bolt", "data-axle": name,
        transform: "translate(" + bx + " " + by + ")"
      });
      b.appendChild(el("circle", { r: 34, fill: "rgba(0,0,0,0)" }));
      b.appendChild(ring(27));
      cal.appendChild(b);
      out.bolts.push(b);
    });
    g.appendChild(cal);
    out.caliperWrap = cal;

    var wWrap = el("g", { "class": "wrap-wheel", "data-hit": "wheel", "data-part": "wheel", "data-drag": "wheel", "data-axle": name });
    var wG = SP.make("wheel");
    SP.place(wG, 0, 0, 1);
    wWrap.appendChild(wG);
    wWrap.appendChild(ring(228));
    g.appendChild(wWrap);
    out.wheelWrap = wWrap;

    out.nuts = [];
    for (var i = 0; i < 5; i++) {
      var p = G.nutPos(i);
      var ng = el("g", {
        "class": "nutG", "data-hit": "nut", "data-i": i, "data-part": "nut", "data-axle": name,
        transform: "translate(" + p[0] + " " + p[1] + ")"
      });
      /* The stud belongs to the hub face and never moves; the nut threads onto
         it. Keeping them in separate groups is what lets a nut fly away while
         the bare stud stays behind - visible, and a live target to start the
         nut again by hand. */
      var studG = stud();
      ng.appendChild(studG);
      var spin = el("g", { "class": "nutSpin" });
      var nut = SP.make("nut");
      SP.place(nut, 0, 0, 1);
      spin.appendChild(nut);
      ng.appendChild(spin);
      ng.appendChild(ring(26));
      var badge = el("g", { "class": "hotbadge" });
      badge.appendChild(el("circle", { r: 10.5, cx: 0, cy: -32, fill: "#63d2e8" }));
      var txt = el("text", { x: 0, y: -28.2, "text-anchor": "middle", "class": "hotlabel" });
      badge.appendChild(txt);
      ng.appendChild(badge);
      g.appendChild(ng);
      out.nuts.push({ g: ng, stud: studG, spin: spin, badge: badge, txt: txt, base: p });
    }
    return out;
  }

  /* ---------------------------------------------------------------- init -- */
  function init(host) {
    svg = el("svg", { viewBox: "0 0 1600 900", preserveAspectRatio: "xMidYMid meet" });

    var defs = el("defs");
    defs.appendChild(grad("wallG", [[0, "#212a35"], [0.7, "#161c24"], [1, "#0f1319"]]));
    defs.appendChild(grad("floorG", [[0, "#2b333d"], [0.10, "#1c222a"], [1, "#0c1015"]]));
    defs.appendChild(grad("pool", [[0, "#8ea4bd", .22], [1, "#8ea4bd", 0]], true));
    wellGradient(defs);          /* the inside of the wheel arches */
    svg.appendChild(defs);

    var bg = el("g", { "class": "layer-bg" });
    /* the workshop itself: wall, panels, ceiling lights, shelves, floor.
       Built from window.VG_GARAGE so the stills and the app agree. */
    if (VG.garage) {
      bg.appendChild(VG.garage.build(defs));
    } else {
      bg.appendChild(el("rect", { x: -9000, y: -7000, width: 26000, height: 7000 + L.groundY, fill: "url(#wallG)" }));
      bg.appendChild(el("rect", { x: -9000, y: L.groundY, width: 26000, height: 9000, fill: "url(#floorG)" }));
      bg.appendChild(el("line", { x1: -9000, y1: L.groundY, x2: 17000, y2: L.groundY, "class": "floor-line", "stroke-width": 2 }));
    }
    /* the wash the car stands in now comes from the backdrop itself */
    /* contact shadows: they ground the car, and the front one lifts and fades
       as the nose rises, which sells the pitch */
    n.shR = el("ellipse", { "class": "shadow", cx: L.axles.rear[0], cy: L.groundY + 14, rx: 235, ry: 24, fill: "rgba(0,0,0,.42)" });
    n.shF = el("ellipse", { "class": "shadow", cx: L.axles.front[0], cy: L.groundY + 14, rx: 235, ry: 24, fill: "rgba(0,0,0,.42)" });
    n.shJ = el("ellipse", { "class": "shadow", cx: 0, cy: L.groundY + 12, rx: 150, ry: 16, fill: "rgba(0,0,0,.34)" });
    n.shS = el("ellipse", { "class": "shadow", cx: L.standX, cy: L.groundY + 12, rx: 110, ry: 13, fill: "rgba(0,0,0,.34)" });
    /* the loose wheel gets its own contact patch, so it sits on the floor
       instead of floating over it */
    n.shW = el("ellipse", { "class": "shadow", cx: L.wheelPark[0], cy: L.groundY + 8, rx: 168, ry: 18, fill: "rgba(0,0,0,.4)", opacity: 0 });
    bg.appendChild(n.shR); bg.appendChild(n.shF); bg.appendChild(n.shJ);
    bg.appendChild(n.shS); bg.appendChild(n.shW);
    svg.appendChild(bg);

    /* jack */
    var behind = el("g", { "class": "layer-behind" });
    var jackWrap = el("g", { "class": "jack", "data-hit": "jack", "data-part": "jack" });
    var jackBody = SP.make("jackBody");
    SP.place(jackBody, 0, 0, 1);
    var jackArm = SP.make("jackArm");
    jackWrap.appendChild(jackBody);
    jackWrap.appendChild(jackArm);
    var jw = SPR.jackBody.w * SPR.jackBody.s, jh = SPR.jackBody.h * SPR.jackBody.s;
    jackWrap.appendChild(el("rect", {
      x: -40, y: 40, width: jw + 40, height: jh - 40,
      fill: "rgba(0,0,0,0)", "class": "jack-hit"
    }));
    behind.appendChild(jackWrap);
    svg.appendChild(behind);
    n.jackWrap = jackWrap; n.jackBody = jackBody; n.jackArm = jackArm;

    /* car */
    var carG = el("g", { "class": "layer-car" });
    var inner = el("g", { "class": "carInner" });
    carG.appendChild(inner);
    var carImg = SP.make("car");
    SP.place(carImg, L.carAt[0], L.carAt[1], 1);
    inner.appendChild(carImg);

    inner.appendChild(wheelWell("front"));
    inner.appendChild(wheelWell("rear"));

    var jp = el("g", {
      "class": "wrap-jackpoint", "data-hit": "jackpoint", "data-part": "jackpoint",
      transform: "translate(300 1012)"
    });
    jp.appendChild(el("circle", { r: 88, fill: "rgba(0,0,0,0)" }));
    jp.appendChild(ring(80));
    inner.appendChild(jp);
    n.jackPoint = jp;

    var sp2 = el("g", {
      "class": "wrap-standpoint", "data-hit": "standpoint", "data-part": "standpoint",
      transform: "translate(" + L.standX + " 1002)"
    });
    sp2.appendChild(el("circle", { r: 96, fill: "rgba(0,0,0,0)" }));
    sp2.appendChild(ring(88));
    inner.appendChild(sp2);
    n.standPoint = sp2;

    n.byName = {};
    n.byName.front = buildAxle(inner, "front");
    n.byName.rear = buildAxle(inner, "rear");
    svg.appendChild(carG);
    n.carG = carG; n.carInner = inner;

    /* axle stand */
    var fr = el("g", { "class": "layer-front" });
    var standWrap = el("g", { "class": "stand", "data-hit": "stand", "data-part": "stand" });
    var standG = SP.make("stand");
    standWrap.appendChild(standG);
    standWrap.appendChild(ring(72, { cy: -120 }));
    fr.appendChild(standWrap);
    svg.appendChild(fr);
    n.standWrap = standWrap; n.standG = standG;

    /* fx */
    n.fx = el("g", { "class": "layer-fx" });
    svg.appendChild(n.fx);

    hotNodes = Array.prototype.slice.call(svg.querySelectorAll("[data-hit]"));
    host.appendChild(svg);
    return svg;
  }

  /* -------------------------------------------------------------- render -- */
  function render(S) {
    var jm = SPR.jackBody.meta;

    /* --- contact shadows follow the pose --- */
    var pf = L.axles.front, pp = L.pitchPivot;
    var ca = Math.cos(S.pitch), sa = Math.sin(S.pitch);
    var liftK = U.clamp(S.pitch / L.maxPitchLift, 0, 1);
    n.shF.setAttribute("cx", (pp[0] + (pf[0] - pp[0]) * ca - (pf[1] - pp[1]) * sa).toFixed(1));
    n.shF.setAttribute("rx", (235 * (1 - 0.3 * liftK)).toFixed(1));
    n.shF.setAttribute("opacity", (1 - 0.92 * liftK).toFixed(3));
    n.shJ.setAttribute("cx", (S.jack.x + SPR.jackBody.w * SPR.jackBody.s * 0.5).toFixed(1));
    n.shJ.setAttribute("opacity", S.jack.out ? 0 : 1);
    n.shS.setAttribute("opacity", S.stand.placed ? 1 : 0);

    /* --- how far the body is off the ground --- */
    var saddle = G.saddleWorld(S.jack.arm);
    if (S.support === "jack" && S.jack.placed) S.pitch = G.solvePitch(saddle[0], saddle[1]);
    else if (S.support === "stand") S.pitch = S.pitchHold;
    else S.pitch = 0;
    n.carG.setAttribute("transform", "rotate(" + U.deg(S.pitch).toFixed(4) + " " + L.pitchPivot[0] + " " + L.pitchPivot[1] + ")");

    /* --- jack --- */
    n.jackWrap.setAttribute("transform", "translate(" + S.jack.x + " " + G.jackOrigin[1] + ")");
    n.jackWrap.setAttribute("opacity", S.jack.out ? 0 : 1);
    SP.place(n.jackBody, 0, 0, 1);
    SP.placeRot(n.jackArm, 0, 0, 1, S.jack.arm, jm.pivot[0], jm.pivot[1]);

    /* --- axle stand --- */
    var sw = SPR.stand, naturalH = sw.h * sw.s;
    var k = S.stand.placed ? Math.max(0.01, S.stand.h / naturalH) : 0.01;
    n.standWrap.setAttribute("opacity", S.stand.placed ? Math.min(1, S.stand.slide * 1.4) : 0);
    n.standWrap.setAttribute("transform",
      "translate(" + (L.standX + (1 - S.stand.slide) * 420) + " " + L.groundY + ")");
    SP.place(n.standG, 0, 0, k);

    /* --- axles --- */
    Object.keys(n.byName).forEach(function (name) {
      var A = n.byName[name];
      var f = A.front;

      A.discWrap.setAttribute("transform", f
        ? "translate(" + S.disc.dx + " " + S.disc.dy + ") rotate(" + S.disc.rot + ")"
        : "");
      A.discWrap.setAttribute("opacity", f && S.disc.removed && S.disc.dx === 0 ? 0 : 1);

      A.pads.forEach(function (p, i) {
        var st = S.pads[i];
        p.wrap.setAttribute("transform", f
          ? "translate(" + st.dx + " " + st.dy + ") rotate(" + st.rot + " " + L.padPlace[i][0] + " " + L.padPlace[i][1] + ")"
          : "");
        p.wrap.setAttribute("opacity", f && st.out && st.dx === 0 && st.dy === 0 ? 0 : 1);
        p.wrap.style.display = f ? "" : "none";
      });

      A.caliperWrap.setAttribute("transform", f
        ? "translate(" + S.caliper.dx + " " + S.caliper.dy + ") rotate(" + S.caliper.rot + " " + L.caliperDx + " " + L.caliperDy + ")"
        : "translate(0 0)");
      A.bolts.forEach(function (b, i) { b.setAttribute("opacity", f && S.caliper.bolts[i] ? 0.2 : 1); });

      /* One wheel node per axle, always drawn. Off the hub it simply sits
         where the state puts it - on the floor beside the car, still a real
         object you can hover and click - so there is never a moment with two
         wheels, a hidden one, or one that cannot be reached. Its only extra
         transform is the offset from the hub: all zeros means perfectly on it. */
      var W = S.wheel || {};
      A.wheelWrap.setAttribute("transform", f
        ? "translate(" + (W.dx || 0) + " " + (W.dy || 0) + ") rotate(" + (W.rot || 0) + ")" +
          " scale(" + (W.scale || 1) + ")"
        : "");
      if (f && n.shW) {
        var wxp = L.axles.front[0] + (W.dx || 0);
        var wsc = Math.max(0.2, (W.scale || 1) * (1 - Math.min(1, Math.abs(W.dy || 0) / 420) * 0.45));
        n.shW.setAttribute("cx", wxp.toFixed(1));
        n.shW.setAttribute("rx", (168 * wsc).toFixed(1));
        n.shW.setAttribute("opacity", W.removed ? "0.42" : "0");
      }

      var wheelNuts = G.nutsFor(S, name);
      A.nuts.forEach(function (N, i) {
        /* the state of *this* wheel's nut - never the other axle's */
        var st = wheelNuts[i] || { loosened: false, removed: false, fly: 0, spin: 0, flyDx: 0, flyDy: 0 };
        var gone = st.removed;
        /* The nut group - stud, hotspot, star badge - stays where it is for
           good. Only the nut *art* leaves: it flies off, fades and is dropped
           at the end. That way a corner with its nuts off still has five live
           targets sitting on five bare studs, which is exactly what "start the
           nuts by hand" needs to be clickable. */
        var backed = st.loosened && !st.removed ? 1 : 0;
        var bl = Math.hypot(N.base[0], N.base[1]) || 1;
        var ox2 = (N.base[0] / bl) * 7 * backed, oy2 = (N.base[1] / bl) * 7 * backed;
        N.g.style.display = "";
        N.g.setAttribute("opacity", 1);
        N.g.setAttribute("transform", "translate(" + U.round(N.base[0] + ox2, 2) +
          " " + U.round(N.base[1] + oy2, 2) + ")");
        N.spin.style.display = gone && st.fly >= 0.999 ? "none" : "";
        N.spin.setAttribute("opacity", gone ? 1 - st.fly : 1);
        N.spin.setAttribute("transform",
          "translate(" + (st.flyDx * st.fly).toFixed(1) + " " + (st.flyDy * st.fly).toFixed(1) + ")" +
          " scale(" + ((1 - 0.3 * st.fly) * (1 + 0.05 * backed)) + ")" +
          " rotate(" + st.spin + ")");
        if (S.badges && f) {   /* the star-pattern numbers belong to the front job */
          N.badge.style.opacity = 1;
          N.txt.textContent = S.badges[i] || "";
        } else {
          N.badge.style.opacity = 0;
        }
      });
    });

    /* --- hotspots --- */
    /* A lesson works on one corner, so its glow stops at that corner: the rear
       nuts must not light up because the front ones are the job. */
    var want = {}, hotAxle = S.hotAxle || "front";
    (S.hot || []).forEach(function (key) { want[key] = true; });
    for (var i = 0; i < hotNodes.length; i++) {
      var node = hotNodes[i];
      var axleOf = node.getAttribute("data-axle");
      var on = !!want[node.getAttribute("data-hit")] && (!axleOf || axleOf === hotAxle);
      node.classList.toggle("is-hot", on);
    }
  }

  /* A ring that expands and fades where something just happened. Pure
     decoration, but it makes every click land. */
  function pulse(x, y, r0, colour) {
    if (!n.fx) return;
    var c = el("circle", {
      cx: x, cy: y, r: r0 || 12, fill: "none", stroke: colour || "#ffb64d",
      "stroke-width": 2.6, "stroke-opacity": 0.9
    });
    n.fx.appendChild(c);
    var t0 = performance.now();
    (function loop(now) {
      var t = Math.min(1, (now - t0) / 520);
      c.setAttribute("r", (r0 || 12) + 30 * t);
      c.setAttribute("stroke-opacity", 0.9 * (1 - t));
      if (t < 1) requestAnimationFrame(loop); else c.remove();
    })(t0);
  }

  /* The lesson panel is pinned over the right-hand quarter of the stage. World
     units are shifted left by the same number of *pixels* so whatever the
     camera is looking at lands in the visible area, not behind the panel. */
  var PANEL_PX = 324;
  var DRAWER_PX = 264;                 /* the toolbox drawer, styles/main.css */
  function safeShift(S) {
    /* below 980px the rail sits under the stage instead of over it (main.css) */
    if (typeof window !== "undefined" && window.innerWidth && window.innerWidth <= 980) return 0;
    var sw = S.stageW || 1440;
    /* the drawer is part of the furniture once it is open: the camera gives it
       room instead of letting it sit on top of the car */
    var px = PANEL_PX + (S.drawerPx || 0) * (DRAWER_PX / 264);
    /* a pixel offset is a huge world offset when zoomed right in, so cap it */
    return Math.min((px / 2) * (S.cam.w / sw), S.cam.w * 0.24);
  }

  function setViewBox(S) {
    var w = S.cam.w, hgt = w * (S.aspect || 0.5625);
    svg.setAttribute("viewBox",
      [S.cam.cx - w / 2 + safeShift(S), S.cam.cy - hgt / 2, w, hgt].join(" "));
  }

  VG.scene = {
    init: init, render: render, setViewBox: setViewBox, nodes: n, pulse: pulse,
    get svg() { return svg; }
  };
})();
