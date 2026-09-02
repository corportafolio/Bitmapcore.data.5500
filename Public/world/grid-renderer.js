var WorldGrid = (function() {
  var RADIUS = 100;
  var GRID_SIZE = 1000;
  var TOTAL_BLOCKS = 1000000;
  var POLE_SKIP = 35;
  var SPHERE_COLOR = 0x1a1828;
  var LINE_COLOR = 0x2a2840;
  var POLE_COLOR = 0x12101a;
  var PI2 = Math.PI * 2;

  function create(scene) {
    var sphereGeo = new THREE.SphereGeometry(RADIUS, 64, 64);
    var sphereMat = new THREE.MeshStandardMaterial({
      color: SPHERE_COLOR,
      roughness: 0.9,
      metalness: 0.05,
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide,
      depthWrite: false
    });
    var sphere = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(sphere);

    createMeridians(scene);
    createParallels(scene);
    createPoleCircles(scene);
  }

  function createMeridians(scene) {
    var material = new THREE.LineBasicMaterial({ color: LINE_COLOR, transparent: true, opacity: 0.3 });
    for (var i = 0; i < 20; i++) {
      var theta = (i / 20) * PI2;
      var points = [];
      for (var j = 0; j <= 64; j++) {
        var phi = (j / 64) * Math.PI - Math.PI / 2;
        points.push(new THREE.Vector3(
          RADIUS * Math.cos(phi) * Math.cos(theta),
          RADIUS * Math.sin(phi),
          RADIUS * Math.cos(phi) * Math.sin(theta)
        ));
      }
      var geo = new THREE.BufferGeometry().setFromPoints(points);
      scene.add(new THREE.Line(geo, material));
    }
  }

  function createParallels(scene) {
    var material = new THREE.LineBasicMaterial({ color: LINE_COLOR, transparent: true, opacity: 0.3 });
    for (var i = 1; i < 10; i++) {
      var phi = (i / 10) * Math.PI - Math.PI / 2;
      var r = RADIUS * Math.cos(phi);
      var y = RADIUS * Math.sin(phi);
      if (Math.abs(r) < 1) continue;
      var points = [];
      for (var j = 0; j <= 64; j++) {
        var theta = (j / 64) * PI2;
        points.push(new THREE.Vector3(r * Math.cos(theta), y, r * Math.sin(theta)));
      }
      var geo = new THREE.BufferGeometry().setFromPoints(points);
      scene.add(new THREE.Line(geo, material));
    }
  }

  function createPoleCircles(scene) {
    var ringGeo = new THREE.RingGeometry(RADIUS * 0.15, RADIUS * 0.18, 32);
    var ringMat = new THREE.MeshBasicMaterial({ color: 0xFE3E00, transparent: true, opacity: 0.4, side: THREE.DoubleSide });

    var northRing = new THREE.Mesh(ringGeo, ringMat);
    northRing.position.set(0, RADIUS - 0.5, 0);
    northRing.rotation.x = -Math.PI / 2;
    scene.add(northRing);

    var southRing = new THREE.Mesh(ringGeo.clone(), ringMat.clone());
    southRing.position.set(0, -RADIUS + 0.5, 0);
    southRing.rotation.x = Math.PI / 2;
    scene.add(southRing);
  }

  function getPhiFromGz(gz) {
    if (gz < 500) {
      return (gz / 500) * (Math.PI / 2);
    }
    if (gz <= 955) {
      return -((gz - 499) / 456) * (Math.PI / 2);
    }
    return -Math.PI / 2;
  }

  function blockToSphere(blockNumber) {
    var gx = blockNumber % GRID_SIZE;
    var gz = Math.floor(blockNumber / GRID_SIZE);

    var theta = (gx / GRID_SIZE) * PI2;
    var phi = getPhiFromGz(gz);

    var cosPhi = Math.cos(phi);
    var x = RADIUS * cosPhi * Math.cos(theta);
    var y = RADIUS * Math.sin(phi);
    var z = RADIUS * cosPhi * Math.sin(theta);

    return { x: x, y: y, z: z, theta: theta, phi: phi, gx: gx, gz: gz };
  }

  function sphereToBlock(x, y, z) {
    var len = Math.sqrt(x * x + y * y + z * z);
    if (len < 0.001) return -1;

    var nx = x / len;
    var ny = y / len;
    var nz = z / len;

    var phi = Math.asin(Math.max(-1, Math.min(1, ny)));
    var theta = Math.atan2(nz, nx);
    if (theta < 0) theta += PI2;

    var gx = Math.round((theta / PI2) * GRID_SIZE) % GRID_SIZE;
    var gz;
    if (phi >= 0) {
      gz = Math.round((phi / (Math.PI / 2)) * 500);
    } else {
      gz = 499 + Math.round((-phi / (Math.PI / 2)) * 456);
    }
    gz = Math.max(0, Math.min(GRID_SIZE - 1, gz));

    var blockNum = gz * GRID_SIZE + gx;
    if (blockNum < 0 || blockNum >= TOTAL_BLOCKS) return -1;
    return blockNum;
  }

  function getBlockNormal(blockNumber) {
    var pos = blockToSphere(blockNumber);
    var len = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
    if (len < 0.001) return { x: 0, y: 1, z: 0 };
    return { x: pos.x / len, y: pos.y / len, z: pos.z / len };
  }

  function getBlockScale(blockNumber) {
    var pos = blockToSphere(blockNumber);
    var cosPhi = Math.cos(pos.phi);
    var scale = Math.max(0.15, cosPhi);
    return { x: scale, y: 1, z: 1 };
  }

  var posCache = null;

  function buildPositionCache() {
    if (posCache) return;
    var total = 956 * GRID_SIZE;
    posCache = new Float32Array(total * 4);
    var idx = 0;
    for (var gz = 0; gz < 956; gz++) {
      var phi = getPhiFromGz(gz);
      var cosPhi = Math.cos(phi);
      var sinPhi = Math.sin(phi);
      var scale = Math.max(0.15, cosPhi);
      for (var gx = 0; gx < GRID_SIZE; gx++) {
        var theta = (gx / GRID_SIZE) * PI2;
        var cosT = Math.cos(theta);
        var sinT = Math.sin(theta);
        posCache[idx] = cosPhi * cosT;
        posCache[idx + 1] = sinPhi;
        posCache[idx + 2] = cosPhi * sinT;
        posCache[idx + 3] = scale;
        idx += 4;
      }
    }
    console.log('🧠 WorldGrid: Caché de 956K posiciones listo (' + Math.round(total * 4 * 4 / 1048576) + ' MB)');
  }

  function getCachedBlockInfo(blockNumber) {
    if (!posCache) buildPositionCache();
    var idx = blockNumber * 4;
    return {
      nx: posCache[idx],
      ny: posCache[idx + 1],
      nz: posCache[idx + 2],
      scale: posCache[idx + 3]
    };
  }

  function isBlockInPolarZone(blockNumber) {
    var gz = Math.floor(blockNumber / GRID_SIZE);
    return gz < POLE_SKIP || gz > 955 - POLE_SKIP;
  }

  var ATLAS_CELLS = 32;
  var ATLAS_COLS = 40;
  var ATLAS_ROWS = 25;
  var TILES_X = 25;
  var TILES_NORTH = 20;

  function atlasInfo(blockNumber) {
    var gx = blockNumber % GRID_SIZE;
    var gz = Math.floor(blockNumber / GRID_SIZE);
    var col = gx % ATLAS_COLS;
    var tileGx = Math.floor(gx / ATLAS_COLS);
    var tileGz;
    var row;
    if (gz < 500) {
      tileGz = Math.floor(gz / ATLAS_ROWS);
      row = (ATLAS_ROWS - 1) - (gz % ATLAS_ROWS);
    } else {
      tileGz = TILES_NORTH + Math.floor((gz - 500) / ATLAS_ROWS);
      row = (gz - 500) % ATLAS_ROWS;
    }
    var cellSizeU = 1 / ATLAS_COLS;
    var cellSizeV = 1 / ATLAS_ROWS;
    return {
      tile: tileGz * TILES_X + tileGx,
      gz: gz,
      u0: col * cellSizeU,
      v0: 1 - (row + 1) * cellSizeV,
      u1: (col + 1) * cellSizeU,
      v1: 1 - row * cellSizeV
    };
  }

  function getAtlasTile(blockNumber) {
    var gx = blockNumber % GRID_SIZE;
    var gz = Math.floor(blockNumber / GRID_SIZE);
    var tileGx = Math.floor(gx / ATLAS_COLS);
    var tileGz;
    if (gz < 500) {
      tileGz = Math.floor(gz / ATLAS_ROWS);
    } else {
      tileGz = TILES_NORTH + Math.floor((gz - 500) / ATLAS_ROWS);
    }
    return tileGz * TILES_X + tileGx;
  }

  function getRadius() { return RADIUS; }
  function getGridSize() { return GRID_SIZE; }

  var A2_AT1_COLS = 3;
  var A2_AT1_ROWS = 10;
  var A2_NORTH_REG_COLS = Math.floor(TILES_X / A2_AT1_COLS);
  var A2_NORTH_REG_ROWS = Math.ceil(TILES_NORTH / A2_AT1_ROWS);
  var A2_SOUTH_REG_ROWS = Math.ceil((39 - TILES_NORTH) / A2_AT1_ROWS);
  var A2_TILES_PER_COL = A2_NORTH_REG_ROWS + A2_SOUTH_REG_ROWS;
  var A2_TOTAL_REG = A2_NORTH_REG_COLS * A2_TILES_PER_COL;
  var A2_SPECIAL_COL = TILES_X - (TILES_X % A2_AT1_COLS);

  function getAtlas2Tile(blockNumber) {
    var gx = blockNumber % GRID_SIZE;
    var gz = Math.floor(blockNumber / GRID_SIZE);
    var tileGx = Math.floor(gx / ATLAS_COLS);
    var tileGz;
    if (gz < 500) {
      tileGz = Math.floor(gz / ATLAS_ROWS);
    } else {
      tileGz = TILES_NORTH + Math.floor((gz - 500) / ATLAS_ROWS);
    }

    if (tileGx >= A2_SPECIAL_COL) {
      if (gz < 500) {
        return A2_TOTAL_REG + Math.floor(tileGz / A2_AT1_ROWS);
      } else {
        var southRow = tileGz - TILES_NORTH;
        return A2_TOTAL_REG + A2_NORTH_REG_ROWS + Math.floor(southRow / A2_AT1_ROWS);
      }
    }

    var a2Col = Math.floor(tileGx / A2_AT1_COLS);
    var isNorth = gz < 500;
    var a2Row, localRow;
    if (isNorth) {
      a2Row = Math.floor(tileGz / A2_AT1_ROWS);
      localRow = tileGz % A2_AT1_ROWS;
    } else {
      var sRow = tileGz - TILES_NORTH;
      a2Row = Math.floor(sRow / A2_AT1_ROWS);
      localRow = sRow % A2_AT1_ROWS;
    }
    return a2Col * A2_TILES_PER_COL + (isNorth ? a2Row : A2_NORTH_REG_ROWS + a2Row);
  }

  function atlas2Info(blockNumber) {
    var gx = blockNumber % GRID_SIZE;
    var gz = Math.floor(blockNumber / GRID_SIZE);
    var tileGx = Math.floor(gx / ATLAS_COLS);
    var tileGz;
    if (gz < 500) {
      tileGz = Math.floor(gz / ATLAS_ROWS);
    } else {
      tileGz = TILES_NORTH + Math.floor((gz - 500) / ATLAS_ROWS);
    }

    var isSpecial = tileGx >= A2_SPECIAL_COL;
    var tileId;

    if (isSpecial) {
      tileId = getAtlas2Tile(blockNumber);
      var localGz;
      if (gz < 500) {
        localGz = gz % (A2_AT1_ROWS * ATLAS_ROWS);
      } else {
        localGz = (gz - 500) % (A2_AT1_ROWS * ATLAS_ROWS);
      }
      var localRow = Math.floor(localGz / ATLAS_ROWS);
      var row = (A2_AT1_ROWS - 1) - localRow;
      var cellSizeV = 1 / A2_AT1_ROWS;
      return {
        tile: tileId,
        gz: gz,
        u0: 0,
        v0: 1 - (row + 1) * cellSizeV,
        u1: 1,
        v1: 1 - row * cellSizeV
      };
    }

    tileId = getAtlas2Tile(blockNumber);
    var localCol = tileGx % A2_AT1_COLS;
    var isNorth = gz < 500;
    var a2Row, localRowInTile;
    if (isNorth) {
      a2Row = Math.floor(tileGz / A2_AT1_ROWS);
      localRowInTile = tileGz % A2_AT1_ROWS;
    } else {
      var sRow = tileGz - TILES_NORTH;
      a2Row = Math.floor(sRow / A2_AT1_ROWS);
      localRowInTile = sRow % A2_AT1_ROWS;
    }

    var col = gx % ATLAS_COLS;
    var cellSizeU = 1 / (A2_AT1_COLS * ATLAS_COLS);
    var cellSizeV = 1 / A2_AT1_ROWS;
    var row = (A2_AT1_ROWS - 1) - localRowInTile;

    return {
      tile: tileId,
      gz: gz,
      u0: localCol * ATLAS_COLS * cellSizeU + col * cellSizeU,
      v0: 1 - (row + 1) * cellSizeV,
      u1: localCol * ATLAS_COLS * cellSizeU + (col + 1) * cellSizeU,
      v1: 1 - row * cellSizeV
    };
  }

  return {
    create: create,
    blockToSphere: blockToSphere,
    sphereToBlock: sphereToBlock,
    getBlockNormal: getBlockNormal,
    getBlockScale: getBlockScale,
    isBlockInPolarZone: isBlockInPolarZone,
    atlasInfo: atlasInfo,
    getAtlasTile: getAtlasTile,
    atlas2Info: atlas2Info,
    getAtlas2Tile: getAtlas2Tile,
    getPhiFromGz: getPhiFromGz,
    getCachedBlockInfo: getCachedBlockInfo,
    getRadius: getRadius,
    getGridSize: getGridSize
  };
})();
