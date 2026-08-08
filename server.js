const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const axios = require('axios');

try {
  const fs = require("fs");
  const envPath = require("path").join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, "utf8").split("\n").forEach(function(line) {
      var m = line.match(/^([^=]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    });
  }
} catch(e) {}

const app = express();
const PORT = 5500;

app.use(cors({
  origin: ['https://bitmapcore.net', 'https://www.bitmapcore.net', 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

const publicDir = path.join(__dirname, 'Public');
app.use(express.static(publicDir, {
  setHeaders: function(res, filePath) {
    if (filePath.endsWith('.js') || filePath.endsWith('.html')) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    }
  }
}));

let db = null;
try {
  db = new Database(path.join(__dirname, 'data/bitmapcorp_database.db'), { readonly: false });
  console.log('Database connected');
} catch (err) {
  console.error('Database not found, API routes will return empty data:', err.message);
}

let dbOw = null;
try {
  const fs = require('fs');
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  dbOw = new Database(path.join(dataDir, 'ordinalswallet_cache.db'));
  dbOw.pragma('journal_mode = WAL');
  dbOw.exec(`
    CREATE TABLE IF NOT EXISTS ordinalswallet_cache (
      bitmapNumber  INTEGER,
      bitmapId      TEXT PRIMARY KEY,
      listedPrice   INTEGER,
      listedAt      INTEGER,
      ownerAddress  TEXT,
      extraData     TEXT,
      extraData2    TEXT,
      timestamp     INTEGER DEFAULT 0,
      insertionOrder INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_ow_listedAt ON ordinalswallet_cache(listedAt DESC);
    CREATE INDEX IF NOT EXISTS idx_ow_insertion ON ordinalswallet_cache(insertionOrder DESC);
    CREATE TABLE IF NOT EXISTS block_images (
      block_number  INTEGER NOT NULL,
      size          INTEGER NOT NULL DEFAULT 80,
      options_hash  TEXT NOT NULL,
      image_data    BLOB NOT NULL,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (block_number, size, options_hash)
    ) WITHOUT ROWID;
    CREATE INDEX IF NOT EXISTS idx_block_images_block ON block_images(block_number);
    CREATE TABLE IF NOT EXISTS ordinalswallet_stats (
      key       TEXT PRIMARY KEY,
      value     INTEGER,
      updatedAt INTEGER
    );
  `);
  console.log('Ordinalswallet cache DB connected');
} catch (err) {
  console.error('Ordinalswallet cache DB not created:', err.message);
}

let dbUnisat = null;
try {
  const fs = require('fs');
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  dbUnisat = new Database(path.join(dataDir, 'unisat_cache.db'));
  dbUnisat.pragma('journal_mode = WAL');
  dbUnisat.exec(`
    CREATE TABLE IF NOT EXISTS unisat_cache (
      bitmapNumber  INTEGER,
      bitmapId      TEXT PRIMARY KEY,
      listedPrice   INTEGER,
      listedAt      INTEGER,
      ownerAddress  TEXT,
      extraData     TEXT,
      extraData2    TEXT,
      timestamp     INTEGER DEFAULT 0,
      insertionOrder INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_uni_listedAt ON unisat_cache(listedAt DESC);
    CREATE INDEX IF NOT EXISTS idx_uni_insertion ON unisat_cache(insertionOrder DESC);
    CREATE TABLE IF NOT EXISTS unisat_stats (
      key       TEXT PRIMARY KEY,
      value     INTEGER,
      updatedAt INTEGER
    );
  `);
  console.log('Unisat cache DB connected');
} catch (err) {
  console.error('Unisat cache DB not created:', err.message);
}

let dbUnified = null;
try {
  const fs = require('fs');
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  dbUnified = new Database(path.join(dataDir, 'unified_cache.db'));
  dbUnified.pragma('journal_mode = WAL');
  dbUnified.exec(`
    CREATE TABLE IF NOT EXISTS unified_listings (
      bitmapNumber  INTEGER,
      bitmapId      TEXT,
      listedPrice   INTEGER,
      listedAt      INTEGER,
      ownerAddress  TEXT,
      extraData     TEXT,
      extraData2    TEXT,
      timestamp     INTEGER DEFAULT 0,
      insertionOrder INTEGER,
      source        TEXT,
      PRIMARY KEY (bitmapId, source)
    );
    CREATE INDEX IF NOT EXISTS idx_unified_listedAt ON unified_listings(listedAt DESC);
    CREATE INDEX IF NOT EXISTS idx_unified_insertion ON unified_listings(insertionOrder DESC);
    CREATE TABLE IF NOT EXISTS unified_stats (
      key       TEXT PRIMARY KEY,
      value     INTEGER,
      updatedAt INTEGER
    );
  `);
  console.log('Unified cache DB connected');
} catch (err) {
  console.error('Unified cache DB not created:', err.message);
}

let dbSales = null;
try {
  const fs = require('fs');
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  dbSales = new Database(path.join(dataDir, 'sales_history.db'));
  dbSales.pragma('journal_mode = WAL');
  dbSales.exec(`
    CREATE TABLE IF NOT EXISTS all_sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bitmap_name TEXT,
      bitmap_number INTEGER,
      inscription_id TEXT,
      price INTEGER,
      buyer_address TEXT,
      seller_address TEXT,
      source TEXT,
      txid TEXT,
      sold_at INTEGER,
      synced_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_all_sales_sold_at ON all_sales(sold_at DESC);
    CREATE INDEX IF NOT EXISTS idx_all_sales_source ON all_sales(source);
    CREATE INDEX IF NOT EXISTS idx_all_sales_bitmap_number ON all_sales(bitmap_number);
  `);
  console.log('Sales history DB connected');
} catch (err) {
  console.error('Sales history DB not created:', err.message);
}

function getTableNames() {
  if (!db) return [];
  try {
    return db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
  } catch (e) { return []; }
}

function tableExists(name) {
  if (!db) return false;
  try {
    const r = db.prepare("SELECT count(*) as c FROM sqlite_master WHERE type='table' AND name=?").get(name);
    return r && r.c > 0;
  } catch (e) { return false; }
}

function sendSuccess(res, data) {
  res.json({ success: true, data: data });
}

function sendError(res, msg, code) {
  res.status(code || 500).json({ success: false, error: msg });
}

// ===== CLASSIFICATION ENDPOINTS (before catch-all) =====
app.get('/api/v1/classify/status', (req, res) => {
  if (!db) return sendSuccess(res, { classified: false });
  try {
    const hasTagTables = db.prepare("SELECT count(*) as c FROM sqlite_master WHERE type='table' AND name='tag_tables'").get().c > 0;
    const hasTaggedBlocks = db.prepare("SELECT count(*) as c FROM sqlite_master WHERE type='table' AND name='tagged_blocks'").get().c > 0;
    let tableCount = 0, blockCount = 0;
    if (hasTagTables) tableCount = db.prepare('SELECT COUNT(*) as c FROM tag_tables').get().c;
    if (hasTaggedBlocks) blockCount = db.prepare('SELECT COUNT(*) as c FROM tagged_blocks').get().c;
    sendSuccess(res, { classified: hasTagTables && hasTaggedBlocks, tagTables: tableCount, taggedBlocks: blockCount });
  } catch (err) {
    sendError(res, err.message);
  }
});

app.post('/api/v1/classify', async (req, res) => {
  if (!db) return sendError(res, 'No database', 500);
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tag_tables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tagName TEXT UNIQUE,
        count INTEGER DEFAULT 0,
        firstBlock INTEGER,
        lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS tagged_blocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bloque INTEGER,
        tagName TEXT,
        etiquetaIndividual TEXT,
        totalBtc TEXT,
        totalTransacciones TEXT,
        etiquetas TEXT,
        mempool TEXT,
        hash TEXT,
        total_etiquetas_en_bloque INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_tagged_blocks_tag ON tagged_blocks(tagName);
      CREATE INDEX IF NOT EXISTS idx_tagged_blocks_bloque ON tagged_blocks(bloque);
    `);

    const CLASSIFICATION_TABLES = require('./classification-tables.js');

    let totalProcessed = 0;
    for (const table of CLASSIFICATION_TABLES) {
      const tagName = table.tagName || table.name;
      const query = 'SELECT * FROM blocks ' + table.query;
      const blocks = db.prepare(query).all();
      
      if (blocks.length > 0) {
        const insert = db.prepare(`
          INSERT INTO tagged_blocks (bloque, tagName, etiquetaIndividual, totalBtc, totalTransacciones, etiquetas, mempool, hash, total_etiquetas_en_bloque)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 
            CASE WHEN ? IS NULL OR ? = '' THEN 0 
                 ELSE (LENGTH(?) - LENGTH(REPLACE(?, '|', ''))) + 1 END
          )
        `);
        const insertMany = db.transaction((items) => {
          for (const item of items) {
            const etiquetas = item.etiquetas || '';
            insert.run(item.bloque, tagName, tagName, item.totalBtc, item.totalTransacciones, item.etiquetas, item.mempool, item.hash, etiquetas, etiquetas, etiquetas, etiquetas);
          }
        });
        insertMany(blocks);
        
        db.prepare('INSERT OR REPLACE INTO tag_tables (tagName, count, firstBlock, lastUpdated) VALUES (?, ?, ?, datetime(\'now\'))')
          .run(tagName, blocks.length, blocks[0].bloque);
        
        totalProcessed += blocks.length;
      }
    }

    sendSuccess(res, { 
      message: 'Clasificación completada', 
      tablesProcessed: CLASSIFICATION_TABLES.length,
      totalBlocksTagged: totalProcessed 
    });
  } catch (err) {
    sendError(res, err.message);
  }
});

// ===== BLOCKS (Table principal) =====
app.get('/api/v1/blocks', (req, res) => {
  if (!db) return sendSuccess(res, []);
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const tables = getTableNames();

    let countStmt, dataStmt;
    if (tableExists('blocks')) {
      countStmt = db.prepare('SELECT COUNT(*) as total FROM blocks');
      dataStmt = db.prepare('SELECT * FROM blocks ORDER BY rowid DESC LIMIT ? OFFSET ?');
    } else if (tableExists('tag_tables')) {
      countStmt = db.prepare('SELECT COUNT(*) as total FROM tag_tables');
      dataStmt = db.prepare('SELECT * FROM tag_tables ORDER BY rowid DESC LIMIT ? OFFSET ?');
    } else {
      return sendSuccess(res, { items: [], total: 0, page: page, limit: limit, tables: tables });
    }

    const total = countStmt.get().total;
    const items = dataStmt.all(limit, offset);
    sendSuccess(res, { items: items, total: total, page: page, limit: limit });
  } catch (err) {
    sendError(res, err.message);
  }
});

app.get('/api/v1/blocks/search', (req, res) => {
  if (!db) return sendSuccess(res, []);
  try {
    const q = req.query.q;
    if (!q) return sendSuccess(res, []);
    const num = parseInt(q);
    let items;
    if (!isNaN(num) && tableExists('blocks')) {
      items = db.prepare('SELECT * FROM blocks WHERE bloque = ?').all(num);
    } else if (tableExists('blocks')) {
      items = db.prepare('SELECT * FROM blocks WHERE CAST(bloque AS TEXT) LIKE ?').all('%' + q + '%');
    } else if (tableExists('tag_tables')) {
      items = db.prepare('SELECT * FROM tag_tables WHERE tagName LIKE ?').all('%' + q + '%');
    } else {
      items = [];
    }
    sendSuccess(res, items);
  } catch (err) {
    sendError(res, err.message);
  }
});

app.get('/api/v1/blocks/:id', (req, res) => {
  if (!db) return sendError(res, 'No database', 404);
  try {
    const id = req.params.id;
    const num = parseInt(id);
    let block = null;

    if (tableExists('blocks')) {
      block = db.prepare('SELECT * FROM blocks WHERE bloque = ?').get(num);
      if (!block) block = db.prepare('SELECT * FROM blocks WHERE rowid = ?').get(num);
    }

    if (!block && tableExists('block_specific_summary')) {
      block = db.prepare('SELECT * FROM block_specific_summary WHERE blockNumber = ?').get(num);
    }

    if (!block) return sendError(res, 'Block not found', 404);

    if (block && block.bloque !== undefined) {
      block.blockNumber = block.bloque;
      block.txCount = block.totalTransacciones;
      block.txCount = block.totalTransacciones;
      block.size = block.totalBtc;
      block.date = block.etiquetas;
    }

    sendSuccess(res, block);
  } catch (err) {
    sendError(res, err.message);
  }
});

app.get('/api/v1/blocks/:id/transactions', (req, res) => {
  if (!db) return sendSuccess(res, []);
  try {
    const num = parseInt(req.params.id);
    let transactions = [];
    if (tableExists('block_specific_transactions')) {
      transactions = db.prepare('SELECT * FROM block_specific_transactions WHERE blockNumber = ? ORDER BY transactionIndex ASC').all(num);
    }
    sendSuccess(res, transactions);
  } catch (err) {
    sendError(res, err.message);
  }
});

// ===== TAGS =====
app.get('/api/v1/tags', (req, res) => {
  if (!db) return sendSuccess(res, []);
  try {
    let tags = [];
    if (tableExists('tag_tables')) {
      tags = db.prepare('SELECT * FROM tag_tables ORDER BY lastUpdated DESC').all();
    }

    // Corregir conteos para etiquetas especiales replicando lógica Android
    // Usar tabla blocks (Tabla 1) para calcular conteos correctos replicando lógica DAO Android
    const specialTagCounts = {};
    
    // txS millonarias - case-sensitive 'millonaria' (Android: etiquetas LIKE '%millonaria%')
    try {
      const millonariasStats = db.prepare(`
        WITH RECURSIVE split_tags(bloque, etiqueta, rest) AS (
          SELECT 
            bloque,
            CASE 
              WHEN instr(etiquetas, '|') > 0 THEN trim(substr(etiquetas, 1, instr(etiquetas, '|') - 1))
              ELSE trim(etiquetas)
            END,
            CASE 
              WHEN instr(etiquetas, '|') > 0 THEN substr(etiquetas, instr(etiquetas, '|') + 1)
              ELSE ''
            END
          FROM blocks
          WHERE etiquetas LIKE '%millonaria%'
          
          UNION ALL
          
          SELECT 
            bloque,
            CASE 
              WHEN instr(rest, '|') > 0 THEN trim(substr(rest, 1, instr(rest, '|') - 1))
              ELSE trim(rest)
            END,
            CASE 
              WHEN instr(rest, '|') > 0 THEN substr(rest, instr(rest, '|') + 1)
              ELSE ''
            END
          FROM split_tags
          WHERE rest != ''
        )
        SELECT COUNT(*) as totalEtiquetas, COUNT(DISTINCT bloque) as totalBloquesUnicos
        FROM split_tags
        WHERE etiqueta LIKE '%millonaria%'
      `).get();
      
      if (millonariasStats) {
        specialTagCounts['txS millonarias'] = {
          count: millonariasStats.totalEtiquetas,
          distinctBlocks: millonariasStats.totalBloquesUnicos
        };
      }
    } catch (e) { console.log('Error millonarias stats:', e.message); }

    // TXs MULTIMILLONARIAS - case-insensitive 'multimillonaria' (Android: lower(etiquetas) LIKE '%multimillonaria%')
    try {
      const multimillonariasStats = db.prepare(`
        WITH RECURSIVE split_tags(bloque, etiqueta, rest) AS (
          SELECT 
            bloque,
            CASE 
              WHEN instr(etiquetas, '|') > 0 THEN trim(substr(etiquetas, 1, instr(etiquetas, '|') - 1))
              ELSE trim(etiquetas)
            END,
            CASE 
              WHEN instr(etiquetas, '|') > 0 THEN substr(etiquetas, instr(etiquetas, '|') + 1)
              ELSE ''
            END
          FROM blocks
          WHERE lower(etiquetas) LIKE '%multimillonaria%'
          
          UNION ALL
          
          SELECT 
            bloque,
            CASE 
              WHEN instr(rest, '|') > 0 THEN trim(substr(rest, 1, instr(rest, '|') - 1))
              ELSE trim(rest)
            END,
            CASE 
              WHEN instr(rest, '|') > 0 THEN substr(rest, instr(rest, '|') + 1)
              ELSE ''
            END
          FROM split_tags
          WHERE rest != ''
        )
        SELECT COUNT(*) as totalEtiquetas, COUNT(DISTINCT bloque) as totalBloquesUnicos
        FROM split_tags
        WHERE lower(etiqueta) LIKE '%multimillonaria%'
      `).get();
      
      if (multimillonariasStats) {
        specialTagCounts['TXs MULTIMILLONARIAS'] = {
          count: multimillonariasStats.totalEtiquetas,
          distinctBlocks: multimillonariasStats.totalBloquesUnicos
        };
      }
    } catch (e) { console.log('Error multimillonarias stats:', e.message); }

    // Aplicar conteos corregidos a las tags
    tags = tags.map(tag => {
      const corrected = specialTagCounts[tag.tagName];
      if (corrected) {
        return { ...tag, count: corrected.count, distinctBlocks: corrected.distinctBlocks };
      }
      return tag;
    });

    sendSuccess(res, tags);
  } catch (err) {
    sendError(res, err.message);
  }
});

app.get('/api/v1/tags/:tagName', (req, res) => {
  if (!db) return sendSuccess(res, []);
  try {
    const tagName = req.params.tagName;
    let blocks = [];
    if (tableExists('tagged_blocks')) {
      blocks = db.prepare('SELECT * FROM tagged_blocks WHERE tagName = ?').all(tagName);
    }
    sendSuccess(res, blocks);
  } catch (err) {
    sendError(res, err.message);
  }
});

// ===== TAG PREVIEW (full block data for Mondrian) =====
app.get('/api/v1/tags/:tagName/preview', (req, res) => {
  if (!db) return sendSuccess(res, null);
  try {
    const tagName = req.params.tagName;
    if (!tableExists('tagged_blocks') || !tableExists('tag_tables')) return sendSuccess(res, null);

    // Para etiquetas especiales, calcular conteos replicando lógica Android
    let stats = null;
    if (tagName === 'txS millonarias' || tagName === 'TXs MULTIMILLONARIAS') {
      const isMillonarias = tagName === 'txS millonarias';
      const pattern = isMillonarias ? '%millonaria%' : '%multimillonaria%';
      const caseSensitive = isMillonarias; // millonarias: case-sensitive, multimillonarias: case-insensitive
      
      const whereClause = isMillonarias 
        ? "etiquetas LIKE '%millonaria%'"
        : "lower(etiquetas) LIKE '%multimillonaria%'";
      const filterClause = isMillonarias 
        ? "etiqueta LIKE '%millonaria%'"
        : "lower(etiqueta) LIKE '%multimillonaria%'";
      
      stats = db.prepare(`
        WITH RECURSIVE split_tags(bloque, etiqueta, rest) AS (
          SELECT 
            bloque,
            CASE 
              WHEN instr(etiquetas, '|') > 0 THEN trim(substr(etiquetas, 1, instr(etiquetas, '|') - 1))
              ELSE trim(etiquetas)
            END,
            CASE 
              WHEN instr(etiquetas, '|') > 0 THEN substr(etiquetas, instr(etiquetas, '|') + 1)
              ELSE ''
            END
          FROM blocks
          WHERE ${whereClause}
          
          UNION ALL
          
          SELECT 
            bloque,
            CASE 
              WHEN instr(rest, '|') > 0 THEN trim(substr(rest, 1, instr(rest, '|') - 1))
              ELSE trim(rest)
            END,
            CASE 
              WHEN instr(rest, '|') > 0 THEN substr(rest, instr(rest, '|') + 1)
              ELSE ''
            END
          FROM split_tags
          WHERE rest != ''
        )
        SELECT COUNT(*) as totalEtiquetas, COUNT(DISTINCT bloque) as totalBloquesUnicos
        FROM split_tags
        WHERE ${filterClause}
      `).get();
    } else {
      // Etiquetas normales - usar tagged_blocks
      stats = db.prepare(`
        SELECT COUNT(*) as totalEtiquetas, COUNT(DISTINCT bloque) as totalBloquesUnicos
        FROM tagged_blocks WHERE tagName = ?
      `).get(tagName);
    }

    // Get the first tagged block with full data from blocks table
    let tagged = null;
    if (tagName === 'txS millonarias' || tagName === 'TXs MULTIMILLONARIAS') {
      const pattern = tagName === 'txS millonarias' ? '%millonaria%' : '%multimillonaria%';
      const whereClause = tagName === 'txS millonarias' 
        ? "etiquetas LIKE '%millonaria%'"
        : "lower(etiquetas) LIKE '%multimillonaria%'";
      
      // Get first block with this tag from blocks table
      const firstBlock = db.prepare(`
        SELECT * FROM blocks 
        WHERE ${tagName === 'txS millonarias' ? "etiquetas LIKE '%millonaria%'" : "lower(etiquetas) LIKE '%multimillonaria%'"}
        ORDER BY bloque ASC LIMIT 1
      `).get();
      
      if (firstBlock) {
        tagged = { bloque: firstBlock.bloque, etiquetas: firstBlock.etiquetas, totalTransacciones: firstBlock.totalTransacciones };
      }
    } else {
      tagged = db.prepare('SELECT * FROM tagged_blocks WHERE tagName = ? ORDER BY bloque ASC LIMIT 1').get(tagName);
    }

    if (!tagged) return sendSuccess(res, null);

    let block = null;
    if (tableExists('blocks')) {
      block = db.prepare('SELECT * FROM blocks WHERE bloque = ?').get(tagged.bloque);
    }

    const totalEtiquetas = stats ? stats.totalEtiquetas : 0;
    const totalBloquesUnicos = stats ? stats.totalBloquesUnicos : 0;

    if (block) {
      block.blockNumber = block.bloque;
      block.txCount = block.totalTransacciones;
      block.etiquetas = tagged.etiquetas;
      block.tagName = tagName;
      block.totalEtiquetas = totalEtiquetas;
      block.totalBloquesUnicos = totalBloquesUnicos;
      sendSuccess(res, block);
    } else {
      tagged.blockNumber = tagged.bloque;
      tagged.txCount = tagged.totalTransacciones;
      tagged.totalEtiquetas = totalEtiquetas;
      tagged.totalBloquesUnicos = totalBloquesUnicos;
      sendSuccess(res, tagged);
    }
  } catch (err) {
    sendError(res, err.message);
  }
});

app.get('/api/v1/etiquetas-precio', (req, res) => {
  if (!db) return sendSuccess(res, []);
  try {
    let items = [];
    if (tableExists('etiquetas_por_precio')) {
      items = db.prepare('SELECT * FROM etiquetas_por_precio ORDER BY precio ASC').all();
    }
    sendSuccess(res, items);
  } catch (err) {
    sendError(res, err.message);
  }
});

app.get('/api/v1/etiquetas-precio/:rango', (req, res) => {
  if (!db) return sendSuccess(res, []);
  try {
    let items = [];
    if (tableExists('etiquetas_por_precio')) {
      items = db.prepare('SELECT * FROM etiquetas_por_precio WHERE rangoPrecio = ?').all(req.params.rango);
    }
    sendSuccess(res, items);
  } catch (err) {
    sendError(res, err.message);
  }
});

// ===== WALLET =====
app.post('/api/v1/wallet/connect', (req, res) => {
  if (!db) return sendError(res, 'No database', 500);
  try {
    const { address } = req.body;
    if (!address) return sendError(res, 'Address required', 400);
    db.prepare('CREATE TABLE IF NOT EXISTS wallets (address TEXT PRIMARY KEY, connectedAt DATETIME DEFAULT CURRENT_TIMESTAMP)').run();
    db.prepare('INSERT OR REPLACE INTO wallets (address) VALUES (?)').run(address);
    sendSuccess(res, { address, connected: true });
  } catch (err) {
    sendError(res, err.message);
  }
});

app.get('/api/v1/wallet/:address/balance', (req, res) => {
  if (!db) return sendSuccess(res, { balance: 0 });
  try {
    const { address } = req.params;
    sendSuccess(res, { address, balance: 0, utxos: [] });
  } catch (err) {
    sendError(res, err.message);
  }
});

app.get('/api/v1/wallet/:address/utxos', (req, res) => {
  if (!db) return sendSuccess(res, []);
  try {
    sendSuccess(res, []);
  } catch (err) {
    sendError(res, err.message);
  }
});

app.get('/api/v1/bitmasowner/:address', (req, res) => {
  if (!db) return sendSuccess(res, []);
  try {
    sendSuccess(res, []);
  } catch (err) {
    sendError(res, err.message);
  }
});

// ===== PSBT =====
app.post('/api/v1/transaction/psbt', (req, res) => {
  if (!db) return sendError(res, 'No database', 500);
  try {
    sendSuccess(res, { psbt: '' });
  } catch (err) {
    sendError(res, err.message);
  }
});

app.post('/api/v1/transaction/psbt/sign', (req, res) => {
  if (!db) return sendError(res, 'No database', 500);
  try {
    sendSuccess(res, { signedPsbt: '' });
  } catch (err) {
    sendError(res, err.message);
  }
});

app.post('/api/v1/transaction/psbt/broadcast', (req, res) => {
  if (!db) return sendError(res, 'No database', 500);
  try {
    sendSuccess(res, { txid: '' });
  } catch (err) {
    sendError(res, err.message);
  }
});

// ===== MARKETPLACE =====
app.get('/api/v1/descuentos', (req, res) => {
  if (!db) return sendSuccess(res, []);
  try {
    sendSuccess(res, []);
  } catch (err) {
    sendError(res, err.message);
  }
});

app.get('/api/v1/unified', (req, res) => {
  if (!db) return sendSuccess(res, { allListings: [], stats: {} });
  try {
    sendSuccess(res, { allListings: [], stats: {} });
  } catch (err) {
    sendError(res, err.message);
  }
});

// ===== SALES HISTORY =====
app.get('/api/v1/sales/history', (req, res) => {
  if (!dbSales) return sendSuccess(res, { items: [], total: 0 });
  try {
    const days = parseInt(req.query.days) || 30;
    const source = req.query.source || 'all';
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const offset = parseInt(req.query.offset) || 0;
    const since = Date.now() - (days * 24 * 60 * 60 * 1000);

    let query = 'SELECT * FROM all_sales WHERE sold_at > ?';
    const params = [since];

    if (source !== 'all') {
      query += ' AND source = ?';
      params.push(source);
    }

    query += ' ORDER BY sold_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const items = dbSales.prepare(query).all(...params);

    let countQuery = 'SELECT COUNT(*) as c FROM all_sales WHERE sold_at > ?';
    const countParams = [since];
    if (source !== 'all') {
      countQuery += ' AND source = ?';
      countParams.push(source);
    }
    const countRow = dbSales.prepare(countQuery).get(...countParams);

    sendSuccess(res, { items: items, total: countRow ? countRow.c : 0, days: days, source: source });
  } catch (err) {
    sendError(res, err.message);
  }
});

app.get('/api/v1/sales/stats', (req, res) => {
  if (!dbSales) return sendSuccess(res, {});
  try {
    const now = Date.now();
    const last24h = now - 86400000;
    const last7d = now - (7 * 86400000);
    const last30d = now - (30 * 86400000);

    const sales24h = dbSales.prepare("SELECT COUNT(*) as c, COALESCE(SUM(price),0) as v FROM all_sales WHERE sold_at > ?").get(last24h);
    const sales7d = dbSales.prepare("SELECT COUNT(*) as c, COALESCE(SUM(price),0) as v FROM all_sales WHERE sold_at > ?").get(last7d);
    const sales30d = dbSales.prepare("SELECT COUNT(*) as c, COALESCE(SUM(price),0) as v FROM all_sales WHERE sold_at > ?").get(last30d);
    const bySource = dbSales.prepare("SELECT source, COUNT(*) as c, COALESCE(SUM(price),0) as v FROM all_sales WHERE sold_at > ? GROUP BY source").all(last30d);

    sendSuccess(res, {
      h24: { count: sales24h.c, volume: sales24h.v },
      d7: { count: sales7d.c, volume: sales7d.v },
      d30: { count: sales30d.c, volume: sales30d.v },
      bySource: bySource
    });
  } catch (err) {
    sendError(res, err.message);
  }
});

// ===== INTERNAL ENDPOINTS =====
app.post('/api/v1/internal/refresh-local', async (req, res) => {
  try {
    await pollUnified();
    res.json({ success: true, message: 'Unified cache refreshed with local marketplace listings' });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== LOCAL MARKETPLACE STATS =====
app.get('/api/v1/local/stats', (req, res) => {
  try {
    const localDb = new Database(path.join(__dirname, '..', 'bitmapcore-server', 'data', 'bitmapcorp.db'), { readonly: true });
    
    const ventasTotal = localDb.prepare("SELECT COUNT(*) as c, SUM(price) as v FROM ventas_historial").get();
    const ventas24h = localDb.prepare("SELECT SUM(price) as v FROM ventas_historial WHERE sold_at > ?").get(Date.now() - 86400000);
    const listingsStats = localDb.prepare("SELECT COUNT(*) as c, COALESCE(MIN(price), 0) as floor FROM listings WHERE is_active = 1 AND price > 0").get();
    
    localDb.close();
    
    sendSuccess(res, {
      ventas: ventasTotal.c || 0,
      volumen: ventasTotal.v || 0,
      volumen24h: ventas24h.v || 0,
      listados: listingsStats.c || 0,
      piso: listingsStats.floor || 0
    });
  } catch (err) {
    sendError(res, err.message);
  }
});

// ===== PROXY ORDINALSWALLET (URLs correctas: turbo.ordinalswallet.com) =====
app.get('/api/v1/proxy/ordinalswallet/listings', async (req, res) => {
  try {
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 60;
    const response = await axios.get('https://turbo.ordinalswallet.com/collection/bitmap/escrows', {
      params: { offset, limit },
      timeout: 15000
    });
    sendSuccess(res, response.data);
  } catch (err) {
    sendError(res, err.message);
  }
});

app.get('/api/v1/proxy/ordinalswallet/sold', async (req, res) => {
  try {
    const response = await axios.get('https://turbo.ordinalswallet.com/collection/bitmap/sold-escrows', {
      params: { limit: parseInt(req.query.limit) || 100, offset: parseInt(req.query.offset) || 0 },
      timeout: 15000
    });
    sendSuccess(res, response.data);
  } catch (err) {
    sendError(res, err.message);
  }
});

app.get('/api/v1/proxy/ordinalswallet/stats', async (req, res) => {
  try {
    const response = await axios.get('https://turbo.ordinalswallet.com/collection/bitmap/stats', {
      timeout: 10000
    });
    sendSuccess(res, response.data);
  } catch (err) {
    sendError(res, err.message);
  }
});

app.post('/api/v1/proxy/unisat/actions', async (req, res) => {
  try {
    const response = await axios.post('https://open-api.unisat.io/v1/indexer/actions', req.body, {
      headers: { 'Content-Type': 'application/json' }
    });
    sendSuccess(res, response.data);
  } catch (err) {
    sendError(res, err.message);
  }
});

app.get('/api/v1/proxy/unisat/listings', async (req, res) => {
  try {
    const response = await axios.get('https://open-api.unisat.io/v1/indexer/market/collection/bitmap/listings', {
      params: { limit: 100, offset: 0 }
    });
    sendSuccess(res, response.data);
  } catch (err) {
    sendError(res, err.message);
  }
});

// ===== ORDINALSWALLET POLLING SERVICE + CACHE =====

function parseCreatedTimestamp(created) {
  if (!created) return 0;
  try {
    const fixed = created.replace('+00', '+00:00');
    const cleaned = fixed.replace(/\.(\d{3})\d+/, '.$1');
    const t = new Date(cleaned).getTime();
    if (!isNaN(t) && t > 0) return t;
    const cleaned2 = fixed.replace(/\.\d+/, '');
    const t2 = new Date(cleaned2).getTime();
    return (!isNaN(t2) && t2 > 0) ? t2 : 0;
  } catch (e) { return 0; }
}

function parseBitmapNumber(name) {
  if (!name) return 0;
  const m = name.match(/(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

let owPollingActive = false;
let owLastPollTime = 0;

async function pollOrdinalswallet() {
  if (owPollingActive) return;
  if (!dbOw) return;
  owPollingActive = true;
  try {
    console.error('[OW] Starting incremental poll...');
    const now = Date.now();

    const lastTsRow = dbOw.prepare("SELECT value FROM ordinalswallet_stats WHERE key='lastPollTimestamp'").get();
    const lastTs = lastTsRow ? lastTsRow.value : 0;
    const isFirstSync = lastTs === 0;
    console.error('[OW] lastTs=' + lastTs + ', isFirstSync=' + isFirstSync);

    const insertStmt = dbOw.prepare(`
      INSERT OR REPLACE INTO ordinalswallet_cache
      (bitmapNumber, bitmapId, listedPrice, listedAt, ownerAddress, extraData, extraData2, timestamp, insertionOrder)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let totalSaved = 0;
    let insertionOrder = (dbOw.prepare("SELECT MAX(insertionOrder) as m FROM ordinalswallet_cache").get()?.m || 0) + 1;

    try {
      const escrowsRes = await axios.get('https://turbo.ordinalswallet.com/collection/bitmap/escrows', {
        params: { offset: 0, limit: 10000 },
        timeout: 30000
      });
      const escrows = Array.isArray(escrowsRes.data) ? escrowsRes.data : [];
      const newEscrows = isFirstSync ? escrows : escrows.filter(e => parseCreatedTimestamp(e.created) > lastTs);
      console.error('[OW] Total escrows: ' + escrows.length + ', nuevos: ' + newEscrows.length);

      for (const e of newEscrows) {
        const insId = e.inscription_id || '';
        if (!insId) continue;
        insertStmt.run(
          parseBitmapNumber(e.name), insId,
          e.satoshi_price || 0, parseCreatedTimestamp(e.created),
          e.seller_address || '', e.name || '',
          null, now, insertionOrder++
        );
        totalSaved++;
      }
    } catch (e) {
      console.error('[OW] Error fetching escrows: ' + e.message);
    }

    if (!isFirstSync) {
      try {
        const soldRes = await axios.get('https://turbo.ordinalswallet.com/collection/bitmap/sold-escrows', {
          params: { offset: 0, limit: 10000 },
          timeout: 30000
        });
        const sold = Array.isArray(soldRes.data) ? soldRes.data : [];
        const newSold = sold.filter(s => parseCreatedTimestamp(s.bought_at) > lastTs);
        console.error('[OW] Sold total: ' + sold.length + ', nuevos: ' + newSold.length);
        for (const s of newSold) {
          const insId = s.inscription_id || '';
          if (insId) {
            dbOw.prepare("DELETE FROM ordinalswallet_cache WHERE bitmapId=?").run(insId);
            if (dbSales) {
              try {
                dbSales.prepare("INSERT INTO all_sales (bitmap_name, bitmap_number, inscription_id, price, buyer_address, seller_address, source, txid, sold_at, synced_at) VALUES (?,?,?,?,?,?,?,?,?,?)").run(
                  s.name || '', parseBitmapNumber(s.name), insId,
                  s.satoshi_price || 0, s.buyer_address || '', s.seller_address || '',
                  'ordinalswallet', '', parseCreatedTimestamp(s.bought_at), now
                );
              } catch (se) { console.error('[OW] Error inserting sale:', se.message); }
            }
          }
        }
      } catch (e) {
        console.error('[OW] Error fetching sold: ' + e.message);
      }
    }

    const floor = (dbOw.prepare("SELECT MIN(listedPrice) as p FROM ordinalswallet_cache WHERE bitmapId != '' AND listedPrice > 0").get() || {}).p || 0;
    const listed = (dbOw.prepare("SELECT COUNT(*) as c FROM ordinalswallet_cache WHERE bitmapId != ''").get() || {}).c || 0;

    dbOw.prepare("INSERT OR REPLACE INTO ordinalswallet_stats (key, value, updatedAt) VALUES ('floor_price',?,?)").run(floor, now);
    dbOw.prepare("INSERT OR REPLACE INTO ordinalswallet_stats (key, value, updatedAt) VALUES ('total_listed',?,?)").run(listed, now);
    dbOw.prepare("INSERT OR REPLACE INTO ordinalswallet_stats (key, value, updatedAt) VALUES ('last_poll_time',?,?)").run(now, now);

    const freshTs = (dbOw.prepare("SELECT MAX(listedAt) as m FROM ordinalswallet_cache").get() || {}).m || 0;
    if (freshTs > lastTs) {
      dbOw.prepare("INSERT OR REPLACE INTO ordinalswallet_stats (key, value, updatedAt) VALUES ('lastPollTimestamp',?,?)").run(freshTs, now);
    }

    console.error('[OW] Poll done: ' + totalSaved + ' nuevos, floor=' + floor + ', listed=' + listed);
    owLastPollTime = now;
  } catch (err) {
    console.error('[OW] FATAL: ' + err.message);
  }
  owPollingActive = false;
  pollUnified();
}

// Start polling on server startup
pollOrdinalswallet();
setInterval(pollOrdinalswallet, 300000);

// ===== UNISAT POLLING SERVICE + CACHE =====

let uniPollingActive = false;
let uniLastPollTime = 0;

async function pollUnisat() {
  if (uniPollingActive) return;
  if (!dbUnisat) return;
  uniPollingActive = true;
  try {
    console.error("[UNI] Starting incremental poll...");
    const now = Date.now();
    const API_KEY = process.env.UNISAT_API_KEY || "ba45937b36025672839241126a39e54b6826bdd8a87fa1946714096b55ed9b34";
    const headers = { "Content-Type": "application/json" };
    headers["Authorization"] = "Bearer " + API_KEY;
    const delay = (ms) => new Promise(r => setTimeout(r, ms));

    const lastTsRow = dbUnisat.prepare("SELECT value FROM unisat_stats WHERE key='lastPollTimestamp'").get();
    const lastTs = lastTsRow ? lastTsRow.value : 0;
    const isFirstSync = lastTs === 0;
    console.error("[UNI] lastTs=" + lastTs + ", isFirstSync=" + isFirstSync);

    const insertStmt = dbUnisat.prepare("INSERT OR REPLACE INTO unisat_cache (bitmapNumber, bitmapId, listedPrice, listedAt, ownerAddress, extraData, extraData2, timestamp, insertionOrder) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    let totalSaved = 0;
    let insertionOrder = (dbUnisat.prepare("SELECT MAX(insertionOrder) as m FROM unisat_cache").get()?.m || 0) + 1;
    let newLastTs = lastTs;

    for (const evt of ["Listed", "Sold", "Cancel"]) {
      console.error("[UNI] " + evt + " phase...");
      let start = 0;
      let hasMore = true;
      let pages = 0;

      while (hasMore) {
        try {
          const res = await axios.post("https://open-api.unisat.io/v3/market/collection/auction/actions", {
            filter: { collectionId: "bitmap", event: evt },
            sort: { timestamp: -1 }, start: start, limit: 400
          }, { headers, timeout: 15000 });

          const items = (res.data?.data?.list || []);
          pages++;

          if (evt === "Listed") {
            const newItems = isFirstSync ? items : items.filter(i => (i.timestamp || 0) > lastTs);
            if (!isFirstSync && newItems.length === 0 && items.length > 0) {
              console.error("[UNI] " + evt + " reached old items at page " + pages);
              hasMore = false;
              break;
            }
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
            console.error("[UNI] " + evt + " page " + pages + ": " + items.length + " total, " + newItems.length + " nuevos");
          } else {
            const newItems = isFirstSync ? items : items.filter(i => (i.timestamp || 0) > lastTs);
            if (!isFirstSync && newItems.length === 0 && items.length > 0) {
              hasMore = false;
              break;
            }
            for (const item of newItems) {
              const insId = item.inscriptionId || item.inscription_id || "";
              if (insId) dbUnisat.prepare("DELETE FROM unisat_cache WHERE bitmapId=?").run(insId);
              if (insId && evt === 'Sold' && dbSales) {
                try {
                  const soldName = item.collectionItemName || item.collection_item_name || '';
                  dbSales.prepare("INSERT INTO all_sales (bitmap_name, bitmap_number, inscription_id, price, buyer_address, seller_address, source, txid, sold_at, synced_at) VALUES (?,?,?,?,?,?,?,?,?,?)").run(
                    soldName, parseBitmapNumber(soldName), insId,
                    item.price || item.unitPrice || 0, item.to || '', item.from || '',
                    'unisat', item.txid || '', item.timestamp || now, now
                  );
                } catch (se) { console.error("[UNI] Error inserting sale:", se.message); }
              }
            }
            console.error("[UNI] " + evt + " page " + pages + ": " + items.length + " total, " + newItems.length + " nuevos");
          }

          if (!isFirstSync && items.length > 0) {
            const oldestTs = items[items.length - 1].timestamp || 0;
            if (oldestTs <= lastTs) {
              console.error("[UNI] " + evt + " stopping - reached old items");
              hasMore = false;
              break;
            }
          }

          hasMore = items.length === 400;
          start += 400;
          if (hasMore) await delay(2000);
        } catch (e) {
          console.error("[UNI] " + evt + " error page " + pages + ": " + e.message);
          hasMore = false;
        }
      }
      console.error("[UNI] " + evt + " done: " + pages + " pages");
    }

    const minRow = dbUnisat.prepare("SELECT MIN(listedPrice) as p FROM unisat_cache WHERE bitmapId != '' AND listedPrice > 0").get();
    const countRow = dbUnisat.prepare("SELECT COUNT(*) as c FROM unisat_cache WHERE bitmapId != ''").get();
    const floor = minRow?.p || 0;
    const listed = countRow?.c || 0;

    dbUnisat.prepare("INSERT OR REPLACE INTO unisat_stats (key, value, updatedAt) VALUES ('floor_price',?,?)").run(floor, now);
    dbUnisat.prepare("INSERT OR REPLACE INTO unisat_stats (key, value, updatedAt) VALUES ('total_listed',?,?)").run(listed, now);
    dbUnisat.prepare("INSERT OR REPLACE INTO unisat_stats (key, value, updatedAt) VALUES ('last_poll_time',?,?)").run(now, now);

    if (newLastTs > lastTs) {
      dbUnisat.prepare("INSERT OR REPLACE INTO unisat_stats (key, value, updatedAt) VALUES ('lastPollTimestamp',?,?)").run(newLastTs, now);
      console.error("[UNI] Timestamp updated: " + newLastTs);
    }

    console.error("[UNI] Poll done: " + totalSaved + " nuevos, floor=" + floor + ", listed=" + listed);
    uniLastPollTime = now;
  } catch (err) {
    console.error("[UNI] FATAL: " + err.message);
  }
  uniPollingActive = false;
  pollUnified();
}

pollUnisat();
setInterval(pollUnisat, 300000);

// ===== UNIFIED POLLING =====

async function pollUnified() {
  if (!dbUnified) return;
  if (!dbOw || !dbUnisat) return;
  try {
    console.error('[UNIFIED] Starting merge...');
    const now = Date.now();

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
      console.error('[UNIFIED] First sync - re-building entire table...');
      dbUnified.prepare("DELETE FROM unified_listings").run();

      const owRows = dbOw.prepare("SELECT * FROM ordinalswallet_cache WHERE bitmapId != ''").all();
      for (const row of owRows) {
        insertStmt.run(row.bitmapNumber, row.bitmapId, row.listedPrice, row.listedAt,
          row.ownerAddress, row.extraData, row.extraData2, row.timestamp, insertionOrder++, 'ordinalswallet');
        total++;
      }

      const uniRows = dbUnisat.prepare("SELECT * FROM unisat_cache WHERE bitmapId != ''").all();
      for (const row of uniRows) {
        insertStmt.run(row.bitmapNumber, row.bitmapId, row.listedPrice, row.listedAt,
          row.ownerAddress, row.extraData, row.extraData2, row.timestamp, insertionOrder++, 'unisat');
        total++;
      }

      try {
        const path = require('path');
        const Database = require('better-sqlite3');
        const dbLocal = new Database(path.join(__dirname, '..', 'bitmapcore-server', 'data', 'bitmapcorp.db'), { readonly: true });
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
      console.error('[UNIFIED] Incremental sync...');

      const owNew = dbOw.prepare("SELECT * FROM ordinalswallet_cache WHERE bitmapId != '' AND listedAt > ?").all(lastTs);
      for (const row of owNew) {
        insertStmt.run(row.bitmapNumber, row.bitmapId, row.listedPrice, row.listedAt,
          row.ownerAddress, row.extraData, row.extraData2, row.timestamp, insertionOrder++, 'ordinalswallet');
        total++;
      }

      const uniNew = dbUnisat.prepare("SELECT * FROM unisat_cache WHERE bitmapId != '' AND listedAt > ?").all(lastTs);
      for (const row of uniNew) {
        insertStmt.run(row.bitmapNumber, row.bitmapId, row.listedPrice, row.listedAt,
          row.ownerAddress, row.extraData, row.extraData2, row.timestamp, insertionOrder++, 'unisat');
        total++;
      }

      try {
        const path = require('path');
        const Database = require('better-sqlite3');
        const dbLocal = new Database(path.join(__dirname, '..', 'bitmapcore-server', 'data', 'bitmapcorp.db'), { readonly: true });
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

    const minRow = dbUnified.prepare("SELECT MIN(listedPrice) as p FROM unified_listings WHERE listedPrice > 0").get();
    const countRow = dbUnified.prepare("SELECT COUNT(*) as c FROM unified_listings").get();

    dbUnified.prepare("INSERT OR REPLACE INTO unified_stats (key, value, updatedAt) VALUES ('floor_price',?,?)").run(minRow?.p || 0, now);
    dbUnified.prepare("INSERT OR REPLACE INTO unified_stats (key, value, updatedAt) VALUES ('total_listed',?,?)").run(countRow?.c || 0, now);
    dbUnified.prepare("INSERT OR REPLACE INTO unified_stats (key, value, updatedAt) VALUES ('last_poll_time',?,?)").run(now, now);

    const freshTs = Math.max(
      (dbOw.prepare("SELECT MAX(listedAt) as m FROM ordinalswallet_cache").get() || {}).m || 0,
      (dbUnisat.prepare("SELECT MAX(listedAt) as m FROM unisat_cache").get() || {}).m || 0
    );
    if (freshTs > lastTs) {
      dbUnified.prepare("INSERT OR REPLACE INTO unified_stats (key, value, updatedAt) VALUES ('lastPollTimestamp',?,?)").run(freshTs, now);
    }

    if (!isFirstSync) {
      try {
        const owIds = dbOw.prepare("SELECT bitmapId FROM ordinalswallet_cache WHERE bitmapId != ''").all().map(r => r.bitmapId);
        const uniIds = dbUnisat.prepare("SELECT bitmapId FROM unisat_cache WHERE bitmapId != ''").all().map(r => r.bitmapId);

        if (owIds.length > 0) {
          const placeholders = owIds.map(() => '?').join(',');
          const deletedOW = dbUnified.prepare("DELETE FROM unified_listings WHERE source='ordinalswallet' AND bitmapId NOT IN (" + placeholders + ")").run(...owIds);
          console.error('[UNIFIED] Cleaned stale OW: ' + deletedOW.changes);
        }
        if (uniIds.length > 0) {
          const placeholders = uniIds.map(() => '?').join(',');
          const deletedUNI = dbUnified.prepare("DELETE FROM unified_listings WHERE source='unisat' AND bitmapId NOT IN (" + placeholders + ")").run(...uniIds);
          console.error('[UNIFIED] Cleaned stale UNI: ' + deletedUNI.changes);
        }
      } catch (e) {
        console.error('[UNIFIED] Error cleaning stale:', e.message);
      }
    }

    if (dbSales) {
      try {
        const path = require('path');
        const Database = require('better-sqlite3');
        const dbLocal = new Database(path.join(__dirname, '..', 'bitmapcore-server', 'data', 'bitmapcorp.db'), { readonly: true });
        const localVentas = dbLocal.prepare("SELECT * FROM ventas_historial WHERE sold_at > ?").all(lastTs);
        const insertSale = dbSales.prepare("INSERT INTO all_sales (bitmap_name, bitmap_number, inscription_id, price, buyer_address, seller_address, source, txid, sold_at, synced_at) VALUES (?,?,?,?,?,?,?,?,?,?)");
        for (const v of localVentas) {
          try {
            insertSale.run(v.name || '', v.bitmap_number || 0, v.inscription_id || '',
              v.price || 0, v.buyer_address || '', v.seller_address || '',
              'local', v.txid || '', v.sold_at || 0, now);
          } catch (se) { /* duplicate or error, skip */ }
        }
        dbLocal.close();
        if (localVentas.length > 0) console.error('[UNIFIED] Synced ' + localVentas.length + ' local sales to all_sales');
      } catch (e) {
        console.error('[UNIFIED] Error syncing local sales:', e.message);
      }

      try {
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
        const cleaned = dbSales.prepare("DELETE FROM all_sales WHERE sold_at < ?").run(thirtyDaysAgo);
        if (cleaned.changes > 0) console.error('[SALES] Cleaned ' + cleaned.changes + ' old records (>30 days)');
      } catch (e) { /* ignore */ }
    }

    console.error('[UNIFIED] Merge done: ' + total + ' nuevos, total=' + (countRow?.c || 0) + ', floor=' + (minRow?.p || 0));
  } catch (err) {
    console.error('[UNIFIED] Error:', err.message);
  }
}

setInterval(pollUnified, 305000);

// ===== ENDPOINTS DE CACHE UNIFIED =====

app.get('/api/v1/unified/cache/listings', (req, res) => {
  if (!dbUnified) return sendSuccess(res, []);
  try {
    const sortBy = req.query.sort || 'listedAtDesc';
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 100;
    let orderBy;
    if (sortBy === 'priceDesc') orderBy = 'ul.listedPrice DESC, ul.listedAt DESC';
    else if (sortBy === 'priceAsc') orderBy = 'ul.listedPrice ASC, ul.listedAt DESC';
    else orderBy = 'ul.listedAt DESC, ul.insertionOrder DESC';

    const mainDbPath = path.join(__dirname, 'data/bitmapcorp_database.db');
    try { dbUnified.prepare('ATTACH DATABASE ? AS maindb').run(mainDbPath); } catch (e) {}

    let rows;
    if (tableExists('blocks')) {
      rows = dbUnified.prepare(`
        SELECT ul.*, b.hash, b.etiquetas, b.totalTransacciones, b.totalBtc
        FROM unified_listings ul
        LEFT JOIN maindb.blocks b ON ul.bitmapNumber = b.bloque
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `).all(limit, offset);
    } else {
      rows = dbUnified.prepare("SELECT * FROM unified_listings ORDER BY " + orderBy.replace(/ul\./g, '') + " LIMIT ? OFFSET ?").all(limit, offset);
    }

    sendSuccess(res, rows);
  } catch (err) {
    sendError(res, err.message);
  }
});

app.get('/api/v1/unified/cache/stats', (req, res) => {
  if (!dbUnified) return sendSuccess(res, { floorPrice: 0, totalListed: 0 });
  try {
    const floor = (dbUnified.prepare("SELECT value FROM unified_stats WHERE key='floor_price'").get() || {}).value || 0;
    const listed = (dbUnified.prepare("SELECT value FROM unified_stats WHERE key='total_listed'").get() || {}).value || 0;
    sendSuccess(res, { floorPrice: floor, totalListed: listed });
  } catch (err) {
    sendError(res, err.message);
  }
});

app.get('/api/v1/unified/cache/last-update', (req, res) => {
  if (!dbUnified) return sendSuccess(res, { lastUpdate: 0 });
  try {
    const row = dbUnified.prepare("SELECT value FROM unified_stats WHERE key='last_poll_time'").get();
    sendSuccess(res, { lastUpdate: row ? row.value : 0 });
  } catch (err) { sendError(res, err.message); }
});

app.get('/api/v1/unified/cache/count', (req, res) => {
  if (!dbUnified) return sendSuccess(res, { count: 0 });
  try {
    const row = dbUnified.prepare("SELECT COUNT(*) as c FROM unified_listings").get();
    sendSuccess(res, { count: row ? row.c : 0 });
  } catch (err) { sendError(res, err.message); }
});


// ===== ENDPOINTS DE CACHE ORDINALSWALLET =====

app.get('/api/v1/ordinalswallet/cache/listings', (req, res) => {
  if (!dbOw) return sendSuccess(res, []);
  try {
    const sortBy = req.query.sort || 'listedAtDesc';
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 100;
    let orderBy;
    if (sortBy === 'priceDesc') {
      orderBy = 'oc.listedPrice DESC, oc.listedAt DESC';
    } else if (sortBy === 'priceAsc') {
      orderBy = 'oc.listedPrice ASC, oc.listedAt DESC';
    } else {
      orderBy = 'oc.listedAt DESC, oc.insertionOrder DESC';
    }

    const mainDbPath = path.join(__dirname, 'data/bitmapcorp_database.db');
    try { dbOw.prepare('ATTACH DATABASE ? AS maindb').run(mainDbPath); } catch (e) { /* already attached */ }

    let rows;
    if (tableExists('blocks')) {
      rows = dbOw.prepare(`
        SELECT oc.*, b.hash, b.etiquetas, b.totalTransacciones, b.totalBtc
        FROM ordinalswallet_cache oc
        LEFT JOIN maindb.blocks b ON oc.bitmapNumber = b.bloque
        WHERE oc.bitmapId != ''
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `).all(limit, offset);
    } else {
      rows = dbOw.prepare("SELECT * FROM ordinalswallet_cache WHERE bitmapId != '' ORDER BY " + orderBy.replace(/oc\./g, '') + " LIMIT ? OFFSET ?").all(limit, offset);
    }

    sendSuccess(res, rows);
  } catch (err) {
    sendError(res, err.message);
  }
});

app.get('/api/v1/ordinalswallet/cache/stats', (req, res) => {
  if (!dbOw) return sendSuccess(res, { floorPrice: 0, totalListed: 0 });
  try {
    const floor = (dbOw.prepare("SELECT value FROM ordinalswallet_stats WHERE key='floor_price'").get() || {}).value || 0;
    const listed = (dbOw.prepare("SELECT value FROM ordinalswallet_stats WHERE key='total_listed'").get() || {}).value || 0;
    sendSuccess(res, { floorPrice: floor, totalListed: listed });
  } catch (err) {
    sendError(res, err.message);
  }
});

app.get('/api/v1/ordinalswallet/cache/last-update', (req, res) => {
  if (!dbOw) return sendSuccess(res, { lastUpdate: 0 });
  try {
    const row = dbOw.prepare("SELECT value FROM ordinalswallet_stats WHERE key='last_poll_time'").get();
    sendSuccess(res, { lastUpdate: row ? row.value : 0 });
  } catch (err) {
    sendError(res, err.message);
  }
});

app.get('/api/v1/ordinalswallet/cache/count', (req, res) => {
  if (!dbOw) return sendSuccess(res, { count: 0 });
  try {
    const row = dbOw.prepare("SELECT COUNT(*) as c FROM ordinalswallet_cache WHERE bitmapId != ''").get();
    sendSuccess(res, { count: row ? row.c : 0 });
  } catch (err) {
    sendError(res, err.message);
  }
});

// ===== ENDPOINTS DE CACHE UNISAT =====

app.get('/api/v1/unisat/cache/listings', (req, res) => {
  if (!dbUnisat) return sendSuccess(res, []);
  try {
    const sortBy = req.query.sort || 'listedAtDesc';
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 100;
    let orderBy;
    if (sortBy === 'priceDesc') {
      orderBy = 'uc.listedPrice DESC, uc.listedAt DESC';
    } else if (sortBy === 'priceAsc') {
      orderBy = 'uc.listedPrice ASC, uc.listedAt DESC';
    } else {
      orderBy = 'uc.listedAt DESC, uc.insertionOrder DESC';
    }

    const mainDbPath = path.join(__dirname, 'data/bitmapcorp_database.db');
    try { dbUnisat.prepare('ATTACH DATABASE ? AS maindb').run(mainDbPath); } catch (e) { /* already attached */ }

    let rows;
    if (tableExists('blocks')) {
      rows = dbUnisat.prepare(`
        SELECT uc.*, b.hash, b.etiquetas, b.totalTransacciones, b.totalBtc
        FROM unisat_cache uc
        LEFT JOIN maindb.blocks b ON uc.bitmapNumber = b.bloque
        WHERE uc.bitmapId != ''
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `).all(limit, offset);
    } else {
      rows = dbUnisat.prepare("SELECT * FROM unisat_cache WHERE bitmapId != '' ORDER BY " + orderBy.replace(/uc\./g, '') + " LIMIT ? OFFSET ?").all(limit, offset);
    }

    sendSuccess(res, rows);
  } catch (err) {
    sendError(res, err.message);
  }
});

app.get('/api/v1/unisat/cache/stats', (req, res) => {
  if (!dbUnisat) return sendSuccess(res, { floorPrice: 0, totalListed: 0 });
  try {
    const floor = (dbUnisat.prepare("SELECT value FROM unisat_stats WHERE key='floor_price'").get() || {}).value || 0;
    const listed = (dbUnisat.prepare("SELECT value FROM unisat_stats WHERE key='total_listed'").get() || {}).value || 0;
    sendSuccess(res, { floorPrice: floor, totalListed: listed });
  } catch (err) {
    sendError(res, err.message);
  }
});

app.get('/api/v1/unisat/cache/last-update', (req, res) => {
  if (!dbUnisat) return sendSuccess(res, { lastUpdate: 0 });
  try {
    const row = dbUnisat.prepare("SELECT value FROM unisat_stats WHERE key='last_poll_time'").get();
    sendSuccess(res, { lastUpdate: row ? row.value : 0 });
  } catch (err) {
    sendError(res, err.message);
  }
});

app.get('/api/v1/unisat/cache/count', (req, res) => {
  if (!dbUnisat) return sendSuccess(res, { count: 0 });
  try {
    const row = dbUnisat.prepare("SELECT COUNT(*) as c FROM unisat_cache WHERE bitmapId != ''").get();
    sendSuccess(res, { count: row ? row.c : 0 });
  } catch (err) {
    sendError(res, err.message);
  }
});

// ===== SELECTOR SCREEN =====
app.get('/api/v1/selector/previews', (req, res) => {
  if (!db) return sendSuccess(res, []);
  try {
    let items = [];
    if (tableExists('selector_previews')) {
      items = db.prepare('SELECT * FROM selector_previews ORDER BY bubbleType, sortOrder').all();
    }
    sendSuccess(res, items);
  } catch (err) {
    sendError(res, err.message);
  }
});

app.get('/api/v1/selector/stats', (req, res) => {
  if (!db) return sendSuccess(res, []);
  try {
    let items = [];
    if (tableExists('selector_bubble_stats')) {
      items = db.prepare('SELECT * FROM selector_bubble_stats').all();
    }
    sendSuccess(res, items);
  } catch (err) {
    sendError(res, err.message);
  }
});

// ===== DB INFO =====
app.get('/api/v1/db/tables', (req, res) => {
  const tables = getTableNames();
  sendSuccess(res, tables);
});

// ===== HEALTH =====
app.get('/api/v1/health', (req, res) => {
  sendSuccess(res, {
    status: 'ok',
    port: PORT,
    database: db ? 'connected' : 'not connected',
    ordinalswalletCache: dbOw ? 'connected' : 'not connected',
    unisatCache: dbUnisat ? 'connected' : 'not connected',
    unifiedCache: dbUnified ? 'connected' : 'not connected',
    tables: getTableNames(),
    owPollingActive: owPollingActive,
    owLastPollTime: owLastPollTime,
    uniPollingActive: uniPollingActive,
    uniLastPollTime: uniLastPollTime
  });
});

// ===== BLOCK IMAGES =====
app.get('/api/v1/block-image/:blockNumber', (req, res) => {
  try {
    const blockNumber = parseInt(req.params.blockNumber);
    const size = parseInt(req.query.size) || 80;
    const etiquetas = req.query.etiquetas || '';
    const tx = parseInt(req.query.tx) || 0;
    const hash = req.query.hash || '';
    const perfect = req.query.perfect === 'true';
    const punk = req.query.punk === 'true';

    const cryptoModule = require('crypto');
    const optsHash = cryptoModule.createHash('md5')
      .update(etiquetas + '|' + tx + '|' + (perfect ? 1 : 0) + '|' + (punk ? 1 : 0) + '|' + hash)
      .digest('hex');

    if (!dbOw) return res.status(503).send('DB not ready');

    const row = dbOw.prepare(
      'SELECT image_data FROM block_images WHERE block_number=? AND size=? AND options_hash=?'
    ).get(blockNumber, size, optsHash);

    if (row) {
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
      return res.send(row.image_data);
    }

    // Generate on the fly if not cached
    const { createCanvas } = require('canvas');
    const MondrianGenerator = require('./utils-mondrian');
    const canvas = createCanvas(size, size);
    MondrianGenerator.generate(canvas, blockNumber, {
      totalTransactions: tx,
      hash: hash,
      etiquetas: etiquetas,
      isPerfect: perfect,
      isPunk: punk
    }, size);

    const png = canvas.toBuffer('image/png');
    dbOw.prepare('INSERT OR REPLACE INTO block_images VALUES (?,?,?,?,CURRENT_TIMESTAMP)')
        .run(blockNumber, size, optsHash, png);

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(png);
  } catch(err) {
    res.status(500).send('Internal error');
  }
});

// ===== SPA CATCH-ALL =====
app.use(function(req, res) {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('BitmapCore Web running on port ' + PORT);
  console.log('Database tables:', getTableNames().join(', ') || 'none');
  console.log('Ordinalswallet cache:', dbOw ? 'connected' : 'not connected');
});
