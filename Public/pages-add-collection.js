function AddCollectionPage(props) {
  var navigate = props.navigate;
  var _meta = React.useState(null);
  var metaText = _meta[0];
  var setMetaText = _meta[1];
  var _metaName = React.useState('');
  var metaFileName = _metaName[0];
  var setMetaFileName = _metaName[1];
  var _err = React.useState({});
  var errors = _err[0];
  var setErrors = _err[1];
  var _img = React.useState(null);
  var imageFile = _img[0];
  var setImageFile = _img[1];
  var _imgPrev = React.useState(null);
  var imagePreview = _imgPrev[0];
  var setImagePreview = _imgPrev[1];
  var _imgName = React.useState('');
  var imageFileName = _imgName[0];
  var setImageFileName = _imgName[1];
  var _insc = React.useState(null);
  var inscFile = _insc[0];
  var setInscFile = _insc[1];
  var _inscName = React.useState('');
  var inscFileName = _inscName[0];
  var setInscFileName = _inscName[1];
  var _x = React.useState('');
  var xAccount = _x[0];
  var setXAccount = _x[1];
  var _disc = React.useState('');
  var discord = _disc[0];
  var setDiscord = _disc[1];
  var _status = React.useState(null);
  var status = _status[0];
  var setStatus = _status[1];

  var MAX_PNG = 512;
  var REQUIRED_COLOR = '#FF3333';

  var validateImage = function(file) {
    return new Promise(function(resolve) {
      if (!file) { setImageFile(null); setImagePreview(null); setImageFileName(''); return resolve({ ok: false, error: I18n.t('addCollection.image.errorRequired') }); }
      if (file.type !== 'image/png') {
        setImageFile(null); setImagePreview(null); setImageFileName('');
        return resolve({ ok: false, error: I18n.t('addCollection.image.errorPng') });
      }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function() {
        URL.revokeObjectURL(url);
        if (img.width > MAX_PNG || img.height > MAX_PNG) {
          setImageFile(null); setImagePreview(null); setImageFileName('');
          return resolve({ ok: false, error: I18n.t('addCollection.image.errorSize', { max: MAX_PNG, w: img.width, h: img.height }) });
        }
        setImageFile(file);
        setImagePreview(url);
        setImageFileName(file.name);
        resolve({ ok: true });
      };
      img.onerror = function() { URL.revokeObjectURL(url); setImageFile(null); setImagePreview(null); setImageFileName(''); resolve({ ok: false, error: I18n.t('addCollection.image.errorRead') }); };
      img.src = url;
    });
  };

  var onImageChange = function(e) {
    var f = e.target.files && e.target.files[0];
    if (f) { setImageFileName(f.name); } else { setImageFileName(''); }
    validateImage(f);
  };

  var onMetaChange = function(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) { setMetaText(null); setMetaFileName(''); return; }
    setMetaFileName(f.name);
    var r = new FileReader();
    r.onload = function() { setMetaText(r.result); };
    r.readAsText(f);
  };

  var onInscriptionsChange = function(e) {
    var f = e.target.files && e.target.files[0];
    setInscFile(f);
    setInscFileName(f ? f.name : '');
  };

  var parseMeta = function() {
    try {
      return JSON.parse(metaText);
    } catch (e) {
      return null;
    }
  };

  var handleSubmit = async function(e) {
    if (e && e.preventDefault) e.preventDefault();
    var errs = {};

    if (!metaText) errs.meta = I18n.t('addCollection.meta.errorRequired');
    else {
      var metaObj = parseMeta();
      if (!metaObj || typeof metaObj !== 'object') errs.meta = I18n.t('addCollection.meta.errorInvalid');
      else if (!metaObj.name) errs.meta = I18n.t('addCollection.meta.errorNoName');
    }
    if (!inscFile) errs.inscriptions = I18n.t('addCollection.inscriptions.errorRequired');
    if (!imageFile) errs.image = I18n.t('addCollection.image.errorRequired');

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setStatus({ type: 'loading', message: I18n.t('addCollection.status.validating') });

    try {
      var inscText = await AssetApi.readAsText(inscFile);
      var inscData = JSON.parse(inscText);
      var inscItems = Array.isArray(inscData) ? inscData : (inscData && inscData.items);
      if (!Array.isArray(inscItems) || inscItems.length === 0) {
        setStatus({ type: 'error', message: I18n.t('addCollection.inscriptions.errorEmpty') });
        setErrors({ inscriptions: I18n.t('addCollection.inscriptions.errorEmpty') });
        return;
      }
    } catch (err) {
      setStatus({ type: 'error', message: I18n.t('addCollection.inscriptions.errorInvalid') });
      setErrors({ inscriptions: I18n.t('addCollection.inscriptions.errorInvalid') });
      return;
    }

    var imgCheck = await validateImage(imageFile);
    if (!imgCheck.ok) {
      setStatus({ type: 'error', message: imgCheck.error });
      setErrors({ image: imgCheck.error });
      return;
    }

    setStatus({ type: 'loading', message: I18n.t('addCollection.status.sending') });

    try {
      var res = await AssetApi.registerCollection({
        metaFile: new File([metaText], 'meta.json', { type: 'application/json' }),
        inscriptionsFile: inscFile,
        imageFile: imageFile,
        xAccount: xAccount || '',
        discord: discord || ''
      });
      var slug = res && res.data && res.data.slug;
      setStatus({
        type: 'done',
        message: I18n.t('addCollection.status.success')
      });
      if (slug) {
        setTimeout(function() {
          navigate('/collections/' + slug);
        }, 10000);
      }
    } catch (err) {
      setStatus({ type: 'error', message: (err && err.message) || I18n.t('addCollection.status.error') });
    }
  };

  var descriptionFromMeta = (function() {
    var m = parseMeta();
    return (m && m.description) || '';
  })();

  var titleFromMeta = (function() {
    var m = parseMeta();
    return (m && (m.name || m.slug)) || '';
  })();

  var lbl = function(label, required) {
    return React.createElement('label', { className: 'block font-acme text-sm mb-1', style: { color: '#ccc' } },
      label,
      required ? React.createElement('span', { className: 'ml-1', style: { color: REQUIRED_COLOR } }, '*') : null
    );
  };

  var inputCls = 'w-full bg-bitmap-black border border-bitmap-border rounded-lg px-3 py-2 font-acme text-sm text-white focus:outline-none focus:border-bitmap-orange transition-colors';

  var fileBtnCls = 'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-bitmap-border bg-bitmap-surface cursor-pointer hover:bg-bitmap-border transition-colors font-acme text-sm';

  var makeFileInput = function(inputId, accept, onChange, fileName) {
    return React.createElement('div', { className: 'relative' },
      React.createElement('input', {
        type: 'file',
        accept: accept,
        onChange: onChange,
        className: 'absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10',
        id: inputId
      }),
      React.createElement('div', { className: fileBtnCls },
        React.createElement('svg', { className: 'w-4 h-4 flex-shrink-0', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', style: { color: '#000' } },
          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' })
        ),
        React.createElement('span', { style: { color: '#000' } },
          fileName ? fileName : I18n.t('addCollection.file.select')
        )
      )
    );
  };

  return React.createElement('div', { className: 'flex flex-col h-full bg-bitmap-black overflow-y-auto' },
    React.createElement('div', { className: 'bg-bitmap-surface border-b border-bitmap-border px-4 py-3 flex items-center gap-3' },
      React.createElement('button', {
        onClick: function() { if (navigate) navigate(-1); else window.history.back(); },
        className: 'text-bitmap-orange hover:text-bitmap-orange-light text-xl'
      }, '\u2190'),
      React.createElement('div', null,
        React.createElement('div', { className: 'font-alfaslab text-white text-base' }, I18n.t('addCollection.title')),
        React.createElement('div', { className: 'font-acme text-[11px] text-bitmap-muted' }, I18n.t('addCollection.subtitle'))
      )
    ),

    React.createElement('div', { className: 'max-w-xl w-full mx-auto p-4' },
      React.createElement('div', { className: 'bg-bitmap-surface border border-bitmap-border rounded-xl p-4 space-y-4' },

        React.createElement('div', null,
          lbl(I18n.t('addCollection.image.label'), true),
          React.createElement('div', { className: 'flex items-center gap-3' },
            React.createElement('div', {
              className: 'w-24 h-24 rounded-lg border border-dashed flex items-center justify-center overflow-hidden flex-shrink-0',
              style: imagePreview ? { borderColor: 'transparent' } : { borderColor: '#444', background: '#111' }
            },
              imagePreview ? React.createElement('img', { src: imagePreview, className: 'w-full h-full object-cover' })
                : React.createElement('span', { className: 'text-[10px] text-bitmap-muted text-center px-1', style:{whiteSpace:'pre'} }, I18n.t('addCollection.image.placeholder'))
            ),
            React.createElement('div', { className: 'flex-1' },
              makeFileInput('file-input-image', 'image/png', onImageChange, imageFileName),
              React.createElement('div', { className: 'text-[11px] text-bitmap-muted mt-1' }, I18n.t('addCollection.image.hint'))
            )
          ),
          errors.image ? React.createElement('div', { className: 'text-[11px] mt-1', style: { color: REQUIRED_COLOR } }, errors.image) : null
        ),

        React.createElement('div', null,
          lbl(I18n.t('addCollection.meta.label'), true),
          makeFileInput('file-input-meta', '.json,application/json', onMetaChange, metaFileName),
          React.createElement('div', { className: 'text-[11px] text-bitmap-muted mt-1' }, I18n.t('addCollection.meta.hint')),
          errors.meta ? React.createElement('div', { className: 'text-[11px] mt-1', style: { color: REQUIRED_COLOR } }, errors.meta) : null
        ),

        React.createElement('div', null,
          lbl(I18n.t('addCollection.inscriptions.label'), true),
          makeFileInput('file-input-insc', '.json,application/json', onInscriptionsChange, inscFileName),
          React.createElement('div', { className: 'text-[11px] text-bitmap-muted mt-1' }, I18n.t('addCollection.inscriptions.hint')),
          errors.inscriptions ? React.createElement('div', { className: 'text-[11px] mt-1', style: { color: REQUIRED_COLOR } }, errors.inscriptions) : null
        ),

        metaText ? React.createElement('div', { className: 'rounded-lg p-3', style: { background: '#111', border: '1px solid #2a2a2a' } },
          React.createElement('div', { className: 'font-acme text-[11px] text-bitmap-muted mb-1' }, I18n.t('addCollection.preview.label')),
          React.createElement('div', { className: 'font-alfaslab text-white' }, titleFromMeta || I18n.t('addCollection.preview.noName')),
          descriptionFromMeta ? React.createElement('div', { className: 'font-acme text-xs text-bitmap-text mt-1' }, descriptionFromMeta) : null
        ) : null,

        React.createElement('div', null,
          lbl(I18n.t('addCollection.xAccount.label'), false),
          React.createElement('input', {
            type: 'text', value: xAccount,
            onChange: function(e) { setXAccount(e.target.value); },
            placeholder: I18n.t('addCollection.xAccount.placeholder'), className: inputCls
          })
        ),

        React.createElement('div', null,
          lbl(I18n.t('addCollection.discord.label'), false),
          React.createElement('input', {
            type: 'text', value: discord,
            onChange: function(e) { setDiscord(e.target.value); },
            placeholder: I18n.t('addCollection.discord.placeholder'), className: inputCls
          })
        ),

        React.createElement('div', { className: 'flex items-center gap-3 pt-2' },
          React.createElement('button', {
            onClick: handleSubmit,
            disabled: !!(status && status.type === 'loading'),
            className: 'flex-1 px-4 py-2.5 rounded-lg font-acme text-sm font-bold transition-colors disabled:opacity-60',
            style: { background: 'linear-gradient(180deg,#FE3E00,#b52a00)', color: '#000' }
          }, status && status.type === 'loading' ? I18n.t('addCollection.submit.loading') : I18n.t('addCollection.submit.label')),
          React.createElement('div', { className: 'text-[10px] text-bitmap-muted' },
            React.createElement('span', { style: { color: REQUIRED_COLOR } }, '*'),
            ' ', I18n.t('addCollection.submit.requiredHint')
          )
        ),

        status ? React.createElement('div', {
          className: 'rounded-lg p-3 mt-2 font-acme text-sm',
          style: status.type === 'error' ? { background: 'rgba(255,51,51,0.12)', color: '#FF5555' }
            : status.type === 'done' ? { background: 'rgba(0,170,0,0.12)', color: '#00CC00' }
            : { background: 'rgba(254,62,0,0.12)', color: '#FF8A5C' }
        },
          status.type === 'loading'
            ? React.createElement(React.Fragment, null,
                React.createElement('div', { className: 'inline-block w-4 h-4 border-2 border-bitmap-orange border-t-transparent rounded-full animate-spin align-middle mr-2' }),
                status.message
              )
            : status.type === 'done'
            ? React.createElement(React.Fragment, null,
                React.createElement('div', { className: 'flex items-center gap-2 mb-1' },
                  React.createElement('svg', { className: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', style: { color: '#00CC00' } },
                    React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M5 13l4 4L19 7' })
                  ),
                  React.createElement('span', { className: 'font-bold' }, I18n.t('addCollection.status.successTitle'))
                ),
                React.createElement('span', null, status.message)
              )
            : status.message
        ) : null
      )
    )
  );
}

if (typeof window !== 'undefined') {
  window.AddCollectionPage = AddCollectionPage;
}
