'use client';

import { useState, useEffect } from 'react';
import { Bell, Search } from 'lucide-react';
import DashboardSidebar, { PageKey } from '@/components/dashboard-sidebar';
import DashboardHome from '@/components/dashboard-home';
import NumbersPage from '@/components/numbers-page';
import RangesPage from '@/components/ranges-page';
import SmsReportsPage from '@/components/sms-reports-page';
import UsersPage from '@/components/users-page';
import SettingsPage from '@/components/settings-page';
import { ToastProvider } from '@/components/toast-provider';
import { apiCall } from '@/lib/api';

interface DashboardAppProps {
  initialUser: any;
  onLogout: () => void;
}

export default function DashboardApp({ initialUser, onLogout }: DashboardAppProps) {
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard');
  const [user, setUser] = useState(initialUser);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch fresh user data
    const fetchUser = async () => {
      try {
        const res = await apiCall<{ user: any }>('/api/auth/me');
        setUser(res.user);
        localStorage.setItem('user', JSON.stringify(res.user));
      } catch {
        // Error handled by apiCall (redirects on 401)
      }
    };
    fetchUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onLogout();
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardHome />;
      case 'numbers':
        return <NumbersPage />;
      case 'ranges':
        return <RangesPage />;
      case 'sms-reports':
        return <SmsReportsPage />;
      case 'users':
        return <UsersPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardHome />;
    }
  };

  const pageTitle: Record<PageKey, string> = {
    dashboard: 'Dashboard',
    numbers: 'Numbers',
    ranges: 'Ranges',
    'sms-reports': 'SMS Reports',
    users: 'Users',
    settings: 'Settings',
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[rgba(115,93,255,0.08)]">
        {/* Sidebar */}
        <DashboardSidebar
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          user={user}
          onLogout={handleLogout}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(!mobileOpen)}
        />

        {/* Main Content */}
        <div className="lg:pl-[260px]">
          {/* Top Bar */}
          <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#E2E6F1]">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 lg:px-8">
              <div className="flex items-center gap-4">
                {/* Mobile menu button space (for the hamburger from sidebar) */}
                <div className="w-8 lg:hidden" />
                <h2 className="text-[1.1rem] font-bold text-[#222F36]">{pageTitle[currentPage]}</h2>
              </div>
              <div className="flex items-center gap-3">
                {/* Notification bell (decorative) */}
                <button className="relative p-2 rounded-lg hover:bg-[rgba(115,93,255,0.08)] transition-colors text-[#6B7280]">
                  <Bell size={18} />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                </button>
                {/* User avatar in top bar */}
                <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-[#E2E6F1]">
                  <div className="w-8 h-8 rounded-full bg-[#735DFF] flex items-center justify-center text-white text-xs font-bold">
                    {(user?.username || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden md:block">
                    <p className="text-xs font-semibold text-[#222F36]">{user?.fullName || user?.username}</p>
                    <p className="text-[10px] text-[#6B7280] uppercase tracking-wider">{user?.role || 'admin'}</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-4 sm:p-6 lg:p-8">
            {renderPage()}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
