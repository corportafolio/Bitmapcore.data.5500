var AnalyticsDashboard = (function(){
  var API = '/api/analytics';
  var TOKEN = new URLSearchParams(window.location.search).get('key') || '';
  var RANGE = '7d';
  var currentTab = 'overview';
  var charts = {};
  var refreshTimer = null;

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

  function renderPages(data){
    if(!data.topPages || data.topPages.length === 0)
      return React.createElement('p', {style:{color:'#666'}}, 'Sin datos de paginas aun.');
    var headers = ['Pagina','Vistas','Tiempo medio','Scroll %'];
    var rows = data.topPages.map(function(p){
      return [
        (p.page_url||'-').replace('https://bitmapcore.net','').slice(0,60),
        fmt(p.views),
        timeAgo(p.avgTime),
        p.avgScroll ? Math.round(p.avgScroll)+'%' : '-'
      ];
    });
    return DataTable(headers, rows);
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
        React.createElement('h3', {style:{color:'#fff',margin:'0 0 12px 0',fontSize:'16px'}}, 'Fuentes UTM'),
        DataTable(utmHeaders, utmRows)
      )
    );
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
              labels: ts.series.map(function(p){ var d = new Date(p.ts); return RANGE==='24h'?d.getHours()+':00':d.toLocaleDateString('es',{day:'numeric',month:'short'}); }),
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
              labels: ts.series.map(function(p){ var d = new Date(p.ts); return RANGE==='24h'?d.getHours()+':00':d.toLocaleDateString('es',{day:'numeric',month:'short'}); }),
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

      var tabs = TabBar([
        {id:'overview', label:'Overview'},
        {id:'pages', label:'Paginas'},
        {id:'events', label:'Eventos'},
        {id:'conversions', label:'Conversiones'},
        {id:'tech', label:'Tecnologia'}
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
