/* Virtual Garage - sprite instances.
   Every sprite is an <image> whose local origin is the part's anchor point
   (wheel centre, saddle top, foot centre...). place() therefore works in world
   units: place(g, 605, 962) puts the wheel centre on the front axle. */
(function () {
  "use strict";
  var VG = window.VG, U = VG.util, el = U.el;
  var SPR = window.VG_SPRITES;

  function make(key) {
    var info = SPR[key];
    if (!info) throw new Error("unknown sprite: " + key);
    var g = el("g", { "class": "sp sp-" + key });
    g.appendChild(el("image", {
      href: info.file, x: -info.ax, y: -info.ay,
      width: info.w, height: info.h, "class": "art", draggable: "false"
    }));
    g.__info = info;
    return g;
  }

  /* x,y = world position of the anchor; k multiplies the sprite's own scale */
  function place(g, x, y, k, rot) {
    var sc = g.__info.s * (k == null ? 1 : k);
    g.__sc = sc;
    g.setAttribute("transform",
      "translate(" + x + " " + y + ") scale(" + sc + ")" +
      (rot ? " rotate(" + rot + ")" : ""));
    return g;
  }

  /* Same, but the rotation happens about a point given in sprite pixels -
     used for the jack arm turning on its pivot. */
  function placeRot(g, x, y, k, relativeDeg, px, py) {
    var sc = g.__info.s * (k == null ? 1 : k);
    g.__sc = sc;
    g.setAttribute("transform",
      "translate(" + x + " " + y + ") scale(" + sc + ") rotate(" + relativeDeg + " " + px + " " + py + ")");
    return g;
  }

  /* Convert a coordinate in the original source image into sprite-local
     pixels relative to the anchor (handy for hotspots inside a part). */
  function nativeToLocal(info, nx, ny) {
    return [(nx - info.ox) * info.k - info.ax, (ny - info.oy) * info.k - info.ay];
  }

  /* Native source-image pixel -> sprite pixel (relative to the image corner). */
  function nativeToSprite(info, nx, ny) {
    return [(nx - info.ox) * info.k, (ny - info.oy) * info.k];
  }

  function worldSize(key) {
    var i = SPR[key];
    return { w: i.w * i.s, h: i.h * i.s, s: i.s };
  }

  VG.sprite = {
    make: make, place: place, placeRot: placeRot,
    nativeToLocal: nativeToLocal, nativeToSprite: nativeToSprite,
    worldSize: worldSize, all: SPR
  };
})();
