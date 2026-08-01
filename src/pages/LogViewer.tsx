import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Download, Search, RefreshCw, FileText, AlertTriangle, XCircle, Info } from 'lucide-react';
import { SidebarToggle } from '../components/Sidebar';
import { useNotification } from '../context/NotificationContext';

interface LogEntry {
  id: number;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR';
  module: string;
  message: string;
}

export default function LogViewer() {
  const navigate = useNavigate();
  const { showToast } = useNotification();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await (window as any).electron.invoke('get-logs');
      setLogs(data || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      showToast('Could not load logs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleClear = async () => {
    if (window.confirm('Are you sure you want to clear all log history?')) {
      try {
        const success = await (window as any).electron.invoke('clear-logs');
        if (success) {
          showToast('Log history cleared successfully.');
          fetchLogs();
        } else {
          showToast('Failed to clear logs.', 'error');
        }
      } catch (err) {
        showToast('Error clearing logs.', 'error');
      }
    }
  };

  const handleExport = async () => {
    try {
      const success = await (window as any).electron.invoke('export-logs');
      if (success) {
        showToast('Logs exported successfully.');
      }
    } catch (err) {
      showToast('Failed to export logs.', 'error');
    }
  };

  const filteredLogs = logs.filter(entry => {
    const matchesSearch = entry.message.toLowerCase().includes(search.toLowerCase()) ||
                          entry.module.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = filterLevel === 'ALL' ? true : entry.level === filterLevel;
    return matchesSearch && matchesLevel;
  });

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'ERROR':
        return (
          <span className="flex items-center gap-1 bg-red-50 text-red-750 px-2 py-0.5 border border-red-200 rounded-[4px] text-[10px] font-bold">
            <XCircle className="w-3.5 h-3.5 text-red-650" /> ERROR
          </span>
        );
      case 'WARNING':
        return (
          <span className="flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-0.5 border border-amber-200 rounded-[4px] text-[10px] font-bold">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> WARNING
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 bg-sky-50 text-sky-850 px-2 py-0.5 border border-sky-150 rounded-[4px] text-[10px] font-bold">
            <Info className="w-3.5 h-3.5 text-sky-500" /> INFO
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F6F8FB] select-none min-h-screen">
      {/* Header bar */}
      <header className="h-[60px] bg-[#2F80ED] text-white flex items-center justify-between px-5 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center justify-center p-1.5 hover:bg-white/10 rounded transition-colors cursor-pointer focus:outline-none"
            title="Back to Settings"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <SidebarToggle />
          <span className="font-semibold text-lg tracking-wide">Factory App</span>
        </div>
        
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <span className="bg-white/10 px-3 py-1.5 rounded-[6px] tracking-wide text-white select-none">
            📜 Application Logs
          </span>
        </div>

        <div className="w-20"></div>
      </header>

      {/* Title area */}
      <div className="bg-white border-b border-[#E5E7EB] py-5 px-8 flex flex-col justify-center">
        <div className="max-w-[1600px] w-full mx-auto flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#1F2937] flex items-center gap-2">
              <span className="text-lg">📜</span> System Application Logs
            </h2>
            <p className="text-xs text-[#6B7280] font-semibold tracking-wide uppercase">
              Errors, Warnings, and Lifecycle Actions Log
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-[#2F80ED] hover:bg-[#1B6FD1] text-white text-xs font-bold rounded-[6px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm focus:outline-none"
            >
              <Download className="w-4 h-4" /> Export Logs
            </button>
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-[6px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm focus:outline-none"
            >
              <Trash2 className="w-4 h-4" /> Clear Logs
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search toolbar */}
      <main className="flex-grow p-8 flex flex-col gap-5 overflow-y-auto">
        <div className="max-w-[1600px] w-full mx-auto bg-white border border-[#E5E7EB] rounded-[10px] shadow-sm flex flex-col overflow-hidden h-[calc(100vh-250px)]">
          
          {/* Filters Area */}
          <div className="p-4 border-b border-[#E5E7EB] bg-[#FAFAFB] flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              {/* Search */}
              <div className="relative flex-grow md:flex-grow-0 w-full md:w-72">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#9CA3AF]" />
                <input
                  type="text"
                  placeholder="Search logs by keyword..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-white border border-[#E5E7EB] text-[#1F2937] text-xs rounded-[6px] focus:outline-none focus:border-[#2F80ED]"
                />
              </div>

              {/* Level Filter */}
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="px-3 py-1.5 bg-white border border-[#E5E7EB] text-[#1F2937] text-xs rounded-[6px] focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Levels</option>
                <option value="INFO">Info Only</option>
                <option value="WARNING">Warnings Only</option>
                <option value="ERROR">Errors Only</option>
              </select>
            </div>

            <button
              onClick={fetchLogs}
              disabled={loading}
              className="p-2 bg-white border border-[#E5E7EB] hover:bg-[#F6F8FB] text-[#1F2937] rounded-[6px] flex items-center justify-center transition-colors cursor-pointer focus:outline-none"
              title="Reload Log File"
            >
              <RefreshCw className={`w-4 h-4 text-[#6B7280] ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Logs Table Area */}
          <div className="flex-1 overflow-auto bg-[#FAFAFA]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-[#9CA3AF]">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-semibold">Reading logs from disk...</span>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-[#9CA3AF] gap-1.5">
                <FileText className="w-8 h-8 text-[#D1D5DB]" />
                <span className="text-xs font-semibold text-[#6B7280]">No matching log logs</span>
                <span className="text-[10px] text-[#9CA3AF]">Try adjusting filters or search term.</span>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-xs font-mono whitespace-nowrap bg-white">
                <thead className="bg-[#F8FAFC] text-[#6B7280] font-bold uppercase tracking-wider text-[10px] border-b border-[#E5E7EB] sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 w-40">Timestamp</th>
                    <th className="px-4 py-3 w-28">Level</th>
                    <th className="px-4 py-3 w-32">Module</th>
                    <th className="px-4 py-3">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {filteredLogs.map((entry) => (
                    <tr 
                      key={entry.id} 
                      className={`hover:bg-[#F8FAFC] transition-colors ${
                        entry.level === 'ERROR' ? 'bg-red-50/15' : entry.level === 'WARNING' ? 'bg-amber-50/15' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5 text-slate-500 font-sans">
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 select-none">{getLevelBadge(entry.level)}</td>
                      <td className="px-4 py-3.5 font-bold text-slate-700">{entry.module}</td>
                      <td className="px-4 py-3.5 text-slate-800 break-all whitespace-pre-wrap select-text">
                        {entry.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Status footer info */}
          <div className="h-[36px] bg-[#F8FAFC] border-t border-[#E5E7EB] px-4 flex items-center justify-between text-[10px] font-bold text-[#6B7280] uppercase tracking-wider select-none shrink-0">
            <span>Total Log Lines: {logs.length}</span>
            <span>Filtered: {filteredLogs.length}</span>
          </div>

        </div>
      </main>
    </div>
  );
}
