import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wifi, Bell, Mail, LogOut, ChevronRight, DatabaseBackup, UploadCloud, RefreshCw, AlertTriangle, CheckCircle2, AlertOctagon, ArrowLeft } from 'lucide-react';

interface BackupMetadata {
  backupDate: string;
  appVersion: string;
  databaseVersion: number;
  backupFormatVersion: string;
  os: string;
  backupCreatorVersion: string;
}

export default function BackupRestore() {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/login');
  };

  // UI States
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [backupSuccess, setBackupSuccess] = useState(false);

  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreMetadata, setRestoreMetadata] = useState<BackupMetadata | null>(null);

  const [errorMessage, setErrorMessage] = useState('');
  const [showRestartModal, setShowRestartModal] = useState(false);

  // Set up event listeners for progress bars
  useEffect(() => {
    const handleBackupProgress = (_event: any, percent: number) => {
      setBackupProgress(percent);
    };

    const handleRestoreProgress = (_event: any, percent: number) => {
      setRestoreProgress(percent);
    };

    if ((window as any).electron) {
      (window as any).electron.on('backup-progress', handleBackupProgress);
      (window as any).electron.on('restore-progress', handleRestoreProgress);
    }

    return () => {
      // Cleanup listener bindings
    };
  }, []);

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    setBackupProgress(0);
    setBackupSuccess(false);
    setErrorMessage('');

    try {
      const res = await (window as any).electron.invoke('backup-create');
      if (res && res.success) {
        setBackupSuccess(true);
        setTimeout(() => setBackupSuccess(false), 5000);
      } else if (res && res.error) {
        setErrorMessage(res.message || 'Failed to create backup.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during backup creation.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleSelectRestore = async () => {
    setIsRestoring(true);
    setRestoreProgress(0);
    setRestoreMetadata(null);
    setErrorMessage('');

    try {
      const res = await (window as any).electron.invoke('backup-restore-select');
      if (res && res.success) {
        setRestoreMetadata(res.metadata);
      } else if (res && res.error) {
        setErrorMessage(res.message || 'Failed to validate backup.');
        setIsRestoring(false);
      } else {
        setIsRestoring(false); // User cancelled dialog
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during backup selection.');
      setIsRestoring(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreMetadata) return;
    setErrorMessage('');

    try {
      const res = await (window as any).electron.invoke('backup-restore-confirm');
      if (res && res.success) {
        setShowRestartModal(true);
      } else {
        setErrorMessage(res.message || 'Restore failed.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during restoration.');
    } finally {
      setIsRestoring(false);
      setRestoreMetadata(null);
    }
  };

  const handleCancelRestore = async () => {
    try {
      await (window as any).electron.invoke('backup-restore-abort');
    } catch { }
    setIsRestoring(false);
    setRestoreMetadata(null);
  };

  const handleRestartApp = async () => {
    try {
      await (window as any).electron.invoke('app-restart');
    } catch (err) {
      console.error('Failed to restart app:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F6F8FB] select-none min-h-screen">
      {/* Top Blue Header */}
      <header className="h-[60px] bg-[#2F80ED] text-white flex items-center justify-between px-5 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center justify-center p-1.5 hover:bg-white/10 rounded transition-colors cursor-pointer focus:outline-none"
            title="Back to Settings"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="bg-white/15 px-2.5 py-1 rounded text-xs font-bold tracking-widest border border-white/20 select-none">
            LB
          </div>
          <span className="font-semibold text-lg tracking-wide">
            Factory App
          </span>
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-4 text-white/80 border-r border-white/20 pr-4">
            <button className="hover:text-white p-1 rounded transition-colors cursor-pointer focus:outline-none" title="Network Connection">
              <Wifi className="w-[18px] h-[18px]" />
            </button>
            <button className="hover:text-white p-1 rounded transition-colors cursor-pointer focus:outline-none relative" title="Notifications">
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-red-400 rounded-full"></span>
            </button>
            <button className="hover:text-white p-1 rounded transition-colors cursor-pointer focus:outline-none" title="Messages">
              <Mail className="w-[18px] h-[18px]" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white/15 rounded-full flex items-center justify-center text-xs font-semibold border border-white/10">
                A
              </div>
              <span className="text-sm font-semibold">Admin</span>
            </div>
            <button onClick={handleLogout} className="hover:bg-white/10 p-1.5 rounded transition-colors cursor-pointer focus:outline-none flex items-center justify-center" title="Logout">
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </header>

      {/* Breadcrumbs */}
      <div className="bg-white border-b border-[#E5E7EB] py-3 px-8 flex items-center shrink-0">
        <div className="max-w-[1000px] w-full mx-auto flex items-center gap-2 text-sm text-[#4B5563]">
          <span className="cursor-pointer hover:text-[#2F80ED] transition-colors" onClick={() => navigate('/settings')}>Settings</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="font-semibold text-gray-800">Backup & Restore</span>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-grow p-8 overflow-y-auto">
        <div className="max-w-[1000px] w-full mx-auto flex flex-col gap-6">

          {/* Success / Error Messages */}
          {backupSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-[6px] flex items-center gap-3 shadow-sm transition-all animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              <div>
                <p className="font-semibold text-sm">System Backup Created Successfully!</p>
                <p className="text-xs text-green-700">All databases and uploaded document configurations are packed in the exported ZIP archive.</p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-[6px] flex items-center gap-3 shadow-sm animate-fadeIn">
              <AlertOctagon className="w-5 h-5 text-red-500 shrink-0" />
              <div>
                <p className="font-semibold text-sm">System Error Occurred</p>
                <p className="text-xs text-red-700">{errorMessage}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-8">

            {/* Backup Box */}
            <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-8 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] flex flex-col justify-between min-h-[300px]">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-[#EEF5FF] rounded-[8px] border border-[#2F80ED]/10 flex items-center justify-center">
                    <DatabaseBackup className="w-8 h-8 text-[#2F80ED]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#1F2937]">Create System Backup</h3>
                    <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-wider">Secure and Compress Data</p>
                  </div>
                </div>
                <p className="text-sm text-[#4B5563] leading-relaxed mb-6">
                  Generate a single compressed ZIP file containing your complete SQLite database, configurations, settings, company logo, employee attachments, and uploaded files. You can save this file on your local disk, network share, or USB drive.
                </p>
              </div>

              <div>
                {isBackingUp ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-[#4B5563]">
                      <span>Compressing system files...</span>
                      <span>{backupProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-[#2F80ED] h-2 rounded-full transition-all duration-300" style={{ width: `${backupProgress}%` }}></div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleCreateBackup}
                    disabled={isRestoring}
                    className="w-full bg-[#2F80ED] hover:bg-[#1B6FD1] text-white py-3.5 px-4 rounded-[6px] font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none disabled:opacity-50"
                  >
                    <UploadCloud className="w-4 h-4" />
                    Create Backup (.zip)
                  </button>
                )}
              </div>
            </div>

            {/* Restore Box */}
            <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-8 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] flex flex-col justify-between min-h-[300px]">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-[#EAFBF3] rounded-[8px] border border-green-100 flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 text-[#27AE60]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#1F2937]">Restore System Data</h3>
                    <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-wider">Overwrites Current State</p>
                  </div>
                </div>
                <p className="text-sm text-[#4B5563] leading-relaxed mb-6">
                  Upload a previously generated backup ZIP file to restore your database, preferences, logos, and attachments. The system will automatically validate the ZIP archive's integrity and format version before replacing any files.
                </p>
              </div>

              <div>
                {isRestoring && !restoreMetadata ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-[#4B5563]">
                      <span>Extracting and validating archive...</span>
                      <span>{restoreProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-[#27AE60] h-2 rounded-full transition-all duration-300" style={{ width: `${restoreProgress}%` }}></div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleSelectRestore}
                    disabled={isBackingUp || (isRestoring && !!restoreMetadata)}
                    className="w-full bg-[#27AE60] hover:bg-[#219653] text-white py-3.5 px-4 rounded-[6px] font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none disabled:opacity-50"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Restore from Backup
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* Validation Confirm Modal */}
          {restoreMetadata && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
              <div className="bg-white border border-[#E5E7EB] rounded-[10px] w-full max-w-[500px] p-6 shadow-2xl space-y-6">
                <div className="flex items-center gap-3 text-amber-600">
                  <AlertTriangle className="w-7 h-7" />
                  <h4 className="text-lg font-bold">Confirm Database Overwrite</h4>
                </div>

                <div className="bg-amber-50/50 border border-amber-100 rounded-[6px] p-4 text-xs space-y-2 text-[#4B5563]">
                  <p className="font-semibold text-amber-900 mb-1">Backup Archive Validated:</p>
                  <p>📅 **Created Date**: {restoreMetadata.backupDate}</p>
                  <p>💻 **Operating System**: {restoreMetadata.os.toUpperCase()}</p>
                  <p>📦 **Database Schema Version**: {restoreMetadata.databaseVersion}</p>
                  <p>⚙️ **Creator**: {restoreMetadata.backupCreatorVersion}</p>
                </div>

                <p className="text-sm text-gray-600 leading-relaxed">
                  **Warning**: Restoring this backup will replace your current company databases, preferences, lists, and uploaded attachments. This operation cannot be undone.
                </p>

                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={handleCancelRestore}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#4B5563] text-sm font-semibold rounded-[6px] transition-colors cursor-pointer focus:outline-none"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmRestore}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-[6px] shadow-sm transition-colors cursor-pointer focus:outline-none"
                  >
                    Proceed with Restore
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Post-Restore Restart Modal */}
          {showRestartModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
              <div className="bg-white border border-[#E5E7EB] rounded-[10px] w-full max-w-[450px] p-6 shadow-2xl text-center space-y-6">
                <div className="mx-auto w-12 h-12 bg-green-50 border border-green-200 rounded-full flex items-center justify-center text-green-500">
                  <CheckCircle2 className="w-6 h-6" />
                </div>

                <div className="space-y-2">
                  <h4 className="text-lg font-bold text-gray-800">Restore Completed Successfully!</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    All directories, database structures, profiles, and image repositories have been updated. The application needs to restart to load the restored data.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setShowRestartModal(false)}
                    className="px-4 py-2 border border-[#E5E7EB] hover:bg-gray-50 text-[#4B5563] text-sm font-semibold rounded-[6px] transition-colors cursor-pointer focus:outline-none"
                  >
                    Restart Later
                  </button>
                  <button
                    onClick={handleRestartApp}
                    className="px-5 py-2 bg-[#2F80ED] hover:bg-[#1B6FD1] text-white text-sm font-semibold rounded-[6px] shadow-sm transition-colors cursor-pointer focus:outline-none"
                  >
                    Restart Now
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
