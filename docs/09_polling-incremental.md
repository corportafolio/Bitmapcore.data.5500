# Documento 09: Polling Incremental para Web Server

## 1. Resumen

Este documento describe el **polling incremental** para el web server BitmapCore (`/root/bitmapcore-web/server.js`). El polling incremental busca únicamente los listings **nuevos desde el último timestamp conocido**, en lugar de descargar todos los datos cada 5 minutos.

**Unified = Ordinalswallet + Unisat + Local Marketplace** (los 3 marketplaces).

**Problema resuelto**: El código anterior hacía ~260 llamadas API por poll, agotando las 2,000 diarias en horas. Con polling incremental, se hacen **4-8 llamadas por poll**, alcanzando para todo el mes.

---

## 2. Problema Actual (Antes vs Después)

### 2.1 pollUnisat() — El más crítico

| Aspecto | Antes (Ineficiente) | Después (Incremental) |
|---------|---------------------|----------------------|
| Llamadas por poll | ~255 (85 páginas × 3 eventos) | ~3-6 |
| Llamadas diarias | ~7,344 | ~86-173 |
| Llamadas mensuales | ~220,000 | ~2,580-5,190 |
| Problema | Agota 2,000/día en horas | Sobran 1,800/día |

### 2.2 pollOrdinalswallet()

| Aspecto | Antes | Después |
|---------|-------|---------|
| Llamadas por poll | 5 (offset 0-300) | 1-2 |
| Llamadas diarias | ~1,440 | ~29-58 |
| Datos | Re-trae mismos 300 items | Solo items nuevos |

### 2.3 Local Marketplace

| Aspecto | Comportamiento |
|---------|----------------|
| Fuente | `bitmapcorp.db` (puerto 3000) |
| API calls | 0 (lectura SQLite directa) |
| Actualización | Tiempo real + sync en unified |
| Timestamp | `listed_at` |

### 2.4 Unified — Merge de las 3 Fuentes

| Aspecto | Antes | Después |
|---------|-------|---------|
| Fuentes | Solo OW + Unisat | OW + Unisat + Local |
| Operaciones SQLite | DELETE 33,076 + INSERT 33,076 | Solo INSERT nuevos |
| Tiempo ejecución | Segundos | Milisegundos |

### 2.5 Presupuesto Total de Llamadas API

| Marketplace | Tipo | Llamadas/poll | Llamadas/día |
|---|---|---|---|
| Unisat | API externa | ~3-6 | ~86-173 |
| OrdinalsWallet | API externa | ~1-2 | ~29-58 |
| Local | SQLite local | 0 | 0 |
| **Total** | | **~4-8** | **~115-231** |

**Conclusión**: 2,000 llamadas/día alcanzan para TODO el mes sobrado.

---

## 3. Mecanismo de Polling Incremental

### 3.1 Las 3 Fuentes de Unified

| # | Fuente | Tipo | Timestamp | API Calls |
|---|--------|------|-----------|-----------|
| 1 | OrdinalsWallet | API externa | `created` | 1-2/poll |
| 2 | Unisat | API externa | `timestamp` | 3-6/poll |
| 3 | Local Marketplace | SQLite local | `listed_at` | 0 |

### 3.2 Principio General (OW + Unisat)

El mecanismo se adapta del Android (Documento 41: Polling-Incremental.md):

```
1. Obtener el timestamp más reciente guardado en cache
2. Hacer llamada API con ese timestamp como filtro
3. La API devuelve solo los listings publicados DESDE ese momento
4. Si no hay listings nuevos → NO se agrega nada
5. Si hay N listings nuevos → se copian los N a la tabla
```

### 3.3 Local Marketplace — Lectura Directa

Local marketplace NO necesita polling incremental porque:
- Es una base de datos **local** (no API externa)
- Se actualiza en **tiempo real** cuando el usuario lista
- Solo se **lee** durante el merge de unified

```javascript
// Lectura directa de bitmapcorp.db
const dbLocal = new Database('/root/bitmapcore-server/data/bitmapcorp.db', { readonly: true });
const localRows = dbLocal.prepare("SELECT * FROM listings WHERE is_active=1").all();
// ... procesar rows
dbLocal.close();
```

### 3.4 Unified — Merge de las 3 Fuentes

Unified **NO hace polling incremental**. Solo **merge** las 3 fuentes:

