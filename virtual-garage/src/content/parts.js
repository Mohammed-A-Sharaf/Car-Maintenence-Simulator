/* Virtual Garage - what each part is for. Shown when a part is clicked. */
window.VG_PARTS = {
  wheel: {
    img: "assets/sprites/wheel.png",
    name: "Wheel and tyre",
    role: "Wheel end",
    text: "The tyre carries the car and the alloy rim bolts to the hub with five nuts. The nuts clamp the rim against the hub face, so the wheel is held by friction, not by the studs.",
    fact: "Nuts are torqued in a star pattern for a reason: tightening them in a circle can cock the rim and warp the brake disc."
  },
  nut: {
    img: "assets/sprites/nut.png",
    name: "Lug nut",
    role: "Fastener",
    text: "Five nuts hold the wheel on. Each one screws onto a stud pressed into the hub.",
    fact: "Slacken the nuts with the wheel still on the ground. Once the car is in the air, the wheel just spins."
  },
  hub: {
    img: "assets/sprites/wheel_hub.png",
    name: "Hub and studs",
    role: "Wheel bearing",
    text: "The hub spins on the wheel bearing, carries the brake disc and passes five studs through it. The wheel registers on the hub spigot so it sits concentric with the axle.",
    fact: "A wheel that is not sitting flat on the hub face will wobble, even with the nuts tight."
  },
  disc: {
    img: "assets/sprites/brake_disc.png",
    name: "Brake disc",
    role: "Friction surface",
    text: "The disc turns with the wheel. When you brake, the pads clamp it and the car's momentum is turned into heat.",
    fact: "Drilled and slotted discs clear water and gas from the pad face, at the cost of a little pad life."
  },
  caliper: {
    img: "assets/sprites/caliper.png",
    name: "Brake caliper",
    role: "Clamp",
    text: "The caliper straddles the disc and holds the pads. Hydraulic pressure pushes a piston that squeezes the pads onto the disc.",
    fact: "The caliper slides on two guide pins. If a pin seizes, one pad wears out long before the other."
  },
  pad: {
    img: "assets/sprites/pad_friction.png",
    name: "Brake pad",
    role: "Wear item",
    text: "The friction material lives on a steel backing plate. Two pads per wheel clamp either side of the disc.",
    fact: "Worn pads make the piston sit further out, which is why the piston has to be pushed back before new pads will fit."
  },
  bolt: {
    img: "assets/sprites/caliper.png",
    name: "Caliper guide pin",
    role: "Fastener",
    text: "Two pins hold the caliper to its bracket and let it slide as the pads wear. Undo these and the caliper lifts off the disc.",
    fact: "They are lubricated with high-temperature grease. Dry pins are the usual cause of a sticking brake."
  },
  jack: {
    img: "assets/sprites/jack_body.png",
    name: "Trolley jack",
    role: "Lifting",
    text: "Pumping the handle pushes hydraulic oil into a ram that raises the lifting arm and its saddle.",
    fact: "A jack is a lifting tool, not a supporting tool. It can drop a car in seconds if a seal fails."
  },
  stand: {
    img: "assets/sprites/stand.png",
    name: "Axle stand",
    role: "Supporting",
    text: "A mechanical support with a ratchet bar. It takes the load once the car is up, so the jack can be released.",
    fact: "Two stands and a chock, every time. Never put any part of you under a car held only by a jack."
  },
  jackpoint: {
    img: "assets/sprites/car.png",
    name: "Jacking point",
    role: "Where to lift",
    text: "The reinforced section of sill behind the front wheel. Lift here and the load goes into the structure, not the floor pan.",
    fact: "Lift anywhere else and you will fold a sill or punch a hole through a floor pan."
  },
  standpoint: {
    img: "assets/sprites/car.png",
    name: "Axle stand point",
    role: "Where to support",
    text: "The stand goes under the same reinforced sill, close to the jacking point but far enough back that the saddle fits cleanly.",
    fact: "Set the stand before you release the jack, and give the car a shake before you go under it."
  }
};
