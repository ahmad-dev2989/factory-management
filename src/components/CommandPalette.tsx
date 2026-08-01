import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, Settings, ArrowRight, Database, LogOut, FileText, Activity, Trash2, Heart } from 'lucide-react';

interface CommandPaletteProps {
  onClose: () => void;
}

interface CommandItem {
  name: string;
  category: string;
  icon: React.ReactNode;
  action: () => void;
}

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const triggerBackup = async () => {
    onClose();
    try {
      const res = await (window as any).electron.invoke('backup-create');
      if (res && !res.error) {
        alert('Backup created successfully!');
      }
    } catch (err) {
      console.error('Backup failed:', err);
    }
  };

  const triggerRestore = async () => {
    onClose();
    try {
      const res = await (window as any).electron.invoke('backup-restore-select');
      if (res && !res.error) {
        const confirm = window.confirm(`Restore backup from ${res.backupDate} (v${res.backupCreatorVersion})? This will restart the application.`);
        if (confirm) {
          await (window as any).electron.invoke('backup-restore-confirm');
        } else {
          await (window as any).electron.invoke('backup-restore-abort');
        }
      }
    } catch (err) {
      console.error('Restore failed:', err);
    }
  };

  const triggerVacuum = async () => {
    onClose();
    try {
      const success = await (window as any).electron.invoke('db-vacuum');
      if (success) {
        alert('Database optimized and vacuumed successfully!');
      } else {
        alert('Database optimization failed.');
      }
    } catch (err) {
      console.error('Vacuum error:', err);
    }
  };

  const commands: CommandItem[] = [
    { name: 'Navigation: Go to Dashboard', category: 'Navigation', icon: <ArrowRight className="w-4 h-4 text-blue-500" />, action: () => navigate('/dashboard') },
    { name: 'Navigation: Go to Settings', category: 'Navigation', icon: <Settings className="w-4 h-4 text-gray-500" />, action: () => navigate('/settings') },
    { name: 'Navigation: Go to Products', category: 'Navigation', icon: <ArrowRight className="w-4 h-4 text-blue-500" />, action: () => navigate('/products') },
    { name: 'Navigation: Go to Customers', category: 'Navigation', icon: <ArrowRight className="w-4 h-4 text-blue-500" />, action: () => navigate('/customers') },
    { name: 'Navigation: Go to Employees', category: 'Navigation', icon: <ArrowRight className="w-4 h-4 text-blue-500" />, action: () => navigate('/employees') },
    { name: 'Navigation: Go to Sales Invoices', category: 'Navigation', icon: <ArrowRight className="w-4 h-4 text-blue-500" />, action: () => navigate('/sales') },
    { name: 'Navigation: Go to Purchases Receipts', category: 'Navigation', icon: <ArrowRight className="w-4 h-4 text-blue-500" />, action: () => navigate('/purchases') },
    { name: 'Navigation: Go to Bank Accounts', category: 'Navigation', icon: <ArrowRight className="w-4 h-4 text-blue-500" />, action: () => navigate('/bank-accounts') },
    { name: 'Navigation: Go to Cash In Vouchers', category: 'Navigation', icon: <ArrowRight className="w-4 h-4 text-blue-500" />, action: () => navigate('/cash-in') },
    { name: 'Navigation: Go to Cash Out Vouchers', category: 'Navigation', icon: <ArrowRight className="w-4 h-4 text-blue-500" />, action: () => navigate('/cash-out') },
    { name: 'Navigation: Go to Reports Dashboard', category: 'Navigation', icon: <ArrowRight className="w-4 h-4 text-blue-500" />, action: () => navigate('/reports') },
    
    { name: 'Sales: Create New Invoice', category: 'Action', icon: <ArrowRight className="w-4 h-4 text-green-500" />, action: () => navigate('/sales?action=new') },
    { name: 'Purchases: Record New Material Receipt', category: 'Action', icon: <ArrowRight className="w-4 h-4 text-green-500" />, action: () => navigate('/purchases?action=new') },
    
    { name: 'System: Backup Database', category: 'Database', icon: <Database className="w-4 h-4 text-purple-500" />, action: triggerBackup },
    { name: 'System: Restore Database from Zip', category: 'Database', icon: <Database className="w-4 h-4 text-purple-500" />, action: triggerRestore },
    { name: 'System: Vacuum and Optimize SQLite Database', category: 'Database', icon: <Trash2 className="w-4 h-4 text-red-500" />, action: triggerVacuum },
    { name: 'System: View Diagnostic Panel', category: 'Database', icon: <Activity className="w-4 h-4 text-indigo-500" />, action: () => navigate('/diagnostics') },
    { name: 'System: View Application Log Logs', category: 'System', icon: <FileText className="w-4 h-4 text-amber-500" />, action: () => navigate('/log-viewer') },
    
    { name: 'Account: Logout from System', category: 'Account', icon: <LogOut className="w-4 h-4 text-red-500" />, action: () => { navigate('/login'); } }
  ];

  const filteredCommands = commands.filter(cmd => 
    cmd.name.toLowerCase().includes(query.toLowerCase()) || 
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-[3px] z-[9999] flex items-start justify-center pt-20 font-sans select-none animate-fadeIn">
      <div className="bg-white w-[680px] max-h-[500px] rounded-[10px] shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-[#E5E7EB] flex flex-col overflow-hidden animate-zoomIn">
        {/* Search header bar */}
        <div className="flex items-center gap-3 px-4 border-b border-[#E5E7EB] h-[52px] shrink-0 bg-[#FAFAFB]">
          <Terminal className="w-5 h-5 text-blue-600 animate-pulse" />
          <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">
            Command Palette
          </span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command to run..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-grow bg-transparent border-none text-sm text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:ring-0"
          />
          <span className="text-[10px] font-bold text-[#9CA3AF] bg-[#F3F4F6] px-2 py-1 rounded-[4px]">
            ESC
          </span>
        </div>

        {/* Command list body */}
        <div className="flex-1 overflow-y-auto p-2 bg-[#FCFCFD] max-h-[380px]">
          {filteredCommands.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#9CA3AF]">
              <span className="text-xl">⚠️</span>
              <p className="text-xs font-semibold text-[#6B7280] mt-1">No matching commands</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredCommands.map((cmd, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={cmd.name}
                    onClick={() => { cmd.action(); onClose(); }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-[6px] transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-[#2F80ED] text-white shadow-sm' 
                        : 'text-[#374151] hover:bg-[#F3F4F6]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-1 rounded-[4px] shrink-0 ${isSelected ? 'bg-white/20' : 'bg-gray-100'}`}>
                        {cmd.icon}
                      </div>
                      <span className="text-xs font-semibold truncate">{cmd.name}</span>
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-gray-200/80 text-[#6B7280]'
                    }`}>
                      {cmd.category}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
