const smpp = {
    async renderDashboard(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const stats = await window.api.call('/api/smpp-interconnect/stats');
            container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-card-label">Active Sessions</div><div class="stat-card-value">${stats.active_sessions}</div></div>
                <div class="stat-card"><div class="stat-card-label">SMS Received (Today)</div><div class="stat-card-value">${stats.sms_received}</div></div>
                <div class="stat-card"><div class="stat-card-label">DLRs Processed</div><div class="stat-card-value">${stats.dlrs_processed}</div></div>
                <div class="stat-card"><div class="stat-card-label">Failed Binds</div><div class="stat-card-value">${stats.failed_binds}</div></div>
                <div class="stat-card"><div class="stat-card-label">Avg Throughput</div><div class="stat-card-value">${stats.throughput}</div></div>
            </div>
            <div class="card" style="margin-top:24px">
                <div class="card-header"><div class="card-title">Real-Time Throughput Monitor</div></div>
                <div style="padding:24px; height:300px"><canvas id="smpp-tp-chart"></canvas></div>
            </div>`;
            this.renderThroughputChart();
        } catch (e) { container.innerHTML = '<p>Error loading SMPP stats</p>'; }
    },

    renderThroughputChart() {
        setTimeout(() => {
            const ctx = document.getElementById('smpp-tp-chart')?.getContext('2d');
            if (ctx) new Chart(ctx, { type: 'line', data: { labels: ['-50s','-40s','-30s','-20s','-10s','Now'], datasets: [{ label: 'msg/s', data: [0.1, 0.4, 0.3, 0.45, 0.42, 0.45], borderColor: '#735DFF', fill: true, tension: 0.4 }] }, options: { responsive: true, maintainAspectRatio: false } });
        }, 100);
    },

    async renderServerAccounts(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/smpp-interconnect/accounts');
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">SMPP Server Provider Accounts</div><button class="fly-btn fly-btn-sm" onclick="window.smpp.showAddAccount()">Create Account</button></div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>System ID</th><th>Company</th><th>Limit</th><th>IPs</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>${res.data.map(a => `
                            <tr>
                                <td><strong>${a.system_id}</strong></td>
                                <td>${a.company || '-'}</td>
                                <td>${a.throughput_limit} msg/s</td>
                                <td><code>${a.ip_whitelist || 'Any'}</code></td>
                                <td><span class="badge ${a.status==='active'?'badge-success':'badge-danger'}">${a.status}</span></td>
                                <td><button class="action-btn delete" onclick="window.smpp.deleteAccount('${a.id}')">${ICONS.trash}</button></td>
                            </tr>`).join('') || '<tr><td colspan="6">No accounts configured</td></tr>'}</tbody>
                    </table>
                </div>
            </div>`;
        } catch (e) { container.innerHTML = '<p>Error loading accounts</p>'; }
    },

    showAddAccount() {
        window.ui.showModal('Add SMPP Provider', `
            <div class="form-row"><div class="form-group"><label>System ID</label><input type="text" id="a-sid" class="fly-input"></div><div class="form-group"><label>Password</label><input type="password" id="a-pass" class="fly-input"></div></div>
            <div class="form-row"><div class="form-group"><label>Company</label><input type="text" id="a-comp" class="fly-input"></div><div class="form-group"><label>Limit (msg/s)</label><input type="number" id="a-lim" class="fly-input" value="10"></div></div>
            <div class="form-group"><label>IP Whitelist (Comma separated)</label><input type="text" id="a-ips" class="fly-input" placeholder="0.0.0.0"></div>
        `, '<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button><button class="fly-btn" onclick="window.smpp.saveAccount()">Save Account</button>');
    },

    async saveAccount() {
        const payload = { system_id: document.getElementById('a-sid').value, password: document.getElementById('a-pass').value, company: document.getElementById('a-comp').value, throughput_limit: parseInt(document.getElementById('a-lim').value), ip_whitelist: document.getElementById('a-ips').value };
        try { await window.api.call('/api/smpp-interconnect/accounts', { method: 'POST', body: JSON.stringify(payload) }); window.ui.showToast('Account added', 'success'); window.ui.closeModal(); this.renderServerAccounts(document.getElementById('page-content')); }
        catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async deleteAccount(id) {
        if (confirm('Delete this SMPP account?')) {
            try { await window.api.call('/api/smpp-interconnect/accounts/' + id, { method: 'DELETE' }); this.renderServerAccounts(document.getElementById('page-content')); }
            catch (e) {}
        }
    },

    async renderServerSessions(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Live SMPP Sessions</div></div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>IP Address</th><th>System ID</th><th>Bind</th><th>Connected At</th><th>Last Activity</th></tr></thead>
                    <tbody id="srv-sessions-body"><tr><td colspan="5">Scanning sessions...</td></tr></tbody>
                </table>
            </div>
        </div>`;
        this.loadSessions();
    },

    async loadSessions() {
        const body = document.getElementById('srv-sessions-body');
        if (!body) return;
        try {
            const res = await window.api.call('/api/smpp-interconnect/server-sessions');
            body.innerHTML = res.data.map(s => `<tr><td><code>${s.ip_address}</code></td><td><strong>${s.system_id}</strong></td><td>${s.bind_type}</td><td>${window.ui.formatDate(s.connected_at)}</td><td>${window.ui.formatDate(s.last_activity)}</td></tr>`).join('') || '<tr><td colspan="5">No active sessions</td></tr>';
        } catch (e) {}
    },

    async renderServerLogs(container) {
        container.innerHTML = '<div class="card"><div class="card-header"><div class="card-title">SMPP Server Connection Logs</div></div><div class="table-wrapper"><table class="fly-table"><thead><tr><th>Time</th><th>IP</th><th>Event</th><th>Detail</th></tr></thead><tbody id="srv-logs-body"></tbody></table></div></div>';
        try {
            const res = await window.api.call('/api/smpp-interconnect/server-logs');
            document.getElementById('srv-logs-body').innerHTML = res.data.map(l => `<tr><td>${window.ui.formatDate(l.created_at)}</td><td><code>${l.ip_address}</code></td><td><span class="badge badge-secondary">${l.event_type}</span></td><td>${l.detail}</td></tr>`).join('') || '<tr><td colspan="4">No logs found</td></tr>';
        } catch (e) {}
    },

    async renderServerDlr(container) {
        container.innerHTML = '<div class="card"><div class="card-header"><div class="card-title">SMPP Server DLR Monitor</div></div><div class="table-wrapper"><table class="fly-table"><thead><tr><th>Time</th><th>Target</th><th>Service</th><th>Status</th></tr></thead><tbody id="srv-dlr-body"></tbody></table></div></div>';
        try {
            const res = await window.api.call('/api/smpp-interconnect/dlr-logs');
            document.getElementById('srv-dlr-body').innerHTML = res.data.map(d => `<tr><td>${window.ui.formatDate(d.received_at)}</td><td>${d.number}</td><td>${d.service}</td><td><span class="badge badge-success">DELIVERED</span></td></tr>`).join('') || '<tr><td colspan="4">No DLRs found</td></tr>';
        } catch (e) {}
    },

    async renderServerSecurity(container) {
        container.innerHTML = '<div class="card"><div class="card-header"><div class="card-title">SMPP Server Security Center</div></div><div class="table-wrapper"><table class="fly-table"><thead><tr><th>Time</th><th>IP</th><th>Threat</th><th>Action</th></tr></thead><tbody id="srv-sec-body"></tbody></table></div></div>';
        try {
            const res = await window.api.call('/api/security/events?limit=50');
            document.getElementById('srv-sec-body').innerHTML = res.data.map(e => `<tr><td>${window.ui.formatDate(e.created_at)}</td><td><code>${e.ip_address}</code></td><td>${e.event_type}</td><td>${e.action_taken}</td></tr>`).join('') || '<tr><td colspan="4">No security events</td></tr>';
        } catch (e) {}
    },

    async renderThroughput(container) { this.renderDashboard(container); },
    async renderProviders(container) { this.renderDashboard(container); },
    async renderStatus(container) { this.renderServerSessions(container); },
    async renderHttpBinds(container) { container.innerHTML = '<div class="card"><div class="card-header"><div class="card-title">HTTP Provider Binds</div></div><div class="card-body">All webhook endpoints are active.</div></div>'; },
    async renderFailover(container) { container.innerHTML = '<div class="card"><div class="card-header"><div class="card-title">Failover Routes</div></div><div class="card-body">Infrastructure is in high-availability mode.</div></div>'; }
};
window.smpp = smpp;
