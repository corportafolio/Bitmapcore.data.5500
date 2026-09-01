var WorldAvatar = (function() {
  var scene = null;
  var mesh = null;
  var posTheta = Math.PI / 2;
  var posPhi = 0;
  var heading = 0;
  var SPEED = 0.004;
  var keys = {};
  var RADIUS = 100.36;
  var initialized = false;
  var lastFrame = 0;

  function init(sceneRef) {
    if (initialized) return;
    scene = sceneRef;
    createAvatar();
    setupControls();
    initialized = true;
    lastFrame = performance.now();
    animate();
  }

  function createAvatar() {
    var group = new THREE.Group();

    var skinColor = 0xFFDBAC;
    var shirtColor = 0x2255BB;
    var pantsColor = 0x222244;
    var shoeColor = 0x111111;

    var headGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
    var headMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.7 });
    var head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.135;
    group.add(head);

    var torsoGeo = new THREE.BoxGeometry(0.06, 0.06, 0.03);
    var torsoMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.8 });
    var torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 0.07;
    group.add(torso);

    var armGeo = new THREE.BoxGeometry(0.02, 0.06, 0.02);
    var armMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.7 });
    var leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.04, 0.07, 0);
    group.add(leftArm);
    var rightArm = new THREE.Mesh(armGeo, armMat.clone());
    rightArm.position.set(0.04, 0.07, 0);
    group.add(rightArm);

    var legGeo = new THREE.BoxGeometry(0.025, 0.05, 0.025);
    var legMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.8 });
    var leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.015, 0.005, 0);
    group.add(leftLeg);
    var rightLeg = new THREE.Mesh(legGeo, legMat.clone());
    rightLeg.position.set(0.015, 0.005, 0);
    group.add(rightLeg);

    var shoeGeo = new THREE.BoxGeometry(0.026, 0.01, 0.035);
    var shoeMat = new THREE.MeshStandardMaterial({ color: shoeColor, roughness: 0.9 });
    var leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(-0.015, -0.015, 0.005);
    group.add(leftShoe);
    var rightShoe = new THREE.Mesh(shoeGeo, shoeMat.clone());
    rightShoe.position.set(0.015, -0.015, 0.005);
    group.add(rightShoe);

    mesh = group;
    updatePosition();
    scene.add(mesh);
  }

  function updatePosition() {
    var x = RADIUS * Math.cos(posPhi) * Math.cos(posTheta);
    var y = RADIUS * Math.sin(posPhi);
    var z = RADIUS * Math.cos(posPhi) * Math.sin(posTheta);

    mesh.position.set(x, y, z);

    var normal = new THREE.Vector3(x, y, z).normalize();
    var up = new THREE.Vector3(0, 1, 0);
    mesh.quaternion.setFromUnitVectors(up, normal);

    var headingQuat = new THREE.Quaternion().setFromAxisAngle(normal, heading);
    mesh.quaternion.premultiply(headingQuat);
  }

  function setupControls() {
    document.addEventListener('keydown', function(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      keys[e.key] = true;
    });
    document.addEventListener('keyup', function(e) {
      keys[e.key] = false;
    });
  }

  function animate() {
    requestAnimationFrame(animate);

    var now = performance.now();
    var dt = Math.min((now - lastFrame) / 16.67, 3);
    lastFrame = now;

    var moved = false;

    if (keys['w'] || keys['W']) { moveForward(); moved = true; }
    if (keys['s'] || keys['S']) { moveBackward(); moved = true; }
    if (keys['a'] || keys['A']) { rotateLeft(); moved = true; }
    if (keys['d'] || keys['D']) { rotateRight(); moved = true; }
  }

  function moveForward() {
    posPhi = Math.min(1.5, posPhi + SPEED);
    updatePosition();
  }

  function moveBackward() {
    posPhi = Math.max(-1.5, posPhi - SPEED);
    updatePosition();
  }

  function moveLeft() {
    var cosPhi = Math.max(Math.cos(posPhi), 0.15);
    posTheta += SPEED / cosPhi;
    updatePosition();
  }

  function moveRight() {
    var cosPhi = Math.max(Math.cos(posPhi), 0.15);
    posTheta -= SPEED / cosPhi;
    updatePosition();
  }

  function rotateLeft() {
    heading += SPEED * 2;
    updatePosition();
  }

  function rotateRight() {
    heading -= SPEED * 2;
    updatePosition();
  }

  function getPosition() {
    return { theta: posTheta, phi: posPhi };
  }

  function setPosition(theta, phi) {
    posTheta = theta;
    posPhi = phi;
    updatePosition();
  }

  function getHeading() {
    return heading;
  }

  function setScaleFactor(s) {
    if (!mesh) return;
    mesh.scale.set(s, s, s);
  }

  function destroy() {
    if (mesh && mesh.parent) mesh.parent.remove(mesh);
    mesh = null;
    initialized = false;
  }

  return {
    init: init,
    getPosition: getPosition,
    setPosition: setPosition,
    getHeading: getHeading,
    setScaleFactor: setScaleFactor,
    moveForward: moveForward,
    moveBackward: moveBackward,
    moveLeft: moveLeft,
    moveRight: moveRight,
    destroy: destroy
  };
})();
