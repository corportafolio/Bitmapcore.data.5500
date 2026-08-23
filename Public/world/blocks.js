var WorldBlocks = (function() {
  var blockMeshes = {};
  var blockData = {};
  var textureCache = {};
  var scene = null;
  var BLOCK_SIZE = 0.6;
  var BASE_HEIGHT = 0.5;
  var MAX_HEIGHT = 5.0;
  var MAX_TX = 8000;
  var MAX_VISIBLE = 800;
  var LOAD_DEBOUNCE = 300;
  var loadTimer = null;
  var loadedBlocks = {};
  var BLOCK_HEIGHT_SCALE = 1.2;

  function init(sceneRef) {
    scene = sceneRef;
  }

  function generateMondrianTexture(blockNumber, tx, hash) {
    var key = blockNumber + '_' + tx;
    if (textureCache[key]) return textureCache[key];

    var canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;

    MondrianGenerator.generate(canvas, blockNumber, {
      totalTransactions: tx,
      hash: hash || '',
      isPerfect: false,
      isPunk: false,
      etiquetas: ''
    }, 64);

    var texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    textureCache[key] = texture;
    return texture;
  }

  function createBlockMesh(blockNumber, tx, hash) {
    if (blockMeshes[blockNumber]) return;

    var pos = WorldGrid.blockToSphere(blockNumber);
    var normal = WorldGrid.getBlockNormal(blockNumber);
    var scale = WorldGrid.getBlockScale(blockNumber);
    var height = mapHeight(tx);

    var geo = new THREE.BoxGeometry(BLOCK_SIZE * scale.x, height * BLOCK_HEIGHT_SCALE, BLOCK_SIZE * scale.z);
    var texture = generateMondrianTexture(blockNumber, tx, hash);

    var mat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.5,
      metalness: 0.1
    });

    var mesh = new THREE.Mesh(geo, mat);

    mesh.position.set(pos.x, pos.y, pos.z);

    var up = new THREE.Vector3(0, 1, 0);
    var normalVec = new THREE.Vector3(normal.x, normal.y, normal.z);
    var quaternion = new THREE.Quaternion().setFromUnitVectors(up, normalVec);
    mesh.quaternion.copy(quaternion);

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { blockNumber: blockNumber, tx: tx, hash: hash };

    scene.add(mesh);
    blockMeshes[blockNumber] = mesh;
  }

  function createGhostBlock(blockNumber) {
    if (blockMeshes[blockNumber]) return;

    var pos = WorldGrid.blockToSphere(blockNumber);
    var normal = WorldGrid.getBlockNormal(blockNumber);
    var scale = WorldGrid.getBlockScale(blockNumber);

    var geo = new THREE.BoxGeometry(BLOCK_SIZE * scale.x, 0.3, BLOCK_SIZE * scale.z);
    var mat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.1,
      transparent: true,
      opacity: 0.2
    });

    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, pos.y, pos.z);

    var up = new THREE.Vector3(0, 1, 0);
    var normalVec = new THREE.Vector3(normal.x, normal.y, normal.z);
    var quaternion = new THREE.Quaternion().setFromUnitVectors(up, normalVec);
    mesh.quaternion.copy(quaternion);

    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.userData = { blockNumber: blockNumber, ghost: true };

    scene.add(mesh);
    blockMeshes[blockNumber] = mesh;
  }

  function removeBlockMesh(blockNumber) {
    var mesh = blockMeshes[blockNumber];
    if (!mesh) return;
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
    if (mesh.material.map) mesh.material.map.dispose();
    delete blockMeshes[blockNumber];
    delete loadedBlocks[blockNumber];
  }

  function loadChunk(theta, phi, distance, callback) {
    console.log('🔍 LOADCHUNK INPUT:', { theta: theta, thetaDeg: (theta * 180 / Math.PI).toFixed(1), phi: phi, phiDeg: (phi * 180 / Math.PI).toFixed(1), distance: distance });

    var visibleBlocks = [];
    var camDir = new THREE.Vector3(
      -Math.cos(phi) * Math.sin(theta),
      -Math.sin(phi),
      -Math.cos(phi) * Math.cos(theta)
    );

    var centerPhi = Math.asin(Math.max(-1, Math.min(1, camDir.y)));
    var centerTheta = Math.atan2(camDir.z, camDir.x);
    if (centerTheta < 0) centerTheta += Math.PI * 2;

    var gzShiftedCenter = Math.round(((centerPhi / Math.PI) + 0.5) * 1000);
    var gzCenter = (gzShiftedCenter - 500 + 1000) % 1000;
    var gxCenter = Math.round((centerTheta / (Math.PI * 2)) * 1000) % 1000;

    var fovFactor = 1.5;
    var gridRadius = Math.max(8, Math.min(200, Math.round(300 * fovFactor * (150 / Math.max(distance, 105)))));
    if (distance > 200) gridRadius = Math.min(gridRadius, 30);

    console.log('🔍 LOADCHUNK CALC:', { gzCenter: gzCenter, gxCenter: gxCenter, gridRadius: gridRadius, fovFactor: fovFactor, distance: distance });

    var maxBlocks = MAX_VISIBLE;
    var count = 0;

    for (var dz = -gridRadius; dz <= gridRadius && count < maxBlocks; dz++) {
      var gz = (gzCenter + dz + 1000) % 1000;
      var gzShifted = (gz + 500) % 1000;
      if (gzShifted < 35 || gzShifted >= 965) continue;

      var latFactor = Math.cos(((gzShifted / 1000) - 0.5) * Math.PI);
      var dxMax = Math.ceil(gridRadius / Math.max(latFactor, 0.15));

      for (var dx = -dxMax; dx <= dxMax && count < maxBlocks; dx++) {
        var gx = (gxCenter + dx + 1000) % 1000;
        var blockNum = gz * 1000 + gx;

        if (WorldGrid.isBlockInPolarZone(blockNum)) continue;
        if (loadedBlocks[blockNum]) continue;

        var pos = WorldGrid.blockToSphere(blockNum);
        var len = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
        if (len < 0.001) continue;

        var blockDir = new THREE.Vector3(pos.x / len, pos.y / len, pos.z / len);
        var dot = blockDir.dot(camDir);

        if (dot > 0) {
          visibleBlocks.push({ blockNum: blockNum, dot: dot });
          count++;
        }
      }
    }

    visibleBlocks.sort(function(a, b) { return b.dot - a.dot; });
    visibleBlocks = visibleBlocks.slice(0, MAX_VISIBLE);

    console.log('🔍 LOADCHUNK RESULT:', { total: visibleBlocks.length, first: visibleBlocks[0] ? visibleBlocks[0].blockNum : 'none', last: visibleBlocks[visibleBlocks.length-1] ? visibleBlocks[visibleBlocks.length-1].blockNum : 'none' });

    var total = visibleBlocks.length;
    if (total === 0) { if (callback) callback(); return; }

    var batch = 25;
    var idx = 0;

    function loadNext() {
      var end = Math.min(idx + batch, total);
      var promises = [];
      for (var i = idx; i < end; i++) {
        promises.push(fetchBlock(visibleBlocks[i].blockNum));
      }
      Promise.all(promises).then(function() {
        idx = end;
        if (idx < total) {
          setTimeout(loadNext, 5);
        } else {
          if (callback) callback();
        }
      });
    }

    loadNext();
  }

  function fetchBlock(blockNum) {
    if (loadedBlocks[blockNum]) return Promise.resolve();
    loadedBlocks[blockNum] = true;

    return fetch('/api/v1/blocks/' + blockNum)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data || !data.data) {
          createGhostBlock(blockNum);
          return;
        }
        var block = data.data;
        var tx = parseInt(block.totalTransacciones) || 1;
        var hash = block.hash || '';
        blockData[blockNum] = { tx: tx, hash: hash };
        createBlockMesh(blockNum, tx, hash);
      })
      .catch(function() {
        createGhostBlock(blockNum);
      });
  }

  function scheduleLoad(theta, phi) {
    if (loadTimer) clearTimeout(loadTimer);
    loadTimer = setTimeout(function() {
      var state = WorldControls.getState();
      cleanupDistant(theta, phi);
      loadChunk(theta, phi, state.distance);
    }, LOAD_DEBOUNCE);
  }

  function cleanupDistant(theta, phi) {
    var camDir = new THREE.Vector3(
      -Math.cos(phi) * Math.sin(theta),
      -Math.sin(phi),
      -Math.cos(phi) * Math.cos(theta)
    );

    var keys = Object.keys(blockMeshes);
    for (var i = 0; i < keys.length; i++) {
      var bn = parseInt(keys[i]);
      var pos = WorldGrid.blockToSphere(bn);
      var len = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
      if (len < 0.001) continue;

      var blockDir = new THREE.Vector3(pos.x / len, pos.y / len, pos.z / len);
      var dot = blockDir.dot(camDir);

      if (dot < -0.6) {
        removeBlockMesh(bn);
      }
    }
  }

  function mapHeight(tx) {
    var h = ((tx - 1) / (MAX_TX - 1)) * (MAX_HEIGHT - BASE_HEIGHT) + BASE_HEIGHT;
    return Math.max(BASE_HEIGHT, Math.min(MAX_HEIGHT, h));
  }

  function getMeshAt(blockNumber) {
    return blockMeshes[blockNumber] || null;
  }

  function getBlockData(blockNumber) {
    return blockData[blockNumber] || null;
  }

  function getAllMeshes() {
    return blockMeshes;
  }

  return {
    init: init,
    loadChunk: loadChunk,
    scheduleLoad: scheduleLoad,
    cleanupDistant: cleanupDistant,
    getMeshAt: getMeshAt,
    getBlockData: getBlockData,
    getAllMeshes: getAllMeshes,
    removeBlockMesh: removeBlockMesh,
    generateMondrianTexture: generateMondrianTexture
  };
})();
