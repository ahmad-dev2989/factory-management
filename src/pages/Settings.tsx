import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Wifi,
  Bell,
  Mail,
  LogOut,
  Building2,
  Users,
  KeyRound,
  Landmark,
  UserCheck,
  Contact,
  Layers,
  Package,
  Scale,
  Tag,
  BookOpen,
  Link,
  Receipt,
  Settings2
} from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/login');
  };

  const cards = [
    {
      title: 'Company Profile',
      description: 'Manage company information',
      icon: Building2,
    },
    {
      title: 'User Accounts',
      description: 'Create and manage software users',
      icon: Users,
    },
    {
      title: 'Change Password',
      description: 'Change administrator password',
      icon: KeyRound,
    },
    {
      title: 'Bank Accounts',
      description: 'Manage Cash, Meezan Bank, HBL, UBL, EasyPaisa, JazzCash',
      icon: Landmark,
    },
    {
      title: 'Customers',
      description: 'Manage all customers',
      icon: UserCheck,
    },
    {
      title: 'Employees',
      description: 'Manage employees',
      icon: Contact,
    },
    {
      title: 'Product Categories',
      description: 'Manage categories',
      icon: Layers,
    },
    {
      title: 'Products',
      description: 'Manage products',
      icon: Package,
    },
    {
      title: 'Units',
      description: 'Piece, KG, Liter, Meter, Box',
      icon: Scale,
    },
    {
      title: 'Brands',
      description: 'Manage product brands',
      icon: Tag,
    },
    {
      title: 'Chart of Accounts',
      description: 'Accounting accounts',
      icon: BookOpen,
    },
    {
      title: 'Linked Accounts',
      description: 'Connect accounts',
      icon: Link,
    },
    {
      title: 'Expense Accounts',
      description: 'Manage expense accounts',
      icon: Receipt,
    },
    {
      title: 'Misc Settings',
      description: 'General application settings',
      icon: Settings2,
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#F6F8FB] select-none min-h-screen">
      {/* Top Blue Header */}
      <header className="h-[60px] bg-[#2F80ED] text-white flex items-center justify-between px-5 shrink-0 shadow-sm">
        {/* Left Side */}
        <div className="flex items-center gap-4">
          <button className="hover:bg-white/10 p-1.5 rounded transition-colors cursor-pointer focus:outline-none">
            <Menu className="w-5 h-5" />
          </button>
          
          {/* LB Logo Placeholder */}
          <div className="bg-white/15 px-2.5 py-1 rounded text-xs font-bold tracking-widest border border-white/20 select-none">
            LB
          </div>
          
          <span className="font-semibold text-lg tracking-wide">
            Factory Management System
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
          <div className="grid grid-cols-4 xl:grid-cols-5 gap-5">
            {cards.map((card, index) => {
              const IconComponent = card.icon;
              return (
                <div
                  key={index}
                  className="bg-white border border-[#E5E7EB] rounded-[10px] p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_0_rgba(0,0,0,0.05)] hover:bg-[#EEF5FF] hover:border-[#2F80ED]/30 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[140px]"
                >
                  <div>
                    {/* Top Row: Icon + Title */}
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 bg-[#F6F8FB] text-[#2F80ED] rounded-[8px] shrink-0 border border-[#E5E7EB]">
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-[#1F2937] leading-tight pt-1.5">
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
