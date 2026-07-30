import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes: string;
  fileSize: string;
}

export default function Splash() {
  const navigate = useNavigate();
  const [version, setVersion] = useState('0.0.0');
  const [statusMessage, setStatusMessage] = useState('Preparing application...');
  const [isFading, setIsFading] = useState(false);

  // Auto-Update States
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState('');
  const [downloadRemaining, setDownloadRemaining] = useState('');
  const [updateError, setUpdateError] = useState('');

  useEffect(() => {
    // 1. Fetch current application version on startup
    const initStartup = async () => {
      if ((window as any).electron) {
        try {
          const v = await (window as any).electron.invoke('get-app-version');
          setVersion(v || '0.0.0');
        } catch (err) {
          console.error('[Splash] Failed to load version:', err);
        }

        // 2. Perform Update Check
        setStatusMessage('Checking for updates...');
        try {
          const res = await (window as any).electron.invoke('update-check');
          if (res && res.updateAvailable) {
            // Update found! Stop normal startup timeline and show update dialog modal
            setUpdateInfo({
              version: res.version,
              releaseDate: res.releaseDate,
              releaseNotes: res.releaseNotes,
              fileSize: res.fileSize
            });
            return; // Halt redirect to login
          }
        } catch (err) {
          console.error('[Splash] Failed to check for updates:', err);
        }
      }

      // No updates found (or failed) - proceed with standard boot flow
      setStatusMessage('Application is up to date.');
      
      const timer1 = setTimeout(() => {
        setStatusMessage('Preparing application...');
      }, 1000);

      const timer2 = setTimeout(() => {
        setStatusMessage('Launching application...');
      }, 2000);

      const timer3 = setTimeout(() => {
        setIsFading(true);
      }, 2800);

      const timer4 = setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3300);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
      };
    };

    initStartup();
  }, [navigate]);

  // Set up update progress IPC listeners
  useEffect(() => {
    const handleUpdateProgress = (_event: any, data: { percent: number; speed: string; remaining: string }) => {
      setDownloadProgress(data.percent);
      setDownloadSpeed(data.speed);
      setDownloadRemaining(data.remaining);
    };

    const handleUpdateState = (_event: any, state: string) => {
      if (state === 'installing') {
        setStatusMessage('Installing Update...');
      } else if (state === 'restarting') {
        setStatusMessage('Restarting Application...');
      }
    };

    const handleUpdateError = (_event: any, errorText: string) => {
      setUpdateError(errorText);
      setIsDownloading(false);
      // Let user proceed on error fallback after 3 seconds
      setTimeout(() => {
        setIsFading(true);
        setTimeout(() => navigate('/login', { replace: true }), 500);
      }, 3000);
    };

    if ((window as any).electron) {
      (window as any).electron.on('update-progress', handleUpdateProgress);
      (window as any).electron.on('update-state', handleUpdateState);
      (window as any).electron.on('update-error', handleUpdateError);
    }

    return () => {
      // Clean up handlers
    };
  }, [navigate]);

  const handleUpdateNow = async () => {
    setIsDownloading(true);
    setUpdateError('');
    setStatusMessage('Downloading Update...');
    try {
      await (window as any).electron.invoke('update-download');
    } catch (err: any) {
      setUpdateError(err.message || 'Failed to download update.');
      setIsDownloading(false);
    }
  };

  const handleRemindMeLater = () => {
    setUpdateInfo(null);
    setStatusMessage('Launching application...');
    setIsFading(true);
    setTimeout(() => {
      navigate('/login', { replace: true });
    }, 500);
  };

  const handleSkipVersion = async () => {
    if (updateInfo) {
      try {
        await (window as any).electron.invoke('update-skip', updateInfo.version);
      } catch {}
    }
    handleRemindMeLater();
  };

  return (
    <div
      className={`fixed inset-0 bg-[#F6F8FB] flex flex-col items-center justify-between py-12 px-6 select-none z-50 transition-opacity duration-500 ease-out ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Spacer */}
      <div />

      {/* Center Branding Area */}
      <div className="flex flex-col items-center text-center max-w-md animate-fadeIn scale-up-5">
        <img
          src="/app-icons/icon.png"
          alt="App Icon"
          className="w-28 h-28 rounded-[22px] shadow-lg border border-[#E5E7EB] bg-white object-contain p-2 hover:scale-[1.02] transition-transform duration-300"
        />

        <h1 className="text-[#1F2937] text-2xl font-bold tracking-wide mt-6 leading-tight select-none">
          Factory Management & Accounting System
        </h1>

        <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mt-1.5">
          Enterprise Desktop Suite
        </p>
      </div>

      {/* Footer Info / Startup Status Manager */}
      <div className="flex flex-col items-center w-full max-w-xs space-y-4">
        {/* Loading Spinner */}
        {!updateInfo && (
          <div className="flex items-center gap-1.5 animate-fadeIn">
            <div className="w-2.5 h-2.5 bg-[#2F80ED] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2.5 h-2.5 bg-[#2F80ED] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2.5 h-2.5 bg-[#2F80ED] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}

        {/* Startup Status Manager Label */}
        <div className="h-6 flex items-center justify-center">
          <span className="text-xs font-semibold text-[#2F80ED]/90 tracking-wide transition-all duration-300">
            {statusMessage}
          </span>
        </div>

        <div className="text-center pt-2">
          <p className="text-xs font-bold text-gray-500 select-none">
            Version {version}
          </p>
          <p className="text-[10px] text-gray-400 font-semibold mt-0.5 select-none">
            &copy; 2026 Factory Management. All rights reserved.
          </p>
        </div>
      </div>

      {/* 1. Update Available Dialog Modal */}
      {updateInfo && !isDownloading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-[60] animate-fadeIn">
          <div className="bg-white border border-[#E5E7EB] rounded-[10px] w-full max-w-[500px] p-6 shadow-2xl space-y-5 text-left select-none">
            {/* Header info */}
            <div className="flex items-center gap-4 border-b border-[#F3F4F6] pb-4">
              <img src="/app-icons/icon.png" alt="Icon" className="w-12 h-12 rounded-[10px] border border-gray-100 p-1" />
              <div>
                <h4 className="text-base font-bold text-gray-800">New Software Update Available</h4>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">A new release is ready for installation</p>
              </div>
            </div>

            {/* Version Metadata */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-[#F6F8FB] border border-[#E5E7EB] rounded-[6px] p-4 text-gray-600">
              <p>📌 **Current Version**: {version}</p>
              <p>🚀 **Latest Version**: {updateInfo.version}</p>
              <p>📅 **Release Date**: {updateInfo.releaseDate}</p>
              <p>💾 **Download Size**: {updateInfo.fileSize}</p>
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

            {/* Dialog Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-[#F3F4F6]">
              <button
                onClick={handleSkipVersion}
                className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors focus:outline-none cursor-pointer"
              >
                Skip This Version
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRemindMeLater}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#4B5563] text-xs font-bold rounded-[6px] transition-colors cursor-pointer focus:outline-none"
                >
                  Remind Later
                </button>
                <button
                  onClick={handleUpdateNow}
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-[60] animate-fadeIn">
          <div className="bg-white border border-[#E5E7EB] rounded-[10px] w-full max-w-[450px] p-6 shadow-2xl text-center space-y-6 select-none">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2F80ED] mx-auto" />
            
            <div className="space-y-1.5">
              <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">{statusMessage}</h4>
              {updateInfo && (
                <p className="text-xs text-gray-500">Upgrading system files to version {updateInfo.version}</p>
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
                ⚠️ {updateError} - Continuing to application...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
