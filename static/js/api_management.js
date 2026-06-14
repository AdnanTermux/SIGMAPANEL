const apiManagement = {
    async renderPlayground(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call('/api/api-management/my-token');
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">API Playground</div></div>
                <div class="card-body">
                    <div class="form-group"><label>API Token</label><input type="text" class="fly-input" readonly value="${data.token}"></div>
                    <div class="form-group"><label>Endpoint</label><input type="text" class="fly-input" readonly value="${window.location.origin}${data.api_base}"></div>
                    <p style="font-size:12px; color:var(--text-secondary)">Use POST to send SMS from your provider to us. Supported fields: to, from, msg.</p>
                </div>
            </div>`;
        } catch (e) {}
    },

    async renderTokens(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/api-management/my-token');
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">My API Access Tokens</div><button class="fly-btn fly-btn-sm" onclick="window.apiManagement.regen()">Regenerate</button></div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Name</th><th>Token</th><th>Status</th></tr></thead>
                        <tbody><tr><td>Default Gateway</td><td><code>${res.token}</code></td><td><span class="badge badge-success">ACTIVE</span></td></tr></tbody>
                    </table>
                </div>
            </div>`;
        } catch (e) {}
    },

    async regen() {
        if (confirm('Rotate token?')) {
            try { await window.api.call('/api/api-management/regenerate-token', { method: 'POST' }); window.ui.showToast('Token rotated', 'success'); this.renderTokens(document.getElementById('page-content')); }
            catch (e) {}
        }
    },

    async renderLiveTest(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">API Integration Tester</div></div>
            <div class="card-body">
                <div class="form-group"><label>Target Number</label><input type="text" id="sim-to" class="fly-input" placeholder="+1234567890"></div>
                <div class="form-group"><label>Message</label><textarea id="sim-msg" class="fly-input" rows="3">Test SMS Content</textarea></div>
                <button class="fly-btn" style="width:100%" onclick="window.apiManagement.sim()">Simulate Webhook POST</button>
            </div>
        </div>`;
    },

    async sim() {
        const payload = { to: document.getElementById('sim-to').value, from: 'SIGMATEST', msg: document.getElementById('sim-msg').value };
        try { await window.api.call('/api/webhook/receive', { method: 'POST', body: JSON.stringify(payload) }); window.ui.showToast('Simulated incoming SMS processed', 'success'); }
        catch (e) { window.ui.showToast(e.message, 'error'); }
    }
};
window.apiManagement = apiManagement;
