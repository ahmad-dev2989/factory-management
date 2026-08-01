import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  X, LayoutDashboard, Building2, Users, KeyRound, Landmark,
  ShoppingCart, Package, Truck, ArrowDownCircle, ArrowUpCircle,
  BarChart3, UserCheck, Ruler, BookOpen, Link2, Receipt,
  SlidersHorizontal, DatabaseBackup, Menu, Settings, ChevronDown, ChevronRight,
  Star, Clock, Heart, HelpCircle
} from 'lucide-react';
import { GlobalSearch } from './GlobalSearch';
import { CommandPalette } from './CommandPalette';
import { AboutDialog } from './AboutDialog';

interface SidebarGroup {
  label: string;
  items: { title: string; route: string; icon: React.ReactNode }[];
}

const sidebarGroups: SidebarGroup[] = [
  {
    label: 'Main',
    items: [
      { title: 'Business Dashboard', route: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { title: 'System Settings', route: '/settings', icon: <Settings className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Company',
    items: [
      { title: 'Company Profile', route: '/company-profile', icon: <Building2 className="w-4 h-4" /> },
      { title: 'User Accounts', route: '/user-management', icon: <Users className="w-4 h-4" /> },
      { title: 'Change Password', route: '/change-password', icon: <KeyRound className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Financial',
    items: [
      { title: 'Bank Accounts', route: '/bank-accounts', icon: <Landmark className="w-4 h-4" /> },
      { title: 'Chart of Accounts', route: '/chart-of-accounts', icon: <BookOpen className="w-4 h-4" /> },
      { title: 'Linked Accounts', route: '/linked-accounts', icon: <Link2 className="w-4 h-4" /> },
      { title: 'Expense Accounts', route: '/expense-accounts', icon: <Receipt className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Transactions',
    items: [
      { title: 'Sales', route: '/sales', icon: <ShoppingCart className="w-4 h-4" /> },
      { title: 'Purchases', route: '/purchases', icon: <Truck className="w-4 h-4" /> },
      { title: 'Cash In', route: '/cash-in', icon: <ArrowDownCircle className="w-4 h-4" /> },
      { title: 'Cash Out', route: '/cash-out', icon: <ArrowUpCircle className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Master Data',
    items: [
      { title: 'Products', route: '/products', icon: <Package className="w-4 h-4" /> },
      { title: 'Customers', route: '/customers', icon: <UserCheck className="w-4 h-4" /> },
      { title: 'Employees', route: '/employees', icon: <Users className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Reports & System',
    items: [
      { title: 'Reports', route: '/reports', icon: <BarChart3 className="w-4 h-4" /> },
      { title: 'Misc Settings', route: '/system-preferences', icon: <SlidersHorizontal className="w-4 h-4" /> },
      { title: 'Backup & Restore', route: '/backup-restore', icon: <DatabaseBackup className="w-4 h-4" /> },
    ],
  },
];

export function SidebarToggle() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const location = useLocation();

  // Track last opened page and recently opened pages
  useEffect(() => {
    const path = location.pathname;
    if (path === '/' || path === '/login') return;

    localStorage.setItem('last_opened_page', path);

    const stored = localStorage.getItem('recently_opened');
    let list: { title: string; route: string }[] = [];
    if (stored) {
      try {
        list = JSON.parse(stored);
      } catch (err) {}
    }

    let title = '';
    for (const group of sidebarGroups) {
      const match = group.items.find(item => item.route === path);
      if (match) {
        title = match.title;
        break;
      }
    }
    if (path === '/diagnostics') title = 'Diagnostics';
    if (path === '/log-viewer') title = 'System Logs';

    if (title) {
      list = list.filter(item => item.route !== path);
      list.unshift({ title, route: path });
      if (list.length > 10) list.pop();
      localStorage.setItem('recently_opened', JSON.stringify(list));
    }
  }, [location.pathname]);

  // Global keyboard shortcuts listeners
  useEffect(() => {
    const handleShortcuts = (e: KeyboardEvent) => {
      // Command palette: Ctrl + Shift + P
      if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'P') {
        e.preventDefault();
        setShowPalette(prev => !prev);
      }
      // Search dialog: Ctrl + K or Ctrl + /
      else if (e.ctrlKey && (e.key === '/' || e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, []);

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center p-1.5 hover:bg-white/10 rounded transition-colors cursor-pointer focus:outline-none"
          title="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          onClick={() => setShowSearch(true)}
          className="flex items-center justify-center p-1.5 hover:bg-white/10 rounded transition-colors cursor-pointer focus:outline-none text-white/80 hover:text-white"
          title="Global Search (Ctrl+K)"
        >
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isOpen && (
        <SidebarPanel 
          onClose={() => setIsOpen(false)} 
          onOpenAbout={() => { setIsOpen(false); setShowAbout(true); }}
        />
      )}

      {/* Overlays */}
      {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} />}
      {showPalette && <CommandPalette onClose={() => setShowPalette(false)} />}
      {showAbout && <AboutDialog onClose={() => setShowAbout(false)} />}
    </>
  );
}

function SidebarPanel({ onClose, onOpenAbout }: { onClose: () => void; onOpenAbout: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentPages, setRecentPages] = useState<{ title: string; route: string }[]>([]);

  // Load preferences
  useEffect(() => {
    // Collapsed groups state
    const savedCollapsed = localStorage.getItem('sidebar_collapsed_groups');
    if (savedCollapsed) {
      try { setCollapsedGroups(JSON.parse(savedCollapsed)); } catch (e) {}
    }

    // Favorites
    const savedFavorites = localStorage.getItem('sidebar_favorites');
    if (savedFavorites) {
      try { setFavorites(JSON.parse(savedFavorites)); } catch (e) {}
    }

    // Recent pages
    const savedRecents = localStorage.getItem('recently_opened');
    if (savedRecents) {
      try { setRecentPages(JSON.parse(savedRecents)); } catch (e) {}
    }
  }, []);

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => {
      const updated = { ...prev, [label]: !prev[label] };
      localStorage.setItem('sidebar_collapsed_groups', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleFavorite = (e: React.MouseEvent, route: string) => {
    e.stopPropagation();
    setFavorites(prev => {
      const updated = prev.includes(route) ? prev.filter(r => r !== route) : [...prev, route];
      localStorage.setItem('sidebar_favorites', JSON.stringify(updated));
      return updated;
    });
  };

  const handleNavigate = (route: string) => {
    navigate(route);
    onClose();
  };

  // Find dynamic favorite metadata
  const favoriteItems = favorites.map(route => {
    for (const group of sidebarGroups) {
      const match = group.items.find(item => item.route === route);
      if (match) return match;
    }
    if (route === '/diagnostics') return { title: 'Diagnostics', route: '/diagnostics', icon: <SlidersHorizontal className="w-4 h-4" /> };
    if (route === '/log-viewer') return { title: 'System Logs', route: '/log-viewer', icon: <SlidersHorizontal className="w-4 h-4" /> };
    return null;
  }).filter(Boolean) as { title: string; route: string; icon: React.ReactNode }[];

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div
        className="absolute top-0 left-0 bottom-0 w-[280px] bg-white shadow-2xl flex flex-col animate-slide-in-left"
        style={{ animation: 'slideInLeft 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="h-[60px] bg-[#2F80ED] text-white flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5" />
            <span className="font-bold text-base tracking-wide">Navigation</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded transition-colors cursor-pointer focus:outline-none"
            title="Close Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-2">
          
          {/* Favorite Pages section */}
          {favoriteItems.length > 0 && (
            <div className="mb-2 border-b border-[#F3F4F6] pb-2">
              <button
                onClick={() => toggleGroup('Favorites')}
                className="w-full flex items-center justify-between px-4 py-2.5 text-[10px] font-bold text-amber-600 uppercase tracking-widest hover:bg-[#F6F8FB] transition-colors cursor-pointer focus:outline-none"
              >
                <span className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Favorite Pages
                </span>
                {collapsedGroups['Favorites'] ? (
                  <ChevronRight className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-amber-500" />
                )}
              </button>

              {!collapsedGroups['Favorites'] && (
                <div className="space-y-0.5 px-2">
                  {favoriteItems.map(item => (
                    <button
                      key={item.route}
                      onClick={() => handleNavigate(item.route)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-[6px] text-sm font-semibold transition-all cursor-pointer focus:outline-none ${
                        location.pathname === item.route ? 'bg-amber-50 text-amber-700' : 'text-[#374151] hover:bg-[#F6F8FB]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-amber-500">{item.icon}</span>
                        <span className="truncate">{item.title}</span>
                      </div>
                      <Star 
                        onClick={(e) => toggleFavorite(e, item.route)} 
                        className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0 hover:scale-110 transition-transform" 
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Core Categories Groups */}
          {sidebarGroups.map((group) => {
            const isCollapsed = collapsedGroups[group.label] ?? false;
            return (
              <div key={group.label} className="mb-1">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="w-full flex items-center justify-between px-4 py-2 text-[10px] font-bold text-[#6B7280] uppercase tracking-widest hover:bg-[#F6F8FB] transition-colors cursor-pointer focus:outline-none"
                >
                  <span>{group.label}</span>
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF]" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF]" />
                  )}
                </button>

                {/* Group Items */}
                {!isCollapsed && (
                  <div className="space-y-0.5 px-2">
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.route;
                      const isFav = favorites.includes(item.route);
                      return (
                        <button
                          key={item.title}
                          onClick={() => handleNavigate(item.route)}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-all cursor-pointer focus:outline-none group ${
                            isActive
                              ? 'bg-[#2F80ED]/10 text-[#2F80ED] font-semibold'
                              : 'text-[#374151] hover:bg-[#F6F8FB]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={isActive ? 'text-[#2F80ED]' : 'text-[#6B7280]'}>
                              {item.icon}
                            </span>
                            <span className="truncate">{item.title}</span>
                          </div>
                          
                          {/* Favorite toggle star */}
                          <Star 
                            onClick={(e) => toggleFavorite(e, item.route)} 
                            className={`w-3.5 h-3.5 shrink-0 transition-all ${
                              isFav 
                                ? 'text-amber-500 fill-amber-500' 
                                : 'text-gray-300 opacity-0 group-hover:opacity-100 hover:text-amber-500'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Recently Opened section */}
          {recentPages.length > 0 && (
            <div className="mt-4 border-t border-[#F3F4F6] pt-2">
              <button
                onClick={() => toggleGroup('Recents')}
                className="w-full flex items-center justify-between px-4 py-2.5 text-[10px] font-bold text-[#6B7280] uppercase tracking-widest hover:bg-[#F6F8FB] transition-colors cursor-pointer focus:outline-none"
              >
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-500" /> Recently Opened
                </span>
                {collapsedGroups['Recents'] ? (
                  <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF]" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF]" />
                )}
              </button>

              {!collapsedGroups['Recents'] && (
                <div className="space-y-0.5 px-2">
                  {recentPages.map(page => (
                    <button
                      key={page.route}
                      onClick={() => handleNavigate(page.route)}
                      className="w-full flex items-center gap-3 px-3 py-1.5 rounded-[6px] text-xs font-semibold text-gray-600 hover:bg-[#F6F8FB] transition-all cursor-pointer focus:outline-none text-left"
                    >
                      <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="truncate">{page.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer & About Application link */}
        <div className="border-t border-[#E5E7EB] px-4 py-3 bg-[#FAFAFB] flex flex-col gap-2">
          <button
            onClick={onOpenAbout}
            className="w-full py-1.5 border border-gray-250 bg-white hover:bg-gray-50 text-gray-700 rounded-[6px] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer focus:outline-none shadow-sm"
          >
            <HelpCircle className="w-4 h-4 text-blue-500" />
            <span>About Application</span>
          </button>
          
          <p className="text-[9px] font-semibold text-[#9CA3AF] uppercase tracking-wider text-center select-none">
            Factory App v0.0.3
          </p>
        </div>
      </div>

      {/* Keyframe animation */}
      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

export default SidebarToggle;

