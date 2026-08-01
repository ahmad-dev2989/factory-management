import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Activity, Database, CheckCircle, Sliders, Settings2, Trash2 } from 'lucide-react';
import { SidebarToggle } from '../components/Sidebar';
import { useNotification } from '../context/NotificationContext';

export default function Diagnostics() {
  const navigate = useNavigate();
  const { showToast } = useNotification();
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await (window as any).electron.invoke('db-diagnostics');
      if (data && !data.error) {
        setStats(data);
      } else {
        showToast('Failed to load system diagnostics.', 'error');
      }
    } catch (err) {
      console.error('Failed to load diagnostics stats:', err);
      showToast('Error loading stats.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleVacuum = async () => {
    setOptimizing(true);
    showToast('Running database optimize & vacuum...');
    try {
      const success = await (window as any).electron.invoke('db-vacuum');
      if (success) {
        showToast('SQLite database optimized successfully!');
        fetchStats();
      } else {
        showToast('Database optimization failed.', 'error');
      }
    } catch (err) {
      showToast('Error optimizing database.', 'error');
    } finally {
      setOptimizing(false);
    }
  };

  const handleCleanup = async () => {
    setCleaning(true);
    showToast('Starting storage cleanup...');
    try {
      const success = await (window as any).electron.invoke('storage-cleanup');
      if (success) {
        showToast('Temporary files cleared and storage cleaned!');
        fetchStats();
      } else {
        showToast('Cleanup failed.', 'error');
      }
    } catch (err) {
      showToast('Error running cleanup.', 'error');
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F6F8FB] select-none min-h-screen">
      {/* Header */}
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
            ⚙ System Diagnostics
          </span>
        </div>

        <div className="w-20"></div>
      </header>

      {/* Title */}
      <div className="bg-white border-b border-[#E5E7EB] py-5 px-8 flex flex-col justify-center">
        <div className="max-w-[1600px] w-full mx-auto flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#1F2937] flex items-center gap-2">
              <span className="text-lg">⚙</span> System Diagnostics & Tools
            </h2>
            <p className="text-xs text-[#6B7280] font-semibold tracking-wide uppercase">
              SQLite Database Sizes, Stats, and Performance Cleaning Tools
            </p>
          </div>
          
          <button
            onClick={fetchStats}
            disabled={loading}
            className="p-2 bg-white border border-[#E5E7EB] hover:bg-[#F6F8FB] text-[#1F2937] rounded-[6px] flex items-center justify-center transition-colors cursor-pointer focus:outline-none"
            title="Reload Diagnostics"
          >
            <RefreshCw className={`w-4 h-4 text-[#6B7280] ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <main className="flex-grow p-8 overflow-y-auto">
        <div className="max-w-[1600px] w-full mx-auto space-y-6">
          
          {/* Main Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Database File & Platform details card */}
            <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]">
              <h3 className="text-sm font-bold text-[#1F2937] border-b border-[#F3F4F6] pb-3 mb-4 flex items-center gap-2 uppercase tracking-wider text-slate-500">
                <Database className="w-4 h-4 text-blue-500" /> Database & Storage Specs
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between border-b border-[#FAFAFB] pb-2">
                  <span className="text-xs font-semibold text-slate-500">Active Database File Size</span>
                  <span className="text-xs font-bold text-slate-800">{stats.databaseSize || '0.00 MB'}</span>
                </div>
                <div className="flex justify-between border-b border-[#FAFAFB] pb-2">
                  <span className="text-xs font-semibold text-slate-500">SQLite Engine Version</span>
                  <span className="text-xs font-bold text-slate-800">v{stats.sqliteVersion}</span>
                </div>
                <div className="flex justify-between border-b border-[#FAFAFB] pb-2">
                  <span className="text-xs font-semibold text-slate-500">Last Backup Archive Date</span>
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 border border-amber-100 rounded">
                    {stats.lastBackupDate}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs font-semibold text-slate-500">Host OS platform</span>
                  <span className="text-xs font-bold text-slate-800 capitalize">{stats.osPlatform}</span>
                </div>
              </div>
            </div>

            {/* Counts Summary */}
            <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] md:col-span-2">
              <h3 className="text-sm font-bold text-[#1F2937] border-b border-[#F3F4F6] pb-3 mb-4 flex items-center gap-2 uppercase tracking-wider text-slate-500">
                <Activity className="w-4 h-4 text-emerald-500" /> Database Records Counts
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-lg text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Products</span>
                  <span className="text-2xl font-black text-slate-700 block mt-1">{stats.productsCount || 0}</span>
                </div>
                
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-lg text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Customers</span>
                  <span className="text-2xl font-black text-slate-700 block mt-1">{stats.customersCount || 0}</span>
                </div>

                <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-lg text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Employees</span>
                  <span className="text-2xl font-black text-slate-700 block mt-1">{stats.employeesCount || 0}</span>
                </div>

                <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-lg text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Sales</span>
                  <span className="text-2xl font-black text-slate-700 block mt-1">{stats.salesCount || 0}</span>
                </div>

                <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-lg text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Purchases</span>
                  <span className="text-2xl font-black text-slate-700 block mt-1">{stats.purchasesCount || 0}</span>
                </div>

                <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-lg text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Bank Accounts</span>
                  <span className="text-2xl font-black text-slate-700 block mt-1">{stats.bankAccountsCount || 0}</span>
                </div>

                <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-lg text-center col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Cash Receipts & Payments</span>
                  <span className="text-2xl font-black text-slate-700 block mt-1">{stats.cashTransactionsCount || 0}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Productivity / Maintenance Tools */}
          <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]">
            <h3 className="text-sm font-bold text-[#1F2937] border-b border-[#F3F4F6] pb-3 mb-4 flex items-center gap-2 uppercase tracking-wider text-slate-500">
              <Settings2 className="w-4 h-4 text-purple-500" /> Database Maintenance & Storage Tools
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tool 1 */}
              <div className="border border-[#E2E8F0] rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-50/50">
                <div className="flex-grow">
                  <h4 className="text-sm font-bold text-slate-800">Optimize Database (Vacuum & Analyze)</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-[450px]">Reclaims unused space, reorganizes DB pages, rebuilds indices, and compiles diagnostic optimizer data for SQLite speedup.</p>
                </div>
                <button
                  onClick={handleVacuum}
                  disabled={optimizing}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-[6px] shrink-0 transition-all cursor-pointer focus:outline-none shadow-sm flex items-center gap-1"
                >
                  <Database className="w-3.5 h-3.5" /> {optimizing ? 'Optimizing...' : 'Optimize Now'}
                </button>
              </div>

              {/* Tool 2 */}
              <div className="border border-[#E2E8F0] rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-50/50">
                <div className="flex-grow">
                  <h4 className="text-sm font-bold text-slate-800">Clean Application Storage</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-[450px]">Clears system temporary files cache directories, updates schema statistics indices, and optimizes local logs size.</p>
                </div>
                <button
                  onClick={handleCleanup}
                  disabled={cleaning}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-xs font-bold rounded-[6px] shrink-0 transition-all cursor-pointer focus:outline-none shadow-sm flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> {cleaning ? 'Cleaning...' : 'Run Cleanup'}
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
