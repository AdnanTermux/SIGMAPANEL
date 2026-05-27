/**
 * SIGMAPANEL Main Entry Point
 */

const ROLE_LABELS = {
    admin: 'Admin',
    manager: 'Manager',
    reseller: 'Reseller',
    sub_reseller: 'Sub Reseller',
    user: 'User',
    test_user: 'Test Account'
};

const ROLE_COLORS = {
    admin: 'badge-danger',
    manager: 'badge-warning',
    reseller: 'badge-primary',
    sub_reseller: 'badge-secondary',
    user: 'badge-secondary'
};

const TEST_NAV = [
    {
        group: 'SMS TEST MODULE',
        roles: ['test_user'],
        items: [
            { key: 'test-numbers', label: 'SMS Test Numbers', icon: ICONS.phone, roles: ['test_user'] },
            { key: 'test-reports', label: 'SMS Test Reports', icon: ICONS.report, roles: ['test_user'] },
            { key: 'test-live-feed', label: 'Live OTP Feed', icon: ICONS.bell, roles: ['test_user'] },
            { key: 'test-range-tester', label: 'Range Tester', icon: ICONS.layers, roles: ['test_user'] },
            { key: 'test-traffic-stats', label: 'Traffic Stats', icon: ICONS.chart, roles: ['test_user'] },
            { key: 'test-provider-monitor', label: 'Provider Monitor', icon: ICONS.server, roles: ['test_user'] },
        ]
    }
];

