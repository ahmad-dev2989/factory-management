import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wifi,
  Bell,
  Mail,
  LogOut,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Package,
  ArrowRight,
  Settings,
  Plus,
  AlertTriangle,
  Database
} from 'lucide-react';
import { SidebarToggle } from '../components/Sidebar';

interface SummaryStats {
  todaySales: number;
  todayPurchases: number;
  cashInHand: number;
  totalBankBalance: number;
  todayCashIn: number;
  todayCashOut: number;
  receivables: number;
  payables: number;
  inventoryValue: number;
  todayNetProfit: number;
}

interface ChartItem {
  label: string;
  value: number;
  value2?: number; // for comparison
}

interface ActivityItem {
  id: number;
  date: string;
  ref: string;
  description: string;
  amount: number;
  type: 'Sale' | 'Purchase' | 'Cash In' | 'Cash Out';
  status: string;
}

interface LowStockItem {
  id: number;
  name: string;
  stock: number;
  minStock: number;
  sku: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [currencySymbol, setCurrencySymbol] = useState('Rs.');
  
  // Data States
  const [stats, setStats] = useState<SummaryStats>({
    todaySales: 0,
    todayPurchases: 0,
    cashInHand: 0,
    totalBankBalance: 0,
    todayCashIn: 0,
    todayCashOut: 0,
    receivables: 0,
    payables: 0,
    inventoryValue: 0,
    todayNetProfit: 0
  });

  const [salesHistory, setSalesHistory] = useState<ChartItem[]>([]);
  const [purchasesHistory, setPurchasesHistory] = useState<ChartItem[]>([]);
  const [cashFlowHistory, setCashFlowHistory] = useState<ChartItem[]>([]);
  const [topProducts, setTopProducts] = useState<ChartItem[]>([]);
  const [monthlyProfit, setMonthlyProfit] = useState<ChartItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockItem[]>([]);

