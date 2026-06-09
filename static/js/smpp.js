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
                <div style="background:var(--bg-page); padding:16px; border-radius:8px; margin-top:16px">
                    <h5 style="margin-bottom:12px">HTTP Bind Details (Field Mapping)</h5>
                    <div class="form-row">
                        <div class="form-group"><label>Number/Destination Field</label><input type="text" id="p-field-to" class="fly-input" value="to"></div>
                        <div class="form-group"><label>CLI/From Field</label><input type="text" id="p-field-from" class="fly-input" value="from"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Message Field</label><input type="text" id="p-field-msg" class="fly-input" value="msg"></div>
                        <div class="form-group"><label>Unique ID Field</label><input type="text" id="p-field-uuid" class="fly-input" value="uuid"></div>
                    </div>
                </div>
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

    async doAddProvider() {
        const type = document.getElementById('p-type').value;
        const payload = {
            name: document.getElementById('p-name').value,
            type: type,
            status: 'active',
            apiUrl: document.getElementById('p-url')?.value,
            fieldTo: document.getElementById('p-field-to')?.value,
            fieldFrom: document.getElementById('p-field-from')?.value,
            fieldMsg: document.getElementById('p-field-msg')?.value,
            fieldUuid: document.getElementById('p-field-uuid')?.value,
            smppHost: document.getElementById('p-host')?.value,
            smppPort: parseInt(document.getElementById('p-port')?.value || 2775),
            smppSystemId: document.getElementById('p-sid')?.value,
            smppPassword: document.getElementById('p-pass')?.value
        };

        try {
            await window.api.call('/api/providers', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            window.ui.showToast('Provider added successfully', 'success');
            window.ui.closeModal();
            window.router.resolvePage(document.getElementById('page-content'));
        } catch (err) { window.ui.showToast(err.message, 'error'); }
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
            const data = await window.api.call('/api/smpp-interconnect/server-sessions');
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
        this.renderServerAccounts(container);
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
        this.loadServerFailed();
    },

    async loadServerFailed() {
        try {
            const data = await window.api.call('/api/smpp-interconnect/failed-packets');
            const body = document.getElementById('srv-failed-body');
            if (!body) return;
            body.innerHTML = data.data.map(p => `
                <tr>
                    <td style="font-size:11px">${window.ui.formatDate(p.created_at)}</td>
                    <td><code>${p.ip_address}</code></td>
                    <td><span class="badge badge-danger">${p.packet_type}</span></td>
                    <td>${p.reason}</td>
                </tr>
            `).join('') || '<tr class="empty-row"><td colspan="4">No failed packets captured</td></tr>';
        } catch (e) {}
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
    },

    async renderServerConnected(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">SMPP Server: Connected External Providers</div></div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Provider Host/IP</th><th>Connected At</th><th>Status</th></tr></thead>
                    <tbody id="srv-connected-body">
                        <tr class="empty-row"><td colspan="3">Awaiting connections...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
        this.loadServerDlr();
    },

    async loadServerDlr() {
        try {
            const data = await window.api.call('/api/smpp-interconnect/dlr-logs');
            const body = document.getElementById('srv-dlr-body');
            if (!body) return;
            body.innerHTML = data.data.map(d => `
                <tr>
                    <td style="font-size:11px">${window.ui.formatDate(d.received_at)}</td>
                    <td><code>${d.id.slice(0,8)}</code></td>
                    <td>${d.number}</td>
                    <td><span class="badge badge-success">DELIVERED</span></td>
                    <td>${d.system_id || 'System'}</td>
                </tr>
            `).join('') || '<tr class="empty-row"><td colspan="5">No DLR traffic logged</td></tr>';
        } catch (e) {}
    },

    async renderServerSessions(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">SMPP Server: Live Sessions</div></div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Session ID</th><th>Account</th><th>IP Address</th><th>Bind Type</th><th>Connected</th></tr></thead>
                    <tbody id="srv-sessions-body">
                        <tr class="empty-row"><td colspan="5">No active sessions found</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
        this.loadServerSessions();
    },

    async loadServerSessions() {
        try {
            const data = await window.api.call('/api/smpp-interconnect/server-sessions');
            const body = document.getElementById('srv-sessions-body');
            if (!body) return;
            body.innerHTML = data.data.map(s => `
                <tr>
                    <td><code>${s.id.slice(0,8)}</code></td>
                    <td><strong>${s.system_id}</strong></td>
                    <td><code>${s.ip_address}</code></td>
                    <td><span class="badge badge-secondary">${s.bind_type}</span></td>
                    <td style="font-size:11px">${window.ui.formatDate(s.connected_at)}</td>
                </tr>
            `).join('') || '<tr class="empty-row"><td colspan="5">No active sessions found</td></tr>';
        } catch (e) {}
    },

    async renderServerAccounts(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call('/api/smpp-interconnect/accounts');
            const accounts = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">SMPP Server Provider Accounts</div>
                    <button class="fly-btn fly-btn-sm" onclick="window.smpp.showAddServerAccount()">Add Provider Account</button>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>System ID</th><th>Throughput</th><th>IP Whitelist</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${accounts.map(a => `
                                <tr>
                                    <td><strong>${a.system_id}</strong></td>
                                    <td>${a.throughput_limit} SMS/s</td>
                                    <td><code>${a.ip_whitelist || 'Any'}</code></td>
                                    <td><span class="badge ${a.status === 'active' ? 'badge-success' : 'badge-danger'}">${a.status.toUpperCase()}</span></td>
                                    <td>
                                        <button class="action-btn" onclick="window.smpp.deleteServerAccount('${a.id}')">${ICONS.trash}</button>
                                    </td>
                                </tr>
                            `).join('')}
                            ${accounts.length === 0 ? '<tr class="empty-row"><td colspan="5">No server accounts configured</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>`;
        } catch (e) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${e.message}</p></div>`;
        }
    },

    async renderServerThroughput(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Real-Time SMPP Server Throughput</div></div>
            <div style="padding:20px; height:350px">
                <canvas id="srv-throughput-chart"></canvas>
            </div>
        </div>`;
        this.renderThroughputChart();
    },

    renderThroughputChart() {
        setTimeout(() => {
            const ctx = document.getElementById('srv-throughput-chart')?.getContext('2d');
            if (!ctx) return;
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['-60s', '-50s', '-40s', '-30s', '-20s', '-10s', 'Now'],
                    datasets: [{
                        label: 'SMS/sec',
                        data: [0, 0, 0, 0, 0, 0, 0],
                        borderColor: '#735DFF',
                        backgroundColor: 'rgba(115, 93, 255, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true, max: 100 } }
                }
            });
        }, 100);
    },

    async renderServerLogs(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">SMPP Server: Global Connection Logs</div></div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Time</th><th>Provider</th><th>Event</th><th>Detail</th></tr></thead>
                    <tbody id="srv-logs-body">
                        <tr class="empty-row"><td colspan="4">No logs available</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
        this.loadServerLogs();
    },

    async loadServerLogs() {
        try {
            const data = await window.api.call('/api/smpp-interconnect/server-logs');
            const body = document.getElementById('srv-logs-body');
            if (!body) return;
            body.innerHTML = data.data.map(l => `
                <tr>
                    <td style="font-size:11px">${window.ui.formatDate(l.created_at)}</td>
                    <td>${l.server_name || 'Unknown'}</td>
                    <td><span class="badge badge-secondary">${l.event_type}</span></td>
                    <td style="font-size:12px">${l.detail}</td>
                </tr>
            `).join('') || '<tr class="empty-row"><td colspan="4">No logs available</td></tr>';
        } catch (e) {}
    },

    async renderServerFailed(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">SMPP Server: Failed Packet Captures</div></div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Time</th><th>Remote IP</th><th>Packet Type</th><th>Reason</th></tr></thead>
                    <tbody id="srv-failed-body">
                        <tr class="empty-row"><td colspan="4">No failed packets captured</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    async renderServerDlr(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">SMPP Server: Delivery Report Logs</div></div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Time</th><th>Message ID</th><th>Recipient</th><th>Status</th><th>Provider</th></tr></thead>
                    <tbody id="srv-dlr-body">
                        <tr class="empty-row"><td colspan="5">No DLR traffic logged</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    async renderServerQueue(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">SMPP Server: Message Queue Monitoring</div></div>
            <div class="stats-grid" style="padding:20px; border-bottom:1px solid var(--border)">
                <div class="stat-card"><div class="stat-card-label">Queued SMS</div><div class="stat-card-value" id="q-queued">0</div></div>
                <div class="stat-card"><div class="stat-card-label">Processing</div><div class="stat-card-value" id="q-proc">0</div></div>
                <div class="stat-card"><div class="stat-card-label">Success Rate</div><div class="stat-card-value" id="q-rate">100%</div></div>
            </div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Message ID</th><th>Recipient</th><th>Queued At</th><th>Status</th></tr></thead>
                    <tbody id="srv-queue-body">
                        <tr class="empty-row"><td colspan="4">Queue is empty</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
        this.loadServerQueue();
    },

    async loadServerQueue() {
        try {
            const data = await window.api.call('/api/smpp-interconnect/queue-stats');
            document.getElementById('q-queued').textContent = data.queued;
            document.getElementById('q-proc').textContent = data.processing;
            document.getElementById('q-rate').textContent = data.success_rate + '%';
        } catch (e) {}
    },

    async renderServerSecurity(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">SMPP Server: Security & Audit Logs</div></div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Time</th><th>Source IP</th><th>Account</th><th>Event Type</th><th>Action</th></tr></thead>
                    <tbody><tr class="empty-row"><td colspan="5">No security events detected</td></tr></tbody>
                </table>
            </div>
        </div>`;
    },

    async renderThroughput(container) {
        this.renderServerThroughput(container);
    },

    showAddServerAccount() {
        window.ui.showModal('Add SMPP Server Provider Account', `
            <div class="form-group"><label>System ID</label><input type="text" id="sa-sid" class="fly-input" placeholder="e.g. PARTNER_01"></div>
            <div class="form-group"><label>Password</label><input type="password" id="sa-pass" class="fly-input"></div>
            <div class="form-row">
                <div class="form-group"><label>Throughput Limit (SMS/s)</label><input type="number" id="sa-limit" class="fly-input" value="10"></div>
                <div class="form-group"><label>IP Whitelist (Optional)</label><input type="text" id="sa-ips" class="fly-input" placeholder="0.0.0.0"></div>
            </div>
        `, `
            <button class="fly-btn fly-btn-secondary" onclick="window.ui.closeModal()">Cancel</button>
            <button class="fly-btn" onclick="window.smpp.doAddServerAccount()">Create Account</button>
        `);
    },

    async doAddServerAccount() {
        const payload = {
            system_id: document.getElementById('sa-sid').value,
            password: document.getElementById('sa-pass').value,
            throughput_limit: parseInt(document.getElementById('sa-limit').value),
            ip_whitelist: document.getElementById('sa-ips').value
        };
        try {
            await window.api.call('/api/smpp-interconnect/accounts', { method: 'POST', body: JSON.stringify(payload) });
            window.ui.showToast('Server account created', 'success');
            window.ui.closeModal();
            this.renderServerAccounts(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async deleteServerAccount(id) {
        if (!confirm('Delete this SMPP server account?')) return;
        try {
            await window.api.call(`/api/smpp-interconnect/accounts/${id}`, { method: 'DELETE' });
            window.ui.showToast('Account deleted', 'info');
            this.renderServerAccounts(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async toggleProvider(id) {
        try {
            await window.api.call(`/api/providers/${id}/toggle`, { method: 'POST' });
            this.renderProviders(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async deleteProvider(id) {
        if (!confirm('Delete this provider connection?')) return;
        try {
            await window.api.call(`/api/providers/${id}`, { method: 'DELETE' });
            this.renderProviders(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    }
};

window.smpp = smpp;