```
┌─────────────────────────────────────────┐
│ 1. Leer lastPollTimestamp               │
├─────────────────────────────────────────┤
│ 2. ¿Es primera vez?                     │
│    SÍ → DELETE + re-INSERT todo         │
│    NO → Solo INSERT nuevos              │
├─────────────────────────────────────────┤
│ 3. LEER DE 3 FUENTES:                   │
│    a. ordinalswallet_cache (OW)         │
│    b. unisat_cache (Unisat)             │
│    c. bitmapcorp.db (Local)             │
├─────────────────────────────────────────┤
│ 4. Guardar stats + timestamp            │
└─────────────────────────────────────────┘
```

### 3.5 Detección de Primera Vez (isFirstSync)

```javascript
// En cada marketplace, verificar si es la primera sincronización
const lastTs = (db.prepare("SELECT value FROM stats WHERE key='lastPollTimestamp'").get() || {}).value || 0;
const isFirstSync = lastTs === 0;

if (isFirstSync) {
  // Polling completo - procesar todo el historial
} else {
  // Polling incremental - filtrar desde timestamp
}
```

---

## 4. Ordinalswallet — Flujo Incremental

### 4.1 Flujo Completo

```
┌─────────────────────────────────────────┐
│ 1. Leer lastPollTimestamp de stats      │
│    (0 si es primera vez)                │
├─────────────────────────────────────────┤
│ 2. Fetch escrows: limit=10000, offset=0 │
│    (1 sola llamada API)                 │
├─────────────────────────────────────────┤
│ 3. ¿Es primera vez?                     │
│    SÍ → Procesar TODOS los escrows      │
│    NO → Filtrar: created > lastTs       │
├─────────────────────────────────────────┤
│ 4. Para cada item nuevo:                │
│    - INSERT OR REPLACE en cache         │
├─────────────────────────────────────────┤
│ 5. ¿Es primera vez?                     │
│    SÍ → Saltar paso 6                   │
│    NO → Fetch sold-escrows, filtrar     │
│         boughtAt > lastTs, DELETE       │
├─────────────────────────────────────────┤
│ 6. Guardar nuevo lastPollTimestamp      │
│    (MAX(listedAt) del cache)            │
├─────────────────────────────────────────┤
│ 7. Finally: Stats + TOP 20 + Cleanup   │
└─────────────────────────────────────────┘
```

### 4.2 Código Nuevo