  // Tooltip state for SVG charts
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string; visible: boolean }>({
    x: 0,
    y: 0,
    text: '',
    visible: false
  });

  const formatCurrency = (val: number) => {
    return `${currencySymbol} ${val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const fetchDashboardData = async () => {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);

      // Load Settings & Currency preference
      const prefRes = await (window as any).electron.invoke(
        'db-query',
        "SELECT value FROM app_settings WHERE key = 'system_preferences_config'"
      );
      if (prefRes && prefRes[0] && prefRes[0].value) {
        const parsed = JSON.parse(prefRes[0].value);
        if (parsed.currencySymbol) {
          setCurrencySymbol(parsed.currencySymbol);
        }
      }

      // 1. Today's Sales
      const salesRes = await (window as any).electron.invoke(
        'db-query',
        "SELECT SUM(grand_total) AS total FROM sales WHERE status = 'Active' AND date = ?",
        [todayStr]
      );
      const todaySales = salesRes && salesRes[0] ? (Number(salesRes[0].total) || 0) : 0;

      // 2. Today's Purchases
      const purchRes = await (window as any).electron.invoke(
        'db-query',
        "SELECT SUM(grand_total) AS total FROM purchases WHERE status = 'Active' AND date = ?",
        [todayStr]
      );
      const todayPurchases = purchRes && purchRes[0] ? (Number(purchRes[0].total) || 0) : 0;

      // 3. Cash in Hand
      const cashRes = await (window as any).electron.invoke(
        'db-query',
        "SELECT current_balance FROM bank_accounts WHERE name = 'Cash' OR type = 'Cash' LIMIT 1"
      );
      const cashInHand = cashRes && cashRes[0] ? (Number(cashRes[0].current_balance) || 0) : 0;

      // 4. Bank Balances (Excluding Cash)
      const bankRes = await (window as any).electron.invoke(
        'db-query',
        "SELECT SUM(current_balance) AS total FROM bank_accounts WHERE name != 'Cash' AND type != 'Cash'"
      );
      const totalBankBalance = bankRes && bankRes[0] ? (Number(bankRes[0].total) || 0) : 0;

      // 5. Today's Cash In
      const cashInRes = await (window as any).electron.invoke(
        'db-query',
        "SELECT SUM(amount) AS total FROM cash_in WHERE status = 'Active' AND date = ?",
        [todayStr]
      );
      const todayCashIn = cashInRes && cashInRes[0] ? (Number(cashInRes[0].total) || 0) : 0;

      // 6. Today's Cash Out
      const cashOutRes = await (window as any).electron.invoke(
        'db-query',
        "SELECT SUM(amount) AS total FROM cash_out WHERE status = 'Active' AND category != 'Supplier Payment' AND date = ?",
        [todayStr]
      );
      const todayCashOut = cashOutRes && cashOutRes[0] ? (Number(cashOutRes[0].total) || 0) : 0;

      // 7. Current Receivables
      const recRes = await (window as any).electron.invoke(
        'db-query',
        "SELECT SUM(current_balance) AS total FROM customers WHERE status = 'Active' AND current_balance > 0"
      );
      const receivables = recRes && recRes[0] ? (Number(recRes[0].total) || 0) : 0;

      // 8. Current Payables
      const payRes = await (window as any).electron.invoke(
        'db-query',
        "SELECT SUM(remaining_amount) AS total FROM purchases WHERE status = 'Active' AND remaining_amount > 0"
      );
      const payables = payRes && payRes[0] ? (Number(payRes[0].total) || 0) : 0;

      // 9. Inventory Asset Value
      const invRes = await (window as any).electron.invoke(
        'db-query',
        "SELECT SUM(stock * purchase_price) AS total FROM products WHERE status = 'Active' AND stock > 0"
      );
      const inventoryValue = invRes && invRes[0] ? (Number(invRes[0].total) || 0) : 0;

      // 10. Today's P&L (Sales - COGS - Expenses)
      const cogsRes = await (window as any).electron.invoke(
        'db-query',
        `SELECT SUM(si.quantity * p.purchase_price) AS total_cogs 
         FROM sale_items si
         LEFT JOIN sales s ON si.sale_id = s.id
         LEFT JOIN products p ON si.product_id = p.id
         WHERE s.status = 'Active' AND s.date = ?`,
        [todayStr]
      );
      const todayCogs = cogsRes && cogsRes[0] ? (Number(cogsRes[0].total_cogs) || 0) : 0;
      const todayNetProfit = todaySales - todayCogs - todayCashOut;

      setStats({
        todaySales,
        todayPurchases,
        cashInHand,
        totalBankBalance,
        todayCashIn,
        todayCashOut,
        receivables,
        payables,
        inventoryValue,
        todayNetProfit
      });

      // --- Chart Queries (Last 30 Days dates array) ---
      const d30 = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d30.push(d.toISOString().slice(0, 10));
      }

      // Sales Last 30 Days
      const salesHistoryRes = await (window as any).electron.invoke(
        'db-query',
        `SELECT date, SUM(grand_total) AS total 
         FROM sales 
         WHERE status = 'Active' AND date >= ?
         GROUP BY date`,
        [d30[0]]
      );
      const salesMap = new Map<string, number>(salesHistoryRes?.map((x: any) => [x.date, Number(x.total) || 0]) || []);
      setSalesHistory(d30.map((d) => ({
        label: d.slice(8, 10) + '/' + d.slice(5, 7),
        value: salesMap.get(d) || 0
      })));

      // Purchases Last 30 Days
      const purchHistoryRes = await (window as any).electron.invoke(
        'db-query',
        `SELECT date, SUM(grand_total) AS total 
         FROM purchases 
         WHERE status = 'Active' AND date >= ?
         GROUP BY date`,
        [d30[0]]
      );
      const purchMap = new Map<string, number>(purchHistoryRes?.map((x: any) => [x.date, Number(x.total) || 0]) || []);
      setPurchasesHistory(d30.map((d) => ({
        label: d.slice(8, 10),
        value: purchMap.get(d) || 0
      })));

      // Cash Flow (In vs Out) Last 30 Days
      const cInHistoryRes = await (window as any).electron.invoke(
        'db-query',
        `SELECT date, SUM(amount) AS total FROM cash_in WHERE status = 'Active' AND date >= ? GROUP BY date`,
        [d30[0]]
      );
      const cOutHistoryRes = await (window as any).electron.invoke(
        'db-query',
        `SELECT date, SUM(amount) AS total FROM cash_out WHERE status = 'Active' AND date >= ? GROUP BY date`,
        [d30[0]]
      );
      const cInMap = new Map<string, number>(cInHistoryRes?.map((x: any) => [x.date, Number(x.total) || 0]) || []);
      const cOutMap = new Map<string, number>(cOutHistoryRes?.map((x: any) => [x.date, Number(x.total) || 0]) || []);
      setCashFlowHistory(d30.map((d) => ({
        label: d.slice(8, 10),
        value: cInMap.get(d) || 0,
        value2: cOutMap.get(d) || 0
      })));

      // Top Selling Products (Top 5)
      const topProdRes = await (window as any).electron.invoke(
        'db-query',
        `SELECT p.name, SUM(si.quantity) AS total_qty
         FROM sale_items si
         LEFT JOIN sales s ON si.sale_id = s.id
         LEFT JOIN products p ON si.product_id = p.id
         WHERE s.status = 'Active'
         GROUP BY si.product_id
         ORDER BY total_qty DESC
         LIMIT 5`
      );
      setTopProducts((topProdRes || []).map((x: any) => ({
        label: x.name || 'Unknown',
        value: Number(x.total_qty) || 0
      })));

      // Monthly Profit (Last 6 Months)
      const m6 = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const yMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        m6.push({
          yMonth,
          label: d.toLocaleString('en-US', { month: 'short' }) + ' ' + d.getFullYear().toString().slice(2)
        });
      }

      const monthlyStats = await Promise.all(m6.map(async (m) => {
        const sM = await (window as any).electron.invoke('db-query', "SELECT SUM(grand_total) AS total FROM sales WHERE status = 'Active' AND STRFTIME('%Y-%m', date) = ?", [m.yMonth]);
        const cogsM = await (window as any).electron.invoke('db-query', `
          SELECT SUM(si.quantity * p.purchase_price) AS total_cogs 
          FROM sale_items si 
          LEFT JOIN sales s ON si.sale_id = s.id 
          LEFT JOIN products p ON si.product_id = p.id 
          WHERE s.status = 'Active' AND STRFTIME('%Y-%m', s.date) = ?
        `, [m.yMonth]);
        const expM = await (window as any).electron.invoke('db-query', "SELECT SUM(amount) AS total FROM cash_out WHERE status = 'Active' AND category != 'Supplier Payment' AND STRFTIME('%Y-%m', date) = ?", [m.yMonth]);

        const sales = sM && sM[0] ? (Number(sM[0].total) || 0) : 0;
        const cogs = cogsM && cogsM[0] ? (Number(cogsM[0].total_cogs) || 0) : 0;
        const exp = expM && expM[0] ? (Number(expM[0].total) || 0) : 0;
        const profit = sales - cogs - exp;

        return {
          label: m.label,
          value: profit
        };
      }));
      setMonthlyProfit(monthlyStats);

      // --- Recent Activities ---
      const recentSales = await (window as any).electron.invoke('db-query', "SELECT id, date, invoice_number AS ref, 'Customer Sale' AS description, grand_total AS amount, status FROM sales ORDER BY id DESC LIMIT 5");
      const recentPurch = await (window as any).electron.invoke('db-query', "SELECT id, date, purchase_number AS ref, 'Stock Purchase' AS description, grand_total AS amount, status FROM purchases ORDER BY id DESC LIMIT 5");
      const recentCashIn = await (window as any).electron.invoke('db-query', "SELECT id, date, voucher_number AS ref, category || ': ' || received_from AS description, amount, status FROM cash_in ORDER BY id DESC LIMIT 5");
      const recentCashOut = await (window as any).electron.invoke('db-query', "SELECT id, date, voucher_number AS ref, category || ': ' || paid_to AS description, amount, status FROM cash_out ORDER BY id DESC LIMIT 5");

      const actSales = (recentSales || []).map((x: any) => ({ ...x, type: 'Sale' as const }));
      const actPurch = (recentPurch || []).map((x: any) => ({ ...x, type: 'Purchase' as const }));
      const actIn = (recentCashIn || []).map((x: any) => ({ ...x, type: 'Cash In' as const }));
      const actOut = (recentCashOut || []).map((x: any) => ({ ...x, type: 'Cash Out' as const }));

      const mergedActs: ActivityItem[] = [...actSales, ...actPurch, ...actIn, ...actOut];
      mergedActs.sort((a, b) => b.date.localeCompare(a.date));
      setActivities(mergedActs.slice(0, 5));

      // --- Low Stock Products ---
      const lowStockRes = await (window as any).electron.invoke(
        'db-query',
        `SELECT id, name, stock, minimum_stock AS minStock, sku 
         FROM products 
         WHERE status = 'Active' AND stock <= minimum_stock 
         ORDER BY stock ASC 
         LIMIT 5`
      );
      setLowStockProducts(lowStockRes || []);

    } catch (err) {
      console.error('[Dashboard] Error retrieving live stats:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Setup 10-second auto-refresh polling interval
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleBackupDb = async () => {
    navigate('/backup-restore');
  };

  // Helper: SVG Line coordinates generator for Sales history
  const salesHistorySVGPoints = useMemo(() => {
    if (salesHistory.length === 0) return [];
    const maxVal = Math.max(...salesHistory.map((x) => x.value)) || 100;
    const paddingX = 40;
    const paddingY = 20;
    const width = 460;
    const height = 160;

    const points = salesHistory.map((pt, idx) => {
      const x = paddingX + (idx / (salesHistory.length - 1)) * (width - paddingX * 2);
      const y = height - paddingY - (pt.value / maxVal) * (height - paddingY * 2);
      return { x, y };
    });

    return points;
  }, [salesHistory]);

  const salesLinePath = useMemo(() => {
    if (salesHistorySVGPoints.length === 0) return '';
    return salesHistorySVGPoints.map((pt: any, i: number) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
  }, [salesHistorySVGPoints]);

  const salesAreaPath = useMemo(() => {
    if (salesHistorySVGPoints.length === 0) return '';
    const startX = salesHistorySVGPoints[0].x;
    const endX = salesHistorySVGPoints[salesHistorySVGPoints.length - 1].x;
    const floorY = 140; // height - paddingY
    return `${salesLinePath} L ${endX} ${floorY} L ${startX} ${floorY} Z`;
  }, [salesHistorySVGPoints, salesLinePath]);

  return (
    <div className="flex-1 flex flex-col bg-[#F6F8FB] select-none min-h-screen">
      {/* Header */}
      <header className="h-[60px] bg-[#2F80ED] text-white flex items-center justify-between px-5 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <SidebarToggle />
          <span className="font-semibold text-lg tracking-wide">Factory App</span>
        </div>
        
        {/* Navigation Middle Bar */}
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <span className="bg-white/10 px-3 py-1.5 rounded-[6px] tracking-wide text-white select-none">
            🏠 Business Dashboard
          </span>
          <button
            onClick={() => navigate('/settings')}
            className="px-3 py-1.5 hover:bg-white/10 text-white/90 hover:text-white rounded-[6px] transition-all flex items-center gap-1.5 cursor-pointer focus:outline-none"
          >
            <Settings className="w-4 h-4" /> System Settings
          </button>
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-4 text-white/80 border-r border-white/20 pr-4">
            <button className="hover:text-white p-1 rounded transition-colors focus:outline-none" title="Network Connection">
              <Wifi className="w-[18px] h-[18px]" />
            </button>
            <button className="hover:text-white p-1 rounded transition-colors focus:outline-none relative" title="Notifications">
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-red-400 rounded-full"></span>
            </button>
            <button className="hover:text-white p-1 rounded transition-colors focus:outline-none" title="Messages">
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
            <button
              onClick={() => navigate('/login')}
              className="hover:bg-white/10 p-1.5 rounded transition-colors cursor-pointer focus:outline-none flex items-center justify-center text-white/90 hover:text-white"
              title="Logout"
            >
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Stats Summary & Actions */}
      <main className="flex-grow p-8 overflow-y-auto space-y-6">
        <div className="max-w-[1600px] w-full mx-auto space-y-6">

          {/* Quick Actions Panel */}
          <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-sm p-4 flex flex-wrap items-center justify-between gap-4 select-none">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <span className="text-blue-500 font-extrabold">🚀</span> Quick Actions Toolbar
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => navigate('/sales')}
                className="px-3.5 py-2 bg-[#2F80ED] hover:bg-[#1B6FD1] text-white text-xs font-bold rounded-[6px] flex items-center gap-1.5 transition-colors cursor-pointer focus:outline-none shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> New Sale
              </button>
              <button
                onClick={() => navigate('/purchases')}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-[6px] flex items-center gap-1.5 transition-colors cursor-pointer focus:outline-none shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> New Purchase
              </button>
              <button
                onClick={() => navigate('/cash-in')}
                className="px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-[6px] flex items-center gap-1.5 transition-colors cursor-pointer focus:outline-none shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> New Cash In
              </button>
              <button
                onClick={() => navigate('/cash-out')}
                className="px-3.5 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-[6px] flex items-center gap-1.5 transition-colors cursor-pointer focus:outline-none shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> New Cash Out
              </button>
              <button
                onClick={() => navigate('/products')}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-[6px] flex items-center gap-1.5 transition-colors cursor-pointer focus:outline-none shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> New Product
              </button>
              <button
                onClick={handleBackupDb}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-[6px] flex items-center gap-1.5 transition-colors cursor-pointer focus:outline-none shadow-sm"
              >
                <Database className="w-3.5 h-3.5" /> Backup DB
              </button>
            </div>
          </div>

          {/* Top Summary Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
            
            {/* Card 1: Today's Sales */}
            <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-5 shadow-sm space-y-2 relative overflow-hidden flex flex-col justify-between">
              <div className="flex justify-between items-center text-gray-400 select-none">
                <span className="text-[10px] font-bold tracking-widest uppercase">Today's Revenue</span>
                <ShoppingCart className="w-4 h-4 text-blue-500" />
              </div>
              <h2 className="text-base font-black text-[#1F2937] leading-none tracking-tight">
                {formatCurrency(stats.todaySales)}
              </h2>
              <p className="text-[9px] text-gray-500 font-semibold tracking-wider select-none">
                Active customer sales invoices
              </p>
            </div>

            {/* Card 2: Today's Purchases */}
            <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-5 shadow-sm space-y-2 relative overflow-hidden flex flex-col justify-between">
              <div className="flex justify-between items-center text-gray-400 select-none">
                <span className="text-[10px] font-bold tracking-widest uppercase">Today's Purchases</span>
                <ShoppingCart className="w-4 h-4 rotate-180 text-amber-500" />
              </div>
              <h2 className="text-base font-black text-[#1F2937] leading-none tracking-tight">
                {formatCurrency(stats.todayPurchases)}
              </h2>
              <p className="text-[9px] text-gray-500 font-semibold tracking-wider select-none">
                Active supplier inventory costs
              </p>
            </div>

            {/* Card 3: Cash In Hand */}
            <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-5 shadow-sm space-y-2 relative overflow-hidden flex flex-col justify-between">
              <div className="flex justify-between items-center text-gray-400 select-none">
                <span className="text-[10px] font-bold tracking-widest uppercase">Cash In Hand</span>
                <DollarSign className="w-4 h-4 text-green-600" />
              </div>
              <h2 className="text-base font-black text-[#27AE60] leading-none tracking-tight">
                {formatCurrency(stats.cashInHand)}
              </h2>
              <p className="text-[9px] text-gray-500 font-semibold tracking-wider select-none">
                Current local cash account balance
              </p>
            </div>

            {/* Card 4: Total Bank Balance */}
            <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-5 shadow-sm space-y-2 relative overflow-hidden flex flex-col justify-between">
              <div className="flex justify-between items-center text-gray-400 select-none">
                <span className="text-[10px] font-bold tracking-widest uppercase">Bank Balance</span>
                <DollarSign className="w-4 h-4 text-[#2F80ED]" />
              </div>
              <h2 className="text-base font-black text-[#2f80ed] leading-none tracking-tight">
                {formatCurrency(stats.totalBankBalance)}
              </h2>
              <p className="text-[9px] text-gray-500 font-semibold tracking-wider select-none">
                Sum of active bank and deposit balances
              </p>
            </div>

            {/* Card 5: Net Profit Today */}
            <div className="bg-white border border-green-200 bg-green-50/15 rounded-[10px] p-5 shadow-sm space-y-2 relative overflow-hidden flex flex-col justify-between">
              <div className="flex justify-between items-center text-gray-400 select-none">
                <span className="text-[10px] font-bold tracking-widest uppercase text-green-800">Net Profit (Today)</span>
                <TrendingUp className="w-4 h-4 text-green-700" />
              </div>
              <h2 className="text-base font-black text-green-700 leading-none tracking-tight">
                {formatCurrency(stats.todayNetProfit)}
              </h2>
              <p className="text-[9px] text-gray-500 font-semibold tracking-wider select-none">
                Revenue - COGS - Expenses today
              </p>
            </div>

            {/* Card 6: Today's Inflow */}
            <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-5 shadow-sm space-y-2 relative overflow-hidden flex flex-col justify-between">
              <div className="flex justify-between items-center text-gray-400 select-none">
                <span className="text-[10px] font-bold tracking-widest uppercase">Today's Inflows</span>
                <Plus className="w-4 h-4 text-green-600" />
              </div>
              <h2 className="text-base font-black text-[#1F2937] leading-none tracking-tight">
                {formatCurrency(stats.todayCashIn)}
              </h2>
              <p className="text-[9px] text-gray-500 font-semibold tracking-wider select-none">
                Total cash receipt vouchers today
              </p>
            </div>

            {/* Card 7: Today's Outflow */}
            <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-5 shadow-sm space-y-2 relative overflow-hidden flex flex-col justify-between">
              <div className="flex justify-between items-center text-gray-400 select-none">
                <span className="text-[10px] font-bold tracking-widest uppercase">Today's Outflows</span>
                <ArrowRight className="w-4 h-4 rotate-90 text-red-500" />
              </div>
              <h2 className="text-base font-black text-[#1F2937] leading-none tracking-tight">
                {formatCurrency(stats.todayCashOut)}
              </h2>
              <p className="text-[9px] text-gray-500 font-semibold tracking-wider select-none">
                Total cash expenses recorded today
              </p>
            </div>

            {/* Card 8: Receivables */}
            <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-5 shadow-sm space-y-2 relative overflow-hidden flex flex-col justify-between">
              <div className="flex justify-between items-center text-gray-400 select-none">
                <span className="text-[10px] font-bold tracking-widest uppercase">Outstanding Receivables</span>
                <DollarSign className="w-4 h-4 text-red-500" />
              </div>
              <h2 className="text-base font-black text-red-500 leading-none tracking-tight">
                {formatCurrency(stats.receivables)}
              </h2>
              <p className="text-[9px] text-gray-500 font-semibold tracking-wider select-none">
                Unpaid balances from active customers
              </p>
            </div>

            {/* Card 9: Payables */}
            <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-5 shadow-sm space-y-2 relative overflow-hidden flex flex-col justify-between">
              <div className="flex justify-between items-center text-gray-400 select-none">
                <span className="text-[10px] font-bold tracking-widest uppercase">Outstanding Payables</span>
                <DollarSign className="w-4 h-4 text-amber-600" />
              </div>
              <h2 className="text-base font-black text-amber-600 leading-none tracking-tight">
                {formatCurrency(stats.payables)}
              </h2>
              <p className="text-[9px] text-gray-500 font-semibold tracking-wider select-none">
                Unpaid stock invoice purchase balances
              </p>
            </div>

            {/* Card 10: Inventory Value */}
            <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-5 shadow-sm space-y-2 relative overflow-hidden flex flex-col justify-between">
              <div className="flex justify-between items-center text-gray-400 select-none">
                <span className="text-[10px] font-bold tracking-widest uppercase">Inventory Cost Value</span>
                <Package className="w-4 h-4 text-blue-500" />
              </div>
              <h2 className="text-base font-black text-gray-900 leading-none tracking-tight">
                {formatCurrency(stats.inventoryValue)}
              </h2>
              <p className="text-[9px] text-gray-500 font-semibold tracking-wider select-none">
                Sum of live stock levels * purchase price
              </p>
            </div>

          </div>

          {/* Interactive Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Chart 1: Sales (Last 30 Days) - Line/Area */}
            <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-sm p-5 space-y-3 relative">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="text-xs font-black uppercase text-gray-700 tracking-wider">Sales Invoices Volume (Last 30 Days)</h4>
                <span className="text-[10px] font-bold bg-[#EEF5FF] text-[#2F80ED] px-2 py-0.5 rounded">Line Chart</span>
              </div>
              <div className="relative h-[160px] w-full mt-2">
                {salesHistory.length > 0 ? (
                  <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2F80ED" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#2F80ED" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Horizontal gridlines */}
                    <line x1="40" y1="20" x2="460" y2="20" stroke="#F3F4F6" strokeWidth="1" />
                    <line x1="40" y1="80" x2="460" y2="80" stroke="#F3F4F6" strokeWidth="1" />
                    <line x1="40" y1="140" x2="460" y2="140" stroke="#F3F4F6" strokeWidth="1" />
                    
                    {/* Area path */}
                    {salesAreaPath && <path d={salesAreaPath} fill="url(#salesGrad)" />}
                    {/* Line path */}
                    {salesLinePath && <path d={salesLinePath} fill="none" stroke="#2F80ED" strokeWidth="2.5" strokeLinecap="round" />}
                    
                    {/* Interactive nodes */}
                    {salesHistorySVGPoints.map((pt: any, i: number) => (
                      <circle
                        key={i}
                        cx={pt.x}
                        cy={pt.y}
                        r="3.5"
                        fill="white"
                        stroke="#2F80ED"
                        strokeWidth="2"
                        className="cursor-pointer hover:r-5 transition-all"
                        onMouseEnter={(e) => {
                          setTooltip({
                            x: e.clientX - 100,
                            y: e.clientY - 220,
                            text: `Date: ${salesHistory[i].label} | Sales: ${formatCurrency(salesHistory[i].value)}`,
                            visible: true
                          });
                        }}
                        onMouseLeave={() => setTooltip((prev) => ({ ...prev, visible: false }))}
                      />
                    ))}
                  </svg>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-gray-400 font-semibold select-none">No sales recorded.</div>
                )}
              </div>
            </div>

            {/* Chart 2: Purchases (Last 30 Days) - Columns */}
            <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="text-xs font-black uppercase text-gray-700 tracking-wider">Purchase Cost Statement (Last 30 Days)</h4>
                <span className="text-[10px] font-bold bg-[#FFF2E6] text-amber-600 px-2 py-0.5 rounded">Bar Chart</span>
              </div>
              <div className="relative h-[160px] w-full mt-2">
                {purchasesHistory.length > 0 ? (
                  <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                    <line x1="40" y1="20" x2="460" y2="20" stroke="#F3F4F6" strokeWidth="1" />
                    <line x1="40" y1="80" x2="460" y2="80" stroke="#F3F4F6" strokeWidth="1" />
                    <line x1="40" y1="140" x2="460" y2="140" stroke="#F3F4F6" strokeWidth="1" />
                    
                    {purchasesHistory.map((pt, idx) => {
                      const maxVal = Math.max(...purchasesHistory.map((x) => x.value)) || 100;
                      const x = 40 + (idx / (purchasesHistory.length - 1)) * (420);
                      const barHeight = (pt.value / maxVal) * 120;
                      const y = 140 - barHeight;

                      return (
                        <rect
                          key={idx}
                          x={x - 4}
                          y={y}
                          width="8"
                          height={barHeight}
                          fill="#F2C94C"
                          rx="2"
                          className="cursor-pointer hover:fill-amber-600 transition-colors"
                          onMouseEnter={(e) => {
                            setTooltip({
                              x: e.clientX - 100,
                              y: e.clientY - 220,
                              text: `Date: ${pt.label} | Purchases: ${formatCurrency(pt.value)}`,
                              visible: true
                            });
                          }}
                          onMouseLeave={() => setTooltip((prev) => ({ ...prev, visible: false }))}
                        />
                      );
                    })}
                  </svg>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-gray-400 font-semibold select-none">No purchases recorded.</div>
                )}
              </div>
            </div>

            {/* Chart 3: Cash In vs Cash Out Comparison */}
            <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="text-xs font-black uppercase text-gray-700 tracking-wider">Cash Flow (Inflows vs Outflows)</h4>
                <span className="text-[10px] font-bold bg-[#E6F7ED] text-green-700 px-2 py-0.5 rounded">Double Column</span>
              </div>
              <div className="relative h-[160px] w-full mt-2">
                {cashFlowHistory.length > 0 ? (
                  <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                    <line x1="40" y1="20" x2="460" y2="20" stroke="#F3F4F6" strokeWidth="1" />
                    <line x1="40" y1="80" x2="460" y2="80" stroke="#F3F4F6" strokeWidth="1" />
                    <line x1="40" y1="140" x2="460" y2="140" stroke="#F3F4F6" strokeWidth="1" />

                    {cashFlowHistory.map((pt, idx) => {
                      const maxVal = Math.max(...cashFlowHistory.map((x) => Math.max(x.value, x.value2 || 0))) || 100;
                      const x = 40 + (idx / (cashFlowHistory.length - 1)) * (420);
                      
                      const hIn = (pt.value / maxVal) * 120;
                      const hOut = ((pt.value2 || 0) / maxVal) * 120;
                      
                      const yIn = 140 - hIn;
                      const yOut = 140 - hOut;

                      return (
                        <g key={idx}>
                          {/* Cash In Column */}
                          <rect
                            x={x - 6}
                            y={yIn}
                            width="5"
                            height={hIn}
                            fill="#27AE60"
                            rx="1"
                            className="cursor-pointer hover:fill-green-800 transition-colors"
                            onMouseEnter={(e) => {
                              setTooltip({
                                x: e.clientX - 100,
                                y: e.clientY - 220,
                                text: `Date: ${pt.label} | Cash Inflow: ${formatCurrency(pt.value)}`,
                                visible: true
                              });
                            }}
                            onMouseLeave={() => setTooltip((prev) => ({ ...prev, visible: false }))}
                          />
                          {/* Cash Out Column */}
                          <rect
                            x={x}
                            y={yOut}
                            width="5"
                            height={hOut}
                            fill="#EB5757"
                            rx="1"
                            className="cursor-pointer hover:fill-red-700 transition-colors"
                            onMouseEnter={(e) => {
                              setTooltip({
                                x: e.clientX - 100,
                                y: e.clientY - 220,
                                text: `Date: ${pt.label} | Cash Outflow: ${formatCurrency(pt.value2 || 0)}`,
                                visible: true
                              });
                            }}
                            onMouseLeave={() => setTooltip((prev) => ({ ...prev, visible: false }))}
                          />
                        </g>
                      );
                    })}
                  </svg>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-gray-400 font-semibold select-none">No cash flows recorded.</div>
                )}
              </div>
            </div>

            {/* Chart 4: Top Selling Products (Horizontal Bar Chart) */}
            <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="text-xs font-black uppercase text-gray-700 tracking-wider">Top Selling Products (Qty)</h4>
                <span className="text-[10px] font-bold bg-[#E8E8E8] text-gray-600 px-2 py-0.5 rounded">Horizontal</span>
              </div>
              <div className="space-y-4 pt-2 font-bold text-xs select-none">
                {topProducts.length > 0 ? (
                  topProducts.map((p, idx) => {
                    const maxQty = Math.max(...topProducts.map((x) => x.value)) || 1;
                    const percent = Math.min(100, (p.value / maxQty) * 100);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center text-gray-700">
                          <span className="truncate max-w-[200px]">{p.label}</span>
                          <span className="text-[#2F80ED]">{p.value} units</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#2F80ED] h-full rounded-full transition-all duration-700"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10 text-xs text-gray-400 font-semibold">No sales transactions available yet.</div>
                )}
              </div>
            </div>

            {/* Chart 5: Monthly Profit & Loss column */}
            <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-sm p-5 space-y-3 col-span-1 lg:col-span-2">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="text-xs font-black uppercase text-gray-700 tracking-wider">Net Profit Ledger (Last 6 Months)</h4>
                <span className="text-[10px] font-bold bg-green-50 text-green-700 px-2 py-0.5 rounded">Income column</span>
              </div>
              <div className="relative h-[160px] w-full mt-2">
                {monthlyProfit.length > 0 ? (
                  <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
                    <line x1="40" y1="20" x2="560" y2="20" stroke="#F3F4F6" strokeWidth="1" />
                    <line x1="40" y1="80" x2="560" y2="80" stroke="#F3F4F6" strokeWidth="1" />
                    <line x1="40" y1="140" x2="560" y2="140" stroke="#F3F4F6" strokeWidth="1" />

                    {monthlyProfit.map((pt, idx) => {
                      const allVals = monthlyProfit.map(x => Math.abs(x.value));
                      const maxVal = Math.max(...allVals) || 100;
                      const x = 50 + idx * 90;
                      const isNegative = pt.value < 0;
                      
                      const barHeight = (Math.abs(pt.value) / maxVal) * 110;
                      
                      // Draw columns starting from center gridline or baseline
                      const y = isNegative ? 100 : 100 - barHeight;

                      return (
                        <g key={idx}>
                          {/* Columns */}
                          <rect
                            x={x}
                            y={y}
                            width="40"
                            height={barHeight}
                            fill={isNegative ? '#EB5757' : '#27AE60'}
                            rx="2"
                            className="cursor-pointer hover:opacity-85 transition-opacity"
                            onMouseEnter={(e) => {
                              setTooltip({
                                x: e.clientX - 100,
                                y: e.clientY - 220,
                                text: `Month: ${pt.label} | Net Profit: ${formatCurrency(pt.value)}`,
                                visible: true
                              });
                            }}
                            onMouseLeave={() => setTooltip((prev) => ({ ...prev, visible: false }))}
                          />
                          {/* Label bottom */}
                          <text
                            x={x + 20}
                            y={190}
                            fill="#6B7280"
                            fontSize="10"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {pt.label}
                          </text>
                        </g>
                      );
                    })}
                    {/* Middle balance line */}
                    <line x1="40" y1="100" x2="560" y2="100" stroke="#E5E7EB" strokeWidth="1.5" strokeDasharray="3,3" />
                  </svg>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-gray-400 font-semibold select-none">No monthly summary metrics compiled yet.</div>
                )}
              </div>
            </div>

          </div>

          {/* Bottom Grid: Recent Activity & Low Stock */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Recent Activities list */}
            <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-xs font-black uppercase text-gray-700 tracking-wider">Recent System Activity</h3>
                <span className="text-[10px] font-bold text-gray-400">Latest 5 Vouchers</span>
              </div>
              <div className="divide-y divide-[#E5E7EB] text-xs font-semibold text-gray-600 select-none">
                {activities.length > 0 ? (
                  activities.map((a, idx) => {
                    let typeBadge = 'bg-[#EEF5FF] text-[#2F80ED] border border-[#2F80ED]/20';
                    let amountSign = '+';
                    let amountColor = 'text-green-700';

                    if (a.type === 'Purchase') {
                      typeBadge = 'bg-slate-100 text-slate-700 border border-slate-200';
                      amountSign = '-';
                      amountColor = 'text-red-600';
                    } else if (a.type === 'Cash In') {
                      typeBadge = 'bg-green-50 text-green-700 border border-green-200';
                      amountSign = '+';
                      amountColor = 'text-green-700';
                    } else if (a.type === 'Cash Out') {
                      typeBadge = 'bg-red-50 text-red-700 border border-red-200';
                      amountSign = '-';
                      amountColor = 'text-red-600';
                    }

                    return (
                      <div key={idx} className="py-3 flex items-center justify-between hover:bg-[#F6F8FB]/30 transition-colors px-1">
                        <div className="space-y-1 truncate max-w-[280px]">
                          <div className="flex items-center gap-2">
                            <span className={`inline-block px-1.5 py-0.5 text-[9px] font-bold rounded ${typeBadge}`}>
                              {a.type}
                            </span>
                            <span className="font-extrabold text-[#2F80ED]">{a.ref}</span>
                          </div>
                          <p className="text-[10px] text-gray-500 font-medium truncate">{a.description}</p>
                        </div>
                        <div className="text-right">
                          <span className={`font-black text-sm ${amountColor}`}>{amountSign}{formatCurrency(a.amount)}</span>
                          <p className="text-[10px] text-gray-400 font-medium mt-0.5">{a.date}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-sm text-gray-400 font-semibold select-none">No system transactions logged yet.</div>
                )}
              </div>
            </div>

            {/* Low Stock Alerts */}
            <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-xs font-black uppercase text-gray-700 tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Low Stock Alerts
                </h3>
                <span className="text-[10px] font-bold text-gray-400">Reorder Thresholds</span>
              </div>
              <div className="overflow-x-auto border rounded-[8px]">
                {lowStockProducts.length > 0 ? (
                  <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-xs whitespace-nowrap">
                    <thead className="bg-[#F6F8FB] text-[#6B7280] font-semibold uppercase tracking-wider select-none">
                      <tr>
                        <th className="px-3.5 py-2.5">Product Name</th>
                        <th className="px-3.5 py-2.5">SKU</th>
                        <th className="px-3.5 py-2.5 text-right">Current Stock</th>
                        <th className="px-3.5 py-2.5 text-right">Min Stock</th>
                        <th className="px-3.5 py-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] text-gray-800 font-bold bg-white">
                      {lowStockProducts.map((p, idx) => {
                        let statusBadge = 'bg-yellow-50 text-yellow-700 border border-yellow-200';
                        let statusText = 'Low Stock';
                        
                        if (p.stock === 0) {
                          statusBadge = 'bg-red-50 text-red-700 border border-red-200';
                          statusText = 'Out of Stock';
                        } else if (p.stock < 0) {
                          statusBadge = 'bg-red-100 text-red-800 border border-red-300';
                          statusText = 'Negative Stock';
                        }

                        return (
                          <tr key={idx} className="hover:bg-[#F6F8FB]/50 transition-colors">
                            <td className="px-3.5 py-3 text-gray-900 truncate max-w-[160px]">{p.name}</td>
                            <td className="px-3.5 py-3 text-gray-500 text-[10px]">{p.sku || '-'}</td>
                            <td className="px-3.5 py-3 text-right text-red-600 font-black">{p.stock}</td>
                            <td className="px-3.5 py-3 text-right text-gray-500">{p.minStock}</td>
                            <td className="px-3.5 py-3 text-center">
                              <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded-full select-none ${statusBadge}`}>
                                {statusText}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-12 text-sm text-gray-400 font-semibold select-none bg-white">All product stock levels are healthy!</div>
                )}
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* Global Interactive Chart Tooltip Portal */}
      {tooltip.visible && (
        <div
          className="fixed bg-gray-900/90 text-white text-[10px] font-bold py-1.5 px-3 rounded shadow-md border border-gray-700 z-50 pointer-events-none select-none animate-fadeIn"
          style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
