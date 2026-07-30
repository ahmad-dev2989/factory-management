import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wifi, Bell, Mail, LogOut, ChevronRight, Search, ChevronDown, Check } from 'lucide-react';

// Custom Searchable Dropdown Component
const SearchableSelect = ({
    label,
    value,
    onChange,
    options,
    error
}: {
    label: string,
    value: string,
    onChange: (val: string) => void,
    options: { id: string, name: string }[],
    error?: string
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        opt.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedOption = options.find(opt => opt.id === value);

    return (
        <div className="relative flex flex-col gap-1.5" ref={wrapperRef}>
            <label className="text-xs font-semibold text-[#1F2937] uppercase tracking-wider">
                {label} *
            </label>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-3 py-2 bg-white border ${error ? 'border-red-500' : isOpen ? 'border-[#2F80ED]' : 'border-[#E5E7EB]'} text-[#1F2937] text-sm rounded-[6px] flex items-center justify-between cursor-pointer transition-colors shadow-sm hover:border-[#2F80ED]/50`}
            >
                <span className={selectedOption ? "text-[#1F2937]" : "text-[#6B7280]"}>
                    {selectedOption ? selectedOption.name : "Select account..."}
                </span>
                <ChevronDown className={`w-4 h-4 text-[#6B7280] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {error && <span className="text-xs font-semibold text-red-500">{error}</span>}

            {isOpen && (
                <div className="absolute top-[64px] left-0 w-full bg-white border border-[#E5E7EB] rounded-[8px] shadow-lg z-50 overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-[#E5E7EB] bg-[#F6F8FB]">
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-[#6B7280]">
                                <Search className="w-3.5 h-3.5" />
                            </span>
                            <input
                                type="text"
                                autoFocus
                                placeholder="Search accounts..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#E5E7EB] text-[#1F2937] text-xs rounded-[4px] focus:outline-none focus:border-[#2F80ED]"
                            />
                        </div>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto py-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(opt => (
                                <div
                                    key={opt.id}
                                    onClick={() => {
                                        onChange(opt.id);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                    className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between hover:bg-[#EEF5FF] transition-colors ${value === opt.id ? 'bg-[#F6F8FB] font-semibold text-[#2F80ED]' : 'text-[#1F2937]'}`}
                                >
                                    {opt.name}
                                    {value === opt.id && <Check className="w-4 h-4" />}
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-4 text-xs text-center text-[#6B7280]">
                                No accounts found.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default function LinkedAccounts() {
    const navigate = useNavigate();

    const handleLogout = () => {
        navigate('/login');
    };

    // Simulated Chart of Accounts Data for Dropdowns
    const chartOfAccounts = [
        { id: '1', name: 'Sales Income' },
        { id: '2', name: 'Sales Return' },
        { id: '3', name: 'Sales Discount' },
        { id: '4', name: 'Accounts Receivable' },
        { id: '5', name: 'Purchase Cost' },
        { id: '6', name: 'Purchase Return' },
        { id: '7', name: 'Accounts Payable' },
        { id: '8', name: 'Purchase Discount' },
        { id: '9', name: 'Cash in Hand' },
        { id: '10', name: 'Petty Cash' },
        { id: '11', name: 'Meezan Bank' },
        { id: '12', name: 'Miscellaneous Expenses' },
        { id: '13', name: 'Inventory Asset' },
        { id: '14', name: 'Cost of Goods Sold' },
        { id: '15', name: 'Owner Capital' },
        { id: '16', name: 'Retained Earnings' },
    ];

    // Initial Default Configuration
    const defaultConfig = {
        salesIncome: '1',
        salesReturn: '2',
        salesDiscount: '3',
        customerReceivable: '4',
        purchase: '5',
        purchaseReturn: '6',
        supplierPayable: '7',
        purchaseDiscount: '8',
        cashIn: '9',
        cashOut: '9',
        pettyCash: '10',
        defaultBank: '11',
        defaultExpense: '12',
        inventoryAsset: '13',
        cogs: '14',
        ownerCapital: '15',
        retainedEarnings: '16'
    };

    const [config, setConfig] = useState(defaultConfig);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await (window as any).electron.invoke('db-query', "SELECT value FROM app_settings WHERE key = 'linked_accounts_config'");
                if (res && res[0] && res[0].value) {
                    setConfig(JSON.parse(res[0].value));
                }
            } catch (err) {
                console.error('[LinkedAccounts] Failed to load config:', err);
            }
        };
        fetchConfig();
    }, []);

    const handleUpdate = (field: keyof typeof defaultConfig, value: string) => {
        setConfig(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleSave = () => {
        const newErrors: Record<string, string> = {};
        let hasErrors = false;

        // Validate that every field is selected
        (Object.keys(config) as Array<keyof typeof defaultConfig>).forEach(key => {
            if (!config[key]) {
                newErrors[key] = 'Account is required';
                hasErrors = true;
            }
        });

        if (hasErrors) {
            setErrors(newErrors);
            setSuccessMessage('');
            return;
        }

        const saveConfig = async () => {
            try {
                await (window as any).electron.invoke(
                    'db-query',
                    "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('linked_accounts_config', ?)",
                    [JSON.stringify(config)]
                );
                setErrors({});
                setSuccessMessage('Linked accounts updated successfully.');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setTimeout(() => setSuccessMessage(''), 4000);
            } catch (err) {
                console.error('[LinkedAccounts] Failed to save config:', err);
            }
        };
        saveConfig();
    };

    const handleReset = () => {
        const resetConfig = async () => {
            try {
                await (window as any).electron.invoke(
                    'db-query',
                    "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('linked_accounts_config', ?)",
                    [JSON.stringify(defaultConfig)]
                );
                setConfig(defaultConfig);
                setErrors({});
                setSuccessMessage('Linked accounts reset to defaults.');
                setTimeout(() => setSuccessMessage(''), 4000);
            } catch (err) {
                console.error('[LinkedAccounts] Failed to reset config:', err);
            }
        };
        resetConfig();
    };

    return (
        <div className="flex-1 flex flex-col bg-[#F6F8FB] select-none min-h-screen overflow-x-hidden">
            {/* Top Blue Header */}
            <header className="h-[60px] bg-[#2F80ED] text-white flex items-center justify-between px-5 shrink-0 shadow-sm relative z-20">
                <div className="flex items-center gap-4">
                    <div className="bg-white/15 px-2.5 py-1 rounded text-xs font-bold tracking-widest border border-white/20 select-none">
                        LB
                    </div>
                    <span className="font-semibold text-lg tracking-wide">
                        Factory Management & Accounting System
                    </span>
                </div>
                <div className="flex items-center gap-5">
                    <div className="flex items-center gap-4 text-white/80 border-r border-white/20 pr-4">
                        <button className="hover:text-white p-1 rounded transition-colors cursor-pointer focus:outline-none" title="Network Connection">
                            <Wifi className="w-[18px] h-[18px]" />
                        </button>
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
                            onClick={handleLogout}
                            className="hover:bg-white/10 p-1.5 rounded transition-colors cursor-pointer focus:outline-none flex items-center justify-center text-white/90 hover:text-white"
                            title="Logout"
                        >
                            <LogOut className="w-[18px] h-[18px]" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Breadcrumbs & Page Titles */}
            <div className="bg-white border-b border-[#E5E7EB] py-5 px-8 flex flex-col justify-center relative z-10">
                <div className="max-w-[1400px] w-full mx-auto flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#6B7280] tracking-wide uppercase">
                        <button
                            type="button"
                            onClick={() => navigate('/settings')}
                            className="hover:text-[#2F80ED] transition-colors cursor-pointer focus:outline-none"
                        >
                            Settings
                        </button>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span className="text-[#1F2937]">Linked Accounts</span>
                    </div>

                    <h2 className="text-xl font-bold text-[#1F2937] mt-1">
                        Linked Accounts
                    </h2>
                    <p className="text-xs text-[#6B7280] font-semibold tracking-wide uppercase">
                        Configure default accounting accounts for system transactions.
                    </p>
                </div>
            </div>

            {/* Main Content Form */}
            <main className="flex-grow p-8 overflow-y-auto">
                <div className="max-w-[1400px] w-full mx-auto space-y-6">

                    {successMessage && (
                        <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm font-semibold rounded-[8px] flex items-center gap-2 select-none">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            {successMessage}
                        </div>
                    )}

                    <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] p-8">

                        <div className="space-y-10">

                            {/* Section: Sales */}
                            <div>
                                <h3 className="text-sm font-bold text-[#1F2937] border-b border-[#E5E7EB] pb-2 mb-5 uppercase tracking-wide">
                                    Sales
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <SearchableSelect label="Sales Income Account" value={config.salesIncome} onChange={(v) => handleUpdate('salesIncome', v)} options={chartOfAccounts} error={errors.salesIncome} />
                                    <SearchableSelect label="Sales Return Account" value={config.salesReturn} onChange={(v) => handleUpdate('salesReturn', v)} options={chartOfAccounts} error={errors.salesReturn} />
                                    <SearchableSelect label="Sales Discount Account" value={config.salesDiscount} onChange={(v) => handleUpdate('salesDiscount', v)} options={chartOfAccounts} error={errors.salesDiscount} />
                                    <SearchableSelect label="Customer Receivable Account" value={config.customerReceivable} onChange={(v) => handleUpdate('customerReceivable', v)} options={chartOfAccounts} error={errors.customerReceivable} />
                                </div>
                            </div>

                            {/* Section: Purchases */}
                            <div>
                                <h3 className="text-sm font-bold text-[#1F2937] border-b border-[#E5E7EB] pb-2 mb-5 uppercase tracking-wide">
                                    Purchases
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <SearchableSelect label="Purchase Account" value={config.purchase} onChange={(v) => handleUpdate('purchase', v)} options={chartOfAccounts} error={errors.purchase} />
                                    <SearchableSelect label="Purchase Return Account" value={config.purchaseReturn} onChange={(v) => handleUpdate('purchaseReturn', v)} options={chartOfAccounts} error={errors.purchaseReturn} />
                                    <SearchableSelect label="Supplier Payable Account" value={config.supplierPayable} onChange={(v) => handleUpdate('supplierPayable', v)} options={chartOfAccounts} error={errors.supplierPayable} />
                                    <SearchableSelect label="Purchase Discount Account" value={config.purchaseDiscount} onChange={(v) => handleUpdate('purchaseDiscount', v)} options={chartOfAccounts} error={errors.purchaseDiscount} />
                                </div>
                            </div>

                            {/* Section: Cash */}
                            <div>
                                <h3 className="text-sm font-bold text-[#1F2937] border-b border-[#E5E7EB] pb-2 mb-5 uppercase tracking-wide">
                                    Cash
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <SearchableSelect label="Cash In Account" value={config.cashIn} onChange={(v) => handleUpdate('cashIn', v)} options={chartOfAccounts} error={errors.cashIn} />
                                    <SearchableSelect label="Cash Out Account" value={config.cashOut} onChange={(v) => handleUpdate('cashOut', v)} options={chartOfAccounts} error={errors.cashOut} />
                                    <SearchableSelect label="Petty Cash Account" value={config.pettyCash} onChange={(v) => handleUpdate('pettyCash', v)} options={chartOfAccounts} error={errors.pettyCash} />
                                </div>
                            </div>

                            {/* Section: Bank & Expenses */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <div>
                                    <h3 className="text-sm font-bold text-[#1F2937] border-b border-[#E5E7EB] pb-2 mb-5 uppercase tracking-wide">
                                        Bank
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <SearchableSelect label="Default Bank Account" value={config.defaultBank} onChange={(v) => handleUpdate('defaultBank', v)} options={chartOfAccounts} error={errors.defaultBank} />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-[#1F2937] border-b border-[#E5E7EB] pb-2 mb-5 uppercase tracking-wide">
                                        Expenses
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <SearchableSelect label="Default Expense Account" value={config.defaultExpense} onChange={(v) => handleUpdate('defaultExpense', v)} options={chartOfAccounts} error={errors.defaultExpense} />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Inventory & General */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <div>
                                    <h3 className="text-sm font-bold text-[#1F2937] border-b border-[#E5E7EB] pb-2 mb-5 uppercase tracking-wide">
                                        Inventory
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <SearchableSelect label="Inventory Asset Account" value={config.inventoryAsset} onChange={(v) => handleUpdate('inventoryAsset', v)} options={chartOfAccounts} error={errors.inventoryAsset} />
                                        <SearchableSelect label="Cost of Goods Sold Account" value={config.cogs} onChange={(v) => handleUpdate('cogs', v)} options={chartOfAccounts} error={errors.cogs} />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-[#1F2937] border-b border-[#E5E7EB] pb-2 mb-5 uppercase tracking-wide">
                                        General
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <SearchableSelect label="Owner Capital Account" value={config.ownerCapital} onChange={(v) => handleUpdate('ownerCapital', v)} options={chartOfAccounts} error={errors.ownerCapital} />
                                        <SearchableSelect label="Retained Earnings Account" value={config.retainedEarnings} onChange={(v) => handleUpdate('retainedEarnings', v)} options={chartOfAccounts} error={errors.retainedEarnings} />
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Actions Bar */}
                        <div className="mt-12 pt-6 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleReset}
                                className="px-5 py-2 bg-white border border-[#E5E7EB] hover:bg-[#F6F8FB] text-sm font-semibold text-[#1F2937] rounded-[6px] transition-colors cursor-pointer focus:outline-none"
                            >
                                Reset
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                className="px-5 py-2 bg-[#2F80ED] hover:bg-[#1B6FD1] text-sm font-semibold text-white rounded-[6px] transition-colors cursor-pointer shadow-sm focus:outline-none"
                            >
                                Save Configuration
                            </button>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}