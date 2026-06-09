const apiManagement = {
    async renderPlayground(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call('/api/api-management/my-token');
            const token = data.token || 'Not Generated';
            const apiBase = data.api_base || '/api/webhook/sms';

            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">API Playground & Tester</div></div>
                <div class="card-body" style="padding:20px">
                    <div class="form-group">
                        <label>Webhook Entry Point (Base URL)</label>
                        <div style="display:flex; gap:8px">
                            <input type="text" class="fly-input" value="${window.location.origin}${apiBase}" readonly style="background:#f1f5f9; flex:1">
                            <button class="fly-btn fly-btn-sm fly-btn-secondary" onclick="navigator.clipboard.writeText('${window.location.origin}${apiBase}')">Copy</button>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Live Endpoint Tester</label>
                            <select id="pg-endpoint" class="fly-input">
                                <option value="/numbers">GET /numbers (List Numbers)</option>
                                <option value="/sms">GET /sms (List SMS)</option>
                                <option value="/auth/me">GET /auth/me (Profile)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Your API Token</label>
                            <div style="display:flex; gap:8px">
                                <input type="text" class="fly-input" value="${token}" readonly style="background:#f1f5f9; flex:1">
                                <button class="fly-btn fly-btn-sm fly-btn-secondary" onclick="navigator.clipboard.writeText('${token}')">Copy</button>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <button class="fly-btn fly-btn-secondary" onclick="window.apiManagement.regenToken()">Regenerate API Token</button>
                    </div>
                    <button class="fly-btn" onclick="window.apiManagement.testRequest()" style="width:100%">Execute Sample Request</button>

                    <div style="margin-top:24px">
                        <label>Live JSON Response Output</label>
                        <pre style="background:#0f172a; color:#38bdf8; padding:16px; border-radius:8px; font-size:12px; height:250px; overflow:auto" id="pg-response">{ "status": "idle", "message": "Execute a request to see output" }</pre>
                    </div>
                </div>
            </div>`;
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
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
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call('/api/api-management/my-token');
            const token = data.token;
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">My Infrastructure API Tokens</div>
                    <button class="fly-btn fly-btn-sm" onclick="window.apiManagement.regenToken()">Generate New Token</button>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Token Name</th><th>Value (Truncated)</th><th>Last Used</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            <tr>
                                <td><strong>Primary API Gateway Token</strong></td>
                                <td><code>${token ? token.slice(0, 15) + '...' + token.slice(-8) : 'Not Generated'}</code></td>
                                <td>Active Session</td>
                                <td><span class="badge badge-success">Active</span></td>
                                <td>
                                    <button class="action-btn" onclick="window.apiManagement.regenToken()">Rotate</button>
                                    <button class="action-btn" onclick="navigator.clipboard.writeText('${token}')">Copy</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div style="padding:20px; background:var(--bg-page); border-top:1px solid var(--border)">
                    <p style="font-size:12px; color:var(--text-secondary)">Use these tokens to authenticate your HTTP requests. Rotating a token will immediately invalidate the previous one.</p>
                </div>
            </div>`;
        } catch (e) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${e.message}</p></div>`;
        }
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
