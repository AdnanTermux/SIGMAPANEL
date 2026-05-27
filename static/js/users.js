const users = {
    async renderUsers(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call('/api/users?limit=20');
            const rows = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">User Management (Hierarchy)</div>
                    <button class="fly-btn fly-btn-sm" onclick="window.users.showAddModal()">Add New Account</button>
                </div>
                <div class="filter-bar">
                    <input type="text" class="search-input" placeholder="Search by username or email..." id="users-search">
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Balance</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${rows.length ? rows.map(u => `
                                <tr>
                                    <td>
                                        <div style="font-weight:700">${u.username}</div>
                                        <div style="font-size:11px; color:var(--text-secondary)">${u.email || ''}</div>
                                    </td>
                                    <td><span class="badge ${ROLE_COLORS[u.role] || 'badge-secondary'}">${ROLE_LABELS[u.role] || u.role}</span></td>
                                    <td><span class="badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}">${u.status}</span></td>
                                    <td style="font-weight:700">$${(u.balance || 0).toFixed(2)}</td>
                                    <td class="actions-cell">
                                        <button class="action-btn" onclick="window.users.adjustBalance('${u.id}', '${u.username}')" title="Adjust Balance">$</button>
                                        <button class="action-btn" onclick="window.users.edit('${u.id}')">${ICONS.edit}</button>
                                        <button class="action-btn delete" onclick="window.users.delete('${u.id}', '${u.username}')">${ICONS.trash}</button>
                                    </td>
                                </tr>
                            `).join('') : '<tr class="empty-row"><td colspan="5">No users found</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>`;
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    },

    adjustBalance(userId, username) {
        const body = `
            <p>Adjusting balance for <strong>${username}</strong></p>
            <div class="form-group">
                <label>Amount (Use negative to deduct)</label>
                <input type="number" id="adj-amount" class="fly-input" step="0.01" value="0.00">
            </div>
            <div class="form-group">
                <label>Reason/Note</label>
                <input type="text" id="adj-note" class="fly-input" placeholder="Manual top-up">
            </div>`;
        const footer = `<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button><button class="fly-btn" onclick="window.users.doAdjust('${userId}')">Apply Adjustment</button>`;
        window.ui.showModal('Adjust Balance', body, footer, 'small');
    },

    async doAdjust(userId) {
        const amount = document.getElementById('adj-amount').value;
        const note = document.getElementById('adj-note').value;
        try {
            await window.api.call('/api/transactions/balance-adjust', {
                method: 'POST',
                body: JSON.stringify({ userId, amount: parseFloat(amount), note })
            });
            window.ui.showToast('Balance adjusted successfully', 'success');
            window.ui.closeModal();
            window.router.resolvePage(document.getElementById('page-content'));
        } catch (err) {
            window.ui.showToast(err.message, 'error');
        }
    },

    showAddModal() {
        const body = `
            <div class="form-row">
                <div class="form-group"><label>Username *</label><input type="text" id="u-username" class="fly-input" placeholder="3-50 chars"></div>
                <div class="form-group"><label>Password *</label><input type="password" id="u-password" class="fly-input" placeholder="Min 6 chars"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Email</label><input type="email" id="u-email" class="fly-input"></div>
                <div class="form-group"><label>Role</label>
                    <select id="u-role" class="fly-input">
                        <option value="user">User</option>
                        <option value="sub_reseller">Sub Reseller</option>
                        <option value="reseller">Reseller</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Full Name</label><input type="text" id="u-fullname" class="fly-input"></div>
                <div class="form-group"><label>Balance ($)</label><input type="number" id="u-balance" class="fly-input" step="0.01" value="0"></div>
            </div>`;
        const footer = `<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button><button class="fly-btn" onclick="window.users.save()">Create Account</button>`;
        window.ui.showModal('Add New User', body, footer);
    },

    async save() {
        const payload = {
            username: document.getElementById('u-username').value,
            password: document.getElementById('u-password').value,
            email: document.getElementById('u-email').value || null,
            role: document.getElementById('u-role').value,
            fullName: document.getElementById('u-fullname').value || null,
            balance: parseFloat(document.getElementById('u-balance').value) || 0
        };

        try {
            await window.api.call('/api/users', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            window.ui.showToast('User created successfully', 'success');
            window.ui.closeModal();
            window.router.resolvePage(document.getElementById('page-content'));
        } catch (err) {
            window.ui.showToast(err.message, 'error');
        }
    },

    async delete(id, username) {
        if (!confirm(`Are you sure you want to delete user ${username}? This cannot be undone.`)) return;
        try {
            await window.api.call(`/api/users/${id}`, { method: 'DELETE' });
            window.ui.showToast('User deleted', 'success');
            window.router.resolvePage(document.getElementById('page-content'));
        } catch (err) {
            window.ui.showToast(err.message, 'error');
        }
    },

    async renderRegRequests(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call('/api/users?status=pending_approval');
            const rows = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Registration Requests</div>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>User</th><th>Details</th><th>Requested At</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${rows.length ? rows.map(u => `
                                <tr>
                                    <td>
                                        <div style="font-weight:700">${u.username}</div>
                                        <div style="font-size:11px; color:var(--text-secondary)">${u.email}</div>
                                    </td>
                                    <td style="font-size:12px; max-width:300px">${u.notes || '-'}</td>
                                    <td>${window.ui.formatDate(u.created_at)}</td>
                                    <td class="actions-cell">
                                        <button class="action-btn" onclick="window.users.approve('${u.id}', '${u.username}')" style="color:var(--success)">Approve</button>
                                        <button class="action-btn delete" onclick="window.users.delete('${u.id}', '${u.username}')">Reject</button>
                                    </td>
                                </tr>
                            `).join('') : '<tr class="empty-row"><td colspan="4">No pending registration requests</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>`;
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    },

    async approve(id, username) {
        if (!confirm(`Approve account for ${username}?`)) return;
        try {
            await window.api.call(`/api/users/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ status: 'active' })
            });
            window.ui.showToast(`Account approved for ${username}`, 'success');
            window.router.resolvePage(document.getElementById('page-content'));
        } catch (err) {
            window.ui.showToast(err.message, 'error');
        }
    },

    async renderUsersByRole(container, role) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call(`/api/users?role=${role}`);
            const rows = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">${ROLE_LABELS[role]} Accounts</div></div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>User</th><th>Status</th><th>Balance</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${rows.length ? rows.map(u => `
                                <tr>
                                    <td><strong>${u.username}</strong><br><small>${u.email || ''}</small></td>
                                    <td><span class="badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}">${u.status}</span></td>
                                    <td>$${(u.balance || 0).toFixed(2)}</td>
                                    <td class="actions-cell">
                                        <button class="action-btn" onclick="window.users.edit('${u.id}')">${ICONS.edit}</button>
                                    </td>
                                </tr>
                            `).join('') : `<tr class="empty-row"><td colspan="4">No ${role}s found</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>`;
        } catch (err) { container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`; }
    },

    async renderBalances(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call('/api/users?limit=100');
            const rows = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Accounting & Balances</div></div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Account</th><th>Role</th><th>Balance</th><th>Credit Limit</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${rows.map(u => `
                                <tr>
                                    <td><strong>${u.username}</strong></td>
                                    <td><span class="badge badge-secondary">${u.role}</span></td>
                                    <td style="font-weight:700">$${(u.balance || 0).toFixed(4)}</td>
                                    <td>$${(u.credit_limit || 0).toFixed(2)}</td>
                                    <td><button class="fly-btn fly-btn-sm" onclick="window.users.adjustBalance('${u.id}', '${u.username}')">Adjust</button></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
        } catch (err) { container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`; }
    }
};

window.users = users;
