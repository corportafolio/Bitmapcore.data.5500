var WorldScene = (function() {
  var scene, camera, renderer, clock;
  var LIGHT_COLOR = 0xffffff;
  var AMBIENT_INTENSITY = 0.6;
  var DIR_INTENSITY = 0.8;
  var BG_COLOR = 0x080008;

  function init(container) {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(BG_COLOR);
    scene.fog = new THREE.FogExp2(BG_COLOR, 0.001);

    clock = new THREE.Clock();

    var w = container.clientWidth || window.innerWidth;
    var h = container.clientHeight || window.innerHeight;
    if (w === 0) w = window.innerWidth;
    if (h === 0) h = window.innerHeight;

    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 2000);
    camera.position.set(0, 50, 300);
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
    dir.position.set(100, 150, 100);
    dir.castShadow = true;
    dir.shadow.mapSize.width = 2048;
    dir.shadow.mapSize.height = 2048;
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 800;
    dir.shadow.camera.left = -150;
    dir.shadow.camera.right = 150;
    dir.shadow.camera.top = 150;
    dir.shadow.camera.bottom = -150;
    scene.add(dir);

    var hemi = new THREE.HemisphereLight(0x444466, 0x222233, 0.3);
    scene.add(hemi);

    window.addEventListener('resize', onResize);
  }

  function onResize() {
    var c = renderer.domElement.parentElement;
    if (!c) return;
    var w = c.clientWidth || window.innerWidth;
    var h = c.clientHeight || window.innerHeight;
    camera.aspect = w / h;
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
    onResize: onResize
  };
})();
