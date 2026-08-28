var WorldInteraction = (function() {
  var camera, renderer, scene;
  var raycaster = new THREE.Raycaster();
  var mouse = new THREE.Vector2();
  var hoveredBlock = -1;
  var tooltipEl = null;
  var infoEl = null;
  var lastRaycast = 0;
  var CLICK_NAV_MIN_DIST = 110;

  function init(cam, ren, sceneRef, tooltipElement, infoElement) {
    camera = cam;
    renderer = ren;
    scene = sceneRef;
    tooltipEl = tooltipElement;
    infoEl = infoElement;

    var el = renderer.domElement;
    el.addEventListener('mousemove', onMouseMove);
    el.addEventListener('click', onClick);
  }

  function onMouseMove(e) {
    var now = performance.now();
    if (now - lastRaycast < 80) return;
    lastRaycast = now;

    var rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    var allMeshes = WorldBlocks.getAllMeshes();
    var meshKeys = Object.keys(allMeshes);
    var intersected = null;
    var minDistance = Infinity;
    var hitMesh = null;

    for (var i = 0; i < meshKeys.length; i++) {
      var mesh = allMeshes[meshKeys[i]];
      if (!mesh) continue;
      if (mesh.geometry && mesh.geometry.attributes.position && mesh.geometry.attributes.position.count === 0) continue;

      var hits = raycaster.intersectObject(mesh, false);
      if (hits.length > 0 && hits[0].distance < minDistance) {
        minDistance = hits[0].distance;
        intersected = hits[0];
        hitMesh = mesh;
      }
    }

    var blockNumber = -1;

    if (intersected && hitMesh) {
      if (intersected.instanceId !== undefined && intersected.instanceId !== null) {
        blockNumber = WorldBlocks.getBlockByInstanceIdInMesh(hitMesh, intersected.instanceId);
      }

      if (blockNumber < 0 && intersected.point) {
        blockNumber = WorldGrid.sphereToBlock(intersected.point.x, intersected.point.y, intersected.point.z);
      }
    }

    if (blockNumber >= 0) {
      if (blockNumber !== hoveredBlock) {
        hoveredBlock = blockNumber;
        var data = WorldBlocks.getBlockData(blockNumber);
        showTooltip(e.clientX, e.clientY, {
          blockNumber: blockNumber,
          tx: data ? data.tx : '?',
          hash: data ? data.hash : ''
        });
      } else {
        updateTooltipPos(e.clientX, e.clientY);
      }
    } else {
      hoveredBlock = -1;
      hideTooltip();
    }
  }

  function onClick(e) {
    if (hoveredBlock < 0) return;
    var state = WorldControls.getState();
    if (state && state.distance < CLICK_NAV_MIN_DIST) return;
    window.location.hash = '/blocks/' + hoveredBlock;
  }

  function showTooltip(x, y, data) {
    if (!tooltipEl) return;
    tooltipEl.style.display = 'block';
    tooltipEl.style.left = (x + 15) + 'px';
    tooltipEl.style.top = (y + 15) + 'px';
    tooltipEl.innerHTML = '<div style="color:#FE3E00;font-weight:bold">Bloque #' + data.blockNumber + '</div>' +
      '<div>' + data.tx + ' transacciones</div>';
  }

  function updateTooltipPos(x, y) {
    if (!tooltipEl) return;
    tooltipEl.style.left = (x + 15) + 'px';
    tooltipEl.style.top = (y + 15) + 'px';
  }

  function hideTooltip() {
    if (!tooltipEl) return;
    tooltipEl.style.display = 'none';
  }

  return {
    init: init
  };
})();
