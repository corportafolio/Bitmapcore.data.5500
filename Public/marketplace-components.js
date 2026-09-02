function MarketplaceBubble(props) {
  var name = props.name;
  var icon = props.icon;
  var listings = props.listings || 0;
  var floorPrice = props.floorPrice || 0;
  var sold = props.sold || 0;
  var images = props.images || [];
  var isDiscount = props.isDiscount;
  var onSelect = props.onSelect;

  return React.createElement('button', {
    onClick: onSelect,
    className:'flex items-center gap-4 w-full bg-bitmap-surface border border-bitmap-border rounded-xl p-4 hover:border-bitmap-orange transition-all text-left'
  },
    React.createElement('div', { className:'w-12 h-12 rounded-lg bg-bitmap-black flex items-center justify-center flex-shrink-0 text-2xl' }, icon),
    React.createElement('div', { className:'flex-1 min-w-0' },
      React.createElement('div', { className:'font-alfaslab text-sm text-white truncate' }, name),
      React.createElement('div', { className:'flex gap-3 mt-1' },
        React.createElement('span', { className:'font-acme text-xs text-bitmap-muted' }, listings + ' ' + I18n.t('listedTags.listings')),
        floorPrice > 0 ? React.createElement('span', { className:'font-acme text-xs text-bitmap-orange-light' }, I18n.t('mpBubble.floor') + BitmapUtils.formatBtc(floorPrice)) : null,
        sold > 0 ? React.createElement('span', { className:'font-acme text-xs text-bitmap-muted' }, sold + ' vendidos') : null
      )
    ),
    isDiscount ? React.createElement('div', { className:'bg-bitmap-green text-white text-xs font-alfaslab px-2 py-1 rounded-full' }, 'OFF') : null,
    React.createElement('span', { className:'text-bitmap-muted text-sm' }, '\u203A')
  );
}

function MarketPreview(props) {
  var listings = props.listings || [];
  var marketplace = props.marketplace;

  if (listings.length === 0) {
    return React.createElement('div', { className:'text-center py-8 font-acme text-bitmap-muted text-sm' }, I18n.t('marketplace.noListings'));
  }

  return React.createElement('div', { className:'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3' },
    listings.slice(0, 8).map(function(listing, i) {
      var blockNum = listing.blockNumber || listing.block || i;
      return React.createElement('button', {
        key: i,
        className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-3 hover:border-bitmap-orange transition-all text-left'
      },
        React.createElement('div', { className:'w-full aspect-square mb-2 rounded-lg overflow-hidden bg-bitmap-black' },
          React.createElement(MondrianCanvas, { blockNumber:blockNum, transactions:[], size:200 })
        ),
        React.createElement('div', { className:'font-mono text-sm text-white' }, blockNum + '.bitmap'),
        React.createElement('div', { className:'font-acme text-xs text-bitmap-orange-light' },
          listing.price ? BitmapUtils.formatBtc(listing.price) + ' BTC' : 'N/A'
        )
      );
    })
  );
}

function FloorPrice(props) {
  var price = props.price || 0;
  var marketplace = props.marketplace;

  return React.createElement('div', { className:'flex items-center justify-between bg-bitmap-surface border border-bitmap-border rounded-lg p-3' },
    React.createElement('span', { className:'font-alfaslab text-xs text-bitmap-muted' }, I18n.t('mpBubble.floor') + (marketplace || '')),
    React.createElement('span', { className:'font-acme text-sm font-semibold text-bitmap-orange-light' }, BitmapUtils.formatBtc(price) + ' BTC')
  );
}

