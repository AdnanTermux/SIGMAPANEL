'use client';

import { useState, useEffect, useCallback } from 'react';
import { Settings, Save, Globe, Link2, ExternalLink } from 'lucide-react';
import { apiCall } from '@/lib/api';
import { useToast } from '@/components/toast-provider';
import { PageLoader } from '@/lib/helpers';

interface SettingItem {
  id: string;
  settingKey: string;
  settingValue: string;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  // Local form values
  const [siteName, setSiteName] = useState('SIGMAPANEL');
  const [logoUrl, setLogoUrl] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall<{ data: SettingItem[] }>('/api/settings');
      const items = res.data || [];
      setSettings(items);

      // Populate form values
      const get = (key: string) => items.find((s) => s.settingKey === key)?.settingValue || '';
      setSiteName(get('site_name') || 'SIGMAPANEL');
      setLogoUrl(get('logo_url') || '');
      setWebhookUrl(get('webhook_url') || '');
    } catch {
      addToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const pairs = [
        { key: 'site_name', value: siteName },
        { key: 'logo_url', value: logoUrl },
        { key: 'webhook_url', value: webhookUrl },
      ];

      await Promise.all(
        pairs.map(({ key, value }) =>
          apiCall('/api/settings', {
            method: 'POST',
            body: JSON.stringify({ key, value }),
          })
        )
      );

      addToast('Settings saved successfully', 'success');
      fetchSettings();
    } catch (err: any) {
      addToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  const fullWebhookUrl = webhookUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhook/sms`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[1.3rem] font-bold text-[#222F36]">Settings</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Configure system preferences</p>
        </div>
      </div>

      {/* Webhook URL Card */}
      <div className="bg-white rounded-lg border border-[#E2E6F1] p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Link2 size={18} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#222F36]">Webhook Endpoint</h2>
            <p className="text-xs text-[#6B7280]">Use this URL to receive incoming SMS</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-50 border border-[#E2E6F1] rounded px-4 py-3 text-xs font-mono text-[#222F36] break-all">
            {fullWebhookUrl}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(fullWebhookUrl);
              addToast('Webhook URL copied!', 'success');
            }}
            className="flex items-center gap-2 px-4 py-3 text-xs font-semibold text-white bg-emerald-600 rounded hover:bg-emerald-700 transition-colors whitespace-nowrap"
          >
            <ExternalLink size={14} />
            Copy
          </button>
        </div>
      </div>

      {/* General Settings Card */}
      <div className="bg-white rounded-lg border border-[#E2E6F1] p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-lg bg-[rgba(115,93,255,0.12)] flex items-center justify-center">
            <Settings size={18} className="text-[#735DFF]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#222F36]">General Settings</h2>
            <p className="text-xs text-[#6B7280]">Configure basic system settings</p>
          </div>
        </div>

        <div className="space-y-5 max-w-lg">
          <div>
            <label className="flysms-label">Site Name</label>
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="flysms-input"
              placeholder="SIGMAPANEL"
            />
          </div>

          <div>
            <label className="flysms-label">Logo URL</label>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="flysms-input"
              placeholder="https://example.com/logo.png"
            />
          </div>

          <div>
            <label className="flysms-label">Custom Webhook URL</label>
            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="flysms-input"
              placeholder="Leave blank for default endpoint"
            />
            <p className="text-[10px] text-[#6B7280] mt-1">Leave empty to use the default webhook URL</p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[#E2E6F1]">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#735DFF] text-white text-sm font-semibold rounded hover:bg-[#6446FE] transition-colors disabled:opacity-60 shadow-sm"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
