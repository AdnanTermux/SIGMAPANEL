const apiManagement = {
    async renderPlayground(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">API Playground & Tester</div></div>
            <div class="card-body" style="padding:20px">
                <div class="form-group">
                    <label>Base URL</label>
                    <input type="text" class="fly-input" value="${window.location.origin}/api" readonly style="background:#f1f5f9">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Endpoint</label>
                        <select id="pg-endpoint" class="fly-input">
                            <option value="/numbers">GET /numbers (List Numbers)</option>
                            <option value="/sms">GET /sms (List SMS)</option>
                            <option value="/auth/me">GET /auth/me (Profile)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Token</label>
                        <input type="text" class="fly-input" value="YOUR_API_TOKEN" readonly>
                    </div>
                </div>
                <div class="form-group">
                    <label>Action</label>
                    <button class="fly-btn fly-btn-secondary" onclick="window.apiManagement.regenToken()">Regenerate Token</button>
                </div>
                <button class="fly-btn" onclick="window.apiManagement.testRequest()" style="width:100%">Execute Live Request</button>

                <div style="margin-top:24px">
                    <label>JSON Response</label>
                    <pre style="background:#0f172a; color:#38bdf8; padding:16px; border-radius:8px; font-size:12px; height:200px; overflow:auto" id="pg-response">{ "status": "waiting" }</pre>
                </div>
            </div>
        </div>`;
    },

    async testRequest() {
        const ep = document.getElementById('pg-endpoint').value;
        const resEl = document.getElementById('pg-response');
        resEl.textContent = 'Loading...';
        try {
            const data = await window.api.call(`/api${ep}`);
            resEl.textContent = JSON.stringify(data, null, 2);
            window.ui.showToast('Request successful', 'success');
        } catch (e) {
            resEl.textContent = `Error: ${e.message}`;
            window.ui.showToast('Request failed', 'error');
        }
    },

    async regenToken() {
        if (!confirm('This will invalidate your current token. Continue?')) return;
        try {
            const data = await window.api.call('/api/api-management/regenerate-token', { method: 'POST' });
            window.ui.showToast('New token generated', 'success');
            window.router.resolvePage(document.getElementById('page-content'));
        } catch (err) { window.ui.showToast(err.message, 'error'); }
    },

    async renderTokens(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Manage API Tokens</div></div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Label</th><th>Token Preview</th><th>Created</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                        <tr>
                            <td>Default Production Token</td>
                            <td><code>sig_live_************</code></td>
                            <td>2026-05-27</td>
                            <td><span class="badge badge-success">Active</span></td>
                            <td><button class="action-btn delete">Revoke</button></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div style="padding:20px"><button class="fly-btn" onclick="window.ui.showToast('Feature coming soon', 'info')">Create New Token</button></div>
        </div>`;
    },

    async renderLiveTest(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Live API Test Center</div></div>
            <div class="card-body" style="padding:24px">
                <p style="color:var(--text-secondary); margin-bottom:20px">Send a test OTP to verify your integration end-to-end.</p>
                <div class="form-group"><label>Target Phone Number</label><input type="text" class="fly-input" placeholder="+12025550123"></div>
                <div class="form-group"><label>Service/App Name</label><input type="text" class="fly-input" placeholder="MyAwesomeApp"></div>
                <button class="fly-btn" onclick="window.ui.showToast('Test SMS queued', 'success')">Send Test SMS</button>
            </div>
        </div>`;
    }
};

window.apiManagement = apiManagement;
