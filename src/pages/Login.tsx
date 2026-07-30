import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Factory, Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function Login(_props: { adminPassword?: string }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const users = await (window as any).electron.invoke(
        'db-query',
        'SELECT * FROM users WHERE username = ? AND password = ? AND status = "Active"',
        [username.trim(), password]
      );

      if (users && users.length > 0) {
        const now = new Date().toLocaleString();
        await (window as any).electron.invoke(
          'db-query',
          'UPDATE users SET last_login = ? WHERE id = ?',
          [now, users[0].id]
        );
        setError('');
        navigate('/settings');
      } else {
        setError('Invalid username or password.');
      }
    } catch (err) {
      console.error('[Login] Authentication error:', err);
      setError('Database connection error.');
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between items-center bg-[#F6F8FB] min-h-screen py-12 px-4 select-none">
      {/* Spacer to push card down slightly */}
      <div className="flex-1 flex items-center justify-center w-full">
        <div className="w-full max-w-[420px] bg-white border border-[#E5E7EB] rounded-[10px] shadow-sm p-8">
          
          {/* Logo Placeholder & Headings */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-[#EEF5FF] border border-[#2F80ED]/20 rounded-full flex items-center justify-center mb-4">
              <Factory className="w-8 h-8 text-[#2F80ED]" />
            </div>
            <h1 className="text-[22px] font-semibold text-[#1F2937] tracking-tight text-center">
              Factory Management System
            </h1>
            <p className="text-sm text-[#6B7280] mt-1 text-center">
              Please sign in to continue.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-600 rounded-[8px] flex items-start gap-2.5 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-2">
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#6B7280]">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[8px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#6B7280]">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#E5E7EB] text-[#1F2937] text-sm rounded-[8px] focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#6B7280] hover:text-[#1F2937] transition-colors focus:outline-none cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#E5E7EB] text-[#2F80ED] focus:ring-[#2F80ED] cursor-pointer"
                />
                <span className="text-sm text-[#6B7280]">Remember Me</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#2F80ED] hover:bg-[#1B6FD1] text-white text-sm font-semibold rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#2F80ED]/50 transition-colors shadow-sm cursor-pointer mt-2"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>

      {/* Version Footer */}
      <div className="text-xs text-[#6B7280] font-semibold tracking-wide">
        Version 1.0
      </div>
    </div>
  );
}
