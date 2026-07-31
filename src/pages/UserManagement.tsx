import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wifi, Bell, Mail, LogOut, ChevronRight, Search, Plus, Edit, Trash2, Eye, EyeOff, X, AlertTriangle, ArrowLeft } from 'lucide-react';

interface UserItem {
  id: number;
  fullName: string;
  username: string;
  role: string;
  status: string;
  lastLogin: string;
  password?: string;
}

export default function UserManagement() {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/login');
  };

  // State lists
  const [users, setUsers] = useState<UserItem[]>([]);

  const fetchUsers = async () => {
    try {
      const raw = await (window as any).electron.invoke('db-query', 'SELECT * FROM users');
      if (raw && !raw.error) {
        const mapped = raw.map((u: any) => ({
          id: u.id,
          fullName: u.full_name,
          username: u.username,
          role: u.role,
          status: u.status,
          lastLogin: u.last_login,
          password: u.password
        }));
        setUsers(mapped);
      }
    } catch (err) {
      console.error('[UserManagement] Failed to load users:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Employee');
  const [status, setStatus] = useState('Active');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [modalErrors, setModalErrors] = useState<Record<string, string>>({});

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const resetModalFields = () => {
    setFullName('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setRole('Employee');
    setStatus('Active');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setModalErrors({});
  };

  const handleAddClick = () => {
    setEditingUser(null);
    resetModalFields();
    setIsModalOpen(true);
  };

  const handleEditClick = (user: UserItem) => {
    setEditingUser(user);
    setFullName(user.fullName);
    setUsername(user.username);
    setPassword(''); // Should remain empty
    setConfirmPassword('');
    setRole(user.role);
    setStatus(user.status);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setModalErrors({});
    setIsModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full Name is required';
    }

    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else {
      const usernameExists = users.some(
        (u) =>
          u.username.toLowerCase() === username.trim().toLowerCase() &&
          (!editingUser || u.id !== editingUser.id)
      );
      if (usernameExists) {
        newErrors.username = 'Username must be unique';
      }
    }

    // Password Checks
    if (!editingUser) {
      if (!password) {
        newErrors.password = 'Password is required';
      } else if (password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }

      if (confirmPassword !== password) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    } else {
      if (password) {
        if (password.length < 8) {
          newErrors.password = 'Password must be at least 8 characters';
        }
        if (confirmPassword !== password) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setModalErrors(newErrors);
      return;
    }

    if (editingUser) {
      const saveUser = async () => {
        try {
          if (password) {
            await (window as any).electron.invoke(
              'db-query',
              'UPDATE users SET full_name = ?, username = ?, role = ?, status = ?, password = ? WHERE id = ?',
              [fullName.trim(), username.trim(), role, status, password, editingUser.id]
            );
          } else {
            await (window as any).electron.invoke(
              'db-query',
              'UPDATE users SET full_name = ?, username = ?, role = ?, status = ? WHERE id = ?',
              [fullName.trim(), username.trim(), role, status, editingUser.id]
            );
          }
          setSuccessMessage('User updated successfully.');
          await fetchUsers();
          setIsModalOpen(false);
          resetModalFields();
          setTimeout(() => setSuccessMessage(''), 4000);
        } catch (err) {
          console.error('[UserManagement] Save user error:', err);
        }
      };
      saveUser();
    } else {
      const createUser = async () => {
        try {
          await (window as any).electron.invoke(
            'db-query',
            'INSERT INTO users (full_name, username, role, status, password, last_login) VALUES (?, ?, ?, ?, ?, ?)',
            [fullName.trim(), username.trim(), role, status, password, 'Never']
          );
          setSuccessMessage('User created successfully.');
          await fetchUsers();
          setIsModalOpen(false);
          resetModalFields();
          setTimeout(() => setSuccessMessage(''), 4000);
        } catch (err) {
          console.error('[UserManagement] Create user error:', err);
        }
      };
      createUser();
    }
  };

  const handleDeleteClick = (user: UserItem) => {
    setDeleteTarget(user);
    setIsDeleteModalOpen(true);
    if (user.username === 'admin') {
      setDeleteError('Administrator account cannot be deleted.');
    } else {
      setDeleteError('');
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.username === 'admin') {
      setDeleteError('Administrator account cannot be deleted.');
      return;
    }

    const deleteUser = async () => {
      try {
        await (window as any).electron.invoke('db-query', 'DELETE FROM users WHERE id = ?', [deleteTarget.id]);
        setSuccessMessage('User deleted successfully.');
        await fetchUsers();
        setIsDeleteModalOpen(false);
        setDeleteTarget(null);
        setTimeout(() => setSuccessMessage(''), 4000);
      } catch (err) {
        console.error('[UserManagement] Delete user error:', err);
      }
    };
    deleteUser();
  };

  // Instant Search Logic
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  // Badge Style Selectors
  const getRoleBadgeClass = (userRole: string) => {
    switch (userRole) {
      case 'Administrator':
        return 'bg-red-50 border border-red-200 text-red-700';
      case 'Manager':
        return 'bg-blue-50 border border-blue-200 text-blue-700';
      case 'Cashier':
        return 'bg-orange-50 border border-orange-200 text-orange-700';
      default:
        return 'bg-green-50 border border-green-200 text-green-700';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F6F8FB] select-none min-h-screen">
      {/* Top Blue Header */}
      <header className="h-[60px] bg-[#2F80ED] text-white flex items-center justify-between px-5 shrink-0 shadow-sm">
        {/* Left Side */}
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

        {/* Right Side */}
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
            <span className="text-[#1F2937]">User Management</span>
          </div>

          <h2 className="text-xl font-bold text-[#1F2937] mt-1">
            User Management
          </h2>
          <p className="text-xs text-[#6B7280] font-semibold tracking-wide uppercase">
            Manage software users and permissions
          </p>
        </div>
      </div>

      {/* Main Table Content */}
      <main className="flex-grow p-8 overflow-y-auto">
        <div className="max-w-[1400px] w-full mx-auto space-y-4">

          {/* Notification Message Banner */}
          {successMessage && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm font-semibold rounded-[8px] flex items-center gap-2 select-none">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              {successMessage}
            </div>
          )}

          {/* Main List Box */}
          <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] p-6 space-y-6">

            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4">
              {/* Search Field */}
              <div className="relative max-w-sm w-full">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#6B7280]">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, username or role..."
                  className="w-full pl-9 pr-4 py-2 bg-[#F6F8FB] border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:bg-white focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-all"
                />
              </div>

              {/* Add Button */}
              <button
                type="button"
                onClick={handleAddClick}
                className="px-4 py-2 bg-[#2F80ED] hover:bg-[#1B6FD1] text-white text-sm font-semibold rounded-[6px] flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add User
              </button>
            </div>

            {/* Desktop Table View */}
            <div className="overflow-x-auto border border-[#E5E7EB] rounded-[8px]">
              {filteredUsers.length > 0 ? (
                <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-sm">
                  <thead className="bg-[#F6F8FB] text-[#6B7280] font-semibold text-xs uppercase tracking-wider select-none">
                    <tr>
                      <th className="px-6 py-3.5">User ID</th>
                      <th className="px-6 py-3.5">Full Name</th>
                      <th className="px-6 py-3.5">Username</th>
                      <th className="px-6 py-3.5">Role</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5">Last Login</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] text-[#1F2937] font-medium bg-white">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-[#F6F8FB]/50 transition-colors">
                        <td className="px-6 py-4">{user.id}</td>
                        <td className="px-6 py-4 font-semibold">{user.fullName}</td>
                        <td className="px-6 py-4 text-[#6B7280]">{user.username}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-[4px] ${getRoleBadgeClass(user.role)}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-full ${user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[#6B7280]">{user.lastLogin}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            <button
                              type="button"
                              onClick={() => handleEditClick(user)}
                              className="text-[#2F80ED] hover:text-[#1B6FD1] p-1 rounded hover:bg-[#EEF5FF] transition-colors cursor-pointer"
                              title="Edit User"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(user)}
                              className={`p-1 rounded transition-colors cursor-pointer ${user.username === 'admin' ? 'text-[#6B7280]/40 cursor-not-allowed' : 'text-red-500 hover:text-red-700 hover:bg-red-50'}`}
                              title="Delete User"
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
                  No users found.
                </div>
              )}
            </div>

          </div>

        </div>
      </main>

      {/* Add / Edit Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-lg max-w-lg w-full p-6 flex flex-col max-h-[90vh]">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3 shrink-0">
              <h3 className="text-base font-bold text-[#1F2937]">
                {editingUser ? 'Edit User Accounts' : 'Create New User'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#6B7280] hover:text-[#1F2937] p-1 rounded hover:bg-[#F6F8FB] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveUser} className="flex flex-col flex-grow overflow-hidden mt-4">

              {/* Scrollable Fields container */}
              <div className="flex-grow overflow-y-auto pr-1 pb-4 space-y-5">

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Samuel Johnson"
                    className={`w-full px-3 py-2 bg-white border ${modalErrors.fullName ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'} text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1`}
                  />
                  {modalErrors.fullName && (
                    <p className="text-red-500 text-xs mt-1 font-semibold">{modalErrors.fullName}</p>
                  )}
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. samjohn"
                    className={`w-full px-3 py-2 bg-white border ${modalErrors.username ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'} text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1`}
                  />
                  {modalErrors.username && (
                    <p className="text-red-500 text-xs mt-1 font-semibold">{modalErrors.username}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                    Password {editingUser ? '(leave blank to keep current)' : '*'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={editingUser ? '••••••••' : 'Enter password'}
                      className={`w-full pl-3 pr-10 py-2 bg-white border ${modalErrors.password ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'} text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#6B7280] hover:text-[#1F2937] focus:outline-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {modalErrors.password && (
                    <p className="text-red-500 text-xs mt-1 font-semibold">{modalErrors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                    Confirm Password {editingUser ? '(leave blank to keep current)' : '*'}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={editingUser ? '••••••••' : 'Confirm password'}
                      className={`w-full pl-3 pr-10 py-2 bg-white border ${modalErrors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'} text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#6B7280] hover:text-[#1F2937] focus:outline-none cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {modalErrors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1 font-semibold">{modalErrors.confirmPassword}</p>
                  )}
                </div>

                {/* Role & Status Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                      Role *
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] cursor-pointer"
                    >
                      <option value="Administrator">Administrator</option>
                      <option value="Manager">Manager</option>
                      <option value="Cashier">Cashier</option>
                      <option value="Employee">Employee</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                      Status *
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

                {/* Permissions Section */}
                <div className="border-t border-[#E5E7EB] pt-5 space-y-3">
                  <h4 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider">
                    Permissions
                  </h4>

                  {/* Grid Checkboxes */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      'Dashboard',
                      'Sales',
                      'Purchases',
                      'Cash In',
                      'Cash Out',
                      'Customers',
                      'Employees',
                      'Products',
                      'Reports',
                      'Settings',
                      'Bank Accounts',
                      'Company Profile',
                      'Expense Accounts',
                      'Chart of Accounts',
                      'Linked Accounts'
                    ].map((perm) => (
                      <label
                        key={perm}
                        className="flex items-center gap-2 text-xs text-[#6B7280] select-none opacity-60 cursor-not-allowed"
                      >
                        <input
                          type="checkbox"
                          disabled
                          checked={false}
                          className="w-3.5 h-3.5 rounded border-[#E5E7EB] text-[#2F80ED] focus:ring-0 cursor-not-allowed"
                        />
                        <span>{perm}</span>
                      </label>
                    ))}
                  </div>

                  {/* Caption Text */}
                  <p className="text-[11px] text-[#6B7280] font-semibold italic mt-2">
                    Permission Management will be implemented in a later phase.
                  </p>
                </div>

              </div>

              {/* Action Buttons Footer (Static) */}
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
                  Save User
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal Overlay */}
      {isDeleteModalOpen && deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-lg max-w-sm w-full p-6 space-y-5">

            {/* Header / Error Alert */}
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-full ${deleteError ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-[#1F2937]">
                  {deleteError ? 'Action Blocked' : 'Delete User Account'}
                </h3>
                <p className="text-sm text-[#6B7280]">
                  {deleteError ? (
                    <span className="text-red-600 font-semibold">{deleteError}</span>
                  ) : (
                    <span>Are you sure you want to delete this user? This action cannot be undone.</span>
                  )}
                </p>
              </div>
            </div>

            {/* Actions */}
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
