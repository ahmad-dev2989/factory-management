import { ipcMain } from 'electron';
import { executeQuery, executeTransaction } from './database.js';

export function registerDatabaseIPCHandlers(): void {
  // IPC Handler for executing standard queries
  ipcMain.handle('db-query', async (_event, sql: string, params: any[] = []) => {
    return await executeQuery(sql, params);
  });

  // IPC Handler for executing transaction sequences
  ipcMain.handle('db-transaction', async (_event, queries: { sql: string; params?: any[] }[]) => {
    return await executeTransaction(queries);
  });
}
