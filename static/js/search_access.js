const searchAccess = {
    async render(container) {
        container.innerHTML = `
        <div class="card" style="margin-bottom:20px">
            <div class="card-header"><div class="card-title">Search Access & Availability</div></div>
            <div style="padding:20px">
                <div style="display:flex; gap:10px; margin-bottom:20px">
                    <button class="fly-btn" id="btn-search-app" onclick="window.searchAccess.setMode('app')">Search by Service/App</button>
                    <button class="fly-btn secondary" id="btn-search-range" onclick="window.searchAccess.setMode('range')">Search by Range</button>
                </div>

                <div id="search-interface-container">
                    <!-- Dynamic search interface -->
                </div>
            </div>
        </div>
        <div id="search-results-container"></div>`;

        this.setMode('app');
    },

    setMode(mode) {
        const container = document.getElementById('search-interface-container');
        if (!container) return;

        const btnApp = document.getElementById('btn-search-app');
        const btnRange = document.getElementById('btn-search-range');

        if (mode === 'app') {
            btnApp.classList.remove('secondary');
            btnRange.classList.add('secondary');
            container.innerHTML = `
                <div class="form-group">
                    <label>Enter Service Name (e.g. WhatsApp, TikTok)</label>
                    <div style="display:flex; gap:10px">
                        <input type="text" id="app-search-query" class="fly-input" placeholder="Search app...">
                        <button class="fly-btn" onclick="window.searchAccess.doAppSearch()">Search</button>
                    </div>
                </div>`;
        } else {
            btnApp.classList.add('secondary');
            btnRange.classList.remove('secondary');
            container.innerHTML = `
                <div class="form-group">
                    <label>Select Range</label>
                    <div style="display:flex; gap:10px">
                        <select id="range-search-select" class="fly-input">
                            <option value="">Loading ranges...</option>
                        </select>
                        <button class="fly-btn" onclick="window.searchAccess.doRangeSearch()">Check Access</button>
                    </div>
                </div>`;
            this.loadRanges();
        }
    },

    async loadRanges() {
        const select = document.getElementById('range-search-select');
        try {
            const data = await window.api.call('/api/ranges');
            select.innerHTML = (data.data || []).map(r => `<option value="${r.id}">${r.name}</option>`).join('');
        } catch (e) { select.innerHTML = '<option>Error loading</option>'; }
    },

    async doAppSearch() {
        const q = document.getElementById('app-search-query').value;
        const results = document.getElementById('search-results-container');
        results.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

        // Mocking behavior for demonstration
        setTimeout(() => {
            results.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Top Ranges for "${q}"</div></div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Range</th><th>Success Rate</th><th>Availability</th><th>Action</th></tr></thead>
                        <tbody>
                            <tr>
                                <td>US-Mobile-01</td>
                                <td><span class="badge badge-success">98%</span></td>
                                <td>High</td>
                                <td><button class="fly-btn fly-btn-sm" onclick="window.router.navigateTo('self-allocation')">Allocate</button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>`;
        }, 800);
    },

    async doRangeSearch() {
        const rid = document.getElementById('range-search-select').value;
        // Mock range details
        const results = document.getElementById('search-results-container');
        results.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Supported Apps for selected Range</div></div>
            <div class="card-body" style="padding:20px">
                <div class="service-list">
                    <span class="service-chip">WhatsApp <span class="service-chip-count">✓</span></span>
                    <span class="service-chip">Google <span class="service-chip-count">✓</span></span>
                    <span class="service-chip">Telegram <span class="service-chip-count">✓</span></span>
                    <span class="service-chip" style="opacity:0.5">TikTok <span class="service-chip-count" style="color:var(--danger)">X</span></span>
                </div>
            </div>
        </div>`;
    }
};

window.searchAccess = searchAccess;