function SaleCard(props) {
  var blockNumber = props.blockNumber;
  var price = props.price;
  var date = props.date;
  var marketplace = props.marketplace;
  var image = props.image;

  return React.createElement('div', { className:'flex items-center gap-3 bg-bitmap-surface border border-bitmap-border rounded-lg p-3' },
    React.createElement('div', { className:'w-12 h-12 rounded-lg overflow-hidden bg-bitmap-black flex-shrink-0' },
      image ? React.createElement('img', { src:image, alt:'Block ' + blockNumber, className:'w-full h-full object-cover' }) :
      React.createElement(MondrianCanvas, { blockNumber:blockNumber, transactions:[], size:48 })
    ),
    React.createElement('div', { className:'min-w-0 flex-1' },
      React.createElement('div', { className:'font-mono text-sm text-white' }, blockNumber + '.bitmap'),
      React.createElement('div', { className:'font-acme text-xs text-bitmap-muted' }, (marketplace || '') + ' \u2022 ' + (date || ''))
    ),
    React.createElement('div', { className:'font-acme text-sm font-semibold text-bitmap-orange-light' },
      BitmapUtils.formatBtcSat(price) + ' BTC'
    )
  );
}

function TagGroupCard(props) {
  var tag = props.tag;
  var count = props.count;
  var floorPrice = props.floorPrice || 0;
  var onSelect = props.onSelect;

  return React.createElement('button', {
    onClick: onSelect,
    className:'flex items-center justify-between w-full bg-bitmap-surface border border-bitmap-border rounded-lg p-3 hover:border-bitmap-orange transition-all text-left'
  },
    React.createElement('div', null,
      React.createElement('div', { className:'font-alfaslab text-sm font-semibold text-white' }, tag),
      React.createElement('div', { className:'font-acme text-xs text-bitmap-muted' }, count + ' ' + I18n.t('mpBubble.blocks'))
    ),
    React.createElement('div', { className:'font-acme text-sm text-bitmap-orange-light' },
      BitmapUtils.formatBtc(floorPrice) + ' BTC'
    )
  );
}

function DiscountBadge(props) {
  var percentage = props.percentage || 0;
  var originalPrice = props.originalPrice || 0;
  var discountPrice = props.discountPrice || 0;

  return React.createElement('div', { className:'relative' },
    React.createElement('div', { className:'absolute top-2 right-2 z-10 bg-bitmap-green text-white text-xs font-alfaslab px-2 py-1 rounded-full' }, '-' + percentage + '%'),
    React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-3' },
      React.createElement('div', { className:'flex items-baseline gap-2' },
        React.createElement('span', { className:'font-acme text-sm text-bitmap-green font-semibold' }, BitmapUtils.formatBtc(discountPrice) + ' BTC'),
        React.createElement('span', { className:'font-acme text-xs text-bitmap-muted line-through' }, BitmapUtils.formatBtc(originalPrice))
      )
    )
  );
}

