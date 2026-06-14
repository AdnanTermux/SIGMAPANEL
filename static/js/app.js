/**
 * SIGMAPANEL Main Entry Point - Enterprise Structure
 */

window.ROLE_LABELS = { admin: 'Admin', manager: 'Manager', reseller: 'Reseller', sub_reseller: 'Client', test_user: 'Test Account' };
window.ROLE_COLORS = { admin: 'badge-danger', manager: 'badge-warning', reseller: 'badge-primary', sub_reseller: 'badge-secondary', test_user: 'badge-success' };

const TEST_NAV = [
    {
        group: 'SMS Module',
        roles: ['test_user'],
        items: [
            { key: 'test-numbers', label: 'SMS Test Numbers', icon: ICONS.phone, roles: ['test_user'] },
            { key: 'test-reports', label: 'SMS Test Reports', icon: ICONS.report, roles: ['test_user'] },
            { key: 'test-live-feed', label: 'Live OTP Feed', icon: ICONS.bell, roles: ['test_user'] },
            { key: 'test-traffic-stats', label: 'Traffic Stats', icon: ICONS.chart, roles: ['test_user'] },
        ]
    }
];

const NAV_STRUCTURE = [
    {
        group: 'NUMBERS GROUP',
        roles: ['admin', 'manager', 'reseller', 'sub_reseller'],
        items: [
            { key: 'my-numbers', label: 'My Numbers', icon: ICONS.phone, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'self-allocation', label: 'Self Allocation', icon: ICONS.layers, roles: ['reseller', 'sub_reseller'] },
            { key: 'bulk-allocation', label: 'Bulk Allocation', icon: ICONS.plus, roles: ['admin', 'manager'] },
            { key: 'sms-ranges', label: 'SMS Ranges', icon: ICONS.layers, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'search-access', label: 'Search Access', icon: ICONS.search, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'live-access', label: 'Live Access', icon: ICONS.eye, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'upload-numbers', label: 'Upload Numbers', icon: ICONS.plus, roles: ['admin', 'manager'] },
            { key: 'blacklist-management', label: 'Blacklist Management', icon: ICONS.ban, roles: ['admin', 'manager'] },
            { key: 'bulk-tools', label: 'Revoke Numbers', icon: ICONS.x, roles: ['admin', 'manager'] },
        ]
    },
    {
        group: 'SMS GROUP',
        roles: ['admin', 'manager', 'reseller', 'sub_reseller'],
        items: [
            { key: 'my-sms', label: 'My SMS', icon: ICONS.sms, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'profit-stats', label: 'Profit Stats', icon: ICONS.profit, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'live-otp-feed', label: 'Live OTP Feed', icon: ICONS.bell, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'sms-analytics', label: 'SMS Analytics', icon: ICONS.chart, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'search-sms', label: 'Search SMS', icon: ICONS.search, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'delivery-logs', label: 'Delivery Logs', icon: ICONS.report, roles: ['admin', 'manager'] },
            { key: 'failed-sms', label: 'Failed SMS', icon: ICONS.x, roles: ['admin', 'manager'] },
        ]
    },
    {
        group: 'SMPP SERVER',
        roles: ['admin'],
        items: [
            { key: 'smpp-server-dash', label: 'Dashboard', icon: ICONS.dashboard, roles: ['admin'] },
            { key: 'smpp-server-accounts', label: 'SMPP Accounts', icon: ICONS.users, roles: ['admin'] },
            { key: 'smpp-server-sessions', label: 'SMPP Sessions', icon: ICONS.eye, roles: ['admin'] },
            { key: 'smpp-server-connected', label: 'Connected Clients', icon: ICONS.transfer, roles: ['admin'] },
            { key: 'smpp-server-dlr', label: 'DLR Monitor', icon: ICONS.report, roles: ['admin'] },
            { key: 'smpp-server-throughput', label: 'Throughput Monitor', icon: ICONS.chart, roles: ['admin'] },
            { key: 'smpp-server-security', label: 'Security Center', icon: ICONS.shield, roles: ['admin'] },
            { key: 'smpp-server-logs', label: 'Connection Logs', icon: ICONS.report, roles: ['admin'] },
        ]
    },
    {
        group: 'REQUESTS GROUP',
        roles: ['admin', 'manager'],
        items: [
            { key: 'registration-requests', label: 'Registration Requests', icon: ICONS.users, roles: ['admin', 'manager'] },
            { key: 'payout-requests', label: 'Payout Requests', icon: ICONS.wallet, roles: ['admin', 'manager'] },
        ]
    },
    {
        group: 'MANAGEMENT GROUP',
        roles: ['admin', 'manager', 'reseller'],
        items: [
            { key: 'users', label: 'Users', icon: ICONS.users, roles: ['admin', 'manager', 'reseller'] },
            { key: 'account-balances', label: 'Account Balances', icon: ICONS.wallet, roles: ['admin', 'manager', 'reseller'] },
            { key: 'audit-logs', label: 'Audit Logs', icon: ICONS.shield, roles: ['admin'] },
            { key: 'permissions', label: 'Permissions', icon: ICONS.key, roles: ['admin'] },
        ]
    },
    {
        group: 'API GROUP',
        roles: ['admin', 'manager', 'reseller', 'sub_reseller'],
        items: [
            { key: 'api-playground', label: 'API Playground', icon: ICONS.api, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'api-tokens', label: 'API Tokens', icon: ICONS.key, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'documentation', label: 'Documentation', icon: ICONS.report, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'live-test', label: 'Live Test', icon: ICONS.send, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'webhook-config', label: 'Webhook Config', icon: ICONS.settings, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
        ]
    },
    {
        group: 'SETTINGS GROUP',
        roles: ['admin', 'manager', 'reseller', 'sub_reseller'],
        items: [
            { key: 'general-settings', label: 'General Settings', icon: ICONS.settings, roles: ['admin', 'manager'] },
            { key: 'security-settings', label: 'Security', icon: ICONS.shield, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'smpp-settings', label: 'SMPP Settings', icon: ICONS.server, roles: ['admin'] },
            { key: 'backup-restore', label: 'Backup & Restore', icon: ICONS.shield, roles: ['admin'] },
        ]
    }
];

function init() {
  try {
    window.router.addRoute('dashboard', (c) => window.dashboard.render(c));

    // Numbers
    window.router.addRoute('my-numbers', (c) => window.numbers.renderMyNumbers(c));
    window.router.addRoute('self-allocation', (c) => window.numbers.renderSelfAllocation(c));
    window.router.addRoute('bulk-allocation', (c) => window.numbers.renderBulkAllocation(c));
    window.router.addRoute('sms-ranges', (c) => window.ranges.renderRanges(c));
    window.router.addRoute('search-access', (c) => window.searchAccess.render(c));
    window.router.addRoute('live-access', (c) => window.numbers.renderLiveAccess(c));
    window.router.addRoute('upload-numbers', (c) => window.numbers.renderUpload(c));
    window.router.addRoute('blacklist-management', (c) => window.numbers.renderBlacklist(c));
    window.router.addRoute('bulk-tools', (c) => window.numbers.renderBulkTools(c));

    // SMS
    window.router.addRoute('my-sms', (c) => { window.sms.stopLiveFeed(); window.sms.renderMySms(c); });
    window.router.addRoute('profit-stats', (c) => { window.sms.stopLiveFeed(); window.sms.renderProfitStats(c); });
    window.router.addRoute('live-otp-feed', (c) => { window.sms.renderLiveOtpFeed(c); });
    window.router.addRoute('sms-analytics', (c) => { window.sms.stopLiveFeed(); window.sms.renderAnalytics(c); });
    window.router.addRoute('search-sms', (c) => { window.sms.stopLiveFeed(); window.sms.renderSearchSms(c); });
    window.router.addRoute('delivery-logs', (c) => { window.sms.stopLiveFeed(); window.sms.renderDeliveryLogs(c); });
    window.router.addRoute('failed-sms', (c) => { window.sms.stopLiveFeed(); window.sms.renderFailedSms(c); });

    // SMPP Server
    window.router.addRoute('smpp-server-dash', (c) => window.smpp.renderDashboard(c));
    window.router.addRoute('smpp-server-accounts', (c) => window.smpp.renderServerAccounts(c));
    window.router.addRoute('smpp-server-sessions', (c) => window.smpp.renderServerSessions(c));
    window.router.addRoute('smpp-server-connected', (c) => window.smpp.renderServerSessions(c));
    window.router.addRoute('smpp-server-logs', (c) => window.smpp.renderServerLogs(c));
    window.router.addRoute('smpp-server-dlr', (c) => window.smpp.renderServerDlr(c));
    window.router.addRoute('smpp-server-throughput', (c) => window.smpp.renderThroughput(c));
    window.router.addRoute('smpp-server-security', (c) => window.smpp.renderServerSecurity(c));

    // Management
    window.router.addRoute('users', (c) => window.users.renderUsers(c));
    window.router.addRoute('account-balances', (c) => window.users.renderBalances(c));
    window.router.addRoute('audit-logs', (c) => window.users.renderAuditLogs(c));
    window.router.addRoute('permissions', (c) => window.users.renderRBAC(c));

    // Requests
    window.router.addRoute('registration-requests', (c) => window.users.renderRegRequests(c));
    window.router.addRoute('payout-requests', (c) => window.payments.renderPayoutRequests(c));

    // API
    window.router.addRoute('api-playground', (c) => window.apiManagement.renderPlayground(c));
    window.router.addRoute('api-tokens', (c) => window.apiManagement.renderTokens(c));
    window.router.addRoute('documentation', (c) => window.settings.renderDocumentation(c));
    window.router.addRoute('live-test', (c) => window.apiManagement.renderLiveTest(c));
    window.router.addRoute('webhook-config', (c) => window.settings.renderWebhookConfig(c));

    // Settings
    window.router.addRoute('general-settings', (c) => window.settings.renderGeneral(c));
    window.router.addRoute('security-settings', (c) => window.settings.renderSecurity(c));
    window.router.addRoute('smpp-settings', (c) => window.settings.renderSmppSettings(c));
    window.router.addRoute('backup-restore', (c) => window.settings.renderBackupRestore(c));

    // Test Panel
    window.router.addRoute('test-numbers', (c) => window.testPanel.renderTestNumbers(c));
    window.router.addRoute('test-reports', (c) => window.testPanel.renderTestReports(c));
    window.router.addRoute('test-live-feed', (c) => window.testPanel.renderLiveFeed(c));
    window.router.addRoute('test-traffic-stats', (c) => window.testPanel.renderTrafficStats(c));

    // Fallback
    [...NAV_STRUCTURE, ...TEST_NAV].forEach(group => {
        group.items.forEach(item => {
            if (!window.router.routes[item.key]) {
                window.router.addRoute(item.key, (c) => {
                    c.innerHTML = `<div class="card"><div class="card-header"><div class="card-title">${item.label}</div></div><div class="card-body"><div class="empty-state"><h3>No data available</h3><p>The ${item.label} module is awaiting infrastructure data.</p></div></div></div>`;
                });
            }
        });
    });

    if (window.auth.isLoggedIn()) { window.router.init(); }
    else { const path = window.location.pathname; if (path === '/signup') window.auth.renderSignup(); else window.security.renderVerification(); }
  } catch (err) { console.error('SIGMAPANEL init error:', err); }
}

function renderDashboardShell() {
  try {
    const user = window.auth.getUser();
    if (!user) { window.auth.renderLogin(); return; }

    if (!document.querySelector('.dashboard-layout')) {
        const role = user.role || 'sub_reseller';
        const collapsedGroups = JSON.parse(localStorage.getItem('collapsedGroups') || '{}');
        const navToUse = role === 'test_user' ? TEST_NAV : NAV_STRUCTURE;

        const sidebarNav = navToUse
            .filter(group => !group.roles || group.roles.includes(role))
            .map(group => {
                const items = group.items.filter(item => !item.roles || item.roles.includes(role));
                if (items.length === 0) return '';
                const isCollapsed = collapsedGroups[group.group];
                return `
                <div class="sidebar-group ${isCollapsed ? 'collapsed' : ''}" data-group="${group.group}">
                    <div class="sidebar-group-header"><span>${group.group}</span><span class="group-toggle">${isCollapsed ? ICONS.plus : ICONS.chevronDown}</span></div>
                    <div class="sidebar-group-items">
                        ${items.map(item => `<button class="sidebar-nav-item ${window.router.currentPage === item.key ? 'active' : ''}" data-page="${item.key}">${item.icon} ${item.label}</button>`).join('')}
                    </div>
                </div>`;
            }).join('');

        document.getElementById('app').innerHTML = `
        <div class="dashboard-layout">
            <button class="mobile-menu-btn" id="mobile-menu-btn">${ICONS.menu}</button>
            <div class="sidebar-overlay" id="sidebar-overlay"></div>
            <aside class="sidebar" id="sidebar">
                <div class="sidebar-logo"><div class="sidebar-logo-icon">${ICONS.send}</div><div><h1>SIGMAPANEL</h1><p>Telecom Infrastructure</p></div></div>
                <nav class="sidebar-nav">${sidebarNav}</nav>
                <div class="sidebar-user">
                    <div class="sidebar-user-info"><div class="sidebar-user-avatar">${(user.username || 'U').charAt(0).toUpperCase()}</div><div><div class="sidebar-user-name">${user.fullName || user.username}</div><div class="sidebar-user-role">${window.ROLE_LABELS[user.role] || user.role}</div></div></div>
                    <button class="sidebar-logout" id="logout-btn">${ICONS.logout} Logout</button>
                </div>
            </aside>
            <div class="main-content">
                <header class="top-bar">
                    <h2 class="top-bar-title" id="page-title">Dashboard</h2>
                    <div class="top-bar-actions"><div class="top-bar-user"><div class="top-bar-avatar">${(user.username || 'U').charAt(0).toUpperCase()}</div><div class="top-bar-user-name"><div>${user.username}</div><div style="font-size:10px; color:#6B7280">${user.role}</div></div></div></div>
                </header>
                <main class="page-content" id="page-content"></main>
            </div>
        </div><div id="toast-container"></div><div id="modal-root"></div>`;

        document.addEventListener('click', (e) => {
            const navBtn = e.target.closest('.sidebar-nav-item');
            if (navBtn) { window.router.navigateTo(navBtn.dataset.page); return; }
            const groupHeader = e.target.closest('.sidebar-group-header');
            if (groupHeader) {
                const group = groupHeader.parentElement;
                const groupName = group.dataset.group;
                group.classList.toggle('collapsed');
                const isCollapsed = group.classList.contains('collapsed');
                const state = JSON.parse(localStorage.getItem('collapsedGroups') || '{}');
                state[groupName] = isCollapsed;
                localStorage.setItem('collapsedGroups', JSON.stringify(state));
                groupHeader.querySelector('.group-toggle').innerHTML = isCollapsed ? ICONS.plus : ICONS.chevronDown;
                return;
            }
            if (e.target.closest('#logout-btn')) window.auth.logout();
            if (e.target.closest('#mobile-menu-btn')) { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('sidebar-overlay').classList.toggle('open'); }
            if (e.target.closest('#sidebar-overlay')) { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebar-overlay').classList.remove('open'); }
        });
    }

    document.querySelectorAll('.sidebar-nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.page === window.router.currentPage));
    const content = document.getElementById('page-content');
    window.router.resolvePage(content);

    const currentNav = user.role === 'test_user' ? TEST_NAV : NAV_STRUCTURE;
    const currentItem = currentNav.flatMap(g => g.items).find(i => i.key === window.router.currentPage);
    if (currentItem) document.getElementById('page-title').textContent = currentItem.label;
  } catch (err) { console.error('Shell error:', err); }
}

window.renderDashboardShell = renderDashboardShell;
document.addEventListener('DOMContentLoaded', init);
