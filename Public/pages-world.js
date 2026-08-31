var PagesWorld = (function() {
  var initialized = false;
  var animFrame = null;

  function WorldPage(props) {
    var ref = React.useRef(null);
    var hoverRef = React.useRef(null);
    var compassRef = React.useRef(null);
    var infoRef = React.useRef(null);
    var blockInfoRef = React.useRef(null);
    var zoomIndicatorRef = React.useRef(null);

    var onControlsChange = React.useCallback(function(theta, phi, distance) {
      if (compassRef.current) {
        compassRef.current.style.transform = 'rotate(' + (-theta * 180 / Math.PI) + 'deg)';
      }
      if (zoomIndicatorRef.current) {
        var zoomLevel = (300 / distance).toFixed(1);
        zoomIndicatorRef.current.textContent = 'Zoom: ' + zoomLevel + 'x';
      }
      updateBlockInfoThrottled(theta, phi, distance);
      WorldBlocks.scheduleLoad(theta, phi);
    }, []);

    var lastInfoUpdate = 0;

    function updateBlockInfoThrottled(theta, phi, distance) {
      var now = Date.now();
      if (now - lastInfoUpdate < 300) return;
      lastInfoUpdate = now;
      updateBlockInfo(theta, phi, distance);
    }

    function updateBlockInfo(theta, phi, distance) {
      var dir = new THREE.Vector3(
        -Math.cos(phi) * Math.sin(theta),
        -Math.sin(phi),
        -Math.cos(phi) * Math.cos(theta)
      );

      var bestBlock = -1;
      var bestDot = -1;
      var meshes = WorldBlocks.getAllMeshes();
      var keys = Object.keys(meshes);

      for (var i = 0; i < keys.length; i++) {
        var bn = parseInt(keys[i]);
        var pos = WorldGrid.blockToSphere(bn);
        var len = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
        if (len < 0.001) continue;

        var blockDir = new THREE.Vector3(pos.x / len, pos.y / len, pos.z / len);
        var dot = blockDir.dot(dir);

        if (dot > bestDot) {
          bestDot = dot;
          bestBlock = bn;
        }
      }

      if (bestBlock >= 0 && blockInfoRef.current) {
        var pos = WorldGrid.blockToSphere(bestBlock);
        var lat = pos.phi * 180 / Math.PI;
        var lon = pos.theta * 180 / Math.PI;
        var data = WorldBlocks.getBlockData(bestBlock);
        var tx = data ? data.tx : 0;
        blockInfoRef.current.innerHTML =
          'Bloque #' + bestBlock + ' | ' + tx + ' tx<br/>' +
          lat.toFixed(1) + '°N, ' + lon.toFixed(1) + '°E<br/>' +
          'Dist: ' + Math.round(distance) + ' / Zoom: ' + (300 / distance).toFixed(1) + 'x';
      }
    }

    React.useEffect(function() {
      if (!ref.current || initialized) return;
      initWorld(ref.current, onControlsChange);
      initialized = true;

      return function() {
        if (animFrame) cancelAnimationFrame(animFrame);
        if (WorldBlocks.destroy) WorldBlocks.destroy();
        initialized = false;
      };
    }, [onControlsChange]);

    return React.createElement('div', {
      style: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', overflow: 'hidden', background: '#080008', zIndex: 0 }
    },
      React.createElement('div', {
        ref: ref,
        style: { width: '100%', height: '100%' }
      }),
      React.createElement('div', {
        ref: hoverRef,
        id: 'world-hover-tooltip',
        style: {
          position: 'fixed', display: 'none', pointerEvents: 'none',
          background: 'rgba(8,0,8,0.9)', border: '1px solid #FE3E00',
          borderRadius: '8px', padding: '8px 12px', color: '#B0B0B0',
          fontSize: '12px', fontFamily: 'Acme, sans-serif', zIndex: 100,
          whiteSpace: 'nowrap'
        }
      }),
      React.createElement('div', {
        ref: zoomIndicatorRef,
        style: {
          position: 'fixed', top: '2px', right: '20px', zIndex: 200,
          background: 'rgba(8,0,8,0.85)', border: '1px solid #2A2A2A',
          borderRadius: '6px', padding: '4px 10px',
          color: '#FE3E00', fontSize: '12px', fontFamily: 'monospace',
          fontWeight: 'bold', textAlign: 'center', minWidth: '80px'
        }
      }, 'Zoom: 1.0x'),
      React.createElement('div', {
        ref: compassRef,
        style: {
          position: 'fixed', top: '26px', right: '20px', zIndex: 200,
          width: '80px', height: '80px', transformOrigin: 'center'
        }
      }, createCompassSVG()),
      React.createElement('div', {
        style: {
          position: 'fixed', right: '20px', top: '116px', zIndex: 200,
          display: 'grid', gridTemplateColumns: 'repeat(3, 48px)',
          gridTemplateRows: 'repeat(3, 48px)', gap: '6px'
        }
      },
        React.createElement('div', null),
        createArrowButton('▲', 'rotateUp', 'Arriba'),
        React.createElement('div', null),
        createArrowButton('◀', 'rotateLeft', 'Izquierda'),
        React.createElement('div', {
          style: {
            width: '48px', height: '48px', borderRadius: '50%',
            background: 'rgba(8,0,8,0.95)', border: '2px solid #FE3E00',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }
        }, React.createElement('div', { style: { width: '8px', height: '8px', borderRadius: '50%', background: '#FE3E00' } })),
        createArrowButton('▶', 'rotateRight', 'Derecha'),
        React.createElement('div', null),
        createArrowButton('▼', 'rotateDown', 'Abajo'),
        React.createElement('div', null)
      ),
      React.createElement('div', {
        style: { position: 'fixed', right: '20px', bottom: '80px', zIndex: 200, display: 'flex', flexDirection: 'column', gap: '8px' }
      },
        createZoomButton('+', 'zoomIn', 'Acercar'),
        createZoomButton('−', 'zoomOut', 'Alejar')
      ),
      React.createElement('div', {
        ref: infoRef,
        style: {
          position: 'fixed', top: '16px', left: '16px', zIndex: 200,
          background: 'rgba(8,0,8,0.85)', border: '1px solid #2A2A2A',
          borderRadius: '8px', padding: '12px 16px', minWidth: '220px'
        }
      },
        React.createElement('div', {
          style: { color: '#FE3E00', fontSize: '16px', fontFamily: 'Alfa Slab One, serif', marginBottom: '4px' }
        }, 'Bitmap World'),
        React.createElement('div', {
          style: { color: '#666', fontSize: '11px', fontFamily: 'Acme, sans-serif' }
        }, 'Mundo Virtual 3D - 1,000,000 bloques Bitcoin'),
        React.createElement('div', {
          ref: blockInfoRef,
          style: { color: '#B0B0B0', fontSize: '10px', fontFamily: 'monospace', marginTop: '8px', lineHeight: '1.6' }
        }, 'Bloque #0 | 0 tx | 0.0°N, 0.0°E')
      ),
      React.createElement('div', {
        style: {
          position: 'fixed', bottom: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 200,
          background: 'rgba(8,0,8,0.8)', border: '1px solid #2A2A2A',
          borderRadius: '8px', padding: '6px 14px', color: '#666',
          fontSize: '10px', fontFamily: 'Acme, sans-serif', whiteSpace: 'nowrap'
        }
      }, 'Arrastra: rotar | Scroll: zoom | Click: detalle | Flechas/Teclado: navegar | +/-: zoom')
    );
  }

  function createCompassSVG() {
    return React.createElement('svg', {
      width: '80', height: '80', viewBox: '0 0 80 80',
      style: { filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }
    },
      React.createElement('circle', { cx: '40', cy: '40', r: '36', fill: 'rgba(8,0,8,0.8)', stroke: '#2A2A2A', strokeWidth: '1.5' }),
      React.createElement('circle', { cx: '40', cy: '40', r: '2', fill: '#FE3E00' }),
      React.createElement('text', { x: '40', y: '14', textAnchor: 'middle', fill: '#FE3E00', fontFamily: 'Acme', fontSize: '10', fontWeight: 'bold' }, 'N'),
      React.createElement('text', { x: '40', y: '68', textAnchor: 'middle', fill: '#888', fontFamily: 'Acme', fontSize: '10' }, 'S'),
      React.createElement('text', { x: '66', y: '44', textAnchor: 'middle', fill: '#888', fontFamily: 'Acme', fontSize: '10' }, 'E'),
      React.createElement('text', { x: '14', y: '44', textAnchor: 'middle', fill: '#888', fontFamily: 'Acme', fontSize: '10' }, 'O'),
      React.createElement('path', { d: 'M40,10 L40,18', stroke: '#FE3E00', strokeWidth: '2' }),
      React.createElement('path', { d: 'M40,62 L40,70', stroke: '#888', strokeWidth: '1.5' }),
      React.createElement('path', { d: 'M58,40 L66,40', stroke: '#888', strokeWidth: '1.5' }),
      React.createElement('path', { d: 'M14,40 L22,40', stroke: '#888', strokeWidth: '1.5' })
    );
  }

  function createArrowButton(symbol, action, title) {
    return React.createElement('button', {
      onClick: function() { WorldControls[action] && WorldControls[action](); },
      onMouseDown: function(e) { e.preventDefault(); WorldControls[action] && WorldControls[action](); },
      title: title,
      style: {
        width: '48px', height: '48px', borderRadius: '50%',
        background: 'rgba(8,0,8,0.95)', border: '2px solid #FE3E00',
        color: '#FFFFFF', fontSize: '22px', fontWeight: 'bold', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
        transition: 'all 0.15s ease'
      },
      onMouseEnter: function(e) { e.target.style.background = '#FE3E00'; e.target.style.color = '#080008'; },
      onMouseLeave: function(e) { e.target.style.background = 'rgba(8,0,8,0.95)'; e.target.style.color = '#FFFFFF'; }
    }, symbol);
  }

  function createZoomButton(symbol, action, title) {
    return React.createElement('button', {
      onClick: function() { WorldControls[action] && WorldControls[action](); },
      title: title,
      style: {
        width: '48px', height: '48px', borderRadius: '50%',
        background: 'rgba(8,0,8,0.95)', border: '2px solid #FE3E00',
        color: '#FFFFFF', fontSize: '24px', fontWeight: 'bold', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
        transition: 'all 0.15s ease'
      },
      onMouseEnter: function(e) { e.target.style.background = '#FE3E00'; e.target.style.color = '#080008'; },
      onMouseLeave: function(e) { e.target.style.background = 'rgba(8,0,8,0.95)'; e.target.style.color = '#FFFFFF'; }
    }, symbol);
  }

  function initWorld(containerEl, onChange) {
    WorldScene.init(containerEl);
    WorldControls.init(WorldScene.getCamera(), WorldScene.getRenderer());
    WorldGrid.create(WorldScene.getScene());
    WorldBlocks.init(WorldScene.getScene());

    WorldInteraction.init(
      WorldScene.getCamera(),
      WorldScene.getRenderer(),
      WorldScene.getScene(),
      document.getElementById('world-hover-tooltip'),
      null
    );

    WorldControls.setInitial(Math.PI / 2, 0, 280);
    WorldControls.setOnChange(onChange);

    var initialState = WorldControls.getState();
    console.log('🔍 INIT STATE:', {
      theta: initialState.theta,
      thetaDeg: (initialState.theta * 180 / Math.PI).toFixed(1),
      phi: initialState.phi,
      phiDeg: (initialState.phi * 180 / Math.PI).toFixed(1),
      distance: initialState.distance
    });

    WorldBlocks.createBlockMesh(0, 1, '');
    WorldBlocks.loadChunk(initialState.theta, initialState.phi, initialState.distance, function() {
      WorldBlocks.startBackgroundLoad();
    });

    animate();
  }

  function animate() {
    animFrame = requestAnimationFrame(animate);
    WorldScene.getRenderer().render(WorldScene.getScene(), WorldScene.getCamera());
  }

  return {
    WorldPage: WorldPage
  };
})();

var WorldPage = PagesWorld.WorldPage;
