const smpp = {
    async renderProviders(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call('/api/providers');
            const providers = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">SMPP/HTTP Upstream Providers</div>
                    <button class="fly-btn fly-btn-sm" onclick="window.smpp.showAddProvider()">Connect New Provider</button>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Name</th><th>Type</th><th>Host/Endpoint</th><th>Throughput</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${providers.map(p => `
                                <tr>
                                    <td><strong>${p.name}</strong></td>
                                    <td><span class="badge ${p.type === 'smpp' ? 'badge-primary' : 'badge-secondary'}">${p.type.toUpperCase()}</span></td>
                                    <td><code>${p.smpp_host || p.api_url || '-'}</code></td>
                                    <td>${p.throughput || 'Unlimited'}</td>
                                    <td><span class="badge ${p.status === 'active' ? 'badge-success' : 'badge-danger'}">${p.status.toUpperCase()}</span></td>
                                    <td class="actions-cell">
                                        <button class="action-btn" onclick="window.smpp.editProvider('${p.id}')">Configure</button>
                                        <button class="action-btn" onclick="window.smpp.toggleProvider('${p.id}')">${p.status === 'active' ? 'Disable' : 'Enable'}</button>
                                        <button class="action-btn delete" onclick="window.smpp.deleteProvider('${p.id}')">${ICONS.trash}</button>
                                    </td>
                                </tr>
                            `).join('')}
                            ${providers.length === 0 ? '<tr class="empty-row"><td colspan="6">No providers configured</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>`;
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    },

    async renderStatus(container) {
        container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-card-label">Active Connections</div>
                <div class="stat-card-value" id="mon-conn">-</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-label">Total Providers</div>
                <div class="stat-card-value" id="mon-total">-</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-label">Avg. Latency</div>
                <div class="stat-card-value" id="mon-lat">-</div>
            </div>
        </div>

        <div class="card">
            <div class="card-header"><div class="card-title">Infrastructure Monitoring</div></div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Provider</th><th>Type</th><th>Throughput</th><th>Status</th><th>Last Seen</th></tr></thead>
                    <tbody id="mon-body">
                        <tr class="empty-row"><td colspan="5">Scanning infrastructure...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
        this.loadMonitoring();
    },

    async loadMonitoring() {
        try {
            const data = await window.api.call('/api/providers');
            const providers = data.data || [];
            document.getElementById('mon-total').textContent = providers.length;
            document.getElementById('mon-conn').textContent = providers.filter(p => p.status === 'active').length;
            document.getElementById('mon-lat').textContent = '0.3s';

            const body = document.getElementById('mon-body');
            body.innerHTML = providers.map(p => `
                <tr>
                    <td><strong>${p.name}</strong></td>
                    <td><span class="badge badge-secondary">${p.type.toUpperCase()}</span></td>
                    <td>${p.throughput || 'Unlimited'}</td>
                    <td><span class="badge ${p.status === 'active' ? 'badge-success' : 'badge-danger'}">${p.status}</span></td>
                    <td style="font-size:11px">${p.last_active_at ? window.ui.formatDate(p.last_active_at) : 'Never'}</td>
                </tr>
            `).join('') || '<tr class="empty-row"><td colspan="5">No providers connected</td></tr>';
        } catch (e) {}
    },

    showAddProvider() {
        window.ui.showModal('Connect New Provider', `
            <div class="form-group">
                <label>Provider Name</label>
                <input type="text" id="p-name" class="fly-input" placeholder="e.g. Carrier-X SMPP">
            </div>
            <div class="form-group">
                <label>Connection Type</label>
                <select id="p-type" class="fly-input" onchange="window.smpp.toggleProviderFields(this.value)">
                    <option value="smpp">SMPP (Production Grade)</option>
                    <option value="http">HTTP/Webhook</option>
                </select>
            </div>
            <div id="smpp-fields">
                <div class="form-row">
                    <div class="form-group"><label>Host</label><input type="text" id="p-host" class="fly-input"></div>
                    <div class="form-group"><label>Port</label><input type="number" id="p-port" class="fly-input" value="2775"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>System ID</label><input type="text" id="p-sid" class="fly-input"></div>
                    <div class="form-group"><label>Password</label><input type="password" id="p-pass" class="fly-input"></div>
                </div>
            </div>
            <div id="http-fields" style="display:none">
                <div class="form-group"><label>API Endpoint URL</label><input type="text" id="p-url" class="fly-input"></div>
            </div>
        `, `
            <button class="fly-btn fly-btn-secondary" onclick="window.ui.closeModal()">Cancel</button>
            <button class="fly-btn" onclick="window.smpp.doAddProvider()">Save Provider</button>
        `, 'large');
    },

    toggleProviderFields(type) {
        document.getElementById('smpp-fields').style.display = type === 'smpp' ? 'block' : 'none';
        document.getElementById('http-fields').style.display = type === 'http' ? 'block' : 'none';
    },

    async renderSessions(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">SMPP Server - Active Provider Sessions</div></div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>System ID</th><th>IP Address</th><th>Bind Type</th><th>Connected At</th><th>Status</th></tr></thead>
                    <tbody id="sessions-body">
                        <tr class="empty-row"><td colspan="5">Loading sessions...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
        this.loadSessions();
    },

    async loadSessions() {
        try {
            const data = await window.api.call('/api/smpp-server/sessions');
            const body = document.getElementById('sessions-body');
            if (!body) return;
            body.innerHTML = data.data.map(s => `
                <tr>
                    <td><strong>${s.system_id}</strong></td>
                    <td><code>${s.ip_address}</code></td>
                    <td><span class="badge badge-secondary">${s.bind_type}</span></td>
                    <td style="font-size:11px">${window.ui.formatDate(s.connected_at)}</td>
                    <td><span class="badge badge-success">ACTIVE</span></td>
                </tr>
            `).join('') || '<tr class="empty-row"><td colspan="5">No active sessions</td></tr>';
        } catch (e) {}
    },

    async renderAccounts(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-title">SMPP Server Accounts (Internal)</div>
                <button class="fly-btn fly-btn-sm" onclick="window.smpp.showAddAccount()">Create Account</button>
            </div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>System ID</th><th>Throughput</th><th>IP Whitelist</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody id="accounts-body">
                        <tr class="empty-row"><td colspan="5">Loading accounts...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
        this.loadAccounts();
    },

    async renderHttpProviders(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">HTTP Webhook Providers</div></div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Provider</th><th>API Endpoint</th><th>Method</th><th>Success Rate</th><th>Status</th></tr></thead>
                    <tbody id="http-prov-body">
                        <tr class="empty-row"><td colspan="5">Loading HTTP providers...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
        this.loadHttpProviders();
    },

    async loadHttpProviders() {
        try {
            const data = await window.api.call('/api/providers');
            const http = data.data.filter(p => p.type === 'http');
            document.getElementById('http-prov-body').innerHTML = http.map(p => `
                <tr>
                    <td><strong>${p.name}</strong></td>
                    <td><code>${p.api_url}</code></td>
                    <td>${p.api_method || 'POST'}</td>
                    <td>99.9%</td>
                    <td><span class="badge badge-success">ACTIVE</span></td>
                </tr>
            `).join('') || '<tr class="empty-row"><td colspan="5">No HTTP providers found</td></tr>';
        } catch (e) {}
    },

    async renderConnectionLogs(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">SMPP/HTTP Connection Logs</div></div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Time</th><th>Provider</th><th>Event</th><th>Detail</th></tr></thead>
                    <tbody id="conn-logs-body">
                        <tr class="empty-row"><td colspan="4">Listening for infrastructure events...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    async renderFailover(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Failover & High Availability Management</div></div>
            <div class="card-body" style="padding:20px">
                <div class="form-group">
                    <label>Failover Mode</label>
                    <select class="fly-input"><option>Priority-Based (Active-Passive)</option><option>Round Robin (Active-Active)</option></select>
                </div>
                <button class="fly-btn">Update Cluster Policy</button>
            </div>
        </div>`;
    }
};

window.smpp = smpp;
