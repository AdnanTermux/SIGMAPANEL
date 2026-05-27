const dashboard = {
    async render(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const stats = await window.api.call('/api/dashboard/stats');
            const recent = await window.api.call('/api/dashboard/recent-sms?limit=10');

            const maxChart = Math.max(...stats.weekSmsByDay.map(d => d.count), 1);

            container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-card-label">Today's SMS</div><div class="stat-card-value">${stats.todaySms}</div></div>
                <div class="stat-card"><div class="stat-card-label">This Week</div><div class="stat-card-value">${stats.weekSms}</div></div>
                <div class="stat-card"><div class="stat-card-label">This Month</div><div class="stat-card-value">${stats.monthSms}</div></div>
                <div class="stat-card"><div class="stat-card-label">Total Numbers</div><div class="stat-card-value">${stats.totalNumbers}</div><div class="stat-card-change">${stats.activeNumbers} active</div></div>
                <div class="stat-card"><div class="stat-card-label">Today's Profit</div><div class="stat-card-value">$${stats.todayProfit.toFixed(2)}</div></div>
                <div class="stat-card"><div class="stat-card-label">Month Profit</div><div class="stat-card-value">$${stats.monthProfit.toFixed(2)}</div></div>
                <div class="stat-card"><div class="stat-card-label">Total Users</div><div class="stat-card-value">${stats.totalUsers}</div></div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px" class="dashboard-charts">
                <div class="card">
                    <div class="card-header"><div class="card-title">Weekly SMS Activity</div></div>
                    <div class="chart-container" id="weekly-chart">
                        ${stats.weekSmsByDay.map(d => `
                            <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%">
                                <div style="font-size:11px;font-weight:600;color:#222F36;margin-bottom:4px">${d.count}</div>
                                <div style="width:100%;max-width:40px;background:linear-gradient(to top,#735DFF,#a78bfa);border-radius:4px 4px 0 0;height:${Math.max((d.count / maxChart) * 100, 4)}%;transition:height 0.3s ease"></div>
                                <div style="font-size:10px;color:#6B7280;margin-top:6px">${d.date.slice(5)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="card">
                    <div class="card-header"><div class="card-title">Top Services Today</div></div>
                    <div class="service-list">
                        ${stats.todaySmsByService.length ? stats.todaySmsByService.map(s => `
                            <div class="service-chip">${s.service || 'Unknown'} <span class="service-chip-count">${s.count}</span></div>
                        `).join('') : '<div class="empty-state"><p>No SMS received today</p></div>'}
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><div class="card-title">Recent SMS</div></div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Number</th><th>Service (Sender)</th><th>Recipient</th><th>OTP</th><th>Message</th><th>Received</th></tr></thead>
                        <tbody>
                            ${recent.data.length ? recent.data.map(s => `
                                <tr>
                                    <td><code style="font-size:12px">${s.number}</code></td>
                                    <td>${s.service ? `<span class="badge badge-primary">${s.service}</span>` : '<span style="color:#9ca3af">N/A</span>'}</td>
                                    <td>${s.recipient || '<span style="color:#9ca3af">-</span>'}</td>
                                    <td>${s.otp ? `<span class="otp-code">${s.otp}</span>` : '-'}</td>
                                    <td class="message-text" title="${window.ui.escapeHtml(s.message)}">${window.ui.escapeHtml(s.message)}</td>
                                    <td style="font-size:12px;color:#6B7280">${window.ui.formatDate(s.received_at)}</td>
                                </tr>
                            `).join('') : '<tr class="empty-row"><td colspan="6">No SMS received yet</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>`;
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    }
};

window.dashboard = dashboard;
