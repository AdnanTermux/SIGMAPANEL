'use client';

import {
  LayoutDashboard,
  Phone,
  Layers,
  FileText,
  Users,
  Settings,
  LogOut,
  Send,
  X,
  Menu,
} from 'lucide-react';

export type PageKey = 'dashboard' | 'numbers' | 'ranges' | 'sms-reports' | 'users' | 'settings';

interface NavItem {
  key: PageKey;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { key: 'numbers', label: 'Numbers', icon: <Phone size={20} /> },
  { key: 'ranges', label: 'Ranges', icon: <Layers size={20} /> },
  { key: 'sms-reports', label: 'SMS Reports', icon: <FileText size={20} /> },
  { key: 'users', label: 'Users', icon: <Users size={20} /> },
  { key: 'settings', label: 'Settings', icon: <Settings size={20} /> },
];

interface SidebarProps {
  currentPage: PageKey;
  onPageChange: (page: PageKey) => void;
  user: any;
  onLogout: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function DashboardSidebar({
  currentPage,
  onPageChange,
  user,
  onLogout,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const handleNav = (key: PageKey) => {
    onPageChange(key);
    onMobileClose();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3 border-b border-white/10">
        <div className="w-9 h-9 rounded-lg bg-[#735DFF] flex items-center justify-center">
          <Send size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-white font-bold text-base tracking-tight">Fly SMS</h1>
          <p className="text-white/40 text-[10px] uppercase tracking-widest">SMS Panel</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = currentPage === item.key;
          return (
            <button
              key={item.key}
              onClick={() => handleNav(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-[#735DFF] text-white shadow-lg shadow-[#735DFF]/25'
                  : 'text-white/60 hover:text-white hover:bg-white/8'
              }`}
            >
              <span className={isActive ? 'text-white' : 'text-white/50'}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-[#735DFF]/30 flex items-center justify-center text-white text-sm font-bold">
            {(user?.username || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{user?.username || 'User'}</p>
            <p className="text-white/40 text-[10px] uppercase tracking-wider truncate">
              {user?.role || 'admin'}
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-150"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => onMobileClose()}
        className="lg:hidden fixed top-4 left-4 z-[1002] p-2 rounded-lg bg-[#1e1b4b] text-white shadow-lg"
        aria-label="Toggle menu"
      >
        <Menu size={22} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-[1000]"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`lg:hidden fixed top-0 left-0 h-full w-[260px] bg-[#1e1b4b] z-[1001] transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={onMobileClose}
          className="absolute top-3 right-3 p-1.5 text-white/50 hover:text-white transition-colors"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[260px] lg:fixed lg:inset-y-0 bg-[#1e1b4b] z-50">
        {sidebarContent}
      </aside>
    </>
  );
}