```javascript
async function pollOrdinalswallet() {
  if (owPollingActive) return;
  if (!dbOw) return;
  owPollingActive = true;
  
  try {
    console.error('[OW] Starting incremental poll...');
    const now = Date.now();
    
    // 1. LEER ÚLTIMO TIMESTAMP
    const lastTsRow = dbOw.prepare("SELECT value FROM ordinalswallet_stats WHERE key='lastPollTimestamp'").get();
    const lastTs = lastTsRow ? lastTsRow.value : 0;
    const isFirstSync = lastTs === 0;
    
    console.error('[OW] lastTs=' + lastTs + ', isFirstSync=' + isFirstSync);
    
    // 2. FETCH ESCROWS (1 sola llamada)
    const insertStmt = dbOw.prepare(`
      INSERT OR REPLACE INTO ordinalswallet_cache
      (bitmapNumber, bitmapId, listedPrice, listedAt, ownerAddress, extraData, extraData2, timestamp, insertionOrder)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    let insertionOrder = (dbOw.prepare("SELECT MAX(insertionOrder) as m FROM ordinalswallet_cache").get()?.m || 0) + 1;
    let totalSaved = 0;
    
    try {
      const escrowsRes = await axios.get('https://turbo.ordinalswallet.com/collection/bitmap/escrows', {
        params: { offset: 0, limit: 10000 },
        timeout: 15000
      });
      const escrows = Array.isArray(escrowsRes.data) ? escrowsRes.data : [];
      
      // 3. FILTRAR POR TIMESTAMP
      const newEscrows = isFirstSync ? escrows : escrows.filter(e => {
        const created = parseCreatedTimestamp(e.created);
        return created > lastTs;
      });
      
      console.error('[OW] Total escrows: ' + escrows.length + ', nuevos: ' + newEscrows.length);
      
      // 4. INSERTAR ITEMS NUEVOS
      for (const e of newEscrows) {
        const insId = e.inscription_id || '';
        if (!insId) continue;
        insertStmt.run(
          parseBitmapNumber(e.name), insId,
          e.satoshi_price || 0,
          parseCreatedTimestamp(e.created),
          e.seller_address || '',
          e.name || '',
          null, now, insertionOrder++
        );
        totalSaved++;
      }
    } catch (e) {
      console.error('[OW] Error fetching escrows: ' + e.message);
    }
    
    // 5. FETCH SOLD (solo si no es primera vez)
    if (!isFirstSync) {
      try {
        const soldRes = await axios.get('https://turbo.ordinalswallet.com/collection/bitmap/sold-escrows', {
          params: { offset: 0, limit: 10000 },
          timeout: 15000
        });
        const sold = Array.isArray(soldRes.data) ? soldRes.data : [];
        const newSold = sold.filter(s => parseCreatedTimestamp(s.boughtAt) > lastTs);
        
        console.error('[OW] Sold total: ' + sold.length + ', nuevos: ' + newSold.length);
        
        for (const s of newSold) {
          const insId = s.inscription_id || '';
          if (insId) {
            dbOw.prepare("DELETE FROM ordinalswallet_cache WHERE bitmapId=?").run(insId);
          }
        }
      } catch (e) {
        console.error('[OW] Error fetching sold: ' + e.message);
      }
    }
    
    // 6. GUARDAR STATS
    const floor = (dbOw.prepare("SELECT MIN(listedPrice) as p FROM ordinalswallet_cache WHERE bitmapId != '' AND listedPrice > 0").get() || {}).p || 0;
    const listed = (dbOw.prepare("SELECT COUNT(*) as c FROM ordinalswallet_cache WHERE bitmapId != ''").get() || {}).c || 0;
    
    dbOw.prepare("INSERT OR REPLACE INTO ordinalswallet_stats (key, value, updatedAt) VALUES ('floor_price',?,?)").run(floor, now);
    dbOw.prepare("INSERT OR REPLACE INTO ordinalswallet_stats (key, value, updatedAt) VALUES ('total_listed',?,?)").run(listed, now);
    dbOw.prepare("INSERT OR REPLACE INTO ordinalswallet_stats (key, value, updatedAt) VALUES ('last_poll_time',?,?)").run(now, now);
    
    // 7. GUARDAR NUEVO TIMESTAMP
    const freshTs = (dbOw.prepare("SELECT MAX(listedAt) as m FROM ordinalswallet_cache").get() || {}).m || 0;
    if (freshTs > lastTs) {
      dbOw.prepare("INSERT OR REPLACE INTO ordinalswallet_stats (key, value, updatedAt) VALUES ('lastPollTimestamp',?,?)").run(freshTs, now);
      console.error('[OW] Timestamp actualizado: ' + freshTs);
    }
    
    console.error('[OW] Poll completado: ' + totalSaved + ' nuevos, floor=' + floor + ', listed=' + listed);
    
    // ===== BLOQUE FINALLY =====
    // Stats BEFORE
    console.error('[OW-FINAL] Stats BEFORE: floor=' + floor + ', total=' + listed);
    
    // TOP 20 (buffer timestamp)
    const top20 = dbOw.prepare("SELECT * FROM ordinalswallet_cache WHERE bitmapId != '' ORDER BY listedAt DESC LIMIT 20").all();
    console.error('[OW-FINAL] TOP 20 BITMAPS MÁS RECIENTES:');
    top20.forEach((row, i) => {
      const marker = i === 0 ? ' ⬅️ TIMESTAMP MÁS RECIENTE' : '';
      console.error('[OW-FINAL] [' + (i+1) + '] ' + row.extraData + ' - Price: ' + row.listedPrice + ' - ListedAt: ' + row.listedAt + marker);
    });
    
    // Stats AFTER
    console.error('[OW-FINAL] Stats AFTER: floor=' + floor + ', total=' + listed);
    console.error('[OW-FINAL] ✅ Polling incremental completado');
    
  } catch (err) {
    console.error('[OW] FATAL: ' + err.message);
  }
  
  owPollingActive = false;
  pollUnified();
}
```

---

## 5. Unisat — Flujo Incremental

### 5.1 Flujo Completo

```
┌─────────────────────────────────────────┐
│ 1. Leer lastPollTimestamp de stats      │
│    (0 si es primera vez)                │
├─────────────────────────────────────────┤
│ 2. Para cada evento (Listed, Sold,      │
│    Cancel):                             │
│    a. Fetch desde start=0, limit=400    │
│    b. Filtrar: timestamp > lastTs       │
│    c. Si no hay nuevos → PARAR          │
│    d. Si hay nuevos → procesar          │
│    e. Parar si llegamos a items viejos  │
├─────────────────────────────────────────┤
│ 3. Para Listed: INSERT OR REPLACE       │
│    Para Sold/Cancel: DELETE             │
├─────────────────────────────────────────┤
│ 4. Guardar nuevo lastPollTimestamp      │
├─────────────────────────────────────────┤
│ 5. Finally: Stats + TOP 20 + Cleanup   │
└─────────────────────────────────────────┘
```

### 5.2 Código Nuevo

```javascript
async function pollUnisat() {
  if (uniPollingActive) return;
  if (!dbUnisat) return;
  uniPollingActive = true;
  
  try {
    console.error('[UNI] Starting incremental poll...');
    const now = Date.now();
    const API_KEY = process.env.UNISAT_API_KEY || "NUEVA_API_KEY_AQUI";
    const headers = { "Content-Type": "application/json" };
    headers["Authorization"] = "Bearer " + API_KEY;
    const delay = (ms) => new Promise(r => setTimeout(r, ms));
    
    // 1. LEER ÚLTIMO TIMESTAMP
    const lastTsRow = dbUnisat.prepare("SELECT value FROM unisat_stats WHERE key='lastPollTimestamp'").get();
    const lastTs = lastTsRow ? lastTsRow.value : 0;
    const isFirstSync = lastTs === 0;
    
    console.error('[UNI] lastTs=' + lastTs + ', isFirstSync=' + isFirstSync);
    
    const insertStmt = dbUnisat.prepare("INSERT OR REPLACE INTO unisat_cache (bitmapNumber, bitmapId, listedPrice, listedAt, ownerAddress, extraData, extraData2, timestamp, insertionOrder) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    let insertionOrder = (dbUnisat.prepare("SELECT MAX(insertionOrder) as m FROM unisat_cache").get()?.m || 0) + 1;
    let totalSaved = 0;
    let newLastTs = lastTs;
    
    // 2. PARA CADA EVENTO
    for (const evt of ["Listed", "Sold", "Cancel"]) {
      console.error('[UNI] ' + evt + ' phase...');
      let start = 0;
      let hasMore = true;
      let pages = 0;
      
      while (hasMore) {
        try {
          const res = await axios.post("https://open-api.unisat.io/v3/market/collection/auction/actions", {
            filter: { collectionId: "bitmap", event: evt },
            sort: { timestamp: -1 },
            start: start,
            limit: 400
          }, { headers, timeout: 15000 });
          
          const items = (res.data?.data?.list || []);
          pages++;
          
          if (evt === "Listed") {
            // 3. FILTRAR ITEMS NUEVOS
            const newItems = isFirstSync ? items : items.filter(i => (i.timestamp || 0) > lastTs);
            
            // 4. SI NO HAY NUEVOS, PARAR
            if (!isFirstSync && newItems.length === 0) {
              hasMore = false;
              break;
            }
            
            // 5. INSERTAR ITEMS NUEVOS
            for (const item of newItems) {
              const insId = item.inscriptionId || item.inscription_id || "";
              const name = item.collectionItemName || item.collection_item_name || "";
              if (!insId) continue;
              insertStmt.run(
                parseBitmapNumber(name), insId,
                item.price || item.unitPrice || 0,
                (item.timestamp || now), (item.from || ""),
                name, null, now, insertionOrder++
              );
              totalSaved++;
              newLastTs = Math.max(newLastTs, item.timestamp || 0);
            }
            
            console.error('[UNI] ' + evt + ' página ' + pages + ': ' + items.length + ' total, ' + newItems.length + ' nuevos');
            
          } else {
            // Sold / Cancel
            const newItems = isFirstSync ? items : items.filter(i => (i.timestamp || 0) > lastTs);
            
            if (!isFirstSync && newItems.length === 0) {
              hasMore = false;
              break;
            }
            
            for (const item of newItems) {
              const insId = item.inscriptionId || item.inscription_id || "";
              if (insId) {
                dbUnisat.prepare("DELETE FROM unisat_cache WHERE bitmapId=?").run(insId);
              }
            }
            
            console.error('[UNI] ' + evt + ' página ' + pages + ': ' + items.length + ' total, ' + newItems.length + ' nuevos');
          }
          
          // 6. PARAR SI LLEGAMOS A ITEMS VIEJOS
          if (!isFirstSync && items.length > 0) {
            const oldestTs = items[items.length - 1].timestamp || 0;
            if (oldestTs <= lastTs) {
              hasMore = false;
              break;
            }
          }
          
          hasMore = items.length === 400;
          start += 400;
          if (hasMore) await delay(2000);
          
        } catch (e) {
          console.error('[UNI] ' + evt + ' error página ' + pages + ': ' + e.message);
          hasMore = false;
        }
      }
      
      console.error('[UNI] ' + evt + ' done: ' + pages + ' páginas');
    }
    
    // 7. GUARDAR STATS
    const minRow = dbUnisat.prepare("SELECT MIN(listedPrice) as p FROM unisat_cache WHERE bitmapId != '' AND listedPrice > 0").get();
    const countRow = dbUnisat.prepare("SELECT COUNT(*) as c FROM unisat_cache WHERE bitmapId != ''").get();
    const floor = minRow?.p || 0;
    const listed = countRow?.c || 0;
    
    dbUnisat.prepare("INSERT OR REPLACE INTO unisat_stats (key, value, updatedAt) VALUES ('floor_price',?,?)").run(floor, now);
    dbUnisat.prepare("INSERT OR REPLACE INTO unisat_stats (key, value, updatedAt) VALUES ('total_listed',?,?)").run(listed, now);
    dbUnisat.prepare("INSERT OR REPLACE INTO unisat_stats (key, value, updatedAt) VALUES ('last_poll_time',?,?)").run(now, now);
    
    // 8. GUARDAR NUEVO TIMESTAMP
    if (newLastTs > lastTs) {
      dbUnisat.prepare("INSERT OR REPLACE INTO unisat_stats (key, value, updatedAt) VALUES ('lastPollTimestamp',?,?)").run(newLastTs, now);
      console.error('[UNI] Timestamp actualizado: ' + newLastTs);
    }
    
    console.error('[UNI] Poll completado: ' + totalSaved + ' nuevos, floor=' + floor + ', listed=' + listed);
    
    // ===== BLOQUE FINALLY =====
    // Stats BEFORE
    console.error('[UNI-FINAL] Stats BEFORE: floor=' + floor + ', total=' + listed);
    
    // TOP 20 (buffer timestamp)
    const top20 = dbUnisat.prepare("SELECT * FROM unisat_cache WHERE bitmapId != '' ORDER BY listedAt DESC LIMIT 20").all();
    console.error('[UNI-FINAL] TOP 20 BITMAPS MÁS RECIENTES:');
    top20.forEach((row, i) => {
      const marker = i === 0 ? ' ⬅️ TIMESTAMP MÁS RECIENTE' : '';
      console.error('[UNI-FINAL] [' + (i+1) + '] ' + row.extraData + ' - Price: ' + row.listedPrice + ' - ListedAt: ' + row.listedAt + marker);
    });
    
    // Stats AFTER
    console.error('[UNI-FINAL] Stats AFTER: floor=' + floor + ', total=' + listed);
    console.error('[UNI-FINAL] ✅ Polling incremental completado');
    
  } catch (err) {
    console.error('[UNI] FATAL: ' + err.message);
  }
  
  uniPollingActive = false;
  pollUnified();
}
```

---

## 6. Unified — Merge de las 3 Fuentes

### 6.1 Flujo Completo

```
┌─────────────────────────────────────────┐
│ 1. Leer lastPollTimestamp de stats      │
│    (0 si es primera vez)                │
├─────────────────────────────────────────┤
│ 2. ¿Es primera vez?                     │
│    SÍ → DELETE todo + re-INSERT todo    │
│    NO → Solo INSERT nuevos              │
├─────────────────────────────────────────┤
│ 3. LEER DE 3 FUENTES:                   │
│    a. ordinalswallet_cache (OW)         │
│    b. unisat_cache (Unisat)             │
│    c. bitmapcorp.db (Local) ← NUEVO     │
├─────────────────────────────────────────┤
│ 4. Guardar stats + timestamp            │
└─────────────────────────────────────────┘
```

### 6.2 Código Nuevo

```javascript
async function pollUnified() {
  if (!dbUnified) return;
  if (!dbOw || !dbUnisat) return;
  if (uniPollingActive) return;
  
  try {
    console.error('[UNIFIED] Starting merge...');
    const now = Date.now();
    
    // 1. LEER ÚLTIMO TIMESTAMP
    const lastTsRow = dbUnified.prepare("SELECT value FROM unified_stats WHERE key='lastPollTimestamp'").get();
    const lastTs = lastTsRow ? lastTsRow.value : 0;
    const isFirstSync = lastTs === 0;
    
    console.error('[UNIFIED] lastTs=' + lastTs + ', isFirstSync=' + isFirstSync);
    
    const insertStmt = dbUnified.prepare(`
      INSERT OR REPLACE INTO unified_listings
      (bitmapNumber, bitmapId, listedPrice, listedAt, ownerAddress, extraData, extraData2, timestamp, insertionOrder, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    let insertionOrder = 1;
    let total = 0;
    
    if (isFirstSync) {
      // 2A. PRIMERA VEZ: DELETE + re-INSERT todo
      console.error('[UNIFIED] First sync - re-building entire table...');
      dbUnified.prepare("DELETE FROM unified_listings").run();
      
      // ORDINALSWALLET
      const owRows = dbOw.prepare("SELECT * FROM ordinalswallet_cache WHERE bitmapId != ''").all();
      for (const row of owRows) {
        insertStmt.run(row.bitmapNumber, row.bitmapId, row.listedPrice, row.listedAt,
          row.ownerAddress, row.extraData, row.extraData2, row.timestamp, insertionOrder++, 'ordinalswallet');
        total++;
      }
      
      // UNISAT
      const uniRows = dbUnisat.prepare("SELECT * FROM unisat_cache WHERE bitmapId != ''").all();
      for (const row of uniRows) {
        insertStmt.run(row.bitmapNumber, row.bitmapId, row.listedPrice, row.listedAt,
          row.ownerAddress, row.extraData, row.extraData2, row.timestamp, insertionOrder++, 'unisat');
        total++;
      }
      
      // LOCAL MARKETPLACE (directo de bitmapcorp.db)
      try {
        const Database = require('better-sqlite3');
        const dbLocal = new Database('/root/bitmapcore-server/data/bitmapcorp.db', { readonly: true });
        const localRows = dbLocal.prepare("SELECT * FROM listings WHERE is_active=1").all();
        for (const row of localRows) {
          insertStmt.run(
            row.bitmap_number || 0, row.inscription_id, row.price, row.listed_at,
            row.seller_address, row.name, null, now, insertionOrder++, 'local'
          );
          total++;
        }
        dbLocal.close();
        console.error('[UNIFIED] Local marketplace: ' + localRows.length + ' listings');
      } catch (e) {
        console.error('[UNIFIED] Error reading local: ' + e.message);
      }
      
    } else {
      // 2B. INCREMENTAL: Solo INSERT nuevos
      console.error('[UNIFIED] Incremental sync - adding new items only...');
      
      // ORDINALSWALLET
      const owNew = dbOw.prepare("SELECT * FROM ordinalswallet_cache WHERE bitmapId != '' AND listedAt > ?").all(lastTs);
      for (const row of owNew) {
        insertStmt.run(row.bitmapNumber, row.bitmapId, row.listedPrice, row.listedAt,
          row.ownerAddress, row.extraData, row.extraData2, row.timestamp, insertionOrder++, 'ordinalswallet');
        total++;
      }
      
      // UNISAT
      const uniNew = dbUnisat.prepare("SELECT * FROM unisat_cache WHERE bitmapId != '' AND listedAt > ?").all(lastTs);
      for (const row of uniNew) {
        insertStmt.run(row.bitmapNumber, row.bitmapId, row.listedPrice, row.listedAt,
          row.ownerAddress, row.extraData, row.extraData2, row.timestamp, insertionOrder++, 'unisat');
        total++;
      }
      
      // LOCAL MARKETPLACE (siempre incluir activos, ya que es lectura local)
      try {
        const Database = require('better-sqlite3');
        const dbLocal = new Database('/root/bitmapcore-server/data/bitmapcorp.db', { readonly: true });
        const localRows = dbLocal.prepare("SELECT * FROM listings WHERE is_active=1").all();
        for (const row of localRows) {
          insertStmt.run(
            row.bitmap_number || 0, row.inscription_id, row.price, row.listed_at,
            row.seller_address, row.name, null, now, insertionOrder++, 'local'
          );
          total++;
        }
        dbLocal.close();
      } catch (e) {
        console.error('[UNIFIED] Error reading local: ' + e.message);
      }
    }
    
    // 3. GUARDAR STATS
    const minRow = dbUnified.prepare("SELECT MIN(listedPrice) as p FROM unified_listings WHERE listedPrice > 0").get();
    const countRow = dbUnified.prepare("SELECT COUNT(*) as c FROM unified_listings").get();
    
    dbUnified.prepare("INSERT OR REPLACE INTO unified_stats (key, value, updatedAt) VALUES ('floor_price',?,?)").run(minRow?.p || 0, now);
    dbUnified.prepare("INSERT OR REPLACE INTO unified_stats (key, value, updatedAt) VALUES ('total_listed',?,?)").run(countRow?.c || 0, now);
    dbUnified.prepare("INSERT OR REPLACE INTO unified_stats (key, value, updatedAt) VALUES ('last_poll_time',?,?)").run(now, now);
    
    // 4. GUARDAR NUEVO TIMESTAMP
    const freshTs = Math.max(
      (dbOw.prepare("SELECT MAX(listedAt) as m FROM ordinalswallet_cache").get() || {}).m || 0,
      (dbUnisat.prepare("SELECT MAX(listedAt) as m FROM unisat_cache").get() || {}).m || 0
    );
    if (freshTs > lastTs) {
      dbUnified.prepare("INSERT OR REPLACE INTO unified_stats (key, value, updatedAt) VALUES ('lastPollTimestamp',?,?)").run(freshTs, now);
    }
    
    console.error('[UNIFIED] Merge completado: ' + total + ' nuevos, total=' + (countRow?.c || 0) + ', floor=' + (minRow?.p || 0));
    
  } catch (err) {
    console.error('[UNIFIED] Error: ' + err.message);
  }
}
```

---

## 7. Tablas Involucradas

### 7.1 ordinalswallet_stats

| Key | Descripción | Ejemplo |
|-----|-------------|---------|
| `floor_price` | Precio mínimo | 7000 |
| `total_listed` | Total listados | 11995 |
| `last_poll_time` | Timestamp del último poll | 1785980161752 |
| `lastPollTimestamp` | **NUEVO**: Último timestamp incremental | 1786007736829 |

### 7.2 unisat_stats

| Key | Descripción | Ejemplo |
|-----|-------------|---------|
| `floor_price` | Precio mínimo | 5000 |
| `total_listed` | Total listados | 21081 |
| `last_poll_time` | Timestamp del último poll | 1785980161752 |
| `lastPollTimestamp` | **NUEVO**: Último timestamp incremental | 1785964412463 |

### 7.3 bitmapcorp.db (Local Marketplace)

| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| `inscription_id` | ID de inscripción | 8d011333-... |
| `name` | Nombre del bitmap | 714171.bitmap |
| `price` | Precio en satoshis | 10000 |
| `listed_at` | Timestamp de listado | 1785977410020 |
| `is_active` | 1=activo, 0=inactivo | 1 |
| `seller_address` | Dirección del vendedor | bc1q... |

**Nota**: Solo se leen listings con `is_active=1`. No necesita polling incremental porque es SQLite local.

### 7.4 unified_stats

| Key | Descripción | Ejemplo |
|-----|-------------|---------|
| `floor_price` | Precio mínimo | 5000 |
| `total_listed` | Total listados | 33086 |
| `last_poll_time` | Timestamp del último poll | 1785980161752 |
| `lastPollTimestamp` | **NUEVO**: Último timestamp incremental | 1786007736829 |

---

## 8. Bloque Finally (Reglas de Negocio)

Adaptado del Documento 33 del Android (Reglas-Negocio-Bloque-Finally.md).

### 8.1 Responsabilidades del Finally

| # | Responsabilidad | Descripción |
|---|----------------|-------------|
| 1 | Stats BEFORE | Capturar valores actuales antes de actualizar |
| 2 | TOP 20 | Buffer timestamp para sync incremental |
| 3 | Stats AFTER | Verificar que stats se actualizaron correctamente |
| 4 | Guardar timestamp | Actualizar lastPollTimestamp |
| 5 | Log finalización | Confirmar que el polling terminó |

### 8.2 Why Finally es Obligatorio

> "Todo marketplace que se integre en la app debe terminar su polling con el bloque finally. Ningún marketplace puede terminar el polling por fuera del bloque finally."

**Razón**: Garantiza que el timestamp se guarde correctamente y que el próximo poll incremental tenga un punto de partida válido.

---

## 9. Limpieza Inicial

### 9.1 Problema
- unisat_cache tiene 21,081 entries (solo ~3,600 activos)
- ~17,481 son vendidos/cancelados basura

### 9.2 Solución
```bash
# En VPS, ejecutar ANTES del deploy:
sshpass -p '99XXcandela' ssh -o StrictHostKeyChecking=no root@80.190.76.108 "
  sqlite3 /root/bitmapcore-web/data/unisat_cache.db 'DELETE FROM unisat_cache;'
  sqlite3 /root/bitmapcore-web/data/unisat_cache.db 'DELETE FROM unisat_stats WHERE key=\"lastPollTimestamp\";'
  echo 'Limpieza completada'
"
```

### 9.3 Nueva API Key
- Actualizar `API_KEY` en server.js línea ~880
- La nueva API key sin historial permite empezar limpio

---

## 10. Verificación Post-Deploy

### 10.1 Logs Esperados

**Primer poll (full sync)**:
```
[OW] Starting incremental poll...
[OW] lastTs=0, isFirstSync=true
[OW] Total escrows: 11995, nuevos: 11995
[OW] Poll completado: 11995 nuevos, floor=7000, listed=11995
[OW-FINAL] Stats BEFORE: floor=7000, total=11995
[OW-FINAL] TOP 20 BITMAPS MÁS RECIENTES:
[OW-FINAL] [1] 99902.bitmap - Price: 5000 - ListedAt: 1786007736829 ⬅️ TIMESTAMP MÁS RECIENTE
[OW-FINAL] ✅ Polling incremental completado

[UNI] Starting incremental poll...
[UNI] lastTs=0, isFirstSync=true
[UNI] Listed página 1: 400 total, 400 nuevos
...
[UNI] Poll completado: 3600 nuevos, floor=5000, listed=3600
[UNI-FINAL] Stats BEFORE: floor=5000, total=3600
[UNI-FINAL] TOP 20 BITMAPS MÁS RECIENTES:
[UNI-FINAL] [1] 12345.bitmap - Price: 5000 - ListedAt: 1785964412463 ⬅️ TIMESTAMP MÁS RECIENTE
[UNI-FINAL] ✅ Polling incremental completado

[UNIFIED] Starting merge...
[UNIFIED] lastTs=0, isFirstSync=true
[UNIFIED] First sync - re-building entire table...
[UNIFIED] Merge completado: 15595 nuevos, total=15595, floor=5000
```

**Polls siguientes (incremental)**:
```
[OW] Starting incremental poll...
[OW] lastTs=1786007736829, isFirstSync=false
[OW] Total escrows: 11995, nuevos: 3
[OW] Poll completado: 3 nuevos, floor=7000, listed=11998
[OW-FINAL] ✅ Polling incremental completado

[UNI] Starting incremental poll...
[UNI] lastTs=1785964412463, isFirstSync=false
[UNI] Listed página 1: 400 total, 5 nuevos
[UNI] Listed página 2: 400 total, 0 nuevos
[UNI] Listed página 2: PARANDO (items viejos)
[UNI] Sold página 1: 400 total, 2 nuevos
[UNI] Cancel página 1: 400 total, 1 nuevos
[UNI] Poll completado: 0 nuevos, floor=5000, listed=3599
[UNI-FINAL] ✅ Polling incremental completado
```

### 10.2 Verificar en Base de Datos

```bash
# Verificar lastPollTimestamp
sqlite3 /root/bitmapcore-web/data/ordinalswallet_cache.db "SELECT * FROM ordinalswallet_stats;"
sqlite3 /root/bitmapcore-web/data/unisat_cache.db "SELECT * FROM unisat_stats;"
sqlite3 /root/bitmapcore-web/data/unified_cache.db "SELECT * FROM unified_stats;"

# Verificar conteos
sqlite3 /root/bitmapcore-web/data/ordinalswallet_cache.db "SELECT COUNT(*) FROM ordinalswallet_cache;"
sqlite3 /root/bitmapcore-web/data/unisat_cache.db "SELECT COUNT(*) FROM unisat_cache;"
sqlite3 /root/bitmapcore-web/data/unified_cache.db "SELECT COUNT(*) FROM unified_listings;"
```

---

## 11. Documentos Relacionados

| Documento | Descripción |
|-----------|-------------|
| 01_tabla_1_blockdatabase.md | Estructura de la tabla principal |
| 02_arquitectura_cerebros.md | Arquitectura del sistema |
| 04_logs-listar-activos-Boton-Listar.md | Logs del botón listar |
| 41_Polling-Incremental.md (Android) | Mecanismo incremental original |
| 33_Reglas-Negocio-Bloque-Finally.md (Android) | Reglas del bloque finally |

---

## 12. Resumen

El polling incremental es la clave para mantener los datos actualizados sin descargar todo cada vez. El web server:

1. **Guarda** el timestamp más reciente en `*stats` tables
2. **Busca** desde ese timestamp hasta ahora
3. **Detecta** cuántos listings nuevos hubo
4. **Copia** solo los nuevos a la tabla cache (sin duplicados)
5. **Elimina** los vendidos/cancelados nuevos
6. **Finaliza** con el bloque finally (stats + TOP 20 + timestamp)

**Resultado**: 4-8 llamadas API por poll en vez de 260, alcanzando para TODO el mes.
