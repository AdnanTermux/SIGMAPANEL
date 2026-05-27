const numbers = {
    async renderMyNumbers(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call('/api/numbers?limit=20');
            const rows = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">My Assigned Numbers</div>
                    <div class="card-header-actions">
                        <button class="fly-btn fly-btn-sm" onclick="window.numbers.export('csv')">CSV Export</button>
                        <button class="fly-btn fly-btn-sm secondary" onclick="window.numbers.export('xlsx')">Excel Export</button>
                    </div>
                </div>
                <div class="filter-bar">
                    <input type="text" class="search-input" placeholder="Search my numbers..." id="my-nums-search">
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Number</th><th>Range</th><th>Service</th><th>Assigned</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${rows.length ? rows.map(n => `
                                <tr>
                                    <td><code style="font-weight:700">${n.number}</code></td>
                                    <td><span class="badge badge-secondary">${n.range_name || '-'}</span></td>
                                    <td>${n.service ? `<span class="badge badge-primary">${n.service}</span>` : '-'}</td>
                                    <td style="font-size:12px">${window.ui.formatDate(n.assigned_at)}</td>
                                    <td><span class="badge ${n.status === 'active' ? 'badge-success' : 'badge-danger'}">${n.status}</span></td>
                                    <td class="actions-cell">
                                        <button class="action-btn" onclick="window.numbers.revoke('${n.id}')">Revoke</button>
                                    </td>
                                </tr>
                            `).join('') : '<tr class="empty-row"><td colspan="6">No numbers assigned to your account</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>`;
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    },

    async renderSelfAllocation(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call('/api/ranges?status=active');
            const ranges = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Self Allocation - Active Ranges</div></div>
                <div style="display:grid; gap:16px; padding:20px">
                    ${ranges.map(r => `
                        <div class="stat-card" style="display:flex; justify-content:space-between; align-items:center">
                            <div>
                                <h3 style="margin:0">${r.name}</h3>
                                <p style="margin:4px 0; color:var(--text-secondary)">Rate: $${r.rate} | Available: ${r._count?.available || 0}</p>
                            </div>
                            <button class="fly-btn fly-btn-sm" onclick="window.numbers.showAllocateModal('${r.name}', ${r._count?.available || 0})">Allocate Now</button>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div id="modal-root"></div>`;
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    },

    showAllocateModal(rangeName, available) {
        const root = document.getElementById('modal-root');
        root.innerHTML = `
        <div class="modal-overlay" id="alloc-overlay">
            <div class="modal" style="max-width:400px">
                <div class="modal-header">
                    <div class="modal-title">Allocate from ${rangeName}</div>
                    <button class="modal-close" onclick="document.getElementById('modal-root').innerHTML=''">${ICONS.x}</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Quantity (Max: ${available})</label>
                        <input type="number" id="alloc-qty" class="fly-input" min="1" max="${available}" value="1">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="fly-btn secondary" onclick="document.getElementById('modal-root').innerHTML=''">Cancel</button>
                    <button class="fly-btn" onclick="window.numbers.doAllocate('${rangeName}')">Allocate</button>
                </div>
            </div>
        </div>`;
    },

    async doAllocate(rangeName) {
        const qty = document.getElementById('alloc-qty').value;
        try {
            await window.api.call('/api/numbers-ext/allocate', {
                method: 'POST',
                body: JSON.stringify({ rangeName, quantity: parseInt(qty) })
            });
            window.ui.showToast(`Allocated ${qty} numbers from ${rangeName}`, 'success');
            document.getElementById('modal-root').innerHTML = '';
            window.router.navigateTo('my-numbers');
        } catch (err) {
            window.ui.showToast(err.message, 'error');
        }
    },

    async revoke(id) {
        if (!confirm('Are you sure you want to revoke this number?')) return;
        try {
            await window.api.call(`/api/numbers/${id}/revoke`, { method: 'POST' });
            window.ui.showToast('Number revoked successfully', 'success');
            window.router.resolvePage(document.getElementById('page-content'));
        } catch (err) {
            window.ui.showToast(err.message, 'error');
        }
    },

    async export(format) {
        window.ui.showToast(`Exporting as ${format.toUpperCase()}...`, 'info');
        // Implementation for actual file download would go here
    },

    async renderBulkAllocation(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Bulk Resource Allocation</div></div>
            <div class="card-body" style="padding:20px">
                <div class="form-group">
                    <label>Select Target Users</label>
                    <select id="bulk-users" class="fly-input" multiple style="height:100px">
                        <option value="all">All Users</option>
                        <option value="resellers">All Resellers</option>
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Range to Allocate</label>
                        <select id="bulk-range" class="fly-input"></select>
                    </div>
                    <div class="form-group">
                        <label>Quantity per User</label>
                        <input type="number" id="bulk-qty" class="fly-input" value="10">
                    </div>
                </div>
                <button class="fly-btn" onclick="window.numbers.doBulkAllocate()" style="width:100%">Execute Bulk Allocation</button>
            </div>
        </div>`;
        this.loadBulkRanges();
    },

    async loadBulkRanges() {
        const select = document.getElementById('bulk-range');
        if (!select) return;
        try {
            const data = await window.api.call('/api/ranges');
            select.innerHTML = (data.data || []).map(r => `<option value="${r.id}">${r.name}</option>`).join('');
        } catch (e) {}
    },

    async doBulkAllocate() {
        window.ui.showToast('Bulk allocation started...', 'info');
    },

    async renderGlobalRevoke(container) {
        container.innerHTML = `
        <div class="card" style="border:1px solid var(--danger)">
            <div class="card-header" style="background:rgba(239, 68, 68, 0.05)">
                <div class="card-title" style="color:var(--danger)">Global Revoke Tools</div>
            </div>
            <div class="card-body" style="padding:20px">
                <p style="color:var(--text-secondary); margin-bottom:20px">Emergency tools to reclaim numbers from all accounts. Use with extreme caution.</p>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px">
                    <div class="stat-card">
                        <h4 style="margin-bottom:10px">Revoke by Range</h4>
                        <select id="revoke-range" class="fly-input" style="margin-bottom:10px"></select>
                        <button class="fly-btn fly-btn-danger" style="width:100%" onclick="window.numbers.doGlobalRevoke('range')">Revoke Range</button>
                    </div>
                    <div class="stat-card">
                        <h4 style="margin-bottom:10px">Revoke all Numbers</h4>
                        <p style="font-size:12px; margin-bottom:10px">Reclaim every assigned number globally.</p>
                        <button class="fly-btn fly-btn-danger" style="width:100%" onclick="window.numbers.doGlobalRevoke('all')">Emergency Purge</button>
                    </div>
                </div>
            </div>
        </div>`;
        const sel = document.getElementById('revoke-range');
        if (sel) {
            const data = await window.api.call('/api/ranges');
            sel.innerHTML = (data.data || []).map(r => `<option value="${r.id}">${r.name}</option>`).join('');
        }
    },

    async doGlobalRevoke(mode) {
        if (!confirm('CRITICAL ACTION: Are you absolutely sure? This will impact all customers.')) return;
        window.ui.showToast('Executing global revoke...', 'warning');
    },

    async renderLiveAccess(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Live Number Activity</div></div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Number</th><th>Current Status</th><th>Last Event</th><th>Throughput</th></tr></thead>
                    <tbody>
                        <tr><td><code>+12025550123</code></td><td><span class="badge badge-success">ACTIVE</span></td><td>Incoming SMS</td><td>0.5/s</td></tr>
                        <tr><td><code>+447911123456</code></td><td><span class="badge badge-warning">IDLE</span></td><td>Keep-alive</td><td>0.0/s</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    async renderUpload(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Upload & Import Numbers</div></div>
            <div class="card-body" style="padding:20px">
                <div class="form-group">
                    <label>Paste Numbers (one per line)</label>
                    <textarea class="fly-input" style="height:200px" placeholder="+1234567890\n+1987654321"></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Country</label><input type="text" class="fly-input"></div>
                    <div class="form-group"><label>Range Mapping</label><select class="fly-input"><option>Auto-detect</option></select></div>
                </div>
                <button class="fly-btn">Process Upload</button>
            </div>
        </div>`;
    },

    async renderBlacklist(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-title">App & Service Blacklist</div>
                <button class="fly-btn fly-btn-sm">Add Rule</button>
            </div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>App Name</th><th>Pattern</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                        <tr><td>Telegram</td><td><code>telegram|tg</code></td><td><span class="badge badge-danger">BLOCKED</span></td><td><button class="action-btn">Edit</button></td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
    }
};

window.numbers = numbers;
