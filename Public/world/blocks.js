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

  var atlas2Textures = {};
  var atlas2Meshes = {};
  var atlas2Dirty = {};
  var currentLOD = 'atlas1';

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
  var streetVisible = false;

  var atlasPlanesGroup = null;
  var atlasPlanesShown = false;
  var atlasPlaneMap = {}; // tileId -> mesh

  var prefetchQueue = [];
  var prefetchInFlight = 0;
  var blockImageMeshes = {};
  var blockImageTextures = {};
  var blockImageQueue = [];
  var blockImageInFlight = 0;

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
    if (typeof Atlas2Cache !== 'undefined' && Atlas2Cache.preloadAll) {
      Atlas2Cache.preloadAll(function() {
        console.log('🗺️ WorldBlocks: Atlas2 precarga completada (36 tiles)');
        if (typeof AtlasCache !== 'undefined' && AtlasCache.preloadAll) {
          AtlasCache.preloadAll(function() {
            console.log('🗺️ WorldBlocks: Atlas1 precarga completada');
          });
        }
      });
    } else if (typeof AtlasCache !== 'undefined' && AtlasCache.preloadAll) {
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

    for (var tid in atlas2Meshes) {
      var m2 = atlas2Meshes[tid];
      if (m2 && m2.parent) m2.parent.remove(m2);
      if (m2 && m2.geometry) m2.geometry.dispose();
      if (m2 && m2.material) m2.material.dispose();
    }

    tileInstanced = {};
    tileDirty = {};
    tileTextures = {};
    tileInstanceCount = {};
    atlas2Meshes = {};
    atlas2Textures = {};
    atlas2Dirty = {};
    currentLOD = 'atlas1';
    blocksByTile = {};
    instanceBlockMap = {};
    shownBlocks = {};
    blockData = {};
    block0Mesh = null;

    removeStreetGround();

    if (sharedBoxGeo) { sharedBoxGeo.dispose(); sharedBoxGeo = null; }
    sharedMaterial = null;
  }

  function createEmptyTexture() {
    var canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, 1, 1);
    var tex = new THREE.Texture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  function createAtlasMaterial() {
    var mat = new THREE.MeshStandardMaterial({
      roughness: 0.6,
      metalness: 0.05,
      map: createEmptyTexture()
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
        'vec4 texelColor = texture( map, atlasUV );\n' +
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
    var mesh = new THREE.InstancedMesh(tileGeo, createAtlasMaterial(), 1000);
    mesh.frustumCulled = false;
    mesh.count = 0;
    mesh.userData = { tileId: tileId, isInstanced: true };
    mesh.visible = true;
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
        // If we have an atlas plane shown for this tile, update its material
        if (atlasPlaneMap[tileId]) {
          atlasPlaneMap[tileId].material.map = texture;
          atlasPlaneMap[tileId].material.needsUpdate = true;
        }

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

  function enqueuePrefetch(tileId) {
    if (!AtlasCache) return;
    if (tileTextures[tileId]) return;
    if (prefetchQueue.indexOf(tileId) !== -1) return;
    prefetchQueue.push(tileId);
    processPrefetchQueue();
  }

  function processPrefetchQueue() {
    var MAX = (window.WorldConfig && window.WorldConfig.MAX_CONCURRENT_FETCHES) || 6;
    while (prefetchInFlight < MAX && prefetchQueue.length > 0) {
      var next = prefetchQueue.shift();
      prefetchInFlight++;
      loadTileImageData(next, function(tex) {
        prefetchInFlight--;
        // continue processing
        setTimeout(processPrefetchQueue, 0);
      });
    }
  }

  function prefetchNeighbors(tileIds) {
    if (!tileIds || !tileIds.length) return;
    tileIds.forEach(function(tid) { if (tid >= 0 && tid < 956) enqueuePrefetch(tid); });
  }

  function enqueueBlockImage(blockNum) {
    var cfg = window.WorldConfig || {};
    if (blockImageMeshes[blockNum]) return;
    if (blockImageQueue.indexOf(blockNum) !== -1) return;
    blockImageQueue.push(blockNum);
    processBlockImageQueue();
  }

  function processBlockImageQueue() {
    var cfg = window.WorldConfig || {};
    var MAX = cfg.MAX_CONCURRENT_FETCHES_BLOCKS || 3;
    while (blockImageInFlight < MAX && blockImageQueue.length > 0 && Object.keys(blockImageMeshes).length < (cfg.MAX_BLOCK_IMAGES_AT_3 || 15)) {
      var bn = blockImageQueue.shift();
      blockImageInFlight++;
      fetchBlockImage(bn).then(function(mesh) {
        blockImageInFlight--;
        setTimeout(processBlockImageQueue, 0);
      }).catch(function() { blockImageInFlight--; setTimeout(processBlockImageQueue,0); });
    }
  }

  function buildBlockImageUrl(blockNum) {
    var block = allBlocks[blockNum] || { etiquetas: '', tx: 1, hash: '' };
    var etiquetas = encodeURIComponent(block.etiquetas || '');
    var tx = block.tx || 1;
    var hash = encodeURIComponent(block.hash || '');
    var isPerfect = (block.etiquetas || '').toLowerCase().indexOf('grid') !== -1;
    var isPunk = (block.etiquetas || '').toLowerCase().indexOf('punk') !== -1;
    return '/api/v1/block-image/' + blockNum + '?v=5&size=256&etiquetas=' + etiquetas + '&tx=' + tx + '&hash=' + hash + '&grid=' + isPerfect + '&punk=' + isPunk;
  }

  function fetchBlockImage(blockNum) {
    return new Promise(function(resolve, reject) {
      if (blockImageMeshes[blockNum]) return resolve(blockImageMeshes[blockNum]);
      var url = buildBlockImageUrl(blockNum);
      fetch(url).then(function(r){ if (!r.ok) throw new Error('fetch failed'); return r.blob(); }).then(function(blob){
        var imgUrl = URL.createObjectURL(blob);
        var img = new Image();
        img.onload = function() {
          var tex = new THREE.Texture(img);
          tex.magFilter = THREE.NearestFilter;
          tex.minFilter = THREE.NearestFilter;
          tex.needsUpdate = true;
          blockImageTextures[blockNum] = tex;
          URL.revokeObjectURL(imgUrl);

          // create box mesh
          var geo = new THREE.BoxGeometry(BLOCK_SIZE * 2.5, BLOCK_SIZE * 2.5, BLOCK_SIZE * 2.5);
          var mat = new THREE.MeshBasicMaterial({ map: tex });
          var mesh = new THREE.Mesh(geo, mat);
          var cached = WorldGrid.getCachedBlockInfo(blockNum);
          var radius = WORLD_RADIUS + INSTANCE_OFFSET;
          mesh.position.set(cached.nx * radius, cached.ny * radius, cached.nz * radius);
          mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), new THREE.Vector3(cached.nx, cached.ny, cached.nz));
          mesh.frustumCulled = false;
          scene.add(mesh);
          blockImageMeshes[blockNum] = mesh;
          resolve(mesh);
        };
        img.onerror = function() { URL.revokeObjectURL(imgUrl); reject(new Error('img error')); };
        img.src = imgUrl;
      }).catch(function(err){ console.warn('fetchBlockImage error', err); reject(err); });
    });
  }

  function clearBlockImages() {
    for (var bn in blockImageMeshes) {
      var m = blockImageMeshes[bn];
      if (m && m.parent) m.parent.remove(m);
      if (m && m.geometry) m.geometry.dispose();
      if (m && m.material) m.material.dispose();
    }
    blockImageMeshes = {};
    // keep textures maybe
  }

  function createAtlasPlanes(tileIds) {
    if (!atlasPlanesGroup) {
      atlasPlanesGroup = new THREE.Group();
      atlasPlanesGroup.frustumCulled = false;
      atlasPlanesGroup.renderOrder = 10;
      scene.add(atlasPlanesGroup);
    }
    atlasPlaneMap = atlasPlaneMap || {};
    // dispose previous children before clearing to avoid leaks
    if (atlasPlanesGroup.children && atlasPlanesGroup.children.length > 0) {
      var old = atlasPlanesGroup.children.slice();
      for (var i = 0; i < old.length; i++) {
        var c = old[i];
        atlasPlanesGroup.remove(c);
        if (c.geometry) c.geometry.dispose();
        if (c.material && c.material.map === undefined) c.material.dispose();
      }
    }
    tileIds.forEach(function(tileId) {
      var tileGx = tileId % 25;
      var tileGz = Math.floor(tileId / 25);
      var gx = tileGx * 40 + 20;
      var gz;
      if (tileGz < 20) gz = tileGz * 25 + 12; else gz = 500 + (tileGz - 20) * 25 + 12;
      var cached = WorldGrid.getCachedBlockInfo(gz * 1000 + gx);
      var px = cached.nx * WORLD_RADIUS;
      var py = cached.ny * WORLD_RADIUS;
      var pz = cached.nz * WORLD_RADIUS;
      var pos = new THREE.Vector3(px, py, pz);

      var size = (BLOCK_SIZE * 20) * (cached.scale || 1.0);
      var geo = new THREE.PlaneGeometry(size, size);
      var mat = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
      var plane = new THREE.Mesh(geo, mat);
      plane.position.copy(pos.clone().multiplyScalar(1.01));
      plane.lookAt(new THREE.Vector3(0,0,0));
      atlasPlanesGroup.add(plane);
      atlasPlaneMap[tileId] = plane;
      // hide instanced mesh for this tile if exists
      if (tileInstanced[tileId]) tileInstanced[tileId].visible = false;
      // if texture loaded, apply
      if (tileTextures[tileId]) { plane.material.map = tileTextures[tileId]; plane.material.needsUpdate = true; }
    });
    atlasPlanesShown = true;
  }

  function removeAtlasPlanes() {
    if (!atlasPlanesGroup) return;
    atlasPlanesGroup.children.slice().forEach(function(c) {
      atlasPlanesGroup.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material && c.material.map === undefined) c.material.dispose();
    });
    atlasPlaneMap = {};
    // restore instanced meshes
    for (var tid in tileInstanced) { if (tileInstanced[tid]) tileInstanced[tid].visible = true; }
    atlasPlanesShown = false;
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
    if (currentLOD === 'atlas2') return;
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
        mesh.material.map = tileTextures[tileId];
        mesh.material.needsUpdate = true;
      }
      return;
    }

    console.log('🗺️ loadTileTexture: loading texture for tile', tileId);
    loadTileImageData(tileId, function(texture) {
      if (texture && mesh) {
        console.log('🗺️ loadTileTexture: texture loaded for tile', tileId, 'applying to existing material');
        mesh.material.map = texture;
        mesh.material.needsUpdate = true;
        console.log('🗺️ loadTileTexture: texture applied for tile', tileId);
      } else {
        console.warn('🗺️ loadTileTexture: texture load failed for tile', tileId);
      }
    });
  }

  function loadAtlas2Texture(tileId, mesh) {
    if (atlas2Textures[tileId]) {
      if (mesh.material.map !== atlas2Textures[tileId]) {
        mesh.material.map = atlas2Textures[tileId];
        mesh.material.needsUpdate = true;
      }
      return;
    }
    if (typeof Atlas2Cache !== 'undefined' && Atlas2Cache.ensureAtlas2) {
      Atlas2Cache.ensureAtlas2(tileId, function(blob) {
        if (!blob) return;
        var url = URL.createObjectURL(blob);
        var img = new Image();
        img.onload = function() {
          var tex = new THREE.Texture(img);
          tex.magFilter = THREE.NearestFilter;
          tex.minFilter = THREE.NearestFilter;
          tex.needsUpdate = true;
          atlas2Textures[tileId] = tex;
          if (mesh) {
            mesh.material.map = tex;
            mesh.material.needsUpdate = true;
          }
          URL.revokeObjectURL(url);
        };
        img.src = url;
      });
    }
  }

  function getOrCreateAtlas2Mesh(tileId) {
    if (atlas2Meshes[tileId]) return atlas2Meshes[tileId];
    var geo = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    var mat = createAtlasMaterial();
    var mesh = new THREE.InstancedMesh(geo, mat, 1000);
    mesh.frustumCulled = false;
    mesh.count = 0;
    mesh.userData = { tileId: tileId, isAtlas2: true };
    mesh.visible = false;
    scene.add(mesh);
    atlas2Meshes[tileId] = mesh;
    return mesh;
  }

  function rebuildAtlas2Mesh() {
    for (var tid in atlas2Meshes) {
      var m = atlas2Meshes[tid];
      if (m && m.parent) m.parent.remove(m);
      if (m && m.geometry) m.geometry.dispose();
      if (m && m.material) m.material.dispose();
    }
    atlas2Meshes = {};

    var blocksByA2Tile = {};
    for (var blockNum in shownBlocks) {
      var bn = parseInt(blockNum);
      if (bn === 0) continue;
      var a2Tile = WorldGrid.getAtlas2Tile(bn);
      if (!blocksByA2Tile[a2Tile]) blocksByA2Tile[a2Tile] = {};
      blocksByA2Tile[a2Tile][bn] = true;
    }

    for (var a2TileStr in blocksByA2Tile) {
      var a2Tile = parseInt(a2TileStr);
      var blocks = blocksByA2Tile[a2Tile];
      var count = 0;
      for (var k in blocks) count++;
      if (count === 0) continue;

      var mesh = getOrCreateAtlas2Mesh(a2Tile);
      mesh.count = count;

      var dummy = new THREE.Object3D();
      var uvData = new Float32Array(count * 4);
      var idx = 0;

      for (var k in blocks) {
        var blockNum = parseInt(k);
        var cached = WorldGrid.getCachedBlockInfo(blockNum);
        var data = allBlocks[blockNum] || { tx: 1 };
        var height = mapHeight(data.tx);
        var radius = WORLD_RADIUS + INSTANCE_OFFSET;

        dummy.position.set(cached.nx * radius, cached.ny * radius, cached.nz * radius);
        dummy.quaternion.setFromUnitVectors(_up, _normalVec.set(cached.nx, cached.ny, cached.nz));
        dummy.scale.set(cached.scale, height / BLOCK_SIZE, cached.scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);

        var info = WorldGrid.atlas2Info(blockNum);
        uvData[idx * 4] = info.u0;
        uvData[idx * 4 + 1] = info.v0;
        uvData[idx * 4 + 2] = info.u1 - info.u0;
        uvData[idx * 4 + 3] = info.v1 - info.v0;
        idx++;
      }

      mesh.instanceMatrix.needsUpdate = true;
      mesh.geometry.setAttribute('aUvOffset', new THREE.InstancedBufferAttribute(uvData, 4));
      loadAtlas2Texture(a2Tile, mesh);
    }
  }

  function showAtlas2LOD() {
    if (currentLOD === 'atlas2') return;
    currentLOD = 'atlas2';
    for (var tid in tileInstanced) { if (tileInstanced[tid]) tileInstanced[tid].visible = false; }
    rebuildAtlas2Mesh();
    for (var tid in atlas2Meshes) { if (atlas2Meshes[tid]) atlas2Meshes[tid].visible = true; }
  }

  function hideAtlas2LOD() {
    if (currentLOD !== 'atlas2') return;
    currentLOD = 'atlas1';
    for (var tid in atlas2Meshes) { if (atlas2Meshes[tid]) atlas2Meshes[tid].visible = false; }
    for (var tid in tileDirty) { tileDirty[tid] = true; }
    for (var tid in tileInstanced) { if (tileInstanced[tid]) tileInstanced[tid].visible = true; }
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
    var cfg = window.WorldConfig || {};
    var showDist = cfg.STREETS_SHOW_DIST || 120;
    var hideDist = cfg.STREETS_HIDE_DIST || 150;

    if (streetVisible) {
      if (distance > hideDist) {
        streetVisible = false;
        streetGroundMesh.visible = false;
        return;
      }
    } else {
      if (distance < showDist) {
        streetVisible = true;
        streetGroundMesh.visible = true;
      } else {
        streetGroundMesh.visible = false;
        return;
      }
    }

    var camPos = getCameraPosition();
    var camDir = new THREE.Vector3(camPos.x, camPos.y, camPos.z).normalize();
    var surfR = WORLD_RADIUS + INSTANCE_OFFSET;

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
      if (dTheta < 0.01 && dPhi < 0.01 && dDist < 0.1) return;
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

    var cfg = window.WorldConfig || {};
    var DIST_ATLAS2_MIN = cfg.DIST_ATLAS2_MIN || 200;
    var distAtlasMin = cfg.DIST_ATLAS_MIN || 120;
    var distBlockMode = cfg.DIST_BLOCK_MODE || 105;

    if (distance > DIST_ATLAS2_MIN) {
      showAtlas2LOD();
    } else {
      hideAtlas2LOD();
    }

    if (distance <= distAtlasMin && distance > 112) {
      // show atlas planes around central tile
      if (!atlasPlanesShown && visible.length > 0) {
        var centerBlock = visible[0].blockNum;
        var tileCentral = WorldGrid.getAtlasTile(centerBlock);
        var vecinos = [
          tileCentral - 26, tileCentral - 25, tileCentral - 24,
          tileCentral - 1,  tileCentral,       tileCentral + 1,
          tileCentral + 24, tileCentral + 25, tileCentral + 26
        ];
        vecinos = vecinos.filter(function(tid) { return tid >= 0 && tid < 956; });
        prefetchNeighbors(vecinos);
        createAtlasPlanes(vecinos);
      }
    } else {
      if (atlasPlanesShown) {
        removeAtlasPlanes();
      }
    }

    // NIVEL 2: block images when very near
    if (distance <= distBlockMode) {
      // hide atlas planes if any
      if (atlasPlanesShown) removeAtlasPlanes();
      // select top ~9 visible blocks
      var top = visible.slice(0, 20).filter(function(e){ return e && e.blockNum !== 0; });
      var selected = top.slice(0, (window.WorldConfig && window.WorldConfig.MAX_BLOCK_IMAGES_AT_3) || 9).map(function(e){ return e.blockNum; });
      // enqueue fetch for each
      selected.forEach(function(bn){ enqueueBlockImage(bn); });
    } else {
      // leaving block mode: clear block images
      if (Object.keys(blockImageMeshes).length > 0) clearBlockImages();
    }

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
