function AddCollectionPage(props) {
  var navigate = props.navigate;
  var _meta = React.useState(null);
  var metaText = _meta[0];
  var setMetaText = _meta[1];
  var _err = React.useState({});
  var errors = _err[0];
  var setErrors = _err[1];
  var _img = React.useState(null);
  var imageFile = _img[0];
  var setImageFile = _img[1];
  var _imgPrev = React.useState(null);
  var imagePreview = _imgPrev[0];
  var setImagePreview = _imgPrev[1];
  var _insc = React.useState(null);
  var inscFile = _insc[0];
  var setInscFile = _insc[1];
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
      if (!file) { setImageFile(null); setImagePreview(null); return resolve({ ok: false, error: I18n.t('addCollection.status.error') }); }
      if (file.type !== 'image/png') {
        setImageFile(null); setImagePreview(null);
        return resolve({ ok: false, error: I18n.t('addCollection.meta.errorInvalid') });
      }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function() {
        URL.revokeObjectURL(url);
        if (img.width > MAX_PNG || img.height > MAX_PNG) {
          setImageFile(null); setImagePreview(null);
          return resolve({ ok: false, error: 'Max ' + MAX_PNG + 'x' + MAX_PNG + 'px (' + img.width + 'x' + img.height + ')' });
        }
        setImageFile(file);
        setImagePreview(url);
        resolve({ ok: true });
      };
      img.onerror = function() { URL.revokeObjectURL(url); setImageFile(null); setImagePreview(null); resolve({ ok: false, error: I18n.t('addCollection.status.error') }); };
      img.src = url;
    });
  };

  var onImageChange = function(e) {
    validateImage(e.target.files && e.target.files[0]);
  };

  var onMetaChange = function(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) { setMetaText(null); return; }
    var r = new FileReader();
    r.onload = function() { setMetaText(r.result); };
    r.readAsText(f);
  };

  var onInscriptionsChange = function(e) {
    setInscFile(e.target.files && e.target.files[0]);
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
    if (!imageFile) errs.image = I18n.t('addCollection.status.error');

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
  var fileCls = 'w-full text-sm text-bitmap-muted file:mr-3 file:px-3 file:py-1.5 file:rounded file:border-0 file:bg-bitmap-surface file:text-black file:cursor-pointer';

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
              className: 'w-24 h-24 rounded-lg border border-dashed flex items-center justify-center overflow-hidden',
              style: imagePreview ? { borderColor: 'transparent' } : { borderColor: '#444', background: '#111' }
            },
              imagePreview ? React.createElement('img', { src: imagePreview, className: 'w-full h-full object-cover' })
                : React.createElement('span', { className: 'text-[10px] text-bitmap-muted text-center px-1', style:{whiteSpace:'pre'} }, I18n.t('addCollection.image.placeholder'))
            ),
            React.createElement('div', { className: 'flex-1' },
              React.createElement('input', { type: 'file', accept: 'image/png', onChange: onImageChange, className: fileCls }),
              React.createElement('div', { className: 'text-[11px] text-bitmap-muted mt-1' }, I18n.t('addCollection.image.hint'))
            )
          ),
          errors.image ? React.createElement('div', { className: 'text-[11px] mt-1', style: { color: REQUIRED_COLOR } }, errors.image) : null
        ),

        React.createElement('div', null,
          lbl(I18n.t('addCollection.meta.label'), true),
          React.createElement('input', { type: 'file', accept: '.json,application/json', onChange: onMetaChange, className: fileCls }),
          React.createElement('div', { className: 'text-[11px] text-bitmap-muted mt-1' }, I18n.t('addCollection.meta.hint')),
          errors.meta ? React.createElement('div', { className: 'text-[11px] mt-1', style: { color: REQUIRED_COLOR } }, errors.meta) : null
        ),

        React.createElement('div', null,
          lbl(I18n.t('addCollection.inscriptions.label'), true),
          React.createElement('input', { type: 'file', accept: '.json,application/json', onChange: onInscriptionsChange, className: fileCls }),
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
            : status.message
        ) : null
      )
    )
  );
}

if (typeof window !== 'undefined') {
  window.AddCollectionPage = AddCollectionPage;
}
