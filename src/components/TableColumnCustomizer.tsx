import React, { useState, useEffect, useRef } from 'react';
import { SlidersHorizontal, Check } from 'lucide-react';

interface ColumnDef {
  key: string;
  label: string;
}

interface TableColumnCustomizerProps {
  tableName: string;
  columns: ColumnDef[];
  visibleColumns: string[];
  onChange: (visibleColumns: string[]) => void;
}

export function TableColumnCustomizer({ tableName, columns, visibleColumns, onChange }: TableColumnCustomizerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load visibility settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(`col_vis_${tableName}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          onChange(parsed);
        }
      } catch (err) {
        console.error('Failed to parse column visibility preferences:', err);
      }
    }
  }, [tableName]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleColumn = (key: string) => {
    let updated: string[];
    if (visibleColumns.includes(key)) {
      // Keep at least one column visible
      if (visibleColumns.length <= 1) return;
      updated = visibleColumns.filter(c => c !== key);
    } else {
      updated = [...visibleColumns, key];
    }
    onChange(updated);
    localStorage.setItem(`col_vis_${tableName}`, JSON.stringify(updated));
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 bg-white border border-[#E5E7EB] hover:bg-[#F6F8FB] text-[#1F2937] rounded-[6px] flex items-center gap-1.5 transition-colors cursor-pointer focus:outline-none shadow-sm text-xs font-semibold"
        title="Customize Columns"
      >
        <SlidersHorizontal className="w-4 h-4 text-[#6B7280]" />
        <span>Columns</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 bg-white border border-[#E5E7EB] rounded-[8px] shadow-lg z-50 p-2 text-slate-800 animate-fadeIn">
          <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider px-2 py-1 mb-1 border-b border-[#F3F4F6]">
            Toggle Table Columns
          </div>
          <div className="space-y-0.5 max-h-[220px] overflow-y-auto">
            {columns.map((col) => {
              const isVisible = visibleColumns.includes(col.key);
              return (
                <button
                  key={col.key}
                  type="button"
                  onClick={() => toggleColumn(col.key)}
                  className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-[#F3F4F6] rounded-[6px] text-left text-xs font-medium cursor-pointer transition-colors focus:outline-none"
                >
                  <span className="truncate">{col.label}</span>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                    isVisible 
                      ? 'bg-[#2F80ED] border-[#2F80ED] text-white' 
                      : 'border-gray-300'
                  }`}>
                    {isVisible && <Check className="w-3 h-3 stroke-[3px]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
