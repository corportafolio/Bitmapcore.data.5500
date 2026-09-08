var AnalyticsDashboard = (function(){
  var API = '/api/analytics';
  var TOKEN = new URLSearchParams(window.location.search).get('key') || '';
  var RANGE = '7d';
  var currentTab = 'overview';
  var charts = {};
  var refreshTimer = null;
  var pagesGrouped = false;
  var trackingTab = 'collection';
  var trackingData = { total:0, page:1, limit:50, rows:[] };
  var trackingLoading = false;
  var trackingFilter = { status:'', search:'', days:0 };
  var trackingDetail = null;

  function api(path, params){
    var sep = path.indexOf('?') >= 0 ? '&' : '?';
    var url = API + path + sep + 'key=' + TOKEN + (params ? '&' + params : '');
    return fetch(url).then(function(r){ if(!r.ok) throw new Error('API error'); return r.json(); });
  }

  function fmt(n){
    if(n >= 1000000) return (n/1000000).toFixed(1)+'M';
    if(n >= 1000) return (n/1000).toFixed(1)+'K';
    return n.toString();
  }

  function pctChange(current, prev){
    if(!prev || prev === 0) return current > 0 ? '+∞' : '0%';
    var p = ((current - prev) / prev * 100);
    var sign = p >= 0 ? '+' : '';
    return sign + p.toFixed(1) + '%';
  }

  function pctColor(current, prev){
    if(!prev || prev === 0) return current > 0 ? '#00AA00' : '#B0B0B0';
    return current >= prev ? '#00AA00' : '#FF3333';
  }

  function timeAgo(ms){
    if(!ms) return '-';
    var s = Math.floor(ms / 1000);
    if(s < 60) return s + 's';
    var m = Math.floor(s / 60);
    if(m < 60) return m + 'm ' + (s%60) + 's';
    var h = Math.floor(m / 60);
    return h + 'h ' + (m%60) + 'm';
  }

  function destroyChart(id){
    if(charts[id]){ charts[id].destroy(); delete charts[id]; }
  }

  function chartColors(count){
    var base = ['#FE3E00','#FF6B35','#00AA00','#FF3333','#3498DB','#9B59B6','#F1C40F','#1ABC9C','#E67E22','#E74C3C'];
    var colors = [];
    for(var i = 0; i < count; i++) colors.push(base[i % base.length]);
    return colors;
  }

  var RangeSelector = React.createElement('div', {style:{display:'flex',gap:'4px'}},
    ['24h','7d','30d','90d'].map(function(r){
      return React.createElement('button', {
        key: r,
        onClick: function(){ RANGE = r; loadDashboard(); },
        style:{
          padding:'6px 14px',borderRadius:'6px',border:'1px solid '+(RANGE===r?'#FE3E00':'#2A2A2A'),
          background:RANGE===r?'#FE3E00':'transparent',color:RANGE===r?'#000':'#B0B0B0',
          fontFamily:'Acme',fontSize:'13px',cursor:'pointer',fontWeight:'bold',transition:'all 0.2s'
        }
      }, r);
    })
  );

  function KPICard(label, value, change, prevColor){
    var color = prevColor || '#B0B0B0';
    return React.createElement('div', {
      style:{background:'#191217',border:'1px solid #2A2A2A',borderRadius:'10px',padding:'16px 20px',flex:'1',minWidth:'150px'}
    },
      React.createElement('div', {style:{color:'#666',fontSize:'12px',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'6px'}}, label),
      React.createElement('div', {style:{color:'#fff',fontSize:'28px',fontWeight:'bold',marginBottom:'4px'}}, value),
      React.createElement('div', {style:{color:color,fontSize:'12px',fontWeight:'bold'}}, change)
    );
  }

  function TabBar(tabs){
    return React.createElement('div', {style:{display:'flex',gap:'2px',borderBottom:'1px solid #2A2A2A',marginBottom:'20px',overflowX:'auto'}},
      tabs.map(function(t){
        return React.createElement('button', {
          key: t.id,
          onClick: function(){ currentTab = t.id; loadDashboard(); },
          style:{
            padding:'10px 18px',background:'transparent',border:'none',borderBottom: currentTab===t.id?'2px solid #FE3E00':'2px solid transparent',
            color: currentTab===t.id?'#FE3E00':'#666',fontFamily:'Acme',fontSize:'14px',cursor:'pointer',whiteSpace:'nowrap',transition:'all 0.2s'
          }
        }, t.label);
      })
    );
  }

  function DataTable(headers, rows){
    return React.createElement('table', {style:{width:'100%',borderCollapse:'collapse',background:'#191217',borderRadius:'8px',overflow:'hidden'}},
      React.createElement('thead', null,
        React.createElement('tr', {style:{background:'#2A2A2A'}},
          headers.map(function(h, i){
            return React.createElement('th', {
              key: i,
              style:{padding:'10px 14px',color:'#B0B0B0',textAlign: i===0?'left':'right',fontSize:'12px',textTransform:'uppercase',letterSpacing:'0.5px'}
            }, h);
          })
        )
      ),
      React.createElement('tbody', null,
        rows.map(function(row, ri){
          return React.createElement('tr', {key:ri, style:{borderBottom:'1px solid #2A2A2A'}},
            row.map(function(cell, ci){
              return React.createElement('td', {
                key:ci,
                style:{padding:'10px 14px',color: ci===0?'#fff':'#B0B0B0',textAlign: ci===0?'left':'right',fontSize:'13px'}
              }, cell);
            })
          );
        })
      )
    );
  }

  function renderOverview(data){
    var s = data.summary;
    var items = React.createElement('div', {style:{display:'flex',gap:'12px',flexWrap:'wrap',marginBottom:'20px'}},
      KPICard('Sesiones', fmt(s.sessions), pctChange(s.sessions, s.prevSessions), pctColor(s.sessions, s.prevSessions)),
      KPICard('Usuarios', fmt(s.users), pctChange(s.users, s.prevUsers), pctColor(s.users, s.prevUsers)),
      KPICard('Paginas vistas', fmt(s.pageViews), pctChange(s.pageViews, s.prevPageViews), pctColor(s.pageViews, s.prevPageViews)),
      KPICard('Duracion media', timeAgo(s.avgSessionDuration), pctChange(s.avgSessionDuration, s.prevAvgSessionDuration), pctColor(s.avgSessionDuration, s.prevAvgSessionDuration)),
      KPICard('Bounce rate', (s.bounceRate*100).toFixed(1)+'%', pctChange(-s.bounceRate, -s.prevBounceRate), pctColor(-s.bounceRate, -s.prevBounceRate)),
      KPICard('Conversion', (s.conversionRate*100).toFixed(2)+'%', pctChange(s.conversionRate, s.prevConversionRate), pctColor(s.conversionRate, s.prevConversionRate))
    );

    var chartContainer = React.createElement('div', {
      id:'overview-chart-container',
      style:{background:'#191217',border:'1px solid #2A2A2A',borderRadius:'10px',padding:'20px',marginBottom:'20px'}
    },
      React.createElement('h3', {style:{color:'#fff',margin:'0 0 16px 0',fontSize:'16px'}}, 'Tendencia'),
      React.createElement('canvas', {id:'overviewChart', style:{maxHeight:'300px'}})
    );

    var eventBreakdown = React.createElement('div', {style:{display:'flex',gap:'12px',flexWrap:'wrap'}},
      React.createElement('div', {style:{flex:'2',minWidth:'300px',background:'#191217',border:'1px solid #2A2A2A',borderRadius:'10px',padding:'20px'}},
        React.createElement('h3', {style:{color:'#fff',margin:'0 0 12px 0',fontSize:'16px'}}, 'Eventos'),
        React.createElement('div', {id:'eventsChartContainer', style:{maxHeight:'250px'}},
          React.createElement('canvas', {id:'eventsChart'})
        )
      ),
      React.createElement('div', {style:{flex:'1',minWidth:'200px',background:'#191217',border:'1px solid #2A2A2A',borderRadius:'10px',padding:'20px'}},
        React.createElement('h3', {style:{color:'#fff',margin:'0 0 12px 0',fontSize:'16px'}}, 'Dispositivos'),
        React.createElement('div', {id:'devicesChartContainer', style:{maxHeight:'200px'}},
          React.createElement('canvas', {id:'devicesChart'})
        )
      )
    );

    return React.createElement('div', null, items, chartContainer, eventBreakdown);
  }

  function normalizePageKey(url){
    if(!url) return 'otro';
    var clean = url.replace(/https?:\/\/bitmapcore\.net/g,'');
    if(clean === '/#/' || clean === '/#') return '#home';
    if(clean === '/' || clean === '') return 'home';
    var path = clean.replace(/\/#\//g,'/').split('?')[0].split('#')[0].replace(/^\//,'');
    if(path === '') return 'home';
    var seg = path.split('/').filter(function(s){ return s !== ''; })[0] || 'otro';
    return seg;
  }

  function renderPages(data){
    if(!data.topPages || data.topPages.length === 0)
      return React.createElement('p', {style:{color:'#666'}}, 'Sin datos de paginas aun.');
    var btnBase = {padding:'6px 14px',borderRadius:'6px',border:'1px solid #2A2A2A',background:'#1a1a1a',color:'#B0B0B0',cursor:'pointer',fontSize:'12px',fontFamily:'Acme,monospace',marginRight:'6px'};
    var btnActive = Object.assign({}, btnBase, {background:'#FE3E00',color:'#fff',borderColor:'#FE3E00'});
    var toggle = React.createElement('div', {style:{display:'flex',gap:'6px',marginBottom:'16px',alignItems:'center'}},
      React.createElement('span', {style:{color:'#666',fontSize:'12px',fontFamily:'Acme'}}, 'Vista:'),
      React.createElement('button', {style:pagesGrouped?btnBase:btnActive, onClick:function(){ pagesGrouped=false; loadDashboard(); }}, 'Individual'),
      React.createElement('button', {style:pagesGrouped?btnActive:btnBase, onClick:function(){ pagesGrouped=true; loadDashboard(); }}, 'Agrupado')
    );

    if(pagesGrouped){
      var groups = {};
      data.topPages.forEach(function(p){
        var key = normalizePageKey(p.page_url);
        if(!groups[key]) groups[key] = { views:0, totalTime:0, totalScroll:0, scrollCount:0 };
        groups[key].views += (p.views || 0);
        groups[key].totalTime += (p.avgTime || 0) * (p.views || 0);
        if(p.avgScroll){ groups[key].totalScroll += p.avgScroll * (p.views || 0); groups[key].scrollCount += (p.views || 0); }
      });
      var grouped = [];
      for(var k in groups){
        var g = groups[k];
        grouped.push({ key:k, views:g.views, avgTime: g.views>0 ? g.totalTime/g.views : 0, avgScroll: g.scrollCount>0 ? g.totalScroll/g.scrollCount : null });
      }
      grouped.sort(function(a,b){ return b.views - a.views; });
      var rows = grouped.map(function(g){
        return [g.key, fmt(g.views), timeAgo(g.avgTime), g.avgScroll ? Math.round(g.avgScroll)+'%' : '-'];
      });
      return React.createElement('div', null, toggle, DataTable(['Pagina','Vistas','Tiempo medio','Scroll %'], rows));
    }

    var headers = ['Pagina','Vistas','Tiempo medio','Scroll %'];
    var rows = data.topPages.map(function(p){
      return [
        (p.page_url||'-').replace('https://bitmapcore.net','').slice(0,60),
        fmt(p.views),
        timeAgo(p.avgTime),
        p.avgScroll ? Math.round(p.avgScroll)+'%' : '-'
      ];
    });
    return React.createElement('div', null, toggle, DataTable(headers, rows));
  }

  function renderEvents(data){
    if(!data.eventTypes || data.eventTypes.length === 0)
      return React.createElement('p', {style:{color:'#666'}}, 'Sin eventos aun.');
    var headers = ['Tipo de evento','Cantidad'];
    var rows = data.eventTypes.map(function(e){ return [e.event_type, fmt(e.c)]; });
    var table = DataTable(headers, rows);

    var chartBox = React.createElement('div', {
      style:{background:'#191217',border:'1px solid #2A2A2A',borderRadius:'10px',padding:'20px',marginBottom:'20px',maxHeight:'300px'}
    },
      React.createElement('canvas', {id:'eventTypesChart'})
    );

    return React.createElement('div', null, chartBox, table);
  }

  function renderConversions(data){
    var s = data.summary;
    var funnel = [
      {label:'Sesiones', value:s.sessions, color:'#FE3E00'},
      {label:'Wallet connects', value:s.walletConns, color:'#FF6B35'},
      {label:'Acciones compra', value:s.buyActions, color:'#00AA00'},
      {label:'Acciones listar', value:s.listActions, color:'#3498DB'}
    ];

    var funnelBar = React.createElement('div', {style:{background:'#191217',border:'1px solid #2A2A2A',borderRadius:'10px',padding:'20px',marginBottom:'20px'}},
      React.createElement('h3', {style:{color:'#fff',margin:'0 0 16px 0',fontSize:'16px'}}, 'Funnel de Conversion'),
      funnel.map(function(f, i){
        var width = s.sessions > 0 ? Math.max(5, (f.value / s.sessions) * 100) : 0;
        return React.createElement('div', {key:i, style:{marginBottom:'10px'}},
          React.createElement('div', {style:{display:'flex',justifyContent:'space-between',marginBottom:'4px'}},
            React.createElement('span', {style:{color:'#B0B0B0',fontSize:'13px'}}, f.label),
            React.createElement('span', {style:{color:'#fff',fontSize:'13px',fontWeight:'bold'}}, fmt(f.value) + ' (' + (s.sessions > 0 ? (f.value/s.sessions*100).toFixed(1) : 0) + '%)')
          ),
          React.createElement('div', {style:{background:'#2A2A2A',borderRadius:'4px',height:'8px'}},
            React.createElement('div', {style:{background:f.color,borderRadius:'4px',height:'8px',width:width+'%',transition:'width 0.5s ease'}})
          )
        );
      })
    );

    var chartBox = React.createElement('div', {
      style:{background:'#191217',border:'1px solid #2A2A2A',borderRadius:'10px',padding:'20px',maxHeight:'300px'}
    },
      React.createElement('canvas', {id:'conversionChart'})
    );

    return React.createElement('div', null, funnelBar, chartBox);
  }

  function renderTech(data){
    var deviceHeaders = ['Dispositivo','Sesiones'];
    var deviceRows = (data.devices||[]).map(function(d){ return [d.device_type||'unknown', fmt(d.c)]; });

    var browserHeaders = ['Navegador','Sesiones'];
    var browserRows = (data.browsers||[]).map(function(b){ return [b.browser||'unknown', fmt(b.c)]; });

    var utmHeaders = ['Fuente UTM','Sesiones'];
    var utmRows = (data.utmSources||[]).map(function(u){ return [u.utm_source, fmt(u.c)]; });

    var langs = data.languages || [];
    var langHeaders = ['Idioma','Cambios','Usuarios'];
    var langRows = langs.map(function(l){ return [l.lang||'?', fmt(l.changes), fmt(l.users)]; });

    return React.createElement('div', {style:{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))',gap:'16px'}},
      React.createElement('div', null,
        React.createElement('h3', {style:{color:'#fff',margin:'0 0 12px 0',fontSize:'16px'}}, 'Dispositivos'),
        DataTable(deviceHeaders, deviceRows),
        React.createElement('div', {style:{background:'#191217',border:'1px solid #2A2A2A',borderRadius:'10px',padding:'16px',marginTop:'12px',maxHeight:'200px'}},
          React.createElement('canvas', {id:'techDevicesChart'})
        )
      ),
      React.createElement('div', null,
        React.createElement('h3', {style:{color:'#fff',margin:'0 0 12px 0',fontSize:'16px'}}, 'Navegadores'),
        DataTable(browserHeaders, browserRows),
        React.createElement('div', {style:{background:'#191217',border:'1px solid #2A2A2A',borderRadius:'10px',padding:'16px',marginTop:'12px',maxHeight:'200px'}},
          React.createElement('canvas', {id:'techBrowsersChart'})
        )
      ),
      React.createElement('div', null,
        React.createElement('h3', {style:{color:'#fff',margin:'0 0 12px 0',fontSize:'16px'}}, 'Idiomas'),
        DataTable(langHeaders, langRows)
      ),
      React.createElement('div', null,
        React.createElement('h3', {style:{color:'#fff',margin:'0 0 12px 0',fontSize:'16px'}}, 'Fuentes UTM'),
        DataTable(utmHeaders, utmRows)
      )
    );
  }

  function fmtDate(ts){
    if(!ts) return '-';
    var d = new Date(ts);
    var locMap={en:'en-US',es:'es-AR',fr:'fr-FR'};
    var loc=(typeof I18n!=='undefined'&&I18n.getCurrentLang)?(locMap[I18n.getCurrentLang()]||'en-US'):'en-US';
    return d.toLocaleDateString(loc,{day:'2-digit',month:'short',year:'numeric'})+' '+d.toLocaleTimeString(loc,{hour:'2-digit',minute:'2-digit'});
  }

  function statusBadge(status){
    var map = {
      sent:{color:'#00AA00',bg:'rgba(0,170,0,0.15)',label:'Enviada'},
      error:{color:'#FF3333',bg:'rgba(255,51,51,0.15)',label:'Error'},
      cancelled:{color:'#FFD700',bg:'rgba(255,215,0,0.15)',label:'Cancelada'},
      pending:{color:'#3498DB',bg:'rgba(52,152,219,0.15)',label:'Pendiente'}
    };
    var s = map[status] || map.pending;
    return React.createElement('span', {
      style:{display:'inline-block',padding:'4px 12px',borderRadius:'12px',background:s.bg,color:s.color,fontSize:'12px',fontWeight:'bold',whiteSpace:'nowrap'}
    }, s.label);
  }

  function loadTrackingList(){
    trackingLoading = true;
    var params = 'limit='+trackingData.limit+'&page='+trackingData.page;
    if(trackingFilter.status) params += '&status='+trackingFilter.status;
    if(trackingFilter.search) params += '&search='+encodeURIComponent(trackingFilter.search);
    if(trackingFilter.days) params += '&days='+trackingFilter.days;

    api('/tracking/collection/list?'+params).then(function(d){
      trackingData = d;
      trackingLoading = false;
      renderTrackingCollectionTable();
    }).catch(function(e){
      trackingLoading = false;
      console.error('Tracking load error:', e);
    });
  }

  function renderTrackingCollectionTable(){
    var tableRoot = document.getElementById('tracking-table-container');
    if(!tableRoot) return;

    if(trackingData.rows.length === 0){
      tableRoot.innerHTML = '<div style="color:#666;text-align:center;padding:40px">Sin registros de seguimiento</div>';
      return;
    }

    var btnBase = {padding:'4px 10px',borderRadius:'4px',border:'1px solid #2A2A2A',background:'#1a1a1a',color:'#B0B0B0',cursor:'pointer',fontSize:'11px',fontFamily:'Acme,monospace'};
    var btnActive = Object.assign({}, btnBase, {background:'#FE3E00',color:'#fff',borderColor:'#FE3E00'});

    var filterBar = React.createElement('div', {style:{display:'flex',gap:'8px',marginBottom:'12px',flexWrap:'wrap',alignItems:'center'}},
      React.createElement('input', {
        type:'text',
        placeholder:'Buscar por nombre...',
        value:trackingFilter.search,
        onChange:function(e){ trackingFilter.search=e.target.value; loadTrackingList(); },
        style:{padding:'6px 12px',borderRadius:'6px',border:'1px solid #2A2A2A',background:'#191217',color:'#fff',fontSize:'13px',fontFamily:'Acme',outline:'none',flex:'1',minWidth:'150px'}
      }),
      React.createElement('div', {style:{display:'flex',gap:'4px'}},
        ['','sent','error','cancelled','pending'].map(function(s){
          var labels = {sent:'Enviadas',error:'Errores',cancelled:'Canceladas',pending:'Pendientes',todas:'Todas'};
          var isActive = trackingFilter.status === s;
          return React.createElement('button', {
            key:s||'all',
            onClick:function(){ trackingFilter.status=s; trackingData.page=1; loadTrackingList(); },
            style:isActive?btnActive:btnBase
          }, labels[s]||'Todas');
        })
      )
    );

    var statusFilter24h = React.createElement('button', {
      onClick:function(){ trackingFilter.days=trackingFilter.days===1?0:1; trackingData.page=1; loadTrackingList(); },
      style:trackingFilter.days===1?btnActive:btnBase
    }, '24h');

    var statusFilter7d = React.createElement('button', {
      onClick:function(){ trackingFilter.days=trackingFilter.days===7?0:7; trackingData.page=1; loadTrackingList(); },
      style:trackingFilter.days===7?btnActive:btnBase
    }, '7d');

    var filterBar2 = React.createElement('div', {style:{display:'flex',gap:'4px'}}, statusFilter24h, statusFilter7d);

    var headers = ['Foto','Nombre','Descripcion','inscriptions.json','meta.json','Redes','Estado','Fecha'];
    var rows = trackingData.rows.map(function(row){
      var img = row.image_base64
        ? React.createElement('img', {src:row.image_base64, style:{width:'40px',height:'40px',borderRadius:'6px',objectFit:'cover',cursor:'pointer'}, onClick:(function(r){return function(){trackingDetail=r;showTrackingDetailModal();}})(row)})
        : React.createElement('div', {style:{width:'40px',height:'40px',borderRadius:'6px',background:'#2A2A2A',display:'flex',alignItems:'center',justifyContent:'center',color:'#666',fontSize:'10px'}}, 'N/A');

      var descShort = row.description ? (row.description.length > 60 ? row.description.slice(0,60)+'...' : row.description) : '-';
      var descFull = row.description || '';

      var inscPreview = row.inscriptions_size ? row.inscriptions_size+' bytes' : '-';
      var metaPreview = row.meta_size ? row.meta_size+' bytes' : '-';

      var socials = React.createElement('div', {style:{display:'flex',gap:'6px'}},
        row.x_account ? React.createElement('span', {style:{color:'#1DA1F2',fontSize:'12px'}}, '@') : null,
        row.discord ? React.createElement('span', {style:{color:'#7289DA',fontSize:'12px'}}, 'D') : null
      );

      var fecha = fmtDate(row.created_at);

      return [
        img,
        React.createElement('div', null,
          React.createElement('div', {style:{color:'#fff',fontSize:'13px',fontWeight:'bold'}}, row.collection_name || '-'),
          React.createElement('div', {style:{color:'#666',fontSize:'11px'}}, row.collection_slug || '')
        ),
        React.createElement('div', {style:{maxWidth:'200px'}},
          React.createElement('div', {style:{color:'#B0B0B0',fontSize:'12px',whiteSpace:'pre-wrap',wordBreak:'break-word'}}, descShort),
          descFull.length > 60 ? React.createElement('button', {
            onClick:(function(d){return function(){alert(d);}})(descFull),
            style:{background:'none',border:'none',color:'#FE3E00',cursor:'pointer',fontSize:'11px',padding:0}
          }, 'Expandir') : null
        ),
        React.createElement('div', {style:{fontSize:'12px'}},
          row.inscriptions_size ? React.createElement('button', {
            onClick:(function(id){return function(){window.open(API+'/tracking/collection/'+id+'/download/inscriptions?key='+TOKEN,'_blank');}})(row.id),
            style:{background:'none',border:'1px solid #2A2A2A',borderRadius:'4px',color:'#FE3E00',cursor:'pointer',fontSize:'11px',padding:'2px 8px'}
          }, inscPreview) : React.createElement('span', {style:{color:'#666'}}, '-')
        ),
        React.createElement('div', {style:{fontSize:'12px'}},
          row.meta_size ? React.createElement('button', {
            onClick:(function(id){return function(){window.open(API+'/tracking/collection/'+id+'/download/meta?key='+TOKEN,'_blank');}})(row.id),
            style:{background:'none',border:'1px solid #2A2A2A',borderRadius:'4px',color:'#FE3E00',cursor:'pointer',fontSize:'11px',padding:'2px 8px'}
          }, metaPreview) : React.createElement('span', {style:{color:'#666'}}, '-')
        ),
        socials,
        statusBadge(row.status),
        React.createElement('span', {style:{color:'#666',fontSize:'12px',whiteSpace:'nowrap'}}, fecha)
      ];
    });

    var table = React.createElement('table', {style:{width:'100%',borderCollapse:'collapse',background:'#191217',borderRadius:'8px',overflow:'hidden'}},
      React.createElement('thead', null,
        React.createElement('tr', {style:{background:'#2A2A2A'}},
          headers.map(function(h, i){
            return React.createElement('th', {
              key:i,
              style:{padding:'10px 14px',color:'#B0B0B0',textAlign:'left',fontSize:'12px',textTransform:'uppercase',letterSpacing:'0.5px',whiteSpace:'nowrap'}
            }, h);
          })
        )
      ),
      React.createElement('tbody', null,
        rows.map(function(row, ri){
          return React.createElement('tr', {key:ri, style:{borderBottom:'1px solid #2A2A2A'}},
            row.map(function(cell, ci){
              return React.createElement('td', {
                key:ci,
                style:{padding:'10px 14px',color:ci===0?'#fff':'#B0B0B0',textAlign:'left',fontSize:'13px',verticalAlign:'middle'}
              }, cell);
            })
          );
        })
      )
    );

    var pagination = React.createElement('div', {style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'12px'}},
      React.createElement('span', {style:{color:'#666',fontSize:'12px'}}, 'Total: '+trackingData.total+' registros'),
      React.createElement('div', {style:{display:'flex',gap:'6px'}},
        React.createElement('button', {
          disabled:trackingData.page<=1,
          onClick:function(){ trackingData.page--; loadTrackingList(); },
          style:Object.assign({}, btnBase, {opacity:trackingData.page<=1?0.4:1})
        }, 'Anterior'),
        React.createElement('span', {style:{color:'#B0B0B0',fontSize:'12px',padding:'4px 8px'}}, 'Pagina '+trackingData.page),
        React.createElement('button', {
          disabled:trackingData.rows.length<trackingData.limit,
          onClick:function(){ trackingData.page++; loadTrackingList(); },
          style:Object.assign({}, btnBase, {opacity:trackingData.rows.length<trackingData.limit?0.4:1})
        }, 'Siguiente')
      )
    );

    ReactDOM.render(React.createElement('div', null, filterBar, filterBar2, table, pagination), tableRoot);
  }

  function showTrackingDetailModal(){
    if(!trackingDetail) return;
    var r = trackingDetail;
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.onclick = function(e){ if(e.target===overlay) document.body.removeChild(overlay); };

    var content = document.createElement('div');
    content.style.cssText = 'background:#191217;border:1px solid #2A2A2A;border-radius:12px;padding:24px;max-width:700px;width:100%;max-height:80vh;overflow-y:auto;color:#fff;font-family:Acme';

    content.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h2 style="margin:0;color:#FE3E00">'+(r.collection_name||'Sin nombre')+'</h2><button id="modal-close" style="background:none;border:none;color:#666;font-size:24px;cursor:pointer">&times;</button></div>';

    if(r.image_base64){
      var imgEl = document.createElement('img');
      imgEl.src = r.image_base64;
      imgEl.style.cssText = 'width:100%;max-height:300px;object-fit:contain;border-radius:8px;margin-bottom:16px';
      content.appendChild(imgEl);
    }

    var fields = [
      ['Slug', r.collection_slug],
      ['Descripcion', r.description],
      ['X Account', r.x_account],
      ['Discord', r.discord],
      ['Estado', r.status],
      ['Error', r.error_message],
      ['Creado', fmtDate(r.created_at)],
      ['Actualizado', fmtDate(r.updated_at)],
      ['Enviado', fmtDate(r.sent_at)]
    ];
    fields.forEach(function(f){
      if(!f[1]) return;
      var row = document.createElement('div');
      row.style.cssText = 'margin-bottom:8px';
      row.innerHTML = '<span style="color:#666;font-size:12px">'+f[0]+': </span><span style="color:#B0B0B0;font-size:13px">'+f[1]+'</span>';
      content.appendChild(row);
    });

    if(r.inscriptions_size){
      var inscBtn = document.createElement('button');
      inscBtn.textContent = 'Descargar inscriptions.json ('+r.inscriptions_size+' bytes)';
      inscBtn.style.cssText = 'margin-top:12px;padding:8px 16px;border-radius:6px;border:1px solid #FE3E00;background:transparent;color:#FE3E00;cursor:pointer;font-family:Acme;font-size:13px';
      inscBtn.onclick = function(){ window.open(API+'/tracking/collection/'+r.id+'/download/inscriptions?key='+TOKEN,'_blank'); };
      content.appendChild(inscBtn);
    }

    if(r.meta_size){
      var metaBtn = document.createElement('button');
      metaBtn.textContent = 'Descargar meta.json ('+r.meta_size+' bytes)';
      metaBtn.style.cssText = 'margin-top:12px;margin-left:8px;padding:8px 16px;border-radius:6px;border:1px solid #FE3E00;background:transparent;color:#FE3E00;cursor:pointer;font-family:Acme;font-size:13px';
      metaBtn.onclick = function(){ window.open(API+'/tracking/collection/'+r.id+'/download/meta?key='+TOKEN,'_blank'); };
      content.appendChild(metaBtn);
    }

    overlay.appendChild(content);
    document.body.appendChild(overlay);

    document.getElementById('modal-close').onclick = function(){ document.body.removeChild(overlay); };
  }

  function renderTrackingCollection(){
    var subTabs = React.createElement('div', {style:{display:'flex',gap:'4px',marginBottom:'16px',borderBottom:'1px solid #2A2A2A',paddingBottom:'8px'}},
      [{id:'collection',label:'Enviar Coleccion'},{id:'listing',label:'Listar Activos'},{id:'buying',label:'Comprar Activos'}].map(function(t){
        return React.createElement('button', {
          key:t.id,
          onClick:function(){ trackingTab=t.id; renderTracking(); },
          style:{
            padding:'8px 16px',background:trackingTab===t.id?'#FE3E00':'transparent',
            border:trackingTab===t.id?'1px solid #FE3E00':'1px solid #2A2A2A',
            borderRadius:'6px',color:trackingTab===t.id?'#fff':'#B0B0B0',
            fontFamily:'Acme',fontSize:'13px',cursor:'pointer',transition:'all 0.2s'
          }
        }, t.label);
      })
    );

    if(trackingTab === 'listing'){
      return React.createElement('div', null, subTabs,
        React.createElement('div', {style:{color:'#666',textAlign:'center',padding:'40px',fontFamily:'Acme'}}, 'Seccion "Listar Activos" - Proximamente')
      );
    }
    if(trackingTab === 'buying'){
      return React.createElement('div', null, subTabs,
        React.createElement('div', {style:{color:'#666',textAlign:'center',padding:'40px',fontFamily:'Acme'}}, 'Seccion "Comprar Activos" - Proximamente')
      );
    }

    return React.createElement('div', null, subTabs,
      React.createElement('div', {id:'tracking-table-container'},
        React.createElement('div', {style:{color:'#666',textAlign:'center',padding:'40px'}}, 'Cargando...')
      )
    );
  }

  function renderTracking(){
    if(trackingTab === 'collection' && trackingData.rows.length === 0 && !trackingLoading){
      loadTrackingList();
    }
    return renderTrackingCollection();
  }

  function drawCharts(data){
    setTimeout(function(){
      if(currentTab === 'overview'){
        api('/timeseries?range='+RANGE+'&metric=sessions&interval='+(RANGE==='24h'?'15m':RANGE==='7d'?'1h':'1d')).then(function(ts){
          destroyChart('overviewChart');
          var ctx = document.getElementById('overviewChart');
          if(!ctx) return;
          charts['overviewChart'] = new Chart(ctx, {
            type:'line',
            data:{
              labels: ts.series.map(function(p){ var d = new Date(p.ts); var locMap={en:'en-US',es:'es-AR',fr:'fr-FR'}; var loc=(typeof I18n!=='undefined'&&I18n.getCurrentLang)?(locMap[I18n.getCurrentLang()]||'en-US'):'en-US'; return RANGE==='24h'?d.getHours()+':00':d.toLocaleDateString(loc,{day:'numeric',month:'short'}); }),
              datasets:[{
                label:'Sesiones', data:ts.series.map(function(p){return p.value;}),
                borderColor:'#FE3E00', backgroundColor:'rgba(254,62,0,0.1)', fill:true,
                tension:0.4, pointRadius:2, borderWidth:2
              }]
            },
            options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#666',maxTicksLimit:8},grid:{color:'#2A2A2A'}},y:{ticks:{color:'#666'},grid:{color:'#2A2A2A'}}}}
          });
        });

        destroyChart('eventsChart');
        var evtCtx = document.getElementById('eventsChart');
        if(evtCtx && data.eventTypes && data.eventTypes.length > 0){
          charts['eventsChart'] = new Chart(evtCtx, {
            type:'bar',
            data:{
              labels: data.eventTypes.slice(0,8).map(function(e){return e.event_type;}),
              datasets:[{data:data.eventTypes.slice(0,8).map(function(e){return e.c;}),backgroundColor:chartColors(8),borderWidth:0}]
            },
            options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#666'},grid:{color:'#2A2A2A'}},y:{ticks:{color:'#B0B0B0',font:{size:11}},grid:{display:false}}}}
          });
        }

        destroyChart('devicesChart');
        var devCtx = document.getElementById('devicesChart');
        if(devCtx && data.devices && data.devices.length > 0){
          charts['devicesChart'] = new Chart(devCtx, {
            type:'doughnut',
            data:{
              labels: data.devices.map(function(d){return d.device_type||'unknown';}),
              datasets:[{data:data.devices.map(function(d){return d.c;}),backgroundColor:chartColors(data.devices.length),borderWidth:0}]
            },
            options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#B0B0B0',font:{size:11}}}}}
          });
        }
      }

      if(currentTab === 'events'){
        destroyChart('eventTypesChart');
        var etcCtx = document.getElementById('eventTypesChart');
        if(etcCtx && data.eventTypes && data.eventTypes.length > 0){
          charts['eventTypesChart'] = new Chart(etcCtx, {
            type:'doughnut',
            data:{
              labels: data.eventTypes.slice(0,10).map(function(e){return e.event_type;}),
              datasets:[{data:data.eventTypes.slice(0,10).map(function(e){return e.c;}),backgroundColor:chartColors(10),borderWidth:0}]
            },
            options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{color:'#B0B0B0',font:{size:11}}}}}
          });
        }
      }

      if(currentTab === 'conversions'){
        api('/timeseries?range='+RANGE+'&metric=buyActions&interval='+(RANGE==='24h'?'15m':RANGE==='7d'?'1h':'1d')).then(function(ts){
          destroyChart('conversionChart');
          var ctx = document.getElementById('conversionChart');
          if(!ctx) return;
          charts['conversionChart'] = new Chart(ctx, {
            type:'line',
            data:{
              labels: ts.series.map(function(p){ var d = new Date(p.ts); var locMap={en:'en-US',es:'es-AR',fr:'fr-FR'}; var loc=(typeof I18n!=='undefined'&&I18n.getCurrentLang)?(locMap[I18n.getCurrentLang()]||'en-US'):'en-US'; return RANGE==='24h'?d.getHours()+':00':d.toLocaleDateString(loc,{day:'numeric',month:'short'}); }),
              datasets:[{
                label:'Compras', data:ts.series.map(function(p){return p.value;}),
                borderColor:'#00AA00', backgroundColor:'rgba(0,170,0,0.1)', fill:true,
                tension:0.4, pointRadius:2, borderWidth:2
              }]
            },
            options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#666',maxTicksLimit:8},grid:{color:'#2A2A2A'}},y:{ticks:{color:'#666'},grid:{color:'#2A2A2A'}}}}
          });
        });
      }

      if(currentTab === 'tech'){
        destroyChart('techDevicesChart');
        var tdc = document.getElementById('techDevicesChart');
        if(tdc && data.devices && data.devices.length > 0){
          charts['techDevicesChart'] = new Chart(tdc, {
            type:'doughnut',
            data:{labels:data.devices.map(function(d){return d.device_type||'?';}),datasets:[{data:data.devices.map(function(d){return d.c;}),backgroundColor:chartColors(data.devices.length),borderWidth:0}]},
            options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#B0B0B0',font:{size:11}}}}}
          });
        }
        destroyChart('techBrowsersChart');
        var tbc = document.getElementById('techBrowsersChart');
        if(tbc && data.browsers && data.browsers.length > 0){
          charts['techBrowsersChart'] = new Chart(tbc, {
            type:'doughnut',
            data:{labels:data.browsers.map(function(b){return b.browser||'?';}),datasets:[{data:data.browsers.map(function(b){return b.c;}),backgroundColor:chartColors(data.browsers.length),borderWidth:0}]},
            options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#B0B0B0',font:{size:11}}}}}
          });
        }
      }
    }, 100);
  }

  function loadDashboard(){
    if(!TOKEN){
      document.getElementById('analytics-root').innerHTML = '<div style="color:#FF3333;text-align:center;padding:60px;font-family:Acme">Acceso denegado. Token no valido.</div>';
      return;
    }

    var root = document.getElementById('analytics-root');
    root.innerHTML = '<div style="text-align:center;padding:40px;color:#666">Cargando...</div>';

    Promise.all([
      api('/dashboard?range='+RANGE),
      api('/realtime')
    ]).then(function(results){
      var data = results[0];
      var realtime = results[1];

      var header = React.createElement('div', {style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px',flexWrap:'wrap',gap:'12px'}},
        React.createElement('div', null,
          React.createElement('h1', {style:{color:'#FE3E00',margin:0,fontSize:'24px'}}, 'BitmapCore Analytics'),
          React.createElement('div', {style:{color:'#666',fontSize:'13px',marginTop:'4px'}},
            'Online: ' + realtime.activeSessions + ' sesiones | ' + realtime.sessionsLast1h + ' en 1h | ' + realtime.sessionsLast24h + ' en 24h'
          )
        ),
        RangeSelector
      );

      var tabContent;
      if(currentTab === 'overview') tabContent = renderOverview(data);
      else if(currentTab === 'pages') tabContent = renderPages(data);
      else if(currentTab === 'events') tabContent = renderEvents(data);
      else if(currentTab === 'conversions') tabContent = renderConversions(data);
      else if(currentTab === 'tech') tabContent = renderTech(data);
      else if(currentTab === 'tracking') tabContent = renderTracking();

      var tabs = TabBar([
        {id:'overview', label:'Overview'},
        {id:'pages', label:'Paginas'},
        {id:'events', label:'Eventos'},
        {id:'conversions', label:'Conversiones'},
        {id:'tech', label:'Tecnologia'},
        {id:'tracking', label:'Seguimiento'}
      ]);

      var el = React.createElement('div', null, header, tabs, tabContent);
      ReactDOM.render(el, root);
      drawCharts(data);
    }).catch(function(err){
      root.innerHTML = '<div style="color:#FF3333;text-align:center;padding:60px;font-family:Acme">Error cargando datos: '+err.message+'</div>';
    });
  }

  function init(){
    if(!TOKEN){
      document.body.innerHTML = '<div style="color:#FF3333;text-align:center;padding:60px;font-family:Acme;font-size:18px;background:#080008;height:100vh">Acceso denegado. Agrega ?key=TU_TOKEN a la URL.</div>';
      return;
    }
    document.body.style.background = '#080008';
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';
    document.body.style.margin = '0';
    document.body.style.padding = '20px';
    document.body.innerHTML = '<div id="analytics-root" style="max-width:1200px;margin:0 auto"></div>';
    loadDashboard();
    refreshTimer = setInterval(loadDashboard, 30000);
  }

  return { init: init };
})();

(function(){
  var TOKEN = new URLSearchParams(window.location.search).get('key') || '';
  if(TOKEN && window.location.pathname.indexOf('/admin/analytics') !== -1){
    document.title = 'BitmapCore Analytics';
    AnalyticsDashboard.init();
  } else if(document.getElementById('analytics-root')){
    AnalyticsDashboard.init();
  }
})();
