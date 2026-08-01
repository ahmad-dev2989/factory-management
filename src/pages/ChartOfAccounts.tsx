import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wifi, Bell, Mail, LogOut, ChevronRight, Search, Plus, Edit, Trash2, X, AlertTriangle, ChevronDown, ArrowLeft } from 'lucide-react';
import { SidebarToggle } from '../components/Sidebar';

interface AccountItem {
    id: number;
    code: string;
    name: string;
    parentId: number | null;
    type: string;
    description: string;
    status: string;
    isRoot: boolean;
    isDefault: boolean;
}

interface RenderNode extends AccountItem {
    level: number;
    hasChildren: boolean;
    isExpanded: boolean;
    parentName: string;
}

export default function ChartOfAccounts() {
    const navigate = useNavigate();

    const handleLogout = () => {
        navigate('/login');
    };

    const [accounts, setAccounts] = useState<AccountItem[]>([]);

    const fetchAccounts = async () => {
        try {
            const raw = await (window as any).electron.invoke('db-query', 'SELECT * FROM chart_of_accounts');
            if (raw && !raw.error) {
                const mapped = raw.map((a: any) => ({
                    id: a.id,
                    code: a.code,
                    name: a.name,
                    parentId: a.parent_id === null ? null : Number(a.parent_id),
                    type: a.type,
                    description: a.description || '',
                    status: a.status,
                    isRoot: Boolean(a.is_root),
                    isDefault: Boolean(a.is_default)
                }));
                setAccounts(mapped);
            }
        } catch (err) {
            console.error('[ChartOfAccounts] Failed to fetch accounts:', err);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const [searchQuery, setSearchQuery] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    // By default expand root accounts
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set([1, 2, 3, 4, 5, 6, 7]));

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<AccountItem | null>(null);

    // Form Fields State
    const [name, setName] = useState('');
    const [parentId, setParentId] = useState<number | ''>('');
    const [type, setType] = useState('Asset');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('Active');
    const [modalErrors, setModalErrors] = useState<Record<string, string>>({});

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<AccountItem | null>(null);
    const [deleteError, setDeleteError] = useState('');

    const generateAccountCode = () => {
        const nextId = Math.max(...accounts.map(a => a.id), 0) + 1;
        return `ACC-${nextId.toString().padStart(4, '0')}`;
    };

    const toggleExpand = (id: number) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const resetModalFields = () => {
        setName('');
        setParentId('');
        setType('Asset');
        setDescription('');
        setStatus('Active');
        setModalErrors({});
    };

    const handleAddClick = () => {
        setEditingAccount(null);
        resetModalFields();
        setIsModalOpen(true);
    };

    const handleEditClick = (acc: AccountItem) => {
        if (acc.isRoot) return; // Guard
        setEditingAccount(acc);
        setName(acc.name);
        setParentId(acc.parentId || '');
        setType(acc.type);
        setDescription(acc.description);
        setStatus(acc.status);
        setModalErrors({});
        setIsModalOpen(true);
    };

    const handleSaveAccount = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};

        if (!name.trim()) {
            newErrors.name = 'Account Name is required';
        } else {
            // Unique under same parent
            const parentVal = parentId === '' ? null : Number(parentId);
            const isDuplicate = accounts.some(
                a => a.name.toLowerCase() === name.trim().toLowerCase() &&
                    a.parentId === parentVal &&
                    (!editingAccount || a.id !== editingAccount.id)
            );
            if (isDuplicate) {
                newErrors.name = 'Account name must be unique under the selected parent';
            }
        }

        if (parentId === '') {
            newErrors.parentId = 'Parent Account is required';
        }

        if (Object.keys(newErrors).length > 0) {
            setModalErrors(newErrors);
            return;
        }

        if (editingAccount) {
            const saveAccount = async () => {
                try {
                    await (window as any).electron.invoke(
                        'db-query',
                        'UPDATE chart_of_accounts SET name = ?, parent_id = ?, type = ?, description = ?, status = ? WHERE id = ?',
                        [name.trim(), Number(parentId), type, description.trim(), status, editingAccount.id]
                    );
                    setSuccessMessage('Account updated successfully.');
                    await fetchAccounts();
                    setIsModalOpen(false);
                    resetModalFields();
                    setTimeout(() => setSuccessMessage(''), 4000);
                } catch (err) {
                    console.error('[ChartOfAccounts] Error saving account:', err);
                }
            };
            saveAccount();
        } else {
            const code = generateAccountCode();
            const createAccount = async () => {
                try {
                    await (window as any).electron.invoke(
                        'db-query',
                        'INSERT INTO chart_of_accounts (code, name, parent_id, type, description, status, is_root, is_default) VALUES (?, ?, ?, ?, ?, ?, 0, 0)',
                        [code, name.trim(), Number(parentId), type, description.trim(), status]
                    );
                    setSuccessMessage('Account created successfully.');
                    if (parentId) {
                        setExpandedIds(prev => new Set(prev).add(Number(parentId)));
                    }
                    await fetchAccounts();
                    setIsModalOpen(false);
                    resetModalFields();
                    setTimeout(() => setSuccessMessage(''), 4000);
                } catch (err) {
                    console.error('[ChartOfAccounts] Error creating account:', err);
                }
            };
            createAccount();
        }
    };

    const handleDeleteClick = (acc: AccountItem) => {
        setDeleteTarget(acc);
        setIsDeleteModalOpen(true);
        if (acc.isDefault || acc.isRoot) {
            setDeleteError('Default accounts cannot be deleted.');
        } else {
            setDeleteError('');
        }
    };

    const handleConfirmDelete = () => {
        if (!deleteTarget) return;

        if (deleteTarget.isDefault || deleteTarget.isRoot) {
            setDeleteError('Default accounts cannot be deleted.');
            return;
        }

        const hasChildren = accounts.some(a => a.parentId === deleteTarget.id);
        if (hasChildren) {
            setDeleteError('Cannot delete an account that has child accounts.');
            return;
        }

        const deleteAccount = async () => {
            try {
                await (window as any).electron.invoke('db-query', 'DELETE FROM chart_of_accounts WHERE id = ?', [deleteTarget.id]);
                setSuccessMessage('Account deleted successfully.');
                await fetchAccounts();
                setIsDeleteModalOpen(false);
                setDeleteTarget(null);
                setTimeout(() => setSuccessMessage(''), 4000);
            } catch (err) {
                console.error('[ChartOfAccounts] Error deleting account:', err);
            }
        };
        deleteAccount();
    };

    // Tree Building Logic
    const visibleAccounts = useMemo(() => {
        let matchedIds = new Set<number>();

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            accounts.forEach(a => {
                const parentName = a.parentId ? accounts.find(p => p.id === a.parentId)?.name || '' : '';
                if (a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q) || parentName.toLowerCase().includes(q)) {
                    matchedIds.add(a.id);
                    // Add all ancestors to ensure path is visible
                    let curr = a;
                    while (curr.parentId) {
                        matchedIds.add(curr.parentId);
                        const parent = accounts.find(p => p.id === curr.parentId);
                        if (parent) curr = parent;
                        else break;
                    }
                }
            });
        }

        const buildTree = (parentId: number | null, level: number): RenderNode[] => {
            const children = accounts.filter(a => a.parentId === parentId);
            let result: RenderNode[] = [];

            children.forEach(child => {
                const childMatches = searchQuery ? matchedIds.has(child.id) : true;

                if (childMatches) {
                    const grandChildren = accounts.filter(a => a.parentId === child.id);
                    const hasChildren = grandChildren.length > 0;
                    const isExpanded = searchQuery ? true : expandedIds.has(child.id);
                    const parentName = parentId ? accounts.find(p => p.id === parentId)?.name || '' : '';

                    result.push({
                        ...child,
                        level,
                        hasChildren,
                        isExpanded,
                        parentName
                    });

                    if (isExpanded && hasChildren) {
                        result = result.concat(buildTree(child.id, level + 1));
                    }
                }
            });
            return result;
        };

        return buildTree(null, 0);
    }, [accounts, searchQuery, expandedIds]);

    // Handle Parent auto-type selection in Modal
    const handleParentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        const pid = val === '' ? '' : Number(val);
        setParentId(pid);

        if (pid !== '') {
            const parentAcc = accounts.find(a => a.id === pid);
            if (parentAcc) {
                setType(parentAcc.type);
            }
        }
    };

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
                        <span className="text-[#1F2937]">Chart of Accounts</span>
                    </div>
                    <h2 className="text-xl font-bold text-[#1F2937] mt-1">
                        Chart of Accounts
                    </h2>
                    <p className="text-xs text-[#6B7280] font-semibold tracking-wide uppercase">
                        Manage the accounting structure of your business.
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
                                    placeholder="Search accounts..."
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

                        {/* Tree Table */}
                        <div className="overflow-x-auto border border-[#E5E7EB] rounded-[8px]">
                            {visibleAccounts.length > 0 ? (
                                <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-sm whitespace-nowrap">
                                    <thead className="bg-[#F6F8FB] text-[#6B7280] font-semibold text-xs uppercase tracking-wider select-none">
                                        <tr>
                                            <th className="px-4 py-3.5 w-2/5">Account Name</th>
                                            <th className="px-4 py-3.5">Account Code</th>
                                            <th className="px-4 py-3.5">Parent Account</th>
                                            <th className="px-4 py-3.5">Account Type</th>
                                            <th className="px-4 py-3.5 text-center">Status</th>
                                            <th className="px-4 py-3.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E5E7EB] text-[#1F2937] font-medium bg-white">
                                        {visibleAccounts.map((acc) => (
                                            <tr key={acc.id} className="hover:bg-[#F6F8FB]/50 transition-colors">
                                                <td className="px-4 py-3 flex items-center gap-1.5" style={{ paddingLeft: `${acc.level * 1.5 + 1}rem` }}>
                                                    {acc.hasChildren ? (
                                                        <button
                                                            onClick={() => toggleExpand(acc.id)}
                                                            className="text-[#6B7280] hover:text-[#1F2937] transition-colors focus:outline-none cursor-pointer"
                                                        >
                                                            {acc.isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                        </button>
                                                    ) : (
                                                        <div className="w-4 h-4"></div>
                                                    )}
                                                    <span className={`${acc.isRoot ? 'font-bold text-[#1F2937]' : 'text-[#2F80ED] font-semibold'}`}>
                                                        {acc.name}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-[#6B7280]">{acc.code}</td>
                                                <td className="px-4 py-3 text-[#6B7280]">{acc.parentName || '-'}</td>
                                                <td className="px-4 py-3">{acc.type}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-full ${acc.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {acc.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEditClick(acc)}
                                                            disabled={acc.isRoot}
                                                            className={`p-1 rounded transition-colors ${acc.isRoot ? 'text-[#6B7280]/30 cursor-not-allowed' : 'text-[#2F80ED] hover:text-[#1B6FD1] hover:bg-[#EEF5FF] cursor-pointer'}`}
                                                            title={acc.isRoot ? "Root accounts cannot be edited" : "Edit Account"}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteClick(acc)}
                                                            disabled={acc.isRoot || acc.isDefault}
                                                            className={`p-1 rounded transition-colors ${acc.isRoot || acc.isDefault ? 'text-[#6B7280]/30 cursor-not-allowed' : 'text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer'}`}
                                                            title={acc.isRoot || acc.isDefault ? "Default accounts cannot be deleted" : "Delete Account"}
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
                            <div className="flex items-center gap-3">
                                <h3 className="text-base font-bold text-[#1F2937]">
                                    {editingAccount ? 'Edit Account' : 'Add Account'}
                                </h3>
                                <span className="bg-[#EEF5FF] text-[#2F80ED] border border-[#2F80ED]/20 px-2 py-0.5 rounded text-xs font-bold">
                                    {editingAccount ? editingAccount.code : generateAccountCode()}
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

                        <form onSubmit={handleSaveAccount} className="flex flex-col flex-grow overflow-hidden mt-4">
                            <div className="flex-grow overflow-y-auto pr-2 pb-4 space-y-6">

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                            Account Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g. Petty Cash"
                                            className={`w-full px-3 py-2 bg-white border ${modalErrors.name ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'} text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1`}
                                        />
                                        {modalErrors.name && <p className="text-red-500 text-xs mt-1 font-semibold">{modalErrors.name}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                            Parent Account *
                                        </label>
                                        <select
                                            value={parentId}
                                            onChange={handleParentChange}
                                            className={`w-full px-3 py-2 bg-white border ${modalErrors.parentId ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'} text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1 cursor-pointer`}
                                        >
                                            <option value="" disabled>Select Parent Account</option>
                                            {accounts.map(acc => (
                                                <option key={acc.id} value={acc.id} disabled={editingAccount?.id === acc.id}>
                                                    {acc.code} - {acc.name}
                                                </option>
                                            ))}
                                        </select>
                                        {modalErrors.parentId && <p className="text-red-500 text-xs mt-1 font-semibold">{modalErrors.parentId}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                            Account Type
                                        </label>
                                        <select
                                            value={type}
                                            onChange={(e) => setType(e.target.value)}
                                            className="w-full px-3 py-2 bg-[#F6F8FB] border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none cursor-not-allowed opacity-80"
                                            disabled
                                            title="Type is inherited from Parent Account"
                                        >
                                            <option value="Asset">Asset</option>
                                            <option value="Liability">Liability</option>
                                            <option value="Equity">Equity</option>
                                            <option value="Income">Income</option>
                                            <option value="Cost of Goods Sold">Cost of Goods Sold</option>
                                            <option value="Expense">Expense</option>
                                        </select>
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

                                <div>
                                    <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                        Description
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Brief description of this account's purpose..."
                                        className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 resize-none"
                                    />
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