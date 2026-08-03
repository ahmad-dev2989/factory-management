import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Mail,
  LogOut,
  ChevronRight,
  ArrowLeft,
  Printer,
  FileSpreadsheet,
  RefreshCw,
  Search,
  BookOpen,
  ShoppingCart,
  TrendingUp,
  Users,
  Package,
  Calendar
} from 'lucide-react';
import WifiStatus from '../components/WifiStatus';
import { SidebarToggle } from '../components/Sidebar';

interface CompanyItem {
  companyName: string;
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  address1: string;
}

export default function Reports() {
  const navigate = useNavigate();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'sales' | 'purchases' | 'cashbook' | 'customer' | 'stock' | 'profit'>('sales');

  // Common Date Filter States
  const [datePreset, setDatePreset] = useState('This Month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Global Config
  const [company, setCompany] = useState<CompanyItem | null>(null);
  const [currencySymbol, setCurrencySymbol] = useState('Rs.');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown options
  const [bankAccounts, setBankAccounts] = useState<{ id: number; name: string }[]>([]);
  const [customers, setCustomers] = useState<{ id: number; companyName: string }[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  // Report Specific Filter States
  const [cashbookAccount, setCashbookAccount] = useState('All');
  const [cashbookCategory, setCashbookCategory] = useState('All');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [stockCategory, setStockCategory] = useState('All');
  const [stockStatus, setStockStatus] = useState('All');

  // Report Data Outputs
  const [salesReportData, setSalesReportData] = useState<any[]>([]);
  const [purchaseReportData, setPurchaseReportData] = useState<any[]>([]);
  
  // Cashbook Data
  const [cashbookData, setCashbookData] = useState<any[]>([]);
  const [cashbookOpeningBalance, setCashbookOpeningBalance] = useState(0);

  // Customer Ledger Data
  const [customerLedgerData, setCustomerLedgerData] = useState<any[]>([]);
  const [customerOpeningBalance, setCustomerOpeningBalance] = useState(0);

  // Stock Data
  const [stockReportData, setStockReportData] = useState<any[]>([]);

  // Profit Data
  const [profitSummary, setProfitSummary] = useState({
    totalSales: 0,
    totalPurchases: 0,
    cogs: 0,
    grossProfit: 0,
    expenses: 0,
    netProfit: 0
  });

  // Table sorting states
  const [sortField, setSortField] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Table pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Load Initial Configurations
  const loadConfig = async () => {
    try {
      const compRes = await (window as any).electron.invoke('db-query', 'SELECT * FROM company WHERE id = 1');
      if (compRes && compRes[0]) {
        setCompany({
          companyName: compRes[0].company_name,
          businessName: compRes[0].business_name || '',
          ownerName: compRes[0].owner_name || '',
          phone: compRes[0].phone || '',
          email: compRes[0].email || '',
          address1: compRes[0].address1 || ''
        });
      }

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

      // Fetch Bank Accounts list
      const accRes = await (window as any).electron.invoke('db-query', "SELECT id, name FROM bank_accounts WHERE status = 'Active'");
      if (accRes && !accRes.error) {
        setBankAccounts(accRes);
      }

      // Fetch Customers list
      const custRes = await (window as any).electron.invoke('db-query', 'SELECT id, company_name FROM customers ORDER BY company_name ASC');
      if (custRes && !custRes.error) {
        const mapped = custRes.map((c: any) => ({ id: c.id, companyName: c.company_name }));
        setCustomers(mapped);
        if (mapped.length > 0) {
          setSelectedCustomerId(mapped[0].id.toString());
        }
      }

      // Fetch Product Categories list
      const catRes = await (window as any).electron.invoke('db-query', 'SELECT name FROM product_categories ORDER BY name ASC');
      if (catRes && !catRes.error) {
        setCategories(catRes.map((c: any) => c.name));
      }
    } catch (err) {
      console.error('Failed to load reports config:', err);
    }
  };

  // Helper: Date Calculations
  const getPresetDates = (preset: string) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case 'Today':
        start = now;
        end = now;
        break;
      case 'Yesterday':
        start = new Date();
        start.setDate(now.getDate() - 1);
        end = new Date(start);
        break;
      case 'This Week': {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(now.setDate(diff));
        end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
        break;
      }
      case 'This Month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'This Year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 12, 0);
        break;
      default:
        break;
    }

    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10)
    };
  };

  // Sync preset dropdown with datepicker inputs
  useEffect(() => {
    if (datePreset !== 'Custom') {
      const dates = getPresetDates(datePreset);
      setStartDate(dates.start);
      setEndDate(dates.end);
    }
  }, [datePreset]);

  useEffect(() => {
    loadConfig();
  }, []);

  // Main Report Query Runner
  const runReportQuery = async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setSearchQuery('');

    try {
      if (activeTab === 'sales') {
        const sql = `
          SELECT s.*, c.company_name AS customer_name,
                 (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) AS items_count
          FROM sales s
          LEFT JOIN customers c ON s.customer_id = c.id
          WHERE s.status = 'Active' AND s.date >= ? AND s.date <= ?
          ORDER BY s.date DESC, s.id DESC
        `;
        const res = await (window as any).electron.invoke('db-query', sql, [startDate, endDate]);
        setSalesReportData(res || []);

      } else if (activeTab === 'purchases') {
        const sql = `
          SELECT p.*,
                 (SELECT COUNT(*) FROM purchase_items WHERE purchase_id = p.id) AS items_count
          FROM purchases p
          WHERE p.status = 'Active' AND p.date >= ? AND p.date <= ?
          ORDER BY p.date DESC, p.id DESC
        `;
        const res = await (window as any).electron.invoke('db-query', sql, [startDate, endDate]);
        setPurchaseReportData(res || []);

      } else if (activeTab === 'cashbook') {
        // Compute Cash Book Opening Balance
        // 1. Sum of account opening balances
        let opAccSql = 'SELECT SUM(opening_balance) AS opening FROM bank_accounts';
        let opParams: any[] = [];
        if (cashbookAccount !== 'All') {
          opAccSql = 'SELECT opening_balance AS opening FROM bank_accounts WHERE id = ?';
          opParams.push(Number(cashbookAccount));
        }
        const opAccRes = await (window as any).electron.invoke('db-query', opAccSql, opParams);
        const baseOpening = opAccRes && opAccRes[0] ? (Number(opAccRes[0].opening) || 0) : 0;

        // 2. Aggregate sales inflows, purchases outflows, cash_in, cash_out before startDate
        let salesInSql = 'SELECT SUM(paid_amount) AS total FROM sales WHERE status = \'Active\' AND date < ?';
        let cashInSql = 'SELECT SUM(amount) AS total FROM cash_in WHERE status = \'Active\' AND date < ?';
        let purchOutSql = 'SELECT SUM(paid_amount) AS total FROM purchases WHERE status = \'Active\' AND date < ?';
        let cashOutSql = 'SELECT SUM(amount) AS total FROM cash_out WHERE status = \'Active\' AND date < ?';
        
        let salesInParams: any[] = [startDate];
        let cashInParams: any[] = [startDate];
        let purchOutParams: any[] = [startDate];
        let cashOutParams: any[] = [startDate];

        if (cashbookAccount !== 'All') {
          salesInSql += ' AND payment_account_id = ?';
          salesInParams.push(Number(cashbookAccount));
          
          cashInSql += ' AND account_id = ?';
          cashInParams.push(Number(cashbookAccount));

          purchOutSql += ' AND payment_account_id = ?';
          purchOutParams.push(Number(cashbookAccount));

          cashOutSql += ' AND account_id = ?';
          cashOutParams.push(Number(cashbookAccount));
        }

        const [sIn, cIn, pOut, cOut] = await Promise.all([
          (window as any).electron.invoke('db-query', salesInSql, salesInParams),
          (window as any).electron.invoke('db-query', cashInSql, cashInParams),
          (window as any).electron.invoke('db-query', purchOutSql, purchOutParams),
          (window as any).electron.invoke('db-query', cashOutSql, cashOutParams)
        ]);

        const totalInflowsBefore = (sIn && sIn[0] ? (Number(sIn[0].total) || 0) : 0) + (cIn && cIn[0] ? (Number(cIn[0].total) || 0) : 0);
        const totalOutflowsBefore = (pOut && pOut[0] ? (Number(pOut[0].total) || 0) : 0) + (cOut && cOut[0] ? (Number(cOut[0].total) || 0) : 0);
        const calculatedOpening = baseOpening + totalInflowsBefore - totalOutflowsBefore;
        setCashbookOpeningBalance(calculatedOpening);

        // Fetch Date-Range Cash Transactions
        let salesTxSql = `
          SELECT s.date, s.invoice_number AS voucher_no, 'Sale Payment: ' || c.company_name AS description, 
                 s.paid_amount AS cash_in, 0 AS cash_out, b.name AS account_name, 'Sales' AS category_type
          FROM sales s
          LEFT JOIN customers c ON s.customer_id = c.id
          LEFT JOIN bank_accounts b ON s.payment_account_id = b.id
          WHERE s.status = 'Active' AND s.paid_amount > 0 AND s.date >= ? AND s.date <= ?
        `;
        let cashInTxSql = `
          SELECT ci.date, ci.voucher_number AS voucher_no, ci.category || ': ' || ci.received_from AS description, 
                 ci.amount AS cash_in, 0 AS cash_out, b.name AS account_name, ci.category AS category_type
          FROM cash_in ci
          LEFT JOIN bank_accounts b ON ci.account_id = b.id
          WHERE ci.status = 'Active' AND ci.date >= ? AND ci.date <= ?
        `;
        let purchTxSql = `
          SELECT p.date, p.purchase_number AS voucher_no, 'Purchase Payment: ' || p.vendor_name AS description, 
                 0 AS cash_in, p.paid_amount AS cash_out, b.name AS account_name, 'Purchases' AS category_type
          FROM purchases p
          LEFT JOIN bank_accounts b ON p.payment_account_id = b.id
          WHERE p.status = 'Active' AND p.paid_amount > 0 AND p.date >= ? AND p.date <= ?
        `;
        let cashOutTxSql = `
          SELECT co.date, co.voucher_number AS voucher_no, co.category || ': ' || co.paid_to AS description, 
                 0 AS cash_in, co.amount AS cash_out, b.name AS account_name, co.category AS category_type
          FROM cash_out co
          LEFT JOIN bank_accounts b ON co.account_id = b.id
          WHERE co.status = 'Active' AND co.date >= ? AND co.date <= ?
        `;

        let txSalesParams: any[] = [startDate, endDate];
        let txCashInParams: any[] = [startDate, endDate];
        let txPurchParams: any[] = [startDate, endDate];
        let txCashOutParams: any[] = [startDate, endDate];

        if (cashbookAccount !== 'All') {
          salesTxSql += ' AND s.payment_account_id = ?';
          txSalesParams.push(Number(cashbookAccount));

          cashInTxSql += ' AND ci.account_id = ?';
          txCashInParams.push(Number(cashbookAccount));

          purchTxSql += ' AND p.payment_account_id = ?';
          txPurchParams.push(Number(cashbookAccount));

          cashOutTxSql += ' AND co.account_id = ?';
          txCashOutParams.push(Number(cashbookAccount));
        }

        const [sTx, cInTx, pTx, cOutTx] = await Promise.all([
          (window as any).electron.invoke('db-query', salesTxSql, txSalesParams),
          (window as any).electron.invoke('db-query', cashInTxSql, txCashInParams),
          (window as any).electron.invoke('db-query', purchTxSql, txPurchParams),
          (window as any).electron.invoke('db-query', cashOutTxSql, txCashOutParams)
        ]);

        // Merge and sort chronologically
        const merged: any[] = [...(sTx || []), ...(cInTx || []), ...(pTx || []), ...(cOutTx || [])];
        merged.sort((a, b) => a.date.localeCompare(b.date));

        // Compute running balances
        let balance = calculatedOpening;
        const mapped = merged.map((tx) => {
          balance = balance + Number(tx.cash_in) - Number(tx.cash_out);
          return {
            ...tx,
            runningBalance: balance
          };
        });

        // Filter by Category Type if selected
        const categoryFiltered = cashbookCategory === 'All' 
          ? mapped 
          : mapped.filter((x) => x.category_type === cashbookCategory);

        setCashbookData(categoryFiltered);

      } else if (activeTab === 'customer') {
        if (!selectedCustomerId) {
          setLoading(false);
          return;
        }

        // Compute Customer Opening Balance
        const custDetails = await (window as any).electron.invoke('db-query', 'SELECT opening_balance FROM customers WHERE id = ?', [selectedCustomerId]);
        const baseOpening = custDetails && custDetails[0] ? (Number(custDetails[0].opening_balance) || 0) : 0;

        const debitsBefore = await (window as any).electron.invoke('db-query', 'SELECT SUM(grand_total) AS total FROM sales WHERE customer_id = ? AND status = \'Active\' AND date < ?', [selectedCustomerId, startDate]);
        const creditsBefore = await (window as any).electron.invoke('db-query', 'SELECT SUM(paid_amount) AS total FROM sales WHERE customer_id = ? AND status = \'Active\' AND date < ?', [selectedCustomerId, startDate]);

        const calcOpening = baseOpening + (debitsBefore && debitsBefore[0] ? (Number(debitsBefore[0].total) || 0) : 0) - (creditsBefore && creditsBefore[0] ? (Number(creditsBefore[0].total) || 0) : 0);
        setCustomerOpeningBalance(calcOpening);

        // Fetch Date-Range Customer Transactions
        // Invoices (Debits)
        const invoicesSql = `
          SELECT date, invoice_number AS ref, 'Invoice' AS description, grand_total AS debit, 0 AS credit
          FROM sales
          WHERE customer_id = ? AND status = 'Active' AND date >= ? AND date <= ?
        `;
        // Payments (Credits)
        const paymentsSql = `
          SELECT date, invoice_number AS ref, 'Payment (Invoice)' AS description, 0 AS debit, paid_amount AS credit
          FROM sales
          WHERE customer_id = ? AND status = 'Active' AND paid_amount > 0 AND date >= ? AND date <= ?
        `;

        const [invRes, payRes] = await Promise.all([
          (window as any).electron.invoke('db-query', invoicesSql, [selectedCustomerId, startDate, endDate]),
          (window as any).electron.invoke('db-query', paymentsSql, [selectedCustomerId, startDate, endDate])
        ]);

        const merged = [...(invRes || []), ...(payRes || [])];
        merged.sort((a, b) => a.date.localeCompare(b.date));

        let balance = calcOpening;
        const mapped = merged.map((tx) => {
          balance = balance + Number(tx.debit) - Number(tx.credit);
          return {
            ...tx,
            runningBalance: balance
          };
        });

        setCustomerLedgerData(mapped);

      } else if (activeTab === 'stock') {
        const sql = `
          SELECT p.id, p.name, p.sku, p.stock, p.minimum_stock AS min_stock, p.purchase_price, p.sale_price,
                 (p.stock * p.purchase_price) AS inventory_value, c.name AS category_name
          FROM products p
          LEFT JOIN product_categories c ON p.category_id = c.id
          ORDER BY p.name ASC
        `;
        const res = await (window as any).electron.invoke('db-query', sql);
        setStockReportData(res || []);

      } else if (activeTab === 'profit') {
        const [salesSum, purchSum, cogsSum, expSum] = await Promise.all([
          (window as any).electron.invoke('db-query', 'SELECT SUM(grand_total) AS total FROM sales WHERE status = \'Active\' AND date >= ? AND date <= ?', [startDate, endDate]),
          (window as any).electron.invoke('db-query', 'SELECT SUM(grand_total) AS total FROM purchases WHERE status = \'Active\' AND date >= ? AND date <= ?', [startDate, endDate]),
          (window as any).electron.invoke('db-query', `
            SELECT SUM(si.quantity * p.purchase_price) AS total_cogs 
            FROM sale_items si 
            LEFT JOIN sales s ON si.sale_id = s.id 
            LEFT JOIN products p ON si.product_id = p.id 
            WHERE s.status = 'Active' AND s.date >= ? AND s.date <= ?
          `, [startDate, endDate]),
          (window as any).electron.invoke('db-query', 'SELECT SUM(amount) AS total FROM cash_out WHERE status = \'Active\' AND category != \'Supplier Payment\' AND date >= ? AND date <= ?', [startDate, endDate])
        ]);

        const sales = salesSum && salesSum[0] ? (Number(salesSum[0].total) || 0) : 0;
        const purchases = purchSum && purchSum[0] ? (Number(purchSum[0].total) || 0) : 0;
        const cogs = cogsSum && cogsSum[0] ? (Number(cogsSum[0].total_cogs) || 0) : 0;
        const expenses = expSum && expSum[0] ? (Number(expSum[0].total) || 0) : 0;
        const grossProfit = sales - cogs;
        const netProfit = grossProfit - expenses;

        setProfitSummary({
          totalSales: sales,
          totalPurchases: purchases,
          cogs,
          grossProfit,
          expenses,
          netProfit
        });
      }
    } catch (err) {
      console.error('Failed to run report query:', err);
    } finally {
      setLoading(false);
    }
  };

  // Re-run report whenever active tab, date, account, customer parameters change
  useEffect(() => {
    runReportQuery();
  }, [activeTab, startDate, endDate, cashbookAccount, cashbookCategory, selectedCustomerId, stockCategory, stockStatus]);

  const handleRefresh = () => {
    runReportQuery();
  };

  // Format Helper
  const formatCurrency = (val: number) => {
    return `${currencySymbol} ${val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Date formatted view helper
  const formattedRangeText = useMemo(() => {
    if (activeTab === 'stock') return 'Current Live Stock Levels';
    return `${startDate} to ${endDate}`;
  }, [activeTab, startDate, endDate]);

  // Front-End Filter & Search
  const activeReportRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    if (activeTab === 'sales') {
      return Array.isArray(salesReportData) ? salesReportData.filter((r) => {
        if (!q) return true;
        return (
          r.invoice_number.toLowerCase().includes(q) ||
          (r.customer_name && r.customer_name.toLowerCase().includes(q)) ||
          r.payment_method.toLowerCase().includes(q)
        );
      }) : [];
    }

    if (activeTab === 'purchases') {
      return Array.isArray(purchaseReportData) ? purchaseReportData.filter((r) => {
        if (!q) return true;
        return (
          r.purchase_number.toLowerCase().includes(q) ||
          r.vendor_name.toLowerCase().includes(q) ||
          r.payment_method.toLowerCase().includes(q)
        );
      }) : [];
    }

    if (activeTab === 'cashbook') {
      return Array.isArray(cashbookData) ? cashbookData.filter((r) => {
        if (!q) return true;
        return (
          r.voucher_no.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          (r.account_name && r.account_name.toLowerCase().includes(q))
        );
      }) : [];
    }

    if (activeTab === 'customer') {
      return Array.isArray(customerLedgerData) ? customerLedgerData.filter((r) => {
        if (!q) return true;
        return (
          r.ref.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
        );
      }) : [];
    }

    if (activeTab === 'stock') {
      return Array.isArray(stockReportData) ? stockReportData.filter((r) => {
        let matchQuery = true;
        if (q) {
          matchQuery = r.name.toLowerCase().includes(q) || (r.sku && r.sku.toLowerCase().includes(q));
        }

        let matchCat = true;
        if (stockCategory !== 'All') {
          matchCat = r.category_name === stockCategory;
        }

        let matchStatus = true;
        if (stockStatus !== 'All') {
          if (stockStatus === 'Out of Stock') matchStatus = r.stock === 0;
          else if (stockStatus === 'Low Stock') matchStatus = r.stock > 0 && r.stock <= r.min_stock;
          else if (stockStatus === 'In Stock') matchStatus = r.stock > r.min_stock;
        }

        return matchQuery && matchCat && matchStatus;
      }) : [];
    }

    return [];
  }, [
    activeTab,
    searchQuery,
    salesReportData,
    purchaseReportData,
    cashbookData,
    customerLedgerData,
    stockReportData,
    stockCategory,
    stockStatus
  ]);

  // Frontend Sorting
  const sortedRows = useMemo(() => {
    if (!sortField) return activeReportRows;

    const sorted = [...activeReportRows];
    sorted.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      } else {
        return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
      }
    });
    return sorted;
  }, [activeReportRows, sortField, sortOrder]);

  // Frontend Pagination
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedRows.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedRows, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(sortedRows.length / rowsPerPage) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, stockCategory, stockStatus, rowsPerPage]);

  // Aggregate values of filtered output
  const activeReportTotals = useMemo(() => {
    let subtotal = 0;
    let discount = 0;
    let grandTotal = 0;
    let paid = 0;
    let remaining = 0;
    let totalCashIn = 0;
    let totalCashOut = 0;
    let totalStock = 0;
    let totalInventoryValue = 0;

    sortedRows.forEach((r) => {
      subtotal += r.subtotal || 0;
      discount += r.discount || 0;
      grandTotal += r.grand_total || 0;
      paid += r.paid_amount || 0;
      remaining += r.remaining_amount || 0;
      totalCashIn += r.cash_in || 0;
      totalCashOut += r.cash_out || 0;
      totalStock += r.stock || 0;
      totalInventoryValue += r.inventory_value || 0;
    });

    return {
      subtotal,
      discount,
      grandTotal,
      paid,
      remaining,
      totalCashIn,
      totalCashOut,
      totalStock,
      totalInventoryValue
    };
  }, [sortedRows]);

  // Printing Layout Trigger
  const handlePrint = () => {
    window.print();
  };

  // CSV Export utility
  const handleCSVExport = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `Report_${activeTab}_${startDate}_to_${endDate}.csv`;

    if (activeTab === 'sales') {
      headers = ['Invoice Number', 'Date', 'Customer', 'Items Count', 'Subtotal', 'Discount', 'Grand Total', 'Paid', 'Remaining', 'Payment Method'];
      rows = sortedRows.map((r) => [
        r.invoice_number,
        r.date,
        r.customer_name || 'N/A',
        r.items_count.toString(),
        r.subtotal.toString(),
        r.discount.toString(),
        r.grand_total.toString(),
        r.paid_amount.toString(),
        r.remaining_amount.toString(),
        r.payment_method
      ]);
    } else if (activeTab === 'purchases') {
      headers = ['Purchase Number', 'Vendor', 'Date', 'Items Count', 'Grand Total', 'Paid', 'Remaining', 'Payment Method'];
      rows = sortedRows.map((r) => [
        r.purchase_number,
        r.vendor_name,
        r.date,
        r.items_count.toString(),
        r.grand_total.toString(),
        r.paid_amount.toString(),
        r.remaining_amount.toString(),
        r.payment_method
      ]);
    } else if (activeTab === 'cashbook') {
      headers = ['Date', 'Voucher / Ref', 'Description', 'Account', 'Cash In', 'Cash Out', 'Running Balance'];
      rows = [
        [startDate, '-', 'Opening Balance', '-', '-', '-', cashbookOpeningBalance.toString()],
        ...sortedRows.map((r) => [
          r.date,
          r.voucher_no,
          r.description,
          r.account_name || 'N/A',
          r.cash_in.toString(),
          r.cash_out.toString(),
          r.runningBalance.toString()
        ])
      ];
    } else if (activeTab === 'customer') {
      headers = ['Date', 'Reference', 'Description', 'Debit', 'Credit', 'Running Balance'];
      rows = [
        [startDate, '-', 'Opening Balance', '-', '-', customerOpeningBalance.toString()],
        ...sortedRows.map((r) => [
          r.date,
          r.ref,
          r.description,
          r.debit.toString(),
          r.credit.toString(),
          r.runningBalance.toString()
        ])
      ];
    } else if (activeTab === 'stock') {
      filename = 'Stock_Report.csv';
      headers = ['Product Name', 'SKU', 'Category', 'Current Stock', 'Min Stock', 'Purchase Price', 'Sale Price', 'Inventory Value'];
      rows = sortedRows.map((r) => [
        r.name,
        r.sku || '-',
        r.category_name || 'Uncategorized',
        r.stock.toString(),
        r.min_stock.toString(),
        r.purchase_price.toString(),
        r.sale_price.toString(),
        r.inventory_value.toString()
      ]);
    } else if (activeTab === 'profit') {
      headers = ['Summary Title', 'Amount'];
      rows = [
        ['Total Revenue (Sales)', profitSummary.totalSales.toString()],
        ['Total Purchases', profitSummary.totalPurchases.toString()],
        ['Cost of Goods Sold (COGS)', profitSummary.cogs.toString()],
        ['Gross Profit (Sales - COGS)', profitSummary.grossProfit.toString()],
        ['Operating Expenses (Salaries, Rent, Utilities)', profitSummary.expenses.toString()],
        ['Net Profit', profitSummary.netProfit.toString()]
      ];
    }

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((val) => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F6F8FB] select-none min-h-screen">
      {/* Print Layout */}
      <div id="print-report" className="hidden print:block font-sans text-xs p-8 bg-white text-black leading-normal">
        <div className="flex justify-between items-start border-b pb-4 mb-4">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wider text-gray-900">{company?.companyName || 'Factory App'}</h1>
            <p className="text-xs text-gray-500 font-semibold">{company?.businessName}</p>
            <p className="text-[10px] text-gray-500 mt-1">{company?.address1}</p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-black uppercase text-gray-600 tracking-wider">
              {activeTab === 'sales' && 'Sales Report'}
              {activeTab === 'purchases' && 'Purchase Report'}
              {activeTab === 'cashbook' && 'Cash Book Statement'}
              {activeTab === 'customer' && 'Customer Ledger'}
              {activeTab === 'stock' && 'Stock Status Report'}
              {activeTab === 'profit' && 'Profit & Loss Statement'}
            </h2>
            <p className="text-[10px] text-gray-500 mt-1 font-bold">
              Period: {formattedRangeText} <br />
              Printed: {new Date().toLocaleString()}
            </p>
          </div>
        </div>

        {/* Print Data Table */}
        <table className="w-full text-[10px] text-left border-collapse border mt-4">
          <thead className="bg-gray-100 font-bold uppercase text-[9px] text-gray-700">
            {activeTab === 'sales' && (
              <tr>
                <th className="border p-2">Invoice No</th>
                <th className="border p-2">Date</th>
                <th className="border p-2">Customer</th>
                <th className="border p-2 text-right">Items</th>
                <th className="border p-2 text-right">Subtotal</th>
                <th className="border p-2 text-right">Discount</th>
                <th className="border p-2 text-right">Grand Total</th>
                <th className="border p-2 text-right">Paid</th>
                <th className="border p-2 text-right">Remaining</th>
                <th className="border p-2">Method</th>
              </tr>
            )}
            {activeTab === 'purchases' && (
              <tr>
                <th className="border p-2">Purchase No</th>
                <th className="border p-2">Vendor</th>
                <th className="border p-2">Date</th>
                <th className="border p-2 text-right">Items</th>
                <th className="border p-2 text-right">Grand Total</th>
                <th className="border p-2 text-right">Paid</th>
                <th className="border p-2 text-right">Remaining</th>
                <th className="border p-2">Method</th>
              </tr>
            )}
            {activeTab === 'cashbook' && (
              <tr>
                <th className="border p-2">Date</th>
                <th className="border p-2">Voucher / Ref</th>
                <th className="border p-2">Description</th>
                <th className="border p-2">Account</th>
                <th className="border p-2 text-right">Cash In</th>
                <th className="border p-2 text-right">Cash Out</th>
                <th className="border p-2 text-right">Running Balance</th>
              </tr>
            )}
            {activeTab === 'customer' && (
              <tr>
                <th className="border p-2">Date</th>
                <th className="border p-2">Ref</th>
                <th className="border p-2">Description</th>
                <th className="border p-2 text-right">Debit</th>
                <th className="border p-2 text-right">Credit</th>
                <th className="border p-2 text-right">Balance</th>
              </tr>
            )}
            {activeTab === 'stock' && (
              <tr>
                <th className="border p-2">Product Name</th>
                <th className="border p-2">SKU</th>
                <th className="border p-2">Category</th>
                <th className="border p-2 text-right">Current Stock</th>
                <th className="border p-2 text-right">Min Stock</th>
                <th className="border p-2 text-right">Purchase Price</th>
                <th className="border p-2 text-right">Sale Price</th>
                <th className="border p-2 text-right">Inventory Value</th>
              </tr>
            )}
          </thead>
          <tbody className="font-medium text-gray-800">
            {activeTab === 'sales' && (
              <>
                {sortedRows.map((r, i) => (
                  <tr key={i}>
                    <td className="border p-2 font-bold">{r.invoice_number}</td>
                    <td className="border p-2">{r.date}</td>
                    <td className="border p-2">{r.customer_name || 'Walk-In'}</td>
                    <td className="border p-2 text-right">{r.items_count}</td>
                    <td className="border p-2 text-right">{formatCurrency(r.subtotal)}</td>
                    <td className="border p-2 text-right">{formatCurrency(r.discount)}</td>
                    <td className="border p-2 text-right font-bold">{formatCurrency(r.grand_total)}</td>
                    <td className="border p-2 text-right">{formatCurrency(r.paid_amount)}</td>
                    <td className="border p-2 text-right">{formatCurrency(r.remaining_amount)}</td>
                    <td className="border p-2">{r.payment_method}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-bold border-t-2">
                  <td className="border p-2" colSpan={3}>TOTAL SUMMARY</td>
                  <td className="border p-2 text-right">-</td>
                  <td className="border p-2 text-right">{formatCurrency(activeReportTotals.subtotal)}</td>
                  <td className="border p-2 text-right">{formatCurrency(activeReportTotals.discount)}</td>
                  <td className="border p-2 text-right">{formatCurrency(activeReportTotals.grandTotal)}</td>
                  <td className="border p-2 text-right">{formatCurrency(activeReportTotals.paid)}</td>
                  <td className="border p-2 text-right">{formatCurrency(activeReportTotals.remaining)}</td>
                  <td className="border p-2">-</td>
                </tr>
              </>
            )}
            {activeTab === 'purchases' && (
              <>
                {sortedRows.map((r, i) => (
                  <tr key={i}>
                    <td className="border p-2 font-bold">{r.purchase_number}</td>
                    <td className="border p-2">{r.vendor_name}</td>
                    <td className="border p-2">{r.date}</td>
                    <td className="border p-2 text-right">{r.items_count}</td>
                    <td className="border p-2 text-right font-bold">{formatCurrency(r.grand_total)}</td>
                    <td className="border p-2 text-right">{formatCurrency(r.paid_amount)}</td>
                    <td className="border p-2 text-right">{formatCurrency(r.remaining_amount)}</td>
                    <td className="border p-2">{r.payment_method}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-bold border-t-2">
                  <td className="border p-2" colSpan={3}>TOTAL SUMMARY</td>
                  <td className="border p-2 text-right">-</td>
                  <td className="border p-2 text-right">{formatCurrency(activeReportTotals.grandTotal)}</td>
                  <td className="border p-2 text-right">{formatCurrency(activeReportTotals.paid)}</td>
                  <td className="border p-2 text-right">{formatCurrency(activeReportTotals.remaining)}</td>
                  <td className="border p-2">-</td>
                </tr>
              </>
            )}
            {activeTab === 'cashbook' && (
              <>
                <tr className="bg-gray-50/50 italic">
                  <td className="border p-2" colSpan={4}>Opening Balance</td>
                  <td className="border p-2 text-right">-</td>
                  <td className="border p-2 text-right">-</td>
                  <td className="border p-2 text-right font-bold">{formatCurrency(cashbookOpeningBalance)}</td>
                </tr>
                {sortedRows.map((r, i) => (
                  <tr key={i}>
                    <td className="border p-2">{r.date}</td>
                    <td className="border p-2 font-semibold">{r.voucher_no}</td>
                    <td className="border p-2">{r.description}</td>
                    <td className="border p-2">{r.account_name || 'N/A'}</td>
                    <td className="border p-2 text-right text-green-700 font-bold">{r.cash_in > 0 ? formatCurrency(r.cash_in) : '-'}</td>
                    <td className="border p-2 text-right text-red-600 font-bold">{r.cash_out > 0 ? formatCurrency(r.cash_out) : '-'}</td>
                    <td className="border p-2 text-right font-bold">{formatCurrency(r.runningBalance)}</td>
                  </tr>
                ))}
              </>
            )}
            {activeTab === 'customer' && (
              <>
                <tr className="bg-gray-50/50 italic">
                  <td className="border p-2" colSpan={3}>Opening Balance</td>
                  <td className="border p-2 text-right">-</td>
                  <td className="border p-2 text-right">-</td>
                  <td className="border p-2 text-right font-bold">{formatCurrency(customerOpeningBalance)}</td>
                </tr>
                {sortedRows.map((r, i) => (
                  <tr key={i}>
                    <td className="border p-2">{r.date}</td>
                    <td className="border p-2 font-bold text-blue-600">{r.ref}</td>
                    <td className="border p-2">{r.description}</td>
                    <td className="border p-2 text-right">{r.debit > 0 ? formatCurrency(r.debit) : '-'}</td>
                    <td className="border p-2 text-right">{r.credit > 0 ? formatCurrency(r.credit) : '-'}</td>
                    <td className="border p-2 text-right font-bold">{formatCurrency(r.runningBalance)}</td>
                  </tr>
                ))}
              </>
            )}
            {activeTab === 'stock' && (
              <>
                {sortedRows.map((r, i) => (
                  <tr key={i}>
                    <td className="border p-2 font-bold">{r.name}</td>
                    <td className="border p-2">{r.sku || '-'}</td>
                    <td className="border p-2">{r.category_name || 'Uncategorized'}</td>
                    <td className="border p-2 text-right font-bold">{r.stock}</td>
                    <td className="border p-2 text-right">{r.min_stock}</td>
                    <td className="border p-2 text-right">{formatCurrency(r.purchase_price)}</td>
                    <td className="border p-2 text-right">{formatCurrency(r.sale_price)}</td>
                    <td className="border p-2 text-right font-bold text-[#27AE60]">{formatCurrency(r.inventory_value)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-bold border-t-2">
                  <td className="border p-2" colSpan={3}>TOTAL INVENTORY ASSET VALUE</td>
                  <td className="border p-2 text-right">{activeReportTotals.totalStock}</td>
                  <td className="border p-2 text-right">-</td>
                  <td className="border p-2 text-right">-</td>
                  <td className="border p-2 text-right">-</td>
                  <td className="border p-2 text-right font-black text-green-700">{formatCurrency(activeReportTotals.totalInventoryValue)}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>

        {activeTab === 'profit' && (
          <div className="max-w-md border rounded p-6 my-8 space-y-3.5 bg-gray-50 mx-auto text-xs font-bold text-gray-700">
            <h3 className="text-center font-black text-sm uppercase tracking-wider text-gray-800 border-b pb-2">Profit & Loss Statement</h3>
            <div className="flex justify-between">
              <span>Total Revenue (Sales)</span>
              <span className="text-gray-900">{formatCurrency(profitSummary.totalSales)}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-red-500">(-) Cost of Goods Sold (COGS)</span>
              <span className="text-gray-900">{formatCurrency(profitSummary.cogs)}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-green-700">
              <span>GROSS PROFIT</span>
              <span>{formatCurrency(profitSummary.grossProfit)}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-red-500">(-) Operating Expenses</span>
              <span className="text-gray-900">{formatCurrency(profitSummary.expenses)}</span>
            </div>
            <div className="flex justify-between text-base font-black text-green-800 bg-white p-2 rounded border border-green-200">
              <span>NET PROFIT</span>
              <span>{formatCurrency(profitSummary.netProfit)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Header */}
      <header className="h-[60px] bg-[#2F80ED] text-white flex items-center justify-between px-5 shrink-0 shadow-sm print:hidden">
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
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-4 text-white/80 border-r border-white/20 pr-4">
            <WifiStatus />
            <button className="hover:text-white p-1 rounded transition-colors cursor-pointer focus:outline-none relative">
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-red-400 rounded-full"></span>
            </button>
            <button className="hover:text-white p-1 rounded transition-colors cursor-pointer focus:outline-none">
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

      {/* Breadcrumbs */}
      <div className="bg-white border-b border-[#E5E7EB] py-5 px-8 flex flex-col justify-center print:hidden">
        <div className="max-w-[1600px] w-full mx-auto flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#6B7280] tracking-wide uppercase">
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="hover:text-[#2F80ED] transition-colors cursor-pointer focus:outline-none"
            >
              Settings
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#1F2937]">Reports Dashboard</span>
          </div>

          <h2 className="text-xl font-bold text-[#1F2937] mt-1">Accounting & Inventory Reports</h2>
          <p className="text-xs text-[#6B7280] font-semibold tracking-wide uppercase">
            Generate and export ledger books, stock valuations, and dynamic profit reports directly from SQLite data.
          </p>
        </div>
      </div>

      {/* Tab Panel */}
      <div className="flex-grow flex max-w-[1600px] w-full mx-auto p-8 gap-6 print:hidden">
        {/* Left Sidebar Menu */}
        <aside className="w-64 shrink-0 bg-white border border-[#E5E7EB] rounded-[10px] p-4 flex flex-col gap-1 shadow-sm select-none">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-3">Available Reports</h3>
          
          <button
            onClick={() => setActiveTab('sales')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-[6px] transition-all focus:outline-none text-left cursor-pointer ${
              activeTab === 'sales' ? 'bg-[#EEF5FF] text-[#2F80ED]' : 'hover:bg-[#F6F8FB] text-[#6B7280] hover:text-[#1F2937]'
            }`}
          >
            <ShoppingCart className="w-4 h-4" /> Sales Report
          </button>
          
          <button
            onClick={() => setActiveTab('purchases')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-[6px] transition-all focus:outline-none text-left cursor-pointer ${
              activeTab === 'purchases' ? 'bg-[#EEF5FF] text-[#2F80ED]' : 'hover:bg-[#F6F8FB] text-[#6B7280] hover:text-[#1F2937]'
            }`}
          >
            <ShoppingCart className="w-4 h-4 rotate-180" /> Purchase Report
          </button>

          <button
            onClick={() => setActiveTab('cashbook')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-[6px] transition-all focus:outline-none text-left cursor-pointer ${
              activeTab === 'cashbook' ? 'bg-[#EEF5FF] text-[#2F80ED]' : 'hover:bg-[#F6F8FB] text-[#6B7280] hover:text-[#1F2937]'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Cash Book Statement
          </button>

          <button
            onClick={() => setActiveTab('customer')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-[6px] transition-all focus:outline-none text-left cursor-pointer ${
              activeTab === 'customer' ? 'bg-[#EEF5FF] text-[#2F80ED]' : 'hover:bg-[#F6F8FB] text-[#6B7280] hover:text-[#1F2937]'
            }`}
          >
            <Users className="w-4 h-4" /> Customer Ledger
          </button>

          <button
            onClick={() => setActiveTab('stock')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-[6px] transition-all focus:outline-none text-left cursor-pointer ${
              activeTab === 'stock' ? 'bg-[#EEF5FF] text-[#2F80ED]' : 'hover:bg-[#F6F8FB] text-[#6B7280] hover:text-[#1F2937]'
            }`}
          >
            <Package className="w-4 h-4" /> Stock & Inventory Report
          </button>

          <button
            onClick={() => setActiveTab('profit')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-[6px] transition-all focus:outline-none text-left cursor-pointer ${
              activeTab === 'profit' ? 'bg-[#EEF5FF] text-[#2F80ED]' : 'hover:bg-[#F6F8FB] text-[#6B7280] hover:text-[#1F2937]'
            }`}
          >
            <TrendingUp className="w-4 h-4" /> Profit & Loss Statement
          </button>
        </aside>

        {/* Main Content Area */}
        <section className="flex-1 bg-white border border-[#E5E7EB] rounded-[10px] shadow-sm p-6 flex flex-col gap-6 overflow-hidden">
          
          {/* Filtering Toolbar */}
          <div className="flex flex-col gap-4">
            
            {/* Upper Toolbar Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 select-none">
              
              {/* Preset Selection */}
              {activeTab !== 'stock' && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <select
                    value={datePreset}
                    onChange={(e) => setDatePreset(e.target.value)}
                    className="px-3 py-1.5 bg-[#F6F8FB] border border-[#E5E7EB] text-[#1F2937] text-xs font-bold rounded-[6px] cursor-pointer focus:outline-none"
                  >
                    <option value="Today">Today</option>
                    <option value="Yesterday">Yesterday</option>
                    <option value="This Week">This Week</option>
                    <option value="This Month">This Month</option>
                    <option value="This Year">This Year</option>
                    <option value="Custom">Custom Date Range</option>
                  </select>
                </div>
              )}

              {/* Datepicker Inputs for custom */}
              {datePreset === 'Custom' && activeTab !== 'stock' && (
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-2.5 py-1 bg-white border border-[#E5E7EB] text-[#1F2937] rounded focus:outline-none"
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-2.5 py-1 bg-white border border-[#E5E7EB] text-[#1F2937] rounded focus:outline-none"
                  />
                </div>
              )}

              {/* Common Search Bar */}
              {activeTab !== 'profit' && (
                <div className="relative max-w-xs w-full">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#6B7280]">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search current report..."
                    className="w-full pl-9 pr-4 py-1.5 bg-[#F6F8FB] border border-[#E5E7EB] text-[#1F2937] text-xs font-semibold rounded-[6px] focus:outline-none focus:bg-white focus:border-[#2F80ED] transition-all"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-3.5 py-1.5 bg-[#EEF5FF] border border-[#2F80ED]/20 hover:bg-[#2F80ED] text-[#2F80ED] hover:text-white text-xs font-bold rounded-[6px] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button
                  onClick={handleCSVExport}
                  className="px-3.5 py-1.5 bg-green-50 border border-green-200 hover:bg-green-600 text-green-700 hover:text-white text-xs font-bold rounded-[6px] flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
                </button>
                <button
                  onClick={handleRefresh}
                  className="p-2 bg-white border border-[#E5E7EB] hover:bg-[#F6F8FB] text-[#1F2937] rounded-[6px] cursor-pointer"
                  title="Refresh Data"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#6B7280]" />
                </button>
              </div>
            </div>

            {/* Custom Report Specific Parameter Filters */}
            <div className="flex flex-wrap items-center gap-4 bg-[#F6F8FB] p-4 rounded-[8px] border border-[#E5E7EB]">
              
              {activeTab === 'cashbook' && (
                <>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase font-bold text-gray-400">Account Filter</span>
                    <select
                      value={cashbookAccount}
                      onChange={(e) => setCashbookAccount(e.target.value)}
                      className="px-3 py-1 bg-white border rounded text-xs font-bold cursor-pointer"
                    >
                      <option value="All">All Bank/Cash Accounts</option>
                      {bankAccounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase font-bold text-gray-400">Category Filter</span>
                    <select
                      value={cashbookCategory}
                      onChange={(e) => setCashbookCategory(e.target.value)}
                      className="px-3 py-1 bg-white border rounded text-xs font-bold cursor-pointer"
                    >
                      <option value="All">All Cashbook Categories</option>
                      <option value="Sales">Sales Invoices</option>
                      <option value="Purchases">Purchases</option>
                      <option value="Customer Payment">Customer Inflows</option>
                      <option value="Supplier Payment">Supplier Outflows</option>
                      <option value="Salary">Salaries</option>
                      <option value="Office Expense">Office Expenses</option>
                      <option value="Electricity">Electricity</option>
                      <option value="Gas">Gas</option>
                      <option value="Internet">Internet</option>
                      <option value="Fuel">Fuel</option>
                      <option value="Rent">Rent</option>
                      <option value="Investment">Investment Inflows</option>
                      <option value="Bank Deposit">Bank Deposits</option>
                      <option value="Other Income">Other Income</option>
                      <option value="Miscellaneous">Miscellaneous</option>
                    </select>
                  </div>
                </>
              )}

              {activeTab === 'customer' && (
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] uppercase font-bold text-gray-400">Select Customer</span>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="px-3 py-1 bg-white border rounded text-xs font-bold cursor-pointer max-w-sm"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.companyName}</option>
                    ))}
                  </select>
                </div>
              )}

              {activeTab === 'stock' && (
                <>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase font-bold text-gray-400">Category Filter</span>
                    <select
                      value={stockCategory}
                      onChange={(e) => setStockCategory(e.target.value)}
                      className="px-3 py-1 bg-white border rounded text-xs font-bold cursor-pointer"
                    >
                      <option value="All">All Categories</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase font-bold text-gray-400">Stock Level Status</span>
                    <select
                      value={stockStatus}
                      onChange={(e) => setStockStatus(e.target.value)}
                      className="px-3 py-1 bg-white border rounded text-xs font-bold cursor-pointer"
                    >
                      <option value="All">All Stock Levels</option>
                      <option value="In Stock">In Stock</option>
                      <option value="Low Stock">Low Stock</option>
                      <option value="Out of Stock">Out of Stock</option>
                    </select>
                  </div>
                </>
              )}

              {/* Default View Mode */}
              <div className="flex flex-col gap-1 text-[10px] font-bold text-gray-400">
                <span>Selected Date Range</span>
                <span className="text-gray-600 text-xs font-extrabold">{formattedRangeText}</span>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-y-auto border border-[#E5E7EB] rounded-[8px]">
            {loading ? (
              <div className="p-12 text-center text-sm text-gray-500 font-semibold select-none flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                <span>Running queries and pulling records from SQLite...</span>
              </div>
            ) : paginatedRows.length > 0 || activeTab === 'profit' ? (
              <>
                {activeTab === 'sales' && (
                  <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-sm whitespace-nowrap">
                    <thead className="bg-[#F6F8FB] text-[#6B7280] font-semibold text-xs uppercase tracking-wider select-none">
                      <tr>
                        <th className="px-4 py-3 cursor-pointer" onClick={() => { setSortField('invoice_number'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>Invoice No</th>
                        <th className="px-4 py-3 cursor-pointer" onClick={() => { setSortField('date'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>Date</th>
                        <th className="px-4 py-3 cursor-pointer" onClick={() => { setSortField('customer_name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>Customer</th>
                        <th className="px-4 py-3 text-right">Items Count</th>
                        <th className="px-4 py-3 text-right">Subtotal</th>
                        <th className="px-4 py-3 text-right">Discount</th>
                        <th className="px-4 py-3 text-right">Grand Total</th>
                        <th className="px-4 py-3 text-right">Paid</th>
                        <th className="px-4 py-3 text-right">Remaining</th>
                        <th className="px-4 py-3">Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] text-[#1F2937] font-medium bg-white">
                      {paginatedRows.map((r, i) => (
                        <tr key={i} className="hover:bg-[#F6F8FB]/50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-[#2F80ED]">{r.invoice_number}</td>
                          <td className="px-4 py-3">{r.date}</td>
                          <td className="px-4 py-3 font-bold text-gray-800">{r.customer_name || 'Walk-In Customer'}</td>
                          <td className="px-4 py-3 text-right font-bold text-gray-600">{r.items_count}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(r.subtotal)}</td>
                          <td className="px-4 py-3 text-right text-red-500 font-bold">-{formatCurrency(r.discount)}</td>
                          <td className="px-4 py-3 text-right font-bold text-[#2F80ED]">{formatCurrency(r.grand_total)}</td>
                          <td className="px-4 py-3 text-right font-bold text-[#27AE60]">{formatCurrency(r.paid_amount)}</td>
                          <td className="px-4 py-3 text-right font-bold text-red-500">{formatCurrency(r.remaining_amount)}</td>
                          <td className="px-4 py-3 text-xs font-bold text-gray-500">{r.payment_method}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'purchases' && (
                  <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-sm whitespace-nowrap">
                    <thead className="bg-[#F6F8FB] text-[#6B7280] font-semibold text-xs uppercase tracking-wider select-none">
                      <tr>
                        <th className="px-4 py-3 cursor-pointer" onClick={() => { setSortField('purchase_number'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>Purchase No</th>
                        <th className="px-4 py-3 cursor-pointer" onClick={() => { setSortField('vendor_name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>Vendor</th>
                        <th className="px-4 py-3 cursor-pointer" onClick={() => { setSortField('date'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>Date</th>
                        <th className="px-4 py-3 text-right">Items Count</th>
                        <th className="px-4 py-3 text-right">Grand Total</th>
                        <th className="px-4 py-3 text-right">Paid</th>
                        <th className="px-4 py-3 text-right">Remaining</th>
                        <th className="px-4 py-3">Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] text-[#1F2937] font-medium bg-white">
                      {paginatedRows.map((r, i) => (
                        <tr key={i} className="hover:bg-[#F6F8FB]/50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-[#2F80ED]">{r.purchase_number}</td>
                          <td className="px-4 py-3 font-bold text-gray-800">{r.vendor_name}</td>
                          <td className="px-4 py-3">{r.date}</td>
                          <td className="px-4 py-3 text-right font-bold text-gray-600">{r.items_count}</td>
                          <td className="px-4 py-3 text-right font-bold text-[#2F80ED]">{formatCurrency(r.grand_total)}</td>
                          <td className="px-4 py-3 text-right font-bold text-red-500">{formatCurrency(r.paid_amount)}</td>
                          <td className="px-4 py-3 text-right font-bold text-gray-700">{formatCurrency(r.remaining_amount)}</td>
                          <td className="px-4 py-3 text-xs font-bold text-gray-500">{r.payment_method}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'cashbook' && (
                  <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-sm whitespace-nowrap">
                    <thead className="bg-[#F6F8FB] text-[#6B7280] font-semibold text-xs uppercase tracking-wider select-none">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Voucher / Invoice</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Target Account</th>
                        <th className="px-4 py-3 text-right">Cash In</th>
                        <th className="px-4 py-3 text-right">Cash Out</th>
                        <th className="px-4 py-3 text-right">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] text-[#1F2937] font-medium bg-white">
                      {currentPage === 1 && (
                        <tr className="bg-gray-50/50 italic text-[#6B7280]">
                          <td className="px-4 py-2" colSpan={4}>Opening Balance</td>
                          <td className="px-4 py-2 text-right">-</td>
                          <td className="px-4 py-2 text-right">-</td>
                          <td className="px-4 py-2 text-right font-bold text-gray-900">{formatCurrency(cashbookOpeningBalance)}</td>
                        </tr>
                      )}
                      {paginatedRows.map((r, i) => (
                        <tr key={i} className="hover:bg-[#F6F8FB]/50 transition-colors">
                          <td className="px-4 py-3">{r.date}</td>
                          <td className="px-4 py-3 font-semibold text-[#2F80ED]">{r.voucher_no}</td>
                          <td className="px-4 py-3 font-bold text-gray-800">{r.description}</td>
                          <td className="px-4 py-3 font-bold text-gray-500 text-xs">{r.account_name || 'N/A'}</td>
                          <td className="px-4 py-3 text-right text-green-600 font-extrabold">{r.cash_in > 0 ? formatCurrency(r.cash_in) : '-'}</td>
                          <td className="px-4 py-3 text-right text-red-500 font-extrabold">{r.cash_out > 0 ? formatCurrency(r.cash_out) : '-'}</td>
                          <td className="px-4 py-3 text-right font-black text-gray-900">{formatCurrency(r.runningBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'customer' && (
                  <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-sm whitespace-nowrap">
                    <thead className="bg-[#F6F8FB] text-[#6B7280] font-semibold text-xs uppercase tracking-wider select-none">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Reference</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3 text-right">Debit (Invoice)</th>
                        <th className="px-4 py-3 text-right">Credit (Receipt)</th>
                        <th className="px-4 py-3 text-right">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] text-[#1F2937] font-medium bg-white">
                      {currentPage === 1 && (
                        <tr className="bg-gray-50/50 italic text-[#6B7280]">
                          <td className="px-4 py-2" colSpan={3}>Opening Balance</td>
                          <td className="px-4 py-2 text-right">-</td>
                          <td className="px-4 py-2 text-right">-</td>
                          <td className="px-4 py-2 text-right font-bold text-gray-900">{formatCurrency(customerOpeningBalance)}</td>
                        </tr>
                      )}
                      {paginatedRows.map((r, i) => (
                        <tr key={i} className="hover:bg-[#F6F8FB]/50 transition-colors">
                          <td className="px-4 py-3">{r.date}</td>
                          <td className="px-4 py-3 font-semibold text-blue-600">{r.ref}</td>
                          <td className="px-4 py-3 font-bold text-gray-800">{r.description}</td>
                          <td className="px-4 py-3 text-right text-gray-700">{r.debit > 0 ? formatCurrency(r.debit) : '-'}</td>
                          <td className="px-4 py-3 text-right text-green-600 font-extrabold">{r.credit > 0 ? formatCurrency(r.credit) : '-'}</td>
                          <td className="px-4 py-3 text-right font-black text-gray-950">{formatCurrency(r.runningBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'stock' && (
                  <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-sm whitespace-nowrap">
                    <thead className="bg-[#F6F8FB] text-[#6B7280] font-semibold text-xs uppercase tracking-wider select-none">
                      <tr>
                        <th className="px-4 py-3">Product Name</th>
                        <th className="px-4 py-3">SKU</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3 text-right">Stock Level</th>
                        <th className="px-4 py-3 text-right">Min Stock</th>
                        <th className="px-4 py-3 text-right">Cost Price</th>
                        <th className="px-4 py-3 text-right">Sale Price</th>
                        <th className="px-4 py-3 text-right">Inventory Value</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] text-[#1F2937] font-medium bg-white">
                      {paginatedRows.map((r, i) => {
                        let badgeClass = 'bg-green-50 text-green-700 border border-green-200';
                        let badgeText = 'In Stock';
                        
                        if (r.stock === 0) {
                          badgeClass = 'bg-red-50 text-red-700 border border-red-200';
                          badgeText = 'Out of Stock';
                        } else if (r.stock <= r.min_stock) {
                          badgeClass = 'bg-yellow-50 text-yellow-700 border border-yellow-200';
                          badgeText = 'Low Stock';
                        }

                        return (
                          <tr key={i} className="hover:bg-[#F6F8FB]/50 transition-colors">
                            <td className="px-4 py-3 font-bold text-gray-900">{r.name}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs font-bold">{r.sku || '-'}</td>
                            <td className="px-4 py-3 text-gray-500 font-semibold">{r.category_name || 'Uncategorized'}</td>
                            <td className="px-4 py-3 text-right font-black text-gray-800">{r.stock}</td>
                            <td className="px-4 py-3 text-right text-gray-500">{r.min_stock}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(r.purchase_price)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(r.sale_price)}</td>
                            <td className="px-4 py-3 text-right font-black text-green-700">{formatCurrency(r.inventory_value)}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full select-none ${badgeClass}`}>
                                {badgeText}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {activeTab === 'profit' && (
                  <div className="p-8 max-w-lg mx-auto bg-gray-50/50 border rounded-[10px] shadow-sm space-y-4 font-bold text-xs text-gray-700 select-none">
                    <h3 className="text-center font-black text-sm uppercase tracking-widest text-[#2F80ED] border-b pb-3 mb-4">
                      Income Statement Summary
                    </h3>
                    <div className="flex justify-between items-center py-1">
                      <span>Total Revenue (Sales)</span>
                      <span className="text-gray-900 text-sm font-black">{formatCurrency(profitSummary.totalSales)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 text-red-500 border-b pb-2">
                      <span>(-) Cost of Goods Sold (COGS)</span>
                      <span className="text-gray-900 text-sm font-black">{formatCurrency(profitSummary.cogs)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 text-sm font-black text-green-700 bg-white px-3 rounded border">
                      <span>GROSS PROFIT</span>
                      <span>{formatCurrency(profitSummary.grossProfit)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 text-red-500 border-b pb-2">
                      <span>(-) Operating Expenses (Rent, Salaries, Utilities)</span>
                      <span className="text-gray-900 text-sm font-black">{formatCurrency(profitSummary.expenses)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 text-base font-black text-white bg-[#27AE60] px-4 rounded shadow-sm">
                      <span className="tracking-wider uppercase">NET PROFIT</span>
                      <span className="text-lg">{formatCurrency(profitSummary.netProfit)}</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-12 text-center text-[#6B7280] text-sm font-semibold select-none bg-white">
                No matching report records found in the database.
              </div>
            )}
          </div>

          {/* Footer Summaries for grid tables */}
          {!loading && sortedRows.length > 0 && activeTab !== 'profit' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[#F6F8FB] border rounded-[8px] select-none text-xs font-bold text-gray-500 uppercase tracking-wider">
              {activeTab === 'sales' && (
                <>
                  <div className="flex flex-col">
                    <span>Total Sales (Subtotal)</span>
                    <span className="text-sm font-black text-gray-900 mt-0.5">{formatCurrency(activeReportTotals.subtotal)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span>Total Discounts</span>
                    <span className="text-sm font-black text-red-500 mt-0.5">-{formatCurrency(activeReportTotals.discount)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span>Total Sales (Net)</span>
                    <span className="text-sm font-black text-[#2F80ED] mt-0.5">{formatCurrency(activeReportTotals.grandTotal)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span>Total Outstanding Receivables</span>
                    <span className="text-sm font-black text-red-500 mt-0.5">{formatCurrency(activeReportTotals.remaining)}</span>
                  </div>
                </>
              )}
              {activeTab === 'purchases' && (
                <>
                  <div className="flex flex-col">
                    <span>Total Purchases (Gross)</span>
                    <span className="text-sm font-black text-[#2F80ED] mt-0.5">{formatCurrency(activeReportTotals.grandTotal)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span>Total Paid</span>
                    <span className="text-sm font-black text-green-700 mt-0.5">{formatCurrency(activeReportTotals.paid)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span>Total Remaining Payables</span>
                    <span className="text-sm font-black text-red-500 mt-0.5">{formatCurrency(activeReportTotals.remaining)}</span>
                  </div>
                </>
              )}
              {activeTab === 'cashbook' && (
                <>
                  <div className="flex flex-col">
                    <span>Opening Balance</span>
                    <span className="text-sm font-black text-gray-800 mt-0.5">{formatCurrency(cashbookOpeningBalance)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span>Total Inflow (+)</span>
                    <span className="text-sm font-black text-green-700 mt-0.5">+{formatCurrency(activeReportTotals.totalCashIn)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span>Total Outflow (-)</span>
                    <span className="text-sm font-black text-red-600 mt-0.5">-{formatCurrency(activeReportTotals.totalCashOut)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span>Net Closing Balance</span>
                    <span className="text-sm font-black text-green-800 mt-0.5">
                      {formatCurrency(cashbookOpeningBalance + activeReportTotals.totalCashIn - activeReportTotals.totalCashOut)}
                    </span>
                  </div>
                </>
              )}
              {activeTab === 'customer' && (
                <>
                  <div className="flex flex-col">
                    <span>Opening Balance</span>
                    <span className="text-sm font-black text-gray-800 mt-0.5">{formatCurrency(customerOpeningBalance)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span>Total Invoiced (Debits)</span>
                    <span className="text-sm font-black text-blue-600 mt-0.5">+{formatCurrency(activeReportTotals.subtotal || activeReportTotals.grandTotal)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span>Total Receipts (Credits)</span>
                    <span className="text-sm font-black text-green-600 mt-0.5">-{formatCurrency(activeReportTotals.paid)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span>Net Ledger Balance</span>
                    <span className="text-sm font-black text-gray-900 mt-0.5">
                      {formatCurrency(customerOpeningBalance + (activeReportTotals.subtotal || activeReportTotals.grandTotal) - activeReportTotals.paid)}
                    </span>
                  </div>
                </>
              )}
              {activeTab === 'stock' && (
                <>
                  <div className="flex flex-col">
                    <span>Total Active Products</span>
                    <span className="text-sm font-black text-gray-800 mt-0.5">{sortedRows.length}</span>
                  </div>
                  <div className="flex flex-col">
                    <span>Total Stock Qty</span>
                    <span className="text-sm font-black text-blue-600 mt-0.5">{activeReportTotals.totalStock}</span>
                  </div>
                  <div className="flex flex-col col-span-2">
                    <span>Total Inventory Cost Asset Value</span>
                    <span className="text-sm font-black text-green-700 mt-0.5">{formatCurrency(activeReportTotals.totalInventoryValue)}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && sortedRows.length > 0 && activeTab !== 'profit' && (
            <div className="flex items-center justify-between select-none pt-4 border-t border-[#E5E7EB]">
              <div className="text-xs font-bold text-[#6B7280]">
                Showing {(currentPage - 1) * rowsPerPage + 1} to{' '}
                {Math.min(currentPage * rowsPerPage, sortedRows.length)} of{' '}
                {sortedRows.length} entries
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#6B7280] font-semibold">Rows per page:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => setRowsPerPage(parseInt(e.target.value))}
                    className="px-2.5 py-1 bg-white border border-[#E5E7EB] text-[#1F2937] text-xs font-bold rounded-[4px] cursor-pointer focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    className="px-3 py-1.5 bg-white border border-[#E5E7EB] text-[#1F2937] text-xs font-semibold rounded-[6px] hover:bg-[#F6F8FB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none"
                  >
                    Prev
                  </button>
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNum = idx + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-[6px] border transition-all focus:outline-none cursor-pointer ${
                          currentPage === pageNum
                            ? 'bg-[#2F80ED] border-[#2F80ED] text-white'
                            : 'bg-white border-[#E5E7EB] text-[#1F2937] hover:bg-[#F6F8FB]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    className="px-3 py-1.5 bg-white border border-[#E5E7EB] text-[#1F2937] text-xs font-semibold rounded-[6px] hover:bg-[#F6F8FB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
