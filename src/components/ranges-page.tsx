'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit2, Trash2, RefreshCw, Layers } from 'lucide-react';
import { apiCall, PaginatedResponse } from '@/lib/api';
import Table, { Column } from '@/components/ui-table';
import Pagination from '@/components/ui-pagination';
import Modal from '@/components/ui-modal';
import { useToast } from '@/components/toast-provider';
import { StatusBadge, PageLoader } from '@/lib/helpers';

interface RangeItem {
  id: string;
  name: string;
  providerId: string | null;
  countryCode: string | null;
  countryName: string | null;
  rate: number;
  profitMargin: number;
  otpLimitPerDay: number;
  otpDailyResetHour: number;
  allocationLimitGlobal: number;
  allocationLimitPerUser: number;
  allocationPeriod: string;
  status: string;
  createdAt: string;
  _count: { numbers: number };
}

export default function RangesPage() {
  const [data, setData] = useState<RangeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<RangeItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { addToast } = useToast();

  // Form fields
  const [formName, setFormName] = useState('');
  const [formProviderId, setFormProviderId] = useState('');
  const [formCountryCode, setFormCountryCode] = useState('');
  const [formCountryName, setFormCountryName] = useState('');
  const [formRate, setFormRate] = useState('0');
  const [formProfitMargin, setFormProfitMargin] = useState('0');
  const [formOtpLimit, setFormOtpLimit] = useState('0');
  const [formOtpResetHour, setFormOtpResetHour] = useState('0');
  const [formAllocGlobal, setFormAllocGlobal] = useState('10000');
  const [formAllocPerUser, setFormAllocPerUser] = useState('100');
  const [formAllocPeriod, setFormAllocPeriod] = useState('daily');
  const [formStatus, setFormStatus] = useState('active');

  const resetForm = () => {
    setFormName('');
    setFormProviderId('');
    setFormCountryCode('');
    setFormCountryName('');
    setFormRate('0');
    setFormProfitMargin('0');
    setFormOtpLimit('0');
    setFormOtpResetHour('0');
    setFormAllocGlobal('10000');
    setFormAllocPerUser('100');
    setFormAllocPeriod('daily');
    setFormStatus('active');
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (search) params.set('search', search);
      if (filterCountry) params.set('country', filterCountry);
      if (filterStatus) params.set('status', filterStatus);

      const res = await apiCall<PaginatedResponse<RangeItem>>(`/api/ranges?${params.toString()}`);
      setData(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch {
      addToast('Failed to load ranges', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterCountry, filterStatus, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditItem(null);
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (item: RangeItem) => {
    setEditItem(item);
    setFormName(item.name);
    setFormProviderId(item.providerId || '');
    setFormCountryCode(item.countryCode || '');
    setFormCountryName(item.countryName || '');
    setFormRate(String(item.rate || 0));
    setFormProfitMargin(String(item.profitMargin || 0));
    setFormOtpLimit(String(item.otpLimitPerDay || 0));
    setFormOtpResetHour(String(item.otpDailyResetHour || 0));
    setFormAllocGlobal(String(item.allocationLimitGlobal || 10000));
    setFormAllocPerUser(String(item.allocationLimitPerUser || 100));
    setFormAllocPeriod(item.allocationPeriod || 'daily');
    setFormStatus(item.status);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      addToast('Range name is required', 'error');
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: formName.trim(),
        providerId: formProviderId.trim() || null,
        countryCode: formCountryCode.trim() || null,
        countryName: formCountryName.trim() || null,
        rate: parseFloat(formRate) || 0,
        profitMargin: parseFloat(formProfitMargin) || 0,
        otpLimitPerDay: parseInt(formOtpLimit) || 0,
        otpDailyResetHour: parseInt(formOtpResetHour) || 0,
        allocationLimitGlobal: parseInt(formAllocGlobal) || 10000,
        allocationLimitPerUser: parseInt(formAllocPerUser) || 100,
        allocationPeriod: formAllocPeriod,
        status: formStatus,
      };

      if (editItem) {
        await apiCall(`/api/ranges/${editItem.id}`, { method: 'PUT', body: JSON.stringify(body) });
        addToast('Range updated successfully', 'success');
      } else {
        await apiCall('/api/ranges', { method: 'POST', body: JSON.stringify(body) });
        addToast('Range created successfully', 'success');
      }
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      addToast(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this range?')) return;
    setDeletingId(id);
    try {
      await apiCall(`/api/ranges/${id}`, { method: 'DELETE' });
      addToast('Range deleted', 'success');
      fetchData();
    } catch (err: any) {
      addToast(err.message || 'Failed to delete', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const columns: Column<RangeItem>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (item) => (
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-[#735DFF]" />
          <span className="font-semibold">{item.name}</span>
        </div>
      ),
    },
    {
      key: 'country',
      header: 'Country',
      render: (item) => (
        <span>{item.countryName || item.countryCode || '—'}</span>
      ),
    },
    {
      key: 'rate',
      header: 'Rate',
      render: (item) => <span className="text-xs">${item.rate || 0}</span>,
    },
    {
      key: 'profitMargin',
      header: 'Margin',
      render: (item) => <span className="text-xs">{item.profitMargin || 0}%</span>,
    },
    {
      key: 'otpLimit',
      header: 'OTP Limit/Day',
      render: (item) => <span className="text-xs">{item.otpLimitPerDay || 0}</span>,
    },
    {
      key: 'allocGlobal',
      header: 'Alloc. Limit',
      render: (item) => <span className="text-xs">{item.allocationLimitGlobal || 0}</span>,
    },
    { key: 'status', header: 'Status', render: (item) => <StatusBadge status={item.status} /> },
    {
      key: 'numbers',
      header: 'Total Numbers',
      render: (item) => (
        <span className="inline-flex items-center px-2 py-0.5 bg-[rgba(115,93,255,0.1)] text-[#735DFF] text-xs font-semibold rounded-full">
          {item._count?.numbers || 0}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(item); }}
            className="p-1.5 rounded hover:bg-[rgba(115,93,255,0.1)] text-[#735DFF] transition-colors"
            title="Edit"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
            disabled={deletingId === item.id}
            className="p-1.5 rounded hover:bg-red-50 text-red-500 transition-colors disabled:opacity-40"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[1.3rem] font-bold text-[#222F36]">Ranges</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Manage number ranges and allocation limits</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#735DFF] text-white text-sm font-semibold rounded hover:bg-[#6446FE] transition-colors shadow-sm"
        >
          <Plus size={16} />
          Add Range
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-[#E2E6F1] p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Search by name or country..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="flysms-input pl-9"
            />
          </div>
          <input
            type="text"
            placeholder="Filter by country code"
            value={filterCountry}
            onChange={(e) => { setFilterCountry(e.target.value); setPage(1); }}
            className="flysms-input"
          />
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="flysms-input flex-1"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
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
          <Table columns={columns} data={data} loading={loading} emptyMessage="No ranges found" minWidth="1000px" />
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? 'Edit Range' : 'Add Range'}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <div>
            <label className="flysms-label">Range Name *</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="flysms-input"
              placeholder="e.g. US-Mobile-AT&T"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flysms-label">Country Code</label>
              <input
                type="text"
                value={formCountryCode}
                onChange={(e) => setFormCountryCode(e.target.value)}
                className="flysms-input"
                placeholder="US"
              />
            </div>
            <div>
              <label className="flysms-label">Country Name</label>
              <input
                type="text"
                value={formCountryName}
                onChange={(e) => setFormCountryName(e.target.value)}
                className="flysms-input"
                placeholder="United States"
              />
            </div>
          </div>

          <div>
            <label className="flysms-label">Provider ID</label>
            <input
              type="text"
              value={formProviderId}
              onChange={(e) => setFormProviderId(e.target.value)}
              className="flysms-input"
              placeholder="Provider identifier"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flysms-label">Rate ($)</label>
              <input
                type="number"
                step="0.01"
                value={formRate}
                onChange={(e) => setFormRate(e.target.value)}
                className="flysms-input"
              />
            </div>
            <div>
              <label className="flysms-label">Profit Margin (%)</label>
              <input
                type="number"
                step="0.01"
                value={formProfitMargin}
                onChange={(e) => setFormProfitMargin(e.target.value)}
                className="flysms-input"
              />
            </div>
          </div>

          {/* OTP Limits */}
          <div className="border-t border-[#E2E6F1] pt-4">
            <h3 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-3">OTP Limits</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flysms-label">OTP Limit Per Day</label>
                <input
                  type="number"
                  value={formOtpLimit}
                  onChange={(e) => setFormOtpLimit(e.target.value)}
                  className="flysms-input"
                />
              </div>
              <div>
                <label className="flysms-label">Daily Reset Hour (0-23)</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={formOtpResetHour}
                  onChange={(e) => setFormOtpResetHour(e.target.value)}
                  className="flysms-input"
                />
              </div>
            </div>
          </div>

          {/* Allocation Limits */}
          <div className="border-t border-[#E2E6F1] pt-4">
            <h3 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-3">Allocation Limits</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flysms-label">Global Allocation Limit</label>
                <input
                  type="number"
                  value={formAllocGlobal}
                  onChange={(e) => setFormAllocGlobal(e.target.value)}
                  className="flysms-input"
                />
              </div>
              <div>
                <label className="flysms-label">Per User Allocation Limit</label>
                <input
                  type="number"
                  value={formAllocPerUser}
                  onChange={(e) => setFormAllocPerUser(e.target.value)}
                  className="flysms-input"
                />
              </div>
              <div>
                <label className="flysms-label">Allocation Period</label>
                <select
                  value={formAllocPeriod}
                  onChange={(e) => setFormAllocPeriod(e.target.value)}
                  className="flysms-input"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="flysms-label">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="flysms-input"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-[#6B7280] border border-[#E2E6F1] rounded hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#735DFF] rounded hover:bg-[#6446FE] transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving...' : editItem ? 'Update Range' : 'Create Range'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
