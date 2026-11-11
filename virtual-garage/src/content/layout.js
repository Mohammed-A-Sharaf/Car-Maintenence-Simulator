/* Virtual Garage - runtime layout constants.
   One world unit = one pixel of the original car_body.jpeg, so every number
   here can be traced back to assets/asset-inventory.md.

   The block between the markers is strict JSON: tools/preview_states.py reads
   it to prove the same numbers assemble correctly outside the browser. */
window.VG_LAYOUT = /*L*/{
  "groundY": 1174,
  "pitchPivot": [2286, 962],
  "axles": { "front": [605, 962], "rear": [2286, 962] },
  "carAt": [0, 0],
  "sillY": 1032,
  "noseLine": [160, 1004, 360, 1030],
  "nutPitch": 40.02,
  "nutAngles": [18, 90, 162, 234, 306],
  "starOrder": [0, 2, 4, 1, 3],
  "discR": 113,
  "hubR": 53,
  "caliperDx": 83.6,
  "caliperDy": 0,
  "padPlace": [[70, -24], [88, 22]],
  "standX": 935,
  "jackSaddleX": 340,
  "jackArmLow": 31.5,
  "jackPumps": 6,
  "jackParkX": -1450,
  "wheelPark": [-300, 941],
  "caliperPark": [104, -128, -12],
  "discPark": [528, 98, 16],
  "padsPark": [548, 188],
  "maxPitchLift": 0.09,
  "camera": {
    "overview": [1150, 705, 3800],
    "nose": [390, 935, 1720],
    "front": [700, 935, 1340],
    "brakes": [706, 930, 1260],
    "wheelback": [120, 950, 1620],
    "rear": [2286, 935, 1340]
  }
}/*R*/;
