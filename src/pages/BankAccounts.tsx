import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wifi, Bell, Mail, LogOut, ChevronRight, Search, Plus, Edit, Trash2, X, AlertTriangle } from 'lucide-react';

interface AccountItem {
    id: number;
    name: string;
    type: string;
    currency: string;
    bankName: string;
    accountNumber: string;
    branchName: string;
    iban: string;
    openingBalance: number;
    currentBalance: number;
    status: string;
    notes: string;
    isDefault: boolean;
}

export default function BankAccounts() {
    const navigate = useNavigate();

    const handleLogout = () => {
        navigate('/login');
    };

    // Initial Data State
    const [accounts, setAccounts] = useState<AccountItem[]>([
        {
            id: 1,
            name: 'Cash in Hand',
            type: 'Cash',
            currency: 'PKR',
            bankName: '',
            accountNumber: '',
            branchName: '',
            iban: '',
            openingBalance: 0,
            currentBalance: 0,
            status: 'Active',
            notes: 'Main cash register',
            isDefault: true
        },
        {
            id: 2,
            name: 'Meezan Bank',
            type: 'Bank Account',
            currency: 'PKR',
            bankName: 'Meezan Bank',
            accountNumber: '010123456789',
            branchName: 'Main Branch',
            iban: 'PK00MEZN0000000123456789',
            openingBalance: 150000,
            currentBalance: 150000,
            status: 'Active',
            notes: 'Primary business account',
            isDefault: true
        },
        {
            id: 3,
            name: 'EasyPaisa',
            type: 'Mobile Wallet',
            currency: 'PKR',
            bankName: 'Telenor Bank',
            accountNumber: '03001234567',
            branchName: '',
            iban: '',
            openingBalance: 5000,
            currentBalance: 5000,
            status: 'Active',
            notes: 'Quick transfers',
            isDefault: true
        }
    ]);

    const [searchQuery, setSearchQuery] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<AccountItem | null>(null);

    // Form Fields State
    const [name, setName] = useState('');
    const [type, setType] = useState('Bank Account');
    const [currency, setCurrency] = useState('PKR');
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [branchName, setBranchName] = useState('');
    const [iban, setIban] = useState('');
    const [openingBalance, setOpeningBalance] = useState<string>('');
    const [status, setStatus] = useState('Active');
    const [notes, setNotes] = useState('');

    const [modalErrors, setModalErrors] = useState<Record<string, string>>({});

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<AccountItem | null>(null);
    const [deleteError, setDeleteError] = useState('');

    const formatBalance = (currency: string, amount: number) => {
        return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const resetModalFields = () => {
        setName('');
        setType('Bank Account');
        setCurrency('PKR');
        setBankName('');
        setAccountNumber('');
        setBranchName('');
        setIban('');
        setOpeningBalance('');
        setStatus('Active');
        setNotes('');
        setModalErrors({});
    };

    const handleAddClick = () => {
        setEditingAccount(null);
        resetModalFields();
        setIsModalOpen(true);
    };

    const handleEditClick = (account: AccountItem) => {
        setEditingAccount(account);
        setName(account.name);
        setType(account.type);
        setCurrency(account.currency);
        setBankName(account.bankName);
        setAccountNumber(account.accountNumber);
        setBranchName(account.branchName);
        setIban(account.iban);
        setOpeningBalance(account.openingBalance.toString());
        setStatus(account.status);
        setNotes(account.notes);
        setModalErrors({});
        setIsModalOpen(true);
    };

    const handleSaveAccount = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};

        if (!name.trim()) {
            newErrors.name = 'Account Name is required';
        } else {
            const nameExists = accounts.some(
                (a) =>
                    a.name.toLowerCase() === name.trim().toLowerCase() &&
                    (!editingAccount || a.id !== editingAccount.id)
            );
            if (nameExists) {
                newErrors.name = 'Account Name must be unique';
            }
        }

        if (openingBalance !== '' && isNaN(Number(openingBalance))) {
            newErrors.openingBalance = 'Must be a valid number';
        }

        if (Object.keys(newErrors).length > 0) {
            setModalErrors(newErrors);
            return;
        }

        const numericOpeningBalance = Number(openingBalance) || 0;

        if (editingAccount) {
            // Current Balance calculation (in a real app this accounts for transactions, but we adjust it by the delta of opening balance change here)
            const balanceDifference = numericOpeningBalance - editingAccount.openingBalance;
            const newCurrentBalance = editingAccount.currentBalance + balanceDifference;

            setAccounts(
                accounts.map((a) => {
                    if (a.id === editingAccount.id) {
                        return {
                            ...a,
                            name: name.trim(),
                            type,
                            currency,
                            bankName: bankName.trim(),
                            accountNumber: accountNumber.trim(),
                            branchName: branchName.trim(),
                            iban: iban.trim(),
                            openingBalance: numericOpeningBalance,
                            currentBalance: newCurrentBalance,
                            status,
                            notes: notes.trim(),
                        };
                    }
                    return a;
                })
            );
            setSuccessMessage('Account updated successfully.');
        } else {
            const newId = Math.max(...accounts.map((a) => a.id), 0) + 1;
            setAccounts([
                ...accounts,
                {
                    id: newId,
                    name: name.trim(),
                    type,
                    currency,
                    bankName: bankName.trim(),
                    accountNumber: accountNumber.trim(),
                    branchName: branchName.trim(),
                    iban: iban.trim(),
                    openingBalance: numericOpeningBalance,
                    currentBalance: numericOpeningBalance,
                    status,
                    notes: notes.trim(),
                    isDefault: false
                }
            ]);
            setSuccessMessage('Account created successfully.');
        }

        setIsModalOpen(false);
        resetModalFields();
        setTimeout(() => setSuccessMessage(''), 4000);
    };

    const handleDeleteClick = (account: AccountItem) => {
        setDeleteTarget(account);
        setIsDeleteModalOpen(true);
        if (account.isDefault) {
            setDeleteError('Default accounts cannot be deleted.');
        } else {
            setDeleteError('');
        }
    };

    const handleConfirmDelete = () => {
        if (!deleteTarget) return;

        if (deleteTarget.isDefault) {
            setDeleteError('Default accounts cannot be deleted.');
            return;
        }

        setAccounts(accounts.filter((a) => a.id !== deleteTarget.id));
        setIsDeleteModalOpen(false);
        setDeleteTarget(null);
        setSuccessMessage('Account deleted successfully.');
        setTimeout(() => setSuccessMessage(''), 4000);
    };

    const filteredAccounts = accounts.filter((a) => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        return (
            a.name.toLowerCase().includes(q) ||
            a.type.toLowerCase().includes(q)
        );
    });

    return (
        <div className="flex-1 flex flex-col bg-[#F6F8FB] select-none min-h-screen">
            {/* Header */}
            <header className="h-[60px] bg-[#2F80ED] text-white flex items-center justify-between px-5 shrink-0 shadow-sm">
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

            {/* Breadcrumbs */}
            <div className="bg-white border-b border-[#E5E7EB] py-5 px-8 flex flex-col justify-center">
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
                        <span className="text-[#1F2937]">Financial Accounts</span>
                    </div>
                    <h2 className="text-xl font-bold text-[#1F2937] mt-1">
                        Bank & Cash Accounts
                    </h2>
                    <p className="text-xs text-[#6B7280] font-semibold tracking-wide uppercase">
                        Manage your financial instruments and balances
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-grow p-8 overflow-y-auto">
                <div className="max-w-[1400px] w-full mx-auto space-y-4">

                    {successMessage && (
                        <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm font-semibold rounded-[8px] flex items-center gap-2 select-none">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            {successMessage}
                        </div>
                    )}

                    <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] p-6 space-y-6">

                        <div className="flex items-center justify-between gap-4">
                            <div className="relative max-w-sm w-full">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#6B7280]">
                                    <Search className="w-4 h-4" />
                                </span>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by account name or type..."
                                    className="w-full pl-9 pr-4 py-2 bg-[#F6F8FB] border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:bg-white focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-all"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleAddClick}
                                className="px-4 py-2 bg-[#2F80ED] hover:bg-[#1B6FD1] text-white text-sm font-semibold rounded-[6px] flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
                            >
                                <Plus className="w-4 h-4" /> Add Account
                            </button>
                        </div>

                        <div className="overflow-x-auto border border-[#E5E7EB] rounded-[8px]">
                            {filteredAccounts.length > 0 ? (
                                <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-sm">
                                    <thead className="bg-[#F6F8FB] text-[#6B7280] font-semibold text-xs uppercase tracking-wider select-none">
                                        <tr>
                                            <th className="px-6 py-3.5">Account ID</th>
                                            <th className="px-6 py-3.5">Account Name</th>
                                            <th className="px-6 py-3.5">Type</th>
                                            <th className="px-6 py-3.5">Account Number</th>
                                            <th className="px-6 py-3.5 text-right">Opening Balance</th>
                                            <th className="px-6 py-3.5 text-right">Current Balance</th>
                                            <th className="px-6 py-3.5">Status</th>
                                            <th className="px-6 py-3.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E5E7EB] text-[#1F2937] font-medium bg-white">
                                        {filteredAccounts.map((account) => (
                                            <tr key={account.id} className="hover:bg-[#F6F8FB]/50 transition-colors">
                                                <td className="px-6 py-4">ACC-{account.id.toString().padStart(4, '0')}</td>
                                                <td className="px-6 py-4 font-semibold text-[#2F80ED]">{account.name}</td>
                                                <td className="px-6 py-4 text-[#6B7280]">{account.type}</td>
                                                <td className="px-6 py-4 text-[#6B7280]">{account.accountNumber || '-'}</td>
                                                <td className="px-6 py-4 text-right">{formatBalance(account.currency, account.openingBalance)}</td>
                                                <td className="px-6 py-4 text-right font-bold">{formatBalance(account.currency, account.currentBalance)}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-full ${account.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {account.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEditClick(account)}
                                                            className="text-[#2F80ED] hover:text-[#1B6FD1] p-1 rounded hover:bg-[#EEF5FF] transition-colors cursor-pointer"
                                                            title="Edit Account"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteClick(account)}
                                                            className={`p-1 rounded transition-colors cursor-pointer ${account.isDefault ? 'text-[#6B7280]/40 cursor-not-allowed' : 'text-red-500 hover:text-red-700 hover:bg-red-50'}`}
                                                            title={account.isDefault ? "Default accounts cannot be deleted" : "Delete Account"}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-8 text-center text-[#6B7280] text-sm font-semibold select-none bg-white">
                                    No accounts found.
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </main>

            {/* Add / Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-lg max-w-2xl w-full p-6 flex flex-col max-h-[90vh]">

                        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3 shrink-0">
                            <h3 className="text-base font-bold text-[#1F2937]">
                                {editingAccount ? 'Edit Financial Account' : 'Create New Account'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="text-[#6B7280] hover:text-[#1F2937] p-1 rounded hover:bg-[#F6F8FB] cursor-pointer focus:outline-none"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveAccount} className="flex flex-col flex-grow overflow-hidden mt-4">
                            <div className="flex-grow overflow-y-auto pr-2 pb-4 space-y-6">

                                {/* Basic Info Row */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                            Account Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g. UBL Main Branch"
                                            className={`w-full px-3 py-2 bg-white border ${modalErrors.name ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'} text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1 transition-colors`}
                                        />
                                        {modalErrors.name && (
                                            <p className="text-red-500 text-xs mt-1 font-semibold">{modalErrors.name}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                            Account Type *
                                        </label>
                                        <select
                                            value={type}
                                            onChange={(e) => setType(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] cursor-pointer"
                                        >
                                            <option value="Cash">Cash</option>
                                            <option value="Bank Account">Bank Account</option>
                                            <option value="Mobile Wallet">Mobile Wallet</option>
                                            <option value="Credit Card">Credit Card</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Bank Details Row */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                            Bank Name
                                        </label>
                                        <input
                                            type="text"
                                            value={bankName}
                                            onChange={(e) => setBankName(e.target.value)}
                                            placeholder="e.g. United Bank Limited"
                                            className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                            Account Number
                                        </label>
                                        <input
                                            type="text"
                                            value={accountNumber}
                                            onChange={(e) => setAccountNumber(e.target.value)}
                                            placeholder="e.g. 0101234567"
                                            className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-colors"
                                        />
                                    </div>
                                </div>

                                {/* Branch & IBAN Row */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                            Branch Name
                                        </label>
                                        <input
                                            type="text"
                                            value={branchName}
                                            onChange={(e) => setBranchName(e.target.value)}
                                            placeholder="e.g. Gulberg Branch"
                                            className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                            IBAN
                                        </label>
                                        <input
                                            type="text"
                                            value={iban}
                                            onChange={(e) => setIban(e.target.value)}
                                            placeholder="e.g. PK00UNIL00000001234567"
                                            className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-colors"
                                        />
                                    </div>
                                </div>

                                {/* Financials Row */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                            Currency
                                        </label>
                                        <select
                                            value={currency}
                                            onChange={(e) => setCurrency(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] cursor-pointer"
                                        >
                                            <option value="PKR">PKR</option>
                                            <option value="USD">USD</option>
                                            <option value="EUR">EUR</option>
                                            <option value="GBP">GBP</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                            Opening Balance
                                        </label>
                                        <input
                                            type="text"
                                            value={openingBalance}
                                            onChange={(e) => setOpeningBalance(e.target.value)}
                                            placeholder="0.00"
                                            className={`w-full px-3 py-2 bg-white border ${modalErrors.openingBalance ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'} text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1 transition-colors`}
                                        />
                                        {modalErrors.openingBalance && (
                                            <p className="text-red-500 text-xs mt-1 font-semibold">{modalErrors.openingBalance}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                            Status
                                        </label>
                                        <select
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] cursor-pointer"
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                        Notes
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Any additional details..."
                                        className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-colors resize-none"
                                    />
                                </div>

                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB] shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 bg-white border border-[#E5E7EB] hover:bg-[#F6F8FB] text-sm font-semibold text-[#1F2937] rounded-[6px] transition-colors cursor-pointer focus:outline-none"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-[#2F80ED] hover:bg-[#1B6FD1] text-sm font-semibold text-white rounded-[6px] transition-colors cursor-pointer shadow-sm focus:outline-none"
                                >
                                    Save Account
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && deleteTarget && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-lg max-w-sm w-full p-6 space-y-5">
                        <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full ${deleteError ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div className="space-y-1.5">
                                <h3 className="text-base font-bold text-[#1F2937]">
                                    {deleteError ? 'Action Blocked' : 'Delete Account'}
                                </h3>
                                <p className="text-sm text-[#6B7280]">
                                    {deleteError ? (
                                        <span className="text-red-600 font-semibold">{deleteError}</span>
                                    ) : (
                                        <span>Are you sure you want to delete <strong className="text-[#1F2937]">{deleteTarget.name}</strong>? This action cannot be undone.</span>
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E7EB]">
                            <button
                                type="button"
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="px-4 py-2 bg-white border border-[#E5E7EB] hover:bg-[#F6F8FB] text-sm font-semibold text-[#1F2937] rounded-[6px] transition-colors cursor-pointer focus:outline-none"
                            >
                                Cancel
                            </button>

                            {!deleteError && (
                                <button
                                    type="button"
                                    onClick={handleConfirmDelete}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-[6px] transition-colors cursor-pointer shadow-sm focus:outline-none"
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}