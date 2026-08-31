var WorldBlocks = (function() {
  var scene = null;
  var block0Mesh = null;

  var allBlocks = {};
  var blockData = {};
  var shownBlocks = {};

  var BLOCK_SIZE = 0.42;
  var BASE_HEIGHT = 0.15;
  var MAX_HEIGHT = 0.5;
  var MAX_TX = 8000;
  var INSTANCE_OFFSET = 0.3;
  var LOAD_DEBOUNCE = 250;
  var ZOOM_DEBOUNCE = 500;
  var loadTimer = null;
  var isZooming = false;
  var zoomTimer = null;

  var NEAR_DISTANCE = 112;
  var STREET_MIN_DIST = 101;
  var MAX_NEAR_TILES_PER_FRAME = 5;

  var tileInstanced = {};
  var tileNearMeshes = {};
  var tileDirty = {};
  var tileNearDirty = {};
  var tileImageData = {};
  var tileTextures = {};
  var tileInstanceCount = {};

  var blocksByTile = {};
  var instanceBlockMap = {};

  var GRID_SIZE = 1000;
  var bgLoadInterval = null;

  var ATLAS_COLS = 40;
  var ATLAS_ROWS = 25;
  var CELL_SIZE = 32;

  var sharedBoxGeo = null;
  var sharedMaterial = null;

  var _up = new THREE.Vector3(0, 1, 0);
  var _normalVec = new THREE.Vector3();
  var _quat = new THREE.Quaternion();
  var _mat4 = new THREE.Matrix4();
  var _localOffset = new THREE.Vector3();
  var _nVec = new THREE.Vector3();
  var streetGroundMesh = null;

  function getPhiFromGz(gz) {
    if (gz < 500) {
      return (gz / 500) * (Math.PI / 2);
    }
    if (gz <= 955) {
      return -((gz - 499) / 456) * (Math.PI / 2);
    }
    return -Math.PI / 2;
  }

  function init(sceneRef) {
    destroy();
    scene = sceneRef;
    sharedBoxGeo = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    sharedMaterial = createAtlasMaterial();
    createBlock0();
    loadAllData();
    if (typeof AtlasCache !== 'undefined' && AtlasCache.preloadAll) {
      AtlasCache.preloadAll(function() {
        console.log('🗺️ WorldBlocks: Atlas precarga completada');
      });
    }
  }

  function destroy() {
    if (bgLoadInterval) { clearInterval(bgLoadInterval); bgLoadInterval = null; }
    if (loadTimer) { clearTimeout(loadTimer); loadTimer = null; }

    for (var tileId in tileInstanced) {
      var m = tileInstanced[tileId];
      if (m && m.parent) m.parent.remove(m);
      if (m && m.geometry) m.geometry.dispose();
      if (m && m.material) m.material.dispose();
    }
    for (var tileId in tileNearMeshes) {
      var m = tileNearMeshes[tileId];
      if (m && m.parent) m.parent.remove(m);
      if (m && m.geometry) m.geometry.dispose();
      if (m && m.material) m.material.dispose();
    }

    tileInstanced = {};
    tileNearMeshes = {};
    tileDirty = {};
    tileNearDirty = {};
    tileImageData = {};
    tileTextures = {};
    tileInstanceCount = {};
    blocksByTile = {};
    instanceBlockMap = {};
    shownBlocks = {};
    blockData = {};
    block0Mesh = null;
    nearProgress = {};

    if (sharedBoxGeo) { sharedBoxGeo.dispose(); sharedBoxGeo = null; }
    sharedMaterial = null;
  }

  function createAtlasMaterial() {
    var mat = new THREE.MeshStandardMaterial({
      roughness: 0.6,
      metalness: 0.05
    });

    mat.onBeforeCompile = function(shader) {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        'attribute vec4 aUvOffset;\nvarying vec4 vAtlasUvOffset;\n#include <common>'
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvAtlasUvOffset = aUvOffset;'
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        'varying vec4 vAtlasUvOffset;\n#include <common>'
      );

      var mapChunk = '#include <map_fragment>';
      var mapReplace =
        'vec2 atlasUV = vAtlasUvOffset.xy + vUv * vAtlasUvOffset.zw;\n' +
        'vec4 texelColor = texture2D( map, atlasUV );\n' +
        'texelColor = mapTexelToLinear( texelColor );\n' +
        'diffuseColor *= texelColor;\n';

      if (shader.fragmentShader.indexOf(mapChunk) !== -1) {
        shader.fragmentShader = shader.fragmentShader.replace(mapChunk, mapReplace);
      }
    };

    return mat;
  }

  function createBlock0() {
    var geo = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    var mat = new THREE.MeshStandardMaterial({ color: 0xCC0000, roughness: 0.5, metalness: 0.1 });
    block0Mesh = new THREE.Mesh(geo, mat);

    var pos = WorldGrid.blockToSphere(0);
    var normal = WorldGrid.getBlockNormal(0);
    block0Mesh.position.set(
      pos.x + normal.x * INSTANCE_OFFSET,
      pos.y + normal.y * INSTANCE_OFFSET,
      pos.z + normal.z * INSTANCE_OFFSET
    );

    var up = new THREE.Vector3(0, 1, 0);
    var normalVec = new THREE.Vector3(normal.x, normal.y, normal.z);
    block0Mesh.quaternion.setFromUnitVectors(up, normalVec);

    block0Mesh.userData = { blockNumber: 0, tx: 1, hash: '' };
    scene.add(block0Mesh);
  }

  function loadAllData() {
    if (!BlockCache) return;
    BlockCache.openDB().then(function(db) {
      return new Promise(function(resolve) {
        var tx = db.transaction('batches', 'readonly');
        var store = tx.objectStore('batches');
        var request = store.openCursor();
        var count = 0;

        request.onsuccess = function(e) {
          var cursor = e.target.result;
          if (cursor) {
            var batch = cursor.value;
            var blocks = batch.blocks;
            for (var i = 0; i < blocks.length; i++) {
              var b = blocks[i];
              allBlocks[b.bloque] = {
                tx: parseInt(b.totalTransacciones) || 1,
                hash: b.hash || '',
                etiquetas: b.etiquetas || ''
              };
            }
            count += blocks.length;
            cursor.continue();
          } else {
            console.log('📦 WorldBlocks: ' + count + ' bloques cargados en memoria');
            resolve();
          }
        };
      });
    }).catch(function(err) {
      console.warn('📦 WorldBlocks: Error cargando datos:', err);
    });
  }

  function mapHeight(tx) {
    var h = ((tx - 1) / (MAX_TX - 1)) * (MAX_HEIGHT - BASE_HEIGHT) + BASE_HEIGHT;
    return Math.max(BASE_HEIGHT, Math.min(MAX_HEIGHT, h));
  }

  function ensureBlocksByTile(tileId) {
    if (!blocksByTile[tileId]) blocksByTile[tileId] = {};
  }

  function getOrCreateTileMesh(tileId) {
    if (tileInstanced[tileId]) return tileInstanced[tileId];

    var tileGeo = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    var mat = sharedMaterial.clone();
    var mesh = new THREE.InstancedMesh(tileGeo, mat, 1000);
    mesh.frustumCulled = false;
    mesh.count = 0;
    mesh.userData = { tileId: tileId, isInstanced: true };
    scene.add(mesh);
    tileInstanced[tileId] = mesh;
    tileInstanceCount[tileId] = 0;
    instanceBlockMap[tileId] = [];
    tileDirty[tileId] = true;
    tileNearDirty[tileId] = true;
    return mesh;
  }

  function showInstance(blockNum, tx) {
    if (shownBlocks[blockNum]) return;
    shownBlocks[blockNum] = true;

    var tileId = WorldGrid.getAtlasTile(blockNum);
    ensureBlocksByTile(tileId);
    blocksByTile[tileId][blockNum] = true;
    getOrCreateTileMesh(tileId);
    tileDirty[tileId] = true;
    tileNearDirty[tileId] = true;
  }

  function hideInstance(blockNum) {
    if (!shownBlocks[blockNum]) return;
    delete shownBlocks[blockNum];

    var tileId = WorldGrid.getAtlasTile(blockNum);
    if (blocksByTile[tileId]) {
      delete blocksByTile[tileId][blockNum];
    }
    if (tileDirty[tileId] !== undefined) {
      tileDirty[tileId] = true;
    }
    tileNearDirty[tileId] = true;
  }

  function loadTileImageData(tileId, callback) {
    if (tileImageData[tileId]) {
      callback(tileImageData[tileId]);
      return;
    }

    if (!AtlasCache) {
      callback(null);
      return;
    }

    AtlasCache.ensureAtlas(tileId, function(blob) {
      if (!blob) {
        callback(null);
        return;
      }

      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        var imageData = ctx.getImageData(0, 0, img.width, img.height);
        tileImageData[tileId] = imageData;

        var texture = new THREE.Texture(img);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.needsUpdate = true;
        tileTextures[tileId] = texture;

        URL.revokeObjectURL(url);
        callback(imageData);
      };
      img.onerror = function() {
        URL.revokeObjectURL(url);
        callback(null);
      };
      img.src = url;
    });
  }

  var WORLD_RADIUS = 100;

  function getCameraPosition() {
    var state = WorldControls.getState();
    var theta = state.theta;
    var phi = state.phi;
    var dist = state.distance;
    return {
      x: dist * Math.cos(phi) * Math.sin(theta),
      y: dist * Math.sin(phi),
      z: dist * Math.cos(phi) * Math.cos(theta)
    };
  }

  function getTileCenterDist(tileId, camPos) {
    var tileGx = tileId % 25;
    var tileGz = Math.floor(tileId / 25);
    var gx = tileGx * 40 + 20;
    var gz;
    if (tileGz < 20) {
      gz = tileGz * 25 + 12;
    } else {
      gz = 500 + (tileGz - 20) * 25 + 12;
    }
    var cached = WorldGrid.getCachedBlockInfo(gz * 1000 + gx);
    var px = cached.nx * WORLD_RADIUS;
    var py = cached.ny * WORLD_RADIUS;
    var pz = cached.nz * WORLD_RADIUS;
    var dx = px - camPos.x;
    var dy = py - camPos.y;
    var dz = pz - camPos.z;
    return dx * dx + dy * dy + dz * dz;
  }

  function rebuildTileInstanced(tileId) {
    tileDirty[tileId] = false;

    var blocksInTile = blocksByTile[tileId];
    if (!blocksInTile) return;

    var count = 0;
    for (var k in blocksInTile) count++;
    if (count === 0) {
      if (tileInstanced[tileId]) {
        tileInstanced[tileId].count = 0;
        tileInstanceCount[tileId] = 0;
      }
      return;
    }

    var mesh = getOrCreateTileMesh(tileId);
    mesh.count = count;
    tileInstanceCount[tileId] = count;

    var dummy = new THREE.Object3D();
    var uvData = new Float32Array(count * 4);
    var blockMap = new Array(count);
    var up = new THREE.Vector3(0, 1, 0);

    var idx = 0;
    for (var k in blocksInTile) {
      var blockNum = parseInt(k);
      blockMap[idx] = blockNum;

      var data = allBlocks[blockNum] || { tx: 1, hash: '' };
      var txVal = data.tx;

      var cached = WorldGrid.getCachedBlockInfo(blockNum);
      var height = mapHeight(txVal);
      var radius = WORLD_RADIUS + INSTANCE_OFFSET;

      dummy.position.set(cached.nx * radius, cached.ny * radius, cached.nz * radius);
      dummy.quaternion.setFromUnitVectors(up, _normalVec.set(cached.nx, cached.ny, cached.nz));
      dummy.scale.set(cached.scale, height / BLOCK_SIZE, cached.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);

      var info = WorldGrid.atlasInfo(blockNum);
      uvData[idx * 4] = info.u0;
      uvData[idx * 4 + 1] = info.v0;
      uvData[idx * 4 + 2] = info.u1 - info.u0;
      uvData[idx * 4 + 3] = info.v1 - info.v0;
      idx++;
    }

    mesh.instanceMatrix.needsUpdate = true;
    instanceBlockMap[tileId] = blockMap;

    mesh.geometry.setAttribute('aUvOffset',
      new THREE.InstancedBufferAttribute(uvData, 4));

    loadTileTexture(tileId, mesh);
  }

  function rebuildDirtyTiles() {
    var dirtyList = [];
    for (var tileId in tileDirty) {
      if (tileDirty[tileId]) dirtyList.push(parseInt(tileId));
    }

    if (dirtyList.length === 0) return;

    var camPos = getCameraPosition();
    dirtyList.sort(function(a, b) {
      return getTileCenterDist(a, camPos) - getTileCenterDist(b, camPos);
    });

    var startT = performance.now();
    var BUDGET_MS = 50;
    var d = 0;

    while (d < dirtyList.length && (performance.now() - startT) < BUDGET_MS) {
      rebuildTileInstanced(dirtyList[d]);
      d++;
    }

    if (d < dirtyList.length) {
      requestAnimationFrame(rebuildDirtyTiles);
    }
  }

  function loadTileTexture(tileId, mesh) {
    if (tileTextures[tileId]) {
      if (mesh.material.map !== tileTextures[tileId]) {
        mesh.material.map = tileTextures[tileId];
        mesh.material.needsUpdate = true;
      }
      return;
    }

    loadTileImageData(tileId, function() {
      if (tileTextures[tileId] && mesh) {
        mesh.material.map = tileTextures[tileId];
        mesh.material.needsUpdate = true;
      }
    });
  }

  var nearProgress = {};

  function rebuildNearOverlay() {
    var distance = getDistance();

    if (distance >= NEAR_DISTANCE) {
      for (var tileId in tileNearMeshes) {
        var tid = parseInt(tileId);
        scene.remove(tileNearMeshes[tid]);
        tileNearMeshes[tid].geometry.dispose();
        tileNearMeshes[tid].material.dispose();
        delete tileNearMeshes[tid];
        tileNearDirty[tid] = true;
        if (tileInstanced[tid]) tileInstanced[tid].visible = true;
      }
      nearProgress = {};
      removeStreetGround();
      return;
    }

    var nearList = [];
    for (var tileId in tileNearDirty) {
      if (tileNearDirty[tileId]) nearList.push(parseInt(tileId));
    }
    if (nearList.length === 0) return;

    var camPos = getCameraPosition();
    nearList.sort(function(a, b) {
      return getTileCenterDist(a, camPos) - getTileCenterDist(b, camPos);
    });

    var startT = performance.now();
    var BUDGET_MS = 50;
    var pending = 0;
    var nearTilesStarted = 0;

    for (var i = 0; i < nearList.length; i++) {
      if ((performance.now() - startT) >= BUDGET_MS) { pending++; continue; }
      if (nearTilesStarted >= MAX_NEAR_TILES_PER_FRAME) { pending++; continue; }
      var tid = nearList[i];

      if (tileNearMeshes[tid]) {
        tileNearDirty[tid] = false;
        continue;
      }
      if (nearProgress[tid]) { pending++; continue; }

      var blocksInTile = blocksByTile[tid];
      var hasBlocks = false;
      if (blocksInTile) { for (var bk in blocksInTile) { hasBlocks = true; break; } }
      if (!hasBlocks) {
        tileNearDirty[tid] = false;
        continue;
      }

      var imageData = tileImageData[tid];
      if (!imageData) {
        pending++;
        (function(tid2) {
          loadTileImageData(tid2, function() {
            if (getDistance() < NEAR_DISTANCE) {
              tileNearDirty[tid2] = true;
              rebuildNearOverlay();
            }
          });
        })(tid);
        continue;
      }

      beginNearTile(tid, imageData);
      nearTilesStarted++;
      pending++;
    }

    stepNearTiles(BUDGET_MS, startT);

    if (!streetGroundMesh && nearTilesStarted > 0) {
      var camPos = getCameraPosition();
      var camDir = new THREE.Vector3(camPos.x, camPos.y, camPos.z).normalize();
      createStreetGround(camPos, camDir);
    }

    if (pending > 0 || hasNearProgress()) {
      requestAnimationFrame(rebuildNearOverlay);
    }
  }

  function hasNearProgress() {
    for (var k in nearProgress) return true;
    return false;
  }

  function beginNearTile(tileId, imageData) {
    var blockNums = [];
    for (var bk in blocksByTile[tileId]) blockNums.push(parseInt(bk));
    if (blockNums.length === 0) return;

    nearProgress[tileId] = {
      blocks: blockNums,
      index: 0,
      imageData: imageData,
      positions: [],
      normals: [],
      colors: [],
      indices: [],
      vertexCount: 0
    };
  }

  function stepNearTiles(budgetMs, startT) {
    for (var tileId in nearProgress) {
      var prog = nearProgress[tileId];
      if (!prog) continue;

      while (prog.index < prog.blocks.length) {
        if ((performance.now() - startT) >= budgetMs) return;
        appendNearBlock(prog, parseInt(prog.blocks[prog.index]));
        prog.index++;
      }

      if (prog.index >= prog.blocks.length) {
        finishNearTile(parseInt(tileId), prog);
      }
    }
  }

  function appendNearBlock(prog, blockNum) {
    var data = allBlocks[blockNum] || { tx: 1, hash: '' };
    var tx = data.tx;
    var hash = data.hash;

    var cached = WorldGrid.getCachedBlockInfo(blockNum);
    var scaleX = cached.scale;
    var scaleZ = cached.scale;

    var distance = getDistance();
    var t = Math.max(0, Math.min(1, (NEAR_DISTANCE - distance) / (NEAR_DISTANCE - STREET_MIN_DIST)));
    var heightFactor = 1 + t * 4;

    var gx = blockNum % GRID_SIZE;
    var gz = Math.floor(blockNum / GRID_SIZE);
    var col = gx % ATLAS_COLS;
    var row;
    if (gz < 500) {
      row = (ATLAS_ROWS - 1) - (gz % ATLAS_ROWS);
    } else {
      row = (gz - 500) % ATLAS_ROWS;
    }

    var geoData = Parcel3D.buildBlockGeometryFromImage(
      prog.imageData, col, row, CELL_SIZE, blockNum, tx, hash
    );

    _normalVec.set(cached.nx, cached.ny, cached.nz);
    _quat.setFromUnitVectors(_up, _normalVec);
    _mat4.makeRotationFromQuaternion(_quat);

    var radius = WORLD_RADIUS + INSTANCE_OFFSET;
    var bx = cached.nx * radius;
    var by = cached.ny * radius;
    var bz = cached.nz * radius;

    var positionsArr = geoData.positions;
    var normalsArr = geoData.normals;
    var colorsArr = geoData.colors;
    var indicesArr = geoData.indices;

    for (var j = 0; j < positionsArr.length; j += 3) {
      var lx = positionsArr[j] * BLOCK_SIZE * scaleX;
      var ly = positionsArr[j + 1] > 0 ? positionsArr[j + 1] * heightFactor : positionsArr[j + 1];
      var lz = positionsArr[j + 2] * BLOCK_SIZE * scaleZ;

      _localOffset.set(lx, ly, lz);
      _localOffset.applyMatrix4(_mat4);

      prog.positions.push(bx + _localOffset.x, by + _localOffset.y, bz + _localOffset.z);

      _nVec.set(normalsArr[j], normalsArr[j + 1], normalsArr[j + 2]);
      _nVec.applyQuaternion(_quat);
      _nVec.normalize();
      prog.normals.push(_nVec.x, _nVec.y, _nVec.z);

      prog.colors.push(colorsArr[j], colorsArr[j + 1], colorsArr[j + 2]);
    }

    for (var j = 0; j < indicesArr.length; j++) {
      prog.indices.push(indicesArr[j] + prog.vertexCount);
    }

    prog.vertexCount += positionsArr.length / 3;
  }

  function finishNearTile(tileId, prog) {
    if (prog.positions.length === 0) return;

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(prog.positions), 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(prog.normals), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(prog.colors), 3));
    geo.setIndex(new THREE.BufferAttribute(new Uint32Array(prog.indices), 1));

    var mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.6,
      metalness: 0.05,
      flatShading: true
    });

    if (tileNearMeshes[tileId]) {
      scene.remove(tileNearMeshes[tileId]);
      tileNearMeshes[tileId].geometry.dispose();
      tileNearMeshes[tileId].material.dispose();
    }

    var mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.userData = { tileId: tileId, isNearOverlay: true };
    scene.add(mesh);
    tileNearMeshes[tileId] = mesh;
    tileNearDirty[tileId] = false;
    if (tileInstanced[tileId]) tileInstanced[tileId].visible = false;
  }

  function createStreetGround(camPos, camDir) {
    if (streetGroundMesh) {
      scene.remove(streetGroundMesh);
      streetGroundMesh.geometry.dispose();
      streetGroundMesh.material.dispose();
      streetGroundMesh = null;
    }

    var geo = new THREE.CircleGeometry(4, 32);
    var positions = geo.attributes.position.array;
    for (var i = 0; i < positions.length; i += 3) {
      positions[i + 2] = 0;
    }

    var colors = new Float32Array(positions.length);
    for (var i = 0; i < positions.length; i += 3) {
      var x = positions[i];
      var absX = Math.abs(x);
      var r, g, b;
      if (absX > 0.15) {
        r = 0.45; g = 0.45; b = 0.48;
      } else if (absX > 0.12) {
        r = 0.30; g = 0.30; b = 0.33;
      } else {
        r = 0.88; g = 0.88; b = 0.85;
      }
      colors[i] = r;
      colors[i + 1] = g;
      colors[i + 2] = b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    var mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.8,
      metalness: 0.0,
      flatShading: false
    });

    streetGroundMesh = new THREE.Mesh(geo, mat);
    streetGroundMesh.frustumCulled = false;
    streetGroundMesh.renderOrder = -1;

    var pos = new THREE.Vector3(
      camDir.x * (WORLD_RADIUS + INSTANCE_OFFSET - 0.02),
      camDir.y * (WORLD_RADIUS + INSTANCE_OFFSET - 0.02),
      camDir.z * (WORLD_RADIUS + INSTANCE_OFFSET - 0.02)
    );
    streetGroundMesh.position.copy(pos);

    var up = new THREE.Vector3(0, 1, 0);
    streetGroundMesh.quaternion.setFromUnitVectors(up, camDir.clone().normalize());

    scene.add(streetGroundMesh);
  }

  function removeStreetGround() {
    if (streetGroundMesh) {
      scene.remove(streetGroundMesh);
      streetGroundMesh.geometry.dispose();
      streetGroundMesh.material.dispose();
      streetGroundMesh = null;
    }
  }

  var MAX_VISIBLE = 400000;

  function calculateVisibleBlocks(nearDir, distance) {
    var camPhi = Math.asin(Math.max(-1, Math.min(1, nearDir.y)));
    var camTheta = Math.atan2(nearDir.z, nearDir.x);
    if (camTheta < 0) camTheta += Math.PI * 2;

    var gxCenter = Math.round((camTheta / (Math.PI * 2)) * 1000) % 1000;

    var RADIUS = 100;
    var angularRadius = Math.acos(Math.min(0.999, RADIUS / Math.max(distance, RADIUS + 0.1)));
    var gzRadius = Math.ceil((angularRadius * 180 / Math.PI) / 0.18);

    var camGz;
    if (camPhi >= 0) {
      camGz = Math.round((camPhi / (Math.PI / 2)) * 499);
    } else {
      camGz = 500 + Math.round((-camPhi / (Math.PI / 2)) * 455);
    }
    camGz = Math.max(0, Math.min(955, camGz));

    var visible = [];

    function scanGz(gz) {
      if (gz < 0 || gz > 955) return;
      var phi = getPhiFromGz(gz);
      var latDiff = Math.abs(phi - camPhi);
      if (latDiff > Math.PI / 2) return;

      var latFactor = Math.cos(phi);
      var gxRadius = Math.min(Math.ceil(gzRadius / Math.max(latFactor, 0.15)), 500);
      var gxMin = gxCenter - gxRadius;
      var gxMax = gxCenter + gxRadius;

      for (var gx = gxMin; gx <= gxMax; gx++) {
        var gxw = ((gx % 1000) + 1000) % 1000;
        var blockNum = gz * 1000 + gxw;

        var cached = WorldGrid.getCachedBlockInfo(blockNum);

        var dot = cached.nx * nearDir.x + cached.ny * nearDir.y + cached.nz * nearDir.z;

        if (dot > -0.1) {
          visible.push({ blockNum: blockNum, dot: dot });
        }
      }
    }

    for (var step = 0; step <= 955; step++) {
      scanGz(camGz + step);
      if (step > 0) scanGz(camGz - step);
      if (visible.length >= MAX_VISIBLE) break;
    }

    visible.sort(function(a, b) { return b.dot - a.dot; });

    if (visible.length > MAX_VISIBLE) visible.length = MAX_VISIBLE;

    return visible;
  }

  var lastUpdateTheta = null;
  var lastUpdatePhi = null;
  var lastUpdateDist = null;

  function updateVisible(theta, phi, distance) {
    if (lastUpdateTheta !== null) {
      var dTheta = Math.abs(theta - lastUpdateTheta);
      var dPhi = Math.abs(phi - lastUpdatePhi);
      var dDist = Math.abs(distance - lastUpdateDist);
      var debounce = isZooming ? ZOOM_DEBOUNCE : LOAD_DEBOUNCE;
      if (dTheta < 0.01 && dPhi < 0.01 && dDist < 2) return;
    }
    lastUpdateTheta = theta;
    lastUpdatePhi = phi;
    lastUpdateDist = distance;

    var camX = distance * Math.cos(phi) * Math.sin(theta);
    var camY = distance * Math.sin(phi);
    var camZ = distance * Math.cos(phi) * Math.cos(theta);
    var nearDir = new THREE.Vector3(camX, camY, camZ).normalize();

    var visible = calculateVisibleBlocks(nearDir, distance);

    applyVisible(visible);

    rebuildDirtyTiles();
    rebuildNearOverlay();
  }

  function applyVisible(visible) {
    var newSet = {};
    for (var i = 0; i < visible.length; i++) {
      newSet[visible[i].blockNum] = true;
    }

    var toHide = [];
    for (var blockNum in shownBlocks) {
      var bn = parseInt(blockNum);
      if (bn === 0) continue;
      if (!newSet[bn]) toHide.push(bn);
    }
    for (var i = 0; i < toHide.length; i++) {
      hideInstance(toHide[i]);
    }

    var toShow = [];
    for (var i = 0; i < visible.length; i++) {
      var entry = visible[i];
      if (entry.blockNum === 0) continue;
      if (!shownBlocks[entry.blockNum]) toShow.push(entry);
    }

    for (var i = 0; i < toShow.length; i++) {
      var entry = toShow[i];
      var bn = entry.blockNum;
      var data = allBlocks[bn];
      if (data) {
        showInstance(bn, data.tx);
        blockData[bn] = data;
      } else {
        showInstance(bn, 1);
      }
    }
  }

  function getDistance() {
    var state = WorldControls.getState();
    return state ? state.distance : 300;
  }

  function loadChunk(theta, phi, distance, callback) {
    updateVisible(theta, phi, distance);
    if (callback) callback();
  }

  function scheduleLoad(theta, phi) {
    if (loadTimer) clearTimeout(loadTimer);
    loadTimer = setTimeout(function() {
      var state = WorldControls.getState();
      updateVisible(theta, phi, state.distance);
    }, LOAD_DEBOUNCE);
  }

  function setZooming(zooming) {
    isZooming = zooming;
    if (zoomTimer) { clearTimeout(zoomTimer); zoomTimer = null; }
    if (zooming) {
      zoomTimer = setTimeout(function() {
        isZooming = false;
        rebuildNearOverlay();
      }, 600);
    }
  }

  function getMeshAt(blockNumber) {
    if (blockNumber === 0) return block0Mesh;
    var tileId = WorldGrid.getAtlasTile(blockNumber);
    if (tileNearMeshes[tileId]) return tileNearMeshes[tileId];
    return tileInstanced[tileId] || null;
  }

  function getBlockData(blockNumber) {
    return blockData[blockNumber] || null;
  }

  function getAllMeshes() {
    var result = { 0: block0Mesh };
    for (var tileId in tileInstanced) {
      result['tile_' + tileId] = tileInstanced[tileId];
    }
    for (var tileId in tileNearMeshes) {
      result['near_' + tileId] = tileNearMeshes[tileId];
    }
    return result;
  }

  function getInstancedMesh() { return null; }

  function getBlockByInstanceId(instanceId) {
    return -1;
  }

  function getBlockByInstanceIdInMesh(mesh, instanceId) {
    if (!mesh || !mesh.userData) return -1;
    var tileId = mesh.userData.tileId;
    if (tileId === undefined) return -1;
    var blockMap = instanceBlockMap[tileId];
    if (!blockMap || instanceId < 0 || instanceId >= blockMap.length) return -1;
    return blockMap[instanceId];
  }

  function removeBlockMesh(blockNumber) {
    if (blockNumber === 0) return;
    hideInstance(blockNumber);
    delete blockData[blockNumber];
  }

  function createBlockMesh(blockNumber, tx, hash) {
    if (blockNumber === 0) return;
    blockData[blockNumber] = { tx: tx, hash: hash };
    showInstance(blockNumber, tx);
  }

  function cleanupDistant() {
    var visibleTiles = {};
    for (var bn in shownBlocks) {
      var tileId = WorldGrid.getAtlasTile(parseInt(bn));
      visibleTiles[tileId] = true;
    }

    for (var tileId in tileInstanced) {
      if (!visibleTiles[tileId]) {
        var m = tileInstanced[tileId];
        if (m && m.parent) m.parent.remove(m);
        if (m && m.geometry) m.geometry.dispose();
        if (m && m.material && m.material !== sharedMaterial) m.material.dispose();
        delete tileInstanced[tileId];
        delete tileDirty[tileId];
        delete tileNearDirty[tileId];
        delete tileImageData[tileId];
        delete tileTextures[tileId];
        delete tileInstanceCount[tileId];
        delete blocksByTile[tileId];
        delete instanceBlockMap[tileId];
      }
    }

    for (var tileId in tileNearMeshes) {
      if (!visibleTiles[tileId]) {
        var m = tileNearMeshes[tileId];
        if (m && m.parent) m.parent.remove(m);
        if (m && m.geometry) m.geometry.dispose();
        if (m && m.material) m.material.dispose();
        delete tileNearMeshes[tileId];
        delete tileNearDirty[tileId];
        delete nearProgress[tileId];
      }
    }
  }

  function startBackgroundLoad() {
    if (bgLoadInterval) return;
    console.log('🗺️ WorldBlocks: Iniciando carga continua de 3D...');
    bgLoadInterval = setInterval(function() {
      var state = WorldControls.getState();
      if (!state) return;
      rebuildDirtyTiles();
      rebuildNearOverlay();
    }, 2000);
  }

  function stopBackgroundLoad() {
    if (bgLoadInterval) {
      clearInterval(bgLoadInterval);
      bgLoadInterval = null;
      console.log('🗺️ WorldBlocks: Carga continua detenida.');
    }
  }

  return {
    init: init,
    destroy: destroy,
    loadChunk: loadChunk,
    scheduleLoad: scheduleLoad,
    setZooming: setZooming,
    startBackgroundLoad: startBackgroundLoad,
    stopBackgroundLoad: stopBackgroundLoad,
    cleanupDistant: cleanupDistant,
    getMeshAt: getMeshAt,
    getBlockData: getBlockData,
    getAllMeshes: getAllMeshes,
    getInstancedMesh: getInstancedMesh,
    getBlockByInstanceId: getBlockByInstanceId,
    getBlockByInstanceIdInMesh: getBlockByInstanceIdInMesh,
    removeBlockMesh: removeBlockMesh,
    createBlockMesh: createBlockMesh
  };
})();