const NAV_STRUCTURE = [
    {
        group: 'NUMBERS',
        roles: ['admin', 'manager', 'reseller', 'sub_reseller', 'user'],
        items: [
            { key: 'my-numbers', label: 'My Numbers', icon: ICONS.phone, roles: ['admin', 'manager', 'reseller', 'sub_reseller', 'user'] },
            { key: 'self-allocation', label: 'Self Allocation', icon: ICONS.layers, roles: ['reseller', 'sub_reseller'] },
            { key: 'bulk-allocation', label: 'Bulk Allocation', icon: ICONS.plus, roles: ['admin', 'manager'] },
            { key: 'sms-ranges', label: 'SMS Ranges', icon: ICONS.layers, roles: ['admin', 'manager', 'reseller'] },
            { key: 'search-access', label: 'Search Access', icon: ICONS.search, roles: ['admin', 'manager', 'reseller'] },
            { key: 'live-access', label: 'Live Access', icon: ICONS.eye, roles: ['admin', 'manager', 'reseller'] },
            { key: 'export-numbers', label: 'Export Numbers', icon: ICONS.transfer, roles: ['admin', 'manager'] },
            { key: 'upload-numbers', label: 'Upload Numbers', icon: ICONS.plus, roles: ['admin', 'manager'] },
            { key: 'blacklist-management', label: 'Blacklist Management', icon: ICONS.ban, roles: ['admin', 'manager'] },
        ]
    },
    {
        group: 'SMS',
        roles: ['admin', 'manager', 'reseller', 'sub_reseller', 'user'],
        items: [
            { key: 'my-sms', label: 'My SMS', icon: ICONS.sms, roles: ['admin', 'manager', 'reseller', 'sub_reseller', 'user'] },
            { key: 'profit-stats', label: 'Profit Stats', icon: ICONS.profit, roles: ['admin', 'manager', 'reseller'] },
            { key: 'live-otp-feed', label: 'Live OTP Feed', icon: ICONS.bell, roles: ['admin', 'manager', 'reseller'] },
            { key: 'sms-analytics', label: 'SMS Analytics', icon: ICONS.chart, roles: ['admin', 'manager', 'reseller'] },
            { key: 'search-sms', label: 'Search SMS', icon: ICONS.search, roles: ['admin', 'manager', 'reseller'] },
            { key: 'delivery-logs', label: 'Delivery Logs', icon: ICONS.report, roles: ['admin', 'manager'] },
            { key: 'failed-sms', label: 'Failed SMS', icon: ICONS.x, roles: ['admin', 'manager'] },
        ]
    },
    {
        group: 'REQUESTS',
        roles: ['admin', 'manager'],
        items: [
            { key: 'registration-requests', label: 'Registration Requests', icon: ICONS.users, roles: ['admin', 'manager'] },
            { key: 'payment-requests', label: 'Payment Requests', icon: ICONS.wallet, roles: ['admin', 'manager'] },
            { key: 'approval-queue', label: 'Approval Queue', icon: ICONS.shield, roles: ['admin', 'manager'] },
            { key: 'rejected-requests', label: 'Rejected Requests', icon: ICONS.x, roles: ['admin', 'manager'] },
        ]
    },
    {
        group: 'PROVIDERS',
        roles: ['admin'],
        items: [
            { key: 'smpp-providers', label: 'SMPP Providers', icon: ICONS.server, roles: ['admin'] },
            { key: 'http-providers', label: 'HTTP Providers', icon: ICONS.server, roles: ['admin'] },
            { key: 'provider-status', label: 'Provider Status', icon: ICONS.chart, roles: ['admin'] },
            { key: 'connection-logs', label: 'Connection Logs', icon: ICONS.report, roles: ['admin'] },
            { key: 'throughput-stats', label: 'Throughput Stats', icon: ICONS.chart, roles: ['admin'] },
            { key: 'failover-management', label: 'Failover Management', icon: ICONS.shield, roles: ['admin'] },
        ]
    },
    {
        group: 'MANAGEMENT',
        roles: ['admin', 'manager', 'reseller'],
        items: [
            { key: 'users', label: 'Users', icon: ICONS.users, roles: ['admin', 'manager', 'reseller'] },
            { key: 'managers', label: 'Managers', icon: ICONS.users, roles: ['admin'] },
            { key: 'resellers', label: 'Resellers', icon: ICONS.users, roles: ['admin', 'manager'] },
            { key: 'sub-resellers', label: 'Sub Resellers', icon: ICONS.users, roles: ['admin', 'manager', 'reseller'] },
            { key: 'account-balances', label: 'Account Balances', icon: ICONS.wallet, roles: ['admin', 'manager', 'reseller'] },
            { key: 'audit-logs', label: 'Audit Logs', icon: ICONS.shield, roles: ['admin'] },
            { key: 'activity-logs', label: 'Activity Logs', icon: ICONS.report, roles: ['admin', 'manager'] },
            { key: 'permissions', label: 'Permissions', icon: ICONS.key, roles: ['admin'] },
        ]
    },
    {
        group: 'API',
        roles: ['admin', 'manager', 'reseller', 'sub_reseller', 'user'],
        items: [
            { key: 'api-playground', label: 'API Playground', icon: ICONS.api, roles: ['admin', 'manager', 'reseller', 'sub_reseller', 'user'] },
            { key: 'api-tokens', label: 'API Tokens', icon: ICONS.key, roles: ['admin', 'manager', 'reseller', 'sub_reseller', 'user'] },
            { key: 'documentation', label: 'Documentation', icon: ICONS.report, roles: ['admin', 'manager', 'reseller', 'sub_reseller', 'user'] },
            { key: 'live-test', label: 'Live Test', icon: ICONS.send, roles: ['admin', 'manager', 'reseller', 'sub_reseller', 'user'] },
            { key: 'webhook-config', label: 'Webhook Config', icon: ICONS.settings, roles: ['admin', 'manager', 'reseller', 'sub_reseller', 'user'] },
        ]
    },
    {
        group: 'SETTINGS',
        roles: ['admin', 'manager', 'reseller', 'sub_reseller', 'user'],
        items: [
            { key: 'general-settings', label: 'General Settings', icon: ICONS.settings, roles: ['admin', 'manager'] },
            { key: 'security', label: 'Security', icon: ICONS.shield, roles: ['admin', 'manager', 'reseller', 'sub_reseller', 'user'] },
            { key: 'notifications', label: 'Notifications', icon: ICONS.bell, roles: ['admin', 'manager', 'reseller', 'sub_reseller', 'user'] },
            { key: 'smpp-settings', label: 'SMPP Settings', icon: ICONS.server, roles: ['admin'] },
            { key: 'queue-settings', label: 'Queue Settings', icon: ICONS.layers, roles: ['admin'] },
            { key: 'backup-restore', label: 'Backup & Restore', icon: ICONS.shield, roles: ['admin'] },
        ]
    }
];

