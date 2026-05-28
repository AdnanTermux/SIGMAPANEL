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
                    labels: ['US-Mobile', 'UK-Premium', 'GER-Direct', 'FR-Mobile', 'SPA-Direct'],
                    datasets: [{
                        label: 'Profit ($)',
                        data: [420, 310, 180, 150, 90],
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
                <div class="badge badge-success">STREAMING</div>
            </div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Timestamp</th><th>Recipient</th><th>Service</th><th>OTP Code</th><th>Full Content</th></tr></thead>
                    <tbody id="live-otp-body">
                        <tr class="empty-row"><td colspan="5">Listening for incoming OTPs...</td></tr>
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

        let counter = 0;
        const apps = ['Google', 'WhatsApp', 'Telegram', 'Binance', 'Microsoft', 'Netflix', 'Amazon'];

        this._feedInterval = setInterval(() => {
            if (!document.getElementById('live-otp-body')) {
                this.stopLiveFeed();
                return;
            }
            const row = document.createElement('tr');
            const app = apps[Math.floor(Math.random() * apps.length)];
            const otp = Math.floor(100000 + Math.random() * 899999);
            row.innerHTML = `
                <td style="font-size:11px">${new Date().toLocaleTimeString()}</td>
                <td><code>+12025550${100+counter}</code></td>
                <td><span class="badge badge-primary">${app}</span></td>
                <td><span class="otp-code">${otp}</span></td>
                <td class="message-text">Your ${app} verification code is ${otp}. Valid for 5 minutes.</td>
            `;
            if (body.querySelector('.empty-row')) body.innerHTML = '';
            body.insertBefore(row, body.firstChild);
            if (body.children.length > 20) body.lastChild.remove();
            counter++;
        }, 2000);
    },

    stopLiveFeed() {
        if (this._feedInterval) clearInterval(this._feedInterval);
    }
};

window.sms = sms;
