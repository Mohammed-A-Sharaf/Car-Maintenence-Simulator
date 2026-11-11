/* Virtual Garage - lesson engine.
   Holds the current lesson and step, decides whether an action is in order,
   and moves the lesson on. The interactions layer never decides this itself. */
(function () {
  "use strict";
  var VG = window.VG, L = window.VG_LAYOUT, U = VG.util;

  var E = {
    lesson: null,
    stepIndex: 0,
    progress: 0,
    active: false,

    step: function () {
      if (!this.lesson) return null;
      return this.lesson.steps[this.stepIndex] || null;
    },

    start: function (id) {
      var list = window.VG_LESSONS, lesson = null;
      for (var i = 0; i < list.length; i++) if (list[i].id === id) lesson = list[i];
      if (!lesson) return;

      var aspect = VG.S ? VG.S.aspect : 0.5625;
      U.anim.clear();
      if (VG.tools && VG.tools.closeHold) VG.tools.closeHold();

      var S = VG.newState();
      S.aspect = aspect;
      S.lessonId = lesson.id;
      if (lesson.setup) lesson.setup(S);
      VG.S = S;

      this.lesson = lesson;
      this.stepIndex = 0;
      this.progress = 0;
      this.active = lesson.steps.length > 0;

      /* stat + possible achievement toast for starting a real lesson */
      if (lesson.steps.length && VG.progress && VG.progress.bump) {
        VG.progress.bump("opened", 1).forEach(function (nm) {
          if (VG.hud && VG.hud.toast) VG.hud.toast("Achievement earned — " + nm, "good");
        });
      }

      if (VG.tools) VG.tools.updateHold();
      VG.camera.go(lesson.cam || "overview", false);
      if (this.active) this.enter();
      else { S.hot = []; S.badges = null; S.tool = null; }

      if (VG.partcard) VG.partcard.hide();
      if (VG.hud) VG.hud.refresh();
    },

    enter: function () {
      var st = this.step(), S = VG.S;
      if (!st) return;
      this.progress = 0;
      S.hot = st.hot || [];
      S.badges = null;
      if (st.tool !== undefined) S.tool = st.tool;
      if (st.cam) VG.camera.go(st.cam);
      this.badges();
      if (VG.tools) VG.tools.updateHold();
      if (st.onEnter) st.onEnter(S);
      if (VG.hud) VG.hud.refresh();
    },

    /* the little 1..5 numbers on the nuts, in star order */
    badges: function () {
      var st = this.step(), S = VG.S;
      if (!st || st.badges !== "star") { S.badges = null; return; }
      var arr = ["", "", "", "", ""];
      for (var k = this.progress; k < 5; k++) arr[L.starOrder[k]] = String(k + 1);
      S.badges = arr;
    },

    gate: function (a) {
      if (!this.active) return { ok: true };
      var st = this.step();
      if (!st) return { ok: true };
      if (st.accept.indexOf(a.type) < 0) return { ok: false, msg: st.block || st.hint };
      if (st.check) {
        var r = st.check(a, this.progress);
        if (r !== true) return { ok: false, msg: r };
      }
      return { ok: true };
    },

    after: function (a) {
      if (!this.active) return;
      var st = this.step();
      if (!st) return;
      this.progress++;
      var need = st.need || 1;
      if (this.progress < need) {
        this.badges();
        if (VG.hud) VG.hud.refresh();
        return;
      }
      if (st.onDone) st.onDone(VG.S);
      this.stepIndex++;
      this.progress = 0;
      if (this.stepIndex >= this.lesson.steps.length) this.finish();
      else this.enter();
    },

    finish: function () {
      var S = VG.S;
      this.active = false;
      S.hot = [];
      S.badges = null;
      S.tool = null;
      S.finished = true;
      if (VG.tools) VG.tools.updateHold();
      if (VG.hud) {
        VG.hud.refresh();
        VG.hud.victory(this.lesson);
        if (VG.hud.markDone) VG.hud.markDone(this.lesson.id);
      }
    },

    /* helpers used by the HUD */
    current: function () { return this.step(); },
    nextLesson: function () {
      var list = window.VG_LESSONS, seen = false;
      for (var i = 0; i < list.length; i++) {
        if (seen && list[i].steps.length) return list[i];
        if (this.lesson && list[i].id === this.lesson.id) seen = true;
      }
      return null;
    }
  };

  VG.engine = E;
})();
