const testPanel = {
    async renderTestNumbers(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-title">SMS Test Numbers</div>
                <div class="card-header-actions">
                    <button class="fly-btn fly-btn-sm" onclick="window.ui.showToast('Copied','success')">Copy</button>
                    <button class="fly-btn fly-btn-sm secondary">CSV</button>
                    <button class="fly-btn fly-btn-sm secondary">Excel</button>
                </div>
            </div>
            <div class="filter-bar">
                <select class="filter-select" style="min-width:200px">
                    <option>All Ranges</option>
                    <option>US-Mobile</option>
                    <option>UK-Premium</option>
                </select>
                <input type="text" class="search-input" placeholder="Search number...">
            </div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead>
                        <tr>
                            <th>Range</th>
                            <th>Prefix</th>
                            <th>Test Number</th>
                            <th>Payout</th>
                            <th>Limits</th>
                            <th>Status</th>
                            <th>Provider</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${[1,2,3,4,5,6,7,8,9,10].map(i => `
                            <tr>
                                <td>US-Mobile</td>
                                <td><code>+1</code></td>
                                <td style="font-weight:700">+12345678${i}</td>
                                <td>$0.05</td>
                                <td>10/day</td>
                                <td><span class="badge badge-success">Active</span></td>
                                <td>Primary-SMPP</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    async renderTestReports(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">SMS Test Reports</div></div>
            <div class="filter-bar">
                <input type="date" class="filter-select">
                <input type="text" class="search-input" placeholder="Search CLI or Number...">
                <button class="fly-btn">Filter</button>
            </div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Range</th>
                            <th>Number</th>
                            <th>CLI</th>
                            <th>SMS</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="empty-row"><td colspan="6">No test reports available for this period</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    async renderLiveFeed(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Live Test OTP Feed</div></div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Time</th><th>Range</th><th>Number</th><th>Service</th><th>OTP</th></tr></thead>
                    <tbody>
                        <tr><td>10:45:12</td><td>US-Mobile</td><td>+12025550125</td><td>Google</td><td><span class="otp-code">554212</span></td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    async renderRangeTester(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Range Delivery Tester</div></div>
            <div class="card-body" style="padding:20px">
                <div class="form-row">
                    <div class="form-group"><label>Select App</label><input type="text" class="fly-input" placeholder="e.g. WhatsApp"></div>
                    <div class="form-group"><label>Select Range</label><select class="fly-input"><option>US-Mobile</option></select></div>
                </div>
                <button class="fly-btn">Trigger Test Request</button>
            </div>
        </div>`;
    }
};

window.testPanel = testPanel;
