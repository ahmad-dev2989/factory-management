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
  ChevronDown
} from 'lucide-react';
import WifiStatus from '../components/WifiStatus';
import { SidebarToggle } from '../components/Sidebar';
import { TableColumnCustomizer } from '../components/TableColumnCustomizer';
import { PrintPreview } from '../components/PrintPreview';

interface PurchaseItem {
  id: number;
  purchaseNumber: string;
  vendorName: string;
  date: string;
  subtotal: number;
  discount: number;
  grandTotal: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: string;
  paymentAccountId: number | null;
  paymentAccountName: string;
  remarks: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface PurchaseLineItem {
  id?: number;
  productId: number;
  productName: string;
  productSku: string;
  productUnit: string;
  quantity: number;
  purchasePrice: number;
  discount: number;
  total: number;
}

interface ProductItem {
  id: number;
  sku: string;
  name: string;
  stock: number;
  unit: string;
  purchasePrice: number;
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

export default function Purchases() {
  const navigate = useNavigate();

  // Data States
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [accounts, setAccounts] = useState<BankAccountItem[]>([]);
  const [company, setCompany] = useState<CompanyItem | null>(null);
  const [currencySymbol, setCurrencySymbol] = useState('Rs.');

  // Notification States
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Table Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('All');
  const [filterVendor, setFilterVendor] = useState('All');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [filterMaxAmount, setFilterMaxAmount] = useState('');
  const [filterAccountId, setFilterAccountId] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Column Visibility Preferences
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['purchaseNumber', 'date', 'vendorName', 'grandTotal', 'paidAmount', 'remainingAmount', 'status']);

  const allColumns = [
    { key: 'purchaseNumber', label: 'Purchase No' },
    { key: 'date', label: 'Date' },
    { key: 'vendorName', label: 'Vendor' },
    { key: 'grandTotal', label: 'Grand Total' },
    { key: 'paidAmount', label: 'Paid' },
    { key: 'remainingAmount', label: 'Remaining' },
    { key: 'status', label: 'Status' }
  ];

  // Print Preview Dialog States
  const [printPreviewPurchase, setPrintPreviewPurchase] = useState<PurchaseItem | null>(null);
  const [printPreviewLineItems, setPrintPreviewLineItems] = useState<any[]>([]);

  // Sorting
  const [sortField, setSortField] = useState<keyof PurchaseItem>('purchaseNumber');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modals
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Purchase Form State
  const [editingPurchase, setEditingPurchase] = useState<PurchaseItem | null>(null);
  const [purchaseNumber, setPurchaseNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank' | 'EasyPaisa' | 'JazzCash'>('Cash');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [remarks, setRemarks] = useState('');
  const [lineItems, setLineItems] = useState<PurchaseLineItem[]>([]);
  const [headerDiscount, setHeaderDiscount] = useState<string>('0');
  const [paidAmount, setPaidAmount] = useState<string>('0');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // View Details State
  const [viewingPurchase, setViewingPurchase] = useState<PurchaseItem | null>(null);
  const [viewingLineItems, setViewingLineItems] = useState<PurchaseLineItem[]>([]);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<PurchaseItem | null>(null);

  // Load Data
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

      // 2. Fetch Active Products
      const prodRes = await (window as any).electron.invoke(
        'db-query',
        "SELECT id, sku, name, stock, unit, purchase_price FROM products WHERE status = 'Active'"
      );
      if (prodRes && !prodRes.error) {
        const mappedProds = prodRes.map((p: any) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          stock: Number(p.stock) || 0,
          unit: p.unit,
          purchasePrice: Number(p.purchase_price) || 0
        }));
        setProducts(mappedProds);
      }

      // 3. Fetch Active Accounts
      const acctRes = await (window as any).electron.invoke(
        'db-query',
        "SELECT id, name, type, current_balance, status FROM bank_accounts WHERE status = 'Active'"
      );
      if (acctRes && !acctRes.error) {
        setAccounts(acctRes);
      }

