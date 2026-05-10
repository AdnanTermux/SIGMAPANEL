'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Filter, FileText } from 'lucide-react';
import { apiCall, PaginatedResponse } from '@/lib/api';
import Table, { Column } from '@/components/ui-table';
import Pagination from '@/components/ui-pagination';
import { useToast } from '@/components/toast-provider';
import { ServiceBadge, CopyButton, formatDate, truncate, PageLoader } from '@/lib/helpers';

interface SmsItem {
  id: string;
  number: string;
  from: string;
  to: string;
  service: string | null;
  country: string | null;
  otp: string | null;
  message: string | null;
  assignedTo: string | null;
  rate: number;
  profit: number;
  receivedAt: string;
}

export default function SmsReportsPage() {
  const [data, setData] = useState<SmsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filterService, setFilterService] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterNumber, setFilterNumber] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterHasOtp, setFilterHasOtp] = useState('');
  const [expandedMsg, setExpandedMsg] = useState<Set<string>>(new Set());
  const { addToast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (search) params.set('search', search);
      if (filterService) params.set('service', filterService);
      if (filterCountry) params.set('country', filterCountry);
      if (filterNumber) params.set('number', filterNumber);
      if (filterStartDate) params.set('startDate', filterStartDate);
      if (filterEndDate) params.set('endDate', filterEndDate);
      if (filterHasOtp) params.set('hasOtp', filterHasOtp);

      const res = await apiCall<PaginatedResponse<SmsItem>>(`/api/sms?${params.toString()}`);
      setData(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch {
      addToast('Failed to load SMS reports', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterService, filterCountry, filterNumber, filterStartDate, filterEndDate, filterHasOtp, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleExpand = (id: string) => {
    setExpandedMsg((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearFilters = () => {
    setSearch('');
    setFilterService('');
    setFilterCountry('');
    setFilterNumber('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterHasOtp('');
    setPage(1);
  };

  const columns: Column<SmsItem>[] = [
    {
      key: 'receivedAt',
      header: 'Time',
      render: (item) => <span className="text-xs text-[#6B7280]">{formatDate(item.receivedAt)}</span>,
    },
    { key: 'number', header: 'Recipient Number', render: (item) => <span className="font-semibold text-xs">{item.number}</span> },
    { key: 'from', header: 'Sender (Service)', render: (item) => <span className="text-xs">{item.from || '—'}</span> },
    { key: 'to', header: 'To (Recipient)', render: (item) => <span className="text-xs">{item.to || '—'}</span> },
    { key: 'service', header: 'Service', render: (item) => <ServiceBadge service={item.service} /> },
    { key: 'country', header: 'Country', render: (item) => <span className="text-xs">{item.country || '—'}</span> },
    {
      key: 'otp',
      header: 'OTP',
      render: (item) => (
        item.otp ? (
          <CopyButton text={item.otp} />
        ) : (
          <span className="text-[#6B7280] text-xs">—</span>
        )
      ),
    },
    {
      key: 'message',
      header: 'Message',
      className: 'max-w-[200px]',
      render: (item) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }}
          className="text-left text-xs text-[#6B7280] hover:text-[#735DFF] transition-colors cursor-pointer"
          title={item.message || ''}
        >
          {expandedMsg.has(item.id) ? (item.message || '—') : truncate(item.message, 30)}
        </button>
      ),
    },
    {
      key: 'rate',
      header: 'Rate',
      render: (item) => <span className="text-xs">${item.rate || 0}</span>,
    },
    {
      key: 'profit',
      header: 'Profit',
      render: (item) => (
        <span className={`text-xs font-semibold ${item.profit > 0 ? 'text-green-600' : 'text-[#6B7280]'}`}>
          ${item.profit || 0}
        </span>
      ),
    },
  ];

  const hasFilters = search || filterService || filterCountry || filterNumber || filterStartDate || filterEndDate || filterHasOtp;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[1.3rem] font-bold text-[#222F36]">SMS Reports</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">View and filter all received SMS</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-[#E2E6F1] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-[#735DFF]" />
          <span className="text-xs font-bold text-[#222F36] uppercase tracking-wider">Filters</span>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto text-xs text-[#735DFF] hover:text-[#6446FE] font-semibold transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Search SMS..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="flysms-input pl-9"
            />
          </div>
          <select
            value={filterService}
            onChange={(e) => { setFilterService(e.target.value); setPage(1); }}
            className="flysms-input"
          >
            <option value="">All Services</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="google">Google</option>
            <option value="telegram">Telegram</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="twitter">Twitter</option>
            <option value="tiktok">TikTok</option>
          </select>
          <input
            type="text"
            placeholder="Filter by country"
            value={filterCountry}
            onChange={(e) => { setFilterCountry(e.target.value); setPage(1); }}
            className="flysms-input"
          />
          <input
            type="text"
            placeholder="Filter by number"
            value={filterNumber}
            onChange={(e) => { setFilterNumber(e.target.value); setPage(1); }}
            className="flysms-input"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => { setFilterStartDate(e.target.value); setPage(1); }}
              className="flysms-input text-xs"
              title="From date"
            />
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => { setFilterEndDate(e.target.value); setPage(1); }}
              className="flysms-input text-xs"
              title="To date"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterHasOtp}
              onChange={(e) => { setFilterHasOtp(e.target.value); setPage(1); }}
              className="flysms-input flex-1"
            >
              <option value="">All (OTP)</option>
              <option value="true">Has OTP</option>
              <option value="false">No OTP</option>
            </select>
            <button
              onClick={fetchData}
              className="p-2 rounded hover:bg-[rgba(115,93,255,0.1)] text-[#735DFF] transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading && !data.length ? (
        <PageLoader />
      ) : (
        <>
          <Table columns={columns} data={data} loading={loading} emptyMessage="No SMS reports found" minWidth="1100px" />
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
