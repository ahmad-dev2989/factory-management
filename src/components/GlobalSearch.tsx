import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Package, UserCheck, Users, Landmark, ShoppingCart, Truck, ArrowDownCircle, FileText } from 'lucide-react';

interface GlobalSearchProps {
  onClose: () => void;
}

interface SearchResult {
  id: string | number;
  title: string;
  subtitle: string;
  category: 'Products' | 'Customers' | 'Employees' | 'Sales' | 'Purchases' | 'Bank Accounts' | 'Cash In' | 'Cash Out' | 'Reports';
  route: string;
}

export function GlobalSearch({ onClose }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeTab, setActiveTab] = useState<string>('All');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const modalRef = useRef<HTMLDivElement>(null);
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

  // Execute database search queries when typing
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      const searchVal = `%${query.trim()}%`;
      
      try {
        const dbQuery = (window as any).electron.invoke;
        const searchPromises = [
          // 1. Products
          dbQuery('db-query', `
            SELECT id, sku, name, stock, unit FROM products 
            WHERE name LIKE ? OR sku LIKE ? OR description LIKE ? LIMIT 5
          `, [searchVal, searchVal, searchVal]).then((rows: any[]) => 
            (rows || []).map(r => ({
              id: `prod-${r.id}`,
              title: r.name,
              subtitle: `SKU: ${r.sku} | Stock: ${r.stock} ${r.unit}`,
              category: 'Products' as const,
              route: `/products?search=${r.sku}`
            }))
          ),

          // 2. Customers
          dbQuery('db-query', `
            SELECT id, company_name, contact_person, phone FROM customers 
            WHERE company_name LIKE ? OR contact_person LIKE ? OR phone LIKE ? LIMIT 5
          `, [searchVal, searchVal, searchVal]).then((rows: any[]) => 
            (rows || []).map(r => ({
              id: `cust-${r.id}`,
              title: r.company_name,
              subtitle: `Contact: ${r.contact_person || 'N/A'} | Phone: ${r.phone || 'N/A'}`,
              category: 'Customers' as const,
              route: `/customers?search=${r.company_name}`
            }))
          ),

          // 3. Employees
          dbQuery('db-query', `
            SELECT id, full_name, emp_code, designation FROM employees 
            WHERE full_name LIKE ? OR emp_code LIKE ? OR designation LIKE ? LIMIT 5
          `, [searchVal, searchVal, searchVal]).then((rows: any[]) => 
            (rows || []).map(r => ({
              id: `emp-${r.id}`,
              title: r.full_name,
              subtitle: `Code: ${r.emp_code} | Designation: ${r.designation}`,
              category: 'Employees' as const,
              route: `/employees?search=${r.emp_code}`
            }))
          ),

          // 4. Sales
          dbQuery('db-query', `
            SELECT s.id, s.invoice_number, s.grand_total, s.date, c.company_name 
            FROM sales s 
            LEFT JOIN customers c ON s.customer_id = c.id
            WHERE s.invoice_number LIKE ? OR s.remarks LIKE ? OR c.company_name LIKE ? LIMIT 5
          `, [searchVal, searchVal, searchVal]).then((rows: any[]) => 
            (rows || []).map(r => ({
              id: `sale-${r.id}`,
              title: `Invoice #${r.invoice_number}`,
              subtitle: `Customer: ${r.company_name} | Total: Rs. ${r.grand_total.toLocaleString()} | Date: ${r.date}`,
              category: 'Sales' as const,
              route: `/sales?search=${r.invoice_number}`
            }))
          ),

          // 5. Purchases
          dbQuery('db-query', `
            SELECT id, purchase_number, grand_total, date, vendor_name FROM purchases 
            WHERE purchase_number LIKE ? OR vendor_name LIKE ? OR remarks LIKE ? LIMIT 5
          `, [searchVal, searchVal, searchVal]).then((rows: any[]) => 
            (rows || []).map(r => ({
              id: `pur-${r.id}`,
              title: `Purchase Receipt #${r.purchase_number}`,
              subtitle: `Vendor: ${r.vendor_name} | Total: Rs. ${r.grand_total.toLocaleString()} | Date: ${r.date}`,
              category: 'Purchases' as const,
              route: `/purchases?search=${r.purchase_number}`
            }))
          ),

          // 6. Bank Accounts
          dbQuery('db-query', `
            SELECT id, name, bank_name, account_number, current_balance FROM bank_accounts 
            WHERE name LIKE ? OR bank_name LIKE ? OR account_number LIKE ? LIMIT 5
          `, [searchVal, searchVal, searchVal]).then((rows: any[]) => 
            (rows || []).map(r => ({
              id: `bank-${r.id}`,
              title: r.name,
              subtitle: `${r.bank_name || 'Cash'} | Acc: ${r.account_number || 'Cash Account'} | Bal: Rs. ${r.current_balance.toLocaleString()}`,
              category: 'Bank Accounts' as const,
              route: `/bank-accounts?search=${r.name}`
            }))
          ),

          // 7. Cash In
          dbQuery('db-query', `
            SELECT id, voucher_number, received_from, amount, date FROM cash_in 
            WHERE voucher_number LIKE ? OR received_from LIKE ? OR category LIKE ? OR remarks LIKE ? LIMIT 5
          `, [searchVal, searchVal, searchVal, searchVal]).then((rows: any[]) => 
            (rows || []).map(r => ({
              id: `cashin-${r.id}`,
              title: `Cash Receipt #${r.voucher_number}`,
              subtitle: `From: ${r.received_from} | Amount: Rs. ${r.amount.toLocaleString()} | Date: ${r.date}`,
              category: 'Cash In' as const,
              route: `/cash-in?search=${r.voucher_number}`
            }))
          ),

          // 8. Cash Out
          dbQuery('db-query', `
            SELECT id, voucher_number, paid_to, amount, date FROM cash_out 
            WHERE voucher_number LIKE ? OR paid_to LIKE ? OR category LIKE ? OR remarks LIKE ? LIMIT 5
          `, [searchVal, searchVal, searchVal, searchVal]).then((rows: any[]) => 
            (rows || []).map(r => ({
              id: `cashout-${r.id}`,
              title: `Cash Payment #${r.voucher_number}`,
              subtitle: `Paid To: ${r.paid_to} | Amount: Rs. ${r.amount.toLocaleString()} | Date: ${r.date}`,
              category: 'Cash Out' as const,
              route: `/cash-out?search=${r.voucher_number}`
            }))
          )
        ];

        const allResults = await Promise.all(searchPromises);
        let flatResults = allResults.flat() as SearchResult[];

        // Add matching reports static results
        const reports = [
          { title: 'Sales Report', subtitle: 'View billing history, invoices, and sales performance summaries', route: '/reports?tab=sales' },
          { title: 'Purchases Report', subtitle: 'Analyze raw materials stock receipts, vendor invoices, and purchase ledger', route: '/reports?tab=purchases' },
          { title: 'Cash Book Report', subtitle: 'Detailed ledger of cash & bank movements, net inflows, and balance trends', route: '/reports?tab=cashbook' },
          { title: 'Profit & Loss Statement', subtitle: 'Generate detailed profitability report with revenues and expense classifications', route: '/reports?tab=profit' },
          { title: 'Stock / Inventory Report', subtitle: 'Review current product stock valuations and low-stock indicators', route: '/reports?tab=inventory' }
        ];

        const queryLower = query.toLowerCase();
        const matchedReports = reports
          .filter(rep => rep.title.toLowerCase().includes(queryLower) || rep.subtitle.toLowerCase().includes(queryLower))
          .map((rep, idx) => ({
            id: `rep-${idx}`,
            title: rep.title,
            subtitle: rep.subtitle,
            category: 'Reports' as const,
            route: rep.route
          }));

        flatResults = [...flatResults, ...matchedReports];
        setResults(flatResults);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const filteredResults = activeTab === 'All' 
    ? results 
    : results.filter(r => r.category === activeTab);

  const handleSelect = (result: SearchResult) => {
    navigate(result.route);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredResults.length) % Math.max(1, filteredResults.length));
    } else if (e.key === 'Enter') {
      if (filteredResults[selectedIndex]) {
        handleSelect(filteredResults[selectedIndex]);
      }
    }
  };

  const tabs = ['All', 'Products', 'Customers', 'Employees', 'Sales', 'Purchases', 'Bank Accounts', 'Cash In', 'Cash Out', 'Reports'];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Products': return <Package className="w-4 h-4 text-orange-500" />;
      case 'Customers': return <UserCheck className="w-4 h-4 text-green-500" />;
      case 'Employees': return <Users className="w-4 h-4 text-blue-500" />;
      case 'Bank Accounts': return <Landmark className="w-4 h-4 text-teal-500" />;
      case 'Sales': return <ShoppingCart className="w-4 h-4 text-indigo-500" />;
      case 'Purchases': return <Truck className="w-4 h-4 text-purple-500" />;
      case 'Reports': return <FileText className="w-4 h-4 text-red-500" />;
      default: return <ArrowDownCircle className="w-4 h-4 text-emerald-500" />;
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 bg-black/55 backdrop-blur-[4px] z-[9999] flex items-start justify-center pt-24 font-sans select-none animate-fadeIn"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-[750px] max-h-[580px] rounded-[12px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-[#E5E7EB] flex flex-col overflow-hidden animate-zoomIn"
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 border-b border-[#E5E7EB] h-[56px] shrink-0">
          <Search className="w-5 h-5 text-[#9CA3AF]" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search products, invoices, vendors, employees, accounts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-grow bg-transparent border-none text-base text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:ring-0"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="p-1 hover:bg-[#F3F4F6] rounded-full transition-colors focus:outline-none"
            >
              <X className="w-4 h-4 text-[#6B7280]" />
            </button>
          )}
          <button 
            type="button"
            onClick={onClose}
            className="text-[10px] font-bold text-[#9CA3AF] bg-[#F3F4F6] hover:bg-[#E5E7EB] px-2 py-1 rounded-[4px] select-none cursor-pointer focus:outline-none"
          >
            ESC
          </button>
        </div>

        {/* Categories Tab Bar */}
        {query && (
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[#F3F4F6] overflow-x-auto shrink-0 scrollbar-none bg-[#FAFAFB]">
            {tabs.map(tab => {
              const count = tab === 'All' ? results.length : results.filter(r => r.category === tab).length;
              if (tab !== 'All' && count === 0) return null;
              
              const isSelected = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setSelectedIndex(0); }}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-all flex items-center gap-1 cursor-pointer focus:outline-none whitespace-nowrap ${
                    isSelected 
                      ? 'bg-[#2F80ED] text-white' 
                      : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#1F2937]'
                  }`}
                >
                  {tab}
                  <span className={`text-[10px] rounded-full px-1.5 py-0.2 font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-[#4B5563]'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Search Results Body */}
        <div className="flex-1 overflow-y-auto p-2 min-h-[150px] max-h-[420px] bg-[#FDFDFD]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-[#9CA3AF]">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-medium">Searching SQLite database...</span>
            </div>
          ) : !query.trim() ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#9CA3AF] gap-2 text-center px-8">
              <Search className="w-8 h-8 text-[#D1D5DB]" />
              <p className="text-sm font-semibold text-[#6B7280]">Universal Instant Search</p>
              <p className="text-xs text-[#9CA3AF] max-w-[380px]">Type to fetch products, customers, bills, vouchers, banks, ledger descriptions, and reports instantly.</p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#9CA3AF] gap-1 text-center">
              <span className="text-2xl">🔍</span>
              <p className="text-sm font-semibold text-[#6B7280]">No matching records found</p>
              <p className="text-xs text-[#9CA3AF]">Check spelling or try a different term.</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredResults.map((res, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={res.id}
                    onClick={() => handleSelect(res)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex items-start gap-3 p-3 rounded-[8px] transition-all cursor-pointer select-none ${
                      isSelected 
                        ? 'bg-[#EEF5FF] border-[#2F80ED]/30' 
                        : 'hover:bg-[#F9FAFB]'
                    }`}
                  >
                    <div className={`p-1.5 rounded-[6px] shrink-0 ${isSelected ? 'bg-white shadow-sm' : 'bg-gray-100'}`}>
                      {getCategoryIcon(res.category)}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-[#1F2937] truncate">{res.title}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded text-[#6B7280]">
                          {res.category}
                        </span>
                      </div>
                      <p className="text-xs text-[#6B7280] truncate mt-0.5">{res.subtitle}</p>
                    </div>
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