function init() {
    window.router.addRoute('dashboard', (c) => window.dashboard.render(c));

    // Numbers routes
    window.router.addRoute('my-numbers', (c) => window.numbers.renderMyNumbers(c));
    window.router.addRoute('self-allocation', (c) => window.numbers.renderSelfAllocation(c));
    window.router.addRoute('bulk-allocation', (c) => window.numbers.renderBulkAllocation(c));
    window.router.addRoute('export-numbers', (c) => window.numbers.renderGlobalRevoke(c)); // Mapping to management tool
    window.router.addRoute('sms-ranges', (c) => window.ranges.renderRanges(c));
    window.router.addRoute('search-access', (c) => window.searchAccess.render(c));

    // SMS routes
    window.router.addRoute('my-sms', (c) => {
        window.sms.stopLiveFeed();
        window.sms.renderMySms(c);
    });
    window.router.addRoute('profit-stats', (c) => {
        window.sms.stopLiveFeed();
        window.sms.renderProfitStats(c);
    });
    window.router.addRoute('live-otp-feed', (c) => {
        window.sms.renderLiveOtpFeed(c);
    });

    // Management routes
    window.router.addRoute('users', (c) => window.users.renderUsers(c));

    // Provider routes
    window.router.addRoute('smpp-providers', (c) => window.smpp.renderProviders(c));
    window.router.addRoute('provider-status', (c) => window.smpp.renderStatus(c));

    // Requests routes
    window.router.addRoute('payment-requests', (c) => window.payments.renderRequests(c));
    window.router.addRoute('registration-requests', (c) => window.users.renderRegRequests(c));

    // Test Panel routes
    window.router.addRoute('test-numbers', (c) => window.testPanel.renderTestNumbers(c));
    window.router.addRoute('test-reports', (c) => window.testPanel.renderTestReports(c));

    // Security Center
    window.router.addRoute('security', (c) => window.security.renderDashboard(c));

    // API routes
    window.router.addRoute('api-playground', (c) => window.apiManagement.renderPlayground(c));

    // Fill other routes as placeholders
    [...NAV_STRUCTURE, ...TEST_NAV].forEach(group => {
        group.items.forEach(item => {
            if (!window.router.routes[item.key]) {
                window.router.addRoute(item.key, (c) => {
                    c.innerHTML = `<div class="card"><div class="card-header"><div class="card-title">${item.label}</div></div><div class="card-body"><div class="empty-state"><h3>Coming Soon</h3><p>The ${item.label} page is being professionally developed.</p></div></div></div>`;
                });
            }
        });
    });

    window.router.init();

    if (window.auth.isLoggedIn()) {
        renderDashboardShell();
    } else {
        // Show verification screen before login
        window.security.renderVerification();
    }
}

