'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Calendar,
  Phone,
  DollarSign,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { apiCall } from '@/lib/api';
import Table, { Column } from '@/components/ui-table';
import { ServiceBadge, CopyButton, formatDate, truncate, PageLoader } from '@/lib/helpers';

interface Stats {
  todaySms: number;
  weekSms: number;
  monthSms: number;
  todayProfit: number;
  monthProfit: number;
  totalNumbers: number;
  activeNumbers: number;
  totalUsers: number;
  todaySmsByService: { service: string; count: number }[];
  weekSmsByDay: { date: string; count: number }[];
}

interface RecentSms {
  id: string;
  number: string;
  from: string;
  to: string;
  service: string | null;
  country: string | null;
  otp: string | null;
  message: string | null;
  rate: number;
  profit: number;
  receivedAt: string;
}

export default function DashboardHome() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentSms, setRecentSms] = useState<RecentSms[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMsg, setExpandedMsg] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, smsData] = await Promise.all([
        apiCall<Stats>('/api/dashboard/stats'),
        apiCall<{ data: RecentSms[] }>('/api/dashboard/recent-sms?limit=10'),
      ]);
      setStats(statsData);
      setRecentSms(smsData.data || []);
    } catch {
      // error handled silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !stats) return <PageLoader />;

  const statCards = [
    {
      label: "Today's SMS",
      value: stats?.todaySms ?? 0,
      icon: <MessageSquare size={22} />,
      color: 'from-[#735DFF] to-[#6446FE]',
      bgLight: 'bg-[rgba(115,93,255,0.12)]',
      textColor: 'text-[#735DFF]',
    },
    {
      label: 'Monthly SMS',
      value: stats?.monthSms ?? 0,
      icon: <Calendar size={22} />,
      color: 'from-emerald-500 to-emerald-600',
      bgLight: 'bg-emerald-50',
      textColor: 'text-emerald-600',
    },
    {
      label: 'Active Numbers',
      value: stats?.activeNumbers ?? 0,
      icon: <Phone size={22} />,
      color: 'from-amber-500 to-amber-600',
      bgLight: 'bg-amber-50',
      textColor: 'text-amber-600',
    },
    {
      label: 'Total Profit',
      value: `$${((stats?.monthProfit ?? 0)).toFixed(2)}`,
      icon: <DollarSign size={22} />,
      color: 'from-rose-500 to-rose-600',
      bgLight: 'bg-rose-50',
      textColor: 'text-rose-600',
    },
  ];

  const toggleExpand = (id: string) => {
    setExpandedMsg((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const columns: Column<RecentSms>[] = [
    {
      key: 'receivedAt',
      header: 'Time',
      render: (item) => <span className="text-xs text-[#6B7280]">{formatDate(item.receivedAt)}</span>,
    },
    { key: 'number', header: 'Recipient Number', render: (item) => <span className="font-medium">{item.number}</span> },
    {
      key: 'service',
      header: 'Service',
      render: (item) => <ServiceBadge service={item.service} />,
    },
    { key: 'from', header: 'Sender (Service)', render: (item) => <span className="text-xs">{item.from || '—'}</span> },
    {
      key: 'otp',
      header: 'OTP',
      render: (item) => <CopyButton text={item.otp} />,
    },
    {
      key: 'message',
      header: 'Message',
      className: 'max-w-[200px]',
      render: (item) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }}
          className="text-left text-xs text-[#6B7280] hover:text-[#735DFF] transition-colors"
          title={item.message || ''}
        >
          {expandedMsg.has(item.id) ? (item.message || '—') : truncate(item.message, 35)}
        </button>
      ),
    },
  ];

  // Bar chart for service distribution
  const maxServiceCount = Math.max(...(stats?.todaySmsByService || []).map((s) => s.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[1.3rem] font-bold text-[#222F36]">Dashboard</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Overview of your SMS operations</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#735DFF] bg-[rgba(115,93,255,0.1)] rounded-md hover:bg-[rgba(115,93,255,0.2)] transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-lg border border-[#E2E6F1] p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                {card.label}
              </span>
              <div className={`w-10 h-10 rounded-lg ${card.bgLight} flex items-center justify-center ${card.textColor}`}>
                {card.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-[#222F36]">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly SMS Chart */}
        <div className="bg-white rounded-lg border border-[#E2E6F1] p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-[#735DFF]" />
            <h2 className="text-sm font-bold text-[#222F36]">Weekly SMS Volume</h2>
          </div>
          {stats?.weekSmsByDay && stats.weekSmsByDay.length > 0 && (
            <div className="flex items-end gap-2 h-40">
              {stats.weekSmsByDay.map((day, i) => {
                const maxCount = Math.max(...stats.weekSmsByDay.map((d) => d.count), 1);
                const height = (day.count / maxCount) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-semibold text-[#6B7280]">{day.count}</span>
                    <div
                      className="w-full bg-gradient-to-t from-[#735DFF] to-[#a78bfa] rounded-t-md transition-all duration-500 min-h-[4px]"
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                    <span className="text-[10px] text-[#6B7280]">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Service Distribution */}
        <div className="bg-white rounded-lg border border-[#E2E6F1] p-5">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={18} className="text-[#735DFF]" />
            <h2 className="text-sm font-bold text-[#222F36]">Top Services (Today)</h2>
          </div>
          {stats?.todaySmsByService && stats.todaySmsByService.length > 0 ? (
            <div className="space-y-3 max-h-[160px] overflow-y-auto">
              {stats.todaySmsByService.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <ServiceBadge service={s.service} />
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#735DFF] to-[#a78bfa] rounded-full transition-all duration-500"
                      style={{ width: `${(s.count / maxServiceCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-[#222F36] min-w-[30px] text-right">{s.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#6B7280] text-center py-8">No data yet</p>
          )}
        </div>
      </div>

      {/* Recent SMS Table */}
      <div className="bg-white rounded-lg border border-[#E2E6F1] p-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare size={18} className="text-[#735DFF]" />
          <h2 className="text-sm font-bold text-[#222F36]">Recent SMS</h2>
        </div>
        <Table
          columns={columns}
          data={recentSms}
          loading={loading}
          emptyMessage="No SMS received yet"
          minWidth="700px"
        />
      </div>
    </div>
  );
}
