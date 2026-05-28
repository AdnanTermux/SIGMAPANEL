const smppInterconnect = {
    async render(container) {
        container.innerHTML = `
        <div class="stats-grid" id="interconnect-stats">
            <div class="stat-card">
                <div class="stat-card-label">Remote Servers</div>
                <div class="stat-card-value" id="server-count">-</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-label">Active Sessions</div>
                <div class="stat-card-value" id="active-sessions" style="color:var(--success)">-</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-label">Throughput (Avg)</div>
                <div class="stat-card-value" id="avg-throughput">0.0<span style="font-size:12px">/s</span></div>
            </div>
            <div class="stat-card">
                <div class="stat-card-label">DLRs Received</div>
                <div class="stat-card-value">1,402</div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <div class="card-title">Remote SMPP Interconnections</div>
                <button class="fly-btn fly-btn-sm" onclick="window.smppInterconnect.showAddServer()">Add Remote Server</button>
            </div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Host:Port</th>
                            <th>System ID</th>
                            <th>Bind Type</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="interconnect-tbody">
                        <tr class="empty-row"><td colspan="7">Loading remote servers...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div class="card" style="margin-top:24px">
            <div class="card-header"><div class="card-title">Interconnection Session Logs</div></div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Time</th><th>Server</th><th>Event</th><th>Detail</th></tr></thead>
                    <tbody id="interconnect-logs"></tbody>
                </table>
            </div>
        </div>`;
        this.loadServers();
        this.loadLogs();
        this.startStatusPolling();
    },

    async loadServers() {
        try {
            const res = await window.api.call('/api/smpp-interconnect/servers');
            const body = document.getElementById('interconnect-tbody');
            if (!body) return;

            const servers = res.data || [];
            document.getElementById('server-count').textContent = servers.length;
            document.getElementById('active-sessions').textContent = servers.filter(s => s.status === 'connected').length;

            body.innerHTML = servers.map(s => `
                <tr>
                    <td><strong>${s.name}</strong></td>
                    <td><code>${s.host}:${s.port}</code></td>
                    <td><code>${s.system_id}</code></td>
                    <td><span class="badge badge-secondary">${s.bind_type}</span></td>
                    <td>${s.priority}</td>
                    <td>
                        <span class="badge ${s.status === 'connected' ? 'badge-success' : s.status === 'failed' ? 'badge-danger' : 'badge-secondary'}">
                            ${s.status.toUpperCase()}
                        </span>
                    </td>
                    <td class="actions-cell">
                        <button class="action-btn" onclick="window.smppInterconnect.toggleServer('${s.id}')">${s.is_active ? 'Deactivate' : 'Activate'}</button>
                        <button class="action-btn delete" onclick="window.smppInterconnect.deleteServer('${s.id}')">${ICONS.trash}</button>
                    </td>
                </tr>
            `).join('') || '<tr class="empty-row"><td colspan="7">No remote servers configured</td></tr>';
        } catch (e) {}
    },

    async loadLogs() {
        try {
            const res = await window.api.call('/api/smpp-interconnect/logs');
            const body = document.getElementById('interconnect-logs');
            if (!body) return;
            body.innerHTML = res.data.map(l => `
                <tr>
                    <td style="font-size:11px">${window.ui.formatDate(l.created_at)}</td>
                    <td>${l.server_name || 'System'}</td>
                    <td><span class="badge badge-primary">${l.event_type}</span></td>
                    <td style="font-size:12px">${l.detail}</td>
                </tr>
            `).join('') || '<tr class="empty-row"><td colspan="4">No logs found</td></tr>';
        } catch (e) {}
    },

    showAddServer() {
        window.ui.showModal('Add Remote SMPP Server', `
            <div class="form-group"><label>Server Name</label><input type="text" id="rs-name" class="fly-input" placeholder="e.g. Upstream-Carrier-A"></div>
            <div class="form-row">
                <div class="form-group"><label>Host / IP</label><input type="text" id="rs-host" class="fly-input"></div>
                <div class="form-group"><label>Port</label><input type="number" id="rs-port" class="fly-input" value="2775"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>System ID</label><input type="text" id="rs-sid" class="fly-input"></div>
                <div class="form-group"><label>Password</label><input type="password" id="rs-pass" class="fly-input"></div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Bind Type</label>
                    <select id="rs-bind" class="fly-input">
                        <option value="transceiver">Transceiver</option>
                        <option value="transmitter">Transmitter</option>
                        <option value="receiver">Receiver</option>
                    </select>
                </div>
                <div class="form-group"><label>Throughput Limit (sms/s)</label><input type="number" id="rs-limit" class="fly-input" value="10"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>TON / NPI (Source)</label>
                    <div style="display:flex; gap:4px">
                        <input type="number" id="rs-src-ton" class="fly-input" value="1" title="TON">
                        <input type="number" id="rs-src-npi" class="fly-input" value="1" title="NPI">
                    </div>
                </div>
                <div class="form-group"><label>TON / NPI (Dest)</label>
                    <div style="display:flex; gap:4px">
                        <input type="number" id="rs-dst-ton" class="fly-input" value="1" title="TON">
                        <input type="number" id="rs-dst-npi" class="fly-input" value="1" title="NPI">
                    </div>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Enquire Link (sec)</label><input type="number" id="rs-interval" class="fly-input" value="30"></div>
                <div class="form-group"><label>Priority</label><input type="number" id="rs-priority" class="fly-input" value="1"></div>
            </div>
            <div class="form-group">
                <label><input type="checkbox" id="rs-dlr" checked> Enable Delivery Reports (DLR)</label>
            </div>
            <div class="form-group"><label>Allowed IPs (Optional)</label><input type="text" id="rs-ips" class="fly-input" placeholder="0.0.0.0, 1.2.3.4"></div>
        `, `
            <button class="fly-btn fly-btn-secondary" onclick="window.ui.closeModal()">Cancel</button>
            <button class="fly-btn fly-btn-secondary" onclick="window.smppInterconnect.testConnection()">Test Connection</button>
            <button class="fly-btn" onclick="window.smppInterconnect.doAddServer()">Save & Connect</button>
        `, 'large');
    },

    async testConnection() {
        const payload = {
            name: document.getElementById('rs-name').value,
            host: document.getElementById('rs-host').value,
            port: parseInt(document.getElementById('rs-port').value),
            system_id: document.getElementById('rs-sid').value,
            password: document.getElementById('rs-pass').value,
            bind_type: document.getElementById('rs-bind').value,
            throughput_limit: parseInt(document.getElementById('rs-limit').value),
            src_ton: parseInt(document.getElementById('rs-src-ton').value),
            src_npi: parseInt(document.getElementById('rs-src-npi').value),
            dst_ton: parseInt(document.getElementById('rs-dst-ton').value),
            dst_npi: parseInt(document.getElementById('rs-dst-npi').value),
            enquire_link_interval: parseInt(document.getElementById('rs-interval').value),
            dlr_enabled: document.getElementById('rs-dlr').checked ? 1 : 0,
            priority: parseInt(document.getElementById('rs-priority').value),
            allowed_ips: document.getElementById('rs-ips').value
        };
        window.ui.showToast('Testing connection...', 'info');
        try {
            const res = await window.api.call('/api/smpp-interconnect/test-connection', { method: 'POST', body: JSON.stringify(payload) });
            window.ui.showToast(res.message, 'success');
        } catch (err) { window.ui.showToast(err.message, 'error'); }
    },

    async doAddServer() {
        const payload = {
            name: document.getElementById('rs-name').value,
            host: document.getElementById('rs-host').value,
            port: parseInt(document.getElementById('rs-port').value),
            system_id: document.getElementById('rs-sid').value,
            password: document.getElementById('rs-pass').value,
            bind_type: document.getElementById('rs-bind').value,
            throughput_limit: parseInt(document.getElementById('rs-limit').value),
            src_ton: parseInt(document.getElementById('rs-src-ton').value),
            src_npi: parseInt(document.getElementById('rs-src-npi').value),
            dst_ton: parseInt(document.getElementById('rs-dst-ton').value),
            dst_npi: parseInt(document.getElementById('rs-dst-npi').value),
            enquire_link_interval: parseInt(document.getElementById('rs-interval').value),
            dlr_enabled: document.getElementById('rs-dlr').checked ? 1 : 0,
            priority: parseInt(document.getElementById('rs-priority').value),
            allowed_ips: document.getElementById('rs-ips').value
        };
        try {
            await window.api.call('/api/smpp-interconnect/servers', { method: 'POST', body: JSON.stringify(payload) });
            window.ui.showToast('Remote server added', 'success');
            window.ui.closeModal();
            this.loadServers();
        } catch (err) { window.ui.showToast(err.message, 'error'); }
    },

    async toggleServer(sid) {
        try {
            await window.api.call(`/api/smpp-interconnect/servers/${sid}/toggle`, { method: 'POST' });
            this.loadServers();
        } catch (err) { window.ui.showToast(err.message, 'error'); }
    },

    async deleteServer(sid) {
        if (!confirm('Delete this remote connection?')) return;
        try {
            await window.api.call(`/api/smpp-interconnect/servers/${sid}`, { method: 'DELETE' });
            this.loadServers();
        } catch (err) { window.ui.showToast(err.message, 'error'); }
    },

    startStatusPolling() {
        if (this._polling) clearInterval(this._polling);
        this._polling = setInterval(() => {
            if (!document.getElementById('interconnect-tbody')) {
                clearInterval(this._polling);
                return;
            }
            this.loadServers();
        }, 5000);
    }
};

window.smppInterconnect = smppInterconnect;
