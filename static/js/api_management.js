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
        } catch (e) { resEl.textContent = `Error: ${e.message}`; }
    }
};

window.apiManagement = apiManagement;
