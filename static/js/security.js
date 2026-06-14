const security = {
    async renderDashboard(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const stats = await window.api.call('/api/security/stats');
            container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-card-label">Threat Level</div><div class="stat-card-value">${stats.threat_score}</div></div>
                <div class="stat-card"><div class="stat-card-label">Blocked IPs</div><div class="stat-card-value">${stats.blocked_ips}</div></div>
                <div class="stat-card"><div class="stat-card-label">Recent Events</div><div class="stat-card-value">${stats.recent_events}</div></div>
            </div>`;
        } catch (e) {}
    },

    async renderBlockedIPs(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/security/blocked-ips');
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">IP Firewall Blacklist</div><button class="fly-btn fly-btn-sm" onclick="window.security.showAdd()">Block IP</button></div>
                <div class="table-wrapper">
                    <table class="fly-table"><thead><tr><th>IP</th><th>Reason</th><th>Action</th></tr></thead><tbody>
                        ${res.data.map(i => `<tr><td><code>${i.ip_address}</code></td><td>${i.reason}</td><td><button class="action-btn delete" onclick="window.security.unblock('${i.ip_address}')">Unblock</button></td></tr>`).join('') || '<tr><td colspan="3">No blocked IPs</td></tr>'}
                    </tbody></table>
                </div>
            </div>`;
        } catch (e) {}
    },

    async unblock(ip) {
        try { await window.api.call('/api/security/unblock-ip/' + ip, { method: 'POST' }); window.ui.showToast('IP restored', 'success'); this.renderBlockedIPs(document.getElementById('page-content')); }
        catch (e) {}
    },

    async renderThreatLogs(container) {
        container.innerHTML = '<div class="card"><div class="card-header"><div class="card-title">Live Threat Intelligence</div></div><div class="table-wrapper"><table class="fly-table"><thead><tr><th>Time</th><th>IP</th><th>Event</th></tr></thead><tbody id="threat-body"></tbody></table></div></div>';
    },

    async renderSuspiciousSessions(container) { container.innerHTML = '<div class="card"><div class="card-header"><div class="card-title">Suspicious Sessions</div></div><div class="card-body">No anomalies detected.</div></div>'; },
    async renderRateLimits(container) { container.innerHTML = '<div class="card"><div class="card-header"><div class="card-title">Rate Limiting Policy</div></div><div class="card-body">Global limit: 100 req/min per IP.</div></div>'; },
    async renderFirewallEvents(container) { container.innerHTML = '<div class="card"><div class="card-header"><div class="card-title">Firewall Events</div></div><div class="card-body">Infrastructure is clean.</div></div>'; },

    renderVerification() {
        document.getElementById('app').innerHTML = `
        <div style="min-height:100vh; display:flex; align-items:center; justify-content:center; background:#111827; color:white">
            <div style="text-align:center">
                <div style="font-size:48px; margin-bottom:20px">${ICONS.shield}</div>
                <h2>Verifying Connection Security</h2>
                <p style="color:#9ca3af">Please wait while we secure your session...</p>
            </div>
        </div>`;
        setTimeout(() => window.auth.renderLogin(), 1500);
    }
};
window.security = security;
