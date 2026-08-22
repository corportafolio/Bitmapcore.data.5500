var WorldBlocks = (function() {
  var blockMeshes = {};
  var blockData = {};
  var textureCache = {};
  var scene = null;
  var BLOCK_SPACING = 1.1;
  var BASE_HEIGHT = 0.5;
  var MAX_HEIGHT = 5.0;
  var MAX_TX = 8000;
  var CHUNK_SIZE = 15;
  var LOAD_RADIUS = 20;
  var MAX_VISIBLE = 400;
  var LOAD_DEBOUNCE = 300;
  var loadTimer = null;

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

  function createBlockMesh(blockNumber, tx, hash, gridX, gridZ) {
    if (blockMeshes[blockNumber]) return;

    var height = mapHeight(tx);
    var geo = new THREE.BoxGeometry(0.95, height, 0.95);
    var texture = generateMondrianTexture(blockNumber, tx, hash);

    var mat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.5,
      metalness: 0.1
    });

    var mesh = new THREE.Mesh(geo, mat);
    var worldX = gridX * BLOCK_SPACING;
    var worldZ = gridZ * BLOCK_SPACING;
    mesh.position.set(worldX, height / 2, worldZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { blockNumber: blockNumber, tx: tx, hash: hash };

    scene.add(mesh);
    blockMeshes[blockNumber] = mesh;
  }

  function createGhostBlock(blockNumber, gridX, gridZ) {
    if (blockMeshes[blockNumber]) return;

    var height = 0.5;
    var geo = new THREE.BoxGeometry(0.95, height, 0.95);
    var mat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.1,
      transparent: true,
      opacity: 0.3
    });

    var mesh = new THREE.Mesh(geo, mat);
    var worldX = gridX * BLOCK_SPACING;
    var worldZ = gridZ * BLOCK_SPACING;
    mesh.position.set(worldX, height / 2, worldZ);
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
  }

  function loadChunk(centerX, centerZ, callback) {
    var startX = Math.max(0, centerX - LOAD_RADIUS);
    var endX = Math.min(999, centerX + LOAD_RADIUS);
    var startZ = Math.max(0, centerZ - LOAD_RADIUS);
    var endZ = Math.min(999, centerZ + LOAD_RADIUS);
    var blocksToLoad = [];

    for (var z = startZ; z <= endZ; z++) {
      for (var x = startX; x <= endX; x++) {
        var blockNum = WorldGrid.gridToBlock(x, z);
        if (blockNum >= 0 && blockNum <= 999999 && !blockMeshes[blockNum]) {
          blocksToLoad.push({ blockNum: blockNum, x: x, z: z });
        }
      }
    }

    blocksToLoad = blocksToLoad.slice(0, MAX_VISIBLE);

    var loaded = 0;
    var total = blocksToLoad.length;
    if (total === 0) { if (callback) callback(); return; }

    var batch = 20;
    var idx = 0;

    function loadNext() {
      var end = Math.min(idx + batch, total);
      var promises = [];
      for (var i = idx; i < end; i++) {
        promises.push(fetchBlock(blocksToLoad[i]));
      }
      Promise.all(promises).then(function() {
        idx = end;
        if (idx < total) {
          setTimeout(loadNext, 10);
        } else {
          if (callback) callback();
        }
      });
    }

    loadNext();
  }

  function fetchBlock(info) {
    return fetch('/api/v1/blocks/' + info.blockNum)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data || !data.data) {
          createGhostBlock(info.blockNum, info.x, info.z);
          return;
        }
        var block = data.data;
        var tx = parseInt(block.totalTransacciones) || 1;
        var hash = block.hash || '';
        blockData[info.blockNum] = { tx: tx, hash: hash };
        createBlockMesh(info.blockNum, tx, hash, info.x, info.z);
      })
      .catch(function() {
        createGhostBlock(info.blockNum, info.x, info.z);
      });
  }

  function scheduleLoad(centerX, centerZ) {
    if (loadTimer) clearTimeout(loadTimer);
    loadTimer = setTimeout(function() {
      cleanupDistant(centerX, centerZ);
      loadChunk(centerX, centerZ);
    }, LOAD_DEBOUNCE);
  }

  function cleanupDistant(centerX, centerZ) {
    var keys = Object.keys(blockMeshes);
    for (var i = 0; i < keys.length; i++) {
      var bn = parseInt(keys[i]);
      var gx = bn % WorldGrid.GRID_SIZE;
      var gz = Math.floor(bn / WorldGrid.GRID_SIZE);
      var dist = Math.max(Math.abs(gx - centerX), Math.abs(gz - centerZ));
      if (dist > LOAD_RADIUS + 10) {
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
