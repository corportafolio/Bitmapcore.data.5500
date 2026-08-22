var WorldInteraction = (function() {
  var camera, renderer, scene;
  var raycaster = new THREE.Raycaster();
  var mouse = new THREE.Vector2();
  var hoveredMesh = null;
  var tooltipEl = null;
  var infoEl = null;
  var BLOCK_SPACING = 1.1;

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
    var rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    var meshes = Object.values(WorldBlocks.getAllMeshes());
    var intersects = raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      var mesh = intersects[0].object;
      if (hoveredMesh !== mesh) {
        if (hoveredMesh) unhighlight(hoveredMesh);
        hoveredMesh = mesh;
        highlight(mesh);
      }
      showTooltip(e.clientX, e.clientY, mesh.userData);
    } else {
      if (hoveredMesh) {
        unhighlight(hoveredMesh);
        hoveredMesh = null;
      }
      hideTooltip();
    }
  }

  function onClick(e) {
    if (!hoveredMesh) return;
    var data = hoveredMesh.userData;
    window.location.hash = '/blocks/' + data.blockNumber;
  }

  function highlight(mesh) {
    mesh.material.emissive = new THREE.Color(0xFE3E00);
    mesh.material.emissiveIntensity = 0.3;
  }

  function unhighlight(mesh) {
    mesh.material.emissive = new THREE.Color(0x000000);
    mesh.material.emissiveIntensity = 0;
  }

  function showTooltip(x, y, data) {
    if (!tooltipEl) return;
    tooltipEl.style.display = 'block';
    tooltipEl.style.left = (x + 15) + 'px';
    tooltipEl.style.top = (y + 15) + 'px';
    tooltipEl.innerHTML = '<div style="color:#FE3E00;font-weight:bold">Bloque #' + data.blockNumber + '</div>' +
      '<div>' + data.tx + ' transacciones</div>';
  }

  function hideTooltip() {
    if (!tooltipEl) return;
    tooltipEl.style.display = 'none';
  }

  return {
    init: init
  };
})();
