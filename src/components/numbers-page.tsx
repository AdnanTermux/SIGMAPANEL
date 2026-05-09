'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { apiCall, PaginatedResponse } from '@/lib/api';
import Table, { Column } from '@/components/ui-table';
import Pagination from '@/components/ui-pagination';
import Modal from '@/components/ui-modal';
import { useToast } from '@/components/toast-provider';
import { StatusBadge, ServiceBadge, PageLoader } from '@/lib/helpers';

interface NumberItem {
  id: string;
  number: string;
  country: string | null;
  countryName: string | null;
  service: string | null;
  rangeName: string | null;
  status: string;
  assignedTo: string | null;
  rate: number;
  profitMargin: number;
  lastSmsAt: string | null;
  range?: { name: string; status: string };
}

export default function NumbersPage() {
  const [data, setData] = useState<NumberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterService, setFilterService] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRange, setFilterRange] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<NumberItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { addToast } = useToast();

  // Form state
  const [formNumber, setFormNumber] = useState('');
  const [formCountry, setFormCountry] = useState('');
  const [formCountryName, setFormCountryName] = useState('');
  const [formService, setFormService] = useState('');
  const [formRange, setFormRange] = useState('');
  const [formRate, setFormRate] = useState('0');
  const [formProfitMargin, setFormProfitMargin] = useState('0');
  const [formStatus, setFormStatus] = useState('active');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (search) params.set('search', search);
      if (filterCountry) params.set('country', filterCountry);
      if (filterService) params.set('service', filterService);
      if (filterStatus) params.set('status', filterStatus);
      if (filterRange) params.set('rangeName', filterRange);

      const res = await apiCall<PaginatedResponse<NumberItem>>(`/api/numbers?${params.toString()}`);
      setData(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch {
      addToast('Failed to load numbers', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterCountry, filterService, filterStatus, filterRange, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditItem(null);
    setFormNumber('');
    setFormCountry('');
    setFormCountryName('');
    setFormService('');
    setFormRange('');
    setFormRate('0');
    setFormProfitMargin('0');
    setFormStatus('active');
    setModalOpen(true);
  };

  const openEdit = (item: NumberItem) => {
    setEditItem(item);
    setFormNumber(item.number);
    setFormCountry(item.country || '');
    setFormCountryName(item.countryName || '');
    setFormService(item.service || '');
    setFormRange(item.rangeName || '');
    setFormRate(String(item.rate || 0));
    setFormProfitMargin(String(item.profitMargin || 0));
    setFormStatus(item.status);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formNumber.trim()) {
      addToast('Number is required', 'error');
      return;
    }
    setSaving(true);
    try {
      const body = {
        number: formNumber.trim(),
        country: formCountry.trim(),
        countryName: formCountryName.trim(),
        service: formService.trim() || null,
        rangeName: formRange.trim() || null,
        rate: parseFloat(formRate) || 0,
        profitMargin: parseFloat(formProfitMargin) || 0,
        status: formStatus,
      };

      if (editItem) {
        await apiCall(`/api/numbers/${editItem.id}`, { method: 'PUT', body: JSON.stringify(body) });
        addToast('Number updated successfully', 'success');
      } else {
        await apiCall('/api/numbers', { method: 'POST', body: JSON.stringify(body) });
        addToast('Number created successfully', 'success');
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
    if (!confirm('Are you sure you want to delete this number?')) return;
    setDeletingId(id);
    try {
      await apiCall(`/api/numbers/${id}`, { method: 'DELETE' });
      addToast('Number deleted', 'success');
      fetchData();
    } catch (err: any) {
      addToast(err.message || 'Failed to delete', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const columns: Column<NumberItem>[] = [
    { key: 'number', header: 'Number', render: (item) => <span className="font-semibold">{item.number}</span> },
    {
      key: 'country',
      header: 'Country',
      render: (item) => (
        <span>{item.countryName || item.country || '—'}</span>
      ),
    },
    { key: 'service', header: 'Service', render: (item) => <ServiceBadge service={item.service} /> },
    {
      key: 'range',
      header: 'Range',
      render: (item) => <span className="text-xs">{item.rangeName || item.range?.name || '—'}</span>,
    },
    { key: 'status', header: 'Status', render: (item) => <StatusBadge status={item.status} /> },
    {
      key: 'assignedTo',
      header: 'Assigned To',
      render: (item) => <span className="text-xs">{item.assignedTo || '—'}</span>,
    },
    { key: 'rate', header: 'Rate', render: (item) => <span className="text-xs">${item.rate || 0}</span> },
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
          <h1 className="text-[1.3rem] font-bold text-[#222F36]">Numbers</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Manage your phone numbers</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#735DFF] text-white text-sm font-semibold rounded hover:bg-[#6446FE] transition-colors shadow-sm"
        >
          <Plus size={16} />
          Add Number
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-[#E2E6F1] p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Search numbers..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="flysms-input pl-9"
            />
          </div>
          <input
            type="text"
            placeholder="Filter by country"
            value={filterCountry}
            onChange={(e) => { setFilterCountry(e.target.value); setPage(1); }}
            className="flysms-input"
          />
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="flysms-input"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="maintenance">Maintenance</option>
          </select>
          <div className="flex gap-2">
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
          <Table columns={columns} data={data} loading={loading} emptyMessage="No numbers found" minWidth="900px" />
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? 'Edit Number' : 'Add Number'}
      >
        <div className="space-y-4">
          <div>
            <label className="flysms-label">Number *</label>
            <input
              type="text"
              value={formNumber}
              onChange={(e) => setFormNumber(e.target.value)}
              className="flysms-input"
              placeholder="+1234567890"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flysms-label">Country Code</label>
              <input
                type="text"
                value={formCountry}
                onChange={(e) => setFormCountry(e.target.value)}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flysms-label">Service</label>
              <input
                type="text"
                value={formService}
                onChange={(e) => setFormService(e.target.value)}
                className="flysms-input"
                placeholder="e.g. WhatsApp"
              />
            </div>
            <div>
              <label className="flysms-label">Range</label>
              <input
                type="text"
                value={formRange}
                onChange={(e) => setFormRange(e.target.value)}
                className="flysms-input"
                placeholder="Range name"
              />
            </div>
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
              {saving ? 'Saving...' : editItem ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
