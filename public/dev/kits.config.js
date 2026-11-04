// Model kits for building maps (raw downloads in assets-src/textures/, all CC-BY 4.0 unless noted).
// /dev/kitbuild.html exports the pieces listed here to public/assets/game/kits/<kit>.glb, at game scale
// (meters, standing on y = 0, centered on x/z), with textures shrunk to `tex`, and writes their sizes
// and collision boxes to public/assets/game/kits/kits.json for the maps (see piece() in builder.js).
//
// Each piece: id → { node (the name in the file), collide, rotX (degrees, to stand a model up), height
// (meters, to rescale a model authored at the wrong size) }.
// collide: 'box' — its bounding box is solid (most props); 'shape' — solid boxes fitted to the model
// on a 10 cm grid, so doorways, windows and stairs work; 'none' — only drawn.
export const KITS = {
  // "Abandoned Building – Modular Environment Kit" by olegolegperepelica: 2 m grid, 3 m walls (along z).
  room: {
    src: 'textures/abandoned_building__modular_environment_kit.glb', unit: 1, tex: 1024,
    credit: '"Abandoned Building – Modular Environment Kit" by olegolegperepelica',
    pieces: {
      wall2: { node: 'SM_Wall_2*3', collide: 'box' },
      wall1: { node: 'SM_Wall_1*3', collide: 'box' },
      wallHalf: { node: 'SM_Wall_0,5*3', collide: 'box' },
      doorway: { node: 'SM_Doorway_2*3_1', collide: 'shape' },
      window: { node: 'SM_Window_opening', collide: 'shape' },
      windowFrame: { node: 'SM_Window_frame', collide: 'none' },
      corner: { node: 'SM_Wall_Angle_2*2', collide: 'shape' },
      column: { node: 'SM_Wall_Colonum', collide: 'box' },
      floor: { node: 'SM_Floor_2*2', collide: 'box' },
      ceiling: { node: 'SM_Ceiling_2x2', collide: 'box' },
      door: { node: 'SM_Interior_door', collide: 'box' },
      doorFrame: { node: 'SM_Interior_doorway', collide: 'none' },
      plinth: { node: 'SM_Plinth_x2', collide: 'none' },
    },
  },
  // "Modular Urban Fence Pack (w/ graffiti textures)" by TampaJoey: 4 m panels, 2.6 m tall.
  fence: {
    src: 'textures/modular_urban_fence_pack_w_graffiti_textures.glb', unit: 1, tex: 1024,
    credit: '"Modular Urban Fence Pack (w/ graffiti textures)" by TampaJoey',
    pieces: {
      panelA: { node: 'PanelStyle_A', collide: 'box' },
      panelB: { node: 'PanelStyle_B', collide: 'box' },
      postWood: { node: 'Post_wood', collide: 'box' },
      postConcrete: { node: 'Post_concrete', collide: 'box' },
      gateLeft: { node: 'DoorPostLeft', collide: 'shape' },
      gateRight: { node: 'DoorPostRight', collide: 'shape' },
    },
  },
  // "Modular OSB/Wood Shipping Crates [2K]" by Lyndschoko.
  crates: {
    src: 'textures/modular_osbwood_shipping_crates_2k.glb', unit: 1, tex: 1024,
    credit: '"Modular OSB/Wood Shipping Crates [2K]" by Lyndschoko',
    pieces: {
      large: { node: 'Crate_Large_Old', collide: 'box' },
      largeNew: { node: 'Crate_Large_New', collide: 'box' },
      small: { node: 'Crate_Small_Old', collide: 'box' },
      smallNew: { node: 'Crate_Small_New', collide: 'box' },
      tall: { node: 'Crate_Tall_Old', collide: 'box' },
      tallNew: { node: 'Crate_Tall_New', collide: 'box' },
      plank: { node: 'Plank_A_Old', collide: 'none' },
      osb: { node: 'OSB_Old', collide: 'none' },
    },
  },
  // "PSX Barrels Pack" by Shazly (authored about 3.6× too big).
  barrels: {
    src: 'textures/psx_barrels_pack.glb', unit: 1, tex: 256,
    credit: '"PSX Barrels Pack" by Shazly',
    pieces: {
      oil: { node: 'Oil_Drum', collide: 'box', height: 0.9 },
      rusty: { node: 'Rusty_Leaking_Barrel', collide: 'box', height: 0.9 },
      red: { node: 'Red_Steel_Drum', collide: 'box', height: 0.9 },
      blue: { node: 'Blue_Plastic_Drum', collide: 'box', height: 0.95 },
      hazard: { node: 'Yellow_Hazard_Drum', collide: 'box', height: 0.9 },
      open: { node: 'Open_Steel_Barrel', collide: 'box', height: 0.9 },
      crushed: { node: 'Crushed_Barrel', collide: 'box', height: 0.8 },
    },
  },
  // "Free Modular pillar base kit" by kjetil myhren: 3.3 m concrete pillars.
  pillars: {
    src: 'textures/free_modular_pillar_base_kit.glb', unit: 1, tex: 1024,
    credit: '"Free Modular pillar base kit" by kjetil myhren',
    pieces: {
      xl: { node: 'PillarK1_XL001', collide: 'box' },
      l: { node: 'PillarK1_L001', collide: 'box' },
      m: { node: 'PillarK1_M001', collide: 'box' },
    },
  },
  // "Kit Fortification update" by TuszPro. Its other "pieces" are several objects merged into one mesh
  // (slabs, fence panels and a truss, a generator), so only the long concrete wall is used.
  fort: {
    src: 'textures/kit_fortification_update.glb', unit: 1, tex: 1024,
    credit: '"Kit Fortification update" by TuszPro',
    pieces: { wall: { node: 'Concreto2', collide: 'box' } },
  },
  // "Door Pack Asset + key pack (one material)" by BlackMonolith (authored in centimeters).
  doors: {
    src: 'textures/door_pack_asset__key_pack_one_material.glb', unit: 0.01, tex: 1024,
    credit: '"Door Pack Asset + key pack (one material)" by BlackMonolith',
    pieces: {
      oldWhite: { node: 'wood_door_OLD_W', collide: 'box' },
      oldWhiteFrame: { node: 'wood_frame_OLD_W', collide: 'none' },
      oldDark: { node: 'wood_door_OLD_D', collide: 'box' },
      oldDarkFrame: { node: 'wood_frame_OLD_D', collide: 'none' },
      green: { node: 'wood_door_G', collide: 'box' },
      greenFrame: { node: 'wood_frame_G', collide: 'none' },
    },
  },
  // "Stylized Street Light" by Willowboxart: a freestanding lamp, its arm along +z (about 3 m tall in
  // the file, in centimeters; a street lamp should be taller).
  lamp: {
    src: 'textures/stylized_street_light.glb', unit: 0.01, tex: 1024,
    credit: '"Stylized Street Light" by Willowboxart',
    pieces: { street: { node: 'SM_Street_Light', collide: 'shape', height: 5.5 } },
  },
  // "Vent Collection" by XploRXR — CC-BY-NC 4.0 (non-commercial: fine for this private game).
  vents: {
    src: 'textures/vent_collection.glb', unit: 1, tex: 512,
    credit: '"Vent Collection" by XploRXR (CC-BY-NC 4.0)',
    pieces: {
      long: { node: 'VentilationShaftLong', collide: 'box' },
      short: { node: 'VentilationShaftShort', collide: 'box' },
      bend: { node: 'VentilationShaftCurved90', collide: 'box' },
      tee: { node: 'VentilationShaftJunctionA', collide: 'box' },
      grate: { node: 'VentilationShaftGrate001', collide: 'box' },
    },
  },
};
