function SettingsPage(props) {
  var navigate = props.navigate;
  var _a = React.useState('');
  var alias = _a[0];
  var setAlias = _a[1];
  var _b = React.useState('dark');
  var theme = _b[0];
  var setTheme = _b[1];
  var _c = React.useState('es');
  var language = _c[0];
  var setLanguage = _c[1];
  var _d = React.useState(false);
  var isSaving = _d[0];
  var setIsSaving = _d[1];
  var _e = React.useState(false);
  var saved = _e[0];
  var setSaved = _e[1];
  var walletState = StoreApp.get('wallet');

  React.useEffect(function() {
    var storedAlias = localStorage.getItem('bitmap_alias');
    var storedTheme = localStorage.getItem('bitmap_theme');
    var storedLang = localStorage.getItem('bitmap_lang');
    if (storedAlias) setAlias(storedAlias);
    if (storedTheme) {
      setTheme(storedTheme);
      document.documentElement.classList.toggle('light', storedTheme === 'light');
    }
    if (storedLang) setLanguage(storedLang);
  }, []);

  var handleSave = function() {
    setIsSaving(true);
    localStorage.setItem('bitmap_alias', alias);
    localStorage.setItem('bitmap_theme', theme);
    localStorage.setItem('bitmap_lang', language);
    document.documentElement.classList.toggle('light', theme === 'light');
    setIsSaving(false);
    setSaved(true);
    setTimeout(function() { setSaved(false); }, 2000);
  };

  return React.createElement('div', { className:'p-4 lg:p-6' },
    React.createElement('div', { className:'max-w-xl mx-auto space-y-6' },
        React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-6' },
          React.createElement('h2', { className:'font-alfaslab text-lg text-white mb-4 flex items-center gap-2' },
            React.createElement('span', { className:'text-xl' }, '\uD83D\uDC64'),
            ' Perfil'
          ),
          React.createElement('div', { className:'space-y-4' },
            React.createElement('div', null,
              React.createElement('label', { className:'font-acme text-xs text-bitmap-muted block mb-1' }, 'Alias'),
              React.createElement('input', {
                type:'text',
                value:alias,
                onChange:function(e) { setAlias(e.target.value); },
                placeholder:'Tu alias en BitmapCore',
                className:'w-full bg-bitmap-black border border-bitmap-border rounded-lg px-3 py-2 font-acme text-sm text-bitmap-text placeholder-bitmap-muted focus:outline-none focus:border-bitmap-orange'
              })
            ),
            walletState.isConnected ? React.createElement('div', { className:'bg-bitmap-black/50 rounded-lg p-3 border border-bitmap-border' },
              React.createElement('div', { className:'font-acme text-xs text-bitmap-muted' }, 'Wallet Conectada'),
              React.createElement('div', { className:'font-alfaslab text-sm text-bitmap-orange mt-1' }, BitmapUtils.truncateAddress(walletState.address, 6)),
              React.createElement('button', { onClick:function() { StoreApp.dispatch({ type:'DISCONNECT_WALLET' }); }, className:'mt-2 px-3 py-1 text-xs bg-bitmap-red text-white rounded hover:bg-bitmap-red/80' }, 'Desconectar')
            ) : React.createElement('div', { className:'bg-bitmap-black/50 rounded-lg p-3 border border-bitmap-border' },
              React.createElement('div', { className:'font-acme text-xs text-bitmap-muted' }, 'Wallet No Conectada'),
              React.createElement('button', { onClick:function() { navigate('/wallet'); }, className:'mt-2 px-3 py-1 text-xs bg-bitmap-orange text-white rounded hover:bg-bitmap-orange/80' }, 'Conectar Wallet')
            ),
            saved ? React.createElement('div', { className:'text-xs text-bitmap-green flex items-center gap-1' },
              React.createElement('span', null, '\u2713'),
              ' Guardado'
            ) : null
          )
        ),

        React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-6' },
          React.createElement('h2', { className:'font-alfaslab text-lg text-white mb-4 flex items-center gap-2' },
            React.createElement('span', { className:'text-xl' }, '\uD83C\uDF1E'),
            ' Apariencia'
          ),
          React.createElement('div', { className:'space-y-4' },
            React.createElement('div', null,
              React.createElement('label', { className:'font-acme text-xs text-bitmap-muted block mb-2' }, 'Tema'),
              React.createElement('div', { className:'grid grid-cols-2 gap-3' },
                ['dark', 'light'].map(function(t) {
                  return React.createElement('button', {
                    key: t,
                    onClick: function() { setTheme(t); },
                    className: 'py-3 rounded-lg border-2 font-alfaslab text-sm transition-all ' +
                      (theme === t ? 'border-bitmap-orange bg-bitmap-orange/10 text-bitmap-orange' : 'border-bitmap-border text-bitmap-text hover:border-bitmap-orange/50')
                  }, t === 'dark' ? '\uD83D\uDD75\uFE0F Oscuro' : '\u2600\uFE0F Claro');
                })
              )
            ),
            React.createElement('div', null,
              React.createElement('label', { className:'font-acme text-xs text-bitmap-muted block mb-2' }, 'Idioma'),
              React.createElement('div', { className:'grid grid-cols-2 gap-3' },
                ['es', 'en'].map(function(l) {
                  return React.createElement('button', {
                    key: l,
                    onClick: function() { setLanguage(l); },
                    className: 'py-3 rounded-lg border-2 font-alfaslab text-sm transition-all ' +
                      (language === l ? 'border-bitmap-orange bg-bitmap-orange/10 text-bitmap-orange' : 'border-bitmap-border text-bitmap-text hover:border-bitmap-orange/50')
                  }, l === 'es' ? '\uD83C\uDDEA\uD83C\uDDF8 Espa\u00F1ol' : '\uD83C\uDDEC\uD83C\uDDE7 English');
                })
              )
            )
          )
        ),

        React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-6' },
          React.createElement('h2', { className:'font-alfaslab text-lg text-white mb-4 flex items-center gap-2' },
            React.createElement('span', { className:'text-xl' }, '\uD83D\uDCCA'),
            ' Acerca de'
          ),
          React.createElement('div', { className:'space-y-3 font-acme text-sm text-bitmap-text' },
            React.createElement('div', { className:'flex justify-between' },
              React.createElement('span', { className:'text-bitmap-muted' }, 'Versi\u00F3n'),
              React.createElement('span', null, '1.0.0')
            ),
            React.createElement('div', { className:'flex justify-between' },
              React.createElement('span', { className:'text-bitmap-muted' }, 'Base de datos'),
              React.createElement('span', null, '~1,000,000 bloques')
            ),
            React.createElement('div', { className:'flex justify-between' },
              React.createElement('span', { className:'text-bitmap-muted' }, 'Tablas de etiquetas'),
              React.createElement('span', null, '55')
            ),
            React.createElement('div', { className:'flex justify-between' },
              React.createElement('span', { className:'text-bitmap-muted' }, 'Color primario'),
              React.createElement('span', { className:'font-alfaslab text-bitmap-orange' }, '#FE3E00')
            ),
            React.createElement('div', { className:'flex justify-between' },
              React.createElement('span', { className:'text-bitmap-muted' }, 'Color fondo'),
              React.createElement('span', { className:'font-alfaslab text-white' }, '#080008')
            )
          )
        ),

        React.createElement('button', {
          onClick: handleSave,
          disabled: isSaving,
          className:'w-full py-3 bg-bitmap-orange text-white font-alfaslab text-base rounded-lg hover:bg-bitmap-orange/80 transition-colors disabled:opacity-50'
        }, isSaving ? 'Guardando...' : 'Guardar Cambios')
      )
  );
}