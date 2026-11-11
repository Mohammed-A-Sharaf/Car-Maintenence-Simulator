/* Virtual Garage - progress, XP and rank.
   Everything the header and the learning-path rail show about the user comes
   from here, and it survives a reload in localStorage. */
(function () {
  "use strict";
  var VG = window.VG;

  var KEY = "vg:progress";
  var LEVELS = [0, 400, 1000, 1800, 2800];      /* XP at which each level starts */
  var RANKS = ["Apprentice Mechanic", "Junior Technician", "Mechanic",
               "Master Technician", "Shop Foreman"];

  function load() {
    try {
      var raw = JSON.parse(window.localStorage.getItem(KEY) || "null");
      if (raw && typeof raw === "object") {
        raw.done = raw.done || {};
        raw.xp = raw.xp | 0;
        raw.stats = raw.stats || {};              /* older saves predate stats */
        return raw;
      }
    } catch (e) { /* private mode, or no storage at all */ }
    return { done: {}, xp: 0, stats: {} };
  }

  function save(p) {
    try { window.localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {}
  }

  var P = load();

  function lessons() { return (window.VG_LESSONS || []).filter(function (l) { return l.steps.length; }); }

  function doneCount() {
    return lessons().filter(function (l) { return !!P.done[l.id]; }).length;
  }

  function level() {
    var i = 0;
    for (var k = 0; k < LEVELS.length; k++) if (P.xp >= LEVELS[k]) i = k;
    var start = LEVELS[i], next = i + 1 < LEVELS.length ? LEVELS[i + 1] : null;
    return {
      n: i + 1,
      rank: RANKS[Math.min(i, RANKS.length - 1)],
      into: P.xp - start,
      need: next == null ? null : next - start,
      pct: next == null ? 1 : (P.xp - start) / (next - start),
      top: next == null
    };
  }

  function complete(id) {
    var les = null;
    lessons().forEach(function (l) { if (l.id === id) les = l; });
    if (!les) return 0;
    if (P.done[id]) return 0;                     /* XP is paid once */
    P.done[id] = 1;
    P.xp += les.xp || 0;
    save(P);
    return les.xp || 0;
  }

  function reset() {
    P = { done: {}, xp: 0, stats: {} };
    save(P);
  }

  /* Everything the player has ever done, counted. Achievements are derived
     from these numbers, so they can never disagree with the save. */
  function bump(key, n) {
    P.stats = P.stats || {};
    var before = {};
    compute().forEach(function (a) { if (a.got) before[a.name] = 1; });
    P.stats[key] = (P.stats[key] || 0) + (n || 1);
    save(P);
    var fresh = [];
    compute().forEach(function (a) { if (a.got && !before[a.name]) fresh.push(a.name); });
    return fresh;                               /* names unlocked by this bump */
  }

  /* achievements are derived, never stored: each one is a fact about the
     save (stats + done + xp), so the sheet can never lie */
  function compute() {
    var st = P.stats || {}, list = lessons(), out = [];
    function add(name, hint, got) { out.push({ name: name, hint: hint, got: !!got }); }
    add("First contact", "Start any lesson", (st.opened || 0) >= 1);
    add("Grease monkey", "Slacken five wheel nuts", (st.nutLoosen || 0) >= 5);
    add("Airborne", "Lift the car on the jack", (st.lift || 0) >= 1);
    add("Standing by", "Set the axle stand under the sill", (st.stand || 0) >= 1);
    add("Five out", "Spin all five nuts off", (st.nutRemove || 0) >= 5);
    add("Off it comes", "Pull the wheel off", (st.wheel || 0) >= 1);
    add("Stripped bare", "Lift the caliper off the disc", (st.caliper || 0) >= 1);
    add("Fresh pads", "Swap both brake pads", (st.pads || 0) >= 1);
    add("New disc day", "Take the disc off", (st.disc || 0) >= 1);
    add("Torque wrench", "Torque all five nuts on the ground", (st.torque || 0) >= 5);
    list.forEach(function (l) {
      out.push({ name: l.done && l.done.title ? l.done.title : l.title, hint: "+" + l.xp + " XP", got: !!P.done[l.id] });
    });
    add("All four corners", "Finish every lesson", doneCount() === list.length && list.length > 0);
    add("Level 3", "Reach 1,000 XP", P.xp >= 1000);
    add("Shop foreman", "Reach Level 5", level().n >= 5);
    return out;
  }

  function achievements() { return compute(); }

  VG.progress = {
    get xp() { return P.xp; },
    get done() { return P.done; },
    get stats() { return P.stats; },
    bump: bump,
    level: level, complete: complete, reset: reset,
    doneCount: doneCount, total: function () { return lessons().length; },
    achievements: achievements,
    isDone: function (id) { return !!P.done[id]; },
    fmt: function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  };
})();
