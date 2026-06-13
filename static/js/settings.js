const settings = {
    async renderGeneral(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">System Configuration</div></div>
            <div class="card-body">
                <div class="form-group"><label>Platform Name</label><input type="text" id="set-pn" class="fly-input" value="SIGMAPANEL"></div>
                <div class="form-group">
                    <label>Registration Status</label>
                    <select id="set-se" class="fly-input"><option value="true">Open</option><option value="false">Closed</option></select>
                </div>
                <button class="fly-btn" onclick="window.settings.save()">Save Platform Config</button>
            </div>
        </div>`;
        this.load();
    },

    async load() {
        try {
            const res = await window.api.call('/api/settings');
            res.data.forEach(s => {
                if (s.setting_key === 'signup_enabled') document.getElementById('set-se').value = s.setting_value;
            });
        } catch (e) {}
    },

    async save() {
        try {
            await window.api.call('/api/settings', { method: 'POST', body: JSON.stringify({ key: 'signup_enabled', value: document.getElementById('set-se').value }) });
            window.ui.showToast('Settings updated', 'success');
        } catch (e) {}
    },

    async renderDocumentation(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Developer Hub & Integration</div></div>
            <div class="card-body">
                <h3>Webhook SMS Gateway</h3>
                <p>To receive SMS via HTTP POST, point your provider callback to:</p>
                <div style="background:var(--bg-page); padding:16px; border-radius:8px; margin:16px 0">
                    <code>${window.location.origin}/api/webhook/receive</code>
                </div>
                <h5>Required Parameters</h5>
                <ul>
                    <li><code>to</code>: Destination number</li>
                    <li><code>from</code>: Sender ID</li>
                    <li><code>msg</code>: SMS Content</li>
                </ul>
            </div>
        </div>`;
    },

    async renderSmppSettings(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">SMPP Infrastructure Settings</div></div>
            <div class="card-body">
                <p>Standard Port: <strong>2775</strong></p>
                <p>Version: <strong>SMPP v3.4</strong></p>
                <div class="form-group"><label>System ID Prefix</label><input type="text" class="fly-input" value="SIGMA_" readonly></div>
            </div>
        </div>`;
    },

    async renderQueueSettings(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Task Queue Monitoring</div></div>
            <div class="card-body">
                <div style="display:flex; justify-content:space-between; margin-bottom:12px"><span>Redis Status</span> <span class="badge badge-success">ACTIVE</span></div>
                <div style="display:flex; justify-content:space-between; margin-bottom:12px"><span>Pending Jobs</span> <span class="badge badge-secondary">0</span></div>
            </div>
        </div>`;
    },

    async renderNotifications(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Notification Channels</div></div>
            <div class="card-body">
                <div class="form-group"><label><input type="checkbox" checked disabled> System Email Alerts</label></div>
                <div class="form-group"><label><input type="checkbox" disabled> Telegram Bot Notifications</label></div>
            </div>
        </div>`;
    },

    async renderBackupRestore(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Disaster Recovery</div></div>
            <div class="card-body">
                <button class="fly-btn fly-btn-secondary" onclick="window.ui.showToast('Backup scheduled','info')">Trigger Full SQL Snapshot</button>
            </div>
        </div>`;
    },

    async renderSecurity(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Account Security Profile</div></div>
            <div class="card-body">
                <div class="form-group"><label>New Password</label><input type="password" id="s-np" class="fly-input" placeholder="Leave blank to keep current"></div>
                <button class="fly-btn" onclick="window.settings.updatePass()">Update Security Details</button>
            </div>
        </div>`;
    },

    async updatePass() {
        const pass = document.getElementById('s-np').value;
        if (!pass) return;
        try {
            await window.api.call('/api/users/' + window.auth.getUser().id, { method: 'PUT', body: JSON.stringify({ password: pass }) });
            window.ui.showToast('Password updated', 'success');
            document.getElementById('s-np').value = '';
        } catch (e) {}
    },

    async renderWebhookConfig(container) { this.renderDocumentation(container); }
};
window.settings = settings;
