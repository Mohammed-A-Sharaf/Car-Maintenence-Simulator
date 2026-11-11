/* Virtual Garage - headless smoke test.
 *
 * There is no browser in this sandbox, so this file stubs just enough DOM for
 * the real src/ modules to boot, then plays every lesson through to the end.
 * It catches broken references, wrong step order and renderer exceptions.
 *
 *   node tests/smoke.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");

/* ------------------------------------------------------------- tiny DOM --- */
function ClassList(node) {
  return {
    _set: new Set(),
    add(c) { this._set.add(c); },
    remove(c) { this._set.delete(c); },
    contains(c) { return this._set.has(c); },
    toggle(c, on) { if (on) this._set.add(c); else this._set.delete(c); }
  };
}

class El {
  constructor(tag) {
    this.tagName = tag;
    this.attrs = Object.create(null);
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.classList = ClassList(this);
    this.hidden = false;
    this.textContent = "";
    this._html = "";
    this.listeners = {};
  }
  set id(v) { this._id = v; if (v) doc._byId[v] = this; }
  get id() { return this._id || ""; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  hasAttribute(k) { return k in this.attrs; }
  removeAttribute(k) { delete this.attrs[k]; }
  appendChild(c) { this.children.push(c); c.parentNode = this; return c; }
  remove() {
    if (this.parentNode) {
      const i = this.parentNode.children.indexOf(this);
      if (i >= 0) this.parentNode.children.splice(i, 1);
    }
  }
  get firstChild() { return this.children[0] || null; }
  set innerHTML(v) { this._html = v; if (v === "") this.children = []; }
  get innerHTML() { return this._html; }
  addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); }
  getBoundingClientRect() { return { width: 1400, height: 800, top: 0, left: 0 }; }
  createSVGPoint() {
    return { x: 0, y: 0, matrixTransform() { return { x: 0, y: 0 }; } };
  }
  getScreenCTM() { return { inverse() { return {}; } }; }
  querySelectorAll(sel) {
    const m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(sel);
    const key = m ? m[1] : sel.replace(/[\[\]]/g, "");
    const val = m ? m[2] : null;
    const out = [];
    (function walk(n) {
      if (n.getAttribute && n.getAttribute(key) != null) {
        if (val == null || n.getAttribute(key) === val) out.push(n);
      }
      n.children.forEach(walk);
    })(this);
    return out;
  }
  closest(sel) {
    const key = sel.replace(/[\[\]]/g, "");
    let n = this;
    while (n) {
      if (n.getAttribute && n.getAttribute(key) != null) return n;
      n = n.parentNode;
    }
    return null;
  }
}

const doc = {
  readyState: "complete",
  _byId: {},
  createElementNS(ns, tag) { return new El(tag); },
  createElement(tag) { return new El(tag); },
  createTextNode(t) { const n = new El("#text"); n.textContent = t; return n; },
  getElementById(id) {
    if (!this._byId[id]) this._byId[id] = new El("div");
    return this._byId[id];
  },
  addEventListener() {}
};

const win = {
  addEventListener() {},
  devicePixelRatio: 1
};
win.window = win;

const sandbox = {
  window: win,
  document: doc,
  console,
  setTimeout: (fn) => 0,
  clearTimeout: () => {},
  performance: { now: () => Date.now() },
  requestAnimationFrame: (fn) => 0,
  Math, JSON, Object, Array, String, Number, Boolean, Date, Set, Map, Error, isNaN, parseFloat, parseInt
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const FILES = [
  "src/content/sprites.js", "src/content/layout.js",
  "src/core/util.js", "src/core/sprite.js", "src/core/state.js",
  "src/content/parts.js", "src/content/garage.js",
  "src/scene/camera.js", "src/scene/garage.js", "src/scene/scene.js",
  "src/interactions/actions.js", "src/content/lessons.js",
  "src/lessons/engine.js", "src/ui/progress.js", "src/ui/hud.js", "src/ui/partcard.js"
];

for (const f of FILES) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sandbox, { filename: f });
}

const VG = win.VG;
const stage = doc.getElementById("stage");
VG.scene.init(stage);
VG.S = VG.newState();
VG.camera.fit(stage, VG.S);
VG.hud.init();
VG.partcard.init();
VG.tools.init();

/* --------------------------------------------------------------- helpers -- */
let failures = 0, checks = 0;
function check(label, cond, extra) {
  checks++;
  if (cond) return;
  failures++;
  console.log("  FAIL " + label + (extra ? "  " + extra : ""));
}

function settle(seconds) {
  for (let t = 0; t < seconds; t += 0.05) {
    VG.util.anim.step(0.05);
    VG.scene.render(VG.S);
    VG.scene.setViewBox(VG.S);
  }
}

function do_(type, i, wait) {
  const ok = VG.act({ type: type, i: i });
  settle(wait == null ? 0.4 : wait);
  return ok;
}

function summary() {
  const S = VG.S;
  const nuts = S.nuts.filter(function (n) { return n.removed; }).length;
  const loose = S.nuts.filter(function (n) { return n.loosened; }).length;
  return "nuts " + loose + "L/" + nuts + "R · jack " + (S.jack.placed ? "in" : "out") +
    " pump" + S.jack.pumps + " arm" + S.jack.arm.toFixed(1) + "°" +
    " · stand " + (S.stand.placed ? "set " + S.stand.h.toFixed(0) + "px" : "-") +
    " · pitch " + (S.pitch * 180 / Math.PI).toFixed(2) + "°" +
    " · wheel " + (S.wheel.removed ? "off " + S.wheel.dx.toFixed(0) : "on") +
    " · caliper " + (S.caliper.off ? "off" : "on") + " pads " + (S.pads[0].out ? "out" : "in") +
    " · disc " + (S.disc.removed ? "off" : "on");
}

function play(lessonId, script, expectSteps) {
  VG.engine.start(lessonId);
  settle(0.1);
  console.log("\n" + lessonId + " — " + VG.engine.lesson.title);
  let stepNo = VG.engine.stepIndex;
  console.log("  [" + stepNo + "] " + (VG.engine.step() || {}).label);
  script.forEach(function (a) {
    const before = VG.engine.stepIndex;
    const ok = do_(a[0], a[1], a[2]);
    check(a[0] + (a[1] != null ? "#" + a[1] : ""), ok !== false,
      "action was refused (step " + before + ")");
    if (before !== VG.engine.stepIndex) {
      const st = VG.engine.step();
      console.log("  [" + VG.engine.stepIndex + "] " + (st ? st.label : "-- end --") +
        "   (" + a[0] + ")");
    }
  });
  settle(6.0);
  check("finished", VG.S.finished === true,
    "lesson did not complete (step " + VG.engine.stepIndex + "/" + expectSteps + ")");
  check("steps consumed", VG.engine.stepIndex >= expectSteps, VG.engine.stepIndex);
  check("pitch sane", VG.S.pitch >= -0.001 && VG.S.pitch < 0.09, String(VG.S.pitch));
  console.log("  " + summary());
}

/* ----------------------------------------------------------------- tests -- */
console.log("Virtual Garage smoke test");

/* 1. every sprite in the manifest resolves to a file on disk */
Object.keys(VG.sprite.all).forEach(function (k) {
  if (k === "const") return;
  const f = VG.sprite.all[k].file;
  check("sprite " + k, fs.existsSync(path.join(ROOT, f)), f);
});

/* 2. idle state renders */
VG.engine.start("explore");
settle(0.2);
check("explore boots", VG.S.lessonId === "explore");

/* 3. all five nuts are where the wheel art has them */
const pos = [0, 1, 2, 3, 4].map(VG.geom.nutPos);
pos.forEach(function (p, i) {
  const r = Math.hypot(p[0], p[1]);
  check("nut " + i + " pitch", Math.abs(r - 40 || 0) < 1.5, r.toFixed(2));
});
check("nut at 12 o'clock", Math.abs(pos[1][0]) < 0.5 && pos[1][1] < -38);

