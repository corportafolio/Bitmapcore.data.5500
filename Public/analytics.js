(function(){
  'use strict';
  var ENDPOINT = '/api/analytics/event';
  var BATCH_ENDPOINT = '/api/analytics/events';
  var HEARTBEAT_MS = 30000;
  var FLUSH_INTERVAL = 10000;
  var MAX_BATCH = 10;

  var sessionId = genId(); // nueva sesion en cada carga del documento = visita real
  var userId = getOrCreate('bc_uid', function(){ return genId(); }); // identidad unica del navegador (persistente)
  var visitId = genId(); // nueva visita en cada carga del documento
  var queue = [];
  var scrollDepth = 0;
  var pageStart = Date.now();
  var lastPageUrl = '';
  var heartbeatTimer = null;
  var flushTimer = null;

  function genId(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

  function getOrCreate(key, gen){
    var v = localStorage.getItem(key);
    if(!v){ v = gen(); try{ localStorage.setItem(key, v); }catch(e){} }
    return v;
  }

  function getUtm(){
    var p = new URLSearchParams(location.search);
    return { utm_source: p.get('utm_source'), utm_medium: p.get('utm_medium'), utm_campaign: p.get('utm_campaign') };
  }

  function getDevice(){
    var w = window.innerWidth;
    if(w < 576) return 'mobile';
    if(w < 992) return 'tablet';
    return 'desktop';
  }

  function send(ev){
    ev.session_id = sessionId;
    ev.user_id = userId;
    ev.visit_id = visitId;
    ev.timestamp = Date.now();
    ev.page_url = ev.page_url || location.href;
    ev.referrer = document.referrer || '';
    ev.user_agent = navigator.userAgent;
    ev.viewport_w = window.innerWidth;
    ev.viewport_h = window.innerHeight;
    queue.push(ev);
    if(queue.length >= MAX_BATCH) flush();
  }

  function flush(){
    if(queue.length === 0) return;
    var batch = queue.splice(0, MAX_BATCH);
    if(navigator.sendBeacon){
      var blob = new Blob([JSON.stringify({events: batch})], {type: 'application/json'});
      navigator.sendBeacon(BATCH_ENDPOINT, blob);
    } else {
      fetch(BATCH_ENDPOINT, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({events: batch}), keepalive: true}).catch(function(){});
    }
  }

  function trackScroll(){
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if(h <= 0) return 100;
    return Math.min(100, Math.round((window.scrollY / h) * 100));
  }

  function trackPageView(){
    var now = Date.now();
    if(lastPageUrl && scrollDepth > 0){
      send({event_type: 'page_view', event_data: {title: document.title}, scroll_depth: scrollDepth, time_on_page_ms: now - pageStart, load_time_ms: performance.timing ? performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart : 0});
    }
    lastPageUrl = location.href;
    pageStart = now;
    scrollDepth = 0;
    send({event_type: 'page_view', event_data: {title: document.title}});
  }

  function trackScrollSample(){
    var d = trackScroll();
    if(d > scrollDepth) scrollDepth = d;
  }

  function heartbeat(){
    send({event_type: 'heartbeat', event_data: {scroll_depth: trackScroll(), time_on_page_ms: Date.now() - pageStart}});
  }

  function startHeartbeat(){
    clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(heartbeat, HEARTBEAT_MS);
  }

  window.bcAnalytics = {
    track: function(type, data){ send({event_type: type, event_data: data || {}}); },
    page: trackPageView,
    sessionId: sessionId,
    userId: userId
  };

  window.addEventListener('scroll', trackScrollSample, {passive: true});
  window.addEventListener('beforeunload', function(){
    trackScrollSample();
    send({event_type: 'page_view', event_data: {title: document.title}, scroll_depth: scrollDepth, time_on_page_ms: Date.now() - pageStart});
    flush();
  });

  window.addEventListener('popstate', trackPageView);
  var _pushState = history.pushState;
  history.pushState = function(){
    _pushState.apply(this, arguments);
    trackPageView();
  };
  window.addEventListener('hashchange', trackPageView);

  document.addEventListener('click', function(e){
    var el = e.target.closest('[data-track]');
    if(el){
      send({event_type: 'click', event_data: {element: el.getAttribute('data-track'), text: el.textContent.trim().slice(0,50), href: el.href || ''}});
    }
  }, true);

  flushTimer = setInterval(flush, FLUSH_INTERVAL);
  setTimeout(function(){ trackPageView(); startHeartbeat(); }, 100);
})();
