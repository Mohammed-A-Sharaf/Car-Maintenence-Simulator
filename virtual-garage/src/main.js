/* Virtual Garage - boot. */
(function () {
  "use strict";
  var VG = window.VG;

  var stage = null, last = 0;

  function frame(t) {
    var dt = last ? Math.min(0.06, (t - last) / 1000) : 0.016;
    last = t;
    VG.util.anim.step(dt);
    easeDrawer(dt);
    VG.scene.render(VG.S);
    VG.scene.setViewBox(VG.S);
    if (VG.hud.tick) VG.hud.tick();
    if (VG.garage && VG.garage.animate) VG.garage.animate(t / 1000);
    requestAnimationFrame(frame);
  }

  /* the toolbox drawer nudges the view left; do it over a few frames so the
     car slides rather than jumps */
  function easeDrawer(dt) {
    var S = VG.S;
    if (!S) return;
    var want = S.toolboxOpen ? 264 : 0;
    var now = S.drawerPx || 0;
    if (Math.abs(want - now) < 0.6) { S.drawerPx = want; return; }
    S.drawerPx = now + (want - now) * Math.min(1, dt * 9);
  }

  function boot() {
    stage = document.getElementById("stage");
    VG.scene.init(stage);
    VG.S = VG.newState();
    VG.camera.fit(stage, VG.S);

    VG.hud.init();
    VG.partcard.init();
    VG.scene.render(VG.S);

    /* the interactions layer needs the scene graph, so it starts last */
    VG.tools.init();
    VG.engine.start("explore");

    window.addEventListener("resize", function () {
      VG.camera.fit(stage, VG.S);
    });

    requestAnimationFrame(frame);

    /* a quiet word about the controls on first load — and a welcome back
       for anyone who has already earned something */
    setTimeout(function () {
      var done = VG.progress.doneCount();
      if (done > 0) {
        VG.hud.toast("Welcome back — " + done + " of " + VG.progress.total() +
          " lessons done, " + VG.progress.fmt(VG.progress.xp) + " XP. Carry on in the Learning Path.");
      } else {
        VG.hud.toast("Lessons are in the Learning Path on the right — start with “Lift & wheel off”. " +
          "Hover any part for its name, the Toolbox is on the right edge (T, or keys 1–4), H flashes the hint.");
      }
    }, 700);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