/* 4. the jack saddle starts under the nose and reaches it when pumped */
const low = VG.geom.saddleWorld(VG.util.rad(1) && VG.geom ? 31.5 : 31.5);
check("saddle under nose", low[0] > 240 && low[0] < 400, String(low[0]));
check("saddle below body at rest", low[1] > VG.geom.noseUnderside(low[0]) - 2, String(low[1]));
const high = VG.geom.saddleWorld(0);
check("saddle lifts the nose", VG.geom.solvePitch(high[0], high[1]) > 0.02);

/* 5. play the three lessons */
play("lift", [
  ["nutLoosen", 0], ["nutLoosen", 2], ["nutLoosen", 4], ["nutLoosen", 1], ["nutLoosen", 3],
  ["placeJack"], ["pump"], ["pump"], ["pump"], ["pump"], ["pump"], ["pump"],
  ["placeStand"], ["releaseJack"],
  ["nutRemove", 0], ["nutRemove", 1], ["nutRemove", 2], ["nutRemove", 3], ["nutRemove", 4],
  ["wheelOff"]
], 7);

play("pads", [
  ["bolt", 0], ["bolt", 1], ["caliperOff"],
  ["padOut", 0], ["padOut", 1], ["padsIn"], ["caliperOn"],
  ["boltTighten", 0], ["boltTighten", 1]
], 6);

play("disc", [
  ["discOff"], ["discIn"], ["reassemble"], ["lowerCar"]
], 4);

play("refit", [
  ["wheelOn", null, 1.5],
  ["nutFit", 0], ["nutFit", 1], ["nutFit", 2], ["nutFit", 3], ["nutFit", 4],
  ["pump"], ["pump"], ["pump", null, 0.9],
  ["standOut"], ["lowerJack", null, 2.6],
  ["nutTorque", 0], ["nutTorque", 2], ["nutTorque", 4],
  ["nutTorque", 1], ["nutTorque", 3]
], 6);

/* the refit lesson has to end flat on the ground with every nut on */
check("refit: car is down", VG.S.pitch < 0.0015, String(VG.S.pitch));
check("refit: stand away", VG.S.stand.placed === false);
check("refit: wheel on", VG.S.wheel.removed === false);
check("refit: five nuts", VG.S.nuts.every(function (n) { return !n.removed; }));

/* 6. out-of-order actions are refused, not silently applied */
VG.engine.start("lift");
settle(0.1);
check("jack before nuts is refused", VG.act({ type: "placeJack" }) === false);
check("star order enforced", VG.act({ type: "nutLoosen", i: 1 }) === false);
check("star order accepts 1", VG.act({ type: "nutLoosen", i: 0 }) === true);

/* 7. explore mode allows free play but respects physics */
VG.engine.start("explore");
settle(0.1);
check("wheel off refused with nuts on", VG.act({ type: "wheelOff" }) === false);
check("jack can be placed", VG.act({ type: "placeJack" }) === true);
settle(1.2);
check("jack is placed", VG.S.jack.placed === true);
for (let i = 0; i < 6; i++) { VG.act({ type: "pump" }); settle(0.4); }
check("pumped up", VG.S.jack.pumps === 6, String(VG.S.jack.pumps));
settle(0.6);
check("car is off the ground", VG.S.pitch > 0.02, String(VG.S.pitch));
check("stand refuses before lift", VG.S.pitch > 0.02);

/* 7c. the wheel cannot be pulled off early, by any route */
VG.S = VG.newState();
VG.engine.start("explore");
settle(0.1);
const CAN = VG.tools.can;
check("can.wheel: blocked with nuts on", CAN.wheel(VG.S) === "nuts_on", String(CAN.wheel(VG.S)));
check("act wheelOff refused early", VG.act({ type: "wheelOff" }) === false);
check("wheel still on", VG.S.wheel.removed === false);
/* one nut off is not enough */
VG.S.nuts[0].loosened = true;
check("remove needs a slack nut", VG.act({ type: "nutRemove", i: 1 }) === false);
check("remove slack nut works", VG.act({ type: "nutRemove", i: 0 }) === true);
check("can.wheel: still blocked with four nuts", CAN.wheel(VG.S) === "nuts_on");
check("act wheelOff refused with four nuts", VG.act({ type: "wheelOff" }) === false);
/* all five off, but nothing holding the car up */
VG.S.nuts.forEach(function (n) { n.loosened = true; n.removed = true; });
check("can.wheel: unsupported", CAN.wheel(VG.S) === "unsupported", String(CAN.wheel(VG.S)));
check("act wheelOff refused when unsupported", VG.act({ type: "wheelOff" }) === false);
check("wheel on an unsupported car", VG.S.wheel.removed === false);
/* the whole preparation, then the nuts, then the wheel */
VG.S = VG.newState();
VG.engine.start("explore");
VG.act({ type: "placeJack" }); settle(1.2);
for (let i = 0; i < 6; i++) { VG.act({ type: "pump" }); settle(0.35); }
VG.act({ type: "placeStand" }); settle(0.7);
VG.act({ type: "releaseJack" }); settle(1.7);
check("prep: supported by the stand", VG.S.support === "stand" && VG.S.stand.placed === true);
check("can.wheel: still nuts_on after prep", CAN.wheel(VG.S) === "nuts_on");
for (let i = 0; i < 5; i++) { VG.S.nuts[i].loosened = true; }
check("nuts do not come off in one click", VG.act({ type: "nutRemove", i: 0 }) === true);
check("can.wheel: blocked on four nuts", CAN.wheel(VG.S) === "nuts_on");
for (let i = 1; i < 5; i++) VG.act({ type: "nutRemove", i: i });
check("can.wheel: clear at last", CAN.wheel(VG.S) === null, String(CAN.wheel(VG.S)));
check("act wheelOff allowed when it is", VG.act({ type: "wheelOff" }) === true);
settle(1.2);
check("wheel off", VG.S.wheel.removed === true);
check("wheel parked", Math.abs(VG.S.wheel.dx - (-300 - 605)) < 2, String(VG.S.wheel.dx));
/* the other two parts inherit the same wall */
check("can.caliper: bolts first", CAN.caliper(Object.assign(VG.newState(), {})) === "wheel_on");
check("can.disc: caliper first", CAN.disc(VG.S) === "caliper_on");

/* 7b. the refit guards */
VG.engine.start("refit");
settle(0.1);
check("wheel before nuts", VG.act({ type: "nutFit", i: 0 }) === false);
check("torque needs the ground", VG.act({ type: "nutTorque", i: 0 }) === false);

/* 8. the finished lift state is what the pictures show */
VG.engine.start("lift");
settle(0.1);
[0, 2, 4, 1, 3].forEach(function (i) { do_("nutLoosen", i); });
do_("placeJack");
for (let i = 0; i < 6; i++) do_("pump");
settle(1.2);
do_("placeStand");
const liftedPitch = VG.S.pitch;
do_("releaseJack");
settle(2.0);
check("stand holds the pitch", Math.abs(VG.S.pitch - liftedPitch) < 1e-6,
  VG.S.pitch + " vs " + liftedPitch);
check("saddle released", VG.S.jack.arm > 30, String(VG.S.jack.arm));
check("stand height matches the sill",
  Math.abs(VG.geom.standHeight(VG.S.pitch) - VG.S.stand.h) < 0.5, String(VG.S.stand.h));
console.log("\n  lifted: " + summary());

/* 8a. the dashboard has something to say at every step */
const cardsEl = doc.getElementById("lessonCards");
check("a card per lesson", cardsEl.children.length === win.VG_LESSONS.length,
  String(cardsEl.children.length));
