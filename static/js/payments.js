const payments = {
    async renderRequests(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await window.api.call('/api/payments/requests?limit=20');
            const rows = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Billing & Payout Requests</div>
                </div>
                <div class="filter-bar">
                    <select class="filter-select" id="pay-status-filter">
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>User</th><th>Amount</th><th>Method</th><th>Status</th><th>Requested At</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${rows.length ? rows.map(r => `
                                <tr>
                                    <td style="font-weight:700">${r.username}</td>
                                    <td style="color:var(--primary); font-weight:700">$${(r.amount || 0).toFixed(2)}</td>
                                    <td><span class="badge badge-secondary">${r.method || 'USDT'}</span></td>
                                    <td><span class="badge ${r.status === 'approved' ? 'badge-success' : r.status === 'pending' ? 'badge-warning' : 'badge-danger'}">${r.status}</span></td>
                                    <td style="font-size:12px">${window.ui.formatDate(r.created_at)}</td>
                                    <td class="actions-cell">
                                        ${r.status === 'pending' ? `
                                            <button class="action-btn" onclick="window.payments.approve('${r.id}')" style="color:var(--success)">Approve</button>
                                            <button class="action-btn delete" onclick="window.payments.reject('${r.id}')">Reject</button>
                                        ` : '-'}
                                    </td>
                                </tr>
                            `).join('') : '<tr class="empty-row"><td colspan="6">No payment requests found</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>`;
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    },

    async approve(id) {
        if (!confirm('Approve this payment request?')) return;
        try {
            await window.api.call(`/api/payments/requests/${id}/approve`, { method: 'PUT' });
            window.ui.showToast('Request approved', 'success');
            window.router.resolvePage(document.getElementById('page-content'));
        } catch (err) {
            window.ui.showToast(err.message, 'error');
        }
    },

    async reject(id) {
        const reason = prompt('Reason for rejection:');
        if (reason === null) return;
        try {
            await window.api.call(`/api/payments/requests/${id}/reject`, {
                method: 'PUT',
                body: JSON.stringify({ reason })
            });
            window.ui.showToast('Request rejected', 'info');
            window.router.resolvePage(document.getElementById('page-content'));
        } catch (err) {
            window.ui.showToast(err.message, 'error');
        }
    }
};

window.payments = payments;
