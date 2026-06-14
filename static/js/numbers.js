const numbers = {
    async renderMyNumbers(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/numbers?limit=50');
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">My Virtual Numbers</div>
                    <div class="card-header-actions" style="display:flex; gap:8px">
                        <button class="fly-btn fly-btn-sm" onclick="window.numbers.export('csv')">Export CSV</button>
                    </div>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Number</th><th>Range</th><th>App</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>${res.data.map(n => `<tr><td><code>${n.number}</code></td><td>${n.range_name}</td><td>${n.service || '-'}</td><td><span class="badge ${n.status === 'active' ? 'badge-success' : 'badge-danger'}">${n.status}</span></td><td><button class="action-btn" onclick="window.numbers.revoke('${n.id}')">Revoke</button></td></tr>`).join('') || '<tr><td colspan="5">No numbers assigned</td></tr>'}</tbody>
                    </table>
                </div>
            </div>`;
        } catch (e) { container.innerHTML = '<p>Error loading numbers</p>'; }
    },

    async revoke(id) {
        if (confirm('Revoke this number?')) {
            try { await window.api.call(`/api/numbers/${id}/revoke`, { method: 'POST' }); window.ui.showToast('Number revoked', 'success'); this.renderMyNumbers(document.getElementById('page-content')); }
            catch (e) { window.ui.showToast(e.message, 'error'); }
        }
    },

    async export(format) {
        window.location.href = '/api/numbers-ext/export?format=' + format;
        window.ui.showToast('Generating export file...', 'info');
    },

    async renderSelfAllocation(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/ranges?status=active');
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Self-Allocation Marketplace</div></div>
                <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:16px; padding:20px">
                    ${res.data.map(r => `
                        <div class="stat-card" style="display:flex; flex-direction:column; gap:12px">
                            <h3 style="margin:0">${r.name}</h3>
                            <div style="display:flex; justify-content:space-between"><span>Price:</span> <strong>$${r.rate}</strong></div>
                            <div style="display:flex; justify-content:space-between"><span>Available:</span> <strong style="color:var(--success)">${r._count.available}</strong></div>
                            <button class="fly-btn" onclick="window.numbers.showAllocModal('${r.name}', ${r._count.available})">Allocate</button>
                        </div>
                    `).join('')}
                </div>
            </div>`;
        } catch (e) {}
    },

    showAllocModal(range, available) {
        window.ui.showModal('Allocate from ' + range, `
            <div class="form-group"><label>Quantity (Max: ${available})</label><input type="number" id="al-qty" class="fly-input" value="1" min="1" max="${available}"></div>
            <div class="form-group"><label>Duration</label><select id="al-dur" class="fly-input"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly" selected>Monthly</option></select></div>
        `, '<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button><button class="fly-btn" onclick="window.numbers.doAllocate(\''+range+'\')">Confirm</button>');
    },

    async doAllocate(range) {
        const qty = parseInt(document.getElementById('al-qty').value);
        try {
            await window.api.call('/api/numbers-ext/allocate', { method: 'POST', body: JSON.stringify({ rangeName: range, quantity: qty, duration: document.getElementById('al-dur').value }) });
            window.ui.showToast('Numbers allocated', 'success');
            window.ui.closeModal();
            this.renderMyNumbers(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async renderBulkAllocation(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const [users, ranges] = await Promise.all([window.api.call('/api/users?limit=100'), window.api.call('/api/ranges')]);
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Bulk Infrastructure Allocation</div></div>
                <div class="card-body">
                    <div class="form-group"><label>Target User</label><select id="ba-user" class="fly-input">${users.data.map(u => `<option value="${u.id}">${u.username} (${u.role})</option>`).join('')}</select></div>
                    <div class="form-row">
                        <div class="form-group"><label>Range</label><select id="ba-range" class="fly-input">${ranges.data.map(r => `<option value="${r.name}">${r.name} (${r._count.available} avail)</option>`).join('')}</select></div>
                        <div class="form-group"><label>Quantity</label><input type="number" id="ba-qty" class="fly-input" value="10"></div>
                    </div>
                    <button class="fly-btn" style="width:100%" onclick="window.numbers.doBulkAlloc()">Execute Allocation</button>
                </div>
            </div>`;
        } catch (e) {}
    },

    async doBulkAlloc() {
        const payload = { userId: document.getElementById('ba-user').value, rangeName: document.getElementById('ba-range').value, quantity: parseInt(document.getElementById('ba-qty').value) };
        try { await window.api.call('/api/numbers-ext/bulk-allocate', { method: 'POST', body: JSON.stringify(payload) }); window.ui.showToast('Bulk allocation completed', 'success'); }
        catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async renderLiveAccess(container) {
        container.innerHTML = `<div class="card"><div class="card-header"><div class="card-title">Real-Time Traffic Stream</div></div><div class="table-wrapper"><table class="fly-table"><thead><tr><th>Time</th><th>Target</th><th>App</th><th>Msg</th></tr></thead><tbody id="la-body"></tbody></table></div></div>`;
        this.startLiveAccess();
    },

    startLiveAccess() {
        this.stopLiveAccess();
        this._laInterval = setInterval(async () => {
            const body = document.getElementById('la-body');
            if (!body) { this.stopLiveAccess(); return; }
            try {
                const res = await window.api.call('/api/sms?limit=10');
                body.innerHTML = res.data.map(s => `<tr><td>${window.ui.formatDate(s.received_at)}</td><td><code>${s.number}</code></td><td>${s.service}</td><td class="message-text">${s.message}</td></tr>`).join('') || '<tr><td colspan="4">No traffic</td></tr>';
            } catch (e) {}
        }, 5000);
    },

    stopLiveAccess() { if (this._laInterval) clearInterval(this._laInterval); },

    async renderUpload(container) {
        container.innerHTML = '<div class="card"><div class="card-header"><div class="card-title">Bulk Import Numbers</div></div><div class="card-body"><textarea id="up-text" class="fly-input" rows="8" placeholder="+1234567890\n+9876543210"></textarea><button class="fly-btn" style="width:100%; margin-top:16px" onclick="window.numbers.doUpload()">Start Import</button></div></div>';
    },

    async doUpload() {
        const text = document.getElementById('up-text').value;
        try { await window.api.call('/api/numbers-ext/bulk-import', { method: 'POST', body: JSON.stringify({ numbersText: text }) }); window.ui.showToast('Import successful', 'success'); document.getElementById('up-text').value = ''; }
        catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async renderBlacklist(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/numbers-ext/blacklist');
            container.innerHTML = `<div class="card"><div class="card-header"><div class="card-title">Global App Blacklist</div><button class="fly-btn fly-btn-sm" onclick="window.numbers.showAddBl()">Add App</button></div><div class="table-wrapper"><table class="fly-table"><thead><tr><th>App</th><th>Pattern</th><th>Action</th></tr></thead><tbody>${res.data.map(b => `<tr><td>${b.app_name}</td><td><code>${b.pattern}</code></td><td><button class="action-btn delete" onclick="window.numbers.delBl('${b.id}')">${ICONS.trash}</button></td></tr>`).join('') || '<tr><td colspan="3">No rules</td></tr>'}</tbody></table></div></div>`;
        } catch (e) {}
    },

    async renderBulkTools(container) {
        container.innerHTML = `<div class="card"><div class="card-header"><div class="card-title">Emergency Bulk Revocation</div></div><div class="card-body"><button class="fly-btn fly-btn-danger" style="width:100%" onclick="window.numbers.doEmergencyRevoke()">REVOKE ALL NUMBERS GLOBALLY</button></div></div>`;
    },

    async doEmergencyRevoke() {
        if (confirm('DANGER: This will unassign ALL numbers from ALL users. Continue?')) {
            try { await window.api.call('/api/numbers-ext/bulk-revoke', { method: 'POST', body: JSON.stringify({ scope: 'global' }) }); window.ui.showToast('Infrastructure reset successful', 'success'); }
            catch (e) { window.ui.showToast(e.message, 'error'); }
        }
    }
};
window.numbers = numbers;
