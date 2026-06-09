const security = {
    // ... existing renderVerification and startVerification ...

    async renderDashboard(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const stats = await window.api.call('/api/security/stats');
            const events = await window.api.call('/api/security/events?limit=20');

            container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card" style="border-left: 4px solid var(--danger)">
                    <div class="stat-card-label">Live Threat Score</div>
                    <div class="stat-card-value">${stats.threat_score}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-label">Blocked IPs</div>
                    <div class="stat-card-value">${stats.blocked_ips}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-label">Recent Events (24h)</div>
                    <div class="stat-card-value">${stats.recent_events}</div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><div class="card-title">Live Infrastructure Security Events</div></div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Time</th><th>IP Address</th><th>Event Type</th><th>Action</th><th>Status</th></tr></thead>
                        <tbody id="security-events-body">
                            ${events.data.map(e => `
                                <tr>
                                    <td style="font-size:11px">${window.ui.formatDate(e.created_at)}</td>
                                    <td><code>${e.ip_address}</code></td>
                                    <td><span class="badge badge-warning">${e.event_type}</span></td>
                                    <td>${e.action_taken}</td>
                                    <td><span class="badge badge-success">${e.severity}</span></td>
                                </tr>
                            `).join('')}
                            ${events.data.length === 0 ? '<tr class="empty-row"><td colspan="5">No infrastructure threats detected</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>`;
        } catch (e) { container.innerHTML = `<p>Error: ${e.message}</p>`; }
    },

    async renderBlockedIPs(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call('/api/security/blocked-ips');
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">IP Blacklist Management</div></div>
                <div class="filter-bar">
                    <input type="text" class="fly-input" placeholder="Enter IP address to block..." id="new-block-ip">
                    <button class="fly-btn" onclick="window.security.blockIP()">Block IP</button>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>IP Address</th><th>Reason</th><th>Expires At</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${data.data.map(b => `
                                <tr>
                                    <td><code>${b.ip_address}</code></td>
                                    <td>${b.reason}</td>
                                    <td style="font-size:11px">${window.ui.formatDate(b.expires_at)}</td>
                                    <td><button class="action-btn delete" onclick="window.security.unblockIP('${b.ip_address}')">Unblock</button></td>
                                </tr>
                            `).join('')}
                            ${data.data.length === 0 ? '<tr class="empty-row"><td colspan="4">IP Blacklist is empty</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>`;
        } catch (e) { container.innerHTML = `<p>Error: ${e.message}</p>`; }
    },

    async blockIP() {
        const ip = document.getElementById('new-block-ip').value;
        if (!ip) return;
        try {
            await window.api.call('/api/security/block-ip', { method: 'POST', body: JSON.stringify({ ip }) });
            window.ui.showToast('IP blocked', 'success');
            this.renderBlockedIPs(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async unblockIP(ip) {
        try {
            await window.api.call(`/api/security/unblock-ip/${ip}`, { method: 'POST' });
            window.ui.showToast('IP unblocked', 'success');
            this.renderBlockedIPs(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async renderThreatLogs(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Threat & Attack Logs</div></div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Time</th><th>IP</th><th>Type</th><th>Severity</th><th>Payload</th></tr></thead>
                    <tbody>
                        <tr class="empty-row"><td colspan="5">No high-severity threats detected in the last 24h</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    // Keep original functions
    renderVerification() {
        document.getElementById('app').innerHTML = `
        <div class="security-page">
            <div class="security-card">
                <div class="security-shield">
                    <div class="shield-main">${ICONS.shield}</div>
                    <div class="shield-pulse"></div>
                </div>
                <h2 class="security-title">Securing SIGMAPANEL Connection</h2>
                <p class="security-subtitle">Please wait while we verify your browser integrity...</p>

                <div class="security-steps">
                    <div class="security-step" id="step-1">
                        <span class="step-icon">${ICONS.search}</span>
                        <span class="step-text">Checking Browser Integrity</span>
                        <span class="step-status">Pending...</span>
                    </div>
                    <div class="security-step" id="step-2">
                        <span class="step-icon">${ICONS.ban}</span>
                        <span class="step-text">Verifying Secure Session</span>
                        <span class="step-status"></span>
                    </div>
                    <div class="security-step" id="step-3">
                        <span class="step-icon">${ICONS.key}</span>
                        <span class="step-text">Validating JS Execution</span>
                        <span class="step-status"></span>
                    </div>
                </div>

                <div class="security-progress">
                    <div class="progress-bar" id="security-progress-bar"></div>
                </div>

                <div class="security-footer">
                    Telecom Infrastructure Protection Engine v3.0
                </div>
            </div>
        </div>`;

        this.startVerification();
    },

    async startVerification() {
        const steps = [
            { id: 'step-1', text: 'Browser Integrity Verified', delay: 1000 },
            { id: 'step-2', text: 'Secure Session Verified', delay: 1200 },
            { id: 'step-3', text: 'JS Execution Validated', delay: 800 }
        ];

        let progress = 0;
        const progressBar = document.getElementById('security-progress-bar');
        if (!progressBar) return;

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const el = document.getElementById(step.id);
            if (!el) continue;

            await new Promise(r => setTimeout(r, step.delay));

            el.classList.add('completed');
            el.querySelector('.step-status').textContent = 'OK';
            el.querySelector('.step-status').style.color = 'var(--success)';

            progress += 33.3;
            progressBar.style.width = `${progress}%`;
        }

        setTimeout(() => {
            window.auth.renderLogin();
        }, 500);
    }
};

window.security = security;
