const testPanel = {
    async renderTestNumbers(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/numbers/test-panel');
            const data = res.data || [];
            const grouped = data.reduce((acc, n) => {
                if (!acc[n.range_name]) acc[n.range_name] = [];
                acc[n.range_name].push(n);
                return acc;
            }, {});
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Live Telecom Test Inventory</div></div>
                <div class="card-body">
                    ${Object.keys(grouped).map(range => `
                        <div class="range-group" style="margin-bottom:24px">
                            <h4 style="background:var(--bg-page); padding:10px 16px; border-radius:8px; border-left:4px solid var(--primary); margin-bottom:12px">${range}</h4>
                            <div class="table-wrapper"><table class="fly-table"><thead><tr><th>Number</th><th>Rate</th><th>Status</th></tr></thead><tbody>
                                ${grouped[range].map(n => `<tr><td><code>${n.number}</code></td><td>$${n.rate}</td><td><span class="badge badge-success">READY</span></td></tr>`).join('')}
                            </tbody></table></div>
                        </div>`).join('') || '<div class="empty-state">No test numbers found</div>'}
                </div>
                <div style="padding:24px; border-top:1px solid var(--border)">
                    <h4>Session Monitoring Numbers</h4>
                    <p style="font-size:12px; color:var(--text-secondary); margin-bottom:12px">Paste numbers here to track in real-time during this session.</p>
                    <textarea id="tp-paste" class="fly-input" rows="4" placeholder="+1234567890\n+9876543210"></textarea>
                    <button class="fly-btn fly-btn-sm" style="margin-top:8px" onclick="window.testPanel.saveSessionNumbers()">Add to Session</button>
                </div>
            </div>`;
        } catch (e) { container.innerHTML = '<p>Error: ' + e.message + '</p>'; }
    },
    async saveSessionNumbers() {
        const text = document.getElementById('tp-paste').value;
        if (!text.trim()) return window.ui.showToast('Please enter numbers', 'error');
        try {
            await window.api.call('/api/numbers-ext/bulk-import', { method: 'POST', body: JSON.stringify({ numbersText: text, rangeName: 'TEST_SESSION' }) });
            window.ui.showToast('Numbers added to infrastructure', 'success');
            document.getElementById('tp-paste').value = '';
            this.renderTestNumbers(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },
    async renderTestReports(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call('/api/sms?limit=50');
            container.innerHTML = `
            <div class="card"><div class="card-header"><div class="card-title">Test Signal Reports</div></div><div class="table-wrapper"><table class="fly-table"><thead><tr><th>Time</th><th>Target</th><th>CLI (Masked)</th><th>Content</th></tr></thead><tbody>
                ${data.data.map(s => `<tr><td>${window.ui.formatDate(s.received_at)}</td><td><code>${s.number}</code></td><td><span class="badge badge-secondary">${window.ui.maskService(s.service)}</span></td><td class="message-text">${window.ui.escapeHtml(s.message)}</td></tr>`).join('') || '<tr class="empty-row"><td colspan="4">No reports</td></tr>'}
            </tbody></table></div></div>`;
        } catch (e) { container.innerHTML = '<p>Error: ' + e.message + '</p>'; }
    },
    async renderLiveFeed(container) {
        container.innerHTML = `
        <div class="card"><div class="card-header"><div class="card-title">Live Test Feed (Masked)</div><div class="badge badge-success">STREAM ACTIVE</div></div><div class="table-wrapper"><table class="fly-table"><thead><tr><th>Time</th><th>Target</th><th>CLI</th><th>OTP</th></tr></thead><tbody id="test-live-body"><tr class="empty-row"><td colspan="4">Listening...</td></tr></tbody></table></div></div>`;
        this.startLiveFeed();
    },
    startLiveFeed() {
        this.stopLiveFeed();
        this._feedInterval = setInterval(async () => {
            const body = document.getElementById('test-live-body');
            if (!body) { this.stopLiveFeed(); return; }
            try {
                const res = await window.api.call('/api/sms?limit=10');
                if (res.data.length) {
                    body.innerHTML = res.data.map(s => `<tr><td>${window.ui.formatDate(s.received_at)}</td><td><code>${s.number}</code></td><td><span class="badge badge-secondary">${window.ui.maskService(s.service)}</span></td><td><span class="otp-code">${s.otp || '-'}</span></td></tr>`).join('');
                }
            } catch (e) {}
        }, 5000);
    },
    stopLiveFeed() { if (this._feedInterval) clearInterval(this._feedInterval); },
    async renderTrafficStats(container) {
        container.innerHTML = '<div class="card"><div class="card-header"><div class="card-title">Signal Traffic Stats</div></div><div style="padding:24px; height:300px"><canvas id="test-tp-chart"></canvas></div></div>';
        setTimeout(async () => {
            try {
                const stats = await window.api.call('/api/dashboard/stats');
                const ctx = document.getElementById('test-tp-chart')?.getContext('2d');
                if (ctx) new Chart(ctx, { type: 'line', data: { labels: stats.weekSmsByDay.map(d => d.date.slice(5)), datasets: [{ label: 'Signals', data: stats.weekSmsByDay.map(d => d.count), borderColor: '#735DFF' }] }, options: { responsive: true, maintainAspectRatio: false } });
            } catch (e) {}
        }, 100);
    }
};
window.testPanel = testPanel;