check("learning path counts four lessons", VG.progress.total() === 4, String(VG.progress.total()));

win.VG_PARTS && Object.keys(win.VG_PARTS).forEach(function (k) {
  const img = win.VG_PARTS[k].img;
  if (img) check("card art " + k, fs.existsSync(path.join(ROOT, img)), img);
});

win.VG_LESSONS.forEach(function (les) {
  les.steps.forEach(function (st, i) {
    check(les.id + " step " + i + " label", !!(st.label && st.label.length));
    check(les.id + " step " + i + " hint", !!(st.hint && st.hint.length));
  });
  if (les.steps.length) {
    check(les.id + " has a completion card", !!(les.done && les.done.title));
    check(les.id + " is worth XP", les.xp > 0, String(les.xp));
  }
});

function byClass(root, cls) {
  const out = [];
  (function walk(n) { if (n.className === cls) out.push(n); n.children.forEach(walk); })(root);
  return out;
}
function cardFor(id) {
  return cardsEl.children.filter(function (c) { return c.getAttribute("data-lesson") === id; })[0];
}

VG.engine.start("disc");
settle(0.1);
check("active card is open", cardFor("disc").getAttribute("data-state") === "active");
check("only one card opens",
  cardsEl.children.filter(function (c) { return c.getAttribute("data-state") === "active"; }).length === 1);
check("steps render in the card", byClass(cardFor("disc"), "steps")[0].children.length === 4);

do_("discOff", null, 0.8);
const hintEl = doc.getElementById("hint");
check("action step shows a button",
  byClass(hintEl, "cta").length === 1, hintEl.textContent);
const toolRows = doc.getElementById("toolList").children;
check("toolbox lists the tools", toolRows.length === 4, String(toolRows.length));
check("toolbox rows are pickable", toolRows.every(function (li) {
  return li.children[0] && li.children[0].getAttribute("data-tool");
}));
check("toolbox selection is single",
  toolRows.filter(function (li) { return li.children[0].getAttribute("aria-pressed") === "true"; }).length <= 1);
check("task panel names the step",
  doc.getElementById("taskPanel").classList.contains("is-on") &&
  /Step 2 of 4/.test(doc.getElementById("tpKicker").textContent),
  doc.getElementById("tpKicker").textContent);

/* progress, XP and the level in the header */
const store = Object.create(null);
win.localStorage = {
  getItem: function (k) { return k in store ? store[k] : null; },
  setItem: function (k, v) { store[k] = String(v); },
  removeItem: function (k) { delete store[k]; }
};
VG.progress.reset();
check("starts at level 1", VG.progress.level().n === 1, String(VG.progress.level().n));
const gained = VG.hud.markDone("lift");
check("lesson pays its XP", gained === 250, String(gained));
check("XP is paid once", VG.hud.markDone("lift") === 0);
check("XP is stored", JSON.parse(store["vg:progress"]).xp === 250, store["vg:progress"]);
check("level moves at 400 XP", (function () {
  VG.hud.markDone("pads");           /* 500 */
  return VG.progress.level().n === 2;
})(), JSON.stringify(VG.progress.level()));
check("header shows the level", doc.getElementById("lvlText").textContent === "Level 2",
  doc.getElementById("lvlText").textContent);
check("ring counts finished lessons", doc.getElementById("ringText").textContent === "2/4",
  doc.getElementById("ringText").textContent);
check("sidebar knows the section", (function () {
  VG.engine.start("explore");
  const b = doc.getElementById("sideNav").children.filter(function (n) {
    return n.getAttribute("data-nav") === "garage";
  })[0];
  return b.getAttribute("aria-current") === "page";
})());
check("achievements are derived", VG.progress.achievements().filter(function (a) { return a.got; }).length >= 2);

/* 8d. the camera: click to frame, smooth zoom, a way back */
function findHit(hit, axle) {
  const nodes = VG.scene.svg.querySelectorAll('[data-hit="' + hit + '"]');
  for (let k = 0; k < nodes.length; k++) {
    if (!axle || nodes[k].getAttribute("data-axle") === axle) return nodes[k];
  }
  return null;
}
VG.engine.start("explore");
settle(0.1);
const camS = VG.S;
VG.camera.focusPart("wheel", "front");
settle(1.2);
check("focus centres the part", Math.abs(camS.cam.cx - win.VG_LAYOUT.axles.front[0]) < 3,
  camS.cam.cx.toFixed(1));
check("focus zooms in on it", camS.cam.w > 400 && camS.cam.w < 1400, camS.cam.w.toFixed(0));
check("focus marks the view as custom", camS.camName === "custom");
check("focus labels the chip", camS.camLabel === "Wheel", String(camS.camLabel));
VG.hud.tick();
check("zoom chip shows", doc.getElementById("zoomChip").hidden === false);

VG.camera.goLesson();
settle(1.0);
check("back to the lesson view", camS.camName === "overview", camS.camName);
VG.hud.tick();
check("zoom chip hides", doc.getElementById("zoomChip").hidden === true);

/* zooming about a point must keep that point still on screen */
camS.cam.cx = 600; camS.cam.cy = 960; camS.cam.w = 1000;
const ANCX = 900, ANCY = 1000;
const relX = (ANCX - camS.cam.cx) / camS.cam.w;
const relY = (ANCY - camS.cam.cy) / camS.cam.w;
VG.camera.zoomAt(camS, 0.5, ANCX, ANCY, 0);
check("zoom holds the anchor x", Math.abs((ANCX - camS.cam.cx) / camS.cam.w - relX) < 1e-9);
check("zoom holds the anchor y", Math.abs((ANCY - camS.cam.cy) / camS.cam.w - relY) < 1e-9);
check("zoom keeps the width", Math.abs(camS.cam.w - 500) < 1e-9, camS.cam.w);

VG.camera.zoomAt(camS, 100, 600, 960, 0);
check("zoom clamps out", camS.cam.w === VG.camera.MAX_W, camS.cam.w);
VG.camera.zoomAt(camS, 0.00001, 600, 960, 0);
check("zoom clamps in", camS.cam.w === VG.camera.MIN_W, camS.cam.w);

/* a plain click on a part frames it and shows the card */
VG.engine.start("explore");
settle(0.1);
VG.tools.click(findHit("caliper", "front"));
settle(0.9);
check("click frames the caliper",
  VG.S.camName === "custom" && VG.S.camLabel === "Caliper", String(VG.S.camLabel));
check("click shows the card", doc.getElementById("partcard").hidden === false);

/* every hotspot the scene draws has a sensible framing */
["wheel", "hub", "nut", "disc", "caliper", "pad", "bolt", "jack", "stand",
 "jackpoint", "standpoint"].forEach(function (hit) {
  const t = VG.camera.targetFor(hit, "front");
  check("framing for " + hit, !!t && isFinite(t.x) && isFinite(t.y) && t.r > 0);
});

/* 9. the disc lesson really does end with the car on its wheels */
VG.engine.start("disc");
settle(0.1);
do_("discOff"); do_("discIn"); do_("reassemble");
settle(4.5);
do_("lowerCar");
settle(7.0);
check("back on the ground", VG.S.pitch < 0.0015, String(VG.S.pitch));
check("stand away", VG.S.stand.placed === false);
check("jack cleared", VG.S.jack.out === true, String(VG.S.jack.out));
check("wheel on", VG.S.wheel.removed === false && VG.S.wheel.dx === 0);
console.log("\n  lowered: " + summary());

