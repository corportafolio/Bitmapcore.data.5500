var WorldControls = (function() {
  var camera, renderer;
  var isDragging = false;
  var previousMouse = { x: 0, y: 0 };
  var theta = 0;
  var phi = 0;
  var distance = 300;
  var MIN_DISTANCE = 60;
  var MAX_DISTANCE = 600;
  var MIN_PHI = -1.55;
  var MAX_PHI = 1.55;
  var ZOOM_SPEED = 1.5;
  var ROTATE_SPEED = 0.005;
  var ARROW_SPEED = 0.08;
  var ON_CHANGE = null;
  var animTarget = null;
  var animFrame = null;
  var zoomTarget = null;
  var zoomFrame = null;

  function init(cam, ren) {
    camera = cam;
    renderer = ren;
    var el = renderer.domElement;

    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('mousemove', onMouseMove);
    el.addEventListener('mouseup', onMouseUp);
    el.addEventListener('mouseleave', onMouseUp);
    el.addEventListener('wheel', onWheel, { passive: false });

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);

    document.addEventListener('keydown', onKeyDown);
    updateCamera();
  }

  function onMouseDown(e) {
    if (e.button === 0) {
      isDragging = true;
      previousMouse.x = e.clientX;
      previousMouse.y = e.clientY;
    }
  }

  function onMouseMove(e) {
    if (!isDragging) return;
    var dx = e.clientX - previousMouse.x;
    var dy = e.clientY - previousMouse.y;
    previousMouse.x = e.clientX;
    previousMouse.y = e.clientY;
    theta -= dx * ROTATE_SPEED;
    phi += dy * ROTATE_SPEED;
    phi = Math.max(MIN_PHI, Math.min(MAX_PHI, phi));
    updateCamera();
  }

  function onMouseUp() {
    isDragging = false;
  }

  function onWheel(e) {
    e.preventDefault();
    var delta = e.deltaY > 0 ? ZOOM_SPEED : -ZOOM_SPEED;
    zoom(delta);
  }

  var touchStart = { x: 0, y: 0 };
  var pinchDist = 0;

  function onTouchStart(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      isDragging = true;
      touchStart.x = e.touches[0].clientX;
      touchStart.y = e.touches[0].clientY;
      previousMouse.x = touchStart.x;
      previousMouse.y = touchStart.y;
    } else if (e.touches.length === 2) {
      isDragging = false;
      pinchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
      var dx = e.touches[0].clientX - previousMouse.x;
      var dy = e.touches[0].clientY - previousMouse.y;
      previousMouse.x = e.touches[0].clientX;
      previousMouse.y = e.touches[0].clientY;
      theta -= dx * ROTATE_SPEED;
      phi += dy * ROTATE_SPEED;
      phi = Math.max(MIN_PHI, Math.min(MAX_PHI, phi));
      updateCamera();
    } else if (e.touches.length === 2) {
      var newDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      var delta = (pinchDist - newDist) * 0.5;
      pinchDist = newDist;
      zoom(delta);
    }
  }

  function onTouchEnd() {
    isDragging = false;
  }

  function onKeyDown(e) {
    switch (e.key) {
      case 'ArrowLeft':  rotateBy(-ARROW_SPEED, 0); e.preventDefault(); break;
      case 'ArrowRight': rotateBy(ARROW_SPEED, 0); e.preventDefault(); break;
      case 'ArrowUp':    rotateBy(0, -ARROW_SPEED); e.preventDefault(); break;
      case 'ArrowDown':  rotateBy(0, ARROW_SPEED); e.preventDefault(); break;
      case '+': case '=': zoomIn(); e.preventDefault(); break;
      case '-': case '_': zoomOut(); e.preventDefault(); break;
    }
  }

  function rotateBy(dTheta, dPhi) {
    theta += dTheta;
    phi += dPhi;
    phi = Math.max(MIN_PHI, Math.min(MAX_PHI, phi));
    updateCamera();
  }

  function rotateUp() { rotateBy(0, -ARROW_SPEED); }
  function rotateDown() { rotateBy(0, ARROW_SPEED); }
  function rotateLeft() { rotateBy(-ARROW_SPEED, 0); }
  function rotateRight() { rotateBy(ARROW_SPEED, 0); }

  function zoom(delta) {
    if (zoomTarget === null) zoomTarget = distance;
    zoomTarget = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, zoomTarget + delta));
    if (typeof WorldBlocks !== 'undefined' && WorldBlocks.setZooming) {
      WorldBlocks.setZooming(true);
    }
    if (!zoomFrame) {
      zoomFrame = requestAnimationFrame(zoomStep);
    }
  }

  function zoomStep() {
    zoomFrame = null;
    if (zoomTarget === null) return;
    var diff = zoomTarget - distance;
    if (Math.abs(diff) < 0.05) {
      distance = zoomTarget;
      zoomTarget = null;
      updateCamera();
      return;
    }
    distance += diff * 0.2;
    updateCamera();
    zoomFrame = requestAnimationFrame(zoomStep);
  }

  function zoomIn() {
    zoom(-ZOOM_SPEED);
  }

  function zoomOut() {
    zoom(ZOOM_SPEED);
  }

  function animateTo(targetTheta, targetPhi, targetDist) {
    if (animFrame) cancelAnimationFrame(animFrame);
    animTarget = {
      theta: targetTheta,
      phi: targetPhi,
      dist: targetDist !== undefined ? targetDist : distance,
      startTheta: theta,
      startPhi: phi,
      startDist: distance,
      t: 0
    };
    function step() {
      animTarget.t = Math.min(1, animTarget.t + 0.04);
      var ease = 1 - Math.pow(1 - animTarget.t, 3);
      theta = animTarget.startTheta + (animTarget.theta - animTarget.startTheta) * ease;
      phi = animTarget.startPhi + (animTarget.phi - animTarget.startPhi) * ease;
      distance = animTarget.startDist + (animTarget.dist - animTarget.startDist) * ease;
      updateCamera();
      if (animTarget.t < 1) {
        animFrame = requestAnimationFrame(step);
      }
    }
    step();
  }

  function updateCamera() {
    var x = distance * Math.cos(phi) * Math.sin(theta);
    var y = distance * Math.sin(phi);
    var z = distance * Math.cos(phi) * Math.cos(theta);
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
    if (ON_CHANGE) ON_CHANGE(theta, phi, distance);
  }

  function setOnChange(fn) {
    ON_CHANGE = fn;
  }

  function setInitial(t, p, d) {
    theta = t;
    phi = p;
    distance = d;
    updateCamera();
  }

  function getState() {
    return { theta: theta, phi: phi, distance: distance };
  }

  return {
    init: init,
    rotateBy: rotateBy,
    rotateUp: rotateUp,
    rotateDown: rotateDown,
    rotateLeft: rotateLeft,
    rotateRight: rotateRight,
    zoom: zoom,
    zoomIn: zoomIn,
    zoomOut: zoomOut,
    animateTo: animateTo,
    setOnChange: setOnChange,
    setInitial: setInitial,
    getState: getState,
    updateCamera: updateCamera
  };
})();
