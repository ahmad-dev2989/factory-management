import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wifi, Bell, Mail, LogOut, ChevronRight, Lock, Eye, EyeOff } from 'lucide-react';

interface ChangePasswordProps {
  adminPassword?: string;
  setAdminPassword?: (password: string) => void;
}

export default function ChangePassword({ 
  adminPassword = 'admin', 
  setAdminPassword = () => {} 
}: ChangePasswordProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/login');
  };

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  
  const [dbAdminPassword, setDbAdminPassword] = useState(adminPassword);

  useEffect(() => {
    const fetchAdminPassword = async () => {
      try {
        const users = await (window as any).electron.invoke('db-query', "SELECT password FROM users WHERE username = 'admin'");
        if (users && users.length > 0) {
          setDbAdminPassword(users[0].password);
        }
      } catch (err) {
        console.error('[ChangePassword] Failed to load admin password:', err);
      }
    };
    fetchAdminPassword();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // Validate Current Password
    if (!currentPassword) {
      newErrors.currentPassword = 'Current Password is required';
    } else if (currentPassword !== dbAdminPassword) {
      newErrors.currentPassword = 'Current password is incorrect.';
    }

    // Validate Complexity
    const uppercaseRegex = /[A-Z]/;
    const lowercaseRegex = /[a-z]/;
    const numberRegex = /[0-9]/;
    const specialRegex = /[^A-Za-z0-9]/;

    if (!newPassword) {
      newErrors.newPassword = 'New Password is required';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    } else if (
      !uppercaseRegex.test(newPassword) ||
      !lowercaseRegex.test(newPassword) ||
      !numberRegex.test(newPassword) ||
      !specialRegex.test(newPassword)
    ) {
      newErrors.newPassword = 'Password does not meet complexity requirements';
    } else if (newPassword === dbAdminPassword) {
      newErrors.newPassword = 'New password cannot be the same as the current password.';
    }

    // Validate Confirm Password
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm Password is required';
    } else if (confirmPassword !== newPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSuccessMessage('');
      return;
    }

    // Successful update
    const updateDbPassword = async () => {
      try {
        await (window as any).electron.invoke(
          'db-query',
          "UPDATE users SET password = ? WHERE username = 'admin'",
          [newPassword]
        );
        setDbAdminPassword(newPassword);
        setAdminPassword(newPassword);
        setErrors({});
        setSuccessMessage('Password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } catch (err) {
        console.error('[ChangePassword] Failed to save password:', err);
        setErrors({ general: 'Failed to update database.' });
      }
    };
    updateDbPassword();
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F6F8FB] select-none min-h-screen">
      {/* Top Blue Header */}
      <header className="h-[60px] bg-[#2F80ED] text-white flex items-center justify-between px-5 shrink-0 shadow-sm">
        {/* Left Side */}
        <div className="flex items-center gap-4">
          {/* LB Logo Placeholder */}
          <div className="bg-white/15 px-2.5 py-1 rounded text-xs font-bold tracking-widest border border-white/20 select-none">
            LB
          </div>
          
          <span className="font-semibold text-lg tracking-wide">
            Factory Management & Accounting System
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

      {/* Breadcrumb & Page Title Area */}
      <div className="bg-white border-b border-[#E5E7EB] py-5 px-8 flex flex-col justify-center">
        <div className="max-w-[1400px] w-full mx-auto flex flex-col gap-1.5">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-semibold text-[#6B7280] tracking-wide uppercase">
            <button 
              type="button"
              onClick={() => navigate('/settings')} 
              className="hover:text-[#2F80ED] transition-colors cursor-pointer focus:outline-none"
            >
              Settings
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#1F2937]">Change Password</span>
          </div>
          
          <h2 className="text-xl font-bold text-[#1F2937] mt-1">
            Change Password
          </h2>
          <p className="text-xs text-[#6B7280] font-semibold tracking-wide uppercase">
            Update your administrator password
          </p>
        </div>
      </div>

      {/* Centered Main Form Content */}
      <main className="flex-grow p-8 flex items-center justify-center overflow-y-auto">
        <div className="w-full max-w-[500px]">
          <form onSubmit={handleSave} className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] p-8 space-y-6">
            
            {/* Current Password */}
            <div>
              <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-2">
                Current Password *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#6B7280]">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className={`w-full pl-10 pr-10 py-2.5 bg-white border ${errors.currentPassword ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'} text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1 transition-colors`}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#6B7280] hover:text-[#1F2937] transition-colors focus:outline-none cursor-pointer"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-red-500 text-xs mt-1.5 font-semibold">{errors.currentPassword}</p>
              )}
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-2">
                New Password *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#6B7280]">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className={`w-full pl-10 pr-10 py-2.5 bg-white border ${errors.newPassword ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'} text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1 transition-colors`}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#6B7280] hover:text-[#1F2937] transition-colors focus:outline-none cursor-pointer"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-red-500 text-xs mt-1.5 font-semibold">{errors.newPassword}</p>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-2">
                Confirm New Password *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#6B7280]">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className={`w-full pl-10 pr-10 py-2.5 bg-white border ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-[#E5E7EB] focus:ring-[#2F80ED]'} text-[#1F2937] text-sm rounded-[6px] focus:outline-none focus:ring-1 transition-colors`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#6B7280] hover:text-[#1F2937] transition-colors focus:outline-none cursor-pointer"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1.5 font-semibold">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Password Requirements Info Box */}
            <div className="bg-[#F6F8FB] border border-[#E5E7EB] rounded-[8px] p-4 text-xs text-[#6B7280] space-y-2 select-none">
              <h4 className="font-semibold text-[#1F2937] uppercase tracking-wider">
                Password Requirements
              </h4>
              <ul className="list-disc pl-4 space-y-1">
                <li>Minimum 8 characters</li>
                <li>At least one uppercase letter</li>
                <li>At least one lowercase letter</li>
                <li>At least one number</li>
                <li>At least one special character</li>
              </ul>
              <p className="pt-1">
                <span className="font-semibold text-[#1F2937]">Example:</span> Password@123
              </p>
            </div>

            {/* Save & Cancel Buttons */}
            <div className="flex items-center justify-between border-t border-[#E5E7EB] pt-5">
              {/* Success Notification message */}
              <div className="flex-grow pr-4">
                {successMessage && (
                  <div className="text-green-600 font-semibold text-xs flex items-center gap-2 select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
                    {successMessage}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate('/settings')}
                  className="px-4 py-2 bg-white border border-[#E5E7EB] hover:bg-[#F6F8FB] text-sm font-semibold text-[#1F2937] rounded-[6px] transition-colors cursor-pointer focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2F80ED] hover:bg-[#1B6FD1] text-sm font-semibold text-white rounded-[6px] transition-colors cursor-pointer focus:outline-none shadow-sm"
                >
                  Save Password
                </button>
              </div>
            </div>

          </form>
        </div>
      </main>
    </div>
  );
}
