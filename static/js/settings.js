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
    },

    async renderSecurity(container) {
        const user = window.auth.getUser();
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">My Profile & Account Information</div></div>
            <div class="card-body" style="padding:24px">
                <div class="form-row">
                    <div class="form-group">
                        <label>Username</label>
                        <input type="text" class="fly-input" value="${user.username}" disabled>
                        <small style="color:var(--text-secondary)">Username cannot be changed</small>
                    </div>
                    <div class="form-group">
                        <label>Email Address</label>
                        <input type="email" id="my-email" class="fly-input" value="${user.email || ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Full Name</label>
                        <input type="text" id="my-fullname" class="fly-input" value="${user.full_name || ''}">
                    </div>
                    <div class="form-group">
                        <label>Phone Number</label>
                        <input type="text" id="my-phone" class="fly-input" value="${user.phone || ''}">
                    </div>
                </div>
                <button class="fly-btn" onclick="window.settings.updateProfile()">Save Profile Details</button>
            </div>
        </div>

        <div class="card" style="margin-top:24px">
            <div class="card-header"><div class="card-title">Security & Password Management</div></div>
            <div class="card-body" style="padding:24px">
                <div class="form-group">
                    <label>New Password</label>
                    <input type="password" id="my-new-password" class="fly-input" placeholder="Enter new password to change">
                </div>
                <div class="form-group">
                    <label>Confirm New Password</label>
                    <input type="password" id="my-confirm-password" class="fly-input" placeholder="Repeat new password">
                </div>
                <button class="fly-btn secondary" onclick="window.settings.updatePassword()">Update Password</button>
            </div>
        </div>`;
    },

    async updateProfile() {
        const userId = window.auth.getUser().id;
        const email = document.getElementById('my-email').value;
        const fullName = document.getElementById('my-fullname').value;
        const phone = document.getElementById('my-phone').value;

        try {
            const res = await window.api.call(\`/api/users/\${userId}\`, {
                method: 'PUT',
                body: JSON.stringify({ email, fullName, phone })
            });
            localStorage.setItem('user', JSON.stringify(res.data));
            window.ui.showToast('Profile updated successfully', 'success');
        } catch (err) { window.ui.showToast(err.message, 'error'); }
    },

    async updatePassword() {
        const userId = window.auth.getUser().id;
        const password = document.getElementById('my-new-password').value;
        const confirm = document.getElementById('my-confirm-password').value;

        if (!password) return window.ui.showToast('Please enter a new password', 'error');
        if (password !== confirm) return window.ui.showToast('Passwords do not match', 'error');

        try {
            await window.api.call(\`/api/users/\${userId}\`, {
                method: 'PUT',
                body: JSON.stringify({ password })
            });
            window.ui.showToast('Password updated successfully', 'success');
            document.getElementById('my-new-password').value = '';
            document.getElementById('my-confirm-password').value = '';
        } catch (err) { window.ui.showToast(err.message, 'error'); }
    },

    async renderDocumentation(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">API & Infrastructure Documentation</div></div>
            <div class="card-body" style="padding:24px">
                <h3>Base URL</h3>
                <div class="code-block" style="background:var(--bg-page); padding:12px; border-radius:6px; margin-bottom:20px">
                    <code>${window.location.origin}/api/webhook/receive</code>
                </div>
                <h3>Quick Integration</h3>
                <p>To receive SMS via HTTP, configure your provider to send a GET/POST request to our webhook endpoint with the following parameters:</p>
                <ul>
                    <li><code>to</code>: Your virtual number</li>
                    <li><code>from</code>: Sender ID / CLI</li>
                    <li><code>msg</code>: Message content</li>
                    <li><code>secret_token</code>: Your account API token</li>
                </ul>
            </div>
        </div>`;
    },

    async renderWebhookConfig(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Outgoing Webhook Configuration</div></div>
            <div class="card-body" style="padding:24px">
                <p style="color:var(--text-secondary); margin-bottom:20px">Configure your system to receive real-time POST requests whenever a new SMS arrives for your numbers.</p>
                <div class="form-group">
                    <label>Webhook URL</label>
                    <input type="url" class="fly-input" placeholder="https://your-domain.com/callback">
                </div>
                <div class="form-group">
                    <label>Secret Key (Optional)</label>
                    <input type="text" class="fly-input" placeholder="Custom header secret">
                </div>
                <button class="fly-btn">Save Configuration</button>
            </div>
        </div>`;
    }
};

window.settings = settings;
