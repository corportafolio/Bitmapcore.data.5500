(function(window){
  // Configuración global para World LOD / zoom / thresholds
  window.WorldConfig = {
    WORLD_RADIUS: 100.36,

    // Zoom thresholds (valores de zoom referenciales declarados por el diseño)
    ZOOM_ATLAS_MIN: 2.7,
    ZOOM_ATLAS_MAX: 2.9,
    ZOOM_BLOCK_MODE: 3.0,

    // Distancias de cámara (aprox. correlacionadas con los zooms)
    DIST_ATLAS2_MIN: 200,  // distancia para activar atlas2 (vista lejana)
    DIST_ATLAS_MIN: 120,   // distancia aproximada para activar atlas 2.7-2.9
    DIST_BLOCK_MODE: 105,  // distancia aproximada para activar modo bloque (3.0)

    // Avatar scale thresholds
    AVATAR_SCALE_NEAR: 2,  // scale cuando distance < 110
    AVATAR_SCALE_MAX: 3,   // scale cuando distance < 105
    AVATAR_ENTER_DIST: 110,
    AVATAR_EXIT_DIST: 140,

    // Streets visibility (hysteresis)
    STREETS_SHOW_DIST: 120,
    STREETS_HIDE_DIST: 150,

    // Prefetch / concurrency
    PREFETCH_RADIUS: 1,            // 3x3
    MAX_CONCURRENT_FETCHES: 6,
    MAX_BLOCK_IMAGES_AT_3: 15,

    // Cache limits
    MAX_TILE_TEXTURES: 200,
    MAX_BLOCK_TEXTURES: 50
  };
})(window);
