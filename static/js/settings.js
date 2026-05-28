const settings = {
    async renderGeneral(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">General Platform Settings</div></div>
            <div class="card-body" style="padding:20px">
                <div class="form-group">
                    <label>Platform Name</label>
                    <input type="text" class="fly-input" value="SIGMAPANEL">
                </div>
                <div class="form-group">
                    <label>Support Email</label>
                    <input type="email" class="fly-input" value="support@sigmapanel.com">
                </div>
                <div class="form-group">
                    <label>Default Payout Threshold ($)</label>
                    <input type="number" class="fly-input" value="50">
                </div>
                <button class="fly-btn">Save Changes</button>
            </div>
        </div>

        <div class="card" style="margin-top:24px">
            <div class="card-header"><div class="card-title">Registration & Signup Controls</div></div>
            <div class="card-body" style="padding:20px">
                <div class="form-row">
                    <div class="form-group">
                        <label>Public Signup Status</label>
                        <select id="set-signup-enabled" class="fly-input">
                            <option value="true">ENABLED - Public registration open</option>
                            <option value="false">DISABLED - Show contact info</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Daily Signup Limit</label>
                        <input type="number" id="set-signup-limit" class="fly-input" value="50">
                    </div>
                </div>
                <div class="form-group">
                    <label>WhatsApp Contact (When off)</label>
                    <input type="text" id="set-contact-whatsapp" class="fly-input" placeholder="+923000767749">
                </div>
                <div class="form-group">
                    <label>MS Teams Email (When off)</label>
                    <input type="email" id="set-contact-teams" class="fly-input" placeholder="adnanman2026@outlook.com">
                </div>
                <div class="form-group">
                    <label>Telegram Username (When off)</label>
                    <input type="text" id="set-contact-telegram" class="fly-input" placeholder="@sigmapanel">
                </div>
                <button class="fly-btn" onclick="window.settings.saveSignupSettings()">Save Signup Settings</button>
            </div>
        </div>`;
        this.loadSignupSettings();
    },

    async loadSignupSettings() {
        try {
            const res = await window.api.call('/api/settings');
            res.data.forEach(s => {
                const el = document.getElementById(`set-${s.setting_key.replace(/_/g, '-')}`);
                if (el) el.value = s.setting_value;
            });
        } catch (e) {}
    },

    async saveSignupSettings() {
        const keys = ['signup_enabled', 'signup_daily_limit', 'contact_whatsapp', 'contact_teams', 'contact_telegram'];
        try {
            for (const k of keys) {
                const val = document.getElementById(`set-${k.replace(/_/g, '-')}`).value;
                await window.api.call('/api/settings', {
                    method: 'POST',
                    body: JSON.stringify({ key: k, value: val })
                });
            }
            window.ui.showToast('Signup settings updated successfully', 'success');
        } catch (err) {
            window.ui.showToast(err.message, 'error');
        }
    },

    async renderNotifications(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Notification Channels & Alerts</div></div>
            <div class="card-body" style="padding:20px">
                <div class="form-group">
                    <label><input type="checkbox" checked> Enable Email Alerts</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" checked> Telegram Bot Notifications</label>
                </div>
                <div class="form-group">
                    <label>Telegram Bot Token</label>
                    <input type="password" class="fly-input" value="********">
                </div>
                <button class="fly-btn">Update Preferences</button>
            </div>
        </div>`;
    }
};

window.settings = settings;
