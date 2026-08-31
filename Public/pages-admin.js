function AdminDashboardPage(props) {
  var navigate = props.navigate;

  return React.createElement('div', { className:'flex flex-col h-full' },
    React.createElement(HeaderBar, { showBackButton:true, title:'Admin Dashboard', navigate:navigate }),
    React.createElement('main', { className:'flex-1 overflow-y-auto p-4 lg:p-6' },
      React.createElement('div', { className:'max-w-4xl mx-auto space-y-4' },
        React.createElement('h2', { className:'font-alfaslab text-xl text-white' }, 'Panel de Administración'),
        React.createElement('div', { className:'grid grid-cols-1 md:grid-cols-3 gap-4' },
          React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-4' },
            React.createElement('h3', { className:'font-alfaslab text-sm text-bitmap-orange' }, 'Marketplace Local'),
            React.createElement('p', { className:'font-acme text-2xl text-white mt-2' }, 'Activo'),
            React.createElement('p', { className:'font-acme text-xs text-bitmap-muted mt-1' }, 'Puerto 3000')
          ),
          React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-4' },
            React.createElement('h3', { className:'font-alfaslab text-sm text-bitmap-orange' }, 'Proxy API'),
            React.createElement('p', { className:'font-acme text-2xl text-white mt-2' }, 'Activo'),
            React.createElement('p', { className:'font-acme text-xs text-bitmap-muted mt-1' }, 'Puerto 5500')
          ),
          React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-4' },
            React.createElement('h3', { className:'font-alfaslab text-sm text-bitmap-orange' }, 'Base de Datos'),
            React.createElement('p', { className:'font-acme text-2xl text-white mt-2' }, '15 Tablas'),
            React.createElement('p', { className:'font-acme text-xs text-bitmap-muted mt-1' }, 'SQLite')
          )
        ),
        React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-4' },
          React.createElement('h3', { className:'font-alfaslab text-sm text-bitmap-orange mb-3' }, 'Acciones Rápidas'),
          React.createElement('div', { className:'flex flex-wrap gap-2' },
            React.createElement('button', {
              onClick: function() { navigate('/local'); },
              className:'px-4 py-2 bg-bitmap-orange text-white font-alfaslab text-xs rounded-lg hover:bg-bitmap-orange/80 transition-colors'
            }, 'Ver Marketplace'),
            React.createElement('button', {
              onClick: function() { navigate('/tag-tables'); },
              className:'px-4 py-2 bg-bitmap-surface border border-bitmap-border text-white font-alfaslab text-xs rounded-lg hover:border-bitmap-orange transition-colors'
            }, 'Ver Etiquetas'),
            React.createElement('button', {
              onClick: function() { navigate('/wallet'); },
              className:'px-4 py-2 bg-bitmap-surface border border-bitmap-border text-white font-alfaslab text-xs rounded-lg hover:border-bitmap-orange transition-colors'
            }, 'Conectar Wallet')
          )
        )
      )
    )
  );
}

function WhitepaperPage(props) {
  var navigate = props.navigate;

  return React.createElement('div', { className:'flex flex-col h-full' },
    React.createElement(HeaderBar, { showBackButton:true, title:'Whitepaper', navigate:navigate }),
    React.createElement('main', { className:'flex-1 overflow-y-auto p-4 lg:p-6' },
      React.createElement('div', { className:'max-w-2xl mx-auto space-y-6' },
        React.createElement('h1', { className:'font-alfaslab text-2xl text-white text-center' }, 'BitmapCore'),
        React.createElement('h2', { className:'font-alfaslab text-lg text-bitmap-orange text-center' }, 'El Marketplace de Bitmap en Bitcoin'),
        React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-6 space-y-4' },
          React.createElement('h3', { className:'font-alfaslab text-base text-white' }, '¿Qué es Bitmap?'),
          React.createElement('p', { className:'font-acme text-sm text-bitmap-text leading-relaxed' },
            'Bitmap es un protocolo que asigna NFTs a bloques de Bitcoin. Cada bloque de Bitcoin tiene un número único, y al inscribir un Bitmap ordinal en ese bloque, se crea un activo digital que representa el bloque completo.'
          )
        ),
        React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-6 space-y-4' },
          React.createElement('h3', { className:'font-alfaslab text-base text-white' }, '¿Qué es BitmapCore?'),
          React.createElement('p', { className:'font-acme text-sm text-bitmap-text leading-relaxed' },
            'BitmapCore es el marketplace descentralizado para bitmap ordinals. Conecta múltiples marketplaces (Ordinalswallet, Unisat, marketplace local) en una sola interfaz con arte Mondrian generado a partir de los datos del bloque.'
          )
        ),
        React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-6 space-y-4' },
          React.createElement('h3', { className:'font-alfaslab text-base text-white' }, 'Arte Mondrian'),
          React.createElement('p', { className:'font-acme text-sm text-bitmap-text leading-relaxed' },
            'Cada bloque se visualiza como una pintura de Mondrian, usando transacciones del bloque para generar colores y formas deterministas. El arte es único para cada bloque pero consistente entre visitas.'
          )
        ),
        React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-6 space-y-4' },
          React.createElement('h3', { className:'font-alfaslab text-base text-white' }, 'Arquitectura'),
          React.createElement('p', { className:'font-acme text-sm text-bitmap-text leading-relaxed' },
            'BitmapCore opera con dos servidores: Puerto 3000 (marketplace local) y Puerto 5500 (proxy a marketplaces externos y base de datos). La web se inscribe directamente en Bitcoin como inscripción ordinal.'
          )
        )
      )
    )
  );
}