function SelectorBubble(props) {
  var id = props.id;
  var name = props.name;
  var logo = props.logo;
  var icon = props.icon;
  var totalListings = props.totalListings || 0;
  var floorPrice = props.floorPrice || 0;
  var previews = props.previews || [];
  var salesStats = props.salesStats || null;
  var onClick = props.onClick;

  var isTagsBubble = id === 'tags';

    if (isTagsBubble) {
    var floorBtc = floorPrice > 0 && floorPrice !== 0x7fffffffffffffff ? BitmapUtils.formatBtcSat(floorPrice) + ' BTC' : 'N/A';
    var listingsFmt = totalListings > 0 ? totalListings.toLocaleString() : 'N/A';

    var titleLine = React.createElement('div', { className:'flex items-center justify-between cursor-pointer', onClick: onClick },
      React.createElement('div', { className:'flex items-center gap-1' },
        React.createElement('span', { className:'font-alfaslab text-[15px] text-white tracking-wide' }, name),
        icon ? React.createElement('span', { className:'text-[15px]' }, icon) : null
      ),
      React.createElement('span', { className:'font-acme text-[11px] text-bitmap-muted whitespace-nowrap' },
        React.createElement('span', { className:'text-bitmap-orange' }, I18n.t('listedTags.listings') + ': '), listingsFmt,
        ' / ',
        React.createElement('span', { className:'text-bitmap-orange' }, I18n.t('mpBubble.floor')), floorBtc
      )
    );

    var tagRows = previews.length > 0 ? React.createElement('div', {
      className:'flex flex-col gap-[3px] mt-1 overflow-y-auto',
      style: { maxHeight: '180px' }
    },
      previews.map(function(tag, i) {
        var tagFloorBtc = tag.floorPrice > 0 ? BitmapUtils.formatBtcSat(tag.floorPrice) + ' BTC' : 'N/A';
        var countFmt = (tag.count || 0).toLocaleString();
        return React.createElement('div', {
          key: tag.tagName + '-' + i,
          className:'flex items-center justify-between px-2 py-1 rounded-lg border border-bitmap-border',
          style: { backgroundColor:'#0f0f0f' }
        },
          React.createElement('span', { style: {
            display:'inline-block', backgroundColor:'#8B2500', color:'#000',
            textShadow:'-1px 0 #FE3E00, 0 1px #FE3E00, 1px 0 #FE3E00, 0 -1px #FE3E00',
            borderRadius:'15px', border:'1px solid #B53D00',
            boxShadow:'inset 0 2px 6px rgba(0,0,0,0.5)',
            fontFamily:"'Alfa Slab One', serif", fontWeight:'bold', fontSize:'10px',
            padding:'2px 8px', whiteSpace:'nowrap', flexShrink:0, maxWidth:'120px',
            overflow:'hidden', textOverflow:'ellipsis'
          }}, tag.tagName),
          React.createElement('div', { className:'flex items-center gap-2 ml-2' },
            React.createElement('span', { className:'font-acme text-[10px] text-bitmap-muted whitespace-nowrap' }, countFmt + ' ' + I18n.t('mpBubble.bitmaps')),
            React.createElement('span', { className:'font-acme text-[10px] text-bitmap-orange whitespace-nowrap' }, tagFloorBtc)
          )
        );
      })
    ) : React.createElement('div', { className:'font-acme text-[10px] text-bitmap-muted mt-1' }, I18n.t('mpBubble.noTags'));

    return React.createElement('div', {
      className:'border border-bitmap-border rounded-xl p-2 hover:border-bitmap-orange transition-all',
      style: { backgroundColor: '#1A1A1A' }
    },
      titleLine,
      tagRows
    );
  }

  var _off = React.useState(0);
  var offset = _off[0];
  var setOffset = _off[1];
  var _ref = React.useRef(null);
  var _cw = React.useState(1200);
  var containerWidth = _cw[0];
  var setContainerWidth = _cw[1];
  var onLoadMore = props.onLoadMore;

  React.useEffect(function() {
    function measure() {
      if (_ref.current) {
        setContainerWidth(_ref.current.offsetWidth);
      }
    }
    measure();
    window.addEventListener('resize', measure);
    return function() { window.removeEventListener('resize', measure); };
  }, []);

  var floorBtc = floorPrice > 0 && floorPrice !== 0x7fffffffffffffff ? BitmapUtils.formatBtcSat(floorPrice) + ' BTC' : 'N/A';
  var listingsFmt = totalListings > 0 ? totalListings.toLocaleString() : 'N/A';

  var len = previews.length;
  var visibleCount = Math.max(1, Math.floor((containerWidth - 28) / 84));
  var hasArrow = offset + visibleCount < totalListings;
  var hasLeftArrow = offset > 0;
  var visible = previews.length > 0
    ? previews.slice(offset, offset + visibleCount)
    : [];

  function handleArrow(e) {
    e.stopPropagation();
    var step = visibleCount - 1;
    var next = offset + step;
    var maxOffset = Math.max(0, totalListings - visibleCount);
    next = Math.min(next, maxOffset);
    setOffset(next);
    if (next + visibleCount > len && onLoadMore) {
      onLoadMore(visibleCount);
    }
  }

  function handleLeftArrow(e) {
    e.stopPropagation();
    var step = visibleCount - 1;
    setOffset(Math.max(offset - step, 0));
  }

  function buildImageUrl(p) {
    var bn = p.blockNumber || 0;
    var et = encodeURIComponent(p.etiquetas || '');
    var tx = p.totalTransacciones || 0;
    var h = encodeURIComponent(p.hash || '');
    var isPerfect = (p.etiquetas || '').toLowerCase().indexOf('grid') !== -1;
    var isPunk = (p.etiquetas || '').toLowerCase().indexOf('punk') !== -1;
    return '/api/v1/block-image/' + bn + '?v=5&size=80&etiquetas=' + et + '&tx=' + tx + '&hash=' + h + '&grid=' + isPerfect + '&punk=' + isPunk;
  }

  function firstTag(etiquetas) {
    if (!etiquetas) return '';
    var parts = etiquetas.split(',');
    return (parts[0] || '').trim();
  }

  var tagColors = {
    'ORDINALSWALLET': { bg:'#1a56db', border:'#2563eb', shadow:'#3b82f6' },
    'UNISAT': { bg:'#854d0e', border:'#a16207', shadow:'#ca8a04' },
    'BITMAPCORE': { bg:'#8B2500', border:'#B53D00', shadow:'#FE3E00' }
  };
  var tc = tagColors[name] || null;

  var statsLine = null;
  if (salesStats) {
    var h24 = salesStats.h24 || {};
    var d7 = salesStats.d7 || {};
    var d30 = salesStats.d30 || {};
  }

  var titleLine = React.createElement('div', { className:'flex items-center justify-between cursor-pointer', onClick: onClick },
    React.createElement('div', { className:'flex items-center gap-1' },
      tc ? React.createElement('span', {
        style: {
          display:'inline-block', backgroundColor:tc.bg, color:'#000',
          textShadow:'-1px 0 '+tc.shadow+', 0 1px '+tc.shadow+', 1px 0 '+tc.shadow+', 0 -1px '+tc.shadow,
          borderRadius:'15px', border:'1px solid '+tc.border,
          boxShadow:'inset 0 2px 6px rgba(0,0,0,0.5)',
          fontFamily:"'Alfa Slab One', serif", fontWeight:'bold', fontSize:'11px',
          padding:'2px 8px', whiteSpace:'nowrap'
        }
      }, name) :
      React.createElement('span', { className:'font-alfaslab text-[15px] text-white tracking-wide' }, name),
      logo ? React.createElement('img', { src:logo, alt:name, className:'h-[15px] w-[15px] object-contain' }) :
      icon ? React.createElement('span', { className:'text-[15px]' }, icon) : null
    ),
    salesStats ? React.createElement('span', { className:'font-acme text-[10px] text-bitmap-muted whitespace-nowrap' },
      I18n.t('mpBubble.hours24') + ' ', React.createElement('span', { className:'text-bitmap-orange' }, h24.count || 0, ' ' + I18n.t('mpBubble.salesCount')), ' \u00B7 ', BitmapUtils.formatBtcSat(h24.volume || 0), ' BTC',
      ' ', React.createElement('span', { className:'text-bitmap-orange' }, '/'), I18n.t('mpBubble.perWeek') + ' ', React.createElement('span', { className:'text-bitmap-orange' }, d7.count || 0, ' ' + I18n.t('mpBubble.salesCount')), ' \u00B7 ', BitmapUtils.formatBtcSat(d7.volume || 0), ' BTC',
      ' ', React.createElement('span', { className:'text-bitmap-orange' }, '/'), I18n.t('mpBubble.perMonth') + ' ', React.createElement('span', { className:'text-bitmap-orange' }, d30.count || 0, ' ' + I18n.t('mpBubble.salesCount')), ' \u00B7 ', BitmapUtils.formatBtcSat(d30.volume || 0), ' BTC'
    ) :
    React.createElement('span', { className:'font-acme text-[11px] text-bitmap-muted whitespace-nowrap' },
      React.createElement('span', { className:'text-bitmap-orange' }, I18n.t('listedTags.listings') + ': '), listingsFmt,
      ' / ',
      React.createElement('span', { className:'text-bitmap-orange' }, I18n.t('mpBubble.floor')), floorBtc
    )
  );

  var previewCards = visible.length > 0 ? React.createElement('div', { className:'flex items-center gap-[2px]' },
    hasLeftArrow ? React.createElement('button', {
      onClick: handleLeftArrow,
      className:'flex items-center justify-center w-[28px] h-[80px] bg-bitmap-black border border-bitmap-border rounded-lg flex-shrink-0 hover:border-bitmap-orange transition-colors cursor-pointer'
    },
      React.createElement('svg', { width:'14', height:'14', viewBox:'0 0 24 24', fill:'none', stroke:'var(--bitmap-orange)', strokeWidth:'2.5', strokeLinecap:'round', strokeLinejoin:'round' },
        React.createElement('polyline', { points:'15 18 9 12 15 6' })
      )
    ) : null,
    React.createElement('div', { ref: _ref, className:'flex gap-[2px] overflow-x-hidden flex-1' },
      visible.map(function(preview, i) {
        var priceBtc = preview.listedPrice ? BitmapUtils.formatBtcSat(preview.listedPrice) : 'N/A';
        var tag = firstTag(preview.etiquetas);
var sourceLogo = preview.source === 'ordinalswallet' ? 'ordinalswallet_logo.png' :
                           preview.source === 'unisat' ? 'unisat_logo.png' :
                           preview.source === 'local' ? 'logo_bitmapcore_logo.png' : null;
          return React.createElement('div', {
            key: preview.blockNumber + '-' + offset + '-' + i,
            className:'flex flex-col items-center bg-bitmap-black rounded-lg p-[2px] flex-shrink-0',
            style: { minWidth: 82 }
          },
            React.createElement('span', { style:{ color:'#fff', fontFamily:"ui-monospace,'Courier New',monospace", fontSize:'9px', whiteSpace:'nowrap', lineHeight:'1.2' } }, (preview.blockNumber || '?') + '.bitmap'),
            React.createElement('span', { style:{ color:'#666666', fontFamily:"'Acme',sans-serif", fontSize:'9px', whiteSpace:'nowrap', lineHeight:'1.2', display:'flex', alignItems:'center', gap:'2px' } },
              sourceLogo ? React.createElement('img', { src:sourceLogo, className:'h-[10px] w-[10px] object-contain flex-shrink-0' }) : null,
              preview.discountPercentage ? React.createElement('span', { style:{ color:'#00AA00', fontWeight:'bold' } }, preview.discountPercentage + '% ') : null,
              priceBtc + ' BTC'
            ),
          tag ? React.createElement('span', {
            style: {
              display:'inline-block', backgroundColor:'#8B2500', color:'#000',
              textShadow:'-1px 0 #FE3E00, 0 1px #FE3E00, 1px 0 #FE3E00, 0 -1px #FE3E00',
              borderRadius:'15px', border:'1px solid #B53D00',
              boxShadow:'inset 0 2px 6px rgba(0,0,0,0.5)',
              fontFamily:"'Alfa Slab One', serif", fontWeight:'bold', fontSize:'7px',
              padding:'1px 4px', maxWidth:'80px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:'1.2'
            }
          }, tag) : null,
          React.createElement('img', {
            src: buildImageUrl(preview),
            alt: (preview.blockNumber || '?') + '.bitmap',
            className:'w-[80px] h-[80px] rounded',
            style: { imageRendering: 'pixelated', background: '#1a1a1a' },
            loading: 'lazy'
          })
        );
      })
    ),
    hasArrow ? React.createElement('button', {
      onClick: handleArrow,
      className:'flex items-center justify-center w-[28px] h-[80px] bg-bitmap-black border border-bitmap-border rounded-lg flex-shrink-0 hover:border-bitmap-orange transition-colors cursor-pointer'
    },
      React.createElement('svg', { width:'14', height:'14', viewBox:'0 0 24 24', fill:'none', stroke:'var(--bitmap-orange)', strokeWidth:'2.5', strokeLinecap:'round', strokeLinejoin:'round' },
        React.createElement('polyline', { points:'9 18 15 12 9 6' })
      )
    ) : null
  ) : React.createElement('div', { className:'font-acme text-[10px] text-bitmap-muted' }, I18n.t('mpBubble.noPreview'));

  return React.createElement('div', {
    className:'border border-bitmap-border rounded-xl p-2 hover:border-bitmap-orange transition-all',
    style: { backgroundColor: '#1A1A1A' }
  },
    titleLine,
    previewCards
  );
}