/* Virtual Garage - the part information card. */
(function () {
  "use strict";
  var VG = window.VG, card = null, current = null;

  function init() {
    card = document.getElementById("partcard");
    card.addEventListener("click", function (e) {
      if (e.target.classList.contains("close")) hide();
    });
  }

  function show(key) {
    var info = window.VG_PARTS[key];
    if (!info || !card) return;
    /* the drawer owns the right-hand corner; reading a card puts it away */
    if (VG.hud && VG.hud.closeDrawer) VG.hud.closeDrawer();
    current = key;
    card.innerHTML = "";
    var close = document.createElement("button");
    close.className = "close";
    close.textContent = "×";
    close.setAttribute("aria-label", "Close");
    var head = document.createElement("div");
    head.className = "pc-head";
    if (info.img) {
      var im = document.createElement("img");
      im.src = info.img;
      im.alt = "";
      head.appendChild(im);
    }
    var titles = document.createElement("div");
    var h3 = document.createElement("h3");
    h3.textContent = info.name;
    var role = document.createElement("div");
    role.className = "role";
    role.textContent = info.role;
    titles.appendChild(h3);
    titles.appendChild(role);
    head.appendChild(titles);
    var p = document.createElement("p");
    p.textContent = info.text;
    var fact = document.createElement("div");
    fact.className = "fact";
    fact.textContent = info.fact;
    card.appendChild(close);
    card.appendChild(head);
    card.appendChild(p);
    card.appendChild(fact);
    card.hidden = false;
  }

  function hide() {
    if (!card) return;
    card.hidden = true;
    current = null;
  }

  VG.partcard = { init: init, show: show, hide: hide, get key() { return current; } };
})();
