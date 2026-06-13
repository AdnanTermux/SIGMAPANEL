const searchAccess = {
    async render(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Infrastructure Search Access</div></div>
            <div class="card-body">
                <div class="form-group"><label>Search App or Service</label><input type="text" id="sa-q" class="fly-input" placeholder="e.g. WhatsApp, Google, TikTok"></div>
                <button class="fly-btn" onclick="window.searchAccess.doSearch()">Find Supported Ranges</button>
            </div>
            <div id="sa-res" class="table-wrapper"></div>
        </div>`;
    },

    async doSearch() {
        const q = document.getElementById('sa-q').value;
        const resDiv = document.getElementById('sa-res');
        resDiv.innerHTML = '<div class="spinner"></div>';
        try {
            const res = await window.api.call('/api/ranges?search=' + encodeURIComponent(q));
            resDiv.innerHTML = `
            <table class="fly-table">
                <thead><tr><th>Range</th><th>Country</th><th>Price</th><th>Availability</th></tr></thead>
                <tbody>${res.data.map(r => `<tr><td>${r.name}</td><td>${r.country_name}</td><td>$${r.rate}</td><td>${r._count.available}</td></tr>`).join('') || '<tr><td colspan="4">No ranges found</td></tr>'}</tbody>
            </table>`;
        } catch (e) { resDiv.innerHTML = '<p>Search failed</p>'; }
    }
};
window.searchAccess = searchAccess;
