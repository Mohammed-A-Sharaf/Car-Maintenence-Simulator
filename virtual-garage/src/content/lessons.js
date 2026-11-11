/* Virtual Garage - the lessons.
   A lesson is a list of steps. A step says which actions it accepts (and how
   many), what to highlight, where the camera should look, which tool to put in
   the user's hand, and what to say when something else is tried. */
(function () {
  "use strict";
  var VG = window.VG, L = window.VG_LAYOUT, G = VG.geom;

  /* Put the front corner on a stand with the wheel off, no questions asked. */
  function alreadyOnStands(S) {
    var saddle = G.saddleWorld(0);
    S.jack.placed = true;
    S.jack.x = G.jackOrigin[0];
    S.jack.arm = 0;
    S.jack.pumps = L.jackPumps;
    S.support = "stand";
    S.pitchHold = G.solvePitch(saddle[0], saddle[1]);
    S.pitch = S.pitchHold;
    S.stand.placed = true;
    S.stand.slide = 1;
    S.stand.h = G.standHeight(S.pitchHold);
    S.nuts.forEach(function (n) {
      n.loosened = true; n.removed = true; n.fly = 1;
      n.flyDx = 0; n.flyDy = 0; n.spin = 26;
    });
    S.wheel.removed = true;
    S.wheel.dx = L.wheelPark[0] - L.axles.front[0];
    S.wheel.dy = L.wheelPark[1] - L.axles.front[1];
    /* the wheel is off and lying beside the car: a real object you can see and
       click, not a hidden one */
    S.wheel.resting = true;
    S.wheel.busy = false;
  }

  /* Same corner, but with the jack sitting under the car doing nothing:
     the stand is carrying it. This is where the refit lesson starts. */
  function refitReady(S) {
    alreadyOnStands(S);
    S.jack.arm = L.jackArmLow;
    S.jack.pumps = 0;
    S.wheel.resting = true;
    S.wheel.scale = 1;
  }

  function brakesOpen(S) {
    alreadyOnStands(S);
    S.caliper.bolts = [true, true];
    S.caliper.off = true;
    S.caliper.dx = L.caliperPark[0];
    S.caliper.dy = L.caliperPark[1];
    S.caliper.rot = L.caliperPark[2];
    S.pads.forEach(function (p, i) {
      p.out = true;
      p.rot = 90;
      p.dx = L.padsPark[0] + i * 78 - L.padPlace[i][0];
      p.dy = L.padsPark[1] - L.padPlace[i][1];
    });
  }

  window.VG_LESSONS = [
    {
      id: "explore",
      title: "Free explore",
      tabName: "Explore",
      blurb: "Pick a tool, or click any part to find out what it does.",
      cam: "overview",
      steps: []
    },
    {
      id: "lift",
      title: "Lift safely & remove a wheel",
      xp: 250,
      cardSub: "Jack it, support it, take the wheel off.",
      cardTitle: "Lift & wheel off",
      tabName: "1 · Lift a car",
      blurb: "Slacken the nuts, jack the car up, support it, then take the wheel off.",
      cam: "overview",
      steps: [
        {
          label: "Slacken the five wheel nuts",
          detail: "lug wrench · star pattern",
          hint: "With the wheel still on the ground, slacken each nut a turn. Work in a star: the numbers show the order.",
          accept: ["nutLoosen"], need: 5,
          hot: ["nut"], cam: "front", tool: "wrench", badges: "star",
          block: "The nuts come first, while the wheel is still on the ground.",
          check: function (a, progress) {
            if (L.starOrder[progress] !== a.i) return "Star pattern: start at 1, then jump across the hub. Every nut is numbered.";
            return true;
          }
        },
        {
          label: "Slide the jack under the nose",
          detail: "trolley jack · jacking point",
          hint: "Pick up the jack and click the highlighted jacking point under the front sill. The saddle has to sit under reinforced metal.",
          accept: ["placeJack"],
          hot: ["jackpoint"], cam: "nose", tool: "jack",
          block: "Jack the car after the nuts are slack, not before."
        },
        {
          label: "Pump the handle",
          detail: "six pumps",
          hint: "Click the jack to pump. You will feel it take the weight just before the nose starts to rise.",
          accept: ["pump"], need: 6,
          hot: ["jack"], cam: "nose", tool: "jack",
          block: "The jack is the next tool you need."
        },
        {
          label: "Set the axle stand",
          detail: "under the sill",
          hint: "Never work under a car held only by a jack. Pick the stand and click the support point behind the front arch.",
          accept: ["placeStand"],
          hot: ["standpoint"], cam: "nose", tool: "stand",
          block: "Take the weight on a stand before you touch the wheel."
        },
        {
          label: "Lower the jack",
          detail: "leave the car on the stand",
          hint: "Click the jack again to open the release valve. The arm drops and the stand takes the load — the car must not move.",
          accept: ["releaseJack"],
          hot: ["jack"], cam: "nose", tool: "jack",
          block: "Release the jack once the stand is under the sill."
        },
        {
          label: "Take the five nuts off",
          detail: "any order now",
          hint: "Now the nuts come off completely. Any order will do; keep them together, they are easy to lose.",
          accept: ["nutRemove"], need: 5,
          hot: ["nut"], cam: "front", tool: "wrench",
          block: "Spin the nuts off before you pull the wheel."
        },
        {
          label: "Pull the wheel off the hub",
          detail: "drag or click it",
          hint: "Drag the wheel off the hub, or just click it, then look at what is underneath. It comes to rest beside the car, ready to go back on.",
          accept: ["wheelOff"],
          hot: ["wheel"], cam: "front", tool: null,
          block: "Get the car supported and the nuts off first."
        }
      ],
      done: {
        title: "Wheel off, car safe",
        text: "The car is on a stand, the jack has been released and the hub, disc and caliper are exposed. That is the whole routine — nuts first, jack, stand, then the wheel.",
        points: [
          "Slacken the nuts with the tyre still on the ground.",
          "Jack to lift, stand to support. Never work under a jack alone.",
          "Only pull the wheel once all five nuts are off."
        ]
      }
    },
    {
      id: "pads",
      title: "Replace the brake pads",
      xp: 250,
      cardSub: "Undo the pins and swap the front pads.",
      cardTitle: "Brake pads",
      tabName: "2 · Brake pads",
      blurb: "The car is already up on a stand with the wheel off. Change the front pads.",
      cam: "brakes",
      setup: function (S) { alreadyOnStands(S); },
      steps: [
        {
          label: "Undo the two guide pins",
          detail: "ratchet · caliper pins",
          hint: "Pick the ratchet and click each guide pin on the caliper. Both have to come out before the caliper will lift.",
          accept: ["bolt"], need: 2,
          hot: ["bolt"], cam: "brakes", tool: "ratchet",
          block: "The caliper is held on by two guide pins."
        },
        {
          label: "Lift the caliper off the disc",
          detail: "drag it clear",
          hint: "Drag the caliper up and away, or just click it. Let it hang clear of the disc — never let it dangle by the brake hose.",
          accept: ["caliperOff"],
          hot: ["caliper"], cam: "brakes", tool: null,
          block: "Both guide pins first."
        },
        {
          label: "Pull out the old pads",
          detail: "two pads",
          hint: "Click each pad to pull it out of the bracket. Note which way round the friction material faces.",
          accept: ["padOut"], need: 2,
          hot: ["pad"], cam: "brakes", tool: null,
          block: "Get the caliper off the disc first."
        },
        {
          label: "Fit the new pads",
          detail: "parts tray",
          hint: "New pads go in the same way round as the old ones — friction material towards the disc.",
          accept: ["padsIn"],
          hot: [], cam: "brakes", tool: null,
          action: { label: "Fit new pads", sub: "from the parts tray", type: "padsIn" },
          block: "You still have the old pads in the bracket."
        },
        {
          label: "Refit the caliper",
          detail: "over the new pads",
          hint: "Click the caliper to swing it back over the disc. The piston may need pushing back before it will slide on.",
          accept: ["caliperOn"],
          hot: ["caliper"], cam: "brakes", tool: null,
          block: "Both pads have to be in place."
        },
        {
          label: "Tighten the guide pins",
          detail: "ratchet",
          hint: "Ratchet both guide pins back up. This is what stops the caliper rattling and seizing.",
          accept: ["boltTighten"], need: 2,
          hot: ["bolt"], cam: "brakes", tool: "ratchet",
          block: "The caliper has to be sitting on the disc first."
        }
      ],
      done: {
        title: "Pads done",
        text: "New pads are in, the caliper is back on the disc and both guide pins are tight. All that is left is the wheel and a few presses of the brake pedal to set the pads.",
        points: [
          "Both guide pins out before the caliper moves.",
          "Friction material faces the disc on both sides.",
          "Press the brake pedal before you drive — the first press has a long travel."
        ]
      }
    },
    {
      id: "disc",
      title: "Replace the brake disc",
      xp: 200,
      cardSub: "Caliper off, disc off, new one on.",
      cardTitle: "Brake disc",
      tabName: "3 · Brake disc",
      blurb: "Caliper is off and the worn pads are out. Change the front disc.",
      cam: "brakes",
      setup: function (S) { brakesOpen(S); },
      steps: [
        {
          label: "Pull the disc off the hub",
          detail: "drag it clear",
          hint: "Drag the disc off the hub. If it will not move, the small retaining screw on the hub face may still be in.",
          accept: ["discOff"],
          hot: ["disc"], cam: "brakes", tool: null,
          block: "The caliper has to be off the disc before it can come away."
        },
        {
          label: "Fit the new disc",
          detail: "parts tray",
          hint: "Slide the new disc onto the hub. Clean the mating faces first — grit between disc and hub shows up as run-out.",
          accept: ["discIn"],
          hot: [], cam: "brakes", tool: null,
          action: { label: "Fit new disc", sub: "from the parts tray", type: "discIn" },
          block: "The old disc is still on the car."
        },
        {
          label: "Reassemble the corner",
          detail: "pads · caliper · pins · wheel",
          hint: "Put the corner back together: pads, caliper, guide pins, then the wheel and nuts.",
          accept: ["reassemble"],
          hot: [], cam: "brakes", tool: null,
          action: { label: "Refit everything", sub: "pads, caliper, wheel", type: "reassemble" },
          block: "Fit the new disc first."
        },
        {
          label: "Lower the car off the stand",
          detail: "jack · stand out",
          hint: "Jack it back up just enough to pull the stand out, then lower it gently onto its wheels.",
          accept: ["lowerCar"],
          hot: [], cam: "nose", tool: null,
          action: { label: "Lower the car", sub: "and clear the stand", type: "lowerCar" },
          block: "Reassemble the corner first."
        }
      ],
      done: {
        title: "Brake job finished",
        text: "New disc, new pads, everything torqued and the car back on the ground. Pump the brake pedal before you drive anywhere — the pads have to be moved up to the disc first.",
        points: [
          "The caliper has to come off before the disc will.",
          "Clean the mating faces or the disc will run out.",
          "New pads and a new disc always go together."
        ]
      }
    }    ,
    {
      id: "refit",
      title: "Refit the wheel and torque it up",
      xp: 300,
      cardSub: "Wheel back on, torqued on the ground.",
      cardTitle: "Refit & torque",
      tabName: "4 · Refit & torque",
      blurb: "The corner is rebuilt. Put its wheel back on, drop the car and torque the nuts.",
      cam: "wheelback",
      setup: function (S) { refitReady(S); },
      steps: [
        {
          label: "Lift the wheel back onto the hub",
          detail: "click the wheel",
          hint: "The wheel is lying beside the car. Click it to lift it back onto the hub — dragging it over there works too, but clicking is enough.",
          accept: ["wheelOn"],
          hot: ["wheel"], cam: "wheelback", tool: null,
          block: "The wheel is the first thing back on."
        },
        {
          label: "Start all five nuts by hand",
          detail: "any order",
          hint: "Thread every nut on by hand first. Start one, then the one opposite — never force a nut that feels tight.",
          accept: ["nutFit"], need: 5,
          hot: ["nut"], cam: "brakes", tool: "wrench",
          block: "The wheel needs to be on its studs before the nuts go back."
        },
        {
          label: "Pump the jack back under the car",
          detail: "three pumps",
          hint: "Pump until the saddle just takes the weight. The stand must come out with nothing resting on it.",
          accept: ["pump"], need: 3,
          hot: ["jack"], cam: "nose", tool: "jack",
          block: "The nuts have to be on before you lift the car again."
        },
        {
          label: "Pull the axle stand out",
          detail: "jack is holding it now",
          hint: "With the jack carrying the car, slide the stand out from under the sill and set it aside.",
          accept: ["standOut"],
          hot: ["stand"], cam: "nose", tool: "stand",
          block: "Get the jack under it first — never take the stand out of a car held by nothing."
        },
        {
          label: "Lower it onto its wheels",
          detail: "open the release valve",
          hint: "Let the jack down slowly until the tyre takes the weight. Watch the arch as it comes down.",
          accept: ["lowerJack"],
          hot: ["jack"], cam: "nose", tool: "jack",
          block: "The stand has to be out from under the car first."
        },
        {
          label: "Torque the five nuts",
          detail: "star pattern · on the ground",
          hint: "Now torque them properly, in a star pattern, with the wheel on the ground. The numbers show the order.",
          accept: ["nutTorque"], need: 5,
          hot: ["nut"], cam: "front", tool: "wrench", badges: "star",
          check: function (a, progress) {
            if (L.starOrder[progress] !== a.i) return "Star pattern: follow the numbers on the nuts.";
            return true;
          },
          block: "Torque the nuts with the car back on the ground."
        }
      ],
      done: {
        title: "Wheel on, torqued, car down",
        text: "That is the full cycle: strip it, work on it, rebuild it, and torque the nuts with the tyre on the ground. Check the torque again after 50 miles — that is when a loose wheel shows up.",
        points: [
          "Nuts go on by hand before any wrench touches them.",
          "The jack takes the weight before the stand comes out.",
          "Torque in a star pattern, on the ground, then re-check after 50 miles."
        ]
      }
    }
  ];
})();
