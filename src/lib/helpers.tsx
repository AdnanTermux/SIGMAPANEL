'use client';

import { ReactNode } from 'react';

type StatusType = 'active' | 'inactive' | 'maintenance' | 'blocked';

const STATUS_STYLES: Record<StatusType, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-red-100 text-red-700',
  maintenance: 'bg-yellow-100 text-yellow-700',
  blocked: 'bg-red-100 text-red-800',
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status as StatusType] || 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${style}`}>
      {status || 'unknown'}
    </span>
  );
}

type ServiceType = 'whatsapp' | 'google' | 'telegram' | 'facebook' | 'instagram' | 'twitter' | 'tiktok';

const SERVICE_STYLES: Record<string, string> = {
  whatsapp: 'bg-green-100 text-green-700',
  google: 'bg-blue-100 text-blue-700',
  telegram: 'bg-sky-100 text-sky-700',
  facebook: 'bg-blue-100 text-blue-800',
  instagram: 'bg-pink-100 text-pink-700',
  twitter: 'bg-gray-100 text-gray-700',
  tiktok: 'bg-gray-100 text-gray-800',
};

export function ServiceBadge({ service }: { service: string | null }) {
  if (!service) return <span className="text-[#6B7280] text-xs">—</span>;
  const key = (service || '').toLowerCase();
  const style = SERVICE_STYLES[key] || 'bg-purple-100 text-purple-700';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${style}`}>
      {service}
    </span>
  );
}

export function CopyButton({ text }: { text: string | null }) {
  if (!text) return <span className="text-[#6B7280] text-xs">—</span>;

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    const el = document.activeElement as HTMLElement;
    const original = el.textContent || '';
    el.textContent = 'Copied!';
    el.classList.add('text-green-600');
    setTimeout(() => {
      el.textContent = original;
      el.classList.remove('text-green-600');
    }, 1200);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-[#735DFF] hover:text-[#6446FE] font-mono text-xs bg-[rgba(115,93,255,0.1)] px-2 py-0.5 rounded transition-colors cursor-pointer"
      title="Click to copy"
    >
      {text.length > 10 ? text.slice(0, 10) + '…' : text}
    </button>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700',
    reseller: 'bg-blue-100 text-blue-700',
    sub_reseller: 'bg-cyan-100 text-cyan-700',
    user: 'bg-gray-100 text-gray-700',
  };
  const style = styles[role] || 'bg-gray-100 text-gray-700';
  const label = role === 'sub_reseller' ? 'Sub Reseller' : role?.charAt(0).toUpperCase() + role?.slice(1);
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${style}`}>
      {label}
    </span>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-[rgba(115,93,255,0.2)] border-t-[#735DFF] rounded-full animate-spin" />
        <span className="text-[#6B7280] text-sm font-medium">Loading...</span>
      </div>
    </div>
  );
}

export function formatDate(date: string | Date | null) {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function truncate(str: string | null, maxLen: number = 40) {
  if (!str) return '—';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '…';
}

export type { StatusType, ServiceType };