      // 4. Fetch Purchases List
      const purchasesRes = await (window as any).electron.invoke(
        'db-query',
        `SELECT p.*, b.name AS payment_account_name 
         FROM purchases p 
         LEFT JOIN bank_accounts b ON p.payment_account_id = b.id
         ORDER BY p.date DESC, p.id DESC`
      );
      if (purchasesRes && !purchasesRes.error) {
        const mapped = purchasesRes.map((p: any) => ({
          id: p.id,
          purchaseNumber: p.purchase_number,
          vendorName: p.vendor_name,
          date: p.date,
          subtotal: Number(p.subtotal) || 0,
          discount: Number(p.discount) || 0,
          grandTotal: Number(p.grand_total) || 0,
          paidAmount: Number(p.paid_amount) || 0,
          remainingAmount: Number(p.remaining_amount) || 0,
          paymentMethod: p.payment_method,
          paymentAccountId: p.payment_account_id,
          paymentAccountName: p.payment_account_name || 'None',
          remarks: p.remarks || '',
          status: p.status,
          createdAt: p.created_at,
          updatedAt: p.updated_at
        }));
        setPurchases(mapped);
      }
    } catch (err) {
      console.error('[Purchases] Failed to fetch data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (amount: number) => {
    return `${currencySymbol} ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Auto-generate purchase number
  const generatePurchaseNumber = async () => {
    try {
      const salesRes = await (window as any).electron.invoke('db-query', 'SELECT MAX(id) AS max_id FROM purchases');
      const nextId = (salesRes && salesRes[0] && salesRes[0].max_id) ? (salesRes[0].max_id + 1) : 1;
      const startingNo = 1001;
      const numberPart = startingNo + nextId - 1;
      return `PUR-${numberPart}`;
    } catch (err) {
      console.error('Failed to generate purchase number:', err);
      return 'PUR-1001';
    }
  };

  // Helper: Get list of filtered active accounts based on chosen Payment Method
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (paymentMethod === 'Cash') return acc.type === 'Cash';
      if (paymentMethod === 'Bank') return acc.type === 'Bank Account';
      if (paymentMethod === 'EasyPaisa') return acc.name.toLowerCase().includes('easypaisa');
      if (paymentMethod === 'JazzCash') return acc.name.toLowerCase().includes('jazzcash');
      return true;
    });
  }, [accounts, paymentMethod]);

  // Set default account when payment method changes
  useEffect(() => {
    if (filteredAccounts.length > 0) {
      const defaultAcc = filteredAccounts.find(acc => acc.name.toLowerCase().includes('default') || acc.name.toLowerCase().includes('hand') || acc.name.toLowerCase().includes('meezan')) || filteredAccounts[0];
      setSelectedAccountId(defaultAcc.id.toString());
    } else {
      setSelectedAccountId('');
    }
  }, [paymentMethod, filteredAccounts]);

  // Live calculations
  const subtotal = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + item.total, 0);
  }, [lineItems]);

  const discountVal = parseFloat(headerDiscount) || 0;

  const grandTotal = useMemo(() => {
    const total = subtotal - discountVal;
    return total < 0 ? 0 : total;
  }, [subtotal, discountVal]);

  const paidAmountVal = parseFloat(paidAmount) || 0;

  const remainingAmount = useMemo(() => {
    const rem = grandTotal - paidAmountVal;
    return rem < 0 ? 0 : rem;
  }, [grandTotal, paidAmountVal]);

  // Add line item row
  const addLineRow = () => {
    setLineItems((prev) => [
      ...prev,
      {
        productId: 0,
        productName: '',
        productSku: '',
        productUnit: '',
        quantity: 1,
        purchasePrice: 0,
        discount: 0,
        total: 0
      }
    ]);
  };

  const removeLineRow = (index: number) => {
    setLineItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateLineRow = (index: number, updates: Partial<PurchaseLineItem>) => {
    setLineItems((prev) => {
      const copy = [...prev];
      const row = { ...copy[index], ...updates };

      const qty = row.quantity || 0;
      const price = row.purchasePrice || 0;
      const disc = row.discount || 0;
      const lineTotal = (qty * price) - disc;
      row.total = lineTotal < 0 ? 0 : lineTotal;

      copy[index] = row;
      return copy;
    });
  };

  const handleProductSelectionChange = (index: number, prodIdStr: string) => {
    const prodId = parseInt(prodIdStr) || 0;
    const selectedProd = products.find((p) => p.id === prodId);

    if (selectedProd) {
      updateLineRow(index, {
        productId: prodId,
        productName: selectedProd.name,
        productSku: selectedProd.sku,
        productUnit: selectedProd.unit,
        purchasePrice: selectedProd.purchasePrice,
        quantity: 1
      });
    } else {
      updateLineRow(index, {
        productId: 0,
        productName: '',
        productSku: '',
        productUnit: '',
        purchasePrice: 0,
        quantity: 1
      });
    }
  };

  const handleAddClick = async () => {
    setEditingPurchase(null);
    const nextPurchaseNo = await generatePurchaseNumber();
    setPurchaseNumber(nextPurchaseNo);
    setPurchaseDate(new Date().toISOString().slice(0, 10));
    setVendorName('');
    setPaymentMethod('Cash');
    setRemarks('');
    setHeaderDiscount('0');
    setPaidAmount('0');
    setFormErrors({});

    setLineItems([
      {
        productId: 0,
        productName: '',
        productSku: '',
        productUnit: '',
        quantity: 1,
        purchasePrice: 0,
        discount: 0,
        total: 0
      }
    ]);
    setIsPurchaseModalOpen(true);
  };

  const handleEditClick = async (purchase: PurchaseItem) => {
    if (purchase.status === 'Cancelled') {
      setErrorMessage('Cancelled purchases cannot be edited.');
      setTimeout(() => setErrorMessage(''), 4000);
      return;
    }

    try {
      setEditingPurchase(purchase);
      setPurchaseNumber(purchase.purchaseNumber);
      setPurchaseDate(purchase.date);
      setVendorName(purchase.vendorName);
      setPaymentMethod(purchase.paymentMethod as any);
      setSelectedAccountId(purchase.paymentAccountId ? purchase.paymentAccountId.toString() : '');
      setRemarks(purchase.remarks);
      setHeaderDiscount(purchase.discount.toString());
      setPaidAmount(purchase.paidAmount.toString());
      setFormErrors({});

      // Fetch purchase items to populate lines
      const itemsRes = await (window as any).electron.invoke(
        'db-query',
        `SELECT pi.*, p.name AS product_name, p.sku AS product_sku, p.unit AS product_unit
         FROM purchase_items pi
         LEFT JOIN products p ON pi.product_id = p.id
         WHERE pi.purchase_id = ?`,
        [purchase.id]
      );

      if (itemsRes && !itemsRes.error) {
        const mappedLines = itemsRes.map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name || 'Unknown Product',
          productSku: item.product_sku || '',
          productUnit: item.product_unit || 'Piece',
          quantity: Number(item.quantity) || 0,
          purchasePrice: Number(item.purchase_price) || 0,
          discount: Number(item.discount) || 0,
          total: Number(item.total) || 0
        }));
        setLineItems(mappedLines);
        setIsPurchaseModalOpen(true);
      } else {
        setErrorMessage('Failed to load purchase items.');
        setTimeout(() => setErrorMessage(''), 4000);
      }
    } catch (err) {
      console.error('[Purchases] Failed to open purchase for edit:', err);
    }
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // Validations
    if (!purchaseNumber.trim()) newErrors.purchaseNumber = 'Purchase Number is required';
    if (!purchaseDate) newErrors.purchaseDate = 'Purchase Date is required';
    if (!vendorName.trim()) newErrors.vendorName = 'Vendor name is required';
    if (lineItems.length === 0) newErrors.items = 'At least one item is required';

    const pAmt = parseFloat(paidAmount) || 0;
    const hDisc = parseFloat(headerDiscount) || 0;

    if (isNaN(pAmt) || pAmt < 0) {
      newErrors.paidAmount = 'Paid Amount must be a positive number';
    } else if (pAmt > grandTotal) {
      newErrors.paidAmount = 'Paid Amount cannot exceed Grand Total';
    }

    if (isNaN(hDisc) || hDisc < 0) {
      newErrors.headerDiscount = 'Discount must be a positive number';
    } else if (hDisc > subtotal) {
      newErrors.headerDiscount = 'Discount cannot exceed Subtotal';
    }

    // Validate rows
    const validatedItems = [...lineItems];
    let rowErrorFound = false;

    for (let i = 0; i < validatedItems.length; i++) {
      const row = validatedItems[i];
      if (!row.productId) {
        newErrors[`row_${i}_product`] = 'Product is required';
        rowErrorFound = true;
      }
      if (row.quantity <= 0 || isNaN(row.quantity)) {
        newErrors[`row_${i}_quantity`] = 'Qty > 0';
        rowErrorFound = true;
      }
      if (row.purchasePrice < 0 || isNaN(row.purchasePrice)) {
        newErrors[`row_${i}_price`] = 'Price >= 0';
        rowErrorFound = true;
      }
      if (row.discount < 0 || isNaN(row.discount) || row.discount > (row.quantity * row.purchasePrice)) {
        newErrors[`row_${i}_discount`] = 'Invalid discount';
        rowErrorFound = true;
      }
    }

    if (Object.keys(newErrors).length > 0 || rowErrorFound) {
      setFormErrors(newErrors);
      return;
    }

    // Payloads
    const purchasePayload = {
      purchaseNumber: purchaseNumber.trim(),
      vendorName: vendorName.trim(),
      date: purchaseDate,
      subtotal,
      discount: hDisc,
      grandTotal,
      paidAmount: pAmt,
      remainingAmount,
      paymentMethod,
      paymentAccountId: selectedAccountId ? parseInt(selectedAccountId) : null,
      remarks
    };

    const itemsPayload = lineItems.map((row) => ({
      productId: row.productId,
      quantity: row.quantity,
      purchasePrice: row.purchasePrice,
      discount: row.discount || 0,
      total: row.total
    }));

    try {
      // Check duplicate purchase number
      const checkInv = await (window as any).electron.invoke(
        'db-query',
        'SELECT id FROM purchases WHERE LOWER(purchase_number) = ? AND id != ?',
        [purchaseNumber.trim().toLowerCase(), editingPurchase ? editingPurchase.id : 0]
      );
      if (checkInv && checkInv.length > 0) {
        setFormErrors({ purchaseNumber: 'This Purchase Number is already in use.' });
        return;
      }

      if (editingPurchase) {
        const updateRes = await (window as any).electron.invoke(
          'purchases-update',
          editingPurchase.id,
          purchasePayload,
          itemsPayload
        );
        if (updateRes && !updateRes.error) {
          setSuccessMessage('Purchase updated and stock/balances adjusted successfully.');
          setIsPurchaseModalOpen(false);
          fetchData();
          setTimeout(() => setSuccessMessage(''), 4000);
        } else {
          setErrorMessage(updateRes?.message || 'Transaction failed during purchase update.');
          setTimeout(() => setErrorMessage(''), 4000);
        }
      } else {
        const createRes = await (window as any).electron.invoke(
          'purchases-create',
          purchasePayload,
          itemsPayload
        );
        if (createRes && !createRes.error) {
          setSuccessMessage('Purchase recorded and stock/ledger updated successfully.');
          setIsPurchaseModalOpen(false);
          fetchData();
          setTimeout(() => setSuccessMessage(''), 4000);
        } else {
          setErrorMessage(createRes?.message || 'Transaction failed during purchase creation.');
          setTimeout(() => setErrorMessage(''), 4000);
        }
      }
    } catch (err) {
      console.error('[Purchases] Transaction execution failure:', err);
    }
  };

  const handleViewDetails = async (purchase: PurchaseItem) => {
    setViewingPurchase(purchase);
    setIsViewModalOpen(true);

    try {
      const itemsRes = await (window as any).electron.invoke(
        'db-query',
        `SELECT pi.*, p.name AS product_name, p.sku AS product_sku, p.unit AS product_unit
         FROM purchase_items pi
         LEFT JOIN products p ON pi.product_id = p.id
         WHERE pi.purchase_id = ?`,
        [purchase.id]
      );
      if (itemsRes && !itemsRes.error) {
        const mapped = itemsRes.map((item: any) => ({
          productId: item.product_id,
          productName: item.product_name || 'Unknown Product',
          productSku: item.product_sku || '',
          productUnit: item.product_unit || 'Piece',
          quantity: Number(item.quantity) || 0,
          purchasePrice: Number(item.purchase_price) || 0,
          discount: Number(item.discount) || 0,
          total: Number(item.total) || 0
        }));
        setViewingLineItems(mapped);
      }
    } catch (err) {
      console.error('[Purchases] Failed to fetch viewing items:', err);
    }
  };

  const handleDeleteClick = (purchase: PurchaseItem) => {
    if (purchase.status === 'Cancelled') {
      setErrorMessage('This purchase invoice is already cancelled.');
      setTimeout(() => setErrorMessage(''), 4000);
      return;
    }
    setDeleteTarget(purchase);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const cancelRes = await (window as any).electron.invoke('purchases-cancel', deleteTarget.id);
      if (cancelRes && !cancelRes.error) {
        setSuccessMessage(`Purchase ${deleteTarget.purchaseNumber} has been Cancelled. Stock & balances restored.`);
        setIsDeleteModalOpen(false);
        setDeleteTarget(null);
        fetchData();
        setTimeout(() => setSuccessMessage(''), 4000);
      } else {
        setErrorMessage(cancelRes?.message || 'Database error during cancellation.');
        setTimeout(() => setErrorMessage(''), 4000);
      }
    } catch (err) {
      console.error('[Purchases] Failed to cancel purchase:', err);
    }
  };

  const handlePrintClick = (purchase: PurchaseItem) => {
    setViewingPurchase(purchase);

    (window as any).electron.invoke(
      'db-query',
      `SELECT pi.*, p.name AS product_name, p.sku AS product_sku, p.unit AS product_unit
       FROM purchase_items pi
       LEFT JOIN products p ON pi.product_id = p.id
       WHERE pi.purchase_id = ?`,
      [purchase.id]
    ).then((res: any) => {
      if (res && !res.error) {
        const mapped = res.map((item: any) => ({
          productId: item.product_id,
          productName: item.product_name || 'Unknown Product',
          productSku: item.product_sku || '',
          productUnit: item.product_unit || 'Piece',
          quantity: Number(item.quantity) || 0,
          purchasePrice: Number(item.purchase_price) || 0,
          discount: Number(item.discount) || 0,
          total: Number(item.total) || 0
        }));
        setViewingLineItems(mapped);
        setPrintPreviewLineItems(mapped);
        setPrintPreviewPurchase(purchase);
      }
    });
  };

  const handleRefresh = () => {
    fetchData();
    setSuccessMessage('Purchases invoices list refreshed.');
    setTimeout(() => setSuccessMessage(''), 2000);
  };

  // Search & filter logic
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      let matchQuery = true;
      if (q) {
        matchQuery =
          p.purchaseNumber.toLowerCase().includes(q) ||
          p.vendorName.toLowerCase().includes(q) ||
          p.date.includes(q);
      }

      let matchPayment = true;
      if (filterPaymentStatus !== 'All') {
        if (filterPaymentStatus === 'Paid') {
          matchPayment = p.remainingAmount === 0 && p.paidAmount > 0;
        } else if (filterPaymentStatus === 'Partial') {
          matchPayment = p.remainingAmount > 0 && p.paidAmount > 0;
        } else if (filterPaymentStatus === 'Unpaid') {
          matchPayment = p.paidAmount === 0;
        }
      }

      let matchVendor = true;
      if (filterVendor !== 'All') {
        matchVendor = p.vendorName.toLowerCase() === filterVendor.toLowerCase();
      }

      let matchStartDate = true;
      if (filterStartDate) {
        matchStartDate = p.date >= filterStartDate;
      }

      let matchEndDate = true;
      if (filterEndDate) {
        matchEndDate = p.date <= filterEndDate;
      }

      let matchMinAmount = true;
      if (filterMinAmount) {
        matchMinAmount = p.grandTotal >= Number(filterMinAmount);
      }

      let matchMaxAmount = true;
      if (filterMaxAmount) {
        matchMaxAmount = p.grandTotal <= Number(filterMaxAmount);
      }

      let matchAccount = true;
      if (filterAccountId !== 'All') {
        matchAccount = p.paymentAccountId === Number(filterAccountId);
      }

      let matchStatus = true;
      if (filterStatus !== 'All') {
        matchStatus = p.status === filterStatus;
      }

      return matchQuery && matchPayment && matchVendor && matchStartDate && matchEndDate && matchMinAmount && matchMaxAmount && matchAccount && matchStatus;
    });
  }, [purchases, searchQuery, filterPaymentStatus, filterVendor, filterStartDate, filterEndDate, filterMinAmount, filterMaxAmount, filterAccountId, filterStatus]);

  // Sorting
  const sortedPurchases = useMemo(() => {
    const sorted = [...filteredPurchases];
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
  }, [filteredPurchases, sortField, sortOrder]);

  // Pagination
  const paginatedPurchases = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedPurchases.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedPurchases, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(sortedPurchases.length / rowsPerPage) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterPaymentStatus, filterVendor, filterStartDate, filterEndDate, filterMinAmount, filterMaxAmount, filterAccountId, filterStatus, rowsPerPage]);

  return (
    <div className="flex-1 flex flex-col bg-[#F6F8FB] select-none min-h-screen">
      {/* Print-Only Layout Container */}
      {viewingPurchase && (
        <div id="print-invoice" className="hidden print:block font-sans text-xs p-6 bg-white text-black leading-tight">
          <div className="flex items-start justify-between border-b pb-4 mb-4">
            <div>
              <h1 className="text-xl font-bold uppercase tracking-tight text-gray-900">
                {company?.companyName || 'Textile Factory Manager'}
              </h1>
              <p className="text-xs font-semibold text-gray-500">{company?.businessName}</p>
              <p className="text-[10px] text-gray-500 mt-1">
                Address: {company?.address1} <br />
                Phone: {company?.phone} | Email: {company?.email}
              </p>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-black uppercase text-gray-600 tracking-wider">Purchase Voucher</h2>
              <table className="text-[10px] font-bold text-gray-600 mt-1 border-collapse inline-table">
                <tbody>
                  <tr>
                    <td className="pr-2">Voucher No:</td>
                    <td className="text-gray-900 font-extrabold">{viewingPurchase.purchaseNumber}</td>
                  </tr>
                  <tr>
                    <td className="pr-2">Date:</td>
                    <td className="text-gray-900">{viewingPurchase.date}</td>
                  </tr>
                  <tr>
                    <td className="pr-2">Status:</td>
                    <td className="text-gray-900 uppercase">{viewingPurchase.status}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b pb-1 mb-1.5">
                Vendor / Source:
              </h3>
              <p className="text-xs font-bold text-gray-800">{viewingPurchase.vendorName}</p>
            </div>
            <div>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b pb-1 mb-1.5">
                Payment Info:
              </h3>
              <table className="text-[10px] font-semibold text-gray-700">
                <tbody>
                  <tr>
                    <td className="pr-2 text-gray-400">Payment Method:</td>
                    <td>{viewingPurchase.paymentMethod}</td>
                  </tr>
                  <tr>
                    <td className="pr-2 text-gray-400">Deposited Account:</td>
                    <td>{viewingPurchase.paymentAccountName}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <table className="w-full text-xs text-left mb-6 border-collapse divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px]">
                <th className="py-2 px-1">SKU</th>
                <th className="py-2 px-1">Product Description</th>
                <th className="py-2 px-1 text-right">Purchase Price</th>
                <th className="py-2 px-1 text-center">Qty</th>
                <th className="py-2 px-1 text-right">Discount</th>
                <th className="py-2 px-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {viewingLineItems.map((item, idx) => (
                <tr key={idx} className="py-2">
                  <td className="py-2 px-1 font-bold text-[#2F80ED]">{item.productSku}</td>
                  <td className="py-2 px-1 font-bold text-gray-800">{item.productName}</td>
                  <td className="py-2 px-1 text-right">{formatCurrency(item.purchasePrice)}</td>
                  <td className="py-2 px-1 text-center font-bold">
                    {item.quantity.toLocaleString()} {item.productUnit}
                  </td>
                  <td className="py-2 px-1 text-right">{formatCurrency(item.discount)}</td>
                  <td className="py-2 px-1 text-right font-bold text-gray-900">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mb-6">
            <table className="w-1/2 text-xs font-semibold border-t pt-2">
              <tbody>
                <tr className="flex justify-between py-1 border-b border-gray-100">
                  <td className="text-gray-400">Subtotal:</td>
                  <td>{formatCurrency(viewingPurchase.subtotal)}</td>
                </tr>
                <tr className="flex justify-between py-1 border-b border-gray-100">
                  <td className="text-gray-400">Discount:</td>
                  <td>{formatCurrency(viewingPurchase.discount)}</td>
                </tr>
                <tr className="flex justify-between py-1 border-b border-gray-100 font-bold">
                  <td className="text-gray-900">Grand Total:</td>
                  <td className="text-gray-900">{formatCurrency(viewingPurchase.grandTotal)}</td>
                </tr>
                <tr className="flex justify-between py-1 border-b border-gray-100 text-green-700">
                  <td>Amount Paid:</td>
                  <td>{formatCurrency(viewingPurchase.paidAmount)}</td>
                </tr>
                <tr className="flex justify-between py-1 text-red-700 font-black">
                  <td>Balance Payable:</td>
                  <td>{formatCurrency(viewingPurchase.remainingAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {viewingPurchase.remarks && (
            <div className="border border-gray-200 p-2.5 rounded text-[10px] text-gray-500 italic mt-8 leading-normal">
              <strong>Voucher Remarks:</strong> <br />
              {viewingPurchase.remarks}
            </div>
          )}

          <div className="mt-12 text-center text-[10px] text-gray-400 border-t pt-2 font-bold uppercase tracking-wider">
            Software Invoice - Powered by Factory Management System
          </div>
        </div>
      )}

      {/* Top Header */}
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
              className="hover:text-[#2F80ED] transition-colors cursor-pointer"
            >
              Settings
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#1F2937]">Purchases Manager</span>
          </div>

          <h2 className="text-xl font-bold text-[#1F2937] mt-1">Purchases</h2>
          <p className="text-xs text-[#6B7280] font-semibold tracking-wide uppercase">
            Record inventory purchases, increase stock, and manage expense cash outflows.
          </p>
        </div>
      </div>

      {/* Content panel */}
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
                    placeholder="Search by Purchase No, Vendor, Date..."
                    className="w-full pl-9 pr-4 py-2 bg-[#F6F8FB] border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:bg-white focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-all"
                  />
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleAddClick}
                    className="px-4 py-2 bg-[#2F80ED] hover:bg-[#1B6FD1] text-white text-sm font-semibold rounded-[6px] flex items-center gap-2 transition-colors cursor-pointer shadow-sm focus:outline-none"
                  >
                    <Plus className="w-4 h-4" /> New Purchase
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
                    tableName="purchases"
                    columns={allColumns}
                    visibleColumns={visibleColumns}
                    onChange={setVisibleColumns}
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-[#F6F8FB] p-4 rounded-[8px] border border-[#E5E7EB]">
                {/* Vendor Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                    Filter by Vendor
                  </label>
                  <input
                    type="text"
                    value={filterVendor === 'All' ? '' : filterVendor}
                    onChange={(e) => setFilterVendor(e.target.value || 'All')}
                    placeholder="Type Vendor name"
                    className="w-full px-3 py-1 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED]"
                  />
                </div>

                {/* Payment Status Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                    Filter by Payment Status
                  </label>
                  <select
                    value={filterPaymentStatus}
                    onChange={(e) => setFilterPaymentStatus(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] cursor-pointer"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Paid">Fully Paid</option>
                    <option value="Partial">Partially Paid</option>
                    <option value="Unpaid">Unpaid / On Credit</option>
                  </select>
                </div>

                {/* Purchase Status Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                    Purchase Status
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

                {/* Account Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                    Bank / Cash Account
                  </label>
                  <select
                    value={filterAccountId}
                    onChange={(e) => setFilterAccountId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] cursor-pointer"
                  >
                    <option value="All">All Accounts</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.bankName || 'Cash'})
                      </option>
                    ))}
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
                    placeholder="Min total"
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
                    placeholder="Max total"
                    className="w-full px-3 py-1 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED]"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-[#E5E7EB] rounded-[8px]">
              {paginatedPurchases.length > 0 ? (
                <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-sm whitespace-nowrap">
                  <thead className="bg-[#F6F8FB] text-[#6B7280] font-semibold text-xs uppercase tracking-wider select-none">
                    <tr>
                      {visibleColumns.includes('purchaseNumber') && (
                        <th
                          className="px-4 py-3.5 cursor-pointer hover:bg-gray-100/50"
                          onClick={() => {
                            setSortField('purchaseNumber');
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          }}
                        >
                          <div className="flex items-center gap-1">
                            Purchase No
                            {sortField === 'purchaseNumber' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
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
                      {visibleColumns.includes('vendorName') && (
                        <th
                          className="px-4 py-3.5 cursor-pointer hover:bg-gray-100/50"
                          onClick={() => {
                            setSortField('vendorName');
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          }}
                        >
                          <div className="flex items-center gap-1">
                            Vendor / Source
                            {sortField === 'vendorName' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                          </div>
                        </th>
                      )}
                      {visibleColumns.includes('grandTotal') && (
                        <th
                          className="px-4 py-3.5 text-right cursor-pointer hover:bg-gray-100/50"
                          onClick={() => {
                            setSortField('grandTotal');
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          }}
                        >
                          <div className="flex items-center justify-end gap-1">
                            Grand Total
                            {sortField === 'grandTotal' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                          </div>
                        </th>
                      )}
                      {visibleColumns.includes('paidAmount') && (
                        <th className="px-4 py-3.5 text-right">Paid</th>
                      )}
                      {visibleColumns.includes('remainingAmount') && (
                        <th
                          className="px-4 py-3.5 text-right cursor-pointer hover:bg-gray-100/50"
                          onClick={() => {
                            setSortField('remainingAmount');
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          }}
                        >
                          <div className="flex items-center justify-end gap-1">
                            Remaining
                            {sortField === 'remainingAmount' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                          </div>
                        </th>
                      )}
                      <th className="px-4 py-3.5">Payment Method</th>
                      {visibleColumns.includes('status') && (
                        <th className="px-4 py-3.5 text-center">Status</th>
                      )}
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] text-[#1F2937] font-medium bg-white">
                    {paginatedPurchases.map((p) => {
                      let statusClass = 'bg-green-50 text-green-700 border border-green-200';
                      if (p.status === 'Cancelled') {
                        statusClass = 'bg-red-50 text-red-600 border border-red-200';
                      }

                      let paymentBadge = 'bg-red-100 text-red-800';
                      let paymentText = 'Unpaid';
                      if (p.remainingAmount === 0 && p.paidAmount > 0) {
                        paymentBadge = 'bg-green-100 text-green-800';
                        paymentText = 'Paid';
                      } else if (p.remainingAmount > 0 && p.paidAmount > 0) {
                        paymentBadge = 'bg-yellow-100 text-yellow-800 border border-yellow-200';
                        paymentText = 'Partial';
                      }

                      return (
                        <tr key={p.id} className={`hover:bg-[#F6F8FB]/50 transition-colors ${p.status === 'Cancelled' ? 'opacity-65' : ''}`}>
                          {visibleColumns.includes('purchaseNumber') && (
                            <td className="px-4 py-4 font-semibold text-[#2F80ED]">{p.purchaseNumber}</td>
                          )}
                          {visibleColumns.includes('date') && (
                            <td className="px-4 py-4">{p.date}</td>
                          )}
                          {visibleColumns.includes('vendorName') && (
                            <td className="px-4 py-4 font-bold text-gray-800">{p.vendorName}</td>
                          )}
                          {visibleColumns.includes('grandTotal') && (
                            <td className="px-4 py-4 text-right font-semibold text-[#2F80ED]">{formatCurrency(p.grandTotal)}</td>
                          )}
                          {visibleColumns.includes('paidAmount') && (
                            <td className="px-4 py-4 text-right">{formatCurrency(p.paidAmount)}</td>
                          )}
                          {visibleColumns.includes('remainingAmount') && (
                            <td className="px-4 py-4 text-right">
                              <div className="flex flex-col items-end gap-1">
                                <span className="font-bold text-gray-700">{formatCurrency(p.remainingAmount)}</span>
                                <span className={`px-2 py-0.5 text-[9px] font-black rounded-full uppercase tracking-wider ${paymentBadge}`}>
                                  {paymentText}
                                </span>
                              </div>
                            </td>
                          )}
                          <td className="px-4 py-4">
                            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                              {p.paymentMethod}
                            </span>
                          </td>
                          {visibleColumns.includes('status') && (
                            <td className="px-4 py-4 text-center">
                              <span className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full select-none ${statusClass}`}>
                                {p.status}
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleViewDetails(p)}
                                className="text-gray-500 hover:text-gray-700 p-1.5 rounded hover:bg-gray-100 cursor-pointer"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePrintClick(p)}
                                className="text-[#27AE60] hover:text-green-800 p-1.5 rounded hover:bg-green-50 cursor-pointer"
                                title="Print Voucher"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                disabled={p.status === 'Cancelled'}
                                onClick={() => handleEditClick(p)}
                                className="text-[#2F80ED] hover:text-[#1B6FD1] p-1.5 rounded hover:bg-[#EEF5FF] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                title="Edit Purchase"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                disabled={p.status === 'Cancelled'}
                                onClick={() => handleDeleteClick(p)}
                                className="p-1.5 rounded text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                title="Delete Purchase / Soft-Delete"
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
                  No purchases recorded. Click 'New Purchase' to begin.
                </div>
              )}
            </div>

            {/* Pagination */}
            {sortedPurchases.length > 0 && (
              <div className="flex items-center justify-between select-none pt-4 border-t border-[#E5E7EB]">
                <div className="text-xs font-bold text-[#6B7280]">
                  Showing {(currentPage - 1) * rowsPerPage + 1} to{' '}
                  {Math.min(currentPage * rowsPerPage, sortedPurchases.length)} of{' '}
                  {sortedPurchases.length} entries
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

      {/* Purchase Modal Form */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-lg max-w-[95vw] w-full p-6 flex flex-col h-[92vh]">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-bold text-[#1F2937]">
                  {editingPurchase ? 'Edit Purchase Voucher' : 'Record New Purchase'}
                </h3>
                <span className="bg-[#EEF5FF] text-[#2F80ED] border border-[#2F80ED]/20 px-2 py-0.5 rounded text-xs font-bold">
                  {editingPurchase ? `ID: ${editingPurchase.id}` : 'NEW'}
                </span>
              </div>
              <button
                onClick={() => setIsPurchaseModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="flex-grow overflow-y-auto py-5 space-y-6">
              <div className="bg-[#F6F8FB] p-5 rounded-[8px] border border-[#E5E7EB] grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#1F2937] uppercase tracking-wider">
                    Purchase Number *
                  </label>
                  <input
                    type="text"
                    value={purchaseNumber}
                    onChange={(e) => setPurchaseNumber(e.target.value)}
                    placeholder="e.g. PUR-1001"
                    className={`w-full px-3 py-1.5 bg-white border ${formErrors.purchaseNumber ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'
                      } text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1`}
                  />
                  {formErrors.purchaseNumber && <p className="text-red-500 text-[11px] font-semibold mt-0.5">{formErrors.purchaseNumber}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#1F2937] uppercase tracking-wider">
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#1F2937] uppercase tracking-wider">
                    Vendor / Source Name *
                  </label>
                  <input
                    type="text"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    placeholder="e.g. Asia Fabrics Ltd"
                    className={`w-full px-3 py-1.5 bg-white border ${formErrors.vendorName ? 'border-red-500' : 'border-[#E5E7EB]'
                      } text-[#1F2937] text-sm rounded-[6px] focus:outline-none`}
                  />
                  {formErrors.vendorName && <p className="text-red-500 text-[11px] font-semibold mt-0.5">{formErrors.vendorName}</p>}
                </div>

                <div className="flex flex-col gap-1.5 sm:row-span-2 sm:col-span-1">
                  <label className="text-[10px] font-bold text-[#1F2937] uppercase tracking-wider">
                    Purchase Remarks
                  </label>
                  <textarea
                    rows={4}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Provide purchase description or details..."
                    className="w-full px-3 py-1.5 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] h-full resize-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#1F2937] uppercase tracking-wider">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none cursor-pointer"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank Account</option>
                    <option value="EasyPaisa">EasyPaisa</option>
                    <option value="JazzCash">JazzCash</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#1F2937] uppercase tracking-wider">
                    Payment Account
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none cursor-pointer"
                  >
                    {filteredAccounts.length > 0 ? (
                      filteredAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.type}) - Balance: {formatCurrency(acc.currentBalance)}
                        </option>
                      ))
                    ) : (
                      <option value="">No active accounts</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center border-b pb-1.5">
                  <h4 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider">
                    Purchase Line Items
                  </h4>
                  {formErrors.items && <p className="text-red-500 text-xs font-bold">{formErrors.items}</p>}
                </div>

                <div className="overflow-x-auto border border-[#E5E7EB] rounded-[8px] bg-white">
                  <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-xs">
                    <thead className="bg-[#F6F8FB] text-[#6B7280] font-bold uppercase tracking-wider select-none">
                      <tr>
                        <th className="px-3 py-3 w-[35%]">Product Description</th>
                        <th className="px-3 py-3 w-[15%] text-right">Qty</th>
                        <th className="px-3 py-3 w-[10%] text-center">Unit</th>
                        <th className="px-3 py-3 w-[18%] text-right">Purchase Price</th>
                        <th className="px-3 py-3 w-[12%] text-right">Discount</th>
                        <th className="px-3 py-3 w-[18%] text-right">Line Total</th>
                        <th className="px-3 py-3 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] text-[#1F2937] font-semibold">
                      {lineItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/40">
                          <td className="px-3 py-2.5">
                            <select
                              value={item.productId}
                              onChange={(e) => handleProductSelectionChange(idx, e.target.value)}
                              className={`w-full px-2.5 py-1.5 bg-white border ${formErrors[`row_${idx}_product`] ? 'border-red-500' : 'border-[#E5E7EB]'
                                } rounded-[4px] focus:outline-none text-xs`}
                            >
                              <option value={0}>Select Product...</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} [{p.sku}]
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="px-3 py-2.5">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              disabled={!item.productId}
                              value={item.quantity}
                              onChange={(e) => updateLineRow(idx, { quantity: parseFloat(e.target.value) || 0 })}
                              className={`w-full px-2.5 py-1 bg-white border ${formErrors[`row_${idx}_quantity`] ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'
                                } rounded-[4px] text-right focus:outline-none focus:ring-1 text-xs`}
                            />
                            {formErrors[`row_${idx}_quantity`] && (
                              <p className="text-red-500 text-[10px] mt-0.5 text-right font-black">
                                {formErrors[`row_${idx}_quantity`]}
                              </p>
                            )}
                          </td>

                          <td className="px-3 py-2.5 text-center text-gray-500 uppercase font-black">
                            {item.productUnit || '-'}
                          </td>

                          <td className="px-3 py-2.5">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              disabled={!item.productId}
                              value={item.purchasePrice}
                              onChange={(e) => updateLineRow(idx, { purchasePrice: parseFloat(e.target.value) || 0 })}
                              className={`w-full px-2.5 py-1 bg-white border ${formErrors[`row_${idx}_price`] ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'
                                } rounded-[4px] text-right focus:outline-none focus:ring-1 text-xs`}
                            />
                          </td>

                          <td className="px-3 py-2.5">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              disabled={!item.productId}
                              value={item.discount}
                              onChange={(e) => updateLineRow(idx, { discount: parseFloat(e.target.value) || 0 })}
                              className={`w-full px-2.5 py-1 bg-white border ${formErrors[`row_${idx}_discount`] ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'
                                } rounded-[4px] text-right focus:outline-none focus:ring-1 text-xs`}
                            />
                          </td>

                          <td className="px-3 py-2.5 text-right text-gray-800 font-bold">
                            {formatCurrency(item.total)}
                          </td>

                          <td className="px-3 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => removeLineRow(idx)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-all focus:outline-none cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  onClick={addLineRow}
                  className="px-3 py-1.5 bg-[#F6F8FB] border border-[#E5E7EB] hover:bg-[#EEF5FF] text-[#2F80ED] text-xs font-bold rounded-[6px] flex items-center gap-1.5 transition-colors cursor-pointer focus:outline-none"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Row
                </button>
              </div>

              <div className="flex justify-end pt-4">
                <div className="w-full max-w-sm bg-[#F6F8FB] p-5 rounded-[8px] border border-[#E5E7EB] space-y-3.5">
                  <h4 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider border-b pb-1.5 mb-1">
                    Purchase Summary
                  </h4>

                  <div className="flex justify-between items-center text-xs text-gray-600 font-semibold">
                    <span>Subtotal:</span>
                    <span className="font-bold text-gray-800">{formatCurrency(subtotal)}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs text-gray-600 font-semibold gap-4">
                    <span>Discount ({currencySymbol}):</span>
                    <div className="max-w-[120px] w-full">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={headerDiscount}
                        onChange={(e) => setHeaderDiscount(e.target.value)}
                        className={`w-full px-2 py-1 bg-white border ${formErrors.headerDiscount ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'
                          } rounded text-right focus:outline-none focus:ring-1 text-xs`}
                      />
                    </div>
                  </div>
                  {formErrors.headerDiscount && <p className="text-red-500 text-[10px] font-black text-right mt-0.5">{formErrors.headerDiscount}</p>}

                  <div className="flex justify-between items-center text-xs font-black text-gray-900 border-t pt-2.5">
                    <span>Grand Total:</span>
                    <span>{formatCurrency(grandTotal)}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs text-gray-600 font-semibold gap-4 border-t pt-2.5">
                    <span>Paid Amount ({currencySymbol}):</span>
                    <div className="max-w-[120px] w-full">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        className={`w-full px-2 py-1 bg-white border ${formErrors.paidAmount ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'
                          } rounded text-right focus:outline-none focus:ring-1 text-xs`}
                      />
                    </div>
                  </div>
                  {formErrors.paidAmount && <p className="text-red-500 text-[10px] font-black text-right mt-0.5">{formErrors.paidAmount}</p>}

                  <div className="flex justify-between items-center text-xs font-black text-red-600 border-t pt-2.5">
                    <span>Remaining Payable:</span>
                    <span>{formatCurrency(remainingAmount)}</span>
                  </div>
                </div>
              </div>
            </form>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB] shrink-0">
              <button
                type="button"
                onClick={() => setIsPurchaseModalOpen(false)}
                className="px-4 py-2 bg-white border border-[#E5E7EB] hover:bg-[#F6F8FB] text-sm font-semibold text-[#1F2937] rounded-[6px] focus:outline-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSavePurchase}
                className="px-4 py-2 bg-[#2F80ED] hover:bg-[#1B6FD1] text-sm font-semibold text-white rounded-[6px] transition-colors cursor-pointer shadow-sm focus:outline-none"
              >
                Save Purchase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Details Modal */}
      {isViewModalOpen && viewingPurchase && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-lg max-w-4xl w-full p-6 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3 shrink-0">
              <h3 className="text-base font-bold text-[#1F2937]">Purchase Voucher Details</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handlePrintClick(viewingPurchase)}
                  className="px-3.5 py-1.5 bg-[#EEF5FF] border border-[#2F80ED]/20 hover:bg-[#2F80ED] text-[#2F80ED] hover:text-white rounded-[6px] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
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

            <div className="flex-grow overflow-y-auto py-6 space-y-6">
              <div className="bg-[#F6F8FB] p-5 rounded-[8px] border border-[#E5E7EB] flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-gray-900">Voucher: {viewingPurchase.purchaseNumber}</h4>
                  <p className="text-xs text-gray-500 font-semibold mt-1">
                    Date: <span className="text-gray-800">{viewingPurchase.date}</span>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span
                    className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full select-none ${viewingPurchase.status === 'Active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                  >
                    {viewingPurchase.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-1.5 mb-2">
                    Vendor Details
                  </h5>
                  <table className="w-full text-xs font-semibold text-gray-700">
                    <tbody>
                      <tr className="py-1 flex justify-between">
                        <td className="text-gray-400">Vendor / Source</td>
                        <td className="font-bold">{viewingPurchase.vendorName}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-1.5 mb-2">
                    Payment details
                  </h5>
                  <table className="w-full text-xs font-semibold text-gray-700">
                    <tbody>
                      <tr className="py-1 flex justify-between">
                        <td className="text-gray-400">Payment Method</td>
                        <td>{viewingPurchase.paymentMethod}</td>
                      </tr>
                      <tr className="py-1 flex justify-between">
                        <td className="text-gray-400">Deposited Bank Account</td>
                        <td>{viewingPurchase.paymentAccountName}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-1.5 mb-2">
                  Line Items list
                </h5>
                <div className="overflow-x-auto border border-[#E5E7EB] rounded-[6px]">
                  <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-xs">
                    <thead className="bg-[#F6F8FB] text-[#6B7280] font-bold uppercase select-none">
                      <tr>
                        <th className="px-3 py-2">Product SKU</th>
                        <th className="px-3 py-2">Product Name</th>
                        <th className="px-3 py-2 text-right">Purchase Price</th>
                        <th className="px-3 py-2 text-center">Qty</th>
                        <th className="px-3 py-2 text-right">Discount</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] text-gray-700 font-semibold">
                      {viewingLineItems.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50/20">
                          <td className="px-3 py-2 text-[#2F80ED]">{item.productSku}</td>
                          <td className="px-3 py-2 font-bold text-gray-800">{item.productName}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(item.purchasePrice)}</td>
                          <td className="px-3 py-2 text-center">
                            {item.quantity} {item.productUnit}
                          </td>
                          <td className="px-3 py-2 text-right">{formatCurrency(item.discount)}</td>
                          <td className="px-3 py-2 text-right font-bold text-gray-900">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="w-1/2 bg-[#F6F8FB] border border-[#E5E7EB] p-4 rounded-[6px] space-y-2 text-xs font-semibold text-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Subtotal:</span>
                    <span>{formatCurrency(viewingPurchase.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Discount:</span>
                    <span>{formatCurrency(viewingPurchase.discount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 border-t pt-1.5">
                    <span>Grand Total:</span>
                    <span>{formatCurrency(viewingPurchase.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between text-green-700 font-bold border-t pt-1.5">
                    <span>Paid Amount:</span>
                    <span>{formatCurrency(viewingPurchase.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between text-red-700 font-black border-t pt-1.5">
                    <span>Remaining Payable:</span>
                    <span>{formatCurrency(viewingPurchase.remainingAmount)}</span>
                  </div>
                </div>
              </div>

              {viewingPurchase.remarks && (
                <div>
                  <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-1.5 mb-2">
                    Remarks
                  </h5>
                  <p className="text-xs text-gray-600 italic bg-gray-50 p-3 rounded-[6px] border border-gray-200 font-semibold leading-relaxed">
                    {viewingPurchase.remarks}
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

      {/* Delete / Cancel Confirmation Modal Dialog */}
      {isDeleteModalOpen && deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-lg max-w-md w-full p-6 space-y-4 animate-fadeIn">
            <div className="flex items-center gap-3 text-red-500">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0 animate-pulse">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#1F2937]">Cancel Purchase Voucher?</h3>
            </div>

            <p className="text-sm text-gray-600 font-medium leading-relaxed">
              Are you sure you want to cancel Purchase Voucher <strong>{deleteTarget.purchaseNumber}</strong>?
              This operation will soft-delete the voucher by setting its status to <strong>Cancelled</strong>.
              <br />
              <span className="text-xs text-red-500 font-bold">
                * Product stock levels will be decreased and payment bank credits will be restored.
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

      {printPreviewPurchase && (
        <PrintPreview
          title={`Purchase Voucher ${printPreviewPurchase.purchaseNumber}`}
          htmlContent={`
            <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; padding: 20px; color: #1f2937;">
              <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #8b5cf6; padding-bottom: 10px; margin-bottom: 20px;">
                <div>
                  <h1 style="font-size: 20px; font-weight: bold; margin: 0; text-transform: uppercase;">${company?.companyName || 'Textile Factory Manager'}</h1>
                  <p style="margin: 2px 0 0 0; color: #6b7280; font-size: 11px;">${company?.businessName || ''}</p>
                  <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 10px;">
                    Address: ${company?.address1 || ''} ${company?.address2 || ''}<br/>
                    Phone: ${company?.phone || ''} | Email: ${company?.email || ''}
                  </p>
                </div>
                <div style="text-align: right;">
                  <h2 style="font-size: 18px; font-weight: 900; margin: 0; color: #4b5563; text-transform: uppercase; tracking-wider: 1px;">Purchase</h2>
                  <div style="margin-top: 5px; font-size: 11px; font-weight: 650; color: #4b5563;">
                    <strong>Voucher No:</strong> ${printPreviewPurchase.purchaseNumber}<br/>
                    <strong>Date:</strong> ${printPreviewPurchase.date}<br/>
                    <strong>Status:</strong> <span class="badge badge-active" style="padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; background-color: #d1fae5; color: #065f46;">${printPreviewPurchase.status}</span>
                  </div>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
                <div>
                  <h3 style="font-size: 10px; font-weight: bold; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px; margin-bottom: 5px;">Vendor / Supplier:</h3>
                  <p style="font-size: 12px; font-weight: bold; margin: 0; color: #1f2937;">${printPreviewPurchase.vendorName}</p>
                </div>
                <div>
                  <h3 style="font-size: 10px; font-weight: bold; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px; margin-bottom: 5px;">Payment Details:</h3>
                  <p style="font-size: 11px; margin: 0; color: #4b5563;">
                    <strong>Payment Method:</strong> ${printPreviewPurchase.paymentMethod}<br/>
                    <strong>Account:</strong> ${printPreviewPurchase.paymentAccountName || 'N/A'}
                  </p>
                </div>
              </div>

              <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                <thead>
                  <tr style="background-color: #f9fafb; border-bottom: 2px solid #e5e7eb; font-size: 10px; color: #4b5563; text-transform: uppercase; font-weight: bold;">
                    <th style="padding: 8px 10px; text-align: left;">SKU</th>
                    <th style="padding: 8px 10px; text-align: left;">Product</th>
                    <th style="padding: 8px 10px; text-align: right;">Price</th>
                    <th style="padding: 8px 10px; text-align: center;">Qty</th>
                    <th style="padding: 8px 10px; text-align: right;">Discount</th>
                    <th style="padding: 8px 10px; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${printPreviewLineItems.map(item => `
                    <tr style="border-bottom: 1px solid #f3f4f6; font-size: 11px; color: #374151;">
                      <td style="padding: 8px 10px; font-weight: bold; color: #8b5cf6;">${item.productSku}</td>
                      <td style="padding: 8px 10px; font-weight: bold;">${item.productName}</td>
                      <td style="padding: 8px 10px; text-align: right;">Rs. ${item.purchasePrice.toLocaleString()}</td>
                      <td style="padding: 8px 10px; text-align: center; font-weight: bold;">${item.quantity.toLocaleString()} ${item.productUnit}</td>
                      <td style="padding: 8px 10px; text-align: right;">Rs. ${item.discount.toLocaleString()}</td>
                      <td style="padding: 8px 10px; text-align: right; font-weight: bold; color: #111827;">Rs. ${item.total.toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div style="display: flex; justify-content: flex-end; margin-bottom: 25px;">
                <table style="width: 50%; font-size: 11px; border-top: 1px solid #e5e7eb;">
                  <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 5px 0; color: #6b7280;">Subtotal:</td><td style="padding: 5px 0; text-align: right; font-weight: bold;">Rs. ${printPreviewPurchase.subtotal.toLocaleString()}</td></tr>
                  <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 5px 0; color: #6b7280;">Discount:</td><td style="padding: 5px 0; text-align: right; font-weight: bold;">Rs. ${printPreviewPurchase.discount.toLocaleString()}</td></tr>
                  <tr style="border-bottom: 1px solid #e5e7eb; font-weight: bold; font-size: 12px;"><td style="padding: 6px 0; color: #111827;">Grand Total:</td><td style="padding: 6px 0; text-align: right; color: #111827;">Rs. ${printPreviewPurchase.grandTotal.toLocaleString()}</td></tr>
                  <tr style="border-bottom: 1px solid #f3f4f6; color: #15803d;"><td style="padding: 5px 0;">Paid Amount:</td><td style="padding: 5px 0; text-align: right; font-weight: bold;">Rs. ${printPreviewPurchase.paidAmount.toLocaleString()}</td></tr>
                  <tr style="color: #b91c1c; font-weight: bold;"><td style="padding: 5px 0;">Balance Due:</td><td style="padding: 5px 0; text-align: right; font-weight: 900;">Rs. ${printPreviewPurchase.remainingAmount.toLocaleString()}</td></tr>
                </table>
              </div>

              ${printPreviewPurchase.remarks ? `
                <div style="border: 1px solid #e5e7eb; padding: 10px; border-radius: 6px; font-size: 10px; color: #6b7280; font-style: italic;">
                  <strong>Remarks:</strong> ${printPreviewPurchase.remarks}
                </div>
              ` : ''}
            </div>
          `}
          onClose={() => setPrintPreviewPurchase(null)}
        />
      )}
    </div>
  );
}
