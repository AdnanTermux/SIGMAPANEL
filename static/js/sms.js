const sms = {
    async renderMySms(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call('/api/sms?limit=20');
            const rows = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">My SMS Feed</div>
                    <div class="card-header-actions">
                         <button class="fly-btn fly-btn-sm" onclick="window.sms.export('csv')">CSV Export</button>
                    </div>
                </div>
                <div class="filter-bar">
                    <input type="text" class="search-input" placeholder="Search by number or service..." id="sms-search">
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Number</th><th>Sender</th><th>Service</th><th>OTP</th><th>Message</th><th>Received</th></tr></thead>
                        <tbody>
                            ${rows.length ? rows.map(s => `
                                <tr>
                                    <td><code>${s.number}</code></td>
                                    <td>${s.sender || '-'}</td>
                                    <td>${s.service ? `<span class="badge badge-primary">${s.service}</span>` : '-'}</td>
                                    <td>${s.otp ? `<span class="otp-code">${s.otp}</span>` : '-'}</td>
                                    <td class="message-text" title="${window.ui.escapeHtml(s.message)}">${window.ui.escapeHtml(s.message)}</td>
                                    <td style="font-size:12px">${window.ui.formatDate(s.received_at)}</td>
                                </tr>
                            `).join('') : '<tr class="empty-row"><td colspan="6">No SMS messages found</td></tr>'}
                        </tbody>
                    </table>
                </div>
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
                <div class="stat-card"><div class="stat-card-label">Today's Profit</div><div class="stat-card-value">$${stats.todayProfit.toFixed(2)}</div></div>
                <div class="stat-card"><div class="stat-card-label">Month Profit</div><div class="stat-card-value">$${stats.monthProfit.toFixed(2)}</div></div>
                <div class="stat-card"><div class="stat-card-label">Today's SMS</div><div class="stat-card-value">${stats.todaySms}</div></div>
            </div>
            <div class="card">
                <div class="card-header"><div class="card-title">Profit Analytics</div></div>
                <div class="card-body" style="padding:20px; text-align:center; color:var(--text-secondary)">
                    <p>Detailed profit charts and historical breakdowns are loading...</p>
                </div>
            </div>`;
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    },

    async renderLiveOtpFeed(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-title">Live OTP Feed (Real-time)</div>
                <div class="card-header-actions">
                    <span class="badge badge-success pulse">Live</span>
                </div>
            </div>
            <div id="live-otp-container" class="table-wrapper">
                <div class="loading-spinner"><div class="spinner"></div></div>
            </div>
        </div>`;

        const load = async () => {
            try {
                const data = await window.api.call('/api/api-management/live-otp?limit=50');
                const rows = data.data || [];
                const target = document.getElementById('live-otp-container');
                if (!target) return;
                target.innerHTML = `
                <table class="fly-table">
                    <thead><tr><th>Number</th><th>Service</th><th>OTP</th><th>Message</th><th>Received</th></tr></thead>
                    <tbody>
                        ${rows.map(r => `
                            <tr class="fade-in">
                                <td><code>${r.number}</code></td>
                                <td><span class="badge badge-primary">${r.service || '-'}</span></td>
                                <td><span class="otp-code">${r.otp}</span></td>
                                <td class="message-text">${window.ui.escapeHtml(r.message)}</td>
                                <td style="font-size:12px">${window.ui.formatDate(r.received_at)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>`;
            } catch (e) {}
        };
        load();
        this._liveInterval = setInterval(load, 5000);
    },

    stopLiveFeed() {
        if (this._liveInterval) clearInterval(this._liveInterval);
    },

    async renderReports(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call('/api/sms?limit=50');
            const rows = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Detailed SMS Reports</div>
                    <div class="card-header-actions">
                        <button class="fly-btn fly-btn-sm" onclick="window.sms.export('pdf')">PDF Report</button>
                    </div>
                </div>
                <div class="filter-bar">
                    <input type="date" class="filter-select" id="sms-date-from">
                    <input type="text" class="search-input" placeholder="Search number, sender, or content..." id="report-search">
                    <button class="fly-btn" onclick="window.sms.filterReports()">Apply Filter</button>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Time</th><th>Number</th><th>Sender</th><th>OTP</th><th>Message</th><th>Profit</th></tr></thead>
                        <tbody>
                            ${rows.length ? rows.map(s => `
                                <tr>
                                    <td style="font-size:11px">${window.ui.formatDate(s.received_at)}</td>
                                    <td><code>${s.number}</code></td>
                                    <td>${s.sender || '-'}</td>
                                    <td>${s.otp ? `<span class="otp-code">${s.otp}</span>` : '-'}</td>
                                    <td class="message-text">${window.ui.escapeHtml(s.message)}</td>
                                    <td style="color:var(--success)">$${(s.profit || 0).toFixed(4)}</td>
                                </tr>
                            `).join('') : '<tr class="empty-row"><td colspan="6">No records found</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>`;
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    },

    export(format) {
        window.ui.showToast(`Exporting reports as ${format.toUpperCase()}...`, 'info');
    },

    filterReports() {
        window.ui.showToast('Filtering reports...', 'info');
    }
};

window.sms = sms;
