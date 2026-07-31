import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wifi, Bell, Mail, LogOut, ChevronRight, Search, Plus, Edit, Trash2, X, AlertTriangle, ArrowLeft } from 'lucide-react';

interface CustomerItem {
    id: number;
    companyName: string;
    contactPerson: string;
    phone: string;
    whatsapp: string;
    email: string;
    address1: string;
    address2: string;
    city: string;
    province: string;
    country: string;
    postalCode: string;
    ntn: string;
    businessType: string;
    creditLimit: number;
    openingBalance: number;
    currentBalance: number;
    status: string;
    notes: string;
}

export default function Customers() {
    const navigate = useNavigate();

    const handleLogout = () => {
        navigate('/login');
    };

    // Initial Data State
    const [customers, setCustomers] = useState<CustomerItem[]>([]);

    const fetchCustomers = async () => {
        try {
            const raw = await (window as any).electron.invoke('db-query', 'SELECT * FROM customers');
            if (raw && !raw.error) {
                const mapped = raw.map((c: any) => ({
                    id: c.id,
                    companyName: c.company_name,
                    contactPerson: c.contact_person || '',
                    phone: c.phone || '',
                    whatsapp: c.whatsapp || '',
                    email: c.email || '',
                    address1: c.address1 || '',
                    address2: c.address2 || '',
                    city: c.city || '',
                    province: c.province || '',
                    country: c.country || '',
                    postalCode: c.postal_code || '',
                    ntn: c.ntn || '',
                    businessType: c.business_type || '',
                    creditLimit: Number(c.credit_limit),
                    openingBalance: Number(c.opening_balance),
                    currentBalance: Number(c.current_balance),
                    status: c.status,
                    notes: c.notes || ''
                }));
                setCustomers(mapped);
            }
        } catch (err) {
            console.error('[Customers] Failed to fetch customers:', err);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);


    const [searchQuery, setSearchQuery] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);

    // Form Fields State
    const [companyName, setCompanyName] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [phone, setPhone] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [email, setEmail] = useState('');
    const [address1, setAddress1] = useState('');
    const [address2, setAddress2] = useState('');
    const [city, setCity] = useState('');
    const [province, setProvince] = useState('');
    const [country, setCountry] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [ntn, setNtn] = useState('');
    const [businessType, setBusinessType] = useState('Retailer');
    const [creditLimit, setCreditLimit] = useState<string>('');
    const [openingBalance, setOpeningBalance] = useState<string>('');
    const [status, setStatus] = useState('Active');
    const [notes, setNotes] = useState('');

    const [modalErrors, setModalErrors] = useState<Record<string, string>>({});

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<CustomerItem | null>(null);

    const formatCurrency = (amount: number) => {
        return `PKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const validateEmail = (emailStr: string) => {
        if (!emailStr) return true;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(emailStr);
    };

    const resetModalFields = () => {
        setCompanyName('');
        setContactPerson('');
        setPhone('');
        setWhatsapp('');
        setEmail('');
        setAddress1('');
        setAddress2('');
        setCity('');
        setProvince('');
        setCountry('');
        setPostalCode('');
        setNtn('');
        setBusinessType('Retailer');
        setCreditLimit('');
        setOpeningBalance('');
        setStatus('Active');
        setNotes('');
        setModalErrors({});
    };

    const handleAddClick = () => {
        setEditingCustomer(null);
        resetModalFields();
        setIsModalOpen(true);
    };

    const handleEditClick = (customer: CustomerItem) => {
        setEditingCustomer(customer);
        setCompanyName(customer.companyName);
        setContactPerson(customer.contactPerson);
        setPhone(customer.phone);
        setWhatsapp(customer.whatsapp);
        setEmail(customer.email);
        setAddress1(customer.address1);
        setAddress2(customer.address2);
        setCity(customer.city);
        setProvince(customer.province);
        setCountry(customer.country);
        setPostalCode(customer.postalCode);
        setNtn(customer.ntn);
        setBusinessType(customer.businessType);
        setCreditLimit(customer.creditLimit ? customer.creditLimit.toString() : '');
        setOpeningBalance(customer.openingBalance.toString());
        setStatus(customer.status);
        setNotes(customer.notes);
        setModalErrors({});
        setIsModalOpen(true);
    };

    const handleSaveCustomer = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};

        // Validations
        if (!companyName.trim()) {
            newErrors.companyName = 'Company Name is required';
        } else {
            const nameExists = customers.some(
                (c) =>
                    c.companyName.toLowerCase() === companyName.trim().toLowerCase() &&
                    (!editingCustomer || c.id !== editingCustomer.id)
            );
            if (nameExists) {
                newErrors.companyName = 'Company Name must be unique';
            }
        }

        if (!contactPerson.trim()) newErrors.contactPerson = 'Contact Person is required';
        if (!phone.trim()) newErrors.phone = 'Phone number is required';
        if (email && !validateEmail(email)) newErrors.email = 'Invalid email format';

        if (creditLimit !== '' && isNaN(Number(creditLimit))) {
            newErrors.creditLimit = 'Must be a valid number';
        }

        if (openingBalance !== '' && isNaN(Number(openingBalance))) {
            newErrors.openingBalance = 'Must be a valid number';
        }

        if (Object.keys(newErrors).length > 0) {
            setModalErrors(newErrors);
            return;
        }

        const numericCreditLimit = creditLimit ? Number(creditLimit) : 0;
        const numericOpeningBalance = Number(openingBalance) || 0;

        if (editingCustomer) {
            const balanceDifference = numericOpeningBalance - editingCustomer.openingBalance;
            const newCurrentBalance = editingCustomer.currentBalance + balanceDifference;

            const saveCustomer = async () => {
                try {
                    await (window as any).electron.invoke(
                        'db-query',
                        'UPDATE customers SET company_name = ?, contact_person = ?, phone = ?, whatsapp = ?, email = ?, address1 = ?, address2 = ?, city = ?, province = ?, country = ?, postal_code = ?, ntn = ?, business_type = ?, credit_limit = ?, opening_balance = ?, current_balance = ?, status = ?, notes = ? WHERE id = ?',
                        [companyName.trim(), contactPerson.trim(), phone.trim(), whatsapp.trim(), email.trim(), address1.trim(), address2.trim(), city.trim(), province.trim(), country.trim(), postalCode.trim(), ntn.trim(), businessType, numericCreditLimit, numericOpeningBalance, newCurrentBalance, status, notes.trim(), editingCustomer.id]
                    );
                    setSuccessMessage('Customer updated successfully.');
                    await fetchCustomers();
                    setIsModalOpen(false);
                    resetModalFields();
                    setTimeout(() => setSuccessMessage(''), 4000);
                } catch (err) {
                    console.error('[Customers] Error saving customer:', err);
                }
            };
            saveCustomer();
        } else {
            const createCustomer = async () => {
                try {
                    await (window as any).electron.invoke(
                        'db-query',
                        'INSERT INTO customers (company_name, contact_person, phone, whatsapp, email, address1, address2, city, province, country, postal_code, ntn, business_type, credit_limit, opening_balance, current_balance, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [companyName.trim(), contactPerson.trim(), phone.trim(), whatsapp.trim(), email.trim(), address1.trim(), address2.trim(), city.trim(), province.trim(), country.trim(), postalCode.trim(), ntn.trim(), businessType, numericCreditLimit, numericOpeningBalance, numericOpeningBalance, status, notes.trim()]
                    );
                    setSuccessMessage('Customer created successfully.');
                    await fetchCustomers();
                    setIsModalOpen(false);
                    resetModalFields();
                    setTimeout(() => setSuccessMessage(''), 4000);
                } catch (err) {
                    console.error('[Customers] Error creating customer:', err);
                }
            };
            createCustomer();
        }
    };

    const handleDeleteClick = (customer: CustomerItem) => {
        setDeleteTarget(customer);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!deleteTarget) return;

        const deleteCustomer = async () => {
            try {
                await (window as any).electron.invoke('db-query', 'DELETE FROM customers WHERE id = ?', [deleteTarget.id]);
                setSuccessMessage('Customer deleted successfully.');
                await fetchCustomers();
                setIsDeleteModalOpen(false);
                setDeleteTarget(null);
                setTimeout(() => setSuccessMessage(''), 4000);
            } catch (err) {
                console.error('[Customers] Error deleting customer:', err);
            }
        };
        deleteCustomer();
    };

    const filteredCustomers = customers.filter((c) => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        return (
            c.companyName.toLowerCase().includes(q) ||
            c.contactPerson.toLowerCase().includes(q) ||
            c.phone.toLowerCase().includes(q) ||
            c.city.toLowerCase().includes(q)
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
                        <span className="text-[#1F2937]">Customer Management</span>
                    </div>

                    <h2 className="text-xl font-bold text-[#1F2937] mt-1">
                        Customer Management
                    </h2>
                    <p className="text-xs text-[#6B7280] font-semibold tracking-wide uppercase">
                        Manage all business customers.
                    </p>
                </div>
            </div>

            {/* Main Table Content */}
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
                                    placeholder="Search Customers..."
                                    className="w-full pl-9 pr-4 py-2 bg-[#F6F8FB] border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:bg-white focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-all"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleAddClick}
                                className="px-4 py-2 bg-[#2F80ED] hover:bg-[#1B6FD1] text-white text-sm font-semibold rounded-[6px] flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
                            >
                                <Plus className="w-4 h-4" /> Add Customer
                            </button>
                        </div>

                        {/* Desktop Table View */}
                        <div className="overflow-x-auto border border-[#E5E7EB] rounded-[8px]">
                            {filteredCustomers.length > 0 ? (
                                <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-sm whitespace-nowrap">
                                    <thead className="bg-[#F6F8FB] text-[#6B7280] font-semibold text-xs uppercase tracking-wider select-none">
                                        <tr>
                                            <th className="px-4 py-3.5">Customer ID</th>
                                            <th className="px-4 py-3.5">Company Name</th>
                                            <th className="px-4 py-3.5">Contact Person</th>
                                            <th className="px-4 py-3.5">Phone</th>
                                            <th className="px-4 py-3.5">City</th>
                                            <th className="px-4 py-3.5 text-right">Credit Limit</th>
                                            <th className="px-4 py-3.5 text-right">Opening Balance</th>
                                            <th className="px-4 py-3.5 text-right">Current Balance</th>
                                            <th className="px-4 py-3.5 text-center">Status</th>
                                            <th className="px-4 py-3.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E5E7EB] text-[#1F2937] font-medium bg-white">
                                        {filteredCustomers.map((customer) => (
                                            <tr key={customer.id} className="hover:bg-[#F6F8FB]/50 transition-colors">
                                                <td className="px-4 py-4 text-[#6B7280]">CUST-{customer.id.toString().padStart(4, '0')}</td>
                                                <td className="px-4 py-4 font-semibold text-[#2F80ED]">{customer.companyName}</td>
                                                <td className="px-4 py-4">{customer.contactPerson}</td>
                                                <td className="px-4 py-4">{customer.phone}</td>
                                                <td className="px-4 py-4">{customer.city || '-'}</td>
                                                <td className="px-4 py-4 text-right">{customer.creditLimit > 0 ? formatCurrency(customer.creditLimit) : '-'}</td>
                                                <td className="px-4 py-4 text-right">{formatCurrency(customer.openingBalance)}</td>
                                                <td className="px-4 py-4 text-right font-bold">{formatCurrency(customer.currentBalance)}</td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-full ${customer.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {customer.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEditClick(customer)}
                                                            className="text-[#2F80ED] hover:text-[#1B6FD1] p-1 rounded hover:bg-[#EEF5FF] transition-colors cursor-pointer"
                                                            title="Edit Customer"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteClick(customer)}
                                                            className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                                                            title="Delete Customer"
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
                                    No customers found.
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </main>

            {/* Add / Edit Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-lg max-w-4xl w-full p-6 flex flex-col max-h-[90vh]">

                        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3 shrink-0">
                            <h3 className="text-base font-bold text-[#1F2937]">
                                {editingCustomer ? 'Edit Customer' : 'Add Customer'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="text-[#6B7280] hover:text-[#1F2937] p-1 rounded hover:bg-[#F6F8FB] cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveCustomer} className="flex flex-col flex-grow overflow-hidden mt-4">
                            <div className="flex-grow overflow-y-auto pr-2 pb-4 space-y-6">

                                {/* Section: Basic Information */}
                                <div>
                                    <h4 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-4 border-b border-[#E5E7EB] pb-2">
                                        Basic Information
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                                Company Name *
                                            </label>
                                            <input
                                                type="text"
                                                value={companyName}
                                                onChange={(e) => setCompanyName(e.target.value)}
                                                placeholder="e.g. Acme Corp"
                                                className={`w-full px-3 py-2 bg-white border ${modalErrors.companyName ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'} text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1`}
                                            />
                                            {modalErrors.companyName && <p className="text-red-500 text-xs mt-1 font-semibold">{modalErrors.companyName}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                                Contact Person *
                                            </label>
                                            <input
                                                type="text"
                                                value={contactPerson}
                                                onChange={(e) => setContactPerson(e.target.value)}
                                                placeholder="e.g. John Doe"
                                                className={`w-full px-3 py-2 bg-white border ${modalErrors.contactPerson ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'} text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1`}
                                            />
                                            {modalErrors.contactPerson && <p className="text-red-500 text-xs mt-1 font-semibold">{modalErrors.contactPerson}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Section: Contact Details */}
                                <div>
                                    <h4 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-4 border-b border-[#E5E7EB] pb-2">
                                        Contact Details
                                    </h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                                Phone *
                                            </label>
                                            <input
                                                type="text"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="e.g. 0300-1234567"
                                                className={`w-full px-3 py-2 bg-white border ${modalErrors.phone ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'} text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1`}
                                            />
                                            {modalErrors.phone && <p className="text-red-500 text-xs mt-1 font-semibold">{modalErrors.phone}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                                WhatsApp
                                            </label>
                                            <input
                                                type="text"
                                                value={whatsapp}
                                                onChange={(e) => setWhatsapp(e.target.value)}
                                                placeholder="e.g. 0300-1234567"
                                                className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="e.g. contact@acme.com"
                                                className={`w-full px-3 py-2 bg-white border ${modalErrors.email ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'} text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1`}
                                            />
                                            {modalErrors.email && <p className="text-red-500 text-xs mt-1 font-semibold">{modalErrors.email}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Section: Address */}
                                <div>
                                    <h4 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-4 border-b border-[#E5E7EB] pb-2">
                                        Address Information
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                                Address Line 1
                                            </label>
                                            <input
                                                type="text"
                                                value={address1}
                                                onChange={(e) => setAddress1(e.target.value)}
                                                placeholder="Street or Building"
                                                className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                                Address Line 2
                                            </label>
                                            <input
                                                type="text"
                                                value={address2}
                                                onChange={(e) => setAddress2(e.target.value)}
                                                placeholder="Sector or Area"
                                                className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                                City
                                            </label>
                                            <input
                                                type="text"
                                                value={city}
                                                onChange={(e) => setCity(e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                                Province
                                            </label>
                                            <input
                                                type="text"
                                                value={province}
                                                onChange={(e) => setProvince(e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                                Country
                                            </label>
                                            <input
                                                type="text"
                                                value={country}
                                                onChange={(e) => setCountry(e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                                Postal Code
                                            </label>
                                            <input
                                                type="text"
                                                value={postalCode}
                                                onChange={(e) => setPostalCode(e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Section: Business & Financials */}
                                <div>
                                    <h4 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-4 border-b border-[#E5E7EB] pb-2">
                                        Business & Financials
                                    </h4>
                                    <div className="grid grid-cols-5 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                                NTN
                                            </label>
                                            <input
                                                type="text"
                                                value={ntn}
                                                onChange={(e) => setNtn(e.target.value)}
                                                placeholder="National Tax No."
                                                className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                                Business Type
                                            </label>
                                            <select
                                                value={businessType}
                                                onChange={(e) => setBusinessType(e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 cursor-pointer"
                                            >
                                                <option value="Retailer">Retailer</option>
                                                <option value="Wholesaler">Wholesaler</option>
                                                <option value="Distributor">Distributor</option>
                                                <option value="Corporate">Corporate</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                                Credit Limit
                                            </label>
                                            <input
                                                type="text"
                                                value={creditLimit}
                                                onChange={(e) => setCreditLimit(e.target.value)}
                                                placeholder="0.00"
                                                className={`w-full px-3 py-2 bg-white border ${modalErrors.creditLimit ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'} text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1`}
                                            />
                                            {modalErrors.creditLimit && <p className="text-red-500 text-xs mt-1 font-semibold">{modalErrors.creditLimit}</p>}
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
                                                className={`w-full px-3 py-2 bg-white border ${modalErrors.openingBalance ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'} text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1`}
                                            />
                                            {modalErrors.openingBalance && <p className="text-red-500 text-xs mt-1 font-semibold">{modalErrors.openingBalance}</p>}
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
                                        placeholder="Internal notes about the customer..."
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
                                    Save Customer
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
                            <div className="p-2 rounded-full bg-red-50 text-red-600">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div className="space-y-1.5">
                                <h3 className="text-base font-bold text-[#1F2937]">Delete Customer</h3>
                                <p className="text-sm text-[#6B7280]">
                                    Are you sure you want to delete <strong className="text-[#1F2937]">{deleteTarget.companyName}</strong>? This action cannot be undone.
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
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-[6px] transition-colors cursor-pointer shadow-sm"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}