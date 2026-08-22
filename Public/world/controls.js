var WorldControls = (function() {
  var camera, renderer;
  var isDragging = false;
  var previousMouse = { x: 0, y: 0 };
  var cameraOffset = { x: 0, y: 0, z: 0 };
  var zoomLevel = 1;
  var MIN_ZOOM = 0.2;
  var MAX_ZOOM = 5;
  var ZOOM_SPEED = 0.1;
  var PAN_SPEED = 0.5;

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
    pan(dx, dy);
  }

  function onMouseUp() {
    isDragging = false;
  }

  function onWheel(e) {
    e.preventDefault();
    var delta = e.deltaY > 0 ? -ZOOM_SPEED : ZOOM_SPEED;
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
      pan(dx, dy);
    } else if (e.touches.length === 2) {
      var newDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      var delta = (newDist - pinchDist) * 0.005;
      pinchDist = newDist;
      zoom(delta);
    }
  }

  function onTouchEnd() {
    isDragging = false;
  }

  function pan(dx, dy) {
    var factor = PAN_SPEED / zoomLevel;
    cameraOffset.x -= dx * factor;
    cameraOffset.z += dy * factor;
    updateCamera();
  }

  function zoom(delta) {
    zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel + delta));
    updateCamera();
  }

  function updateCamera() {
    var baseX = 100;
    var baseY = 100;
    var baseZ = 100;
    camera.position.set(
      baseX + cameraOffset.x,
      baseY * zoomLevel,
      baseZ + cameraOffset.z
    );
    camera.lookAt(cameraOffset.x, 0, cameraOffset.z);
    camera.updateProjectionMatrix();
  }

  function setZoom(z) {
    zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
    updateCamera();
  }

  function setPosition(x, z) {
    cameraOffset.x = x;
    cameraOffset.z = z;
    updateCamera();
  }

  function getPosition() {
    return { x: cameraOffset.x, z: cameraOffset.z, zoom: zoomLevel };
  }

  return {
    init: init,
    setZoom: setZoom,
    setPosition: setPosition,
    getPosition: getPosition,
    updateCamera: updateCamera
  };
})();
