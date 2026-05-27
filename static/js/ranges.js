const ranges = {
    async renderRanges(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call('/api/ranges?limit=20');
            const rows = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">SMS Ranges & Inventory</div>
                    <button class="fly-btn fly-btn-sm" onclick="window.ranges.showAddModal()">Add New Range</button>
                </div>
                <div class="filter-bar">
                    <input type="text" class="search-input" placeholder="Search ranges by name or prefix..." id="ranges-search">
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Name</th><th>Prefix</th><th>Country</th><th>Rate</th><th>Numbers</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody id="ranges-tbody">
                            ${rows.length ? rows.map(r => `
                                <tr>
                                    <td style="font-weight:700">${r.name}</td>
                                    <td><code>${r.number_prefix || ''}</code></td>
                                    <td>${r.country_name || r.country_code || '-'}</td>
                                    <td>$${r.rate}</td>
                                    <td>${r._count?.numbers || 0}</td>
                                    <td><span class="badge ${r.status === 'active' ? 'badge-success' : 'badge-danger'}">${r.status}</span></td>
                                    <td class="actions-cell">
                                        <button class="action-btn" onclick="window.ranges.edit('${r.id}')">${ICONS.edit}</button>
                                        <button class="action-btn delete" onclick="window.ranges.delete('${r.id}')">${ICONS.trash}</button>
                                    </td>
                                </tr>
                            `).join('') : '<tr class="empty-row"><td colspan="7">No ranges found</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>`;
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    },

    showAddModal() {
        const body = `
            <div class="form-group"><label>Range Name</label><input type="text" id="rng-name" class="fly-input" placeholder="e.g. US-Premium"></div>
            <div class="form-group"><label>Prefix</label><input type="text" id="rng-prefix" class="fly-input" placeholder="e.g. +1"></div>
            <div class="form-row">
                <div class="form-group"><label>Country Code</label><input type="text" id="rng-cc" class="fly-input" placeholder="US"></div>
                <div class="form-group"><label>Rate ($)</label><input type="number" id="rng-rate" class="fly-input" step="0.0001" value="0.05"></div>
            </div>`;
        const footer = `<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button><button class="fly-btn" onclick="window.ranges.save()">Save Range</button>`;
        window.ui.showModal('Add New Range', body, footer);
    },

    async save() {
        const payload = {
            name: document.getElementById('rng-name').value,
            numberPrefix: document.getElementById('rng-prefix').value,
            countryCode: document.getElementById('rng-cc').value,
            rate: parseFloat(document.getElementById('rng-rate').value)
        };
        try {
            await window.api.call('/api/ranges', { method: 'POST', body: JSON.stringify(payload) });
            window.ui.showToast('Range saved successfully', 'success');
            window.ui.closeModal();
            window.router.resolvePage(document.getElementById('page-content'));
        } catch (err) {
            window.ui.showToast(err.message, 'error');
        }
    }
};

window.ranges = ranges;