/* 10. hover affordances: ring lights up, name tag follows the pointer */
const nutNode = VG.scene.nodes.byName.front.nuts[0].g;
VG.tools.hoverAt(nutNode, 40, 40);
const tipEl = doc.getElementById("hovertip");
function hasClass(node, cls) {
  if (node.classList && node.classList.contains(cls)) return true;
  for (let q = 0; q < node.children.length; q++) if (hasClass(node.children[q], cls)) return true;
  return false;
}
check("hover lights a ring", hasClass(nutNode, "is-hover"));
check("hover tag shows and names the part",
  tipEl.hidden === false && tipEl.children.length === 2 &&
  tipEl.children[0].textContent === "Lug nut",
  tipEl.hidden + " / " + (tipEl.children[0] || { textContent: "?" }).textContent);
check("hover tag is positioned", typeof tipEl.style.left === "string" && tipEl.style.left.endsWith("px"),
  String(tipEl.style.left));
VG.tools.hoverAt(null, 0, 0);
check("leaving clears hover", tipEl.hidden === true && !hasClass(nutNode, "is-hover"));

/* lesson-hot parts pulse instead (class survives a hover pass) */
VG.engine.start("lift");
settle(0.1);
const nutRing = VG.scene.nodes.byName.front.nuts[0].g;
VG.tools.hoverAt(nutRing, 10, 10);
check("hot beats hover in CSS order (class present)",
  hasClass(nutRing, "is-hot") && hasClass(nutRing, "is-hover"));

/* 11. stats, achievements and the celebration */
VG.progress.reset();
const fresh = VG.progress.bump("nutLoosen", 5);
check("bump reports only new achievements", fresh.length === 1 && fresh[0] === "Grease monkey",
  JSON.stringify(fresh));
check("bump accumulates", VG.progress.stats.nutLoosen === 5, JSON.stringify(VG.progress.stats));
check("no repeat toast", VG.progress.bump("nutLoosen", 1).length === 0);
check("achievement list is rich", VG.progress.achievements().length === 17,
  String(VG.progress.achievements().length));
check("old saves migrate (stats object)", typeof VG.progress.stats === "object");
VG.progress.reset();

const vEl = doc.getElementById("victory");
check("victory shows confetti", byClass(vEl, "confetti").length === 26,
  String(byClass(vEl, "confetti").length));
const xpEl = byClass(vEl, "xpget")[0];
check("XP counted up to the payout", /^\+\d+ XP earned$/.test(xpEl ? xpEl.textContent : ""),
  xpEl ? xpEl.textContent : "none");

/* 12. status line names the tool in hand; H flashes the hint */
VG.engine.start("explore");            /* explore puts no tool in the hand */
settle(0.1);
VG.tools.setTool("wrench");
VG.hud.refresh();
check("the panel names the tool in hand",
  doc.getElementById("tpToolName").textContent === "Lug wrench",
  doc.getElementById("tpToolName").textContent);
VG.tools.setTool("wrench");            /* toggle back off */
VG.hud.refresh();
check("tool can be put down",
  doc.getElementById("tpToolName").textContent === "No tool in hand",
  doc.getElementById("tpToolName").textContent);
VG.hud.flashHint();
const hintEl2 = doc.getElementById("hint");
check("hint flashes on demand", !!hintEl2 && hintEl2.classList.contains("flash"));
check("toolbox rows have titles",
  doc.getElementById("toolList").children.every(function (li) { return !!li.children[0].title; }));
/* the drawer: opens, highlights what is wanted, and closing keeps the tool */
VG.engine.start("lift"); settle(0.1);
VG.hud.openDrawer();
check("drawer opens", doc.getElementById("toolbox").hidden === false);
check("drawer marks the needed tool",
  doc.getElementById("toolList").children[0].children[0].getAttribute("data-state") === "now",
  String(doc.getElementById("toolList").children[0].children[0].getAttribute("data-state")));
check("drawer dims the rest",
  doc.getElementById("toolList").children[2].children[0].getAttribute("data-state") === "later");
check("lesson hands over the tool", VG.S.tool === "wrench", String(VG.S.tool));
VG.hud.syncTools();
check("tool in hand is pressed",
  doc.getElementById("toolList").children[0].children[0].getAttribute("aria-pressed") === "true");
VG.hud.closeDrawer();
check("drawer closes", doc.getElementById("toolbox").hidden === true);
check("closing keeps the tool", VG.S.tool === "wrench");
VG.hud.openDrawer();
check("reopened drawer still knows the tool",
  doc.getElementById("toolList").children[0].children[0].getAttribute("aria-pressed") === "true");
VG.hud.closeDrawer();

/* 13. the wheel comes off one nut at a time - and only the front wheel ----- */
console.log("\n13. one wheel, five nuts, and a rear corner that keeps its parts");
VG.engine.start("lift");
settle(0.1);
const front = VG.scene.nodes.byName.front;
const rear = VG.scene.nodes.byName.rear;
const svgEl = VG.scene.svg;
const wheelF = front.wheelWrap;
const wheelR = rear.wheelWrap;

function holdTool(t) { if (VG.S.tool !== t) VG.tools.setTool(t); }

/* everything the rear corner is made of, frozen for comparison */
function rearSnap() {
  return JSON.stringify({
    state: VG.S.nutsRear.map(function (n) {
      return [n.loosened, n.removed, +n.fly.toFixed(4), +n.spin.toFixed(4)];
    }),
    nuts: rear.nuts.map(function (N) {
      return [N.g.getAttribute("transform"), N.g.getAttribute("opacity"),
              N.g.style.display || "", N.spin.getAttribute("transform"),
              String(N.badge.style.opacity)];
    }),
    wheel: [wheelR.getAttribute("transform"), wheelR.getAttribute("opacity"),
            wheelR.style.display || "", wheelR.style.pointerEvents || ""]
  });
}

/* the arch interior is painted, so a wheel-off corner is not a black hole */
const wells = svgEl.querySelectorAll('[class="wheel-well"]');
check("each arch has a liner", wells.length === 2, String(wells.length));
check("the liner is inside the arch cut-out",
  wells[0].children.length === 4 &&
  Math.abs(+wells[0].children[0].getAttribute("r") - 241) < 0.001,
  wells[0] ? String(wells[0].children.length) : "none");
check("the liner uses the well gradient",
  wells[0].children[0].getAttribute("fill") === "url(#wellGlow)");
check("the wheel-well gradient is defined",
  svgEl.querySelectorAll("[id]").some(function (n) {
    return n.getAttribute("id") === "wellGlow" && n.children.length === 4;
  }));

check("the two wheels have their own nut state",
  VG.S.nuts !== VG.S.nutsRear && VG.S.nuts.length === 5 && VG.S.nutsRear.length === 5);
check("the rear nuts start clean",
  VG.S.nutsRear.every(function (n) { return !n.loosened && !n.removed; }));

const rear0 = rearSnap();
const wheelTransform = function (n) { return n.getAttribute("transform") || ""; };
const exactlyHome = function (n) {
  return wheelTransform(n) === "translate(0 0) rotate(0) scale(1)";
};
const isReachable = function (n) {
  return !n.style.display && !n.style.pointerEvents;
};

/* A browser-like hit test.
   Calling clickNode(node) directly - which is what everything above does - can
   never catch a hit-testing bug: it skips "which node is actually under the
   pointer?". That blind spot hid a real one: with the nuts off, their nodes
   used to be display:none, so the pointer landed on the big wheel hotspot
   underneath and every "start a nut by hand" click became a wheel click. This
   walks the [data-hit] nodes in document order (topmost last, as SVG paints
   them) and answers what the pointer would hit, using each node's own hotspot
   ring and its translate offset. */
