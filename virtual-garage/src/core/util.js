/* Virtual Garage - tiny helpers: DOM building, maths, tweening. */
(function () {
  "use strict";
  var VG = (window.VG = window.VG || {});
  var SVGNS = "http://www.w3.org/2000/svg";

  function el(tag, attrs, kids) {
    var n = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (kids) kids.forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  function h(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rad(deg) { return (deg * Math.PI) / 180; }
  function deg(r) { return (r * 180) / Math.PI; }
  function round(v, n) { var f = Math.pow(10, n || 2); return Math.round(v * f) / f; }

  var ease = {
    linear: function (t) { return t; },
    outCubic: function (t) { return 1 - Math.pow(1 - t, 3); },
    inOutCubic: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    outBack: function (t) { return 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2); }
  };

  /* A very small tween engine. Tweens write straight into plain objects,
     which the renderer reads every frame, so state and animation never drift
     apart. A new tween on the same property cancels the old one. */
  var anim = {
    list: [],
    tween: function (obj, to, dur, name, done, onU) {
      for (var i = this.list.length - 1; i >= 0; i--) {
        var t = this.list[i], clash = false;
        if (t.obj === obj) for (var k in to) if (k in t.to) { clash = true; break; }
        if (clash) this.list.splice(i, 1);
      }
      var from = {};
      for (var p in to) from[p] = obj[p];
      this.list.push({
        obj: obj, from: from, to: to, t: 0,
        dur: dur == null ? 0.5 : dur,
        e: ease[name] || ease.outCubic,
        done: done, onU: onU
      });
      return this;
    },
    after: function (seconds, fn) {
      var dummy = { v: 0 };
      this.tween(dummy, { v: 1 }, seconds, "linear", fn);
      return this;
    },
    step: function (dt) {
      for (var i = this.list.length - 1; i >= 0; i--) {
        var a = this.list[i];
        a.t += dt;
        var k = a.dur <= 0 ? 1 : clamp(a.t / a.dur, 0, 1);
        var v = a.e(k);
        for (var p in a.to) a.obj[p] = a.from[p] + (a.to[p] - a.from[p]) * v;
        if (a.onU) a.onU(a.obj);
        if (k >= 1) {
          this.list.splice(i, 1);
          if (a.done) a.done();
        }
      }
    },
    busy: function () { return this.list.length > 0; },
    clear: function () { this.list.length = 0; }
  };

  VG.util = {
    el: el, h: h, clamp: clamp, lerp: lerp, rad: rad, deg: deg, round: round,
    ease: ease, anim: anim
  };
})();
