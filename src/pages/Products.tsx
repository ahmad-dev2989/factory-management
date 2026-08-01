import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wifi,
  Bell,
  Mail,
  LogOut,
  ChevronRight,
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  ArrowLeft,
  Download,
  Upload,
  RefreshCw,
  Eye,
  ChevronUp,
  ChevronDown,
  Package
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { SidebarToggle } from '../components/Sidebar';

interface ProductItem {
  id: number;
  sku: string;
  barcode: string;
  name: string;
  categoryId: number | null;
  categoryName: string;
  purchasePrice: number;
  salePrice: number;
  minimumSalePrice: number;
  stock: number;
  minimumStock: number;
  unit: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface CategoryItem {
  id: number;
  name: string;
}

const ALLOWED_UNITS = ['Piece', 'Kg', 'Liter', 'Box', 'Packet', 'Meter'];

export default function Products() {
  const navigate = useNavigate();

  // State Lists
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [currencySymbol, setCurrencySymbol] = useState('Rs.');
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { showToast, confirm } = useNotification();

  // Filtering State
  const [inputQuery, setInputQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterStockStatus, setFilterStockStatus] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  // Sorting State
  const [sortField, setSortField] = useState<keyof ProductItem>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modals State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Form Fields State (Product)
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [minimumSalePrice, setMinimumSalePrice] = useState('');
  const [stock, setStock] = useState('');
  const [minimumStock, setMinimumStock] = useState('');
  const [unit, setUnit] = useState('Piece');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Active');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // View Details Modal State
  const [viewingProduct, setViewingProduct] = useState<ProductItem | null>(null);

  // Category Sub-modal Form State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');

  // CSV Import State
  const [importSummary, setImportSummary] = useState<{
    total: number;
    success: number;
    skipped: number;
    details: { row: number; sku: string; name: string; reason: string }[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Initial Data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Preferences
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

      // 2. Fetch Categories
      const catRes = await (window as any).electron.invoke(
        'db-query',
        'SELECT * FROM product_categories ORDER BY name ASC'
      );
      if (catRes && !catRes.error) {
        setCategories(catRes);
      }

      // 3. Fetch Products
      const prodRes = await (window as any).electron.invoke(
        'db-query',
        `SELECT p.*, c.name AS category_name 
         FROM products p 
         LEFT JOIN product_categories c ON p.category_id = c.id
         ORDER BY p.name ASC`
      );
      if (prodRes && !prodRes.error) {
        const mapped = prodRes.map((p: any) => ({
          id: p.id,
          sku: p.sku,
          barcode: p.barcode || '',
          name: p.name,
          categoryId: p.category_id,
          categoryName: p.category_name || 'Uncategorized',
          purchasePrice: Number(p.purchase_price) || 0,
          salePrice: Number(p.sale_price) || 0,
          minimumSalePrice: Number(p.minimum_sale_price) || 0,
          stock: Number(p.stock) || 0,
          minimumStock: Number(p.minimum_stock) || 0,
          unit: p.unit,
          description: p.description || '',
          status: p.status,
          createdAt: p.created_at,
          updatedAt: p.updated_at
        }));
        setProducts(mapped);
      }
    } catch (err) {
      console.error('[Products] Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(inputQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [inputQuery]);

  useKeyboardShortcuts({
    onNew: () => handleAddClick(),
    onSave: () => {
      if (isFormModalOpen) {
        const form = document.getElementById('product-form') as HTMLFormElement;
        if (form) form.requestSubmit();
      }
    },
    onSearch: () => {
      const searchInput = document.getElementById('search-box') as HTMLInputElement;
      if (searchInput) searchInput.focus();
    },
    onEscape: () => {
      setIsFormModalOpen(false);
      setIsViewModalOpen(false);
      setIsCategoryModalOpen(false);
      setIsImportModalOpen(false);
    }
  }, [isFormModalOpen]);

  // Format Helpers
  const formatCurrency = (amount: number) => {
    return `${currencySymbol} ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Reset Modal Fields
  const resetFormFields = () => {
    setSku('');
    setBarcode('');
    setName('');
    setCategoryId('');
    setPurchasePrice('');
    setSalePrice('');
    setMinimumSalePrice('');
    setStock('');
    setMinimumStock('');
    setUnit('Piece');
    setDescription('');
    setStatus('Active');
    setFormErrors({});
  };

  const handleAddClick = () => {
    setEditingProduct(null);
    resetFormFields();
    setIsFormModalOpen(true);
  };

  const handleEditClick = (product: ProductItem) => {
    setEditingProduct(product);
    setSku(product.sku);
    setBarcode(product.barcode);
    setName(product.name);
    setCategoryId(product.categoryId ? product.categoryId.toString() : '');
    setPurchasePrice(product.purchasePrice.toString());
    setSalePrice(product.salePrice.toString());
    setMinimumSalePrice(product.minimumSalePrice.toString());
    setStock(product.stock.toString());
    setMinimumStock(product.minimumStock.toString());
    setUnit(product.unit);
    setDescription(product.description);
    setStatus(product.status);
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  const handleViewClick = (product: ProductItem) => {
    setViewingProduct(product);
    setIsViewModalOpen(true);
  };

  const handleDeleteClick = (product: ProductItem) => {
    confirm(
      'Disable Product',
      `Are you sure you want to set "${product.name}" (SKU: ${product.sku}) status to Inactive? This preserves transaction histories.`,
      async () => {
        try {
          const deleteRes = await (window as any).electron.invoke(
            'db-query',
            "UPDATE products SET status = 'Inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [product.id]
          );

          if (deleteRes && !deleteRes.error) {
            showToast(`Product "${product.name}" marked as Inactive successfully.`, 'success');
            fetchData();
          } else {
            showToast('Database error occurred while disabling product.', 'error');
          }
        } catch (err) {
          console.error('[Products] Failed to delete product:', err);
          showToast('Failed to disable product.', 'error');
        }
      },
      { type: 'danger', confirmText: 'Deactivate' }
    );
  };

  const handleAddCategoryClick = () => {
    setNewCategoryName('');
    setCategoryError('');
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      setCategoryError('Category Name is required.');
      return;
    }

    try {
      const checkRes = await (window as any).electron.invoke(
        'db-query',
        'SELECT id FROM product_categories WHERE LOWER(name) = ?',
        [newCategoryName.trim().toLowerCase()]
      );

      if (checkRes && checkRes.length > 0) {
        setCategoryError('Category already exists.');
        return;
      }

      const saveRes = await (window as any).electron.invoke(
        'db-query',
        'INSERT INTO product_categories (name) VALUES (?)',
        [newCategoryName.trim()]
      );

      if (saveRes && !saveRes.error) {
        // Refetch categories
        const catRes = await (window as any).electron.invoke(
          'db-query',
          'SELECT * FROM product_categories ORDER BY name ASC'
        );
        if (catRes && !catRes.error) {
          setCategories(catRes);
          // Set selection to new category
          const insertedId = saveRes.lastInsertRowid;
          if (insertedId) {
            setCategoryId(insertedId.toString());
          }
        }
        setIsCategoryModalOpen(false);
      }
    } catch (err) {
      console.error('[Products] Failed to create category:', err);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const newErrors: Record<string, string> = {};

    // Standard Validation checks
    if (!sku.trim()) newErrors.sku = 'SKU is required';
    if (!name.trim()) newErrors.name = 'Product Name is required';
    
    const pPrice = parseFloat(purchasePrice) || 0;
    const sPrice = parseFloat(salePrice) || 0;
    const minSPrice = parseFloat(minimumSalePrice) || 0;
    const cStock = parseFloat(stock) || 0;
    const mStock = parseFloat(minimumStock) || 0;

    if (purchasePrice.trim() === '' || isNaN(pPrice) || pPrice < 0) {
      newErrors.purchasePrice = 'Purchase Price must be a positive number';
    }
    if (salePrice.trim() === '' || isNaN(sPrice) || sPrice < 0) {
      newErrors.salePrice = 'Sale Price must be a positive number';
    } else if (sPrice < pPrice) {
      newErrors.salePrice = 'Sale Price cannot be less than Purchase Price';
    }
    if (minimumSalePrice.trim() !== '' && (isNaN(minSPrice) || minSPrice < 0)) {
      newErrors.minimumSalePrice = 'Min Sale Price must be a positive number';
    } else if (minSPrice > sPrice) {
      newErrors.minimumSalePrice = 'Min Sale Price cannot exceed standard Sale Price';
    }
    if (stock.trim() === '' || isNaN(cStock) || cStock < 0) {
      newErrors.stock = 'Current Stock must be a positive number';
    }
    if (minimumStock.trim() === '' || isNaN(mStock) || mStock < 0) {
      newErrors.minimumStock = 'Minimum Stock must be a positive number';
    }
    if (!unit) {
      newErrors.unit = 'Unit is required';
    } else if (!ALLOWED_UNITS.includes(unit)) {
      newErrors.unit = 'Invalid unit selection';
    }

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      return;
    }

    setIsSaving(true);
    try {
      // 1. Check duplicate SKU in DB
      const skuCheck = await (window as any).electron.invoke(
        'db-query',
        'SELECT id FROM products WHERE LOWER(sku) = ? AND id != ?',
        [sku.trim().toLowerCase(), editingProduct ? editingProduct.id : 0]
      );
      if (skuCheck && skuCheck.length > 0) {
        setFormErrors({ sku: 'This SKU is already assigned to another product' });
        setIsSaving(false);
        return;
      }

      // 2. Check duplicate Barcode in DB (if barcode provided)
      if (barcode.trim()) {
        const barcodeCheck = await (window as any).electron.invoke(
          'db-query',
          'SELECT id FROM products WHERE LOWER(barcode) = ? AND id != ?',
          [barcode.trim().toLowerCase(), editingProduct ? editingProduct.id : 0]
        );
        if (barcodeCheck && barcodeCheck.length > 0) {
          setFormErrors({ barcode: 'This Barcode is already assigned to another product' });
          setIsSaving(false);
          return;
        }
      }

      const numericCategoryId = categoryId ? parseInt(categoryId) : null;
      const formattedBarcode = barcode.trim() || null;
      const finalMinSalePrice = minimumSalePrice.trim() ? minSPrice : sPrice;

      if (editingProduct) {
        // Update
        const updateRes = await (window as any).electron.invoke(
          'db-query',
          `UPDATE products SET 
            sku = ?, barcode = ?, name = ?, category_id = ?, 
            purchase_price = ?, sale_price = ?, minimum_sale_price = ?, 
            stock = ?, minimum_stock = ?, unit = ?, description = ?, 
            status = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            sku.trim(),
            formattedBarcode,
            name.trim(),
            numericCategoryId,
            pPrice,
            sPrice,
            finalMinSalePrice,
            cStock,
            mStock,
            unit,
            description.trim(),
            status,
            editingProduct.id
          ]
        );

        if (updateRes && !updateRes.error) {
          showToast('Product updated successfully.', 'success');
          setIsFormModalOpen(false);
          fetchData();
        } else {
          showToast('Database error occurred while updating product.', 'error');
        }
      } else {
        // Create
        const createRes = await (window as any).electron.invoke(
          'db-query',
          `INSERT INTO products (
            sku, barcode, name, category_id, purchase_price, sale_price, 
            minimum_sale_price, stock, minimum_stock, unit, description, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            sku.trim(),
            formattedBarcode,
            name.trim(),
            numericCategoryId,
            pPrice,
            sPrice,
            finalMinSalePrice,
            cStock,
            mStock,
            unit,
            description.trim(),
            status
          ]
        );

        if (createRes && !createRes.error) {
          showToast('Product created successfully.', 'success');
          setIsFormModalOpen(false);
          fetchData();
        } else {
          showToast('Database error occurred while creating product.', 'error');
        }
      }
    } catch (err) {
      console.error('[Products] Failed to save product:', err);
      showToast('Failed to save product.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefresh = () => {
    fetchData();
    showToast('Data refreshed.', 'success');
  };

  // Sorting Handler
  const requestSort = (field: keyof ProductItem) => {
    let order: 'asc' | 'desc' = 'asc';
    if (sortField === field && sortOrder === 'asc') {
      order = 'desc';
    }
    setSortField(field);
    setSortOrder(order);
  };

  // CSV Import/Export Code
  const handleExportCSV = () => {
    try {
      if (products.length === 0) {
        showToast('No products available to export.', 'error');
        return;
      }

      // Headers matching the DB columns and schema
      const headers = [
        'SKU',
        'Barcode',
        'Product Name',
        'Category',
        'Purchase Price',
        'Sale Price',
        'Minimum Sale Price',
        'Current Stock',
        'Minimum Stock',
        'Unit',
        'Description',
        'Status'
      ];

      const csvRows = [headers.join(',')];

      for (const p of products) {
        const values = [
          p.sku,
          p.barcode,
          p.name,
          p.categoryName,
          p.purchasePrice.toString(),
          p.salePrice.toString(),
          p.minimumSalePrice.toString(),
          p.stock.toString(),
          p.minimumStock.toString(),
          p.unit,
          p.description,
          p.status
        ];

        // Format CSV values to handle spaces, commas, quotes
        const escaped = values.map((val) => {
          const stringVal = val ? val.toString() : '';
          if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
            return `"${stringVal.replace(/"/g, '""')}"`;
          }
          return stringVal;
        });

        csvRows.push(escaped.join(','));
      }

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `products_export_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Products exported successfully.', 'success');
    } catch (err) {
      console.error('[Products] Failed to export CSV:', err);
      showToast('Export failed.', 'error');
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Helper to parse CSV lines correctly, respecting double quotes
  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentValue = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentValue += '"'; // escaped quote
          i++;
        } else {
          inQuotes = !inQuotes; // toggle quotes mode
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentValue.trim());
        currentValue = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(currentValue.trim());
        if (row.length > 1 || row[0] !== '') {
          lines.push(row);
        }
        row = [];
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    if (row.length > 0 || currentValue !== '') {
      row.push(currentValue.trim());
      lines.push(row);
    }
    return lines;
  };

  const handleCSVFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        const rows = parseCSV(text);
        if (rows.length < 2) {
          showToast('Empty or invalid CSV file.', 'error');
          return;
        }

        const headers = rows[0].map(h => h.toLowerCase().replace(/\s/g, ''));
        const dataRows = rows.slice(1);

        // Map column indexes based on headers
        const skuIdx = headers.indexOf('sku');
        const barcodeIdx = headers.indexOf('barcode');
        const nameIdx = headers.indexOf('productname');
        const categoryIdx = headers.indexOf('category');
        const pPriceIdx = headers.indexOf('purchaseprice');
        const sPriceIdx = headers.indexOf('saleprice');
        const minSPriceIdx = headers.indexOf('minimumsaleprice');
        const stockIdx = headers.indexOf('currentstock');
        const minStockIdx = headers.indexOf('minimumstock');
        const unitIdx = headers.indexOf('unit');
        const descIdx = headers.indexOf('description');
        const statusIdx = headers.indexOf('status');

        if (skuIdx === -1 || nameIdx === -1) {
          showToast('CSV must contain at least "SKU" and "Product Name" columns.', 'error');
          return;
        }

        const summaryDetails: { row: number; sku: string; name: string; reason: string }[] = [];
        const validInserts: { sql: string; params: any[] }[] = [];
        
        // Track SKUs and Barcodes inside this file to prevent file-internal duplicates
        const processedSKUs = new Set<string>();
        const processedBarcodes = new Set<string>();

        // Pre-fetch all existing SKUs and Barcodes from database to validate duplicates efficiently
        const existingProds = await (window as any).electron.invoke('db-query', 'SELECT sku, barcode FROM products');
        const existingSKUs = new Set<string>(existingProds.map((p: any) => p.sku.toLowerCase().trim()));
        const existingBarcodes = new Set<string>(
          existingProds.filter((p: any) => p.barcode).map((p: any) => p.barcode.toLowerCase().trim())
        );

        // Pre-fetch categories
        const dbCats = await (window as any).electron.invoke('db-query', 'SELECT id, name FROM product_categories');
        const categoryMap = new Map<string, number>();
        dbCats.forEach((c: any) => categoryMap.set(c.name.toLowerCase().trim(), c.id));
        let nextCategoryId = dbCats.length > 0 ? Math.max(...dbCats.map((c: any) => c.id)) + 1 : 1;

        // Transactions to insert missing categories dynamically during parsing
        const categoryInserts: { sql: string; params: any[] }[] = [];

        for (let i = 0; i < dataRows.length; i++) {
          const rowData = dataRows[i];
          const rowNum = i + 2; // header + 1-indexed

          // Standardize row length
          if (rowData.length < 2) continue;

          const rawSku = rowData[skuIdx]?.trim() || '';
          const rawName = rowData[nameIdx]?.trim() || '';
          const rawBarcode = barcodeIdx !== -1 ? rowData[barcodeIdx]?.trim() || '' : '';
          const rawCategory = categoryIdx !== -1 ? rowData[categoryIdx]?.trim() || 'General' : 'General';
          
          const rawPPrice = pPriceIdx !== -1 ? rowData[pPriceIdx]?.trim() : '0';
          const rawSPrice = sPriceIdx !== -1 ? rowData[sPriceIdx]?.trim() : '0';
          const rawMinSPrice = minSPriceIdx !== -1 ? rowData[minSPriceIdx]?.trim() : '';
          const rawStock = stockIdx !== -1 ? rowData[stockIdx]?.trim() : '0';
          const rawMinStock = minStockIdx !== -1 ? rowData[minStockIdx]?.trim() : '0';
          
          const rawUnit = unitIdx !== -1 ? rowData[unitIdx]?.trim() : 'Piece';
          const rawDesc = descIdx !== -1 ? rowData[descIdx]?.trim() : '';
          const rawStatus = statusIdx !== -1 ? rowData[statusIdx]?.trim() : 'Active';

          // 1. SKU validation
          if (!rawSku) {
            summaryDetails.push({ row: rowNum, sku: '', name: rawName, reason: 'Missing SKU' });
            continue;
          }
          if (processedSKUs.has(rawSku.toLowerCase()) || existingSKUs.has(rawSku.toLowerCase())) {
            summaryDetails.push({ row: rowNum, sku: rawSku, name: rawName, reason: 'Duplicate SKU (ignored)' });
            continue; // Ignore duplicate SKU per requirements
          }

          // 2. Barcode validation
          if (rawBarcode) {
            if (processedBarcodes.has(rawBarcode.toLowerCase()) || existingBarcodes.has(rawBarcode.toLowerCase())) {
              summaryDetails.push({ row: rowNum, sku: rawSku, name: rawName, reason: 'Duplicate Barcode' });
              continue;
            }
          }

          // 3. Name validation
          if (!rawName) {
            summaryDetails.push({ row: rowNum, sku: rawSku, name: '', reason: 'Missing Product Name' });
            continue;
          }

          // 4. Price validations
          const pPrice = parseFloat(rawPPrice) || 0;
          const sPrice = parseFloat(rawSPrice) || 0;
          const minSPrice = rawMinSPrice ? (parseFloat(rawMinSPrice) || 0) : sPrice;
          const cStock = parseFloat(rawStock) || 0;
          const mStock = parseFloat(rawMinStock) || 0;

          if (pPrice < 0) {
            summaryDetails.push({ row: rowNum, sku: rawSku, name: rawName, reason: 'Purchase Price cannot be negative' });
            continue;
          }
          if (sPrice < pPrice) {
            summaryDetails.push({ row: rowNum, sku: rawSku, name: rawName, reason: 'Sale Price cannot be less than Purchase Price' });
            continue;
          }
          if (minSPrice < 0 || minSPrice > sPrice) {
            summaryDetails.push({ row: rowNum, sku: rawSku, name: rawName, reason: 'Invalid Minimum Sale Price' });
            continue;
          }
          if (cStock < 0 || mStock < 0) {
            summaryDetails.push({ row: rowNum, sku: rawSku, name: rawName, reason: 'Stock and Minimum Stock must be positive' });
            continue;
          }

          // 5. Unit validation
          let matchedUnit = ALLOWED_UNITS.find(u => u.toLowerCase() === rawUnit.toLowerCase());
          if (!matchedUnit) {
            matchedUnit = 'Piece'; // Fallback / default
          }

          // 6. Status validation
          const matchedStatus = rawStatus.toLowerCase() === 'inactive' ? 'Inactive' : 'Active';

          // 7. Resolve category ID
          let catId: number | null = null;
          const catKey = rawCategory.toLowerCase().trim();
          if (catKey) {
            if (categoryMap.has(catKey)) {
              catId = categoryMap.get(catKey)!;
            } else {
              // Add new category dynamically to DB and map
              catId = nextCategoryId++;
              categoryMap.set(catKey, catId);
              categoryInserts.push({
                sql: 'INSERT OR IGNORE INTO product_categories (id, name) VALUES (?, ?)',
                params: [catId, rawCategory]
              });
            }
          } else {
            // General category (id 1)
            catId = 1;
          }

          // Row is valid! Record it.
          processedSKUs.add(rawSku.toLowerCase());
          if (rawBarcode) processedBarcodes.add(rawBarcode.toLowerCase());

          validInserts.push({
            sql: `INSERT INTO products (
              sku, barcode, name, category_id, purchase_price, sale_price, 
              minimum_sale_price, stock, minimum_stock, unit, description, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            params: [
              rawSku,
              rawBarcode || null,
              rawName,
              catId,
              pPrice,
              sPrice,
              minSPrice,
              cStock,
              mStock,
              matchedUnit,
              rawDesc,
              matchedStatus
            ]
          });
        }

        // Execute all updates/inserts in a single database transaction
        if (categoryInserts.length > 0 || validInserts.length > 0) {
          const allQueries = [...categoryInserts, ...validInserts];
          const txRes = await (window as any).electron.invoke('db-transaction', allQueries);

          if (txRes && !txRes.error) {
            setImportSummary({
              total: dataRows.length,
              success: validInserts.length,
              skipped: summaryDetails.length,
              details: summaryDetails
            });
            setIsImportModalOpen(true);
            showToast(`Import completed. ${validInserts.length} products added.`, 'success');
            fetchData();
          } else {
            showToast('Transaction failed during database import.', 'error');
          }
        } else {
          setImportSummary({
            total: dataRows.length,
            success: 0,
            skipped: summaryDetails.length,
            details: summaryDetails
          });
          setIsImportModalOpen(true);
        }
      } catch (err) {
        console.error('[Products] CSV parsing/import error:', err);
        showToast('Import failed due to layout parse error.', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Filter and Search Logic
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Search Query (SKU, Barcode, Name, Category)
      const q = searchQuery.toLowerCase().trim();
      let matchQuery = true;
      if (q) {
        matchQuery =
          p.sku.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q);
      }

      // 2. Category Filter
      let matchCategory = true;
      if (filterCategory !== 'All') {
        matchCategory = p.categoryName.toLowerCase() === filterCategory.toLowerCase();
      }

      // 3. Stock Status Filter
      let matchStock = true;
      if (filterStockStatus !== 'All') {
        if (filterStockStatus === 'In Stock') {
          matchStock = p.stock > p.minimumStock;
        } else if (filterStockStatus === 'Low Stock') {
          matchStock = p.stock <= p.minimumStock && p.stock > 0;
        } else if (filterStockStatus === 'Out Of Stock') {
          matchStock = p.stock === 0;
        }
      }

      // 4. Status Filter (Active / Inactive)
      let matchStatus = true;
      if (filterStatus !== 'All') {
        matchStatus = p.status.toLowerCase() === filterStatus.toLowerCase();
      }

      return matchQuery && matchCategory && matchStock && matchStatus;
    });
  }, [products, searchQuery, filterCategory, filterStockStatus, filterStatus]);

  // Sorting Logic
  const sortedProducts = useMemo(() => {
    const sorted = [...filteredProducts];
    sorted.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle null or undef
      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      if (typeof aVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal);
      } else {
        // Numeric
        return sortOrder === 'asc'
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      }
    });
    return sorted;
  }, [filteredProducts, sortField, sortOrder]);

  // Pagination Logic
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedProducts.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedProducts, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(sortedProducts.length / rowsPerPage) || 1;

  useEffect(() => {
    setCurrentPage(1); // Reset page on filter/search change
  }, [searchQuery, filterCategory, filterStockStatus, filterStatus, rowsPerPage]);

  return (
    <div className="flex-1 flex flex-col bg-[#F6F8FB] select-none min-h-screen">
      {/* Top Blue Header */}
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
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-4 text-white/80 border-r border-white/20 pr-4">
            <button
              className="hover:text-white p-1 rounded transition-colors cursor-pointer focus:outline-none"
              title="Network Connection"
            >
              <Wifi className="w-[18px] h-[18px]" />
            </button>
            <button
              className="hover:text-white p-1 rounded transition-colors cursor-pointer focus:outline-none relative"
              title="Notifications"
            >
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-red-400 rounded-full"></span>
            </button>
            <button
              className="hover:text-white p-1 rounded transition-colors cursor-pointer focus:outline-none"
              title="Messages"
            >
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

      {/* Breadcrumbs & Page Titles */}
      <div className="bg-white border-b border-[#E5E7EB] py-5 px-8 flex flex-col justify-center">
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
            <span className="text-[#1F2937]">Products Management</span>
          </div>

          <h2 className="text-xl font-bold text-[#1F2937] mt-1">Products</h2>
          <p className="text-xs text-[#6B7280] font-semibold tracking-wide uppercase">
            Manage your inventory list, SKU pricing, units, and categories.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow p-8 overflow-y-auto">
        <div className="max-w-[1500px] w-full mx-auto space-y-4">
          {/* Table Container Card */}
          <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] p-6 space-y-6">
            {/* Search and Filters Toolbar */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Search Bar */}
                <div className="relative max-w-sm w-full">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#6B7280]">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    id="search-box"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder="Search by SKU, Barcode, Name..."
                    className="w-full pl-9 pr-9 py-2 bg-[#F6F8FB] border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:bg-white focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-all"
                  />
                  {inputQuery && (
                    <button
                      type="button"
                      onClick={() => setInputQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6B7280] hover:text-[#1F2937] transition-colors focus:outline-none cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Operations Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddClick}
                    className="px-4 py-2 bg-[#2F80ED] hover:bg-[#1B6FD1] text-white text-sm font-semibold rounded-[6px] flex items-center gap-2 transition-colors cursor-pointer shadow-sm focus:outline-none"
                  >
                    <Plus className="w-4 h-4" /> Add Product
                  </button>

                  <button
                    type="button"
                    onClick={handleImportClick}
                    className="px-3.5 py-2 bg-white border border-[#E5E7EB] hover:bg-[#F6F8FB] text-[#1F2937] text-sm font-semibold rounded-[6px] flex items-center gap-2 transition-colors cursor-pointer focus:outline-none"
                    title="Import CSV"
                  >
                    <Upload className="w-4 h-4 text-[#6B7280]" /> Import
                  </button>
                  {/* Hidden File Input for CSV */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleCSVFileChange}
                    accept=".csv"
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="px-3.5 py-2 bg-white border border-[#E5E7EB] hover:bg-[#F6F8FB] text-[#1F2937] text-sm font-semibold rounded-[6px] flex items-center gap-2 transition-colors cursor-pointer focus:outline-none"
                    title="Export CSV"
                  >
                    <Download className="w-4 h-4 text-[#6B7280]" /> Export
                  </button>

                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="p-2 bg-white border border-[#E5E7EB] hover:bg-[#F6F8FB] text-[#1F2937] rounded-[6px] flex items-center justify-center transition-colors cursor-pointer focus:outline-none"
                    title="Refresh Data"
                  >
                    <RefreshCw className="w-4 h-4 text-[#6B7280]" />
                  </button>
                </div>
              </div>

              {/* Filters Area */}
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-4 bg-[#F6F8FB] p-4 rounded-[8px] border border-[#E5E7EB]">
                {/* Category Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                    Category
                  </label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] cursor-pointer"
                  >
                    <option value="All">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Stock Status Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                    Stock Status
                  </label>
                  <select
                    value={filterStockStatus}
                    onChange={(e) => setFilterStockStatus(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] cursor-pointer"
                  >
                    <option value="All">All Stock Levels</option>
                    <option value="In Stock">In Stock</option>
                    <option value="Low Stock">Low Stock</option>
                    <option value="Out Of Stock">Out Of Stock</option>
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
                    className="w-full px-3 py-1.5 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] cursor-pointer"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Desktop Products Table */}
            <div className="overflow-x-auto border border-[#E5E7EB] rounded-[8px] max-h-[650px] relative">
              {loading ? (
                <div className="p-12 text-center text-sm text-gray-500 font-semibold select-none flex flex-col items-center justify-center gap-3 bg-white">
                  <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                  <span>Loading inventory records...</span>
                </div>
              ) : paginatedProducts.length > 0 ? (
                <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-sm whitespace-nowrap">
                  <thead className="bg-[#F6F8FB] text-[#6B7280] font-semibold text-xs uppercase tracking-wider select-none sticky top-0 z-10 shadow-sm border-b">
                    <tr>
                      <th
                        className="px-4 py-3.5 cursor-pointer hover:bg-gray-100/50 transition-colors"
                        onClick={() => requestSort('sku')}
                      >
                        <div className="flex items-center gap-1">
                          SKU
                          {sortField === 'sku' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                        </div>
                      </th>
                      <th className="px-4 py-3.5">Barcode</th>
                      <th
                        className="px-4 py-3.5 cursor-pointer hover:bg-gray-100/50 transition-colors"
                        onClick={() => requestSort('name')}
                      >
                        <div className="flex items-center gap-1">
                          Product Name
                          {sortField === 'name' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                        </div>
                      </th>
                      <th className="px-4 py-3.5">Category</th>
                      <th
                        className="px-4 py-3.5 text-right cursor-pointer hover:bg-gray-100/50 transition-colors"
                        onClick={() => requestSort('purchasePrice')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Purchase Price
                          {sortField === 'purchasePrice' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3.5 text-right cursor-pointer hover:bg-gray-100/50 transition-colors"
                        onClick={() => requestSort('salePrice')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Sale Price
                          {sortField === 'salePrice' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3.5 text-right cursor-pointer hover:bg-gray-100/50 transition-colors"
                        onClick={() => requestSort('stock')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Current Stock
                          {sortField === 'stock' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                        </div>
                      </th>
                      <th className="px-4 py-3.5 text-right">Min Stock</th>
                      <th className="px-4 py-3.5">Unit</th>
                      <th className="px-4 py-3.5 text-center">Status</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] text-[#1F2937] font-medium bg-white">
                    {paginatedProducts.map((p) => {
                      // Stock status styling check
                      let stockBadgeClass = 'bg-green-100 text-green-800';
                      let stockBadgeText = 'In Stock';

                      if (p.stock === 0) {
                        stockBadgeClass = 'bg-red-100 text-red-800';
                        stockBadgeText = 'Out of Stock';
                      } else if (p.stock <= p.minimumStock) {
                        stockBadgeClass = 'bg-yellow-100 text-yellow-800 border border-yellow-200';
                        stockBadgeText = 'Low Stock';
                      }

                      return (
                        <tr key={p.id} className="hover:bg-[#F6F8FB]/50 transition-colors">
                          <td className="px-4 py-3.5 font-semibold text-[#2F80ED]">{p.sku}</td>
                          <td className="px-4 py-3.5 text-xs text-[#6B7280]">{p.barcode || '-'}</td>
                          <td className="px-4 py-3.5 font-bold text-gray-800 truncate max-w-xs">{p.name}</td>
                          <td className="px-4 py-3.5 text-xs font-semibold text-gray-500 bg-gray-50/50 border-x border-[#E5E7EB]/50 px-2 py-0.5 rounded text-center">
                            {p.categoryName}
                          </td>
                          <td className="px-4 py-3.5 text-right">{formatCurrency(p.purchasePrice)}</td>
                          <td className="px-4 py-3.5 text-right font-semibold text-[#27AE60]">{formatCurrency(p.salePrice)}</td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className="font-bold">{p.stock.toLocaleString()}</span>
                              <span className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${stockBadgeClass}`}>
                                {stockBadgeText}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right text-gray-500">{p.minimumStock.toLocaleString()}</td>
                          <td className="px-4 py-3.5 text-xs font-bold text-[#6B7280] uppercase tracking-wider">{p.unit}</td>
                          <td className="px-4 py-3.5 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full select-none ${
                                p.status === 'Active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleViewClick(p)}
                                className="text-gray-500 hover:text-gray-700 p-1.5 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditClick(p)}
                                className="text-[#2F80ED] hover:text-[#1B6FD1] p-1.5 rounded hover:bg-[#EEF5FF] transition-colors cursor-pointer"
                                title="Edit Product"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteClick(p)}
                                className="p-1.5 rounded text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Delete / Mark Inactive"
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
                <div className="p-12 text-center text-[#6B7280] text-sm font-semibold select-none bg-white flex flex-col items-center justify-center gap-3">
                  <Package className="w-12 h-12 text-gray-300 animate-pulse" />
                  <div>
                    <h3 className="text-gray-900 font-bold">No Products Found</h3>
                    <p className="text-xs text-gray-500 mt-1">There are no products matching your active criteria. Click "Add Product" to start.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {sortedProducts.length > 0 && (
              <div className="flex items-center justify-between select-none pt-4 border-t border-[#E5E7EB]">
                <div className="text-xs font-bold text-[#6B7280]">
                  Showing {(currentPage - 1) * rowsPerPage + 1} to{' '}
                  {Math.min(currentPage * rowsPerPage, sortedProducts.length)} of{' '}
                  {sortedProducts.length} entries
                </div>

                <div className="flex items-center gap-4">
                  {/* Rows per Page */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#6B7280] font-semibold">Rows per page:</span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => setRowsPerPage(parseInt(e.target.value))}
                      className="px-2.5 py-1 bg-white border border-[#E5E7EB] text-[#1F2937] text-xs font-bold rounded-[4px] focus:outline-none cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>

                  {/* Nav Buttons */}
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
          </div>
        </div>
      </main>

      {/* Add / Edit Form Modal Dialog */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-lg max-w-4xl w-full p-6 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-bold text-[#1F2937]">
                  {editingProduct ? 'Edit Product' : 'Add Product'}
                </h3>
                <span className="bg-[#EEF5FF] text-[#2F80ED] border border-[#2F80ED]/20 px-2 py-0.5 rounded text-xs font-bold">
                  {editingProduct ? `ID: ${editingProduct.id}` : 'NEW'}
                </span>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="product-form" onSubmit={handleSaveProduct} className="flex-grow overflow-y-auto py-5 space-y-6">
              {/* Section: Basic Information */}
              <div>
                <h4 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-4 border-b border-[#E5E7EB] pb-1.5">
                  Basic Information
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  {/* SKU */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                      SKU *
                    </label>
                    <input
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="e.g. PROD-1001"
                      className={`w-full px-3 py-2 bg-white border ${
                        formErrors.sku ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'
                      } text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1`}
                    />
                    {formErrors.sku && <p className="text-red-500 text-xs mt-1 font-semibold">{formErrors.sku}</p>}
                  </div>

                  {/* Barcode */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                      Barcode
                    </label>
                    <input
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="e.g. 748392019"
                      className={`w-full px-3 py-2 bg-white border ${
                        formErrors.barcode ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'
                      } text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1`}
                    />
                    {formErrors.barcode && <p className="text-red-500 text-xs mt-1 font-semibold">{formErrors.barcode}</p>}
                  </div>

                  {/* Product Name */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Cotton Thread 40/2"
                      className={`w-full px-3 py-2 bg-white border ${
                        formErrors.name ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'
                      } text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1`}
                    />
                    {formErrors.name && <p className="text-red-500 text-xs mt-1 font-semibold">{formErrors.name}</p>}
                  </div>
                </div>
              </div>

              {/* Section: Category, Units, Status */}
              <div>
                <h4 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-4 border-b border-[#E5E7EB] pb-1.5">
                  Category & Measurements
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  {/* Category */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                      Category
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] cursor-pointer"
                      >
                        <option value="">Uncategorized</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAddCategoryClick}
                        className="px-3 bg-[#EEF5FF] border border-[#2F80ED]/20 text-[#2F80ED] rounded-[6px] text-sm font-bold hover:bg-[#2F80ED] hover:text-white transition-colors cursor-pointer"
                        title="Add Category"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Unit */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                      Unit *
                    </label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className={`w-full px-3 py-2 bg-white border ${
                        formErrors.unit ? 'border-red-500 focus:border-red-500' : 'border-[#E5E7EB] focus:border-[#2F80ED]'
                      } text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1 cursor-pointer`}
                    >
                      {ALLOWED_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                    {formErrors.unit && <p className="text-red-500 text-xs mt-1 font-semibold">{formErrors.unit}</p>}
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] cursor-pointer"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section: Pricing & Stock Levels */}
              <div>
                <h4 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-4 border-b border-[#E5E7EB] pb-1.5">
                  Pricing & Stock Settings
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {/* Purchase Price */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                      Purchase Price ({currencySymbol}) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      placeholder="0.00"
                      className={`w-full px-3 py-2 bg-white border ${
                        formErrors.purchasePrice ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'
                      } text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1`}
                    />
                    {formErrors.purchasePrice && <p className="text-red-500 text-xs mt-1 font-semibold">{formErrors.purchasePrice}</p>}
                  </div>

                  {/* Sale Price */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                      Sale Price ({currencySymbol}) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      placeholder="0.00"
                      className={`w-full px-3 py-2 bg-white border ${
                        formErrors.salePrice ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'
                      } text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1`}
                    />
                    {formErrors.salePrice && <p className="text-red-500 text-xs mt-1 font-semibold">{formErrors.salePrice}</p>}
                  </div>

                  {/* Minimum Sale Price */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                      Min Sale Price ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={minimumSalePrice}
                      onChange={(e) => setMinimumSalePrice(e.target.value)}
                      placeholder="Same as sale price"
                      className={`w-full px-3 py-2 bg-white border ${
                        formErrors.minimumSalePrice ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'
                      } text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1`}
                    />
                    {formErrors.minimumSalePrice && <p className="text-red-500 text-xs mt-1 font-semibold">{formErrors.minimumSalePrice}</p>}
                  </div>

                  {/* Current Stock */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                      Current Stock *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      placeholder="0"
                      className={`w-full px-3 py-2 bg-white border ${
                        formErrors.stock ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'
                      } text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1`}
                    />
                    {formErrors.stock && <p className="text-red-500 text-xs mt-1 font-semibold">{formErrors.stock}</p>}
                  </div>

                  {/* Minimum Stock */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                      Min Stock *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={minimumStock}
                      onChange={(e) => setMinimumStock(e.target.value)}
                      placeholder="0"
                      className={`w-full px-3 py-2 bg-white border ${
                        formErrors.minimumStock ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'
                      } text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1`}
                    />
                    {formErrors.minimumStock && <p className="text-red-500 text-xs mt-1 font-semibold">{formErrors.minimumStock}</p>}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-4 border-b border-[#E5E7EB] pb-1.5">
                  Detailed Description
                </h4>
                <div>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide additional details about the product..."
                    className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED]"
                  />
                </div>
              </div>

              {/* Static buttons placeholder inside modal content, form is submitted via footer */}
              <button type="submit" className="hidden" />
            </form>

            {/* Actions Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB] shrink-0">
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                disabled={isSaving}
                className="px-4 py-2 bg-white border border-[#E5E7EB] hover:bg-[#F6F8FB] text-sm font-semibold text-[#1F2937] rounded-[6px] transition-colors cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSaveProduct}
                disabled={isSaving}
                className="px-4 py-2 bg-[#2F80ED] hover:bg-[#1B6FD1] text-sm font-semibold text-white rounded-[6px] transition-colors cursor-pointer shadow-sm focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isSaving ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Creation Sub-modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
              <h3 className="text-sm font-bold text-[#1F2937]">Create Product Category</h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => {
                    setNewCategoryName(e.target.value);
                    setCategoryError('');
                  }}
                  placeholder="e.g. Raw Materials"
                  className={`w-full px-3 py-2 bg-white border ${
                    categoryError ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'
                  } text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1`}
                  autoFocus
                />
                {categoryError && <p className="text-red-500 text-xs mt-1 font-semibold">{categoryError}</p>}
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-3.5 py-1.5 bg-white border border-[#E5E7EB] hover:bg-[#F6F8FB] text-xs font-semibold text-[#1F2937] rounded-[4px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[#2F80ED] hover:bg-[#1B6FD1] text-xs font-semibold text-white rounded-[4px]"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Details View Modal Dialog */}
      {isViewModalOpen && viewingProduct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-lg max-w-2xl w-full p-6 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3 shrink-0">
              <h3 className="text-base font-bold text-[#1F2937]">Product Details</h3>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto py-6 space-y-6">
              {/* Product Header */}
              <div className="bg-[#F6F8FB] p-5 rounded-[8px] border border-[#E5E7EB] flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{viewingProduct.name}</h4>
                  <p className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wider">
                    SKU: <span className="font-bold text-[#2F80ED]">{viewingProduct.sku}</span>
                  </p>
                </div>
                <span
                  className={`inline-block px-3 py-1 text-xs font-black rounded-full uppercase tracking-wider ${
                    viewingProduct.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {viewingProduct.status}
                </span>
              </div>

              {/* Specifications Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-1.5 mb-2">
                    General details
                  </h5>
                  <table className="w-full text-xs font-semibold text-gray-700 divide-y divide-gray-100">
                    <tbody>
                      <tr className="py-2 flex justify-between">
                        <td className="text-gray-400">Barcode</td>
                        <td>{viewingProduct.barcode || 'N/A'}</td>
                      </tr>
                      <tr className="py-2 flex justify-between">
                        <td className="text-gray-400">Category</td>
                        <td>{viewingProduct.categoryName}</td>
                      </tr>
                      <tr className="py-2 flex justify-between">
                        <td className="text-gray-400">Unit</td>
                        <td className="uppercase">{viewingProduct.unit}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-1.5 mb-2">
                    Pricing & Valuation
                  </h5>
                  <table className="w-full text-xs font-semibold text-gray-700 divide-y divide-gray-100">
                    <tbody>
                      <tr className="py-2 flex justify-between">
                        <td className="text-gray-400">Purchase Price</td>
                        <td>{formatCurrency(viewingProduct.purchasePrice)}</td>
                      </tr>
                      <tr className="py-2 flex justify-between">
                        <td className="text-gray-400">Sale Price</td>
                        <td className="text-[#27AE60]">{formatCurrency(viewingProduct.salePrice)}</td>
                      </tr>
                      <tr className="py-2 flex justify-between">
                        <td className="text-gray-400">Min Sale Price</td>
                        <td>{formatCurrency(viewingProduct.minimumSalePrice)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Stock Inventory Levels */}
              <div>
                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-1.5 mb-2">
                  Inventory Stock Level
                </h5>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-[#EEF5FF] border border-[#2F80ED]/20 p-4 rounded-[6px]">
                    <div className="text-xs text-[#2F80ED] font-bold uppercase tracking-wider">Current Stock</div>
                    <div className="text-xl font-black text-gray-800 mt-1">{viewingProduct.stock.toLocaleString()}</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-[6px]">
                    <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Minimum Stock</div>
                    <div className="text-xl font-black text-gray-800 mt-1">{viewingProduct.minimumStock.toLocaleString()}</div>
                  </div>
                  <div className="bg-green-50 border border-green-200 p-4 rounded-[6px]">
                    <div className="text-xs text-green-600 font-bold uppercase tracking-wider">Status</div>
                    <div className="text-sm font-bold text-gray-800 mt-2">
                      {viewingProduct.stock === 0 ? (
                        <span className="text-red-600">OUT OF STOCK</span>
                      ) : viewingProduct.stock <= viewingProduct.minimumStock ? (
                        <span className="text-yellow-600">LOW STOCK</span>
                      ) : (
                        <span className="text-green-600">IN STOCK</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-1.5 mb-2">
                  Description Notes
                </h5>
                <p className="text-xs text-gray-600 leading-relaxed font-semibold italic bg-gray-50 p-3 rounded-[6px] border border-gray-200">
                  {viewingProduct.description || 'No description notes provided for this product.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#E5E7EB]">
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



      {/* CSV Import Results Summary Modal */}
      {isImportModalOpen && importSummary && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-lg max-w-2xl w-full p-6 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3 shrink-0">
              <h3 className="text-base font-bold text-[#1F2937]">CSV Import Summary</h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto py-6 space-y-6">
              {/* Counts Grid */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-[6px]">
                  <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Rows</div>
                  <div className="text-2xl font-black text-gray-800 mt-1">{importSummary.total}</div>
                </div>
                <div className="bg-green-50 border border-green-200 p-4 rounded-[6px]">
                  <div className="text-xs text-green-600 font-bold uppercase tracking-wider">Imported</div>
                  <div className="text-2xl font-black text-green-700 mt-1">{importSummary.success}</div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-[6px]">
                  <div className="text-xs text-yellow-600 font-bold uppercase tracking-wider">Skipped / Ignored</div>
                  <div className="text-2xl font-black text-yellow-700 mt-1">{importSummary.skipped}</div>
                </div>
              </div>

              {/* Details of Ignored Rows */}
              {importSummary.details.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Skipped Records Log</h4>
                  <div className="overflow-x-auto border border-[#E5E7EB] rounded-[6px] max-h-[300px] overflow-y-auto">
                    <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-xs">
                      <thead className="bg-[#F6F8FB] text-[#6B7280] font-bold uppercase select-none">
                        <tr>
                          <th className="px-3 py-2">Row</th>
                          <th className="px-3 py-2">SKU</th>
                          <th className="px-3 py-2">Product Name</th>
                          <th className="px-3 py-2">Skipped Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB] text-gray-700 font-medium">
                        {importSummary.details.map((d, index) => (
                          <tr key={index} className="hover:bg-red-50/20">
                            <td className="px-3 py-2 text-gray-400">{d.row}</td>
                            <td className="px-3 py-2 font-semibold text-[#2F80ED]">{d.sku || '-'}</td>
                            <td className="px-3 py-2 max-w-[200px] truncate">{d.name || '-'}</td>
                            <td className="px-3 py-2 text-red-600 font-semibold">{d.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-[#E5E7EB]">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-[#2F80ED] hover:bg-[#1B6FD1] text-sm font-semibold text-white rounded-[6px]"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
