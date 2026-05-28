const users = {
    async renderUsers(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/users?limit=100');
            const allUsers = res.data || [];

            // Filter to top level for the main list
            const user = window.auth.getUser();
            const topLevel = allUsers.filter(u => u.parent_id === user.id || u.id === user.id);

            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">User Management & Hierarchy</div>
                    <button class="fly-btn fly-btn-sm" onclick="window.users.showAddModal()">Add New Account</button>
                </div>
                <div class="card-body">
                    <div class="hierarchy-container">
                        ${this.renderHierarchyNode(user, allUsers)}
                    </div>
                </div>
            </div>`;
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    },

    renderHierarchyNode(u, allUsers, depth = 0) {
        const children = allUsers.filter(child => child.parent_id === u.id);
        const isSelf = u.id === window.auth.getUser().id;

        return `
        <div class="hierarchy-node" style="margin-left: ${depth * 20}px; border-left: 2px solid var(--border); padding: 12px 0 12px 16px">
            <div class="hierarchy-user-card" style="display:flex; align-items:center; gap:12px; background:var(--bg-card); border:1px solid var(--border); padding:10px 16px; border-radius:8px">
                <div class="avatar" style="width:32px; height:32px; background:var(--primary); color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px">
                    ${(u.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div style="flex:1">
                    <div style="display:flex; align-items:center; gap:8px">
                        <span style="font-weight:700">${u.username}</span>
                        <span class="badge ${ROLE_COLORS[u.role] || 'badge-secondary'}" style="font-size:10px">${ROLE_LABELS[u.role] || u.role}</span>
                        ${isSelf ? '<span class="badge badge-success" style="font-size:10px">YOU</span>' : ''}
                    </div>
                    <div style="font-size:11px; color:var(--text-secondary)">Balance: $${(u.balance || 0).toFixed(2)} | Status: ${u.status}</div>
                </div>
                <div class="node-actions" style="display:flex; gap:4px">
                    <button class="action-btn" onclick="window.users.adjustBalance('${u.id}', '${u.username}')" title="Adjust Balance">$</button>
                    ${!isSelf ? `<button class="action-btn delete" onclick="window.users.delete('${u.id}', '${u.username}')">${ICONS.trash}</button>` : ''}
                </div>
            </div>
            <div class="hierarchy-children">
                ${children.map(child => this.renderHierarchyNode(child, allUsers, depth + 1)).join('')}
            </div>
        </div>`;
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
                        <option value="sub_reseller">Client</option>
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
            const res = await window.api.call('/api/users/registration-requests');
            const rows = res.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Public Registration Requests</div>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Username</th><th>Profile</th><th>Requested At</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${rows.length ? rows.map(u => `
                                <tr>
                                    <td>
                                        <div style="font-weight:700">${u.username}</div>
                                        <div style="font-size:11px; color:var(--text-secondary)">${u.email || 'No email'}</div>
                                    </td>
                                    <td style="font-size:12px; max-width:300px">
                                        <div><strong>Name:</strong> ${u.full_name || '-'}</div>
                                        <div><strong>Prof:</strong> ${u.profession || '-'}</div>
                                        <div><strong>Payment:</strong> ${u.payment_method} (${u.payment_detail})</div>
                                    </td>
                                    <td>${window.ui.formatDate(u.created_at)}</td>
                                    <td class="actions-cell">
                                        <button class="action-btn" onclick="window.users.approveReg('${u.id}', '${u.username}')" style="color:var(--success)">Approve</button>
                                        <button class="action-btn delete" onclick="window.users.rejectReg('${u.id}', '${u.username}')">Reject</button>
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

    async approveReg(requestId, username) {
        if (!confirm(`Approve registration and create account for ${username}?`)) return;
        try {
            await window.api.call(`/api/users/registration-requests/${requestId}/approve`, { method: 'POST' });
            window.ui.showToast(`Account created for ${username}`, 'success');
            window.router.resolvePage(document.getElementById('page-content'));
        } catch (err) { window.ui.showToast(err.message, 'error'); }
    },

    async rejectReg(requestId, username) {
        if (!confirm(`Reject registration request for ${username}?`)) return;
        try {
            await window.api.call(`/api/users/registration-requests/${requestId}/reject`, { method: 'POST' });
            window.ui.showToast('Request rejected', 'info');
            window.router.resolvePage(document.getElementById('page-content'));
        } catch (err) { window.ui.showToast(err.message, 'error'); }
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

    async renderPermissions(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Role-Based Access Control (RBAC)</div></div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Role</th><th>Can Create</th><th>Can View Analytics</th><th>Can Manage SMPP</th></tr></thead>
                    <tbody>
                        <tr><td>Admin</td><td>All</td><td>✅</td><td>✅</td></tr>
                        <tr><td>Manager</td><td>Resellers, Clients</td><td>✅</td><td>❌</td></tr>
                        <tr><td>Reseller</td><td>Clients</td><td>Limited</td><td>❌</td></tr>
                        <tr><td>Client</td><td>None</td><td>Self</td><td>❌</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
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
