var WorldVehicle = (function(){
  var scene = null;
  var vehicles = {};

  function init(sceneRef) {
    scene = sceneRef;
  }

  function spawnVehicle(id, position, options) {
    // placeholder simple box vehicle
    var geo = new THREE.BoxGeometry(0.2, 0.1, 0.4);
    var mat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    scene.add(mesh);
    vehicles[id] = { mesh: mesh, options: options };
    return vehicles[id];
  }

  function destroyVehicle(id) {
    if (!vehicles[id]) return;
    var v = vehicles[id];
    if (v.mesh && v.mesh.parent) v.mesh.parent.remove(v.mesh);
    if (v.mesh && v.mesh.geometry) v.mesh.geometry.dispose();
    if (v.mesh && v.mesh.material) v.mesh.material.dispose();
    delete vehicles[id];
  }

  return {
    init: init,
    spawnVehicle: spawnVehicle,
    destroyVehicle: destroyVehicle
  };
})();
