import React, { useState } from 'react';
import { X, Printer, FileText, Layout, Eye } from 'lucide-react';

interface PrintPreviewProps {
  title: string;
  htmlContent: string;
  onClose: () => void;
}

export function PrintPreview({ title, htmlContent, onClose }: PrintPreviewProps) {
  const [margin, setMargin] = useState<'standard' | 'none' | 'wide'>('standard');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  const getMarginStyle = () => {
    switch (margin) {
      case 'none': return 'p-0';
      case 'wide': return 'p-12';
      default: return 'p-8';
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Inject styles and content
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page {
              size: A4 ${orientation};
              margin: ${margin === 'none' ? '0' : margin === 'wide' ? '25mm' : '15mm'};
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #1f2937;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            /* Copy of base styles if any */
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
              font-size: 13px;
            }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 8px 10px;
              text-align: left;
            }
            th {
              background-color: #f3f4f6;
              font-weight: 600;
            }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .mt-4 { margin-top: 16px; }
            .mb-2 { margin-bottom: 8px; }
            .text-center { text-align: center; }
            .invoice-header {
              display: flex;
              justify-content: space-between;
              border-bottom: 2px solid #3b82f6;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .badge {
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: bold;
            }
            .badge-active { background-color: #d1fae5; color: #065f46; }
          </style>
        </head>
        <body>
          <div style="width: 100%; max-width: 800px; margin: 0 auto;">
            ${htmlContent}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[9999] flex items-center justify-center p-6 font-sans select-none animate-fadeIn">
      <div className="bg-[#1E293B] w-[95%] max-w-[1000px] h-[90vh] rounded-[12px] shadow-2xl flex flex-col overflow-hidden text-white border border-slate-700">
        
        {/* Top Control Bar */}
        <div className="h-[56px] border-b border-slate-800 bg-[#0F172A] px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-sm">Print Preview — {title}</span>
          </div>

          {/* Quick Print Options */}
          <div className="flex items-center gap-6">
            {/* Orientation */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Layout:</span>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 text-xs rounded px-2.5 py-1 text-white focus:outline-none cursor-pointer"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>

            {/* Margins */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Margins:</span>
              <select
                value={margin}
                onChange={(e) => setMargin(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 text-xs rounded px-2.5 py-1 text-white focus:outline-none cursor-pointer"
              >
                <option value="standard">Standard</option>
                <option value="none">None</option>
                <option value="wide">Wide</option>
              </select>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
              <button
                onClick={handlePrint}
                className="bg-[#2F80ED] hover:bg-[#1B6FD1] text-white text-xs font-bold px-4 py-1.5 rounded flex items-center gap-1.5 cursor-pointer focus:outline-none transition-colors shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" /> Print Document
              </button>
              <button
                onClick={onClose}
                className="bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold px-3 py-1.5 rounded cursor-pointer focus:outline-none transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Viewport Area */}
        <div className="flex-1 bg-[#0F172A] overflow-y-auto p-8 flex items-start justify-center">
          {/* Mock A4 Paper Viewport */}
          <div
            className={`bg-white text-slate-850 shadow-2xl rounded border border-gray-200 select-text overflow-hidden transition-all duration-200 ${getMarginStyle()} ${
              orientation === 'portrait' ? 'w-[750px] min-h-[1060px]' : 'w-[1060px] min-h-[750px]'
            }`}
            style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}
          >
            {/* Content Injection */}
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
          </div>
        </div>
      </div>
    </div>
  );
}