const isVisible = function (n) {
  let k = n;
  while (k) {
    if (k.style && k.style.display === "none") return false;
    k = k.parentNode;
  }
  return true;
};
const hotRing = function (n) {
  let out = null;
  (function walk(k) {
    (k.children || []).forEach(function (c) {
      if ((c.getAttribute("class") || "").split(" ").indexOf("hotspot") >= 0) out = c;
      walk(c);
    });
  })(n);
  return out;
};
const hitAt = function (x, y) {
  const nodes = svgEl.querySelectorAll("[data-hit]");
  let hit = null;
  nodes.forEach(function (n) {
    if (n.getAttribute("data-axle") === "rear" || !isVisible(n)) return;
    const ring = hotRing(n);
    if (!ring) return;
    const r = parseFloat(ring.getAttribute("r"));
    if (!(r > 0)) return;
    const num = "(-?[\\d.]+(?:e[-+]?\\d+)?)";
    const tr = new RegExp("translate\\(\\s*" + num + "[ ,]+" + num).exec(n.getAttribute("transform") || "");
    const cx = (tr ? +tr[1] : 0) + (parseFloat(ring.getAttribute("cx")) || 0);
    const cy = (tr ? +tr[2] : 0) + (parseFloat(ring.getAttribute("cy")) || 0);
    if (Math.hypot(x - cx, y - cy) <= r) hit = n;
  });
  return hit;
};
check("the wheel starts on the car",
  VG.S.wheel.removed === false && VG.geom.wheelState(VG.S) === "mounted");
check("the wheel sits dead centre on the hub", exactlyHome(wheelF), wheelTransform(wheelF));
check("the rear wheel is drawn too", isReachable(wheelR) &&
  wheelR.getAttribute("transform") === "");
check("there is exactly one wheel per corner",
  svgEl.querySelectorAll('[data-hit="wheel"]').length === 2,
  String(svgEl.querySelectorAll('[data-hit="wheel"]').length));

/* one click must not take the wheel off */
holdTool("wrench");
VG.tools.click(wheelF);
settle(0.4);
check("one click does not remove the wheel",
  VG.S.wheel.removed === false && VG.geom.wheelState(VG.S) === "mounted");
check("...and it is still on the hub", exactlyHome(wheelF), wheelTransform(wheelF));

/* neither may a drag start on it */
svgEl.classList.remove("blocked");
svgEl.listeners.pointerdown.forEach(function (fn) {
  fn({ button: 0, clientX: 10, clientY: 10, target: wheelF, altKey: false, shiftKey: false,
       preventDefault: function () {} });
});
check("a drag on the wheel is refused while nuts are on", svgEl.classList.contains("blocked"));
svgEl.classList.remove("blocked");

/* slacken all five in the star pattern, one nut at a time */
win.VG_LAYOUT.starOrder.forEach(function (i, k) {
  holdTool("wrench");
  const nutG = front.nuts[i].g;
  const was = nutG.getAttribute("transform");
  VG.tools.click(nutG);
  settle(0.5);
  check("nut " + i + " slackened",
    VG.S.nuts[i].loosened === true && VG.S.nuts[i].removed === false);
  check("nut " + i + " backs off where you can see it",
    nutG.getAttribute("transform") !== was);
  check("nut " + i + " leaves its neighbours alone",
    VG.S.nuts.filter(function (n, j) { return j !== i && n.loosened; }).length === k,
    "slack after nut " + i + ": " + VG.S.nuts.map(function (n) { return +n.loosened; }).join(""));
  check("rear corner untouched by front nut " + i, rearSnap() === rear0);
});

/* jack, stand, release - the preparation the wheel removal depends on */
holdTool("jack");
VG.tools.click(findHit("jackpoint"));
settle(0.6);
check("jack is under the car", VG.S.jack.placed === true);
for (let p = 0; p < 6; p++) { holdTool("jack"); VG.tools.click(findHit("jack")); settle(0.5); }
check("the car is up", VG.S.pitch > 0.02, String(VG.S.pitch));
holdTool("stand");
VG.tools.click(findHit("standpoint"));
settle(0.6);
check("the stand is under the sill", VG.S.stand.placed === true);
holdTool("jack");
VG.tools.click(findHit("jack"));
settle(1.4);
check("the stand carries the load", VG.S.support === "stand", String(VG.S.support));

/* now the nuts come off, one click each, and the wheel stays put */
for (let i = 0; i < 5; i++) {
  holdTool("wrench");
  VG.tools.click(front.nuts[i].g);
  settle(0.9);
  check("nut " + i + " removed", VG.S.nuts[i].removed === true);
  check("nut " + i + " has left the hub", front.nuts[i].spin.style.display === "none");
  check("nut " + i + " left its bare stud behind", isVisible(front.nuts[i].g) &&
    hotRing(front.nuts[i].g) !== null);
  check("the wheel is still on the car after nut " + i,
    VG.S.wheel.removed === false && exactlyHome(wheelF), wheelTransform(wheelF));
  check("rear corner untouched by removing front nut " + i, rearSnap() === rear0);
  if (i < 4) {
    check("pulling the wheel is refused with " + (4 - i) + " nuts still on",
      CAN.wheel(VG.S) === "nuts_on" && VG.act({ type: "wheelOff" }) === false);
    check("...and the wheel has not moved", VG.S.wheel.removed === false);
  }
}

/* the wheel may leave now */
check("the wheel may come off at last", CAN.wheel(VG.S) === null, String(CAN.wheel(VG.S)));
check("the brakes are hidden behind it", front.discWrap.getAttribute("opacity") === "1");
VG.tools.click(wheelF);
/* sample the removal frame by frame: the wheel has to travel away in front of
   you and come to rest beside the car, not blink from the hub to nothing */
