const searchAccess = {
    async render(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Search Infrastructure Access</div></div>
            <div style="padding:20px; border-bottom:1px solid var(--border)">
                <div class="search-modes" style="display:flex; gap:12px">
                    <button class="fly-btn" id="mode-app-btn" onclick="window.searchAccess.setMode('app')">Search by App/Service</button>
                    <button class="fly-btn fly-btn-secondary" id="mode-range-btn" onclick="window.searchAccess.setMode('range')">Search by Range</button>
                </div>
            </div>

            <div id="search-content" style="padding:24px">
                <!-- Dynamic content -->
            </div>
        </div>`;
        this.setMode('app');
    },

    setMode(mode) {
        const appBtn = document.getElementById('mode-app-btn');
        const rangeBtn = document.getElementById('mode-range-btn');
        const content = document.getElementById('search-content');
        if (!content) return;

        if (mode === 'app') {
            appBtn.className = 'fly-btn';
            rangeBtn.className = 'fly-btn fly-btn-secondary';
            this.renderAppSearch(content);
        } else {
            appBtn.className = 'fly-btn fly-btn-secondary';
            rangeBtn.className = 'fly-btn';
            this.renderRangeSearch(content);
        }
    },

    renderAppSearch(container) {
        container.innerHTML = `
        <div class="form-group">
            <label>Search for Application or Service</label>
            <input type="text" class="search-input" id="app-search-input" placeholder="e.g. Google, WhatsApp, Telegram..." style="width:100%">
        </div>
        <div id="app-search-results" style="margin-top:24px">
            <div class="empty-state">
                <p>Enter an application name to find supported ranges and success rates.</p>
            </div>
        </div>`;

        const input = document.getElementById('app-search-input');
        input.addEventListener('input', window.ui.debounce(() => this.doAppSearch(input.value), 500));
    },

    async doAppSearch(query) {
        if (!query) return;
        const results = document.getElementById('app-search-results');
        results.innerHTML = '<div class="spinner" style="margin:20px auto"></div>';

        // Mocking results
        setTimeout(() => {
            results.innerHTML = `
            <h4 style="margin-bottom:16px">Top Supported Ranges for "${query}"</h4>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Range Name</th><th>Country</th><th>Availability</th><th>Success Rate</th><th>Status</th></tr></thead>
                    <tbody>
                        <tr><td>US-Mobile-A1</td><td>USA</td><td><span style="color:var(--success); font-weight:700">1,240</span></td><td>98.2%</td><td><span class="badge badge-success">High Stability</span></td></tr>
                        <tr><td>UK-Premium-G2</td><td>UK</td><td><span style="color:var(--success); font-weight:700">850</span></td><td>94.5%</td><td><span class="badge badge-primary">Active</span></td></tr>
                        <tr><td>GER-Direct-V1</td><td>Germany</td><td><span style="color:var(--danger); font-weight:700">12</span></td><td>89.1%</td><td><span class="badge badge-warning">Low Inventory</span></td></tr>
                    </tbody>
                </table>
            </div>`;
        }, 800);
    },

    renderRangeSearch(container) {
        container.innerHTML = `
        <div class="form-group">
            <label>Select Range to Inspect</label>
            <select class="fly-input" id="range-search-select" onchange="window.searchAccess.doRangeSearch(this.value)">
                <option value="">-- Choose Range --</option>
                <option value="US-Mobile">US-Mobile</option>
                <option value="UK-Premium">UK-Premium</option>
            </select>
        </div>
        <div id="range-search-results" style="margin-top:24px"></div>`;
    },

    async doRangeSearch(range) {
        if (!range) return;
        const results = document.getElementById('range-search-results');
        results.innerHTML = '<div class="spinner" style="margin:20px auto"></div>';

        setTimeout(() => {
            results.innerHTML = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:24px">
                <div class="stat-card">
                    <div class="stat-card-label">Range Success Rate</div>
                    <div class="stat-card-value">96.8%</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-label">Traffic Intensity</div>
                    <div class="stat-card-value">Medium</div>
                </div>
            </div>
            <h4 style="margin-bottom:12px">Supported Apps & Blacklist Indicators</h4>
            <div class="service-list">
                <div class="service-chip">Google <span class="badge badge-success">99%</span></div>
                <div class="service-chip">WhatsApp <span class="badge badge-success">98%</span></div>
                <div class="service-chip">Facebook <span class="badge badge-success">97%</span></div>
                <div class="service-chip">Telegram <span class="badge badge-danger">BLOCKED</span></div>
                <div class="service-chip">Discord <span class="badge badge-warning">LOCKED</span></div>
            </div>`;
        }, 600);
    }
};

window.searchAccess = searchAccess;
