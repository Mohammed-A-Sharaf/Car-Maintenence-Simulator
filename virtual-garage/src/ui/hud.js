/* Virtual Garage - the dashboard.
   Sidebar, header with level/XP, the contextual task panel on the stage, the
   toolbox drawer on the stage's right edge, and the learning path rail whose
   active card holds the step list and the full hint.

   The stage itself carries no debug read-outs: the only thing that follows the
   player around is the task panel, and only while there is a task. */
(function () {
  "use strict";
  var VG = window.VG, U = VG.util, L = window.VG_LAYOUT;

  var TOOLS = [
    { id: "wrench", name: "Lug wrench", sub: "wheel nuts", img: "assets/sprites/lug_wrench.png", key: "1" },
    { id: "ratchet", name: "Ratchet", sub: "caliper pins", img: "assets/sprites/ratchet_socket.png", key: "2" },
    { id: "jack", name: "Trolley jack", sub: "lift the car", img: "assets/sprites/jack_body.png", key: "3" },
    { id: "stand", name: "Axle stand", sub: "hold it up", img: "assets/sprites/stand.png", key: "4" }
  ];
  var NAV = [
    { id: "garage", label: "My Garage", ico: "home" },
    { id: "lessons", label: "Lessons", ico: "book" },
    { id: "toolbox", label: "Toolbox", ico: "tools" },
    { id: "achievements", label: "Achievements", ico: "cup" },
    { id: "settings", label: "Settings", ico: "gear", soon: true }
  ];

  var ICON = {
    home: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5 12 4l8 6.5"/><path d="M6.5 9.5V20h11V9.5"/><path d="M10 20v-5h4v5"/></svg>',
    book: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M9 3.5v17"/></svg>',
    tools: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 3.5a4.5 4.5 0 0 0-6 5.6L3.8 13.8a2 2 0 1 0 2.8 2.8l4.7-4.7a4.5 4.5 0 0 0 5.6-6l-2.6 2.6-2.3-2.3z"/></svg>',
    cup: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v4a4 4 0 0 1-8 0z"/><path d="M8 5.5H5.5A2.5 2.5 0 0 0 8 10"/><path d="M16 5.5h2.5A2.5 2.5 0 0 1 16 10"/><path d="M12 12v4"/><path d="M8.5 20h7l-1-4h-5z"/></svg>',
    hand: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 12V5.5a1.5 1.5 0 0 1 3 0V11"/><path d="M12 11V4.8a1.5 1.5 0 0 1 3 0V11"/><path d="M15 11.4V7.6a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-1.2a5 5 0 0 1-3.9-1.9L5 15.2a1.6 1.6 0 0 1 2.6-1.8L9 15"/></svg>',
    gear: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"/></svg>'
  };

  var E = {}, toastTimer = null, lastLesson = null, navCurrent = "garage";

  function h(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function svgIcon(name) {
    var n = h("span", "ico");
    n.innerHTML = ICON[name] || ICON.gear;
    return n;
  }

  /* ------------------------------------------------------------- boot --- */
  function init() {
    E.nav = document.getElementById("sideNav");
    E.title = document.getElementById("viewTitle");
    E.avatar = document.getElementById("avatar");
    E.whoName = document.getElementById("whoName");
    E.whoRank = document.getElementById("whoRank");
    E.lvlText = document.getElementById("lvlText");
    E.xpText = document.getElementById("xpText");
    E.xpFill = document.getElementById("xpFill");
    E.ringFill = document.getElementById("ringFill");
    E.ringText = document.getElementById("ringText");
    E.cards = document.getElementById("lessonCards");
    E.panel = document.getElementById("taskPanel");
    E.tpKicker = document.getElementById("tpKicker");
    E.tpPips = document.getElementById("tpPips");
    E.tpTitle = document.getElementById("tpTitle");
    E.tpHint = document.getElementById("tpHint");
    E.tpTool = document.getElementById("tpTool");
    E.tpToolIco = document.getElementById("tpToolIco");
    E.tpToolName = document.getElementById("tpToolName");
    E.tpNext = document.getElementById("tpNext");
    E.tpRestart = document.getElementById("tpRestart");
    E.toolTab = document.getElementById("toolTab");
    E.toolbox = document.getElementById("toolbox");
    E.toolList = document.getElementById("toolList");
    E.toolClose = document.getElementById("toolClose");
    E.toolCount = document.getElementById("toolCount");
    E.tbInHand = document.getElementById("tbInHand");
    E.tbDot = document.getElementById("tbDot");
    E.tbSub = document.getElementById("tbSub");
    E.toast = document.getElementById("toast");
    E.victory = document.getElementById("victory");
    E.sheet = document.getElementById("sheet");
    E.zoomChip = document.getElementById("zoomChip");
    E.zoomText = document.getElementById("zoomText");

    buildNav();
    buildToolbox();
    buildTaskPanel();
    bindCamera();

    window.addEventListener("keydown", function (e) {
      if (e.target && /input|textarea/i.test(e.target.tagName)) return;
      for (var i = 0; i < TOOLS.length; i++) {
        if (e.key === TOOLS[i].key) {
          VG.tools.setTool(TOOLS[i].id); syncTools(); e.preventDefault(); return;
        }
      }
      if (e.key === "t" || e.key === "T") { toggleDrawer(); e.preventDefault(); return; }
      if (e.key === "+" || e.key === "=") { zoomBy(1 / 1.4); e.preventDefault(); return; }
      if (e.key === "-" || e.key === "_") { zoomBy(1.4); e.preventDefault(); return; }
      if (e.key === "0") { VG.camera.goLesson(); e.preventDefault(); return; }
      if (e.key === "Escape") {
        closeDrawer();
        closeSheet();
        VG.tools.setTool(VG.S.tool);
        if (VG.partcard) VG.partcard.hide();
        hideVictory();
      }
      if (e.key === "h" || e.key === "H") { flashHint(); e.preventDefault(); }
    });

  }

  /* scroll the hint into view and flash it — the rail can be scrolled away */
  function flashHint() {
    var hint = document.getElementById("hint");
    if (!hint) return;
    if (hint.scrollIntoView) hint.scrollIntoView({ block: "nearest" });
    hint.classList.add("flash");
    setTimeout(function () { hint.classList.remove("flash"); }, 950);
  }

  /* ---------------------------------------------------------- sidebar --- */
  function buildNav() {
    E.nav.innerHTML = "";
    NAV.forEach(function (item) {
      var b = h("button", "navitem");
      b.setAttribute("data-nav", item.id);
      b.appendChild(svgIcon(item.ico));
      b.appendChild(h("span", "lbl", item.label));
      if (item.soon) b.appendChild(h("span", "pill", "soon"));
      b.addEventListener("click", function () { nav(item.id); });
      E.nav.appendChild(b);
    });
    syncNav();
  }

  function syncNav() {
    for (var i = 0; i < E.nav.children.length; i++) {
      var b = E.nav.children[i];
      b.setAttribute("aria-current", b.getAttribute("data-nav") === navCurrent ? "page" : "false");
    }
  }

  function nav(id) {
    closeSheet();
    if (id === "garage") {
      navCurrent = "garage";
      VG.engine.start("explore");
      syncNav();
      return;
    }
    if (id === "lessons") {
      navCurrent = VG.engine.lesson && VG.engine.lesson.id !== "explore" ? "lessons" : "garage";
      syncNav();
      E.cards.scrollTop = 0;
      E.cards.setAttribute("data-flash", "1");
      setTimeout(function () { E.cards.removeAttribute("data-flash"); }, 500);
      if (navCurrent === "garage") toast("Pick a lesson on the right to start one.");
      return;
    }
    if (id === "toolbox") { navCurrent = "toolbox"; syncNav(); openDrawer(); return; }
    if (id === "achievements") { navCurrent = "achievements"; syncNav(); openAchievements(); return; }
    toast("Settings is not built yet.", "warn");
  }

  /* ---------------------------------------------------------- toolbox --- */
  /* One list, one selection. The panel can be closed at any time: whatever is
     in your hand stays in your hand, and the tab shows that it does. */
  function buildToolbox() {
    if (!E.toolList) return;
    E.toolList.innerHTML = "";
    E.rows = {};
    TOOLS.forEach(function (t) {
      var li = document.createElement("li");
      var b = h("button", "tb-item");
      b.type = "button";
      b.setAttribute("data-tool", t.id);
      b.setAttribute("aria-pressed", "false");
      b.title = t.name + " (" + t.key + ") — " + t.sub;

      var ico = h("span", "tb-ico");
      var im = document.createElement("img");
      im.src = t.img;
      im.alt = "";
      ico.appendChild(im);

      var txt = h("span");
      txt.appendChild(h("span", "tb-name", t.name));
      txt.appendChild(h("span", "tb-sub2", t.sub));

      var right = h("span", "tb-flag");

      b.appendChild(ico);
      b.appendChild(txt);
      b.appendChild(right);
      b.addEventListener("click", function () {
        /* picking a tool also uses it: no separate confirm step */
        VG.tools.setTool(VG.S.tool === t.id ? null : t.id);
        syncTools();
      });
      li.appendChild(b);
      E.toolList.appendChild(li);
      E.rows[t.id] = b;
    });

    if (E.toolTab) {
      E.toolTab.addEventListener("click", function () {
        if (E.toolbox && E.toolbox.hidden) openDrawer(); else closeDrawer();
      });
    }
    if (E.toolClose) E.toolClose.addEventListener("click", closeDrawer);
    if (E.toolCount) E.toolCount.textContent = String(TOOLS.length);
    closeDrawer(true);
    syncTools();
  }

  function openDrawer() {
    if (!E.toolbox) return;
    if (VG.partcard) VG.partcard.hide();
    E.toolbox.hidden = false;
    if (E.toolTab) E.toolTab.setAttribute("aria-expanded", "true");
    VG.S.toolboxOpen = true;
    syncTools();
  }

  function closeDrawer(silent) {
    if (E.toolbox) E.toolbox.hidden = true;
    if (E.toolTab) E.toolTab.setAttribute("aria-expanded", "false");
    if (VG.S) VG.S.toolboxOpen = false;
    if (!silent) syncTools();
  }

  function toggleDrawer() {
    if (E.toolbox && E.toolbox.hidden) openDrawer(); else closeDrawer();
  }

  /* which tool the current step is asking for, if any */
  function wantedTool() {
    var st = VG.engine && VG.engine.step ? VG.engine.step() : null;
    return st && st.tool ? st.tool : null;
  }

  function syncTools() {
    if (!E.rows) return;
    var tool = VG.S ? VG.S.tool : null;
    var want = wantedTool();
    TOOLS.forEach(function (t) {
      var b = E.rows[t.id];
      if (!b) return;
      b.setAttribute("aria-pressed", tool === t.id ? "true" : "false");
      var state = "", flag = "";
      if (want) {
        if (t.id === want) { state = "now"; flag = tool === t.id ? "in hand" : "needed"; }
        else { state = "later"; flag = "not yet"; }
      } else {
        flag = tool === t.id ? "in hand" : "";
      }
      if (state) b.setAttribute("data-state", state);
      else b.removeAttribute("data-state");
      var f = b.lastChild;
      if (f && f.className === "tb-flag") f.textContent = flag;
    });
    if (E.toolTab) {
      E.toolTab.classList.toggle("has-tool", !!tool);
      E.toolTab.title = tool
        ? "Toolbox — " + (TOOLS.filter(function (t) { return t.id === tool; })[0] || {}).name + " in hand"
        : "Toolbox (T)";
    }
    if (E.tbInHand) {
      var cur = TOOLS.filter(function (t) { return t.id === tool; })[0];
      E.tbInHand.textContent = cur ? cur.name + " in hand" : "Nothing in hand";
    }
    if (E.tbDot) E.tbDot.classList.toggle("on", !!tool);
    if (E.panel) updatePanel();
  }

  /* green flash for the right tool, a shake for the wrong one */
  function toolFeedback(id, kind) {
    var b = E.rows && E.rows[id];
    if (!b) return;
    var cls = kind === "bad" ? "bad" : "good";
    b.classList.remove("good");
    b.classList.remove("bad");
    void b.offsetWidth;
    b.classList.add(cls);
    setTimeout(function () { b.classList.remove(cls); }, 560);
  }

  /* --------------------------------------------------- the task panel --- */
  /* What the player needs while a job is open, and nothing else: the task, one
     sentence of instruction, the tool in hand and how far along they are. It
     is driven entirely by the engine, so it cannot drift from the lesson. */

  function toolById(id) {
    for (var i = 0; i < TOOLS.length; i++) if (TOOLS[i].id === id) return TOOLS[i];
    return null;
  }

  /* first sentence only: the full text lives in the rail */
  function firstSentence(txt) {
    var t = String(txt || "").trim();
    var m = /^(.+?[.!?])(\s|$)/.exec(t);
    return m ? m[1] : t;
  }

  /* "what do I actually click?" — one line per kind of step */
  var NEXT = {
    nutLoosen: "Click a wheel nut and go round in the star order",
    nutRemove: "Click each nut to spin it off its stud",
    nutFit: "Click each stud to start a nut by hand",
    nutTorque: "Click each nut to torque it up",
    placeJack: "Click the jacking point under the sill",
    pump: "Click the jack to pump it up",
    placeStand: "Click the stand point behind the arch",
    releaseJack: "Click the jack to lower the car onto the stand",
    lowerJack: "Click the jack to set the car back down",
    standOut: "Drag the stand out from under the sill",
    wheelOff: "Drag the wheel off the hub, or click it",
    wheelOn: "Click the loose wheel to lift it back onto the hub",
    bolt: "Click a guide pin on the caliper",
    boltTighten: "Click each guide pin to nip it up",
    caliperOff: "Drag the caliper clear of the disc",
    caliperOn: "Click the caliper to hang it back on the disc",
    padOut: "Click a pad to pull it out",
    padsIn: "Click the caliper to fit the new pads",
    discOff: "Drag the disc off the hub",
    discIn: "Click the hub to fit the new disc",
    lowerCar: "Click the jack to lower the car",
    reassemble: "Put the corner back together"
  };

  function nextLine(st, tool) {
    if (!st) return "";
    if (st.tool && (!tool || tool.id !== st.tool)) {
      var want = toolById(st.tool);
      if (want) return "Take the " + want.name + " from the toolbox";
    }
    var a = (st.accept && st.accept[0]) || "";
    if (NEXT[a]) return NEXT[a];
    if (st.action && st.action.label) return st.action.label;
    return "Click the highlighted part";
  }

  function buildTaskPanel() {
    if (!E.panel) return;
    if (E.tpRestart) {
      E.tpRestart.addEventListener("click", function (ev) {
        var les = VG.engine.lesson;
        VG.engine.start(les ? les.id : "explore");
        if (ev && ev.shiftKey) {
          VG.progress.reset();
          chrome();
          renderPath();
          toast("Everything is back where it started, and all progress cleared.", "good");
        } else {
          toast("This corner is back where you started it.");
        }
        updatePanel();
      });
    }
    [E.tpTitle, E.tpHint].forEach(function (n) {
      if (!n) return;
      n.title = "Show the full hint in the Learning Path";
      n.addEventListener("click", flashHint);
    });
    updatePanel();
  }

  function panelOn() {
    if (!E.panel) return;
    E.panel.classList.add("is-on");
    E.panel.setAttribute("aria-hidden", "false");
  }
  function panelOff() {
    if (!E.panel) return;
    E.panel.classList.remove("is-on");
    E.panel.setAttribute("aria-hidden", "true");
  }

  function pips(total, index, live) {
    if (!E.tpPips) return;
    if ((E.tpPips.children || []).length !== total) {
      E.tpPips.innerHTML = "";
      for (var i = 0; i < total; i++) E.tpPips.appendChild(h("i"));
    }
    for (var k = 0; k < E.tpPips.children.length; k++) {
      var n = E.tpPips.children[k];
      n.className = k < index ? "done" : (k === index && live ? "now" : "");
    }
  }

  /* The chip always answers "what am I holding?". When the step wants
     something else the chip shows what is in hand, tints amber and the next
     line names the tool to go and get. */
  function toolChip(inHand, wanted) {
    if (!E.tpTool) return;
    var t = inHand || wanted;
    var wrong = !!inHand && !!wanted && wanted.id !== inHand.id;
    E.tpTool.classList.toggle("wanted", !!t && !inHand);
    E.tpTool.classList.toggle("mismatch", wrong);
    E.tpTool.classList.toggle("empty", !t);
    if (!t) {
      E.tpToolIco.innerHTML = ICON.hand;
      E.tpToolName.textContent = "No tool in hand";
      E.tpTool.title = "Pick a tool from the toolbox";
      return;
    }
    E.tpToolIco.innerHTML = '<img src="' + t.img + '" alt="">';
    E.tpToolName.textContent = t.name;
    E.tpTool.title = !inHand ? "This step needs the " + t.name
      : wrong ? "In hand: " + t.name + " — this step wants the " + wanted.name
        : "In hand: " + t.name + " · " + t.sub;
  }

  var lastStepKey = "";

  /* a short fade so a new step arrives rather than snaps */
  function swapIn(node, animate) {
    if (!node || !node.classList) return;
    if (!animate) return;
    node.classList.remove("swap");
    void node.offsetWidth;
    node.classList.add("swap");
  }

  function updatePanel() {
    var les = VG.engine && VG.engine.lesson, eng = VG.engine, S = VG.S;
    if (!E.panel || !les || !S) { panelOff(); return; }

    var tool = toolById(S.tool);
    var st = eng.step ? eng.step() : null;
    E.panel.classList.toggle("lite", les.id === "explore");

    if (les.id === "explore") {
      /* free explore: silent unless there is something worth saying */
      if (!tool && VG.geom.wheelState(S) === "mounted") {
        E.tpTitle.textContent = "";
        E.tpHint.textContent = "";
        E.tpNext.textContent = "";
        toolChip(null, null);
        panelOff();
        return;
      }
      E.tpKicker.textContent = "Free explore";
      if (VG.geom.wheelState(S) !== "mounted") {
        /* the one thing worth interrupting for: you have a wheel in your hands */
        E.tpTitle.textContent = "Wheel off the hub";
        E.tpHint.textContent = "The wheel is on the floor beside the car. Click it to lift it back onto the hub.";
        E.tpNext.textContent = "Click the loose wheel";
      } else {
        E.tpTitle.textContent = tool.name;
        E.tpHint.textContent = "Handy for " + tool.sub + ". Click a matching part on the car to use it.";
        E.tpNext.textContent = "";
      }
      pips(0, 0, false);
      toolChip(tool, null);
      panelOn();
      return;
    }

    var total = (les.steps && les.steps.length) || 0;
    var idx = Math.min(eng.stepIndex || 0, total);
    if (!st) {
      E.tpKicker.textContent = "Complete";
      E.tpTitle.textContent = "Corner finished";
      E.tpHint.textContent = "Everything is back where it belongs. The next job is waiting in the Learning Path.";
      E.tpNext.textContent = "All " + total + " steps done";
      pips(total, total, false);
      toolChip(tool, null);
      panelOn();
      return;
    }

    var kick = "Step " + (idx + 1) + " of " + total;
    /* a step that repeats: say how much of it is behind you, in plain words */
    if (st.need > 1 && (eng.progress || 0) > 0) {
      kick += " · " + Math.min(eng.progress, st.need) + " of " + st.need + " done";
    }
    E.tpKicker.textContent = kick;
    var key = les.id + ":" + idx + ":" + (st.label || "");
    var moved = key !== lastStepKey && lastStepKey !== "";
    lastStepKey = key;
    E.tpTitle.textContent = st.label;
    E.tpHint.textContent = firstSentence(st.hint);
    swapIn(E.tpTitle, moved);
    swapIn(E.tpHint, moved);
    E.tpNext.textContent = nextLine(st, tool);
    pips(total, idx, true);
    toolChip(tool, st.tool ? toolById(st.tool) : null);
    panelOn();
  }

  /* ------------------------------------------------------------ camera --- */
  function zoomBy(factor) {
    var S = VG.S;
    if (!S) return;
    VG.camera.zoomAt(S, factor, S.cam.cx, S.cam.cy, 0.26);
    tick();
  }

  function bindCamera() {
    var back = document.getElementById("zoomBack");
    /* one button, one job: undo the last camera move */
    if (back) back.addEventListener("click", function () {
      VG.camera.back();
      tick();
    });
  }

  /* called every frame: keeps the "what am I looking at" chip honest, and
     nothing more than that — no zoom factors, no numbers */
  var lastZoomText = "";
  function tick() {
    if (!E.zoomChip) return;
    var S = VG.S;
    var custom = S && S.camName === "custom";
    var txt = custom ? (S.camLabel || "Close-up") : "";
    if (txt === lastZoomText) return;
    lastZoomText = txt;
    if (txt) {
      E.zoomText.textContent = txt;
      E.zoomChip.hidden = false;
    } else {
      E.zoomChip.hidden = true;
    }
  }

  /* ----------------------------------------------------------- header --- */
  function chrome() {
    var les = VG.engine.lesson, lv = VG.progress.level();
    E.title.textContent = !les || les.id === "explore" ? "My Garage" : les.title;
    E.avatar.textContent = "GM";
    E.whoRank.textContent = lv.rank;
    E.lvlText.textContent = "Level " + lv.n;
    E.xpText.textContent = lv.top
      ? VG.progress.fmt(VG.progress.xp) + " XP · max"
      : VG.progress.fmt(lv.into) + " / " + VG.progress.fmt(lv.need) + " XP";
    E.xpFill.style.width = Math.round(lv.pct * 100) + "%";

    var done = VG.progress.doneCount(), total = VG.progress.total() || 1;
    E.ringText.textContent = done + "/" + total;
    E.ringFill.setAttribute("stroke-dashoffset", String(125.66 * (1 - done / total)));
    syncNav();
  }

  /* ------------------------------------------------------------- path --- */
  function lessonList() { return window.VG_LESSONS || []; }

  function pct(les) {
    if (les.id !== "explore" && VG.progress.isDone(les.id)) return 1;
    var eng = VG.engine;
    if (!eng.lesson || eng.lesson.id !== les.id || !les.steps.length) return 0;
    var st = eng.step(), part = 0;
    if (st && st.need) part = Math.min(1, eng.progress / st.need);
    return Math.min(1, (eng.stepIndex + part) / les.steps.length);
  }

  function cardState(les) {
    if (VG.engine.lesson && VG.engine.lesson.id === les.id) return "active";
    if (les.id !== "explore" && VG.progress.isDone(les.id)) return "done";
    return "todo";
  }

  function iconFor(state) {
    if (state === "done") {
      return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17.5 19 7"/></svg>';
    }
    if (state === "active") {
      return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M10.2 8.6 15.4 12l-5.2 3.4z" fill="currentColor" stroke="none"/></svg>';
  }

  function renderPath() {
    var cur = VG.engine.lesson ? VG.engine.lesson.id : null;
    E.cards.innerHTML = "";
    lessonList().forEach(function (les) {
      var state = cardState(les);
      var card = h("div", "lcard");
      card.setAttribute("data-state", state);
      card.setAttribute("data-lesson", les.id);

      var btn = h("button", "lcbtn");
      btn.setAttribute("data-open", les.id);
      var ic = h("span", "lcicon");
      ic.innerHTML = iconFor(state);
      btn.appendChild(ic);

      var main = h("span", "lcmain");
      main.appendChild(h("span", "lctitle", les.cardTitle || les.title));
      main.appendChild(h("span", "lcsub", les.cardSub || les.blurb));
      if (les.id !== "explore") {          /* free play has nothing to measure */
        var bar = h("span", "lcbar");
        var fill = h("i");
        fill.style.width = Math.round(pct(les) * 100) + "%";
        bar.appendChild(fill);
        main.appendChild(bar);
      }
      btn.appendChild(main);

      if (les.id === "explore") {
        btn.appendChild(h("span", "lcxp", "Free play"));
      } else {
        btn.appendChild(h("span", "lcxp", (state === "done" ? "✓ " : "+") + les.xp + " XP"));
      }
      btn.addEventListener("click", function () {
        if (VG.engine.lesson && VG.engine.lesson.id === les.id && les.id !== "explore") return;
        VG.engine.start(les.id);
      });
      card.appendChild(btn);

      if (state === "active" && les.id !== "explore") {
        var body = h("div", "lcbody");
        body.setAttribute("data-body", les.id);
        card.appendChild(body);
      }
      E.cards.appendChild(card);
    });
    renderBody();
  }

  /* the steps and the hint, inside whichever card is open */
  function renderBody() {
    var les = VG.engine.lesson, eng = VG.engine;
    if (!les) return;
    var body = null;
    for (var i = 0; i < E.cards.children.length; i++) {
      var c = E.cards.children[i];
      if (c.getAttribute("data-lesson") === les.id) {
        var found = null;
        for (var k = 0; k < c.children.length; k++) {
          if (c.children[k].className === "lcbody") found = c.children[k];
        }
        body = found;
      }
    }

    if (les.id === "explore") {
      if (!body) return;
      return;
    }

    if (body) {
      body.innerHTML = "";
      var steps = h("ol", "steps");
      steps.id = "stepList";
      les.steps.forEach(function (st, i) {
        var li = h("li");
        if (i < eng.stepIndex) li.className = "done";
        else if (i === eng.stepIndex && eng.active) li.className = "current";
        li.appendChild(h("span", "num", i < eng.stepIndex ? "✓" : String(i + 1)));
        var lab = h("span", "label", st.label);
        if (st.detail && i >= eng.stepIndex) lab.appendChild(h("small", null, st.detail));
        li.appendChild(lab);
        steps.appendChild(li);
      });
      body.appendChild(steps);

      var hint = h("div", "hint");
      hint.id = "hint";
      var cur = eng.step();
      if (cur) {
        var p = cur.need ? " (" + eng.progress + "/" + cur.need + ")" : "";
        hint.innerHTML = "<b>" + cur.label + p + ".</b> " + cur.hint;
        if (cur.action) {
          var cta = h("button", "cta", cur.action.label);
          if (cur.action.sub) cta.appendChild(h("small", null, cur.action.sub));
          cta.addEventListener("click", function () { VG.act({ type: cur.action.type }); });
          hint.appendChild(cta);
        }
      } else {
        hint.innerHTML = "<b>Done.</b> Every step is ticked — nice work.";
      }
      body.appendChild(hint);
    }

  }

  /* ----------------------------------------------------------- refresh --- */
  function refresh() {
    var les = VG.engine.lesson;
    if (!les) return;
    if (les.id !== lastLesson) {
      lastLesson = les.id;
      renderPath();
    } else {
      renderBody();
      for (var i = 0; i < E.cards.children.length; i++) {
        var c = E.cards.children[i];
        var id = c.getAttribute("data-lesson");
        var fill = null;
        (function walk(n) {                        /* HTMLCollection: no forEach */
          if (n.className === "lcbar" && n.children[0]) fill = n.children[0];
          for (var q = 0; q < n.children.length; q++) walk(n.children[q]);
        })(c);
        if (fill) {
          var l2 = null;
          lessonList().forEach(function (x) { if (x.id === id) l2 = x; });
          if (l2) fill.style.width = Math.round(pct(l2) * 100) + "%";
        }
      }
    }
    navCurrent = les.id === "explore" ? "garage" : "lessons";
    chrome();
    syncTools();
    updatePanel();
  }

  /* ------------------------------------------------------------ toast --- */
  function toast(msg, kind) {
    if (!E.toast) return;
    E.toast.textContent = msg;
    E.toast.className = "toast show" + (kind ? " " + kind : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { E.toast.className = "toast" + (kind ? " " + kind : ""); }, 3200);
  }

  /* deterministic confetti: no Math.random, so the smoke test sees it too */
  var CONF_COLS = ["#4d8bf8", "#38d39f", "#ffb64d", "#ff6b5e", "#7db0ff", "#c792ea"];
  function confetti(host) {
    for (var i = 0; i < 26; i++) {
      var c = h("span", "confetti");
      c.style.left = ((i * 37 + 11) % 100) + "%";
      c.style.background = CONF_COLS[i % CONF_COLS.length];
      c.style.animationDelay = (i * 0.09) + "s";
      c.style.animationDuration = (2.1 + (i % 5) * 0.22) + "s";
      host.appendChild(c);
    }
  }

  /* ---------------------------------------------------------- victory --- */
  function markDone(id) {
    var gain = VG.progress.complete(id);
    chrome();
    renderPath();
    return gain;
  }

  function hideVictory() { if (E.victory) E.victory.hidden = true; }

  function victory(les) {
    if (!E.victory) return;
    var gain = markDone(les.id);
    var done = les.done || {};
    E.victory.innerHTML = "";
    confetti(E.victory);
    E.victory.appendChild(h("h2", null, done.title || "Lesson complete"));
    var xpEl = h("p", "xpget", gain > 0 ? "+0 XP earned" : "already counted");
    E.victory.appendChild(xpEl);
    if (gain > 0) {
      var d = { v: 0 };
      U.anim.tween(d, { v: gain }, 0.9, "outCubic",
        function () { xpEl.textContent = "+" + gain + " XP earned"; },
        function (o) { xpEl.textContent = "+" + Math.round(o.v) + " XP earned"; });
    }
    E.victory.appendChild(h("p", null, done.text || ""));
    if (done.points && done.points.length) {
      var ul = h("ul");
      done.points.forEach(function (t) { ul.appendChild(h("li", null, t)); });
      E.victory.appendChild(ul);
    }
    var row = h("div", "row");
    var next = VG.engine.nextLesson();
    if (next) {
      var b1 = h("button", null, "Next: " + next.title);
      b1.addEventListener("click", function () { hideVictory(); VG.engine.start(next.id); });
      row.appendChild(b1);
    }
    var b2 = h("button", "ghost", "Back to the garage");
    b2.addEventListener("click", function () { hideVictory(); VG.engine.start("explore"); });
    row.appendChild(b2);
    E.victory.appendChild(row);
    E.victory.hidden = false;
  }

  /* ----------------------------------------------------------- sheets --- */
  function closeSheet() { if (E.sheet) E.sheet.hidden = true; }

  function sheet(title, lead, rows) {
    E.sheet.innerHTML = "";
    var inner = h("div", "sheetInner");
    inner.appendChild(h("h2", null, title));
    inner.appendChild(h("p", "lead", lead));
    rows.forEach(function (r) {
      var b = h("button", "sheetRow");
      if (r.img) {
        var im = document.createElement("img");
        im.src = r.img; im.alt = "";
        b.appendChild(im);
      }
      var txt = h("span");
      txt.appendChild(h("span", "st", r.title));
      txt.appendChild(h("span", "ss", r.sub));
      b.appendChild(txt);
      if (r.tag) b.appendChild(h("span", "tag", r.tag));
      if (r.onClick) b.addEventListener("click", r.onClick);
      inner.appendChild(b);
    });
    var close = h("button", "sheetClose", "Close");
    close.addEventListener("click", closeSheet);
    inner.appendChild(close);
    E.sheet.appendChild(inner);
    E.sheet.hidden = false;
  }

  function openAchievements() {
    var list = VG.progress.achievements();
    var got = list.filter(function (a) { return a.got; }).length;
    sheet("Achievements", got + " of " + list.length + " earned.",
      list.map(function (a) {
        return { title: a.name, sub: a.hint, tag: a.got ? "earned" : null };
      }));
  }

  VG.hud = {
    init: init, refresh: refresh, toast: toast, victory: victory,
    markDone: markDone, closeSheet: closeSheet, updatePanel: updatePanel,
    tick: tick, zoomBy: zoomBy,
    flashHint: flashHint,
    tools: buildToolbox, renderPath: renderPath,
    toolFeedback: toolFeedback, syncTools: syncTools,
    openDrawer: openDrawer, closeDrawer: closeDrawer, toggleDrawer: toggleDrawer,
    wantedTool: wantedTool
  };
})();
