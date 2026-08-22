var WorldGrid = (function() {
  var gridHelper;
  var GRID_SIZE = 1000;
  var GRID_DIVISIONS = 1000;
  var GRID_COLOR_1 = 0x1a1a1a;
  var GRID_COLOR_2 = 0x0d0d0d;

  function create(scene) {
    gridHelper = new THREE.GridHelper(GRID_SIZE, GRID_DIVISIONS, GRID_COLOR_1, GRID_COLOR_2);
    gridHelper.position.set(GRID_SIZE / 2, 0, GRID_SIZE / 2);
    gridHelper.material.opacity = 0.3;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    var planeGeo = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE);
    var planeMat = new THREE.MeshStandardMaterial({
      color: 0x080008,
      roughness: 0.9,
      metalness: 0.1
    });
    var plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(GRID_SIZE / 2, -0.01, GRID_SIZE / 2);
    plane.receiveShadow = true;
    scene.add(plane);
  }

  function blockToGrid(blockNumber) {
    var x = blockNumber % GRID_SIZE;
    var z = Math.floor(blockNumber / GRID_SIZE);
    return { x: x, z: z };
  }

  function gridToBlock(x, z) {
    return z * GRID_SIZE + x;
  }

  function isBlockInGrid(blockNumber) {
    return blockNumber >= 0 && blockNumber < GRID_SIZE * GRID_SIZE;
  }

  return {
    create: create,
    blockToGrid: blockToGrid,
    gridToBlock: gridToBlock,
    isBlockInGrid: isBlockInGrid,
    GRID_SIZE: GRID_SIZE
  };
})();
