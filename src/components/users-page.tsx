'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit2, Trash2, RefreshCw, ShieldOff, ShieldCheck, Users } from 'lucide-react';
import { apiCall, PaginatedResponse } from '@/lib/api';
import Table, { Column } from '@/components/ui-table';
import Pagination from '@/components/ui-pagination';
import Modal from '@/components/ui-modal';
import { useToast } from '@/components/toast-provider';
import { StatusBadge, RoleBadge, PageLoader, formatDate } from '@/lib/helpers';

interface UserItem {
  id: string;
  username: string;
  email: string | null;
  role: string;
  status: string;
  fullName: string | null;
  balance: number;
  creditLimit: number;
  phone: string | null;
  country: string | null;
  parentId: string | null;
  lastLogin: string | null;
  createdAt: string;
  _count?: { children: number };
}

export default function UsersPage() {
  const [data, setData] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<UserItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { addToast } = useToast();

  // Form fields
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formRole, setFormRole] = useState('sub_reseller');
  const [formPhone, setFormPhone] = useState('');
  const [formCountry, setFormCountry] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (search) params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
      if (filterRole) params.set('role', filterRole);

      const res = await apiCall<PaginatedResponse<UserItem>>(`/api/users?${params.toString()}`);
      setData(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch {
      addToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus, filterRole, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditItem(null);
    setFormUsername('');
    setFormEmail('');
    setFormPassword('');
    setFormFullName('');
    setFormRole('sub_reseller');
    setFormPhone('');
    setFormCountry('');
    setModalOpen(true);
  };

  const openEdit = (item: UserItem) => {
    setEditItem(item);
    setFormUsername(item.username);
    setFormEmail(item.email || '');
    setFormPassword('');
    setFormFullName(item.fullName || '');
    setFormRole(item.role);
    setFormPhone(item.phone || '');
    setFormCountry(item.country || '');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editItem && !formUsername.trim()) {
      addToast('Username is required', 'error');
      return;
    }
    if (!editItem && !formPassword.trim()) {
      addToast('Password is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, string> = {
        username: formUsername.trim(),
        email: formEmail.trim() || null,
        fullName: formFullName.trim() || null,
        role: formRole,
        phone: formPhone.trim() || null,
        country: formCountry.trim() || null,
      };

      if (formPassword.trim()) {
        body.password = formPassword;
      }

      if (editItem) {
        await apiCall(`/api/users/${editItem.id}`, { method: 'PUT', body: JSON.stringify(body) });
        addToast('User updated successfully', 'success');
      } else {
        await apiCall('/api/users', { method: 'POST', body: JSON.stringify(body) });
        addToast('User created successfully', 'success');
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
    if (!confirm('Are you sure you want to delete this user?')) return;
    setDeletingId(id);
    try {
      await apiCall(`/api/users/${id}`, { method: 'DELETE' });
      addToast('User deleted', 'success');
      fetchData();
    } catch (err: any) {
      addToast(err.message || 'Failed to delete', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleBlock = async (item: UserItem) => {
    const newStatus = item.status === 'blocked' ? 'active' : 'blocked';
    setTogglingId(item.id);
    try {
      await apiCall(`/api/users/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      addToast(`User ${newStatus === 'blocked' ? 'blocked' : 'unblocked'}`, 'success');
      fetchData();
    } catch (err: any) {
      addToast(err.message || 'Failed to update status', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const columns: Column<UserItem>[] = [
    {
      key: 'username',
      header: 'Username',
      render: (item) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[rgba(115,93,255,0.12)] flex items-center justify-center text-[#735DFF] text-xs font-bold">
            {item.username.charAt(0).toUpperCase()}
          </div>
          <span className="font-semibold">{item.username}</span>
        </div>
      ),
    },
    { key: 'email', header: 'Email', render: (item) => <span className="text-xs">{item.email || '—'}</span> },
    { key: 'role', header: 'Role', render: (item) => <RoleBadge role={item.role} /> },
    { key: 'status', header: 'Status', render: (item) => <StatusBadge status={item.status} /> },
    { key: 'fullName', header: 'Full Name', render: (item) => <span className="text-xs">{item.fullName || '—'}</span> },
    {
      key: 'balance',
      header: 'Balance',
      render: (item) => <span className="text-xs font-semibold">${item.balance || 0}</span>,
    },
    {
      key: 'lastLogin',
      header: 'Last Login',
      render: (item) => <span className="text-xs text-[#6B7280]">{formatDate(item.lastLogin)}</span>,
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
            onClick={(e) => { e.stopPropagation(); handleToggleBlock(item); }}
            disabled={togglingId === item.id}
            className="p-1.5 rounded hover:bg-yellow-50 text-yellow-600 transition-colors disabled:opacity-40"
            title={item.status === 'blocked' ? 'Unblock' : 'Block'}
          >
            {item.status === 'blocked' ? <ShieldCheck size={14} /> : <ShieldOff size={14} />}
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
          <h1 className="text-[1.3rem] font-bold text-[#222F36]">Users</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Manage system users and permissions</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#735DFF] text-white text-sm font-semibold rounded hover:bg-[#6446FE] transition-colors shadow-sm"
        >
          <Plus size={16} />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-[#E2E6F1] p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="flysms-input pl-9"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
            className="flysms-input"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="reseller">Reseller</option>
            <option value="sub_reseller">Sub Reseller</option>
            <option value="user">User</option>
          </select>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="flysms-input flex-1"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
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
          <Table columns={columns} data={data} loading={loading} emptyMessage="No users found" minWidth="950px" />
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? 'Edit User' : 'Add User'}
      >
        <div className="space-y-4">
          <div>
            <label className="flysms-label">Username *</label>
            <input
              type="text"
              value={formUsername}
              onChange={(e) => setFormUsername(e.target.value)}
              className="flysms-input"
              placeholder="Enter username"
              disabled={!!editItem}
            />
          </div>
          <div>
            <label className="flysms-label">Email</label>
            <input
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              className="flysms-input"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="flysms-label">{editItem ? 'New Password (leave blank to keep current)' : 'Password *'}</label>
            <input
              type="password"
              value={formPassword}
              onChange={(e) => setFormPassword(e.target.value)}
              className="flysms-input"
              placeholder={editItem ? 'Leave blank to keep current' : 'Enter password'}
            />
          </div>
          <div>
            <label className="flysms-label">Full Name</label>
            <input
              type="text"
              value={formFullName}
              onChange={(e) => setFormFullName(e.target.value)}
              className="flysms-input"
              placeholder="John Doe"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flysms-label">Role</label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
                className="flysms-input"
              >
                <option value="admin">Admin</option>
                <option value="reseller">Reseller</option>
                <option value="sub_reseller">Sub Reseller</option>
                <option value="user">User</option>
              </select>
            </div>
            <div>
              <label className="flysms-label">Phone</label>
              <input
                type="text"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                className="flysms-input"
                placeholder="+1234567890"
              />
            </div>
          </div>
          <div>
            <label className="flysms-label">Country</label>
            <input
              type="text"
              value={formCountry}
              onChange={(e) => setFormCountry(e.target.value)}
              className="flysms-input"
              placeholder="US"
            />
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
              {saving ? 'Saving...' : editItem ? 'Update User' : 'Create User'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
