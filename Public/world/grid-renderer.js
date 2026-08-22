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
      side: THREE.BackSide
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

  function blockToSphere(blockNumber) {
    var gx = blockNumber % GRID_SIZE;
    var gz = Math.floor(blockNumber / GRID_SIZE);
    var gzShifted = (gz + 500) % GRID_SIZE;

    var theta = (gx / GRID_SIZE) * PI2;
    var phi = ((gzShifted / GRID_SIZE) - 0.5) * Math.PI;

    var cosPhi = Math.cos(phi);
    var x = RADIUS * cosPhi * Math.cos(theta);
    var y = RADIUS * Math.sin(phi);
    var z = RADIUS * cosPhi * Math.sin(theta);

    return { x: x, y: y, z: z, theta: theta, phi: phi, gx: gx, gz: gz, gzShifted: gzShifted };
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

    var gzShifted = Math.round(((phi / Math.PI) + 0.5) * GRID_SIZE);
    gzShifted = Math.max(0, Math.min(GRID_SIZE - 1, gzShifted));
    var gx = Math.round((theta / PI2) * GRID_SIZE) % GRID_SIZE;

    var gz = (gzShifted - 500 + GRID_SIZE * 2) % GRID_SIZE;
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

  function isBlockInPolarZone(blockNumber) {
    var pos = blockToSphere(blockNumber);
    return pos.gzShifted < POLE_SKIP || pos.gzShifted >= (GRID_SIZE - POLE_SKIP);
  }

  function getRadius() { return RADIUS; }
  function getGridSize() { return GRID_SIZE; }

  return {
    create: create,
    blockToSphere: blockToSphere,
    sphereToBlock: sphereToBlock,
    getBlockNormal: getBlockNormal,
    getBlockScale: getBlockScale,
    isBlockInPolarZone: isBlockInPolarZone,
    getRadius: getRadius,
    getGridSize: getGridSize
  };
})();
