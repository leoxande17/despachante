// src/main/services/database.js
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const CryptoJS = require('crypto-js');
const { SCHEMA_SQL } = require('./schema');

const DB_VERSION = 1;
const ENCRYPTION_KEY = 'despachapr_2024_secure_key_local';

let db = null;

const createDbWrapper = (rawDb, dbPath) => {
  const save = () => {
    const data = rawDb.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  };

  return {
    exec(sql) {
      return rawDb.exec(sql);
    },
    prepare(sql) {
      const stmt = rawDb.prepare(sql);
      return {
        get(...params) {
          stmt.bind(params.map(p => p === undefined ? null : p));
          const hasRow = stmt.step();
          const row = hasRow ? stmt.getAsObject() : undefined;
          stmt.reset();
          return row;
        },
        all(...params) {
          stmt.bind(params.map(p => p === undefined ? null : p));
          const rows = [];
          while (stmt.step()) {
            rows.push(stmt.getAsObject());
          }
          stmt.reset();
          return rows;
        },
        run(...params) {
          stmt.bind(params.map(p => p === undefined ? null : p));
          stmt.step();
          stmt.reset();
          save();
          return this;
        },
        raw() {
          return stmt;
        }
      };
    },
    close() {
      save();
      rawDb.close();
    }
  };
};

const DatabaseService = {
  async initialize() {
    const userDataPath = app.getPath('userData');
    const dbDir = path.join(userDataPath, 'data');

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const dbPath = path.join(dbDir, 'despachapr.db');
    const SQL = await initSqlJs();
    const fileBuffer = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : undefined;
    const rawDb = new SQL.Database(fileBuffer);

    db = createDbWrapper(rawDb, dbPath);

    db.exec('PRAGMA foreign_keys = ON;');
    db.exec('PRAGMA synchronous = NORMAL;');
    db.exec('PRAGMA cache_size = 10000;');

    await this.runMigrations();
    return db;
  },

  getDB() {
    return db;
  },

  close() {
    if (db) db.close();
  },

  async runMigrations() {
    // Criar tabela de versões
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TEXT DEFAULT (datetime('now'))
      )
    `);

    const currentVersion = db.prepare('SELECT MAX(version) as v FROM schema_version').get()?.v || 0;
    
    if (currentVersion < 1) {
      await this.migration_v1();
      db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(1);
    }

    if (currentVersion < 2) {
      await this.migration_v2();
      db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(2);
    }
  },

  async migration_v1() {
    db.exec(SCHEMA_SQL);
  },

  async migration_v2() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS cliente_veiculos (
        id TEXT PRIMARY KEY,
        cliente_id TEXT NOT NULL,
        marca TEXT,
        modelo TEXT,
        placa TEXT,
        renavam TEXT,
        criado_em TEXT DEFAULT (datetime('now')),
        atualizado_em TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (cliente_id) REFERENCES clientes(id)
      );

      CREATE INDEX IF NOT EXISTS idx_cliente_veiculos_cliente ON cliente_veiculos(cliente_id);
      CREATE INDEX IF NOT EXISTS idx_cliente_veiculos_placa ON cliente_veiculos(placa);
      CREATE INDEX IF NOT EXISTS idx_documentos_cliente ON documentos(cliente_id);
    `);
  },

  backup(outputPath) {
    const archiver = require('archiver');
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'data', 'despachapr.db');
    const docsPath = path.join(userDataPath, 'documentos');

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve({ success: true, size: archive.pointer() }));
      archive.on('error', reject);

      archive.pipe(output);
      archive.file(dbPath, { name: 'despachapr.db' });
      if (fs.existsSync(docsPath)) {
        archive.directory(docsPath, 'documentos');
      }
      archive.finalize();
    });
  },
};

module.exports = DatabaseService;
