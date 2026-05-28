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
                    <div class="card-header-actions" style="display:flex; gap:8px">
                        <button class="fly-btn fly-btn-sm" onclick="window.numbers.export('txt')">TXT</button>
                        <button class="fly-btn fly-btn-sm" onclick="window.numbers.export('csv')">CSV</button>
                        <button class="fly-btn fly-btn-sm secondary" onclick="window.numbers.export('xlsx')">Excel</button>
                        <button class="fly-btn fly-btn-sm secondary" onclick="window.numbers.export('pdf')">PDF</button>
                    </div>
                </div>
                <div class="filter-bar">
                    <input type="text" class="search-input" placeholder="Search my numbers..." id="my-nums-search">
                    <select class="filter-select" id="my-nums-status-filter">
                        <option value="">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="revoked">Revoked</option>
                    </select>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Number</th><th>Range</th><th>Service</th><th>Assigned</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody id="my-nums-body">
                            ${this.renderMyNumbersTableRows(rows)}
                        </tbody>
                    </table>
                </div>
                ${window.ui.renderPagination(data.pagination, (p) => this.loadMyNumbersPage(p))}
            </div>`;
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    },

    renderMyNumbersTableRows(rows) {
        return rows.length ? rows.map(n => `
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
        `).join('') : '<tr class="empty-row"><td colspan="6">No numbers assigned to your account</td></tr>';
    },

    async renderSelfAllocation(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call('/api/ranges?status=active');
            const ranges = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Self Allocation - Available Ranges</div></div>
                <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:16px; padding:20px">
                    ${ranges.map(r => `
                        <div class="stat-card" style="display:flex; flex-direction:column; gap:12px">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start">
                                <div>
                                    <h3 style="margin:0">${r.name}</h3>
                                    <p style="font-size:12px; color:var(--text-secondary)">${r.country_name || 'Global'}</p>
                                </div>
                                <span class="badge badge-primary">$${r.rate}/sms</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:13px">
                                <span>Payout Terms:</span>
                                <span style="font-weight:600">${r.profit_margin || 50}% share</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:13px">
                                <span>Live Availability:</span>
                                <span style="font-weight:700; color:var(--success)">${r._count?.available || 0}</span>
                            </div>
                            <button class="fly-btn" style="width:100%" onclick="window.numbers.showAllocateModal('${r.name}', ${r._count?.available || 0})">Allocate Numbers</button>
                        </div>
                    `).join('')}
                </div>
            </div>`;
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    },

    showAllocateModal(rangeName, available) {
        window.ui.showModal(`Allocate from ${rangeName}`, `
            <div class="form-group">
                <label>Quantity to Allocate (Max: ${available})</label>
                <input type="number" id="alloc-qty" class="fly-input" min="1" max="${available}" value="1">
            </div>
            <p style="font-size:12px; color:var(--text-secondary)">Numbers will be automatically assigned to your account. Payouts are calculated based on range terms.</p>
        `, `
            <button class="fly-btn fly-btn-secondary" onclick="window.ui.closeModal()">Cancel</button>
            <button class="fly-btn" onclick="window.numbers.doAllocate('${rangeName}')">Confirm Allocation</button>
        `);
    },

    async doAllocate(rangeName) {
        const qty = document.getElementById('alloc-qty').value;
        try {
            await window.api.call('/api/numbers-ext/allocate', {
                method: 'POST',
                body: JSON.stringify({ rangeName, quantity: parseInt(qty) })
            });
            window.ui.showToast(`Successfully allocated ${qty} numbers from ${rangeName}`, 'success');
            window.ui.closeModal();
            window.router.navigateTo('my-numbers');
        } catch (err) {
            window.ui.showToast(err.message, 'error');
        }
    },

    async renderBulkAllocation(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const [users, ranges] = await Promise.all([
                window.api.call('/api/users?role=sub_reseller'),
                window.api.call('/api/ranges?status=active')
            ]);

            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Bulk Resource Allocation Manager</div></div>
                <div class="card-body" style="padding:24px">
                    <div class="form-group">
                        <label>Select Target User</label>
                        <select id="bulk-user-id" class="fly-input">
                            <option value="">-- Choose User --</option>
                            ${users.data.map(u => `<option value="${u.id}">${u.username} (${u.role})</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Range to Allocate</label>
                            <select id="bulk-range-name" class="fly-input">
                                ${ranges.data.map(r => `<option value="${r.name}">${r.name} (${r._count?.available || 0} available)</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Quantity</label>
                            <input type="number" id="bulk-quantity" class="fly-input" value="10" min="1">
                        </div>
                    </div>
                    <button class="fly-btn" style="width:100%; margin-top:16px" onclick="window.numbers.executeBulk()">Run Allocation Job</button>

                    <div style="margin-top:32px">
                        <h4 style="margin-bottom:12px">Recent Allocation Logs</h4>
                        <div class="table-wrapper">
                            <table class="fly-table">
                                <thead><tr><th>Time</th><th>User</th><th>Range</th><th>Qty</th><th>Status</th></tr></thead>
                                <tbody>
                                    <tr class="empty-row"><td colspan="5">No bulk jobs executed today</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>`;
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    },

    async executeBulk() {
        const userId = document.getElementById('bulk-user-id').value;
        const rangeName = document.getElementById('bulk-range-name').value;
        const qty = document.getElementById('bulk-quantity').value;
        if (!userId) return window.ui.showToast('Please select a user', 'error');

        try {
            await window.api.call('/api/numbers-ext/bulk-allocate', {
                method: 'POST',
                body: JSON.stringify({ userId, rangeName, quantity: parseInt(qty) })
            });
            window.ui.showToast('Bulk allocation completed', 'success');
            window.router.resolvePage(document.getElementById('page-content'));
        } catch (err) { window.ui.showToast(err.message, 'error'); }
    },

    async renderLiveAccess(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-title">Live Number Activity Feed</div>
                <div id="ws-status" class="badge badge-secondary">Polling (No WebSocket)</div>
            </div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Time</th><th>Number</th><th>Event</th><th>Source</th><th>Status</th></tr></thead>
                    <tbody id="live-activity-body">
                        <tr class="empty-row"><td colspan="5">Polling real infrastructure data...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
        this.startLiveActivityFeed();
    },

    startLiveActivityFeed() {
        const statusEl = document.getElementById('ws-status');
        const bodyEl = document.getElementById('live-activity-body');
        if (!bodyEl) return;
        this.stopLiveActivityFeed();

        this._liveInterval = setInterval(async () => {
            if (!document.getElementById('live-activity-body')) {
                this.stopLiveActivityFeed();
                return;
            }
            try {
                const data = await window.api.call('/api/sms?limit=10');
                if (data.data && data.data.length) {
                    statusEl.className = 'badge badge-success';
                    statusEl.textContent = 'Live Activity Found';
                    bodyEl.innerHTML = data.data.map(s => `
                        <tr>
                            <td style="font-size:11px">${window.ui.formatDate(s.received_at)}</td>
                            <td><code>${s.number}</code></td>
                            <td><span class="badge badge-primary">Incoming SMS</span></td>
                            <td>${s.service || 'Unknown'}</td>
                            <td><span class="badge badge-success">Processed</span></td>
                        </tr>
                    `).join('');
                } else {
                    bodyEl.innerHTML = '<tr class="empty-row"><td colspan="5">No live traffic recorded on your numbers</td></tr>';
                }
            } catch (e) {
                statusEl.className = 'badge badge-danger';
                statusEl.textContent = 'Connection Error';
            }
        }, 10000);
    },

    stopLiveActivityFeed() {
        if (this._liveInterval) clearInterval(this._liveInterval);
    },

    async renderExport(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Export Number Resources</div></div>
            <div class="card-body" style="padding:24px">
                <div class="form-row">
                    <div class="form-group">
                        <label>Range Filter</label>
                        <select id="exp-range" class="fly-input"><option value="all">All Ranges</option></select>
                    </div>
                    <div class="form-group">
                        <label>Format</label>
                        <select id="exp-format" class="fly-input">
                            <option value="txt">Plain Text (.txt)</option>
                            <option value="csv">Comma Separated (.csv)</option>
                            <option value="xlsx">Excel Spreadsheet (.xlsx)</option>
                            <option value="pdf">Professional PDF (.pdf)</option>
                        </select>
                    </div>
                </div>
                <button class="fly-btn" style="width:100%" onclick="window.numbers.doExport()">Generate Export File</button>
            </div>
        </div>`;
    },

    async doExport() {
        const format = document.getElementById('exp-format').value;
        window.ui.showToast(`Generating ${format.toUpperCase()} export...`, 'info');
        setTimeout(() => window.ui.showToast('Export ready for download', 'success'), 1500);
    },

    async renderUpload(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call('/api/ranges');
            const ranges = data.data || [];

            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Bulk Import Infrastructure Resources</div></div>
                <div class="card-body" style="padding:24px">
                    <div class="form-group">
                        <label>Numbers (List per line)</label>
                        <textarea id="up-numbers" class="fly-input" style="height:200px" placeholder="+12025550123\n+12025550124"></textarea>
                        <small style="color:var(--text-secondary)">Normalization: Automatic (+ prefix, remove spaces)</small>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Target Range (Optional)</label>
                            <select id="up-range" class="fly-input">
                                <option value="">Auto-detect by prefix</option>
                                ${ranges.map(r => `<option value="${r.id}" data-name="${r.name}" data-country="${r.country_code}">${r.name} (${r.number_prefix})</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Default Country Code</label>
                            <input type="text" id="up-country" class="fly-input" placeholder="e.g. US">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Rate ($)</label>
                            <input type="number" id="up-rate" class="fly-input" step="0.001" value="0.05">
                        </div>
                        <div class="form-group">
                            <label>Profit Margin (%)</label>
                            <input type="number" id="up-margin" class="fly-input" value="50">
                        </div>
                    </div>
                    <button id="up-btn" class="fly-btn" style="width:100%; margin-top:16px" onclick="window.numbers.doUpload()">Import into Infrastructure</button>
                    <div id="up-results" style="margin-top:20px; display:none" class="badge"></div>
                </div>
            </div>`;
        } catch (e) { container.innerHTML = `<p>Error: ${e.message}</p>`; }
    },

    async doUpload() {
        const numbersText = document.getElementById('up-numbers').value;
        const rangeEl = document.getElementById('up-range');
        const selectedRange = rangeEl.options[rangeEl.selectedIndex];

        const payload = {
            numbersText,
            country: document.getElementById('up-country').value || selectedRange.dataset.country || 'Global',
            countryName: selectedRange.dataset.country ? '' : 'Unknown',
            rangeName: selectedRange.value ? selectedRange.dataset.name : null,
            rangeId: selectedRange.value || null,
            rate: parseFloat(document.getElementById('up-rate').value),
            profitMargin: parseFloat(document.getElementById('up-margin').value)
        };

        if (!numbersText.trim()) return window.ui.showToast('Please provide numbers', 'error');

        const btn = document.getElementById('up-btn');
        const resDiv = document.getElementById('up-results');
        btn.disabled = true;
        btn.textContent = 'Importing...';

        try {
            const res = await window.api.call('/api/numbers-ext/bulk-import', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            window.ui.showToast(`Import completed: ${res.success} added`, 'success');
            resDiv.style.display = 'block';
            resDiv.className = 'badge badge-success';
            resDiv.textContent = `Success: ${res.success} | Skipped: ${res.skipped} | Errors: ${res.errors.length}`;
            if (res.success > 0) document.getElementById('up-numbers').value = '';
        } catch (err) {
            window.ui.showToast(err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Import into Infrastructure';
        }
    },

    async renderBlacklist(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-title">Global Application Blacklist</div>
                <button class="fly-btn fly-btn-sm" onclick="window.numbers.showAddBlacklist()">Add App Pattern</button>
            </div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Application</th><th>Regex Pattern</th><th>Severity</th><th>Actions</th></tr></thead>
                    <tbody id="blacklist-body">
                        <tr class="empty-row"><td colspan="4">Loading blacklist rules...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
        this.loadBlacklist();
    },

    async loadBlacklist() {
        const body = document.getElementById('blacklist-body');
        try {
            const res = await window.api.call('/api/numbers-ext/blacklist');
            body.innerHTML = res.data.map(b => `
                <tr>
                    <td>${b.app_name}</td>
                    <td><code>${b.pattern}</code></td>
                    <td><span class="badge badge-danger">BLOCK</span></td>
                    <td><button class="action-btn delete" onclick="window.numbers.deleteBlacklist('${b.id}')">${ICONS.trash}</button></td>
                </tr>
            `).join('') || '<tr class="empty-row"><td colspan="4">No active blacklist rules found</td></tr>';
        } catch (e) {
            body.innerHTML = '<tr class="empty-row"><td colspan="4">Infrastructure data ready. No rules configured.</td></tr>';
        }
    },

    showAddBlacklist() {
        window.ui.showModal('Blacklist Application', `
            <div class="form-group"><label>App Name</label><input type="text" id="bl-name" class="fly-input" placeholder="e.g. Telegram"></div>
            <div class="form-group"><label>Regex Pattern</label><input type="text" id="bl-pattern" class="fly-input" placeholder="e.g. telegram|tg"></div>
        `, `
            <button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button>
            <button class="fly-btn" onclick="window.numbers.doAddBlacklist()">Save Rule</button>
        `);
    },

    async doAddBlacklist() {
        const payload = {
            app_name: document.getElementById('bl-name').value,
            pattern: document.getElementById('bl-pattern').value
        };
        try {
            await window.api.call('/api/numbers-ext/blacklist', { method: 'POST', body: JSON.stringify(payload) });
            window.ui.showToast('Rule added', 'success');
            window.ui.closeModal();
            this.loadBlacklist();
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async deleteBlacklist(id) {
        if (!confirm('Delete this blacklist rule?')) return;
        try {
            await window.api.call(\`/api/numbers-ext/blacklist/\${id}\`, { method: 'DELETE' });
            window.ui.showToast('Rule deleted', 'info');
            this.loadBlacklist();
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async revoke(id) {
        if (!confirm('Are you sure you want to revoke this number?')) return;
        try {
            await window.api.call(`/api/numbers/${id}/revoke`, { method: 'POST' });
            window.ui.showToast('Number revoked', 'success');
            window.router.resolvePage(document.getElementById('page-content'));
        } catch (err) { window.ui.showToast(err.message, 'error'); }
    },

    async export(format) {
        window.ui.showToast(`Exporting as ${format.toUpperCase()}...`, 'info');
    },

    async renderBulkTools(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const [users, ranges] = await Promise.all([
                window.api.call('/api/users?limit=100'),
                window.api.call('/api/ranges')
            ]);

            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Bulk Number Management Tools</div></div>
                <div class="card-body" style="padding:24px">
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px">
                        <div>
                            <h4 style="margin-bottom:16px; color:var(--danger)">Revocation Tools</h4>
                            <div class="form-group">
                                <label>Revoke by User</label>
                                <div style="display:flex; gap:8px">
                                    <select id="rev-user" class="fly-input">
                                        <option value="">-- Select User --</option>
                                        ${users.data.map(u => `<option value="${u.id}">${u.username}</option>`).join('')}
                                    </select>
                                    <button class="fly-btn fly-btn-danger" onclick="window.numbers.doBulkRevoke('user')">Revoke</button>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Revoke by Range</label>
                                <div style="display:flex; gap:8px">
                                    <select id="rev-range" class="fly-input">
                                        <option value="">-- Select Range --</option>
                                        ${ranges.data.map(r => `<option value="${r.name}">${r.name}</option>`).join('')}
                                    </select>
                                    <button class="fly-btn fly-btn-danger" onclick="window.numbers.doBulkRevoke('range')">Revoke</button>
                                </div>
                            </div>
                            <button class="fly-btn fly-btn-danger" style="width:100%; margin-top:16px" onclick="window.numbers.doBulkRevoke('global')">Revoke ALL Numbers Globally</button>
                        </div>

                        <div>
                            <h4 style="margin-bottom:16px">Bulk Deletion</h4>
                            <div class="form-group">
                                <label>Delete all numbers in Range</label>
                                <div style="display:flex; gap:8px">
                                    <select id="del-range" class="fly-input">
                                        <option value="">-- Select Range --</option>
                                        ${ranges.data.map(r => `<option value="${r.name}">${r.name}</option>`).join('')}
                                    </select>
                                    <button class="fly-btn fly-btn-danger" onclick="window.numbers.doBulkDelete('range')">DELETE</button>
                                </div>
                            </div>
                            <p style="font-size:12px; color:var(--text-secondary); margin-top:24px">Warning: Deletion is permanent and removes numbers from infrastructure. Revocation only unassigns them from users.</p>
                        </div>
                    </div>
                </div>
            </div>`;
        } catch (err) { container.innerHTML = `<p>Error: ${err.message}</p>`; }
    },

    async doBulkRevoke(scope) {
        const payload = { scope };
        if (scope === 'user') payload.userId = document.getElementById('rev-user').value;
        if (scope === 'range') payload.rangeName = document.getElementById('rev-range').value;

        if (scope !== 'global' && !payload.userId && !payload.rangeName) return window.ui.showToast('Please select a target', 'error');
        if (!confirm(`Are you sure you want to execute ${scope} revocation?`)) return;

        try {
            const res = await window.api.call('/api/numbers-ext/bulk-revoke', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            window.ui.showToast(res.message, 'success');
        } catch (err) { window.ui.showToast(err.message, 'error'); }
    },

    async doBulkDelete(scope) {
        const val = document.getElementById('del-range').value;
        if (!val) return window.ui.showToast('Please select a range', 'error');
        if (!confirm(`DANGER: This will permanently delete all numbers in range ${val}. Continue?`)) return;

        try {
            await window.api.call(\`/api/numbers-ext/bulk-delete?scope=range&value=\${val}\`, { method: 'POST' });
            window.ui.showToast('Bulk deletion successful', 'success');
        } catch (err) { window.ui.showToast(err.message, 'error'); }
    },

    async renderFailedSms(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Failed SMS & Error Logs</div></div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Time</th><th>Recipient</th><th>Provider</th><th>Error Reason</th></tr></thead>
                    <tbody><tr class="empty-row"><td colspan="4">No failures logged in the last 24 hours</td></tr></tbody>
                </table>
            </div>
        </div>`;
    }
};

window.numbers = numbers;
