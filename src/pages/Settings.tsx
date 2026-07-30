import { useNavigate } from 'react-router-dom';
import { Wifi, Bell, Mail, LogOut } from 'lucide-react';

// Custom Colored SVG Icons (Desktop Accounting Software Style)
const CompanyProfileIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="6" width="24" height="20" rx="2" fill="#2F80ED" />
    <rect x="8" y="10" width="4" height="4" rx="1" fill="#FFFFFF" fillOpacity="0.8" />
    <rect x="14" y="10" width="4" height="4" rx="1" fill="#FFFFFF" fillOpacity="0.8" />
    <rect x="20" y="10" width="4" height="4" rx="1" fill="#FFFFFF" fillOpacity="0.8" />
    <rect x="8" y="16" width="4" height="4" rx="1" fill="#FFFFFF" fillOpacity="0.8" />
    <rect x="14" y="16" width="4" height="4" rx="1" fill="#FFFFFF" fillOpacity="0.8" />
    <rect x="20" y="16" width="4" height="4" rx="1" fill="#FFFFFF" fillOpacity="0.8" />
    <rect x="13" y="22" width="6" height="4" fill="#F2C94C" />
  </svg>
);

const UserAccountsIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="11" cy="11" r="5" fill="#27AE60" />
    <path d="M4 25C4 20.5817 7.58172 17 11 17C14.4183 17 18 20.5817 18 25H4Z" fill="#27AE60" />
    <circle cx="21" cy="13" r="4" fill="#2F80ED" />
    <path d="M15 25C15 21.5 18 18 21 18C24 18 27 21.5 27 25H15Z" fill="#2F80ED" />
  </svg>
);

const ChangePasswordIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="11" cy="20" r="7" fill="#F2C94C" />
    <circle cx="11" cy="20" r="3" fill="#FFFFFF" />
    <rect x="16" y="13" width="12" height="4" rx="1" fill="#F2C94C" />
    <rect x="21" y="17" width="3" height="4" rx="0.5" fill="#F2C94C" />
    <rect x="26" y="17" width="3" height="4" rx="0.5" fill="#F2C94C" />
  </svg>
);

const BankAccountsIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 4L4 11H28L16 4Z" fill="#EB5757" />
    <rect x="6" y="13" width="4" height="11" fill="#BDC3C7" />
    <rect x="14" y="13" width="4" height="11" fill="#BDC3C7" />
    <rect x="22" y="13" width="4" height="11" fill="#BDC3C7" />
    <rect x="4" y="26" width="24" height="3" rx="1" fill="#EB5757" />
  </svg>
);

const CustomersIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="11" r="6" fill="#9B51E0" />
    <path d="M6 25C6 19.5 10.5 17 16 17C21.5 17 26 19.5 26 25H6Z" fill="#9B51E0" />
    <circle cx="25" cy="23" r="5" fill="#27AE60" />
    <path d="M22.5 23L24 24.5L27.5 21" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const EmployeesIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="5" width="24" height="22" rx="2" fill="#2D9CDB" />
    <rect x="8" y="9" width="7" height="7" rx="1" fill="#FFFFFF" />
    <circle cx="11.5" cy="11.5" r="2" fill="#E0E0E0" />
    <path d="M8.5 15.5C8.5 14 10 13.5 11.5 13.5C13 13.5 14.5 14 14.5 15.5H8.5Z" fill="#E0E0E0" />
    <rect x="18" y="9" width="7" height="2" rx="0.5" fill="#FFFFFF" />
    <rect x="18" y="13" width="7" height="2" rx="0.5" fill="#FFFFFF" />
    <rect x="8" y="19" width="17" height="2" rx="0.5" fill="#FFFFFF" />
    <rect x="8" y="23" width="12" height="2" rx="0.5" fill="#FFFFFF" />
  </svg>
);

const ProductsIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 4L4 10L16 16L28 10L16 4Z" fill="#F2994A" />
    <path d="M4 11.5V23.5L16 29.5V17.5L4 11.5Z" fill="#D37E3A" />
    <path d="M28 11.5V23.5L16 29.5V17.5L28 11.5Z" fill="#E28E49" />
    <path d="M11 11.5L16 14L21 11.5L16 9L11 11.5Z" fill="#2F80ED" />
  </svg>
);

const UnitsIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="15" y="6" width="2" height="20" fill="#4F4F4F" />
    <rect x="6" y="25" width="20" height="2" rx="0.5" fill="#4F4F4F" />
    <path d="M8 8H24" stroke="#4F4F4F" strokeWidth="2" strokeLinecap="round" />
    <path d="M8 8V16" stroke="#4F4F4F" strokeWidth="1" />
    <path d="M5 16C5 18 11 18 11 16H5Z" fill="#27AE60" />
    <path d="M24 8V16" stroke="#4F4F4F" strokeWidth="1" />
    <path d="M21 16C21 18 27 18 27 16H21Z" fill="#27AE60" />
    <circle cx="16" cy="8" r="2" fill="#F2C94C" />
  </svg>
);

const ChartOfAccountsIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="6" width="24" height="20" rx="2" fill="#F2C94C" />
    <path d="M4 11H28V24C28 25.1046 27.1046 26 26 26H6C4.89543 26 4 25.1046 4 24V11Z" fill="#E2B33C" />
    <rect x="8" y="14" width="16" height="8" rx="1" fill="#FFFFFF" />
    <rect x="10" y="16" width="12" height="1.5" rx="0.5" fill="#27AE60" />
    <rect x="10" y="19" width="8" height="1.5" rx="0.5" fill="#27AE60" />
  </svg>
);

const LinkedAccountsIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="16" r="6" stroke="#2F80ED" strokeWidth="3.5" fill="none" />
    <circle cx="20" cy="16" r="6" stroke="#27AE60" strokeWidth="3.5" fill="none" />
    <rect x="14" y="14.5" width="4" height="3" fill="#2F80ED" />
  </svg>
);

const ExpenseAccountsIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="10" width="22" height="15" rx="2.5" fill="#D37E3A" />
    <path d="M5 14H27V21C27 22.3807 25.8807 23.5 24.5 23.5H7.5C6.11929 23.5 5 22.3807 5 21V14Z" fill="#BD6A2A" />
    <rect x="12" y="7" width="8" height="5" rx="1" fill="#27AE60" />
    <rect x="22" y="15" width="5" height="3" rx="0.5" fill="#F2C94C" />
    <path d="M22 6L28 10M28 10H24M28 10V6" stroke="#EB5757" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MiscSettingsIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="6" width="24" height="20" rx="2" fill="#56CCF2" />
    <rect x="8" y="11" width="16" height="2" rx="0.5" fill="#FFFFFF" />
    <rect x="8" y="19" width="16" height="2" rx="0.5" fill="#FFFFFF" />
    <circle cx="12" cy="12" r="3.5" fill="#2F80ED" />
    <circle cx="12" cy="12" r="1.5" fill="#FFFFFF" />
    <circle cx="20" cy="20" r="3.5" fill="#2F80ED" />
    <circle cx="20" cy="20" r="1.5" fill="#FFFFFF" />
  </svg>
);

export default function Settings() {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/login');
  };

  const cards = [
    {
      title: 'Company Profile',
      description: 'Manage company information',
      icon: CompanyProfileIcon,
    },
    {
      title: 'User Accounts',
      description: 'Create and manage software users',
      icon: UserAccountsIcon,
    },
    {
      title: 'Change Password',
      description: 'Change administrator password',
      icon: ChangePasswordIcon,
    },
    {
      title: 'Bank Accounts',
      description: 'Manage Cash, Meezan Bank, HBL, UBL, EasyPaisa, JazzCash',
      icon: BankAccountsIcon,
    },
    {
      title: 'Customers',
      description: 'Manage all customers',
      icon: CustomersIcon,
    },
    {
      title: 'Employees',
      description: 'Manage employees',
      icon: EmployeesIcon,
    },
    {
      title: 'Products',
      description: 'Manage products',
      icon: ProductsIcon,
    },
    {
      title: 'Units',
      description: 'Piece, KG, Liter, Meter, Box',
      icon: UnitsIcon,
    },
    {
      title: 'Chart of Accounts',
      description: 'Accounting accounts',
      icon: ChartOfAccountsIcon,
    },
    {
      title: 'Linked Accounts',
      description: 'Connect accounts',
      icon: LinkedAccountsIcon,
    },
    {
      title: 'Expense Accounts',
      description: 'Manage expense accounts',
      icon: ExpenseAccountsIcon,
    },
    {
      title: 'Misc Settings',
      description: 'General application settings',
      icon: MiscSettingsIcon,
    },
  ];

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

      {/* Page Title Area */}
      <div className="bg-white border-b border-[#E5E7EB] py-5 px-8 flex flex-col justify-center">
        <div className="max-w-[1600px] w-full mx-auto flex flex-col gap-0.5">
          <h2 className="text-xl font-bold text-[#1F2937] flex items-center gap-2">
            <span className="text-lg">⚙</span> Settings
          </h2>
          <p className="text-xs text-[#6B7280] font-semibold tracking-wide uppercase">
            System Configuration
          </p>
        </div>
      </div>

      {/* Main Grid Content */}
      <main className="flex-grow p-8 overflow-y-auto">
        <div className="max-w-[1600px] w-full mx-auto">
          <div className="grid grid-cols-4 xl:grid-cols-4 gap-6">
            {cards.map((card, index) => {
              const IconComponent = card.icon;
              return (
                <div
                  key={index}
                  onClick={() => {
                    if (card.title === 'Company Profile') {
                      navigate('/company-profile');
                    } else if (card.title === 'Change Password') {
                      navigate('/change-password');
                    } else if (card.title === 'User Accounts') {
                      navigate('/user-management');
                    } else if (card.title === 'Bank Accounts') {
                      navigate('/bank-accounts');
                    } else if (card.title === 'Customers') {
                      navigate('/customers');
                    } else if (card.title === 'Employees') {
                      navigate('/employees');
                    } else if (card.title === 'Chart of Accounts') {
                      navigate('/chart-of-accounts');
                    } else if (card.title === 'Expense Accounts') {
                      navigate('/expense-accounts');
                    } else if (card.title === 'Linked Accounts') {
                      navigate('/linked-accounts');
                    } else if (card.title === 'Misc Settings') {
                      navigate('/system-preferences');
                    }
                  }}
                  className="bg-white border border-[#E5E7EB] rounded-[10px] p-7 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_0_rgba(0,0,0,0.08)] hover:bg-[#EEF5FF] hover:border-[#2F80ED]/30 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[165px]"
                >
                  <div>
                    {/* Top Row: Icon + Title */}
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-[#F6F8FB] rounded-[8px] shrink-0 border border-[#E5E7EB] flex items-center justify-center">
                        <IconComponent />
                      </div>
                      <h3 className="text-base font-bold text-[#1F2937] leading-tight pt-2">
                        {card.title}
                      </h3>
                    </div>
                  </div>

                  {/* Bottom Row: Description */}
                  <p className="text-sm text-[#6B7280] mt-4 line-clamp-3 leading-relaxed">
                    {card.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
