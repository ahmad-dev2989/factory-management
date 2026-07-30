import { ipcMain } from 'electron';
import { executeQuery, executeTransaction } from './database.js';
export function registerDatabaseIPCHandlers() {
    // IPC Handler for executing standard queries
    ipcMain.handle('db-query', async (_event, sql, params = []) => {
        return await executeQuery(sql, params);
    });
    // IPC Handler for executing transaction sequences
    ipcMain.handle('db-transaction', async (_event, queries) => {
        return await executeTransaction(queries);
    });
}
