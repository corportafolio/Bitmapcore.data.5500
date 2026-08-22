var WorldScene = (function() {
  var scene, camera, renderer, clock;
  var LIGHT_COLOR = 0xffffff;
  var AMBIENT_INTENSITY = 0.6;
  var DIR_INTENSITY = 0.8;
  var BG_COLOR = 0x12101a;
  var orthoZoom = 15;

  function init(container) {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(BG_COLOR);
    scene.fog = new THREE.FogExp2(BG_COLOR, 0.003);

    clock = new THREE.Clock();

    var w = container.clientWidth || window.innerWidth;
    var h = container.clientHeight || window.innerHeight;
    if (w === 0) w = window.innerWidth;
    if (h === 0) h = window.innerHeight;

    camera = new THREE.OrthographicCamera(
      (w / -2) / orthoZoom, (w / 2) / orthoZoom,
      (h / 2) / orthoZoom, (h / -2) / orthoZoom,
      0.1, 2000
    );
    camera.position.set(100, 100, 100);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    var ambient = new THREE.AmbientLight(LIGHT_COLOR, AMBIENT_INTENSITY);
    scene.add(ambient);

    var dir = new THREE.DirectionalLight(LIGHT_COLOR, DIR_INTENSITY);
    dir.position.set(50, 80, 30);
    dir.castShadow = true;
    dir.shadow.mapSize.width = 2048;
    dir.shadow.mapSize.height = 2048;
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 500;
    dir.shadow.camera.left = -100;
    dir.shadow.camera.right = 100;
    dir.shadow.camera.top = 100;
    dir.shadow.camera.bottom = -100;
    scene.add(dir);

    window.addEventListener('resize', onResize);
  }

  function setOrthoZoom(z) {
    orthoZoom = z;
    updateFrustum();
  }

  function getOrthoZoom() {
    return orthoZoom;
  }

  function updateFrustum() {
    var c = renderer.domElement.parentElement;
    if (!c) return;
    var w = c.clientWidth;
    var h = c.clientHeight;
    camera.left = (w / -2) / orthoZoom;
    camera.right = (w / 2) / orthoZoom;
    camera.top = (h / 2) / orthoZoom;
    camera.bottom = (h / -2) / orthoZoom;
    camera.updateProjectionMatrix();
  }

  function onResize() {
    var c = renderer.domElement.parentElement;
    if (!c) return;
    var w = c.clientWidth;
    var h = c.clientHeight;
    camera.left = (w / -2) / orthoZoom;
    camera.right = (w / 2) / orthoZoom;
    camera.top = (h / 2) / orthoZoom;
    camera.bottom = (h / -2) / orthoZoom;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function getScene() { return scene; }
  function getCamera() { return camera; }
  function getRenderer() { return renderer; }
  function getClock() { return clock; }

  return {
    init: init,
    getScene: getScene,
    getCamera: getCamera,
    getRenderer: getRenderer,
    getClock: getClock,
    onResize: onResize,
    setOrthoZoom: setOrthoZoom,
    getOrthoZoom: getOrthoZoom,
    updateFrustum: updateFrustum
  };
})();
