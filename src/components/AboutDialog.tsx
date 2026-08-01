import React, { useState, useEffect } from 'react';
import { Info, X, Monitor, ShieldCheck, Cpu } from 'lucide-react';

interface AboutDialogProps {
  onClose: () => void;
}

export function AboutDialog({ onClose }: AboutDialogProps) {
  const [appVersion, setAppVersion] = useState('0.0.3');
  const [diagnostics, setDiagnostics] = useState<any>({
    sqliteVersion: 'Loading...',
    osPlatform: 'Loading...',
    electronVersion: 'Loading...'
  });

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const version = await (window as any).electron.invoke('get-app-version');
        setAppVersion(version);

        const diag = await (window as any).electron.invoke('db-diagnostics');
        if (diag && !diag.error) {
          setDiagnostics(diag);
        }
      } catch (err) {
        console.error('Failed to fetch about dialog info:', err);
      }
    };
    fetchInfo();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[9999] flex items-center justify-center p-4 font-sans select-none animate-fadeIn">
      <div className="bg-white w-[420px] rounded-[12px] shadow-2xl border border-gray-200 overflow-hidden flex flex-col animate-zoomIn">
        
        {/* Header banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors focus:outline-none cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="w-16 h-16 bg-white/15 rounded-2xl mx-auto flex items-center justify-center border border-white/25 shadow-lg mb-3">
            <span className="text-2xl font-black tracking-widest text-white">FM</span>
          </div>
          
          <h3 className="text-lg font-bold">Factory Management & Accounting</h3>
          <p className="text-xs text-white/80 mt-1">Enterprise Productivity suite</p>
        </div>

        {/* Details list */}
        <div className="p-5 flex-1 space-y-4">
          
          {/* Versions */}
          <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0] space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-500">App Version</span>
              <span className="font-bold text-slate-800 bg-white px-2 py-0.5 border border-slate-200 rounded">
                v{appVersion}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-500">Build Version</span>
              <span className="font-bold text-slate-800">2026.08.01.01</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-500">Database Schema</span>
              <span className="font-bold text-slate-800">v6 (Active)</span>
            </div>
          </div>

          {/* Engine specifications */}
          <div className="space-y-3 pt-1">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Platform Specs</h4>
            
            <div className="flex items-center gap-3 text-xs">
              <Cpu className="w-4 h-4 text-indigo-500 shrink-0" />
              <div className="flex-1 flex justify-between">
                <span className="font-medium text-slate-600">Electron Node</span>
                <span className="font-bold text-slate-800">{diagnostics.electronVersion}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="flex-1 flex justify-between">
                <span className="font-medium text-slate-600">SQLite Engine</span>
                <span className="font-bold text-slate-800">v{diagnostics.sqliteVersion}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <Monitor className="w-4 h-4 text-sky-500 shrink-0" />
              <div className="flex-1 flex justify-between">
                <span className="font-medium text-slate-600">Operating System</span>
                <span className="font-bold text-slate-800 capitalize">{diagnostics.osPlatform}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer info banner */}
        <div className="border-t border-slate-100 p-4 bg-slate-50 text-center">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            © 2026 Factory Inc. All rights reserved.
          </p>
        </div>

      </div>
    </div>
  );
}
