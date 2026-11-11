# Asset inventory

Inspection of the 12 source images in `assets/source/`. All coordinates are in each image's own native pixels unless stated otherwise.

## What arrived

- 12 loose JPEG files (no ZIP was present in the workspace).
- Every file is an opaque RGB JPEG on a pure white background. None has transparency.
- `front_wheel.jpeg` and `rear_wheel.jpeg` are byte-for-byte identical (same MD5).
- All parts are 2048 x 2048; the car body is 2912 x 1440.

## The images

| File | What it shows | View | Role in the simulator |
|---|---|---|---|
| `car_body.jpeg` | Silver four-door saloon, no wheels, nose pointing left. Dark wheel-arch liners, each with a keyhole-shaped opening | Side | The base of the garage scene. Everything else is positioned relative to it |
| `front_wheel.jpeg` | Five-spoke alloy wheel and tyre, 5 lug nuts, centre cap, valve stem. A brake disc and caliper are painted in behind the spokes | Face-on | Front wheel. Removable; lug nuts are the first hands-on target |
| `rear_wheel.jpeg` | Identical to `front_wheel.jpeg` | Face-on | Rear wheel (same sprite) |
| `wheel_hub.jpeg` | Hub flange with 5 threaded wheel studs and centre bearing cap | Face-on | Bottom layer of each wheel end; revealed when the disc comes off |
| `brake_disc.jpeg` | Vented, drilled and slotted disc; 5 stud holes; open centre bore | Face-on | Sits on the hub; visible once the wheel is off |
| `brake_caliper.jpeg` | Caliper with pad window, guide pins, bleed nipple, brake line, carrier bracket with a pad | Three-quarter | Clamps over the disc edge; unbolted in the brake-pad lesson |
| `brake_pads.jpeg` | Two pads side by side: friction face (left) and backing-plate face (right) | Face-on | Old/new pads; the two faces allow a "flip to inspect wear" interaction |
| `hydraulic_jack.jpeg` | Blue trolley jack, handle up-left, lift arm drawn in the raised position | Side | Lifts one end of the car |
| `jack_stand.jpeg` | Red ratchet-type axle stand, column extended | Front | Supports the car before any work under/around it |
| `lug_wrench.jpeg` | Four-way cross wrench | Face-on | Loosens/tightens lug nuts; rotates about its centre |
| `ratchet.jpeg` | Ratchet handle, no socket | Top | Tool for caliper bolts (needs a socket first) |
| `socket_wrench.jpeg` | The same ratchet with a socket fitted | Top (socket in side view) | "Ready to use" state of the ratchet |

## Measurements

### Round parts (wheel, disc, hub)

All three share the same canvas geometry: centre (1025, 1025), outer radius about 911 px.

All three have a 5-stud pattern at the same angles: 12 o'clock, then every 72 degrees (measured within +/- 2 degrees).

| Part | Stud-circle radius | As a fraction of its outer radius | Draw size relative to the wheel so the studs line up |
|---|---|---|---|
| Wheel (lug nuts) | 172 px | 0.189 | 1.000 |
| Brake disc (stud holes) | 322 px | 0.354 | 0.533 |
| Wheel hub (studs) | 690 px | 0.757 | 0.249 |

The disc's centre bore has a radius of about 155 px.

### Car body

| Feature | Front | Rear |
|---|---|---|
| Axle centre (centre of the keyhole opening) | (605, 962) | (2286, 962) |
| Wheel-arch radius | 252 px | 245 px |
| Keyhole opening radius | 113 px | 113 px |

- Wheelbase: 1681 px.
- Body silhouette: x 118 to 2851, y 257 to 1035. There are 404 px of empty canvas below the body for wheels and floor.
- Underside height (lowest body pixel): nose y 1004 to 1030 (x 160 to 360); sill y 1035 to 1029 (x 900 to 2000); tail y 1005 to 927 (x 2580 to 2830).

### The scales agree with each other

Sizing the disc to fill the keyhole opening (113 px) and applying the stud-pattern ratio gives:

| Quantity | Value (car-body pixels) |
|---|---|
| Tyre radius | 212 px (0.85 of the arch radius) |
| Disc radius | 113 px |
| Hub radius | 53 px |
| Floor line | y = 1174 |
| Sill height above floor at rest | 140 px |

If the tyre is taken as about 630 mm tall, one metre is roughly 673 px, which makes the car about 4.06 m long with a 2.50 m wheelbase.

`fit-check.jpg` is a static composite built with exactly these numbers.

### Tools

