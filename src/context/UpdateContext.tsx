import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes: string;
  fileSize: string;
  isSkipped: boolean;
}

export interface UpdateContextType {
  isChecking: boolean;
  updateAvailable: boolean;
  updateInfo: UpdateInfo | null;
  isDialogVisible: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  downloadSpeed: string;
  downloadRemaining: string;
  updateError: string;
  statusMessage: string;
  currentVersion: string;
  checkForUpdates: () => Promise<void>;
  downloadAndInstall: () => Promise<void>;
  dismissDialog: (type: 'remind' | 'skip') => Promise<void>;
  openDialog: () => void;
}

const UpdateContext = createContext<UpdateContextType | undefined>(undefined);

export function useUpdate() {
  const context = useContext(UpdateContext);
  if (!context) {
    throw new Error('useUpdate must be used within an UpdateProvider');
  }
  return context;
}

interface UpdateProviderProps {
  children: ReactNode;
}

export function UpdateProvider({ children }: UpdateProviderProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isDialogVisible, setIsDialogVisible] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState('');
  const [downloadRemaining, setDownloadRemaining] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [currentVersion, setCurrentVersion] = useState('0.0.0');

  // Load current version on mount
  useEffect(() => {
    if ((window as any).electron) {
      (window as any).electron
        .invoke('get-app-version')
        .then((v: string) => setCurrentVersion(v || '1.0.0'))
        .catch((err: any) => console.error('[UpdateContext] Failed to get app version:', err));
    }
  }, []);

  // Perform update check
  const checkForUpdates = async () => {
    if (!(window as any).electron) {
      setIsChecking(false);
      return;
    }

    setIsChecking(true);
    setUpdateError('');
    try {
      console.log('[UpdateContext] Triggering update check IPC...');
      const res = await (window as any).electron.invoke('update-check');
      if (res && res.updateAvailable) {
        console.log('[UpdateContext] Update found:', res);
        setUpdateInfo({
          version: res.version,
          releaseDate: res.releaseDate,
          releaseNotes: res.releaseNotes,
          fileSize: res.fileSize,
          isSkipped: !!res.isSkipped,
        });
        setUpdateAvailable(true);

        // Auto-show dialog ONLY if it hasn't been skipped in the database
        if (!res.isSkipped) {
          setIsDialogVisible(true);
        }
      } else {
        console.log('[UpdateContext] No update available.');
        setUpdateAvailable(false);
        setUpdateInfo(null);
      }
    } catch (err: any) {
      console.error('[UpdateContext] Failed to check for updates:', err);
    } finally {
      setIsChecking(false);
    }
  };

  // Run on startup and schedule every 30 minutes
  useEffect(() => {
    checkForUpdates();

    // 30 minutes in milliseconds (30 * 60 * 1000)
    const intervalId = setInterval(() => {
      console.log('[UpdateContext] Running periodic 30-minute update check...');
      checkForUpdates();
    }, 30 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Set up download progress IPC listeners from electron main process
  useEffect(() => {
    if (!(window as any).electron) return;

    const handleUpdateProgress = (data: { percent: number; speed: string; remaining: string }) => {
      setDownloadProgress(data.percent);
      setDownloadSpeed(data.speed);
      setDownloadRemaining(data.remaining);
    };

    const handleUpdateState = (state: string) => {
      if (state === 'installing') {
        setStatusMessage('Installing Update...');
      } else if (state === 'restarting') {
        setStatusMessage('Restarting Application...');
      }
    };

    const handleUpdateError = (errorText: string) => {
      setUpdateError(errorText);
      setIsDownloading(false);
      // Automatically close download screen after 4 seconds
      setTimeout(() => {
        setUpdateError('');
      }, 4000);
    };

    const unsubProgress = (window as any).electron.on('update-progress', handleUpdateProgress);
    const unsubState = (window as any).electron.on('update-state', handleUpdateState);
    const unsubError = (window as any).electron.on('update-error', handleUpdateError);

    return () => {
      if (unsubProgress) unsubProgress();
      if (unsubState) unsubState();
      if (unsubError) unsubError();
    };
  }, []);

  const downloadAndInstall = async () => {
    if (!(window as any).electron || !updateInfo) return;

    setIsDownloading(true);
    setIsDialogVisible(false);
    setUpdateError('');
    setStatusMessage('Downloading Update...');
    setDownloadProgress(0);

    try {
      await (window as any).electron.invoke('update-download');
    } catch (err: any) {
      console.error('[UpdateContext] Failed to download update:', err);
      setUpdateError(err.message || 'Failed to download update.');
      setIsDownloading(false);
    }
  };

  const dismissDialog = async (type: 'remind' | 'skip') => {
    setIsDialogVisible(false);

    if (type === 'skip' && updateInfo && (window as any).electron) {
      try {
        await (window as any).electron.invoke('update-skip', updateInfo.version);
        // Update local state to reflect that it is skipped
        setUpdateInfo((prev) => (prev ? { ...prev, isSkipped: true } : null));
      } catch (err) {
        console.error('[UpdateContext] Failed to skip version:', err);
      }
    }
  };

  const openDialog = () => {
    setIsDialogVisible(true);
  };

  return (
    <UpdateContext.Provider
      value={{
        isChecking,
        updateAvailable,
        updateInfo,
        isDialogVisible,
        isDownloading,
        downloadProgress,
        downloadSpeed,
        downloadRemaining,
        updateError,
        statusMessage,
        currentVersion,
        checkForUpdates,
        downloadAndInstall,
        dismissDialog,
        openDialog,
      }}
    >
      {children}

      {/* 1. Update Available Dialog Modal */}
      {isDialogVisible && updateInfo && !isDownloading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fadeIn select-none">
          <div className="bg-white border border-[#E5E7EB] rounded-[10px] w-full max-w-[500px] p-6 shadow-2xl space-y-5 text-left font-sans">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-[#F3F4F6] pb-4">
              <img src="app-icons/icon.png" alt="Icon" className="w-12 h-12 rounded-[10px] border border-gray-100 p-1" />
              <div>
                <h4 className="text-base font-bold text-gray-800">New Software Update Available</h4>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">A new release is ready for installation</p>
              </div>
            </div>

            {/* Version Metadata */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-[#F6F8FB] border border-[#E5E7EB] rounded-[6px] p-4 text-gray-600 font-medium">
              <p>📌 <strong>Current Version</strong>: {currentVersion}</p>
              <p>🚀 <strong>Latest Version</strong>: {updateInfo.version}</p>
              <p>📅 <strong>Release Date</strong>: {updateInfo.releaseDate}</p>
              <p>💾 <strong>Download Size</strong>: {updateInfo.fileSize}</p>
            </div>

            {/* Release Notes */}
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">Changelog / Release Notes:</p>
              <div
                className="max-h-[140px] overflow-y-auto text-xs text-gray-600 border border-[#E5E7EB] rounded-[6px] p-3.5 bg-white space-y-1 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: updateInfo.releaseNotes }}
              />
            </div>

            {/* Error Message */}
            {updateError && (
              <p className="text-xs font-bold text-red-500">{updateError}</p>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-[#F3F4F6]">
              <button
                onClick={() => dismissDialog('skip')}
                className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors focus:outline-none cursor-pointer"
              >
                Skip This Version
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => dismissDialog('remind')}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#4B5563] text-xs font-bold rounded-[6px] transition-colors cursor-pointer focus:outline-none"
                >
                  Remind Later
                </button>
                <button
                  onClick={downloadAndInstall}
                  className="px-5 py-2 bg-[#2F80ED] hover:bg-[#1B6FD1] text-white text-xs font-bold rounded-[6px] shadow-sm transition-colors cursor-pointer focus:outline-none"
                >
                  Update Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Download Progress Dialog Modal */}
      {isDownloading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fadeIn select-none font-sans">
          <div className="bg-white border border-[#E5E7EB] rounded-[10px] w-full max-w-[450px] p-6 shadow-2xl text-center space-y-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2F80ED] mx-auto" />
            
            <div className="space-y-1.5">
              <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">{statusMessage}</h4>
              {updateInfo && (
                <p className="text-xs text-gray-500 font-medium">Upgrading system files to version {updateInfo.version}</p>
              )}
            </div>

            {/* Progress Bar & Details */}
            <div className="space-y-3">
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-[#2F80ED] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 font-semibold">
                <span>{downloadProgress}% Completed</span>
                {downloadSpeed && <span>⚡ {downloadSpeed}</span>}
              </div>
              {downloadRemaining && (
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{downloadRemaining}</p>
              )}
            </div>

            {/* Error Message */}
            {updateError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-[6px] font-semibold text-left">
                ⚠️ {updateError} - Continuing in background...
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Small Sleek Floating Update Notification Pill at Bottom Center */}
      {updateAvailable && !isDialogVisible && !isDownloading && updateInfo && (
        <div
          onClick={openDialog}
          className="fixed bottom-5 left-1/2 transform -translate-x-1/2 z-[9998] bg-[#1F2937] text-white px-5 py-3 rounded-full shadow-[0_10px_25px_-5px_rgba(0,0,0,0.3)] flex items-center gap-4 border border-[#374151] hover:bg-[#2A374A] hover:border-[#4B5563] transition-all duration-200 cursor-pointer animate-slideUp select-none font-sans"
        >
          {/* Pulsing indicator dot */}
          <span className="flex h-2.5 w-2.5 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          
          <span className="text-xs font-bold tracking-wide">
            Software Update Available (v{updateInfo.version})
          </span>

          <button className="px-3.5 py-1.5 bg-[#2F80ED] hover:bg-[#1B6FD1] text-white text-[11px] font-bold rounded-full transition-colors cursor-pointer focus:outline-none shrink-0 shadow-sm">
            Update Now
          </button>
        </div>
      )}
    </UpdateContext.Provider>
  );
}
