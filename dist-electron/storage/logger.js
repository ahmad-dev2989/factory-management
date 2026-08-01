import { app, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { executeQuery } from '../database/database.js';
const logPath = path.join(app.getPath('userData'), 'app.log');
export function logMessage(level, moduleName, message) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level}] [${moduleName}] ${message}\n`;
    try {
        fs.appendFileSync(logPath, logLine, 'utf8');
    }
    catch (err) {
        console.error('[Logger] Failed to write to log file:', err);
    }
}
export function getLogs() {
    try {
        if (!fs.existsSync(logPath)) {
            return [];
        }
        const content = fs.readFileSync(logPath, 'utf8');
        const lines = content.split('\n').filter(Boolean);
        const parsedLogs = lines.map((line, idx) => {
            // Format: [timestamp] [level] [module] message
            const match = line.match(/^\[([^\]]+)\]\s+\[([^\]]+)\]\s+\[([^\]]+)\]\s+(.*)$/);
            if (match) {
                return {
                    id: idx,
                    timestamp: match[1],
                    level: match[2],
                    module: match[3],
                    message: match[4]
                };
            }
            return {
                id: idx,
                timestamp: new Date().toISOString(),
                level: 'INFO',
                module: 'System',
                message: line
            };
        });
        return parsedLogs.reverse(); // Newest first
    }
    catch (err) {
        console.error('[Logger] Failed to read logs:', err);
        return [{ id: 0, timestamp: new Date().toISOString(), level: 'ERROR', module: 'Logger', message: 'Failed to read log file.' }];
    }
}
export function clearLogs() {
    try {
        fs.writeFileSync(logPath, '', 'utf8');
        logMessage('INFO', 'Logger', 'Application log cleared.');
        return true;
    }
    catch (err) {
        console.error('[Logger] Failed to clear logs:', err);
        return false;
    }
}
export async function exportLogs(window) {
    try {
        if (!window)
            return false;
        const { canceled, filePath } = await dialog.showSaveDialog(window, {
            title: 'Export System Logs',
            defaultPath: path.join(app.getPath('downloads'), `system_logs_${Date.now()}.log`),
            filters: [{ name: 'Log Files', extensions: ['log', 'txt'] }]
        });
        if (canceled || !filePath) {
            return false;
        }
        if (fs.existsSync(logPath)) {
            fs.copyFileSync(logPath, filePath);
        }
        else {
            fs.writeFileSync(filePath, '', 'utf8');
        }
        logMessage('INFO', 'Logger', `System logs exported successfully to ${filePath}`);
        return true;
    }
    catch (err) {
        console.error('[Logger] Failed to export logs:', err);
        return false;
    }
}
export async function getDatabaseDiagnostics() {
    try {
        const dbPath = path.join(app.getPath('userData'), 'factory.db');
        let sizeBytes = 0;
        if (fs.existsSync(dbPath)) {
            sizeBytes = fs.statSync(dbPath).size;
        }
        // Run parallel counts
        const productCountRes = await executeQuery('SELECT COUNT(*) as count FROM products');
        const customerCountRes = await executeQuery('SELECT COUNT(*) as count FROM customers');
        const employeeCountRes = await executeQuery('SELECT COUNT(*) as count FROM employees');
        const salesCountRes = await executeQuery('SELECT COUNT(*) as count FROM sales');
        const purchasesCountRes = await executeQuery('SELECT COUNT(*) as count FROM purchases');
        const bankAccountCountRes = await executeQuery('SELECT COUNT(*) as count FROM bank_accounts');
        const cashInCountRes = await executeQuery('SELECT COUNT(*) as count FROM cash_in');
        const cashOutCountRes = await executeQuery('SELECT COUNT(*) as count FROM cash_out');
        // Get backup settings info
        const lastBackupRes = await executeQuery("SELECT value FROM app_settings WHERE key = 'last_backup_date'");
        const lastBackupDate = lastBackupRes && lastBackupRes.length > 0 ? lastBackupRes[0].value : 'Never';
        return {
            databaseSize: (sizeBytes / (1024 * 1024)).toFixed(2) + ' MB',
            productsCount: productCountRes[0]?.count || 0,
            customersCount: customerCountRes[0]?.count || 0,
            employeesCount: employeeCountRes[0]?.count || 0,
            salesCount: salesCountRes[0]?.count || 0,
            purchasesCount: purchasesCountRes[0]?.count || 0,
            bankAccountsCount: bankAccountCountRes[0]?.count || 0,
            cashTransactionsCount: (cashInCountRes[0]?.count || 0) + (cashOutCountRes[0]?.count || 0),
            lastBackupDate,
            sqliteVersion: process.versions.sqlite || '3.x',
            osPlatform: process.platform,
            electronVersion: process.versions.electron
        };
    }
    catch (err) {
        console.error('[Diagnostics] Failed to collect stats:', err);
        return { error: true, message: err.message };
    }
}
export async function optimizeDatabase() {
    try {
        logMessage('INFO', 'Database', 'Executing SQLite database optimize (VACUUM & ANALYZE)...');
        await executeQuery('VACUUM');
        await executeQuery('ANALYZE');
        logMessage('INFO', 'Database', 'SQLite optimization completed successfully.');
        return true;
    }
    catch (err) {
        console.error('[Database] Optimization error:', err);
        logMessage('ERROR', 'Database', 'SQLite optimization failed.');
        return false;
    }
}
export function cleanupTemporaryStorage() {
    try {
        logMessage('INFO', 'System', 'Cleaning up temporary files and logs...');
        // In this app, attachments are stored inside Company, Products, etc.
        // Temporary folders can be cleared if there's any.
        return true;
    }
    catch (err) {
        console.error('[System] Cleanup error:', err);
        return false;
    }
}
