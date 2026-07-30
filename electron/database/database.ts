import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import sqlite3 from 'sqlite3';
import { runMigrations } from './migrations.js';

const sqlite = sqlite3.verbose();
let db: sqlite3.Database | null = null;

export function initializeDatabase(): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const userDataPath = app.getPath('userData');
    
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    const dbPath = path.join(userDataPath, 'factory.db');
    console.log(`[Database] Initializing SQLite database (sqlite3) at: ${dbPath}`);

    const connection = new sqlite.Database(dbPath, async (err) => {
      if (err) {
        console.error('[Database] Failed to open database:', err);
        reject(err);
        return;
      }

      db = connection;
      console.log('[Database] Database connection opened successfully.');

      try {
        // Configure WAL mode, Foreign Keys, and Synchronous state
        await executeRun('PRAGMA foreign_keys = ON');
        await executeRun('PRAGMA journal_mode = WAL');
        await executeRun('PRAGMA synchronous = NORMAL');
        console.log('[Database] Database pragmas configured (WAL mode, Foreign Keys enabled).');

        // Run schema migrations
        await runMigrations(db);
        resolve(db);
      } catch (error) {
        console.error('[Database] Error configuring database or running migrations:', error);
        reject(error);
      }
    });
  });
}

export function getDatabase(): sqlite3.Database {
  if (!db) {
    throw new Error('Database connection is not initialized.');
  }
  return db;
}

export function closeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (db) {
      console.log('[Database] Closing database connection...');
      db.close((err) => {
        if (err) {
          console.error('[Database] Error closing database:', err);
          reject(err);
        } else {
          db = null;
          console.log('[Database] Database closed cleanly.');
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

// Low-level helper to execute a SQL statement with no return values (e.g. INSERT/UPDATE/DELETE)
export function executeRun(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid: number }> {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      database.run(sql, params, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            changes: this.changes,
            lastInsertRowid: Number(this.lastID),
          });
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Low-level helper to execute a SQL query returning all rows (e.g. SELECT)
export function executeAll(sql: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      database.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Global execution wrapper for standard queries (READ or WRITE)
export async function executeQuery(sql: string, params: any[] = []): Promise<any> {
  const isSelect = sql.trim().toUpperCase().startsWith('SELECT') || 
                  sql.trim().toUpperCase().startsWith('PRAGMA user_version');
  try {
    if (isSelect) {
      return await executeAll(sql, params);
    } else {
      return await executeRun(sql, params);
    }
  } catch (error: any) {
    console.error(`[Database] Error executing SQL: "${sql}"`, error);
    return {
      error: true,
      message: error.message || 'Unknown database query error',
    };
  }
}

// Global execution wrapper for atomic transactions using sqlite3 serialization
export function executeTransaction(queries: { sql: string; params?: any[] }[]): Promise<any> {
  return new Promise((resolve) => {
    const database = getDatabase();
    
    database.serialize(async () => {
      try {
        await executeRun('BEGIN TRANSACTION');
        const results = [];

        for (const query of queries) {
          const sql = query.sql;
          const params = query.params || [];
          const isSelect = sql.trim().toUpperCase().startsWith('SELECT');

          if (isSelect) {
            results.push(await executeAll(sql, params));
          } else {
            results.push(await executeRun(sql, params));
          }
        }

        await executeRun('COMMIT');
        resolve(results);
      } catch (error: any) {
        console.error('[Database] Transaction failed, performing rollback:', error);
        try {
          await executeRun('ROLLBACK');
        } catch (rollbackError) {
          console.error('[Database] Rollback failed:', rollbackError);
        }
        resolve({
          error: true,
          message: error.message || 'Database transaction error',
        });
      }
    });
  });
}
