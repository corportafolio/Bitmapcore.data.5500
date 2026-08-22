var PagesWorld = (function() {
  var initialized = false;
  var animFrame = null;

  function WorldPage(props) {
    var ref = React.useRef(null);
    var hoverRef = React.useRef(null);

    React.useEffect(function() {
      if (!ref.current || initialized) return;
      initWorld(ref.current);
      initialized = true;

      return function() {
        if (animFrame) cancelAnimationFrame(animFrame);
        initialized = false;
      };
    }, []);

    return React.createElement('div', {
      style: { position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', background: '#080008' }
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
        style: {
          position: 'absolute', bottom: '16px', left: '16px',
          background: 'rgba(8,0,8,0.8)', border: '1px solid #2A2A2A',
          borderRadius: '8px', padding: '8px 12px', color: '#666',
          fontSize: '11px', fontFamily: 'monospace', zIndex: 100
        }
      }, 'Bitmap Valley - Arrastra: mover | Scroll: zoom | Click: detalle bloque'),
      React.createElement('div', {
        style: {
          position: 'absolute', top: '16px', left: '16px',
          background: 'rgba(8,0,8,0.8)', border: '1px solid #2A2A2A',
          borderRadius: '8px', padding: '12px 16px', zIndex: 100
        }
      },
        React.createElement('div', {
          style: { color: '#FE3E00', fontSize: '16px', fontFamily: 'Alfa Slab One, serif', marginBottom: '4px' }
        }, 'Bitmap Valley'),
        React.createElement('div', {
          style: { color: '#666', fontSize: '11px', fontFamily: 'Acme, sans-serif' }
        }, 'Mundo Virtual 3D - 1,000,000 bloques Bitcoin')
      )
    );
  }

  function initWorld(containerEl) {
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

    WorldControls.setPosition(500 * 1.1, 500 * 1.1);
    WorldControls.setZoom(1);

    WorldBlocks.loadChunk(500, 500, function() {});

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
