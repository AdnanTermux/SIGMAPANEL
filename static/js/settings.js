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
        </div>`;
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
