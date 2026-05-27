const smpp = {
    async renderProviders(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call('/api/providers');
            const rows = (data.data || []).filter(p => p.type === 'smpp');
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">SMPP Client Connections (Outgoing)</div>
                    <button class="fly-btn fly-btn-sm" onclick="window.smpp.showAddModal()">Add Provider</button>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Name</th><th>Host</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${rows.length ? rows.map(p => `
                                <tr>
                                    <td style="font-weight:700">${p.name}</td>
                                    <td><code>${p.smpp_host}:${p.smpp_port}</code></td>
                                    <td><span class="badge ${p.status === 'active' ? 'badge-success' : 'badge-danger'}">${p.status}</span></td>
                                    <td class="actions-cell">
                                        <button class="action-btn" onclick="window.smpp.reconnect('${p.id}')">Reconnect</button>
                                    </td>
                                </tr>
                            `).join('') : '<tr class="empty-row"><td colspan="4">No SMPP providers</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="card" style="margin-top:24px">
                <div class="card-header">
                    <div class="card-title">SMPP Server Accounts (Incoming)</div>
                    <button class="fly-btn fly-btn-sm" onclick="window.smpp.showAddServerAccount()">Create Account</button>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>System ID</th><th>IP Whitelist</th><th>Throughput</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            <tr class="empty-row"><td colspan="5">No server accounts configured</td></tr>
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
            <div class="stat-card"><div class="stat-card-label">Server Status</div><div class="stat-card-value" style="color:var(--success)">ONLINE</div></div>
            <div class="stat-card"><div class="stat-card-label">Active Sessions</div><div class="stat-card-value">0</div></div>
            <div class="stat-card"><div class="stat-card-label">Port</div><div class="stat-card-value">2775</div></div>
        </div>
        <div class="card">
            <div class="card-header"><div class="card-title">Live Server Logs</div></div>
            <div class="card-body" style="padding:20px; background:#1e1b4b; color:#a5b4fc; font-family:monospace; font-size:12px; height:300px; overflow-y:auto" id="smpp-logs">
                <div>[SYSTEM] SMPP Server initialized on 0.0.0.0:2775</div>
                <div>[SYSTEM] Waiting for connections...</div>
            </div>
        </div>`;
    },

    async renderSessions(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Live SMPP Sessions</div></div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>System ID</th><th>IP Address</th><th>Bind Type</th><th>Connected At</th><th>Actions</th></tr></thead>
                    <tbody>
                        <tr class="empty-row"><td colspan="5">No active sessions at the moment</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    async renderAccounts(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-title">SMPP Server Provider Accounts</div>
                <button class="fly-btn fly-btn-sm" onclick="window.smpp.showAddServerAccount()">New Account</button>
            </div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>System ID</th><th>IP Whitelist</th><th>Throughput</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                        <tr class="empty-row"><td colspan="5">No provider accounts configured</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    reconnect(id) {
        window.ui.showToast('Reconnecting...', 'info');
    },

    showAddModal() {
        window.ui.showToast('Add Provider modal coming soon', 'info');
    },

    showAddServerAccount() {
        const body = `
            <div class="form-group"><label>System ID (Username)</label><input type="text" id="sa-sid" class="fly-input"></div>
            <div class="form-group"><label>Password</label><input type="password" id="sa-pwd" class="fly-input"></div>
            <div class="form-row">
                <div class="form-group"><label>Throughput Limit (SMS/s)</label><input type="number" id="sa-thr" class="fly-input" value="10"></div>
                <div class="form-group"><label>IP Whitelist (Optional)</label><input type="text" id="sa-ip" class="fly-input" placeholder="e.g. 1.2.3.4"></div>
            </div>`;
        const footer = `<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button><button class="fly-btn" onclick="window.smpp.saveAccount()">Create Account</button>`;
        window.ui.showModal('New SMPP Server Account', body, footer);
    },

    async saveAccount() {
        const payload = {
            systemId: document.getElementById('sa-sid').value,
            password: document.getElementById('sa-pwd').value,
            throughputLimit: parseInt(document.getElementById('sa-thr').value),
            ipWhitelist: document.getElementById('sa-ip').value || null
        };
        try {
            await window.api.call('/api/providers/smpp-server/accounts', { method: 'POST', body: JSON.stringify(payload) });
            window.ui.showToast('Account created', 'success');
            window.ui.closeModal();
            window.router.resolvePage(document.getElementById('page-content'));
        } catch (err) { window.ui.showToast(err.message, 'error'); }
    }
};

window.smpp = smpp;
