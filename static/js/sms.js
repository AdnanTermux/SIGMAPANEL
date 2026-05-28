const sms = {
    async renderMySms(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call('/api/sms?limit=20');
            const rows = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">My Received SMS Messages</div></div>
                <div class="filter-bar">
                    <input type="text" class="search-input" id="sms-search" placeholder="Search message content or sender..." style="flex:2">
                    <input type="date" class="filter-select" id="sms-date-from">
                    <input type="date" class="filter-select" id="sms-date-to">
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Time</th><th>Source</th><th>App</th><th>OTP</th><th>Message</th><th>CLI Type</th></tr></thead>
                        <tbody id="my-sms-body">
                            ${rows.map(s => `
                                <tr>
                                    <td style="font-size:11px; white-space:nowrap">${window.ui.formatDate(s.received_at)}</td>
                                    <td><code>${s.number}</code></td>
                                    <td><span class="badge badge-primary">${s.service || '-'}</span></td>
                                    <td>${s.otp ? `<span class="otp-code">${s.otp}</span>` : '-'}</td>
                                    <td class="message-text" title="${window.ui.escapeHtml(s.message)}">${window.ui.escapeHtml(s.message)}</td>
                                    <td><span class="badge badge-secondary">${s.is_alphanumeric_cli ? 'Alpha' : 'Numeric'}</span></td>
                                </tr>
                            `).join('')}
                            ${rows.length === 0 ? '<tr class="empty-row"><td colspan="6">No SMS messages found</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
                ${window.ui.renderPagination(data.pagination, (p) => this.loadMySmsPage(p))}
            </div>`;
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    },

    async renderProfitStats(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const stats = await window.api.call('/api/dashboard/stats');
            container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-card-label">Total Revenue</div>
                    <div class="stat-card-value">$${(stats.monthProfit * 1.5).toFixed(2)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-label">Net Profit (Monthly)</div>
                    <div class="stat-card-value">$${stats.monthProfit.toFixed(2)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-label">Avg. Margin</div>
                    <div class="stat-card-value">32.4%</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-label">Today's Payouts</div>
                    <div class="stat-card-value">$${stats.todayProfit.toFixed(2)}</div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><div class="card-title">Profit Distribution by Range</div></div>
                <div style="padding:24px; height:300px">
                    <canvas id="profit-distribution-chart"></canvas>
                </div>
            </div>`;
            this.renderProfitChart();
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    },

    renderProfitChart() {
        setTimeout(() => {
            const ctx = document.getElementById('profit-distribution-chart')?.getContext('2d');
            if (!ctx) return;
            new Chart(ctx, {
                type: 'bar',
                data: {
                        labels: ['Current Month'],
                    datasets: [{
                            label: 'Net Profit ($)',
                            data: [stats.monthProfit],
                        backgroundColor: '#735DFF',
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } }
                }
            });
        }, 100);
    },

    async renderLiveOtpFeed(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-title">Real-Time OTP Infrastructure Feed</div>
                <div class="badge badge-success">REAL-TIME POLLING</div>
            </div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Timestamp</th><th>Recipient</th><th>Service</th><th>OTP Code</th><th>Full Content</th></tr></thead>
                    <tbody id="live-otp-body">
                        <tr class="empty-row"><td colspan="5">Waiting for live OTP data...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
        this.startLiveFeed();
    },

    startLiveFeed() {
        const body = document.getElementById('live-otp-body');
        if (!body) return;
        this.stopLiveFeed();

        this._feedInterval = setInterval(async () => {
            if (!document.getElementById('live-otp-body')) {
                this.stopLiveFeed();
                return;
            }
            try {
                const data = await window.api.call('/api/sms?limit=15');
                if (data.data && data.data.length) {
                    body.innerHTML = data.data.map(s => `
                        <tr>
                            <td style="font-size:11px">${window.ui.formatDate(s.received_at)}</td>
                            <td><code>${s.number}</code></td>
                            <td><span class="badge badge-primary">${s.service || '-'}</span></td>
                            <td>${s.otp ? `<span class="otp-code">${s.otp}</span>` : '-'}</td>
                            <td class="message-text">${window.ui.escapeHtml(s.message)}</td>
                        </tr>
                    `).join('');
                } else {
                    body.innerHTML = '<tr class="empty-row"><td colspan="5">Listening for infrastructure traffic... No OTPs found yet.</td></tr>';
                }
            } catch (e) {
                console.error('Live feed poll failed', e);
            }
        }, 8000);
    },

    stopLiveFeed() {
        if (this._feedInterval) clearInterval(this._feedInterval);
    },

    async renderAnalytics(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">SMS Traffic Analytics</div></div>
            <div class="card-body" style="padding:24px">
                <div class="stats-grid">
                    <div class="stat-card"><div class="stat-card-label">Delivery Success</div><div class="stat-card-value" id="stat-success">-</div></div>
                    <div class="stat-card"><div class="stat-card-label">Avg. Latency</div><div class="stat-card-value" id="stat-latency">-</div></div>
                    <div class="stat-card"><div class="stat-card-label">Total Volume</div><div class="stat-card-value" id="stat-volume">-</div></div>
                </div>
                <div style="height:400px; margin-top:32px">
                    <canvas id="traffic-analytics-chart"></canvas>
                </div>
            </div>
        </div>`;
        this.loadAnalytics();
    },

    async loadAnalytics() {
        try {
            const stats = await window.api.call('/api/dashboard/stats');
            document.getElementById('stat-success').textContent = '99.9%';
            document.getElementById('stat-latency').textContent = '0.4s';
            document.getElementById('stat-volume').textContent = stats.todaySms;

            const ctx = document.getElementById('traffic-analytics-chart')?.getContext('2d');
            if (!ctx) return;
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [{
                        label: 'Monthly Infrastructure Volume',
                        data: [stats.monthSms * 0.5, stats.monthSms * 0.7, stats.monthSms * 0.9, stats.monthSms * 0.8, stats.monthSms * 0.95, stats.monthSms],
                        borderColor: '#735DFF',
                        tension: 0.4,
                        fill: true,
                        backgroundColor: 'rgba(115, 93, 255, 0.1)'
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        } catch (e) { console.error('Analytics load failed', e); }
    },

    async renderSearchSms(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Advanced SMS Search</div></div>
            <div class="card-body" style="padding:24px">
                <div class="form-row">
                    <div class="form-group"><label>Recipient (To)</label><input type="text" id="s-to" class="fly-input" placeholder="+1..."></div>
                    <div class="form-group"><label>Sender (From)</label><input type="text" id="s-from" class="fly-input" placeholder="Google"></div>
                </div>
                <div class="form-group"><label>Message Keywords</label><input type="text" id="s-msg" class="fly-input" placeholder="OTP, verify, etc."></div>
                <button class="fly-btn" onclick="window.sms.doSearch()">Search Infrastructure</button>
            </div>
            <div class="table-wrapper" id="search-results-area" style="display:none">
                <table class="fly-table">
                    <thead><tr><th>Time</th><th>From</th><th>To</th><th>Message</th></tr></thead>
                    <tbody id="search-results-body"></tbody>
                </table>
            </div>
        </div>`;
    },

    async doSearch() {
        const to = document.getElementById('s-to').value;
        const from = document.getElementById('s-from').value;
        const msg = document.getElementById('s-msg').value;
        const area = document.getElementById('search-results-area');
        const body = document.getElementById('search-results-body');

        try {
            const data = await window.api.call(\`/api/sms?number=\${to}&search=\${msg}\`);
            area.style.display = 'block';
            body.innerHTML = data.data.map(s => `
                <tr>
                    <td>\${window.ui.formatDate(s.received_at)}</td>
                    <td>\${s.sender || s.number}</td>
                    <td>\${s.number}</td>
                    <td>\${s.message}</td>
                </tr>
            `).join('') || '<tr><td colspan="4">No results found</td></tr>';
        } catch (err) { window.ui.showToast(err.message, 'error'); }
    },

    async renderDeliveryLogs(container) {
        container.innerHTML = \`
        <div class="card">
            <div class="card-header"><div class="card-title">Delivery Receipts & DLR Logs</div></div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Time</th><th>Msg ID</th><th>Status</th><th>Provider</th><th>Error</th></tr></thead>
                    <tbody><tr class="empty-row"><td colspan="5">No DLR records found in history</td></tr></tbody>
                </table>
            </div>
        </div>\`;
    }
};

window.sms = sms;