function renderDashboardShell() {
    const user = window.auth.getUser();
    if (!user) {
        window.auth.renderLogin();
        return;
    }

    // Only render the shell if it doesn't exist
    if (!document.querySelector('.dashboard-layout')) {
        const role = user.role || 'user';

        // Persistent sidebar state
        const collapsedGroups = JSON.parse(localStorage.getItem('collapsedGroups') || '{}');

    const navToUse = role === 'test_user' ? TEST_NAV : NAV_STRUCTURE;

    const sidebarNav = navToUse
            .filter(group => !group.roles || group.roles.includes(role))
            .map(group => {
                const items = group.items.filter(item => !item.roles || item.roles.includes(role));
                if (items.length === 0) return '';

                const isCollapsed = collapsedGroups[group.group];
                const groupIcon = isCollapsed ? ICONS.plus : ICONS.chevronDown;

                return `
                <div class="sidebar-group ${isCollapsed ? 'collapsed' : ''}" data-group="${group.group}">
                    <div class="sidebar-group-header">
                        <span>${group.group}</span>
                        <span class="group-toggle">${groupIcon}</span>
                    </div>
                    <div class="sidebar-group-items">
                        ${items.map(item => `
                            <button class="sidebar-nav-item ${window.router.currentPage === item.key ? 'active' : ''}" data-page="${item.key}">
                                ${item.icon} ${item.label}
                            </button>
                        `).join('')}
                    </div>
                </div>`;
            }).join('');

        document.getElementById('app').innerHTML = `
        <div class="dashboard-layout">
            <button class="mobile-menu-btn" id="mobile-menu-btn">${ICONS.menu}</button>
            <div class="sidebar-overlay" id="sidebar-overlay"></div>
            <aside class="sidebar" id="sidebar">
                <div class="sidebar-logo">
                    <div class="sidebar-logo-icon">${ICONS.send}</div>
                    <div><h1>SIGMAPANEL</h1><p>SMS Panel</p></div>
                </div>
                <nav class="sidebar-nav">${sidebarNav}</nav>
                <div class="sidebar-user">
                    <div class="sidebar-user-info">
                        <div class="sidebar-user-avatar">${(user.username || 'U').charAt(0).toUpperCase()}</div>
                        <div>
                            <div class="sidebar-user-name">${user.fullName || user.username || 'User'}</div>
                            <div class="sidebar-user-role">${user.role || 'user'}</div>
                        </div>
                    </div>
                    <button class="sidebar-logout" id="logout-btn">${ICONS.logout} Logout</button>
                </div>
            </aside>
            <div class="main-content">
                <header class="top-bar">
                    <h2 class="top-bar-title" id="page-title">Dashboard</h2>
                    <div class="top-bar-actions">
                        <button id="notif-btn" style="position:relative;padding:8px;border-radius:8px;border:none;background:none;cursor:pointer;color:#6B7280">
                            ${ICONS.bell}
                            <span id="notif-badge" style="display:none;position:absolute;top:6px;right:6px;min-width:16px;height:16px;padding:0 3px;background:#ef4444;color:white;font-size:9px;font-weight:700;border-radius:8px;display:flex;align-items:center;justify-content:center">0</span>
                        </button>
                        <div class="top-bar-user">
                            <div class="top-bar-avatar">${(user.username || 'U').charAt(0).toUpperCase()}</div>
                            <div class="top-bar-user-name">
                                <div style="font-size:12px;font-weight:600;color:#222F36">${user.fullName || user.username || 'User'}</div>
                                <div class="top-bar-user-role" style="font-size:10px;color:#6B7280;text-transform:uppercase;letter-spacing:0.1em">${user.role || 'user'}</div>
                            </div>
                        </div>
                    </div>
                </header>
                <main class="page-content" id="page-content"></main>
            </div>
        </div>
        <div class="toast-container" id="toast-container"></div>`;

        // Attach Global Listeners
        document.addEventListener('click', (e) => {
            const navBtn = e.target.closest('.sidebar-nav-item');
            if (navBtn) {
                window.router.navigateTo(navBtn.dataset.page);
                return;
            }

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

            const logoutBtn = e.target.closest('#logout-btn');
            if (logoutBtn) {
                window.auth.logout();
                return;
            }

            const mobileMenuBtn = e.target.closest('#mobile-menu-btn');
            if (mobileMenuBtn) {
                document.getElementById('sidebar').classList.toggle('open');
                document.getElementById('sidebar-overlay').classList.toggle('open');
                return;
            }

            const overlay = e.target.closest('#sidebar-overlay');
            if (overlay) {
                document.getElementById('sidebar').classList.remove('open');
                document.getElementById('sidebar-overlay').classList.remove('open');
                return;
            }
        });
    }

    // Update active state in sidebar
    document.querySelectorAll('.sidebar-nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === window.router.currentPage);
    });

    // Inactivity logout (30 mins)
    if (this._inactivityTimer) clearTimeout(this._inactivityTimer);
    this._inactivityTimer = setTimeout(() => {
        window.ui.showToast('Session expired due to inactivity', 'info');
        window.auth.logout();
    }, 30 * 60 * 1000);

    // Resolve current page
    const content = document.getElementById('page-content');
    window.router.resolvePage(content);

    // Update title
    const currentNav = user.role === 'test_user' ? TEST_NAV : NAV_STRUCTURE;
    const currentItem = currentNav.flatMap(g => g.items).find(i => i.key === window.router.currentPage);
    if (currentItem) {
        document.getElementById('page-title').textContent = currentItem.label;
    }
}

window.renderDashboardShell = renderDashboardShell;
document.addEventListener('DOMContentLoaded', init);
