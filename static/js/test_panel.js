const testPanel = {
    async renderTestNumbers(container) {
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
                    <select class="filter-select" style="min-width:180px">
                        <option>All Active Ranges</option>
                        <option>US-Mobile-A1</option>
                        <option>UK-Premium-G2</option>
                    </select>
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
                        <tr>
                            <th>Range</th>
                            <th>Prefix</th>
                            <th>Test Number</th>
                            <th>Payout</th>
                            <th>Limits (D/W)</th>
                            <th>Status</th>
                            <th>Provider</th>
                            <th>Last Activity</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${[1,2,3,4,5,6,7,8,9,10].map(i => `
                            <tr>
                                <td>US-Mobile-A1</td>
                                <td><code>+1</code></td>
                                <td style="font-weight:700">+120255501${i < 10 ? '0'+i : i}</td>
                                <td><span style="color:var(--success); font-weight:600">$0.05</span></td>
                                <td><span class="badge badge-secondary">50/250</span></td>
                                <td><span class="badge badge-success">Online</span></td>
                                <td>SMPP-Tier1</td>
                                <td style="font-size:11px; color:var(--text-secondary)">Just now</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="pagination">
                <div class="pagination-info">Showing 1-10 of 124 numbers</div>
                <div class="pagination-buttons">
                    <button class="pagination-btn" disabled>Previous</button>
                    <button class="pagination-btn active">1</button>
                    <button class="pagination-btn">2</button>
                    <button class="pagination-btn">3</button>
                    <button class="pagination-btn">Next</button>
                </div>
            </div>
        </div>`;
    },

    async renderTestReports(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Telecom-Style SMS Reports</div></div>
            <div class="filter-bar" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:12px">
                <div class="form-group" style="margin:0">
                    <label style="font-size:11px">Date From</label>
                    <input type="date" class="fly-input" style="padding:4px 8px">
                </div>
                <div class="form-group" style="margin:0">
                    <label style="font-size:11px">Date To</label>
                    <input type="date" class="fly-input" style="padding:4px 8px">
                </div>
                <div class="form-group" style="margin:0">
                    <label style="font-size:11px">Range</label>
                    <select class="fly-input" style="padding:4px 8px">
                        <option>All Ranges</option>
                    </select>
                </div>
                <div class="form-group" style="margin:0">
                    <label style="font-size:11px">Search CLI/Num</label>
                    <input type="text" class="fly-input" style="padding:4px 8px" placeholder="Search...">
                </div>
                <div style="display:flex; align-items:flex-end">
                    <button class="fly-btn fly-btn-sm" style="width:100%">Filter Reports</button>
                </div>
            </div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead>
                        <tr>
                            <th>Date/Time</th>
                            <th>Range</th>
                            <th>Number</th>
                            <th>CLI (Sender)</th>
                            <th>SMS Content</th>
                            <th>Provider</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${[1,2,3,4,5].map(i => `
                            <tr>
                                <td style="font-size:11px">2026-05-28 12:45:${i*10}</td>
                                <td>UK-Mobile</td>
                                <td><code>+4479111234${i}5</code></td>
                                <td><span class="badge badge-secondary">Google</span></td>
                                <td class="message-text">Your verification code is ${456120 + i}</td>
                                <td>Route-B3</td>
                                <td><span class="badge badge-success">Delivered</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
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

        const providers = ['SMPP-A1', 'Direct-Carrier', 'Gate-V4', 'Nexmo-Up'];
        const apps = ['Microsoft', 'Amazon', 'WhatsApp', 'Apple', 'Uber'];

        this._interval = setInterval(() => {
            if (!document.getElementById('test-live-body')) {
                clearInterval(this._interval);
                return;
            }
            const row = document.createElement('tr');
            const prov = providers[Math.floor(Math.random() * providers.length)];
            const app = apps[Math.floor(Math.random() * apps.length)];
            row.innerHTML = `
                <td style="font-size:11px">${new Date().toLocaleTimeString()}</td>
                <td><span style="font-weight:600">${prov}</span></td>
                <td>US-Mobile</td>
                <td><span class="badge badge-secondary">${app}</span></td>
                <td class="message-text">Security code: ${Math.floor(100000 + Math.random() * 900000)}</td>
            `;
            if (body.querySelector('.empty-row')) body.innerHTML = '';
            body.insertBefore(row, body.firstChild);
            if (body.children.length > 15) body.lastChild.remove();
        }, 2000);
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
        setTimeout(() => {
            const ctx = document.getElementById('test-traffic-chart')?.getContext('2d');
            if (!ctx) return;
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['12:00', '12:10', '12:20', '12:30', '12:40', '12:50'],
                    datasets: [{
                        label: 'SMS Volume',
                        data: [65, 59, 80, 81, 56, 55],
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
        }, 100);
    },

    async renderProviderMonitor(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Infrastructure Provider Status</div></div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Provider ID</th><th>Gateway</th><th>Type</th><th>Latency</th><th>Status</th></tr></thead>
                    <tbody>
                        <tr><td><strong>SMPP-Tier1</strong></td><td>94.24.114.43</td><td>SMPP</td><td>120ms</td><td><span class="badge badge-success">ONLINE</span></td></tr>
                        <tr><td><strong>Cloud-Web-2</strong></td><td>https://api.cloudsms.io</td><td>HTTP</td><td>450ms</td><td><span class="badge badge-success">ONLINE</span></td></tr>
                        <tr><td><strong>Backup-Gate</strong></td><td>10.0.5.12</td><td>SMPP</td><td>-</td><td><span class="badge badge-danger">OFFLINE</span></td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    async renderRangeTester(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Range Delivery Tester</div></div>
            <div class="card-body" style="padding:20px">
                <div class="form-row">
                    <div class="form-group"><label>Select App</label><input type="text" class="fly-input" placeholder="e.g. WhatsApp"></div>
                    <div class="form-group"><label>Select Range</label><select class="fly-input"><option>US-Mobile</option></select></div>
                </div>
                <button class="fly-btn">Trigger Test Request</button>
            </div>
        </div>`;
    }
};

window.testPanel = testPanel;
