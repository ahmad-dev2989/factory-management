import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wifi, Bell, Mail, LogOut, ChevronRight, Search, Plus, Edit, Trash2, X, AlertTriangle } from 'lucide-react';

interface EmployeeItem {
    id: number;
    empCode: string;
    fullName: string;
    fatherName: string;
    cnic: string;
    phone: string;
    altPhone: string;
    email: string;
    address: string;
    city: string;
    designation: string;
    department: string;
    joiningDate: string;
    salary: number;
    emergencyContactName: string;
    emergencyContactNumber: string;
    status: string;
    notes: string;
}

export default function Employees() {
    const navigate = useNavigate();

    const handleLogout = () => {
        navigate('/login');
    };

    // Initial Data State
    const [employees, setEmployees] = useState<EmployeeItem[]>([
        {
            id: 1,
            empCode: 'EMP-0001',
            fullName: 'Ahmad Farooq',
            fatherName: 'Farooq',
            cnic: '33100-1234567-1',
            phone: '0313-0685030',
            altPhone: '',
            email: 'ahmadfarooq.dev2989@gmail.com',
            address: 'Faisalabad, Pakistan',
            city: 'Faisalabad',
            designation: 'Software Developer',
            department: 'Management',
            joiningDate: '2025-01-01',
            salary: 150000,
            emergencyContactName: '',
            emergencyContactNumber: '',
            status: 'Active',
            notes: 'Key Developer'
        }
    ]);

    const [searchQuery, setSearchQuery] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<EmployeeItem | null>(null);

    // Form Fields State
    const [fullName, setFullName] = useState('');
    const [fatherName, setFatherName] = useState('');
    const [cnic, setCnic] = useState('');
    const [phone, setPhone] = useState('');
    const [altPhone, setAltPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [designation, setDesignation] = useState('');
    const [department, setDepartment] = useState('Administration');
    const [joiningDate, setJoiningDate] = useState('');
    const [salary, setSalary] = useState<string>('');
    const [emergencyContactName, setEmergencyContactName] = useState('');
    const [emergencyContactNumber, setEmergencyContactNumber] = useState('');
    const [status, setStatus] = useState('Active');
    const [notes, setNotes] = useState('');

    const [modalErrors, setModalErrors] = useState<Record<string, string>>({});

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<EmployeeItem | null>(null);

    const validateEmail = (emailStr: string) => {
        if (!emailStr) return true;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(emailStr);
    };

    const generateEmpCode = (nextId: number) => {
        return `EMP-${nextId.toString().padStart(4, '0')}`;
    };

    const resetModalFields = () => {
        setFullName('');
        setFatherName('');
        setCnic('');
        setPhone('');
        setAltPhone('');
        setEmail('');
        setAddress('');
        setCity('');
        setDesignation('');
        setDepartment('Administration');
        setJoiningDate('');
        setSalary('');
        setEmergencyContactName('');
        setEmergencyContactNumber('');
        setStatus('Active');
        setNotes('');
        setModalErrors({});
    };

    const handleAddClick = () => {
        setEditingEmployee(null);
        resetModalFields();
        setIsModalOpen(true);
    };

    const handleEditClick = (emp: EmployeeItem) => {
        setEditingEmployee(emp);
        setFullName(emp.fullName);
        setFatherName(emp.fatherName);
        setCnic(emp.cnic);
        setPhone(emp.phone);
        setAltPhone(emp.altPhone);
        setEmail(emp.email);
        setAddress(emp.address);
        setCity(emp.city);
        setDesignation(emp.designation);
        setDepartment(emp.department);
        setJoiningDate(emp.joiningDate);
        setSalary(emp.salary ? emp.salary.toString() : '');
        setEmergencyContactName(emp.emergencyContactName);
        setEmergencyContactNumber(emp.emergencyContactNumber);
        setStatus(emp.status);
        setNotes(emp.notes);
        setModalErrors({});
        setIsModalOpen(true);
    };

    const handleSaveEmployee = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};

        // Validations
        if (!fullName.trim()) newErrors.fullName = 'Full Name is required';
        if (!phone.trim()) newErrors.phone = 'Phone number is required';
        if (!designation.trim()) newErrors.designation = 'Designation is required';
        if (!department.trim()) newErrors.department = 'Department is required';
        if (!joiningDate.trim()) newErrors.joiningDate = 'Joining Date is required';

        if (email && !validateEmail(email)) newErrors.email = 'Invalid email format';

        if (salary !== '' && isNaN(Number(salary))) {
            newErrors.salary = 'Must be a valid number';
        }

        if (Object.keys(newErrors).length > 0) {
            setModalErrors(newErrors);
            return;
        }

        const numericSalary = salary ? Number(salary) : 0;

        if (editingEmployee) {
            setEmployees(
                employees.map((emp) => {
                    if (emp.id === editingEmployee.id) {
                        return {
                            ...emp,
                            fullName: fullName.trim(),
                            fatherName: fatherName.trim(),
                            cnic: cnic.trim(),
                            phone: phone.trim(),
                            altPhone: altPhone.trim(),
                            email: email.trim(),
                            address: address.trim(),
                            city: city.trim(),
                            designation: designation.trim(),
                            department: department.trim(),
                            joiningDate,
                            salary: numericSalary,
                            emergencyContactName: emergencyContactName.trim(),
                            emergencyContactNumber: emergencyContactNumber.trim(),
                            status,
                            notes: notes.trim(),
                        };
                    }
                    return emp;
                })
            );
            setSuccessMessage('Employee updated successfully.');
        } else {
            const newId = Math.max(...employees.map((e) => e.id), 0) + 1;
            setEmployees([
                ...employees,
                {
                    id: newId,
                    empCode: generateEmpCode(newId),
                    fullName: fullName.trim(),
                    fatherName: fatherName.trim(),
                    cnic: cnic.trim(),
                    phone: phone.trim(),
                    altPhone: altPhone.trim(),
                    email: email.trim(),
                    address: address.trim(),
                    city: city.trim(),
                    designation: designation.trim(),
                    department: department.trim(),
                    joiningDate,
                    salary: numericSalary,
                    emergencyContactName: emergencyContactName.trim(),
                    emergencyContactNumber: emergencyContactNumber.trim(),
                    status,
                    notes: notes.trim(),
                }
            ]);
            setSuccessMessage('Employee created successfully.');
        }

        setIsModalOpen(false);
        resetModalFields();
        setTimeout(() => setSuccessMessage(''), 4000);
    };

    const handleDeleteClick = (emp: EmployeeItem) => {
        setDeleteTarget(emp);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!deleteTarget) return;
        setEmployees(employees.filter((e) => e.id !== deleteTarget.id));
        setIsDeleteModalOpen(false);
        setDeleteTarget(null);
        setSuccessMessage('Employee deleted successfully.');
        setTimeout(() => setSuccessMessage(''), 4000);
    };

    const filteredEmployees = employees.filter((e) => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        return (
            e.empCode.toLowerCase().includes(q) ||
            e.fullName.toLowerCase().includes(q) ||
            e.phone.toLowerCase().includes(q) ||
            e.designation.toLowerCase().includes(q) ||
            e.department.toLowerCase().includes(q)
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
                        <span className="text-[#1F2937]">Employee Management</span>
                    </div>
                    <h2 className="text-xl font-bold text-[#1F2937] mt-1">
                        Employee Management
                    </h2>
                    <p className="text-xs text-[#6B7280] font-semibold tracking-wide uppercase">
                        Manage company employees.
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
                                    placeholder="Search by code, name, phone, dept..."
                                    className="w-full pl-9 pr-4 py-2 bg-[#F6F8FB] border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:bg-white focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-all"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleAddClick}
                                className="px-4 py-2 bg-[#2F80ED] hover:bg-[#1B6FD1] text-white text-sm font-semibold rounded-[6px] flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
                            >
                                <Plus className="w-4 h-4" /> Add Employee
                            </button>
                        </div>

                        {/* Desktop Table */}
                        <div className="overflow-x-auto border border-[#E5E7EB] rounded-[8px]">
                            {filteredEmployees.length > 0 ? (
                                <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-sm whitespace-nowrap">
                                    <thead className="bg-[#F6F8FB] text-[#6B7280] font-semibold text-xs uppercase tracking-wider select-none">
                                        <tr>
                                            <th className="px-4 py-3.5">Employee ID</th>
                                            <th className="px-4 py-3.5">Employee Code</th>
                                            <th className="px-4 py-3.5">Full Name</th>
                                            <th className="px-4 py-3.5">Designation</th>
                                            <th className="px-4 py-3.5">Phone</th>
                                            <th className="px-4 py-3.5">Department</th>
                                            <th className="px-4 py-3.5">Joining Date</th>
                                            <th className="px-4 py-3.5 text-center">Status</th>
                                            <th className="px-4 py-3.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E5E7EB] text-[#1F2937] font-medium bg-white">
                                        {filteredEmployees.map((emp) => (
                                            <tr key={emp.id} className="hover:bg-[#F6F8FB]/50 transition-colors">
                                                <td className="px-4 py-4 text-[#6B7280]">{emp.id}</td>
                                                <td className="px-4 py-4 font-semibold text-[#2F80ED]">{emp.empCode}</td>
                                                <td className="px-4 py-4">{emp.fullName}</td>
                                                <td className="px-4 py-4">{emp.designation}</td>
                                                <td className="px-4 py-4">{emp.phone}</td>
                                                <td className="px-4 py-4">{emp.department}</td>
                                                <td className="px-4 py-4">{emp.joiningDate}</td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-full ${emp.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {emp.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEditClick(emp)}
                                                            className="text-[#2F80ED] hover:text-[#1B6FD1] p-1 rounded hover:bg-[#EEF5FF] transition-colors cursor-pointer"
                                                            title="Edit Employee"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteClick(emp)}
                                                            className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                                                            title="Delete Employee"
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
                                    No employees found.
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </main>

            {/* Add / Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-lg max-w-4xl w-full p-6 flex flex-col max-h-[90vh]">

                        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3 shrink-0">
                            <div className="flex items-center gap-3">
                                <h3 className="text-base font-bold text-[#1F2937]">
                                    {editingEmployee ? 'Edit Employee' : 'Add Employee'}
                                </h3>
                                <span className="bg-[#EEF5FF] text-[#2F80ED] border border-[#2F80ED]/20 px-2 py-0.5 rounded text-xs font-bold">
                                    {editingEmployee ? editingEmployee.empCode : generateEmpCode(Math.max(...employees.map((e) => e.id), 0) + 1)}
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

                        <form onSubmit={handleSaveEmployee} className="flex flex-col flex-grow overflow-hidden mt-4">
                            <div className="flex-grow overflow-y-auto pr-2 pb-4 space-y-6">

                                {/* Personal Information */}
                                <div>
                                    <h4 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-4 border-b border-[#E5E7EB] pb-2">
                                        Personal Information
                                    </h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                                Full Name *
                                            </label>
                                            <input
                                                type="text"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                placeholder="e.g. John Doe"
                                                className={`w-full px-3 py-2 bg-white border ${modalErrors.fullName ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'} text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1`}
                                            />
                                            {modalErrors.fullName && <p className="text-red-500 text-xs mt-1 font-semibold">{modalErrors.fullName}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                                Father Name
                                            </label>
                                            <input
                                                type="text"
                                                value={fatherName}
                                                onChange={(e) => setFatherName(e.target.value)}
                                                placeholder="e.g. Richard Doe"
                                                className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                                CNIC
                                            </label>
                                            <input
                                                type="text"
                                                value={cnic}
                                                onChange={(e) => setCnic(e.target.value)}
                                                placeholder="e.g. 33100-1234567-1"
                                                className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Contact & Address */}
                                <div>
                                    <h4 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-4 border-b border-[#E5E7EB] pb-2">
                                        Contact & Address
                                    </h4>
                                    <div className="grid grid-cols-3 gap-4 mb-4">
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
                                                Alternate Phone
                                            </label>
                                            <input
                                                type="text"
                                                value={altPhone}
                                                onChange={(e) => setAltPhone(e.target.value)}
                                                placeholder="e.g. 0321-1234567"
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
                                                placeholder="e.g. john@company.com"
                                                className={`w-full px-3 py-2 bg-white border ${modalErrors.email ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'} text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1`}
                                            />
                                            {modalErrors.email && <p className="text-red-500 text-xs mt-1 font-semibold">{modalErrors.email}</p>}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                                Address
                                            </label>
                                            <input
                                                type="text"
                                                value={address}
                                                onChange={(e) => setAddress(e.target.value)}
                                                placeholder="Full street address"
                                                className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                                City
                                            </label>
                                            <input
                                                type="text"
                                                value={city}
                                                onChange={(e) => setCity(e.target.value)}
                                                placeholder="e.g. Lahore"
                                                className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Job Details */}
                                <div>
                                    <h4 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-4 border-b border-[#E5E7EB] pb-2">
                                        Job Details
                                    </h4>
                                    <div className="grid grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                                Designation *
                                            </label>
                                            <input
                                                type="text"
                                                value={designation}
                                                onChange={(e) => setDesignation(e.target.value)}
                                                placeholder="e.g. Manager"
                                                className={`w-full px-3 py-2 bg-white border ${modalErrors.designation ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'} text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1`}
                                            />
                                            {modalErrors.designation && <p className="text-red-500 text-xs mt-1 font-semibold">{modalErrors.designation}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                                Department *
                                            </label>
                                            <select
                                                value={department}
                                                onChange={(e) => setDepartment(e.target.value)}
                                                className={`w-full px-3 py-2 bg-white border ${modalErrors.department ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'} text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1 cursor-pointer`}
                                            >
                                                <option value="Administration">Administration</option>
                                                <option value="Accounts">Accounts</option>
                                                <option value="Sales">Sales</option>
                                                <option value="Warehouse">Warehouse</option>
                                                <option value="Production">Production</option>
                                                <option value="Management">Management</option>
                                                <option value="Other">Other</option>
                                            </select>
                                            {modalErrors.department && <p className="text-red-500 text-xs mt-1 font-semibold">{modalErrors.department}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                                Joining Date *
                                            </label>
                                            <input
                                                type="date"
                                                value={joiningDate}
                                                onChange={(e) => setJoiningDate(e.target.value)}
                                                className={`w-full px-3 py-2 bg-white border ${modalErrors.joiningDate ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'} text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1`}
                                            />
                                            {modalErrors.joiningDate && <p className="text-red-500 text-xs mt-1 font-semibold">{modalErrors.joiningDate}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                                Salary
                                            </label>
                                            <input
                                                type="text"
                                                value={salary}
                                                onChange={(e) => setSalary(e.target.value)}
                                                placeholder="0.00"
                                                className={`w-full px-3 py-2 bg-white border ${modalErrors.salary ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'} text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1`}
                                            />
                                            {modalErrors.salary && <p className="text-red-500 text-xs mt-1 font-semibold">{modalErrors.salary}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Additional Details */}
                                <div>
                                    <h4 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-4 border-b border-[#E5E7EB] pb-2">
                                        Additional Details
                                    </h4>
                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                                Emergency Contact Name
                                            </label>
                                            <input
                                                type="text"
                                                value={emergencyContactName}
                                                onChange={(e) => setEmergencyContactName(e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                                Emergency Contact Number
                                            </label>
                                            <input
                                                type="text"
                                                value={emergencyContactNumber}
                                                onChange={(e) => setEmergencyContactNumber(e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1"
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
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                                            Notes
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Internal notes..."
                                            className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 resize-none"
                                        />
                                    </div>
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
                                    Save Employee
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
                                <h3 className="text-base font-bold text-[#1F2937]">Delete Employee</h3>
                                <p className="text-sm text-[#6B7280]">
                                    Are you sure you want to delete <strong className="text-[#1F2937]">{deleteTarget.fullName} ({deleteTarget.empCode})</strong>? This action cannot be undone.
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