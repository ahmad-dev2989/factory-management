import { contextBridge, ipcRenderer } from 'electron';
// Expose secure API bridge for future local features (SQLite, local storage, printing)
contextBridge.exposeInMainWorld('electron', {
    send: (channel, data) => {
        ipcRenderer.send(channel, data);
    },
    on: (channel, func) => {
        const subscription = (_event, ...args) => func(...args);
        ipcRenderer.on(channel, subscription);
        return () => {
            ipcRenderer.removeListener(channel, subscription);
        };
    },
    invoke: (channel, ...args) => {
        return ipcRenderer.invoke(channel, ...args);
    }
});
