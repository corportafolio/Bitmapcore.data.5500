function SettingsPage(props) {
  var navigate = props.navigate;
  var _a = React.useState('');
  var alias = _a[0];
  var setAlias = _a[1];
  var _b = React.useState('dark');
  var theme = _b[0];
  var setTheme = _b[1];
  var _c = React.useState(I18n.getCurrentLang());
  var language = _c[0];
  var setLanguage = _c[1];
  var _d = React.useState(false);
  var langDropdownOpen = _d[0];
  var setLangDropdownOpen = _d[1];
  var _e = React.useState(false);
  var isSaving = _e[0];
  var setIsSaving = _e[1];
  var _f = React.useState(false);
  var saved = _f[0];
  var setSaved = _f[1];
  var walletState = StoreApp.get('wallet');

  React.useEffect(function() {
    var storedAlias = localStorage.getItem('bitmap_alias');
    var storedTheme = localStorage.getItem('bitmap_theme');
    if (storedAlias) setAlias(storedAlias);
    if (storedTheme) {
      setTheme(storedTheme);
      document.documentElement.classList.toggle('light', storedTheme === 'light');
    }
  }, []);

  var handleSave = function() {
    setIsSaving(true);
    localStorage.setItem('bitmap_alias', alias);
    localStorage.setItem('bitmap_theme', theme);
    I18n.saveLanguage();
    document.documentElement.classList.toggle('light', theme === 'light');
    setIsSaving(false);
    setSaved(true);
    setTimeout(function() { setSaved(false); }, 2000);
  };

  var handleLanguageSelect = function(lang) {
    setLanguage(lang);
    setLangDropdownOpen(false);
  };

  return React.createElement('div', { className:'p-4 lg:p-6' },
    React.createElement('div', { className:'max-w-xl mx-auto space-y-6' },
      React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-6' },
        React.createElement('h2', { className:'font-alfaslab text-lg text-white mb-4 flex items-center gap-2' },
          React.createElement('span', { className:'text-xl' }, '\uD83D\uDC64'),
          ' ', I18n.t('settings.title')
        ),
        React.createElement('div', { className:'space-y-4' },
          React.createElement('div', null,
            React.createElement('label', { className:'font-acme text-xs text-bitmap-muted block mb-1' }, 'Alias'),
            React.createElement('input', {
              type:'text',
              value:alias,
              onChange:function(e) { setAlias(e.target.value); },
              placeholder:I18n.t('settings.alias') || 'Your alias on BitmapCore',
              className:'w-full bg-bitmap-black border border-bitmap-border rounded-lg px-3 py-2 font-acme text-sm text-bitmap-text placeholder-bitmap-muted focus:outline-none focus:border-bitmap-orange'
            })
          ),
          walletState.isConnected ? React.createElement('div', { className:'bg-bitmap-black/50 rounded-lg p-3 border border-bitmap-border' },
            React.createElement('div', { className:'font-acme text-xs text-bitmap-muted' }, 'Wallet Connected'),
            React.createElement('div', { className:'font-alfaslab text-sm text-bitmap-orange mt-1' }, BitmapUtils.truncateAddress(walletState.address, 6)),
            React.createElement('button', { onClick:function() { StoreApp.dispatch({ type:'DISCONNECT_WALLET' }); }, className:'mt-2 px-3 py-1 text-xs bg-bitmap-red text-white rounded hover:bg-bitmap-red/80' }, 'Disconnect')
          ) : React.createElement('div', { className:'bg-bitmap-black/50 rounded-lg p-3 border border-bitmap-border' },
            React.createElement('div', { className:'font-acme text-xs text-bitmap-muted' }, 'Wallet Not Connected'),
            React.createElement('button', { onClick:function() { navigate('/wallet'); }, className:'mt-2 px-3 py-1 text-xs bg-bitmap-orange text-white rounded hover:bg-bitmap-orange/80' }, 'Connect Wallet')
          ),
          saved ? React.createElement('div', { className:'text-xs text-bitmap-green flex items-center gap-1' },
            React.createElement('span', null, '\u2713'),
            ' ', I18n.t('settings.saved')
          ) : null
        )
      ),

      React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-6' },
        React.createElement('h2', { className:'font-alfaslab text-lg text-white mb-4 flex items-center gap-2' },
          React.createElement('span', { className:'text-xl' }, '\uD83C\uDF1E'),
          ' ', I18n.t('settings.theme')
        ),
        React.createElement('div', { className:'space-y-4' },
          React.createElement('div', null,
            React.createElement('label', { className:'font-acme text-xs text-bitmap-muted block mb-2' }, I18n.t('settings.theme')),
            React.createElement('div', { className:'grid grid-cols-2 gap-3' },
              ['dark', 'light'].map(function(t) {
                return React.createElement('button', {
                  key: t,
                  onClick: function() { setTheme(t); },
                  className: 'py-3 rounded-lg border-2 font-alfaslab text-sm transition-all ' +
                    (theme === t ? 'border-bitmap-orange bg-bitmap-orange/10 text-bitmap-orange' : 'border-bitmap-border text-bitmap-text hover:border-bitmap-orange/50')
                }, t === 'dark' ? '\uD83D\uDD75\uFE0F Dark' : '\u2600\uFE0F Light');
              })
            )
          ),
          React.createElement('div', null,
            React.createElement('label', { className:'font-acme text-xs text-bitmap-muted block mb-2' }, I18n.t('settings.language')),
            React.createElement('div', { className:'relative' },
              React.createElement('button', {
                onClick: function(e) { e.stopPropagation(); setLangDropdownOpen(!langDropdownOpen); },
                className: 'w-full py-3 rounded-lg border-2 font-alfaslab text-sm transition-all flex items-center justify-between ' +
                  'border-bitmap-orange bg-bitmap-orange/10 text-bitmap-orange'
              },
                React.createElement('span', { className: 'flex items-center gap-2' },
                  language === 'en' ? '\uD83C\uDDEC\uD83C\uDDE7' : '\uD83C\uDDEA\uD83C\uDDF8',
                  language === 'en' ? 'English' : 'Espa\u00F1ol'
                ),
                React.createElement('span', { className: 'text-xs transition-transform' + (langDropdownOpen ? ' rotate-180' : '') }, '\u25BC')
              ),
              langDropdownOpen ? React.createElement('div', {
                className: 'absolute right-0 top-full mt-1 w-full bg-bitmap-black border border-bitmap-border rounded-lg shadow-lg z-50 py-1',
                onClick: function(e) { e.stopPropagation(); }
              },
                ['en', 'es'].map(function(l) {
                  var isSelected = language === l;
                  return React.createElement('button', {
                    key: l,
                    onClick: function() { handleLanguageSelect(l); },
                    className: 'w-full px-4 py-2 text-left font-acme text-sm transition-all flex items-center gap-2 ' +
                      (isSelected ? 'bg-bitmap-orange/10 text-bitmap-orange' : 'text-bitmap-text hover:bg-bitmap-black/30 hover:text-white')
                  },
                    React.createElement('span', { className: 'flex items-center gap-2' },
                      l === 'en' ? '\uD83C\uDDEC\uD83C\uDDE7' : '\uD83C\uDDEA\uD83C\uDDF8',
                      l === 'en' ? 'English' : 'Espa\u00F1ol'
                    ),
                    isSelected ? React.createElement('span', { className: 'ml-auto text-bitmap-orange' }, '\u2713') : null
                  );
                })
              ) : null
            )
          )
        )
      ),

      React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-6' },
        React.createElement('h2', { className:'font-alfaslab text-lg text-white mb-4 flex items-center gap-2' },
          React.createElement('span', { className:'text-xl' }, '\uD83D\uDCCA'),
          ' ', I18n.t('settings.about') || 'About'
        ),
        React.createElement('div', { className:'space-y-3 font-acme text-sm text-bitmap-text' },
          React.createElement('div', { className:'flex justify-between' },
            React.createElement('span', { className:'text-bitmap-muted' }, 'Version'),
            React.createElement('span', null, '1.0.0')
          ),
          React.createElement('div', { className:'flex justify-between' },
            React.createElement('span', { className:'text-bitmap-muted' }, 'Database'),
            React.createElement('span', null, '~1,000,000 blocks')
          ),
          React.createElement('div', { className:'flex justify-between' },
            React.createElement('span', { className:'text-bitmap-muted' }, 'Tag Tables'),
            React.createElement('span', null, '55')
          ),
          React.createElement('div', { className:'flex justify-between' },
            React.createElement('span', { className:'text-bitmap-muted' }, 'Primary Color'),
            React.createElement('span', { className:'font-alfaslab text-bitmap-orange' }, '#FE3E00')
          ),
          React.createElement('div', { className:'flex justify-between' },
            React.createElement('span', { className:'text-bitmap-muted' }, 'Background Color'),
            React.createElement('span', { className:'font-alfaslab text-white' }, '#080008')
          )
        )
      ),

      React.createElement('button', {
        onClick: handleSave,
        disabled: isSaving,
        className:'w-full py-3 bg-bitmap-orange text-white font-alfaslab text-base rounded-lg hover:bg-bitmap-orange/80 transition-colors disabled:opacity-50'
      }, isSaving ? I18n.t('app.loading') : I18n.t('settings.save'))
    )
  );
}