| Tool | Measurement |
|---|---|
| Hydraulic jack | Saddle top at y 727, centre x 1562; wheels touch the floor at y 1680; saddle is 953 px above the floor in the drawn pose; overall length 1864 px including handle |
| Jack stand | Saddle top y 211, centre x 1028; feet at y 1844; 1634 px tall; footprint 1044 px wide |
| Lug wrench | Centre of the cross at about (1025, 1042); spans 1682 x 1687 px |
| Ratchet | Silhouette x 87 to 1964, y 827 to 1224; drive head centred near (269, 1024) |
| Socket wrench | Ratchet is pixel-aligned with `ratchet.jpeg`; the added socket occupies x 203 to 459, y 1219 to 1683 |
| Brake pads | Friction-face pad x 210 to 940, y 215 to 1788; backing-face pad x 1126 to 1839, y 219 to 1796 |

Scales used for the jack (0.25), stand (0.124) and caliper (height 1.12 x disc radius, centred 0.74 x disc radius from the axle at 3 o'clock) in `fit-check.jpg` are placement choices, not measurements.

## Things the asset-preparation step has to handle

1. **Transparency.** Backgrounds must be removed. Simply turning white transparent would punch holes in the art, because the metal parts contain white highlights. The cut-out has to work inwards from the image border, then open the genuine see-through areas by hand: disc centre bore, the triangle in the jack stand, gaps in the jack linkage and caliper bracket.
2. **Edges.** Every object has a soft halo a few pixels wide (about 2.5 to 5 px) against the white. Edges need a small trim so no pale fringe shows on a darker garage backdrop.
3. **Background smudges.** `hydraulic_jack.jpeg` and `ratchet.jpeg` have very faint grey smudges in the background. They fall away with the cut-out.
4. **Things painted into the wheel.** The lug nuts, and a disc and caliper behind the spokes, are part of the wheel picture. The sidewall also carries garbled lettering.
5. **Mixed viewpoints.** The caliper is a three-quarter view while the wheel, disc and hub are face-on. It reads fine as an overlay on the disc edge (see `fit-check.jpg`) but is not geometrically exact.
6. **Single poses.** The jack is drawn only with its arm raised. At a realistic size that puts the saddle higher than the car's underside at rest (238 px against 145 px at the nose, at the scale used in `fit-check.jpg`), so it cannot slide under the car as drawn. The jack stand is drawn at one height.

## Sprites to derive from the originals

| Derived sprite | Cut from | Why |
|---|---|---|
| Lug nut | Wheel | So nuts can be loosened and removed one by one |
| Socket | Socket wrench minus ratchet | So fitting a socket to the ratchet is a real step |
| Pad, friction face / pad, backing face | Brake pads | Two separate objects, and two faces to inspect |
| Jack chassis / handle / lift arm / saddle | Hydraulic jack | So the jack can start lowered, be pumped, and rise |

---

## Appendix — what the pipeline produced

`tools/prepare_assets.py` reads `assets/source/` and writes `assets/sprites/`
plus the manifest `src/content/sprites.js`. Long sides are capped at 1200 px
(2400 for the car) with the world scale adjusted to match, so the browser never
holds a 2048² RGBA buffer for a part that is drawn 400 px wide.

| Sprite | Pixels | World size | Derived from |
|---|---|---|---|
| `car.png` | 2400 × 684 | 2734 × 779 | `car_body.jpeg`, cropped to its silhouette |
| `wheel.png` | 1199 × 1200 | 425 across | `front_wheel.jpeg`, sidewall cleaned, five nuts erased |
| `nut.png` | 140 × 140 | 33 across | one nut lifted out of the wheel |
| `wheel_hub.png` | 1199 × 1200 | 106 across | `wheel_hub.jpeg` |
| `brake_disc.png` | 1199 × 1200 | 227 across | `brake_disc.jpeg`, bore punched through |
| `caliper.png` | 878 × 1200 | 93 × 127 | `brake_caliper.jpeg`, bracket gap punched |
| `pad_friction.png`, `pad_backing.png` | 560/548 × 1200 | 105 long | the two pads in `brake_pads.jpeg` |
| `jack_body.png`, `jack_arm.png` | 1200 × 820 each | 466 × 318 | `hydraulic_jack.jpeg`, split at the arm pivot (radius 210 px about (975, 1240) native) |
| `stand.png` | 767 × 1200 | 134 × 209 | `jack_stand.jpeg`, triangle punched |
| `lug_wrench.png` | 1196 × 1200 | 254 across | `lug_wrench.jpeg` |
| `ratchet_socket.png` | 1200 × 549 | 170 long | `socket_wrench.jpeg` (socket fitted) |

See-through holes found automatically (area, mean luminance, flatness):

| Asset | Hole | bbox | area |
|---|---|---|---|
| disc | centre bore | 311 × 307 | 74,783 px |
| stand | triangle | 382 × 233 | 36,307 px |
| caliper | bracket gap | 77 × 545 | 13,821 px |
| jack | linkage gap | 197 × 261 | 8,877 px |

Sanity checks that pass in `tests/smoke.js`: every manifest path exists, the
five nut positions sit on a 40 px pitch with one at twelve o'clock, the lowered
saddle sits below the nose underside, pumping the jack produces a pitch of
2.5°, the stand holds that pitch when the jack is released, the hand-over from stand
to jack and back works, and all four lessons run to completion.

## Appendix B — how the window is checked

`tools/preview_ui.py` draws the whole dashboard over a rendered scene at
1680x980, using the same pixel numbers as `styles/main.css`: sidebar 232 px,
26 px page padding, 348 px learning-path rail, 20 px gap, 104 px header, and a
54 px floating dock inset 14 px inside the stage card. Faults found and fixed
this way:

| fault | fix |
|---|---|
| panel and camera bar both pinned top-right, overlapping | camera presets moved into the dock |
| panel at 88% opacity was unreadable over the white bodywork | 96.5% |
| the parked disc and pads sat under the right-hand panel | every camera pushes the view left by half the panel width |
| the step chip and the toast both wanted the top-left corner | chip moved above the dock, toast stays centred at the top |
| long card titles ran into the XP chip | short `cardTitle` per lesson, titles wrap |
| jack arm floating away from the jack body in the stills | previewer was anchoring the arm on its pivot instead of its own anchor |
| nothing told the user what a part was until it was clicked | hover ring + floating name tag on every part; lesson-hot parts pulse blue |
| achievements were four lesson ticks and a level | a stats counter drives 17 derived achievements, with toasts when one unlocks |
| the car floated above the floor | contact shadows under both wheels, the jack and the stand; the front one lifts and fades as the nose rises |
| victory card was plain text | deterministic confetti + XP count-up |
| onboarding toast pointed at the wrong place | lessons are on the right; returning players get a "welcome back" with their XP |

## Appendix C — where each hotspot takes the camera

`tools/preview_states.py` can render any camera, so the framing table is
checked by rendering it: `docs/camera-check.jpg` is one frame per hotspot,
produced from the same `targetFor()` numbers the app uses.

| hotspot | frame width (world units) |
|---|---|
| wheel | 932 |
| hub / nut | 320 |
| disc | 496 |
| caliper | 332 |
| pad / guide pin | 320 |
| jack | 1,024 |
| stand | 572 |
| jacking point | 800 |

Two faults this caught: the safe-area shift (half the floating rail) is a
*pixel* offset, so on a close-up frame it threw the subject right off the edge
— it is now capped at 18% of the frame and switches off entirely below 980 px,
where the CSS puts the rail under the stage instead of over it. And the jack was
being framed 300 units above itself, because its sprite anchors at the top-left
rather than the middle.

## Appendix D — the room behind the car

The backdrop is built, not photographed: `tools/make_garage.py` writes
`src/content/garage.js`, a flat list of rect / ell / poly / line shapes in the
same world units as the car. Two renderers read that one list — `src/scene/garage.js`
into SVG for the app, `tools/garage_paint.py` into pixels for the stills — with
the same fill rules:

| fill | box shapes | ellipses |
|---|---|---|
| one colour | flat | flat |
| `[c0, c1]` | vertical gradient over the shape's own height | radial from its centre |
| `o` | extra opacity on top of the colour's own alpha | same |

| feature | where it sits (world units, y down, floor at 1174) |
|---|---|
| wall cladding | 300-wide panels from y −1020 to 1174, folded seams every panel |
| ceiling line | y −420, with the soffit shadow below it |
| LED battens | y −364, at x −1560 / 250 / 1740 / 3060, cones down to the floor |
| pegboard | x −700…420, y −318…−18 |
| clock / hose reel / jobs board / shelving | 1762 / 2250 / 1180 / 2560 |
| bay line and kick plate | y 46 and y 1066 |
| floor | 1174 down, seams, bay markings, light pools, tube reflections |

The overview camera only shows about 630 units above the car's roof (y ≈ 200),
so every fitting was placed inside that band: the first pass put the whole
workshop behind the car, where nothing could be seen. The lamps deliberately sit
just under the frame's top edge, which reads as a ceiling fitting at both stage
aspects the app can have.
