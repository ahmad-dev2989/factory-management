import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Mail,
  LogOut,
  ChevronRight,
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  AlertTriangle,
  ArrowLeft,
  Printer,
  RefreshCw,
  Eye,
  ChevronUp,
  ChevronDown,
  Paperclip
} from 'lucide-react';
import WifiStatus from '../components/WifiStatus';
import { SidebarToggle } from '../components/Sidebar';
import { TableColumnCustomizer } from '../components/TableColumnCustomizer';

interface CashOutItem {
  id: number;
  voucherNumber: string;
  date: string;
  paidTo: string;
  category: string;
  accountId: number;
  accountName: string;
  amount: number;
  reference: string;
  remarks: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface BankAccountItem {
  id: number;
  name: string;
  type: string;
  currentBalance: number;
  status: string;
}

interface CompanyItem {
  companyName: string;
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  address1: string;
  ntn: string;
  strn: string;
  currency: string;
}

const CATEGORIES = [
  'Supplier Payment',
  'Salary',
  'Office Expense',
  'Electricity',
  'Gas',
  'Internet',
  'Fuel',
  'Maintenance',
  'Rent',
  'Miscellaneous'
];

export default function CashOut() {
  const navigate = useNavigate();

  // Data States
  const [vouchers, setVouchers] = useState<CashOutItem[]>([]);
  const [accounts, setAccounts] = useState<BankAccountItem[]>([]);
  const [company, setCompany] = useState<CompanyItem | null>(null);
  const [currencySymbol, setCurrencySymbol] = useState('Rs.');

  // Notification States
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Table Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterAccount, setFilterAccount] = useState('All');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [filterMaxAmount, setFilterMaxAmount] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  // Column Visibility Preferences
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['voucherNumber', 'date', 'paidTo', 'category', 'accountName', 'amount', 'status']);

  const allColumns = [
    { key: 'voucherNumber', label: 'Voucher No' },
    { key: 'date', label: 'Date' },
    { key: 'paidTo', label: 'Paid To' },
    { key: 'category', label: 'Category' },
    { key: 'accountName', label: 'Account' },
    { key: 'amount', label: 'Amount' },
    { key: 'status', label: 'Status' }
  ];

  // Sorting
  const [sortField, setSortField] = useState<keyof CashOutItem>('voucherNumber');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modals
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Form State
  const [editingVoucher, setEditingVoucher] = useState<CashOutItem | null>(null);
  const [voucherNumber, setVoucherNumber] = useState('');
  const [voucherDate, setVoucherDate] = useState('');
  const [paidTo, setPaidTo] = useState('');
  const [category, setCategory] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [remarks, setRemarks] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // View State
  const [viewingVoucher, setViewingVoucher] = useState<CashOutItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CashOutItem | null>(null);

  // Fetch Data
  const fetchData = async () => {
    try {
      // 1. Fetch Company & Currency Preference
      const compRes = await (window as any).electron.invoke('db-query', 'SELECT * FROM company WHERE id = 1');
      if (compRes && compRes[0]) {
        setCompany({
          companyName: compRes[0].company_name,
          businessName: compRes[0].business_name || '',
          ownerName: compRes[0].owner_name || '',
          phone: compRes[0].phone || '',
          email: compRes[0].email || '',
          address1: compRes[0].address1 || '',
          ntn: compRes[0].ntn || '',
          strn: compRes[0].strn || '',
          currency: compRes[0].currency || 'PKR'
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

      // 2. Fetch Active Accounts
      const acctRes = await (window as any).electron.invoke(
        'db-query',
        "SELECT id, name, type, current_balance, status FROM bank_accounts WHERE status = 'Active'"
      );
      if (acctRes && !acctRes.error) {
        setAccounts(acctRes);
      }

      // 3. Fetch Cash Out Vouchers
      const vouchersRes = await (window as any).electron.invoke(
        'db-query',
        `SELECT co.*, b.name AS account_name 
         FROM cash_out co
         LEFT JOIN bank_accounts b ON co.account_id = b.id
         ORDER BY co.date DESC, co.id DESC`
      );
      if (vouchersRes && !vouchersRes.error) {
        const mapped = vouchersRes.map((v: any) => ({
          id: v.id,
          voucherNumber: v.voucher_number,
          date: v.date,
          paidTo: v.paid_to,
          category: v.category,
          accountId: v.account_id,
          accountName: v.account_name || 'Unknown Account',
          amount: Number(v.amount) || 0,
          reference: v.reference || '',
          remarks: v.remarks || '',
          status: v.status,
          createdAt: v.created_at,
          updatedAt: v.updated_at
        }));
        setVouchers(mapped);
      }
    } catch (err) {
      console.error('[CashOut] Failed to fetch data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (val: number) => {
    return `${currencySymbol} ${val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Auto-generate voucher number
  const generateVoucherNumber = async () => {
    try {
      const res = await (window as any).electron.invoke('db-query', 'SELECT MAX(id) AS max_id FROM cash_out');
      const nextId = (res && res[0] && res[0].max_id) ? (res[0].max_id + 1) : 1;
      const startingNo = 1001;
      return `CO-${startingNo + nextId - 1}`;
    } catch (err) {
      console.error('Failed to generate voucher number:', err);
      return 'CO-1001';
    }
  };

  const handleAddClick = async () => {
    setEditingVoucher(null);
    const nextNo = await generateVoucherNumber();
    setVoucherNumber(nextNo);
    setVoucherDate(new Date().toISOString().slice(0, 10));
    setPaidTo('');
    setCategory(CATEGORIES[0]);
    if (accounts.length > 0) {
      setSelectedAccountId(accounts[0].id.toString());
    } else {
      setSelectedAccountId('');
    }
    setAmount('');
    setReference('');
    setRemarks('');
    setFormErrors({});
    setIsVoucherModalOpen(true);
  };

  const handleEditClick = (v: CashOutItem) => {
    if (v.status === 'Cancelled') {
      setErrorMessage('Cancelled vouchers cannot be edited.');
      setTimeout(() => setErrorMessage(''), 4000);
      return;
    }

    setEditingVoucher(v);
    setVoucherNumber(v.voucherNumber);
    setVoucherDate(v.date);
    setPaidTo(v.paidTo);
    setCategory(v.category);
    setSelectedAccountId(v.accountId.toString());
    setAmount(v.amount.toString());
    setReference(v.reference);
    setRemarks(v.remarks);
    setFormErrors({});
    setIsVoucherModalOpen(true);
  };

  const handleSaveVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!voucherNumber.trim()) errors.voucherNumber = 'Voucher Number is required';
    if (!voucherDate) errors.voucherDate = 'Date is required';
    if (!paidTo.trim()) errors.paidTo = 'Paid To is required';
    if (!category) errors.category = 'Category is required';
    if (!selectedAccountId) errors.accountId = 'Account is required';

    const amtVal = parseFloat(amount) || 0;
    if (isNaN(amtVal) || amtVal <= 0) {
      errors.amount = 'Amount must be greater than 0';
    } else {
      // Local balance check prior to transaction invocation
      const targetAcc = accounts.find(a => a.id === parseInt(selectedAccountId));
      if (targetAcc) {
        // If editing, the available balance is current balance + what was previously paid
        const previousAmt = (editingVoucher && editingVoucher.accountId === targetAcc.id) ? editingVoucher.amount : 0;
        const availableBalance = targetAcc.currentBalance + previousAmt;

        if (amtVal > availableBalance) {
          errors.amount = `Withdrawal exceeds available balance (${formatCurrency(availableBalance)})`;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const payload = {
      voucherNumber: voucherNumber.trim(),
      date: voucherDate,
      paidTo: paidTo.trim(),
      category,
      accountId: parseInt(selectedAccountId),
      amount: amtVal,
      reference,
      remarks
    };

    try {
      // Check duplicate voucher number
      const checkDup = await (window as any).electron.invoke(
        'db-query',
        'SELECT id FROM cash_out WHERE LOWER(voucher_number) = ? AND id != ?',
        [voucherNumber.trim().toLowerCase(), editingVoucher ? editingVoucher.id : 0]
      );
      if (checkDup && checkDup.length > 0) {
        setFormErrors({ voucherNumber: 'Voucher Number is already in use.' });
        return;
      }

      if (editingVoucher) {
        const updateRes = await (window as any).electron.invoke('cash-out-update', editingVoucher.id, payload);
        if (updateRes && !updateRes.error) {
          setSuccessMessage('Voucher updated and account balance adjusted.');
          setIsVoucherModalOpen(false);
          fetchData();
          setTimeout(() => setSuccessMessage(''), 4000);
        } else {
          setErrorMessage(updateRes?.message || 'Database error during update.');
          setTimeout(() => setErrorMessage(''), 4000);
        }
      } else {
        const createRes = await (window as any).electron.invoke('cash-out-create', payload);
        if (createRes && !createRes.error) {
          setSuccessMessage('Payment recorded and account debited.');
          setIsVoucherModalOpen(false);
          fetchData();
          setTimeout(() => setSuccessMessage(''), 4000);
        } else {
          setErrorMessage(createRes?.message || 'Database error during creation.');
          setTimeout(() => setErrorMessage(''), 4000);
        }
      }
    } catch (err) {
      console.error('[CashOut] Save voucher failure:', err);
    }
  };

  const handleViewDetails = (v: CashOutItem) => {
    setViewingVoucher(v);
    setIsViewModalOpen(true);
  };

  const handleDeleteClick = (v: CashOutItem) => {
    if (v.status === 'Cancelled') {
      setErrorMessage('Voucher is already cancelled.');
      setTimeout(() => setErrorMessage(''), 4000);
      return;
    }
    setDeleteTarget(v);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const cancelRes = await (window as any).electron.invoke('cash-out-cancel', deleteTarget.id);
      if (cancelRes && !cancelRes.error) {
        setSuccessMessage(`Payment ${deleteTarget.voucherNumber} cancelled. Bank balance credited/restored.`);
        setIsDeleteModalOpen(false);
        setDeleteTarget(null);
        fetchData();
        setTimeout(() => setSuccessMessage(''), 4000);
      } else {
        setErrorMessage(cancelRes?.message || 'Database error during cancellation.');
        setTimeout(() => setErrorMessage(''), 4000);
      }
    } catch (err) {
      console.error('[CashOut] Cancellation failure:', err);
    }
  };

  const handlePrintClick = (v: CashOutItem) => {
    setViewingVoucher(v);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const handleRefresh = () => {
    fetchData();
    setSuccessMessage('Cash Out vouchers list refreshed.');
    setTimeout(() => setSuccessMessage(''), 2000);
  };

  // Search & Filter Logic
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const q = searchQuery.toLowerCase().trim();
      let matchQuery = true;
      if (q) {
        matchQuery =
          v.voucherNumber.toLowerCase().includes(q) ||
          v.paidTo.toLowerCase().includes(q) ||
          v.reference.toLowerCase().includes(q);
      }

      let matchCat = true;
      if (filterCategory !== 'All') {
        matchCat = v.category === filterCategory;
      }

      let matchAcc = true;
      if (filterAccount !== 'All') {
        matchAcc = v.accountName === filterAccount;
      }

      let matchStartDate = true;
      if (filterStartDate) {
        matchStartDate = v.date >= filterStartDate;
      }

      let matchEndDate = true;
      if (filterEndDate) {
        matchEndDate = v.date <= filterEndDate;
      }

      let matchMinAmount = true;
      if (filterMinAmount) {
        matchMinAmount = v.amount >= Number(filterMinAmount);
      }

      let matchMaxAmount = true;
      if (filterMaxAmount) {
        matchMaxAmount = v.amount <= Number(filterMaxAmount);
      }

      let matchStatus = true;
      if (filterStatus !== 'All') {
        matchStatus = v.status === filterStatus;
      }

      return matchQuery && matchCat && matchAcc && matchStartDate && matchEndDate && matchMinAmount && matchMaxAmount && matchStatus;
    });
  }, [vouchers, searchQuery, filterCategory, filterAccount, filterStartDate, filterEndDate, filterMinAmount, filterMaxAmount, filterStatus]);

  // Sorting
  const sortedVouchers = useMemo(() => {
    const sorted = [...filteredVouchers];
    sorted.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      if (typeof aVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal);
      } else {
        return sortOrder === 'asc'
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      }
    });
    return sorted;
  }, [filteredVouchers, sortField, sortOrder]);

  // Pagination
  const paginatedVouchers = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedVouchers.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedVouchers, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(sortedVouchers.length / rowsPerPage) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterCategory, filterAccount, filterStartDate, filterEndDate, filterMinAmount, filterMaxAmount, filterStatus, rowsPerPage]);

  return (
    <div className="flex-1 flex flex-col bg-[#F6F8FB] select-none min-h-screen">
      {/* Print-Only Container */}
      {viewingVoucher && (
        <div id="print-invoice" className="hidden print:block font-sans text-xs p-8 bg-white text-black leading-tight">
          <div className="flex items-start justify-between border-b pb-4 mb-4">
            <div>
              <h1 className="text-xl font-bold uppercase tracking-tight text-gray-900">
                {company?.companyName || 'Factory App'}
              </h1>
              <p className="text-xs font-semibold text-gray-500">{company?.businessName}</p>
              <p className="text-[10px] text-gray-500 mt-1">
                Address: {company?.address1} <br />
                Phone: {company?.phone} | Email: {company?.email}
              </p>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-black uppercase text-gray-600 tracking-wider">Cash Payment Voucher</h2>
              <table className="text-[10px] font-bold text-gray-600 mt-1 border-collapse inline-table">
                <tbody>
                  <tr>
                    <td className="pr-2">Voucher No:</td>
                    <td className="text-gray-900 font-extrabold">{viewingVoucher.voucherNumber}</td>
                  </tr>
                  <tr>
                    <td className="pr-2">Date:</td>
                    <td className="text-gray-900">{viewingVoucher.date}</td>
                  </tr>
                  <tr>
                    <td className="pr-2">Status:</td>
                    <td className="text-gray-900 uppercase">{viewingVoucher.status}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 my-6 border-b pb-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Paid To / Supplier:</span>
              <p className="text-sm font-bold text-gray-900">{viewingVoucher.paidTo}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold">
              <span className="text-gray-400">Category:</span>
              <span>{viewingVoucher.category}</span>
              <span className="text-gray-400">Account:</span>
              <span>{viewingVoucher.accountName}</span>
              <span className="text-gray-400">Reference:</span>
              <span>{viewingVoucher.reference || 'None'}</span>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded border flex justify-between items-center my-6">
            <span className="text-sm font-extrabold text-gray-600 uppercase">Amount Paid:</span>
            <span className="text-lg font-black text-red-700">{formatCurrency(viewingVoucher.amount)}</span>
          </div>

          {viewingVoucher.remarks && (
            <div className="border p-3 rounded text-[10px] text-gray-500 italic leading-normal">
              <strong>Remarks:</strong> <br />
              {viewingVoucher.remarks}
            </div>
          )}

          <div className="mt-16 text-center text-[10px] text-gray-400 border-t pt-2 font-bold uppercase select-none">
            Software Voucher - Powered by Factory Management System
          </div>
        </div>
      )}

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
        <div className="max-w-[1500px] w-full mx-auto flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#6B7280] tracking-wide uppercase">
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="hover:text-[#2F80ED] transition-colors cursor-pointer focus:outline-none"
            >
              Settings
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#1F2937]">Cash Out Manager</span>
          </div>

          <h2 className="text-xl font-bold text-[#1F2937] mt-1">Cash Out (Vouchers)</h2>
          <p className="text-xs text-[#6B7280] font-semibold tracking-wide uppercase">
            Record, track, and manage business payments, employee salaries, and operating expenses.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow p-8 overflow-y-auto print:hidden">
        <div className="max-w-[1500px] w-full mx-auto space-y-4">
          {successMessage && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm font-semibold rounded-[8px] flex items-center gap-2 shadow-sm animate-fadeIn">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
              {successMessage}
            </div>
          )}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-[8px] flex items-center gap-2 shadow-sm animate-fadeIn">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              {errorMessage}
            </div>
          )}

          <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-sm p-6 space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="relative max-w-sm w-full">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#6B7280]">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Voucher, Ref, Paid To..."
                    className="w-full pl-9 pr-4 py-2 bg-[#F6F8FB] border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:bg-white focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-all"
                  />
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleAddClick}
                    className="px-4 py-2 bg-[#2F80ED] hover:bg-[#1B6FD1] text-white text-sm font-semibold rounded-[6px] flex items-center gap-2 transition-colors cursor-pointer shadow-sm focus:outline-none"
                  >
                    <Plus className="w-4 h-4" /> New Cash Out
                  </button>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="p-2.5 bg-white border border-[#E5E7EB] hover:bg-[#F6F8FB] text-[#1F2937] rounded-[6px] flex items-center justify-center transition-colors cursor-pointer focus:outline-none"
                    title="Refresh Data"
                  >
                    <RefreshCw className="w-4 h-4 text-[#6B7280]" />
                  </button>
                  <TableColumnCustomizer
                    tableName="cash_out"
                    columns={allColumns}
                    visibleColumns={visibleColumns}
                    onChange={setVisibleColumns}
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-[#F6F8FB] p-4 rounded-[8px] border border-[#E5E7EB]">
                {/* Category Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                    Filter by Category
                  </label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] cursor-pointer"
                  >
                    <option value="All">All Categories</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Account Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                    Filter by Bank Account
                  </label>
                  <select
                    value={filterAccount}
                    onChange={(e) => setFilterAccount(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] cursor-pointer"
                  >
                    <option value="All">All Accounts</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.name}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                    Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] cursor-pointer"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Date range start */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full px-3 py-1 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED]"
                  />
                </div>

                {/* Date range end */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full px-3 py-1 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED]"
                  />
                </div>

                {/* Min Amount */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                    Min Amount
                  </label>
                  <input
                    type="number"
                    value={filterMinAmount}
                    onChange={(e) => setFilterMinAmount(e.target.value)}
                    placeholder="Min amount"
                    className="w-full px-3 py-1 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED]"
                  />
                </div>

                {/* Max Amount */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                    Max Amount
                  </label>
                  <input
                    type="number"
                    value={filterMaxAmount}
                    onChange={(e) => setFilterMaxAmount(e.target.value)}
                    placeholder="Max amount"
                    className="w-full px-3 py-1 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED]"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-[#E5E7EB] rounded-[8px]">
              {paginatedVouchers.length > 0 ? (
                <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-sm whitespace-nowrap">
                  <thead className="bg-[#F6F8FB] text-[#6B7280] font-semibold text-xs uppercase tracking-wider select-none">
                    <tr>
                      {visibleColumns.includes('voucherNumber') && (
                        <th
                          className="px-4 py-3.5 cursor-pointer hover:bg-gray-100/50"
                          onClick={() => {
                            setSortField('voucherNumber');
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          }}
                        >
                          <div className="flex items-center gap-1">
                            Voucher No
                            {sortField === 'voucherNumber' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                          </div>
                        </th>
                      )}
                      {visibleColumns.includes('date') && (
                        <th
                          className="px-4 py-3.5 cursor-pointer hover:bg-gray-100/50"
                          onClick={() => {
                            setSortField('date');
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          }}
                        >
                          <div className="flex items-center gap-1">
                            Date
                            {sortField === 'date' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                          </div>
                        </th>
                      )}
                      {visibleColumns.includes('paidTo') && (
                        <th
                          className="px-4 py-3.5 cursor-pointer hover:bg-gray-100/50"
                          onClick={() => {
                            setSortField('paidTo');
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          }}
                        >
                          <div className="flex items-center gap-1">
                            Paid To
                            {sortField === 'paidTo' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                          </div>
                        </th>
                      )}
                      {visibleColumns.includes('category') && (
                        <th className="px-4 py-3.5">Category</th>
                      )}
                      {visibleColumns.includes('accountName') && (
                        <th className="px-4 py-3.5">Account</th>
                      )}
                      {visibleColumns.includes('amount') && (
                        <th
                          className="px-4 py-3.5 text-right cursor-pointer hover:bg-gray-100/50"
                          onClick={() => {
                            setSortField('amount');
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          }}
                        >
                          <div className="flex items-center justify-end gap-1">
                            Amount
                            {sortField === 'amount' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                          </div>
                        </th>
                      )}
                      <th className="px-4 py-3.5">Reference</th>
                      {visibleColumns.includes('status') && (
                        <th className="px-4 py-3.5 text-center">Status</th>
                      )}
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] text-[#1F2937] font-medium bg-white">
                    {paginatedVouchers.map((v) => {
                      let statusClass = 'bg-green-50 text-green-700 border border-green-200';
                      if (v.status === 'Cancelled') {
                        statusClass = 'bg-red-50 text-red-600 border border-red-200';
                      }

                      return (
                        <tr key={v.id} className={`hover:bg-[#F6F8FB]/50 transition-colors ${v.status === 'Cancelled' ? 'opacity-65' : ''}`}>
                          {visibleColumns.includes('voucherNumber') && (
                            <td className="px-4 py-4 font-semibold text-[#2F80ED]">{v.voucherNumber}</td>
                          )}
                          {visibleColumns.includes('date') && (
                            <td className="px-4 py-4">{v.date}</td>
                          )}
                          {visibleColumns.includes('paidTo') && (
                            <td className="px-4 py-4 font-bold text-gray-800">{v.paidTo}</td>
                          )}
                          {visibleColumns.includes('category') && (
                            <td className="px-4 py-4">
                              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                {v.category}
                              </span>
                            </td>
                          )}
                          {visibleColumns.includes('accountName') && (
                            <td className="px-4 py-4 font-semibold text-gray-700">{v.accountName}</td>
                          )}
                          {visibleColumns.includes('amount') && (
                            <td className="px-4 py-4 text-right font-bold text-[#EB5757]">{formatCurrency(v.amount)}</td>
                          )}
                          <td className="px-4 py-4 text-gray-500 text-xs font-bold">{v.reference || '-'}</td>
                          {visibleColumns.includes('status') && (
                            <td className="px-4 py-4 text-center">
                              <span className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full select-none ${statusClass}`}>
                                {v.status}
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleViewDetails(v)}
                                className="text-gray-500 hover:text-gray-700 p-1.5 rounded hover:bg-gray-100 cursor-pointer"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePrintClick(v)}
                                className="text-[#27AE60] hover:text-green-800 p-1.5 rounded hover:bg-green-50 cursor-pointer"
                                title="Print Voucher"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                disabled={v.status === 'Cancelled'}
                                onClick={() => handleEditClick(v)}
                                className="text-[#2F80ED] hover:text-[#1B6FD1] p-1.5 rounded hover:bg-[#EEF5FF] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                title="Edit Voucher"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                disabled={v.status === 'Cancelled'}
                                onClick={() => handleDeleteClick(v)}
                                className="p-1.5 rounded text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                title="Delete Voucher / Soft-Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-[#6B7280] text-sm font-semibold select-none bg-white">
                  No Cash Out vouchers found. Click 'New Cash Out' to record payment.
                </div>
              )}
            </div>

            {/* Pagination */}
            {sortedVouchers.length > 0 && (
              <div className="flex items-center justify-between select-none pt-4 border-t border-[#E5E7EB]">
                <div className="text-xs font-bold text-[#6B7280]">
                  Showing {(currentPage - 1) * rowsPerPage + 1} to{' '}
                  {Math.min(currentPage * rowsPerPage, sortedVouchers.length)} of{' '}
                  {sortedVouchers.length} entries
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
                          className={`px-3 py-1.5 text-xs font-bold rounded-[6px] border transition-all focus:outline-none cursor-pointer ${currentPage === pageNum
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
          </div>
        </div>
      </main>

      {/* Voucher Modal Form */}
      {isVoucherModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-lg max-w-lg w-full p-6 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3 shrink-0">
              <h3 className="text-base font-bold text-[#1F2937]">
                {editingVoucher ? 'Edit Cash Out Voucher' : 'Record Cash Payment'}
              </h3>
              <button
                onClick={() => setIsVoucherModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVoucher} className="flex-grow overflow-y-auto py-5 space-y-4 text-xs font-semibold text-gray-700">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500">Voucher Number</label>
                <input
                  type="text"
                  value={voucherNumber}
                  onChange={(e) => setVoucherNumber(e.target.value)}
                  className={`w-full px-3 py-1.5 bg-white border ${formErrors.voucherNumber ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'
                    } text-[#1F2937] rounded focus:outline-none focus:ring-1`}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500">Date *</label>
                <input
                  type="date"
                  value={voucherDate}
                  onChange={(e) => setVoucherDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-[#E5E7EB] text-[#1F2937] rounded focus:outline-none focus:border-[#2F80ED]"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500">Paid To / Supplier *</label>
                <input
                  type="text"
                  value={paidTo}
                  onChange={(e) => setPaidTo(e.target.value)}
                  placeholder="e.g. Supplier Name / Employee / Landlord"
                  className={`w-full px-3 py-1.5 bg-white border ${formErrors.paidTo ? 'border-red-500' : 'border-[#E5E7EB]'
                    } text-[#1F2937] rounded focus:outline-none`}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-[#E5E7EB] text-[#1F2937] rounded focus:outline-none cursor-pointer"
                  required
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500">Reference / Check No</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. Receipt #1234 / Check Ref"
                  className="w-full px-3 py-1.5 bg-white border border-[#E5E7EB] text-[#1F2937] rounded focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500">Account (Withdraw From) *</label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-[#E5E7EB] text-[#1F2937] rounded focus:outline-none cursor-pointer"
                  required
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type}) - Balance: {formatCurrency(acc.currentBalance)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500">Amount Paid *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className={`w-full px-3 py-1.5 bg-white border ${formErrors.amount ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'
                    } text-[#1F2937] rounded focus:outline-none focus:ring-1`}
                  required
                />
                {formErrors.amount && <p className="text-red-500 text-[10px] font-bold mt-0.5">{formErrors.amount}</p>}
              </div>

              {/* Attachment Layout Placeholder */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" /> Attach Receipt (Architecture ready)
                </label>
                <input
                  type="file"
                  disabled
                  className="w-full px-2 py-1 bg-gray-50 border border-dashed border-gray-300 text-gray-400 rounded cursor-not-allowed"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500">Remarks / Memo</label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter details..."
                  className="w-full px-3 py-1.5 bg-white border border-[#E5E7EB] text-[#1F2937] rounded focus:outline-none resize-none"
                />
              </div>
            </form>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E7EB] shrink-0">
              <button
                type="button"
                onClick={() => setIsVoucherModalOpen(false)}
                className="px-4 py-2 bg-white border border-[#E5E7EB] hover:bg-[#F6F8FB] text-sm font-semibold text-[#1F2937] rounded-[6px] focus:outline-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSaveVoucher}
                className="px-4 py-2 bg-[#2F80ED] hover:bg-[#1B6FD1] text-sm font-semibold text-white rounded-[6px] transition-colors cursor-pointer shadow-sm focus:outline-none"
              >
                Save Voucher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details View Modal */}
      {isViewModalOpen && viewingVoucher && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-lg max-w-md w-full p-6 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3 shrink-0">
              <h3 className="text-base font-bold text-[#1F2937]">Voucher Details</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handlePrintClick(viewingVoucher)}
                  className="px-3 py-1.5 bg-[#EEF5FF] border border-[#2F80ED]/20 hover:bg-[#2F80ED] text-[#2F80ED] hover:text-white rounded-[6px] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1 rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto py-5 space-y-4 text-xs font-semibold text-gray-700">
              <div className="bg-[#F6F8FB] border p-4 rounded-[6px] flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Voucher: {viewingVoucher.voucherNumber}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Date: {viewingVoucher.date}</p>
                </div>
                <span
                  className={`px-2.5 py-0.5 text-xs font-bold rounded-full select-none ${viewingVoucher.status === 'Active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                >
                  {viewingVoucher.status}
                </span>
              </div>

              <div className="space-y-3.5 border-t border-b py-3.5">
                <div className="flex justify-between">
                  <span className="text-gray-400">Paid To</span>
                  <span className="text-gray-800 font-bold">{viewingVoucher.paidTo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Category</span>
                  <span className="text-gray-800">{viewingVoucher.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Account (Debited)</span>
                  <span className="text-gray-800">{viewingVoucher.accountName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Reference / Check No</span>
                  <span className="text-gray-800">{viewingVoucher.reference || 'None'}</span>
                </div>
                <div className="flex justify-between items-center bg-red-50 p-2.5 rounded text-red-800">
                  <span className="font-extrabold uppercase">Amount Paid</span>
                  <span className="font-black text-sm">{formatCurrency(viewingVoucher.amount)}</span>
                </div>
              </div>

              {viewingVoucher.remarks && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Remarks</span>
                  <p className="text-xs font-semibold text-gray-600 bg-gray-50 border p-2.5 rounded italic">
                    {viewingVoucher.remarks}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-[#E5E7EB] shrink-0">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 bg-white border border-[#E5E7EB] hover:bg-[#F6F8FB] text-sm font-semibold text-[#1F2937] rounded-[6px]"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-lg max-w-md w-full p-6 space-y-4 animate-fadeIn">
            <div className="flex items-center gap-3 text-red-500">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0 animate-pulse">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#1F2937]">Cancel Cash Out Voucher?</h3>
            </div>

            <p className="text-sm text-gray-600 font-medium leading-relaxed">
              Are you sure you want to cancel Cash Out Voucher <strong>{deleteTarget.voucherNumber}</strong>?
              This operation will soft-delete the payment by setting its status to <strong>Cancelled</strong>.
              <br />
              <span className="text-xs text-red-500 font-bold">
                * The corresponding bank account balance will be automatically credited/restored.
              </span>
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 bg-white border border-[#E5E7EB] hover:bg-[#F6F8FB] text-sm font-semibold text-[#1F2937] rounded-[6px] focus:outline-none"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-sm font-semibold text-white rounded-[6px] focus:outline-none shadow-sm"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
