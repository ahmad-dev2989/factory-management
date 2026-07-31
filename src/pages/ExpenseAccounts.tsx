import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wifi, Bell, Mail, LogOut, ChevronRight, Search, Plus, Edit, Trash2, X, AlertTriangle, ArrowLeft } from 'lucide-react';

interface ExpenseItem {
    id: number;
    code: string;
    name: string;
    linkedAccount: string;
    description: string;
    status: string;
    isDefault: boolean;
}

export default function ExpenseAccounts() {
    const navigate = useNavigate();

    const handleLogout = () => {
        navigate('/login');
    };

    // Simulated linked Chart of Accounts (filtered for Expenses)
    const expenseChartAccounts = [
        'Electricity', 'Internet', 'Fuel', 'Office Rent', 'Salary',
        'Marketing', 'Office Supplies', 'Repair & Maintenance', 'Transport', 'Miscellaneous'
    ];

    // Initial Data State
    const [expenses, setExpenses] = useState<ExpenseItem[]>([]);

    const fetchExpenses = async () => {
        try {
            const raw = await (window as any).electron.invoke('db-query', 'SELECT * FROM expense_accounts');
            if (raw && !raw.error) {
                const mapped = raw.map((ex: any) => ({
                    id: ex.id,
                    code: ex.code,
                    name: ex.name,
                    linkedAccount: ex.linked_account || '',
                    description: ex.description || '',
                    status: ex.status,
                    isDefault: Boolean(ex.is_default)
                }));
                setExpenses(mapped);
            }
        } catch (err) {
            console.error('[ExpenseAccounts] Failed to fetch expenses:', err);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    const [searchQuery, setSearchQuery] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);

    // Form Fields State
    const [name, setName] = useState('');
    const [linkedAccount, setLinkedAccount] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('Active');

    const [modalErrors, setModalErrors] = useState<Record<string, string>>({});

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<ExpenseItem | null>(null);
    const [deleteError, setDeleteError] = useState('');

    const generateExpenseCode = (nextId: number) => {
        return `EXP-${nextId.toString().padStart(4, '0')}`;
    };

    const resetModalFields = () => {
        setName('');
        setLinkedAccount('');
        setDescription('');
        setStatus('Active');
        setModalErrors({});
    };

    const handleAddClick = () => {
        setEditingExpense(null);
        resetModalFields();
        setIsModalOpen(true);
    };

    const handleEditClick = (expense: ExpenseItem) => {
        setEditingExpense(expense);
        setName(expense.name);
        setLinkedAccount(expense.linkedAccount);
        setDescription(expense.description);
        setStatus(expense.status);
        setModalErrors({});
        setIsModalOpen(true);
    };

    const handleSaveExpense = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};

        if (!name.trim()) {
            newErrors.name = 'Expense Name is required';
        } else {
            const nameExists = expenses.some(
                (ex) => ex.name.toLowerCase() === name.trim().toLowerCase() &&
                    (!editingExpense || ex.id !== editingExpense.id)
            );
            if (nameExists) {
                newErrors.name = 'Expense Name must be unique';
            }
        }

        if (!linkedAccount) {
            newErrors.linkedAccount = 'Linked Chart Account is required';
        }

        if (Object.keys(newErrors).length > 0) {
            setModalErrors(newErrors);
            return;
        }

        if (editingExpense) {
            const saveExpense = async () => {
                try {
                    await (window as any).electron.invoke(
                        'db-query',
                        'UPDATE expense_accounts SET name = ?, linked_account = ?, description = ?, status = ? WHERE id = ?',
                        [name.trim(), linkedAccount, description.trim(), status, editingExpense.id]
                    );
                    setSuccessMessage('Expense account updated successfully.');
                    await fetchExpenses();
                    setIsModalOpen(false);
                    resetModalFields();
                    setTimeout(() => setSuccessMessage(''), 4000);
                } catch (err) {
                    console.error('[ExpenseAccounts] Error saving expense account:', err);
                }
            };
            saveExpense();
        } else {
            const createExpense = async () => {
                try {
                    const res = await (window as any).electron.invoke('db-query', 'SELECT MAX(id) as maxId FROM expense_accounts');
                    const nextId = (res && res[0] && res[0].maxId ? res[0].maxId : 0) + 1;
                    const code = 'EXP-' + String(nextId).padStart(4, '0');

                    await (window as any).electron.invoke(
                        'db-query',
                        'INSERT INTO expense_accounts (code, name, linked_account, description, status, is_default) VALUES (?, ?, ?, ?, ?, 0)',
                        [code, name.trim(), linkedAccount, description.trim(), status]
                    );
                    setSuccessMessage('Expense account created successfully.');
                    await fetchExpenses();
                    setIsModalOpen(false);
                    resetModalFields();
                    setTimeout(() => setSuccessMessage(''), 4000);
                } catch (err) {
                    console.error('[ExpenseAccounts] Error creating expense account:', err);
                }
            };
            createExpense();
        }
    };

    const handleDeleteClick = (expense: ExpenseItem) => {
        setDeleteTarget(expense);
        setIsDeleteModalOpen(true);
        if (expense.isDefault) {
            setDeleteError('Default expense accounts cannot be deleted.');
        } else {
            setDeleteError('');
        }
    };

    const handleConfirmDelete = () => {
        if (!deleteTarget) return;

        if (deleteTarget.isDefault) {
            setDeleteError('Default expense accounts cannot be deleted.');
            return;
        }

        const deleteExpense = async () => {
            try {
                await (window as any).electron.invoke('db-query', 'DELETE FROM expense_accounts WHERE id = ?', [deleteTarget.id]);
                setSuccessMessage('Expense account deleted successfully.');
                await fetchExpenses();
                setIsDeleteModalOpen(false);
                setDeleteTarget(null);
                setTimeout(() => setSuccessMessage(''), 4000);
            } catch (err) {
                console.error('[ExpenseAccounts] Error deleting expense account:', err);
            }
        };
        deleteExpense();
    };

    const filteredExpenses = expenses.filter((ex) => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        return (
            ex.name.toLowerCase().includes(q) ||
            ex.code.toLowerCase().includes(q) ||
            ex.linkedAccount.toLowerCase().includes(q)
        );
    });

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
                    <div className="bg-white/15 px-2.5 py-1 rounded text-xs font-bold tracking-widest border border-white/20 select-none">
                        LB
                    </div>
                    <span className="font-semibold text-lg tracking-wide">
                        Factory App
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
                        <span className="text-[#1F2937]">Expense Accounts</span>
                    </div>

                    <h2 className="text-xl font-bold text-[#1F2937] mt-1">
                        Expense Accounts
                    </h2>
                    <p className="text-xs text-[#6B7280] font-semibold tracking-wide uppercase">
                        Manage expense categories used in business transactions.
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

                        {/* Toolbar */}
                        <div className="flex items-center justify-between gap-4">
                            <div className="relative max-w-sm w-full">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#6B7280]">
                                    <Search className="w-4 h-4" />
                                </span>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search Expense Accounts..."
                                    className="w-full pl-9 pr-4 py-2 bg-[#F6F8FB] border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:bg-white focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-all"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleAddClick}
                                className="px-4 py-2 bg-[#2F80ED] hover:bg-[#1B6FD1] text-white text-sm font-semibold rounded-[6px] flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
                            >
                                <Plus className="w-4 h-4" /> Add Expense Account
                            </button>
                        </div>

                        {/* Desktop Table View */}
                        <div className="overflow-x-auto border border-[#E5E7EB] rounded-[8px]">
                            {filteredExpenses.length > 0 ? (
                                <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-sm whitespace-nowrap">
                                    <thead className="bg-[#F6F8FB] text-[#6B7280] font-semibold text-xs uppercase tracking-wider select-none">
                                        <tr>
                                            <th className="px-6 py-3.5">Expense ID</th>
                                            <th className="px-6 py-3.5">Expense Code</th>
                                            <th className="px-6 py-3.5">Expense Name</th>
                                            <th className="px-6 py-3.5">Linked Chart Account</th>
                                            <th className="px-6 py-3.5">Description</th>
                                            <th className="px-6 py-3.5 text-center">Status</th>
                                            <th className="px-6 py-3.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E5E7EB] text-[#1F2937] font-medium bg-white">
                                        {filteredExpenses.map((expense) => (
                                            <tr key={expense.id} className="hover:bg-[#F6F8FB]/50 transition-colors">
                                                <td className="px-6 py-4 text-[#6B7280]">{expense.id}</td>
                                                <td className="px-6 py-4 font-semibold text-[#2F80ED]">{expense.code}</td>
                                                <td className="px-6 py-4 font-semibold">{expense.name}</td>
                                                <td className="px-6 py-4 text-[#6B7280]">{expense.linkedAccount}</td>
                                                <td className="px-6 py-4 text-[#6B7280] truncate max-w-[200px]">{expense.description || '-'}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-full ${expense.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {expense.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEditClick(expense)}
                                                            className="text-[#2F80ED] hover:text-[#1B6FD1] p-1 rounded hover:bg-[#EEF5FF] transition-colors cursor-pointer"
                                                            title="Edit Expense Account"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteClick(expense)}
                                                            disabled={expense.isDefault}
                                                            className={`p-1 rounded transition-colors cursor-pointer ${expense.isDefault ? 'text-[#6B7280]/40 cursor-not-allowed' : 'text-red-500 hover:text-red-700 hover:bg-red-50'}`}
                                                            title={expense.isDefault ? "Default expense accounts cannot be deleted." : "Delete Expense Account"}
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
                                    No expense accounts found.
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </main>

            {/* Add / Edit Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-lg max-w-2xl w-full p-6 flex flex-col max-h-[90vh]">

                        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3 shrink-0">
                            <div className="flex items-center gap-3">
                                <h3 className="text-base font-bold text-[#1F2937]">
                                    {editingExpense ? 'Edit Expense Account' : 'Add Expense Account'}
                                </h3>
                                <span className="bg-[#EEF5FF] text-[#2F80ED] border border-[#2F80ED]/20 px-2 py-0.5 rounded text-xs font-bold">
                                    {editingExpense ? editingExpense.code : generateExpenseCode(Math.max(...expenses.map((e) => e.id), 0) + 1)}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="text-[#6B7280] hover:text-[#1F2937] p-1 rounded hover:bg-[#F6F8FB] cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveExpense} className="flex flex-col flex-grow overflow-hidden mt-4">
                            <div className="flex-grow overflow-y-auto pr-2 pb-4 space-y-5">

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                            Expense Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g. Travel Expenses"
                                            className={`w-full px-3 py-2 bg-white border ${modalErrors.name ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'} text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1`}
                                        />
                                        {modalErrors.name && <p className="text-red-500 text-xs mt-1 font-semibold">{modalErrors.name}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                            Linked Chart Account *
                                        </label>
                                        <select
                                            value={linkedAccount}
                                            onChange={(e) => setLinkedAccount(e.target.value)}
                                            className={`w-full px-3 py-2 bg-white border ${modalErrors.linkedAccount ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'} text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1 cursor-pointer`}
                                        >
                                            <option value="" disabled>Select Chart Account</option>
                                            {expenseChartAccounts.map((acc) => (
                                                <option key={acc} value={acc}>{acc}</option>
                                            ))}
                                        </select>
                                        {modalErrors.linkedAccount && <p className="text-red-500 text-xs mt-1 font-semibold">{modalErrors.linkedAccount}</p>}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                        Description
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Brief description of this expense..."
                                        className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                        Status
                                    </label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 cursor-pointer"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>

                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB] shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 bg-white border border-[#E5E7EB] hover:bg-[#F6F8FB] text-sm font-semibold text-[#1F2937] rounded-[6px] transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-[#2F80ED] hover:bg-[#1B6FD1] text-sm font-semibold text-white rounded-[6px] transition-colors cursor-pointer shadow-sm"
                                >
                                    Save Expense
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
                                    {deleteError ? 'Action Blocked' : 'Delete Expense Account'}
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
                                className="px-4 py-2 bg-white border border-[#E5E7EB] hover:bg-[#F6F8FB] text-sm font-semibold text-[#1F2937] rounded-[6px] transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>

                            {!deleteError && (
                                <button
                                    type="button"
                                    onClick={handleConfirmDelete}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-[6px] transition-colors cursor-pointer shadow-sm"
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