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

        try {
            const res = await window.api.call('/api/ranges?search=' + encodeURIComponent(query));
            const ranges = res.data || [];
            results.innerHTML = `
            <h4 style="margin-bottom:16px">Ranges providing traffic for "${query}"</h4>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Range Name</th><th>Country</th><th>Availability</th><th>Success Rate</th><th>Status</th></tr></thead>
                    <tbody>
                        ${ranges.map(r => `
                            <tr>
                                <td>${r.name}</td>
                                <td>${r.country_name || r.country_code || '-'}</td>
                                <td><span style="color:var(--success); font-weight:700">${r._count?.available || 0}</span></td>
                                <td>99.9%</td>
                                <td><span class="badge badge-success">Active</span></td>
                            </tr>
                        `).join('')}
                        ${ranges.length === 0 ? '<tr><td colspan="5">No ranges found matching your search.</td></tr>' : ''}
                    </tbody>
                </table>
            </div>`;
        } catch (e) {
            results.innerHTML = '<div class="empty-state"><p>Infrastructure search failed. Please try again.</p></div>';
        }
    },

    async renderRangeSearch(container) {
        try {
            const res = await window.api.call('/api/ranges');
            const ranges = res.data || [];
            container.innerHTML = `
            <div class="form-group">
                <label>Select Range to Inspect</label>
                <select class="fly-input" id="range-search-select" onchange="window.searchAccess.doRangeSearch(this.value)">
                    <option value="">-- Choose Range --</option>
                    ${ranges.map(r => `<option value="\${r.id}">\${r.name}</option>`).join('')}
                </select>
            </div>
            <div id="range-search-results" style="margin-top:24px"></div>`;
        } catch (e) { container.innerHTML = '<p>Error loading ranges</p>'; }
    },

    async doRangeSearch(rangeId) {
        if (!rangeId) return;
        const results = document.getElementById('range-search-results');
        results.innerHTML = '<div class="spinner" style="margin:20px auto"></div>';

        try {
            const res = await window.api.call('/api/ranges/' + rangeId);
            const r = res.data;
            results.innerHTML = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:24px">
                <div class="stat-card">
                    <div class="stat-card-label">Range Success Rate</div>
                    <div class="stat-card-value">99.9%</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-label">Available Inventory</div>
                    <div class="stat-card-value">${r._count?.available || 0}</div>
                </div>
            </div>
            <h4 style="margin-bottom:12px">Supported App Services</h4>
            <div class="service-list">
                <div class="service-chip">Global A2P <span class="badge badge-success">99%</span></div>
                <div class="service-chip">WhatsApp <span class="badge badge-success">98%</span></div>
                <div class="service-chip">Google <span class="badge badge-success">97%</span></div>
            </div>`;
        } catch (e) { results.innerHTML = '<p>Failed to load range details.</p>'; }
    }
};

window.searchAccess = searchAccess;
