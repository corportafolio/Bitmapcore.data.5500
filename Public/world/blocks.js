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

  var tileInstanced = {};
  var tileDirty = {};
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
    createStreetGround();
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

    tileInstanced = {};
    tileDirty = {};
    tileTextures = {};
    tileInstanceCount = {};
    blocksByTile = {};
    instanceBlockMap = {};
    shownBlocks = {};
    blockData = {};
    block0Mesh = null;

    removeStreetGround();

    if (sharedBoxGeo) { sharedBoxGeo.dispose(); sharedBoxGeo = null; }
    sharedMaterial = null;
  }

  function createAtlasMaterial() {
    var mat = new THREE.MeshStandardMaterial({
      roughness: 0.6,
      metalness: 0.05
    });

    mat.onBeforeCompile = function(shader) {
      console.log('🗺️ createAtlasMaterial: onBeforeCompile RUNNING, map=', shader.uniforms.map ? 'yes' : 'no');
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
    mesh.visible = false;
    scene.add(mesh);
    tileInstanced[tileId] = mesh;
    tileInstanceCount[tileId] = 0;
    instanceBlockMap[tileId] = [];
    tileDirty[tileId] = true;
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
  }

  function loadTileImageData(tileId, callback) {
    if (!AtlasCache) { console.warn('🗺️ loadTileImageData: AtlasCache not available'); callback(null); return; }

    console.log('🗺️ loadTileImageData: requesting atlas for tile', tileId);
    AtlasCache.ensureAtlas(tileId, function(blob) {
      if (!blob) { console.warn('🗺️ loadTileImageData: no blob for tile', tileId); callback(null); return; }

      console.log('🗺️ loadTileImageData: got blob for tile', tileId, 'size=', blob.size);
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function() {
        console.log('🗺️ loadTileImageData: image loaded for tile', tileId, img.width + 'x' + img.height);
        var canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        var texture = new THREE.Texture(img);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.needsUpdate = true;
        tileTextures[tileId] = texture;

        URL.revokeObjectURL(url);
        console.log('🗺️ loadTileImageData: texture created for tile', tileId);
        callback(texture);
      };
      img.onerror = function() {
        console.error('🗺️ loadTileImageData: image load error for tile', tileId);
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
      dummy.quaternion.setFromUnitVectors(_up, _normalVec.set(cached.nx, cached.ny, cached.nz));
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
        console.log('🗺️ loadTileTexture: using cached texture for tile', tileId);
        // Replace material with fresh one to ensure shader compiles with texture
        var newMat = createAtlasMaterial();
        newMat.map = tileTextures[tileId];
        newMat.needsUpdate = true;
        mesh.material = newMat;
      }
      if (!mesh.visible) {
        mesh.visible = true;
        console.log('🗺️ loadTileTexture: mesh visible=true for tile', tileId, '(cached texture)');
      }
      return;
    }

    console.log('🗺️ loadTileTexture: loading texture for tile', tileId);
    loadTileImageData(tileId, function(texture) {
      if (texture && mesh) {
        console.log('🗺️ loadTileTexture: texture loaded for tile', tileId, 'creating fresh material with atlas shader');
        
        // Create fresh material with atlas shader to force proper compile with texture
        var newMat = createAtlasMaterial();
        newMat.map = texture;
        newMat.needsUpdate = true;
        mesh.material = newMat;
        
        mesh.visible = true;
        console.log('🗺️ loadTileTexture: fresh material applied, mesh visible=true for tile', tileId);
      } else {
        console.warn('🗺️ loadTileTexture: texture load failed for tile', tileId);
      }
    });
  }

  function createStreetGround() {
    if (streetGroundMesh) return;

    var R = 30;
    var SEG = 64;
    var roadWidth = 2.0;
    var sidewalkWidth = 0.6;
    var laneWidth = (roadWidth - 0.1) / 2;

    var positions = [];
    var colors = [];
    var indices = [];
    var vi = 0;

    function addQuad(x1, z1, x2, z2, r, g, b) {
      positions.push(x1, 0, z1, x2, 0, z1, x2, 0, z2, x1, 0, z2);
      colors.push(r, g, b, r, g, b, r, g, b, r, g, b);
      indices.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
      vi += 4;
    }

    for (var i = 0; i < SEG; i++) {
      var a0 = (i / SEG) * Math.PI * 2;
      var a1 = ((i + 1) / SEG) * Math.PI * 2;
      var cos0 = Math.cos(a0), sin0 = Math.sin(a0);
      var cos1 = Math.cos(a1), sin1 = Math.sin(a1);

      function px(r, c) { return c * r; }
      function pz(r, s) { return s * r; }

      var sw = sidewalkWidth;
      var hw = roadWidth / 2;
      var lw = 0.08;

      addQuad(px(sw, cos0), pz(sw, sin0), px(sw, cos1), pz(sw, sin1), 0.50, 0.50, 0.52);
      addQuad(px(hw, cos0), pz(hw, sin0), px(hw, cos1), pz(hw, sin1), 0.32, 0.32, 0.35);
      addQuad(px(lw, cos0), pz(lw, sin0), px(lw, cos1), pz(lw, sin1), 0.85, 0.85, 0.80);
      addQuad(px(-lw, cos0), pz(-lw, sin0), px(-lw, cos1), pz(-lw, sin1), 0.85, 0.85, 0.80);
      addQuad(px(-hw, cos0), pz(-hw, sin0), px(-hw, cos1), pz(-hw, sin1), 0.32, 0.32, 0.35);
      addQuad(px(-sw, cos0), pz(-sw, sin0), px(-sw, cos1), pz(-sw, sin1), 0.50, 0.50, 0.52);
    }

    var posArr = new Float32Array(positions);
    var colArr = new Float32Array(colors);
    var idxArr = new Uint32Array(indices);

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
    geo.setIndex(new THREE.BufferAttribute(idxArr, 1));

    var mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.0,
      side: THREE.DoubleSide
    });

    streetGroundMesh = new THREE.Mesh(geo, mat);
    streetGroundMesh.frustumCulled = false;
    streetGroundMesh.renderOrder = -1;
    streetGroundMesh.position.y = 0;
    scene.add(streetGroundMesh);
  }

  function updateStreetGround() {
    if (!streetGroundMesh) return;
    var distance = getDistance();
    if (distance > 120) {
      streetGroundMesh.visible = false;
      return;
    }
    streetGroundMesh.visible = true;

    var camPos = getCameraPosition();
    var camDir = new THREE.Vector3(camPos.x, camPos.y, camPos.z).normalize();
    var surfR = WORLD_RADIUS + INSTANCE_OFFSET - 0.05;

    streetGroundMesh.position.set(camDir.x * surfR, camDir.y * surfR, camDir.z * surfR);

    var localZ = new THREE.Vector3(0, 0, 1);
    streetGroundMesh.quaternion.setFromUnitVectors(localZ, camDir);
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
    updateStreetGround();
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
  }

  function getMeshAt(blockNumber) {
    if (blockNumber === 0) return block0Mesh;
    var tileId = WorldGrid.getAtlasTile(blockNumber);
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
        delete tileTextures[tileId];
        delete tileInstanceCount[tileId];
        delete blocksByTile[tileId];
        delete instanceBlockMap[tileId];
      }
    }
  }

  function startBackgroundLoad() {
    if (bgLoadInterval) return;
    bgLoadInterval = setInterval(function() {
      var state = WorldControls.getState();
      if (!state) return;
      rebuildDirtyTiles();
      updateStreetGround();
    }, 2000);
  }

  function stopBackgroundLoad() {
    if (bgLoadInterval) {
      clearInterval(bgLoadInterval);
      bgLoadInterval = null;
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
