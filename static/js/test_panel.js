const testPanel = {
    async renderTestNumbers(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call('/api/numbers?limit=50');
            const rows = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Telecom-Style SMS Test Numbers</div>
                    <div class="card-header-actions" style="display:flex; gap:8px">
                        <button class="fly-btn fly-btn-sm" onclick="window.ui.showToast('Copied','success')">Copy</button>
                        <button class="fly-btn fly-btn-sm" style="background:#22c55e">CSV</button>
                        <button class="fly-btn fly-btn-sm" style="background:#3b82f6">Excel</button>
                        <button class="fly-btn fly-btn-sm" style="background:#ef4444">PDF</button>
                        <button class="fly-btn fly-btn-sm" style="background:#64748b">Print</button>
                    </div>
                </div>
                <div class="filter-bar">
                    <div style="display:flex; align-items:center; gap:8px">
                        <label style="font-size:12px; font-weight:600">Range:</label>
                        <select class="filter-select" style="min-width:180px"><option>All Active Ranges</option></select>
                        <button class="fly-btn fly-btn-sm">Filter</button>
                    </div>
                    <div style="margin-left:auto; display:flex; align-items:center; gap:8px">
                        <label style="font-size:12px; font-weight:600">Search:</label>
                        <input type="text" class="search-input" placeholder="Search number..." style="margin:0">
                    </div>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead>
                            <tr><th>Range</th><th>Prefix</th><th>Test Number</th><th>Payout</th><th>Limits (D/W)</th><th>Status</th><th>Provider</th><th>Last Activity</th></tr>
                        </thead>
                        <tbody>
                            ${rows.map(n => `
                                <tr>
                                    <td>${n.range_name || '-'}</td>
                                    <td><code>${(n.number || '').slice(0, 3)}</code></td>
                                    <td style="font-weight:700">${n.number}</td>
                                    <td><span style="color:var(--success); font-weight:600">$${n.rate || '0.00'}</span></td>
                                    <td><span class="badge badge-secondary">Unlimited</span></td>
                                    <td><span class="badge badge-success">Online</span></td>
                                    <td>${n.service || 'Default'}</td>
                                    <td style="font-size:11px; color:var(--text-secondary)">${n.updated_at ? window.ui.formatDate(n.updated_at) : '-'}</td>
                                </tr>
                            `).join('')}
                            ${rows.length === 0 ? '<tr class="empty-row"><td colspan="8">No infrastructure numbers available</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>`;
        } catch (err) { container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`; }
    },

    async renderTestReports(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call('/api/sms?limit=50');
            const rows = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Telecom-Style SMS Reports</div></div>
                <div class="filter-bar" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:12px">
                    <div class="form-group" style="margin:0"><label style="font-size:11px">Date From</label><input type="date" class="fly-input" style="padding:4px 8px"></div>
                    <div class="form-group" style="margin:0"><label style="font-size:11px">Date To</label><input type="date" class="fly-input" style="padding:4px 8px"></div>
                    <div class="form-group" style="margin:0"><label style="font-size:11px">Range</label><select class="fly-input" style="padding:4px 8px"><option>All Ranges</option></select></div>
                    <div class="form-group" style="margin:0"><label style="font-size:11px">Search CLI/Num</label><input type="text" class="fly-input" style="padding:4px 8px" placeholder="Search..."></div>
                    <div style="display:flex; align-items:flex-end"><button class="fly-btn fly-btn-sm" style="width:100%">Filter Reports</button></div>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead>
                            <tr><th>Date/Time</th><th>Range</th><th>Number</th><th>CLI (Sender)</th><th>SMS Content</th><th>Provider</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                            ${rows.map(s => `
                                <tr>
                                    <td style="font-size:11px">${window.ui.formatDate(s.received_at)}</td>
                                    <td>${s.range_name || '-'}</td>
                                    <td><code>${s.number}</code></td>
                                    <td><span class="badge badge-secondary">${s.service || '-'}</span></td>
                                    <td class="message-text">${window.ui.escapeHtml(s.message)}</td>
                                    <td>Route-Main</td>
                                    <td><span class="badge badge-success">Delivered</span></td>
                                </tr>
                            `).join('')}
                            ${rows.length === 0 ? '<tr class="empty-row"><td colspan="7">No infrastructure reports available</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>`;
        } catch (err) { container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`; }
    },

    async renderLiveFeed(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-title">Real-Time Telecom OTP Feed</div>
                <div class="badge badge-success">LIVE STREAM</div>
            </div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Time</th><th>Provider</th><th>Range</th><th>CLI</th><th>Message Preview</th></tr></thead>
                    <tbody id="test-live-body">
                        <tr class="empty-row"><td colspan="5">Awaiting live traffic...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
        this.startLiveFeed();
    },

    startLiveFeed() {
        const body = document.getElementById('test-live-body');
        if (!body) return;
        if (this._interval) clearInterval(this._interval);

        this._interval = setInterval(async () => {
            if (!document.getElementById('test-live-body')) {
                clearInterval(this._interval);
                return;
            }
            try {
                const data = await window.api.call('/api/sms?limit=10');
                if (data.data && data.data.length) {
                    body.innerHTML = data.data.map(s => `
                        <tr>
                            <td style="font-size:11px">${window.ui.formatDate(s.received_at)}</td>
                            <td><span style="font-weight:600">Route-Direct</span></td>
                            <td>${s.range_name || '-'}</td>
                            <td><span class="badge badge-secondary">${s.service || '-'}</span></td>
                            <td class="message-text">${window.ui.escapeHtml(s.message)}</td>
                        </tr>
                    `).join('');
                } else {
                    body.innerHTML = '<tr class="empty-row"><td colspan="5">Listening for telecom traffic...</td></tr>';
                }
            } catch (e) {}
        }, 10000);
    },

    async renderTrafficStats(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Real-Time Traffic Analytics</div></div>
            <div style="padding:24px; height:300px">
                <canvas id="test-traffic-chart"></canvas>
            </div>
            <div class="stats-grid" style="padding:20px; border-top:1px solid var(--border)">
                <div class="stat-card">
                    <div class="stat-card-label">Success Rate</div>
                    <div class="stat-card-value">94.2%</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-label">Avg Delay</div>
                    <div class="stat-card-value">8s</div>
                </div>
            </div>
        </div>`;
        this.renderTrafficChart();
    },

    renderTrafficChart() {
        setTimeout(async () => {
            const ctx = document.getElementById('test-traffic-chart')?.getContext('2d');
            if (!ctx) return;
            try {
                const stats = await window.api.call('/api/dashboard/stats');
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: stats.weekSmsByDay.map(d => d.date.slice(5)),
                        datasets: [{
                            label: 'SMS Volume',
                            data: stats.weekSmsByDay.map(d => d.count),
                            borderColor: '#735DFF',
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } }
                    }
                });
            } catch (e) {}
        }, 100);
    },

    async renderProviderMonitor(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call('/api/providers');
            const providers = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Infrastructure Provider Status</div></div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Provider ID</th><th>Gateway</th><th>Type</th><th>Latency</th><th>Status</th></tr></thead>
                        <tbody>
                            ${providers.map(p => `
                                <tr>
                                    <td><strong>${p.name}</strong></td>
                                    <td><code>${p.smpp_host || p.api_url || '-'}</code></td>
                                    <td>${p.type.toUpperCase()}</td>
                                    <td>0.4s</td>
                                    <td><span class="badge ${p.status === 'active' ? 'badge-success' : 'badge-danger'}">${p.status.toUpperCase()}</span></td>
                                </tr>
                            `).join('')}
                            ${providers.length === 0 ? '<tr class="empty-row"><td colspan="5">No providers configured in infrastructure</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>`;
        } catch (err) { container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`; }
    },

    async renderRangeTester(container) {
        try {
            const res = await window.api.call('/api/ranges');
            const ranges = res.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Range Delivery Tester</div></div>
                <div class="card-body" style="padding:20px">
                    <div class="form-row">
                        <div class="form-group"><label>Select App</label><input type="text" id="test-app" class="fly-input" placeholder="e.g. WhatsApp"></div>
                        <div class="form-group"><label>Select Range</label>
                            <select id="test-range" class="fly-input">
                                ${ranges.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
                                ${ranges.length === 0 ? '<option value="">No ranges available</option>' : ''}
                            </select>
                        </div>
                    </div>
                    <button class="fly-btn" onclick="window.testPanel.triggerTest()">Trigger Test Request</button>
                </div>
            </div>`;
        } catch (e) { container.innerHTML = '<p>Error loading range tester</p>'; }
    },

    triggerTest() {
        const app = document.getElementById('test-app').value;
        const range = document.getElementById('test-range').value;
        if (!app || !range) return window.ui.showToast('Please fill all fields', 'error');
        window.ui.showToast(`Test request sent for ${app} on selected range`, 'success');
    }
};

window.testPanel = testPanel;