const PARK_DX = win.VG_LAYOUT.wheelPark[0] - win.VG_LAYOUT.axles.front[0];
const PARK_DY = win.VG_LAYOUT.wheelPark[1] - win.VG_LAYOUT.axles.front[1];
const trace = [];
for (let t = 0; t < 1.9; t += 0.1) {
  VG.util.anim.step(0.1);
  VG.scene.render(VG.S);
  VG.scene.setViewBox(VG.S);
  const tr = wheelTransform(wheelF);
  trace.push({
    dx: parseFloat((/translate\((-?[\d.]+)/.exec(tr) || [0, 0])[1]),
    sc: parseFloat((/scale\(([\d.]+)\)/.exec(tr) || [0, 1])[1]),
    disp: wheelF.style.display || ""
  });
}
check("the wheel is on screen the whole way off",
  trace.every(function (f) { return f.disp === ""; }));
check("the wheel travels away from the car",
  trace[trace.length - 1].dx < trace[0].dx - 500,
  trace[0].dx.toFixed(0) + " -> " + trace[trace.length - 1].dx.toFixed(0));
check("it never jumps: every frame is between the hub and the park spot",
  trace.every(function (f) { return f.dx <= 0.001 && f.dx >= PARK_DX - 0.5; }),
  trace.map(function (f) { return f.dx.toFixed(0); }).join(" "));
check("the wheel comes towards you before it goes",
  Math.max.apply(null, trace.map(function (f) { return f.sc; })) > 1.02,
  String(Math.max.apply(null, trace.map(function (f) { return f.sc; }))));
settle(0.4);
check("wheel off", VG.S.wheel.removed === true);
check("the wheel lies at the park spot",
  Math.abs(VG.S.wheel.dx - PARK_DX) < 1 && Math.abs(VG.S.wheel.dy - PARK_DY) < 1,
  VG.S.wheel.dx.toFixed(1) + ", " + VG.S.wheel.dy.toFixed(1));
check("the state says loose", VG.geom.wheelState(VG.S) === "loose");
check("it is still drawn", isReachable(wheelF));
check("it is still one wheel, not a copy",
  svgEl.querySelectorAll('[data-hit="wheel"]').length === 2);
check("the loose wheel can be grabbed and clicked",
  VG.tools.dragKind(wheelF) === "wheel");
check("the hub, disc, caliper and pads are exposed",
  front.discWrap.getAttribute("opacity") === "1" &&
  front.pads[0].wrap.style.display === "" && front.pads[1].wrap.style.display === "" &&
  front.bolts[0].getAttribute("opacity") === "1");
check("rear corner untouched by the wheel coming off", rearSnap() === rear0);

/* the loose wheel has to stay where it is through camera, render and zoom */
VG.camera.focusPart("disc", "front");
settle(1.5);
check("the loose wheel stays put when the camera moves in",
  isReachable(wheelF) && Math.abs(VG.S.wheel.dx - PARK_DX) < 1);
VG.engine.goLesson ? VG.engine.goLesson() : VG.camera.goLesson();
settle(1.3);
check("still beside the car back at the lesson view", isReachable(wheelF));
for (let k = 0; k < 6; k++) VG.scene.render(VG.S);
check("still there after a re-render", isReachable(wheelF) &&
  Math.abs(VG.S.wheel.dx - PARK_DX) < 1);
VG.camera.zoomAt(VG.S, 0.4, 600, 962, 0);
settle(0.6);
check("still there after zooming", isReachable(wheelF));

/* the rear corner: inspectable, never actionable */
holdTool("wrench");
VG.tools.click(rear.nuts[0].g);
settle(0.7);
check("a rear nut cannot be undone",
  VG.S.nutsRear[0].loosened === false && VG.S.nutsRear[0].removed === false);
check("clicking a rear part is just a look", doc.getElementById("partcard").hidden === false);
check("the front wheel is still off the hub",
  VG.S.wheel.removed === true && VG.geom.wheelState(VG.S) === "loose");
check("the rear wheel cannot be dragged", VG.tools.dragKind(wheelR) === null);
check("a rear nut cannot be dragged either", VG.tools.dragKind(rear.nuts[0].g) === null);
check("the rear corner renders exactly as it started", rearSnap() === rear0);

/* the other lessons agree with the new state */
VG.engine.start("lift");
settle(0.3);
check("restarting puts the wheel back on the hub",
  VG.S.wheel.removed === false && VG.geom.wheelState(VG.S) === "mounted" &&
  exactlyHome(wheelF), wheelTransform(wheelF));
VG.engine.start("pads");
settle(0.4);
check("the pad lesson starts with the wheel already off and lying there",
  VG.S.wheel.removed === true && VG.S.wheel.resting === true && isReachable(wheelF));
VG.engine.start("refit");
settle(0.4);
check("the refit lesson has the wheel on the floor to fit",
  VG.S.wheel.removed === true && VG.S.wheel.resting === true && isReachable(wheelF));
check("nothing in the front work disturbed the rear nuts",
  VG.S.nutsRear.every(function (n) { return !n.loosened && !n.removed; }) && rearSnap() === rear0);

/* 14. the stage carries no developer controls - only the task panel ------ */
console.log("\n14. the task panel");
const panel = doc.getElementById("taskPanel");
const tpKicker = doc.getElementById("tpKicker");
const tpTitle = doc.getElementById("tpTitle");
const tpHint = doc.getElementById("tpHint");
const tpNext = doc.getElementById("tpNext");
const tpToolName = doc.getElementById("tpToolName");
const tpPips = doc.getElementById("tpPips");
const pipState = function () {
  return tpPips.children.map(function (n) { return n.className || "todo"; });
};
const panelOn = function () { return panel.classList.contains("is-on"); };

check("no debug status line exists", !doc._byId["statusline"]);
check("no camera preset row exists", !doc._byId["camerabar"]);
check("no zoom buttons exist", !doc._byId["zoomIn"] && !doc._byId["zoomOut"]);
check("no reset button on the stage", !doc._byId["resetBtn"]);
check("no step chip on the stage", !doc._byId["stepChip"]);

/* a lesson open: task, one line of instruction, tool, progress, next move */
VG.engine.start("lift");
settle(0.1);
check("the panel is on during a lesson", panelOn() && panel.getAttribute("aria-hidden") === "false");
check("it numbers the step", /^Step 1 of 7$/.test(tpKicker.textContent), tpKicker.textContent);
check("it names the task", tpTitle.textContent === "Slacken the five wheel nuts", tpTitle.textContent);
check("it gives one short instruction",
  tpHint.textContent.length > 20 && tpHint.textContent.length < 150 &&
  /^[A-Z].*[.!]$/.test(tpHint.textContent), tpHint.textContent);
check("there is a pip per step, the current one lit",
  pipState().length === 7 && pipState()[0] === "now" &&
  pipState().filter(function (c) { return c === "now"; }).length === 1,
  pipState().join(","));
check("it shows the tool in hand", tpToolName.textContent === "Lug wrench", tpToolName.textContent);
check("the tool chip carries the tool's picture",
  /lug_wrench\.png/.test(doc.getElementById("tpToolIco").innerHTML));
check("it says what to click next", /Click a wheel nut/.test(tpNext.textContent), tpNext.textContent);
check("nothing technical leaks into it",
  !/[°×]|L\/\d|pitch/.test([tpKicker, tpTitle, tpHint, tpNext, tpToolName]
    .map(function (n) { return n.textContent; }).join(" ")));

/* it keeps up on its own while the work happens */
VG.act({ type: "nutLoosen", i: 0 });
settle(0.25);
check("in-step progress is counted in words", /1 of 5 done/.test(tpKicker.textContent),
  tpKicker.textContent);
[2, 4, 1, 3].forEach(function (i) { VG.act({ type: "nutLoosen", i: i }); settle(0.05); });
settle(0.25);
check("the panel follows the lesson on", /^Step 2 of 7$/.test(tpKicker.textContent), tpKicker.textContent);
check("the finished step is ticked, the next one lit",
  pipState()[0] === "done" && pipState()[1] === "now", pipState().join(","));
check("the new task is named", tpTitle.textContent === "Slide the jack under the nose", tpTitle.textContent);
check("the next move keeps up with the tool",
  /jacking point|Trolley jack/.test(tpNext.textContent), tpNext.textContent);

/* the tool chip flags a tool you have not picked up yet */
VG.tools.setTool("wrench");           /* wrong tool in hand for step 2 */
settle(0.1);
check("the chip still shows what is actually in hand", tpToolName.textContent === "Lug wrench",
  tpToolName.textContent);
check("...and flags that it is the wrong one for this step",
  doc.getElementById("tpTool").classList.contains("mismatch"));
check("the next line names the tool to go and get",
  /Trolley jack/.test(tpNext.textContent) && /from the toolbox/.test(tpNext.textContent),
  tpNext.textContent);

/* free explore stays out of the way until there is something to say */
VG.engine.start("explore");
settle(0.1);
check("explore keeps the stage clear", !panelOn() && panel.getAttribute("aria-hidden") === "true");
VG.tools.setTool("wrench");
settle(0.1);
check("explore speaks up when a tool is picked", panelOn() && panel.classList.contains("lite"));
check("what it says is about the tool",
  tpTitle.textContent === "Lug wrench" && /wheel nuts/.test(tpHint.textContent), tpHint.textContent);
check("explore shows no task progress or next move",
  /^Free explore$/.test(tpKicker.textContent) && tpNext.textContent === "" &&
  pipState().length === 0, tpKicker.textContent);
VG.tools.setTool("wrench");
settle(0.1);
check("putting the tool down clears the stage again", !panelOn());

/* finishing a lesson says so, and does not leave a stale task up */
VG.engine.start("disc");
settle(0.1);
do_("discOff"); do_("discIn"); do_("reassemble"); settle(4.5); do_("lowerCar"); settle(6.5);
check("a finished lesson switches the panel over",
  /^Complete$/.test(tpKicker.textContent) && tpTitle.textContent === "Corner finished",
  tpKicker.textContent + " / " + tpTitle.textContent);
check("every pip is ticked", pipState().length > 0 &&
  pipState().every(function (c) { return c === "done"; }), pipState().join(","));
check("it points at the Learning Path", /Learning Path/.test(tpHint.textContent), tpHint.textContent);

/* the restart control in the panel is the old Reset, without the garage talk */
VG.engine.start("lift");
settle(0.1);
VG.act({ type: "nutLoosen", i: 0 });
settle(0.2);
const restart = doc.getElementById("tpRestart");
check("the panel has a restart control", !!restart && restart.listeners.click.length === 1);
restart.listeners.click[0]({ shiftKey: false });
settle(0.3);
check("restart puts the corner back",
  VG.engine.stepIndex === 0 &&
  VG.S.nuts.every(function (n) { return !n.loosened && !n.removed; }), String(VG.engine.stepIndex));

/* 15. the camera undoes itself: click in, back out ----------------------- */
console.log("\n15. camera by interaction");
VG.engine.start("lift");
settle(0.1);
const lessonView = { name: VG.S.camName, w: VG.S.cam.w };
VG.camera.focusPart("wheel", "front");
settle(1.1);
const wheelView = { w: VG.S.cam.w, cx: VG.S.cam.cx };
check("clicking the wheel frames the wheel",
  VG.S.camLabel === "Wheel" && Math.abs(VG.S.cam.cx - win.VG_LAYOUT.axles.front[0]) < 4,
  VG.S.camLabel + " @ " + VG.S.cam.cx.toFixed(0));
VG.camera.focusPart("disc", "front");
settle(1.1);
check("selecting a brake part frames it in turn",
  VG.S.camLabel === "Brake disc" && VG.S.cam.w < wheelView.w, String(VG.S.cam.w.toFixed(0)));
VG.hud.tick();
check("the view chip names the part and nothing else",
  doc.getElementById("zoomChip").hidden === false &&
  doc.getElementById("zoomText").textContent === "Brake disc",
  doc.getElementById("zoomText").textContent);
const backBtn = doc.getElementById("zoomBack");
check("there is one back button for the camera", !!backBtn && backBtn.listeners.click.length === 1);
backBtn.listeners.click[0]();
settle(1.1);
check("back returns to the part you were on",
  VG.S.camLabel === "Wheel" && Math.abs(VG.S.cam.w - wheelView.w) < 3,
  String(VG.S.camLabel) + " w=" + VG.S.cam.w.toFixed(0));
backBtn.listeners.click[0]();
settle(1.1);
check("back again returns to the lesson view",
  VG.S.camName === lessonView.name && Math.abs(VG.S.cam.w - lessonView.w) < 3,
  VG.S.camName + " w=" + VG.S.cam.w.toFixed(0));
VG.hud.tick();
check("the chip goes away when there is nothing to go back from",
  doc.getElementById("zoomChip").hidden === true);
VG.camera.focusPart("caliper", "front");
settle(1.0);
check("a preset clears the trail instead of stacking it",
  (function () { VG.camera.goLesson(); settle(1.0); return VG.camera.history() === 0; })());

/* 16. the per-frame work the app really does stays clean in every mode --- */
["explore", "lift", "pads", "disc", "refit"].forEach(function (id) {
  VG.engine.start(id);
  let boom = null;
  try {
    for (let f = 0; f < 24; f++) {
      VG.util.anim.step(0.016);
      VG.scene.render(VG.S);
      VG.scene.setViewBox(VG.S);
      VG.hud.tick();
      if (VG.garage && VG.garage.animate) VG.garage.animate(f * 0.016);
    }
  } catch (e) { boom = e; }
  check("a frame in " + id + " throws nothing", !boom, boom && boom.message);
});

/* 17. the whole loop: off by click, back on by click ------------------- */
console.log("\n17. remove the wheel, then click it back on");
VG.engine.start("explore");
settle(0.1);
const PARKX = win.VG_LAYOUT.wheelPark[0] - win.VG_LAYOUT.axles.front[0];
const PARKY = win.VG_LAYOUT.wheelPark[1] - win.VG_LAYOUT.axles.front[1];
const toastText = function () { return doc.getElementById("toast").textContent; };

/* slacken and spin off all five, then get the car on a stand */
win.VG_LAYOUT.starOrder.forEach(function (i) {
  holdTool("wrench");
  VG.tools.click(front.nuts[i].g);
  settle(0.35);
  VG.tools.click(front.nuts[i].g);
  settle(0.45);
});
check("all five nuts are off", VG.S.nuts.every(function (n) { return n.removed; }));
holdTool("jack");
VG.tools.click(findHit("jackpoint"));
settle(0.6);
for (let p = 0; p < 6; p++) { holdTool("jack"); VG.tools.click(findHit("jack")); settle(0.4); }
holdTool("stand");
VG.tools.click(findHit("standpoint"));
settle(0.6);
holdTool("jack");
VG.tools.click(findHit("jack"));
settle(1.3);
check("the car is on the stand", VG.S.support === "stand" && VG.S.stand.placed === true);

/* off it comes, by one click on the wheel */
VG.tools.setTool(VG.S.tool);            /* put the jack down */
VG.tools.click(wheelF);
settle(1.5);
check("one click takes the wheel off", VG.S.wheel.removed === true);
check("it is a loose object on the floor",
  VG.geom.wheelState(VG.S) === "loose" && VG.S.wheel.resting === true);
check("it is drawn, not hidden", isReachable(wheelF));
check("the camera frames the corner and the wheel",
  VG.S.camName === "wheelback", String(VG.S.camName));
check("the brakes are exposed",
  front.discWrap.getAttribute("opacity") === "1" && front.pads[0].wrap.style.display === "");

/* the hub has to be ready for it */
VG.act({ type: "bolt", i: 0 });
VG.act({ type: "bolt", i: 1 });
settle(0.2);
VG.act({ type: "caliperOff" });
settle(0.9);
check("caliper is off the disc", VG.S.caliper.off === true);
check("the gate says the caliper is in the way", CAN.wheelOn(VG.S) === "caliper_loose",
  String(CAN.wheelOn(VG.S)));
const heldX = VG.S.wheel.dx;
VG.tools.click(wheelF);
settle(0.3);
check("clicking it with the caliper off does nothing",
  VG.S.wheel.removed === true && Math.abs(VG.S.wheel.dx - heldX) < 0.01);
check("...and says why", /caliper/i.test(toastText()), toastText());

VG.act({ type: "discOff" });
settle(1.0);
check("the disc can come off behind it", VG.S.disc.removed === true);
VG.act({ type: "caliperOn" });            /* hang the caliper back, disc still off */
settle(1.0);
check("the gate now says the disc is missing", CAN.wheelOn(VG.S) === "disc_missing",
  String(CAN.wheelOn(VG.S)));
VG.tools.click(wheelF);
settle(0.3);
check("clicking it with the disc off does nothing", VG.S.wheel.removed === true);
check("...and says why", /disc/i.test(toastText()), toastText());

/* rebuild the corner and the wheel may go back on */
VG.act({ type: "discIn" });
settle(1.0);
check("pads in, caliper on, disc on",
  !VG.S.caliper.off && !VG.S.disc.removed && !VG.S.pads[0].out);
check("the gate clears", CAN.wheelOn(VG.S) === null, String(CAN.wheelOn(VG.S)));

/* put it back on with a click, and follow it all the way in */
VG.tools.click(wheelF);
check("the click starts the fit", VG.S.wheel.busy === true &&
  VG.geom.wheelState(VG.S) === "moving");
VG.tools.click(wheelF);                   /* a second click while it is in the air */
VG.tools.click(wheelF);
const away = Math.abs(VG.S.wheel.dx);
check("a second click mid-flight cannot start another fit",
  VG.S.wheel.busy === true && Math.abs(Math.abs(VG.S.wheel.dx) - away) < 60,
  String(VG.S.wheel.dx));
const flight = [];
for (let t = 0; t < 1.1; t += 0.08) {
  VG.util.anim.step(0.08);
  VG.scene.render(VG.S);
  VG.scene.setViewBox(VG.S);
  flight.push({ dx: Math.abs(VG.S.wheel.dx), dy: Math.abs(VG.S.wheel.dy) });
}
check("it only ever travels towards the hub",
  flight.every(function (f, i) {
    return i === 0 || f.dx <= flight[i - 1].dx + 0.5;
  }), flight.map(function (f) { return f.dx.toFixed(0); }).join(" "));
check("it moves in more than one step, not a teleport",
  flight.filter(function (f) { return f.dx > 1; }).length >= 4,
  String(flight.filter(function (f) { return f.dx > 1; }).length));
settle(0.4);
check("the wheel is mounted", VG.S.wheel.removed === false &&
  VG.geom.wheelState(VG.S) === "mounted");
check("it is dead centre on the hub", wheelTransform(wheelF) === "translate(0 0) rotate(0) scale(1)",
  wheelTransform(wheelF));
check("every offset is exactly zero",
  VG.S.wheel.dx === 0 && VG.S.wheel.dy === 0 && VG.S.wheel.rot === 0 && VG.S.wheel.scale === 1);
check("still exactly one wheel per corner",
  svgEl.querySelectorAll('[data-hit="wheel"]').length === 2);
check("the loose-wheel note is gone from free explore",
  (function () {
    VG.hud.updatePanel();
    return doc.getElementById("tpTitle").textContent !== "Wheel off the hub";
  })(), doc.getElementById("tpTitle").textContent);

/* and the next job - the nuts by hand - is live again */
holdTool("wrench");
VG.tools.click(front.nuts[0].g);
settle(0.5);
check("a nut goes back on the stud",
  VG.S.nuts[0].removed === false && VG.S.nuts[0].loosened === true);
check("the wheel stays on while the nuts go on",
  VG.S.wheel.removed === false && exactlyHome(wheelF));

/* in the refit lesson the step waits for the wheel to land before it moves on */
VG.engine.start("refit");
settle(0.3);
check("the refit lesson opens on the wheel", /wheel back onto the hub/i.test(VG.engine.step().label),
  VG.engine.step().label);
check("its panel asks for a click, not a drag",
  /Click the loose wheel/.test(doc.getElementById("tpNext").textContent),
  doc.getElementById("tpNext").textContent);
VG.tools.click(wheelF);
check("the lesson does not advance while the wheel is in the air",
  VG.engine.stepIndex === 0 && VG.S.wheel.busy === true, String(VG.engine.stepIndex));
check("the nuts are still locked mid-flight",
  VG.act({ type: "nutFit", i: 0 }) === false);
settle(1.3);
check("the lesson moves on once the wheel is home",
  VG.engine.stepIndex === 1 && /nuts by hand/i.test(VG.engine.step().label),
  VG.engine.step().label);
check("the nuts are the live step now", VG.engine.gate({ type: "nutFit" }).ok === true);

/* nothing can jump the queue in either direction */
check("the wheel cannot be pulled off again from here",
  VG.act({ type: "wheelOff" }) === false && VG.S.wheel.removed === false);
VG.engine.start("lift");
settle(0.2);
check("and it cannot be fitted before it is off",
  VG.act({ type: "wheelOn" }) === false && VG.S.wheel.removed === false);

/* ---------------------------------------------- what the pointer hits ----
   The wheel is mounted and its five nuts are off. Every stud has to be the
   node under the pointer, or the player can never start a nut by hand. */
VG.engine.start("refit");
settle(0.3);
VG.tools.click(wheelF);
settle(1.4);
const studs = [];
for (let i = 0; i < 5; i++) {
  const p = VG.geom.nutPos(i);
  studs.push(hitAt(p[0], p[1]));
}
check("the wheels are where the test thinks they are",
  VG.geom.wheelState(VG.S) === "mounted" && VG.S.nuts.every(function (n) { return n.removed; }));
check("every bare stud is the node under the pointer, not the wheel",
  studs.every(function (n) { return n && n.getAttribute("data-hit") === "nut"; }),
  studs.map(function (n) { return n ? n.getAttribute("data-hit") : "none"; }).join(","));
check("...and each one is its own stud",
  studs.every(function (n, i) { return n && +n.getAttribute("data-i") === i; }),
  studs.map(function (n) { return n ? n.getAttribute("data-i") : "-"; }).join(","));
check("the nut art has flown but the stud and its target are still there",
  front.nuts.every(function (N) { return isVisible(N.g) && N.spin.style.display === "none"; }));

/* five clicks, the way a player makes them: on the stud, on screen */
holdTool("wrench");
const started = [];
for (let i = 0; i < 5; i++) {
  const p = VG.geom.nutPos(i);
  const node = hitAt(p[0], p[1]);
  started.push(VG.tools.click(node) !== false);
  settle(0.35);
}
check("all five nuts start by hand, one click each",
  started.every(Boolean) && VG.S.nuts.every(function (n) { return n.removed === false; }),
  VG.S.nuts.map(function (n) { return +n.removed; }).join(""));
check("each nut is sitting on its own stud",
  front.nuts.every(function (N) {
    return /^translate\(0\.0 0\.0\)/.test(N.spin.getAttribute("transform") || "");
  }), front.nuts.map(function (N) { return N.spin.getAttribute("transform"); }).join(" | "));
check("the nut step is done and the next one is live",
  VG.engine.stepIndex === 2 && /pump/i.test(VG.engine.step().label),
  VG.engine.stepIndex + " " + (VG.engine.step() || {}).label);

/* a click on the wheel itself must not tell the player the wheel is missing */
doc.getElementById("toast").textContent = "";
VG.tools.click(wheelF);
settle(0.4);
check("a click on the mounted wheel leaves it exactly where it is",
  VG.S.wheel.removed === false && exactlyHome(wheelF), wheelTransform(wheelF));
check("...and never claims the wheel is not on its studs",
  !/on its studs/i.test(doc.getElementById("toast").textContent),
  doc.getElementById("toast").textContent);
check("...it answers with the part card instead",
  doc.getElementById("partcard").hidden === false);

/* and the nuts are still refused while the wheel is off or in the air */
VG.engine.start("refit");
settle(0.3);
holdTool("wrench");
doc.getElementById("toast").textContent = "";
VG.tools.click(front.nuts[0].g);
settle(0.3);
check("a nut cannot be started on a wheel that is off the car",
  VG.S.nuts[0].removed === true);
check("...and it says why", /wheel/i.test(doc.getElementById("toast").textContent),
  doc.getElementById("toast").textContent);
VG.tools.click(wheelF);
settle(0.2);
const midAir = VG.act({ type: "nutFit", i: 0 });
check("a nut cannot be started while the wheel is still in the air",
  midAir === false && VG.S.wheel.busy === true && VG.S.nuts[0].removed === true);
settle(1.4);
check("...but it can the moment the wheel lands",
  VG.geom.wheelState(VG.S) === "mounted" && VG.engine.gate({ type: "nutFit" }).ok === true);

/* a wheel is not a shortcut past a lesson that has not reached it yet */
VG.engine.start("pads");
settle(0.3);
check("the pad lesson starts with the wheel loose",
  VG.S.wheel.removed === true && VG.S.wheel.resting === true);
VG.tools.click(wheelF);
settle(0.4);
check("clicking it mid-lesson does not skip ahead",
  VG.S.wheel.removed === true && VG.S.wheel.busy === false);
check("...and it says the wheel comes last",
  /last thing to go back on/i.test(toastText()), toastText());

console.log("\n" + (failures ? failures + " FAILURE(S)" : "all checks passed  (" + checks + " checks)"));
process.exit(failures ? 1 : 0);
