const users = {
    async renderUsers(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/users?limit=100');
            const allUsers = res.data || [];
            const user = window.auth.getUser();
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">User Management & Hierarchy</div><button class="fly-btn fly-btn-sm" onclick="window.users.showAddModal()">Add Account</button></div>
                <div class="card-body"><div class="hierarchy-container">${this.renderHierarchyNode(user, allUsers)}</div></div>
            </div>`;
        } catch (err) { container.innerHTML = '<p>Error: ' + err.message + '</p>'; }
    },

    renderHierarchyNode(u, allUsers, depth = 0) {
        const children = allUsers.filter(child => child.parent_id === u.id);
        const isSelf = u.id === window.auth.getUser().id;
        return `
        <div class="hierarchy-node" style="margin-left: ${depth * 20}px; border-left: 2px solid var(--border); padding: 12px 0 12px 16px">
            <div class="hierarchy-user-card" style="display:flex; align-items:center; gap:12px; background:var(--bg-card); border:1px solid var(--border); padding:10px 16px; border-radius:8px">
                <div class="avatar" style="width:32px; height:32px; background:var(--primary); color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px">${(u.username || 'U').charAt(0).toUpperCase()}</div>
                <div style="flex:1">
                    <div style="display:flex; align-items:center; gap:8px"><span style="font-weight:700">${u.username}</span> <span class="badge ${window.ROLE_COLORS[u.role] || 'badge-secondary'}">${window.ROLE_LABELS[u.role] || u.role}</span> ${isSelf ? '<span class="badge badge-success">YOU</span>' : ''}</div>
                    <div style="font-size:11px; color:var(--text-secondary)">Balance: $${(u.balance || 0).toFixed(2)} | Status: ${u.status}</div>
                </div>
                <div class="node-actions"><button class="action-btn" onclick="window.users.showEditModal('${u.id}')">${ICONS.edit}</button></div>
            </div>
            <div class="hierarchy-children">${children.map(child => this.renderHierarchyNode(child, allUsers, depth + 1)).join('')}</div>
        </div>`;
    },

    showAddModal() {
        const role = window.auth.getUser().role;
        let options = '';
        if (role === 'admin') options = '<option value="admin">Admin</option><option value="manager">Manager</option><option value="reseller">Reseller</option><option value="sub_reseller">Client</option><option value="test_user">Test User</option>';
        else if (role === 'manager') options = '<option value="reseller">Reseller</option><option value="sub_reseller">Client</option>';
        else if (role === 'reseller') options = '<option value="sub_reseller">Client</option>';

        window.ui.showModal('Create New Account', `
            <div class="form-row"><div class="form-group"><label>Username</label><input type="text" id="u-username" class="fly-input"></div><div class="form-group"><label>Password</label><input type="password" id="u-password" class="fly-input"></div></div>
            <div class="form-row"><div class="form-group"><label>Email</label><input type="email" id="u-email" class="fly-input"></div><div class="form-group"><label>Role</label><select id="u-role" class="fly-input">${options}</select></div></div>
        `, '<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button><button class="fly-btn" onclick="window.users.save()">Create</button>');
    },

    async save() {
        const payload = { username: document.getElementById('u-username').value, password: document.getElementById('u-password').value, email: document.getElementById('u-email').value, role: document.getElementById('u-role').value };
        try {
            await window.api.call('/api/users', { method: 'POST', body: JSON.stringify(payload) });
            window.ui.showToast('User created', 'success');
            window.ui.closeModal();
            window.router.resolvePage(document.getElementById('page-content'));
        } catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async renderRegRequests(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/users/registration-requests');
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Registration Approval Queue</div></div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>User</th><th>Email</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${res.data.map(r => `<tr><td><strong>${r.username}</strong></td><td>${r.email}</td><td><button class="action-btn" onclick="window.users.approveReg('${r.id}')">Approve</button> <button class="action-btn delete" onclick="window.users.rejectReg('${r.id}')">Reject</button></td></tr>`).join('') || '<tr><td colspan="3">Queue empty</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>`;
        } catch (e) { container.innerHTML = '<p>Error loading queue</p>'; }
    },

    async approveReg(id) {
        try { await window.api.call(`/api/users/registration-requests/${id}/approve`, { method: 'POST' }); window.ui.showToast('Approved', 'success'); this.renderRegRequests(document.getElementById('page-content')); }
        catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async rejectReg(id) {
        try { await window.api.call(`/api/users/registration-requests/${id}/reject`, { method: 'POST' }); window.ui.showToast('Rejected', 'info'); this.renderRegRequests(document.getElementById('page-content')); }
        catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async renderBalances(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/users?limit=100');
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Balance Management</div></div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>User</th><th>Current Balance</th><th>Actions</th></tr></thead>
                        <tbody>${res.data.map(u => `<tr><td><strong>${u.username}</strong></td><td>$${u.balance.toFixed(2)}</td><td><button class="action-btn" onclick="window.users.showAdjustModal('${u.id}', '${u.username}')">Adjust</button></td></tr>`).join('')}</tbody>
                    </table>
                </div>
            </div>`;
        } catch (e) {}
    },

    showAdjustModal(id, name) {
        window.ui.showModal('Adjust Balance: ' + name, `
            <div class="form-group"><label>Amount (Negative to deduct)</label><input type="number" id="adj-amount" class="fly-input" value="0" step="0.01"></div>
            <div class="form-group"><label>Note</label><input type="text" id="adj-note" class="fly-input" placeholder="Manual adjustment"></div>
        `, '<button class="fly-btn secondary" onclick="window.ui.closeModal()">Cancel</button><button class="fly-btn" onclick="window.users.doAdjust(\'' + id + '\')">Apply</button>');
    },

    async doAdjust(id) {
        const payload = { userId: id, amount: parseFloat(document.getElementById('adj-amount').value), note: document.getElementById('adj-note').value };
        try { await window.api.call('/api/transactions/balance-adjust', { method: 'POST', body: JSON.stringify(payload) }); window.ui.showToast('Balance updated', 'success'); window.ui.closeModal(); this.renderBalances(document.getElementById('page-content')); }
        catch (e) { window.ui.showToast(e.message, 'error'); }
    },

    async renderAuditLogs(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/dashboard/audit-logs');
            container.innerHTML = `
            <div class="card"><div class="card-header"><div class="card-title">Infrastructure Audit Trails</div></div><div class="table-wrapper"><table class="fly-table"><thead><tr><th>Time</th><th>User</th><th>Action</th></tr></thead><tbody>${res.data.map(l => `<tr><td>${window.ui.formatDate(l.created_at)}</td><td>${l.actor}</td><td>${l.action}</td></tr>`).join('') || '<tr><td colspan="3">No logs</td></tr>'}</tbody></table></div></div>`;
        } catch (e) {}
    },

    async renderActivityLogs(container) { this.renderAuditLogs(container); },
    async renderPermissions(container) { this.renderRBAC(container); },

    async renderRBAC(container) {
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Permissions & Module Access Control</div></div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Feature</th><th>Admin</th><th>Manager</th><th>Reseller</th><th>Client</th></tr></thead>
                    <tbody>
                        <tr><td>Add Providers</td><td>✅</td><td>❌</td><td>❌</td><td>❌</td></tr>
                        <tr><td>Bulk Allocate</td><td>✅</td><td>✅</td><td>❌</td><td>❌</td></tr>
                        <tr><td>Self Allocation</td><td>❌</td><td>❌</td><td>✅</td><td>✅</td></tr>
                        <tr><td>View All SMS</td><td>✅</td><td>✅</td><td>❌</td><td>❌</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    async renderUsersByRole(container, role) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const res = await window.api.call('/api/users?role=' + role);
            container.innerHTML = `<div class="card"><div class="card-header"><div class="card-title">${role.toUpperCase()} Accounts</div></div><div class="table-wrapper"><table class="fly-table"><thead><tr><th>User</th><th>Status</th><th>Balance</th></tr></thead><tbody>${res.data.map(u => `<tr><td><strong>${u.username}</strong></td><td>${u.status}</td><td>$${u.balance.toFixed(2)}</td></tr>`).join('') || '<tr><td colspan="3">No data</td></tr>'}</tbody></table></div></div>`;
        } catch (e) {}
    }
};
window.users = users;
