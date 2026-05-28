/**
 * SIGMAPANEL Main Entry Point
 */

const ROLE_LABELS = {
    admin: 'Admin',
    manager: 'Manager',
    reseller: 'Reseller',
    sub_reseller: 'Client',
    test_user: 'Test Account'
};

const ROLE_COLORS = {
    admin: 'badge-danger',
    manager: 'badge-warning',
    reseller: 'badge-primary',
    sub_reseller: 'badge-secondary'
};

const TEST_NAV = [
    {
        group: 'SMS Module',
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
        roles: ['admin', 'manager', 'reseller', 'sub_reseller'],
        items: [
            { key: 'my-numbers', label: 'My Numbers', icon: ICONS.phone, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'self-allocation', label: 'Self Allocation', icon: ICONS.layers, roles: ['reseller', 'sub_reseller'] },
            { key: 'bulk-allocation', label: 'Bulk Allocation', icon: ICONS.plus, roles: ['admin', 'manager'] },
            { key: 'sms-ranges', label: 'SMS Ranges', icon: ICONS.layers, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'search-access', label: 'Search Access', icon: ICONS.search, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'live-access', label: 'Live Access', icon: ICONS.eye, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'bulk-tools', label: 'Bulk Tools', icon: ICONS.settings, roles: ['admin', 'manager'] },
            { key: 'export-numbers', label: 'Export Numbers', icon: ICONS.transfer, roles: ['admin', 'manager'] },
            { key: 'upload-numbers', label: 'Upload Numbers', icon: ICONS.plus, roles: ['admin', 'manager'] },
            { key: 'blacklist-management', label: 'Blacklist Management', icon: ICONS.ban, roles: ['admin', 'manager'] },
        ]
    },
    {
        group: 'SMS',
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
        group: 'INTERCONNECTION',
        roles: ['admin'],
        items: [
            { key: 'smpp-interconnect', label: 'SMPP Interconnect', icon: ICONS.transfer, roles: ['admin'] },
        ]
    },
    {
        group: 'SETTINGS',
        roles: ['admin', 'manager', 'reseller', 'sub_reseller'],
        items: [
            { key: 'general-settings', label: 'General Settings', icon: ICONS.settings, roles: ['admin', 'manager'] },
            { key: 'security-settings', label: 'Security', icon: ICONS.shield, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'notifications-settings', label: 'Notifications', icon: ICONS.bell, roles: ['admin', 'manager', 'reseller', 'sub_reseller'] },
            { key: 'smpp-settings', label: 'SMPP Settings', icon: ICONS.server, roles: ['admin'] },
            { key: 'queue-settings', label: 'Queue Settings', icon: ICONS.layers, roles: ['admin'] },
            { key: 'backup-restore', label: 'Backup & Restore', icon: ICONS.shield, roles: ['admin'] },
        ]
    }
];

function init() {
  try {
    // Add routes
    window.router.addRoute('dashboard', (c) => window.dashboard.render(c));

    // Numbers routes
    window.router.addRoute('my-numbers', (c) => window.numbers.renderMyNumbers(c));
    window.router.addRoute('self-allocation', (c) => window.numbers.renderSelfAllocation(c));
    window.router.addRoute('bulk-allocation', (c) => window.numbers.renderBulkAllocation(c));
    window.router.addRoute('sms-ranges', (c) => window.ranges.renderRanges(c));
    window.router.addRoute('search-access', (c) => window.searchAccess.render(c));
    window.router.addRoute('live-access', (c) => window.numbers.renderLiveAccess(c));
    window.router.addRoute('bulk-tools', (c) => window.numbers.renderBulkTools(c));
    window.router.addRoute('export-numbers', (c) => window.numbers.renderExport(c));
    window.router.addRoute('upload-numbers', (c) => window.numbers.renderUpload(c));
    window.router.addRoute('blacklist-management', (c) => window.numbers.renderBlacklist(c));

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
    window.router.addRoute('sms-analytics', (c) => {
        window.sms.stopLiveFeed();
        window.sms.renderAnalytics(c);
    });
    window.router.addRoute('search-sms', (c) => {
        window.sms.stopLiveFeed();
        window.sms.renderSearchSms(c);
    });
    window.router.addRoute('delivery-logs', (c) => {
        window.sms.stopLiveFeed();
        window.sms.renderDeliveryLogs(c);
    });
    window.router.addRoute('failed-sms', (c) => {
        window.sms.stopLiveFeed();
        window.numbers.renderFailedSms(c);
    });

    // Management routes
    window.router.addRoute('users', (c) => window.users.renderUsers(c));
    window.router.addRoute('managers', (c) => window.users.renderUsersByRole(c, 'manager'));
    window.router.addRoute('resellers', (c) => window.users.renderUsersByRole(c, 'reseller'));
    window.router.addRoute('sub-resellers', (c) => window.users.renderUsersByRole(c, 'sub_reseller'));
    window.router.addRoute('account-balances', (c) => window.users.renderBalances(c));

    // Provider routes
    window.router.addRoute('smpp-providers', (c) => window.smpp.renderProviders(c));
    window.router.addRoute('http-providers', (c) => window.smpp.renderHttpProviders(c));
    window.router.addRoute('provider-status', (c) => window.smpp.renderStatus(c));
    window.router.addRoute('connection-logs', (c) => window.smpp.renderConnectionLogs(c));
    window.router.addRoute('failover-management', (c) => window.smpp.renderFailover(c));

    // Requests routes
    window.router.addRoute('payment-requests', (c) => window.payments.renderRequests(c));
    window.router.addRoute('registration-requests', (c) => window.users.renderRegRequests(c));
    window.router.addRoute('permissions', (c) => window.users.renderPermissions(c));

    // Interconnect routes
    window.router.addRoute('smpp-interconnect', (c) => window.smppInterconnect.render(c));

    // Test Panel routes
    window.router.addRoute('test-numbers', (c) => window.testPanel.renderTestNumbers(c));
    window.router.addRoute('test-reports', (c) => window.testPanel.renderTestReports(c));
    window.router.addRoute('test-live-feed', (c) => window.testPanel.renderLiveFeed(c));
    window.router.addRoute('test-range-tester', (c) => window.testPanel.renderRangeTester(c));
    window.router.addRoute('test-traffic-stats', (c) => window.testPanel.renderTrafficStats(c));
    window.router.addRoute('test-provider-monitor', (c) => window.testPanel.renderProviderMonitor(c));

    // API routes
    window.router.addRoute('api-playground', (c) => window.apiManagement.renderPlayground(c));

    // Settings routes
    window.router.addRoute('general-settings', (c) => window.settings.renderGeneral(c));
    window.router.addRoute('security-settings', (c) => window.settings.renderSecurity(c));
    window.router.addRoute('notifications-settings', (c) => window.settings.renderNotifications(c));
    window.router.addRoute('documentation', (c) => window.settings.renderDocumentation(c));
    window.router.addRoute('webhook-config', (c) => window.settings.renderWebhookConfig(c));

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

    if (window.auth.isLoggedIn()) {
        window.router.init();
    } else {
        window.security.renderVerification();
    }
  } catch (err) {
    console.error('SIGMAPANEL initialization failed:', err);
    document.getElementById('app').innerHTML = `
      <div style="padding:20px; text-align:center; color:#ef4444">
        <h3>Critical Initialization Error</h3>
        <p>${err.message}</p>
        <button onclick="location.reload()" class="fly-btn" style="margin-top:10px">Reload Panel</button>
      </div>`;
  }
}

function renderDashboardShell() {
  try {
    const user = window.auth.getUser();
    if (!user) {
        window.auth.renderLogin();
        return;
    }

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
                    <div><h1>SIGMAPANEL</h1><p>Telecom Infrastructure</p></div>
                </div>
                <nav class="sidebar-nav">${sidebarNav}</nav>
                <div class="sidebar-user">
                    <div class="sidebar-user-info">
                        <div class="sidebar-user-avatar">${(user.username || 'U').charAt(0).toUpperCase()}</div>
                        <div>
                            <div class="sidebar-user-name">${user.fullName || user.username || 'User'}</div>
                            <div class="sidebar-user-role">${ROLE_LABELS[user.role] || user.role}</div>
                        </div>
                    </div>
                    <button class="sidebar-logout" id="logout-btn">${ICONS.logout} Logout</button>
                </div>
            </aside>
            <div class="main-content">
                <header class="top-bar">
                    <h2 class="top-bar-title" id="page-title">Dashboard</h2>
                    <div class="top-bar-actions">
                        <button id="notif-btn" style="position:relative;padding:8px;background:none;border:none;cursor:pointer;color:#6B7280">${ICONS.bell}</button>
                        <div class="top-bar-user">
                            <div class="top-bar-avatar">${(user.username || 'U').charAt(0).toUpperCase()}</div>
                            <div class="top-bar-user-name">
                                <div style="font-size:12px;font-weight:600">${user.username}</div>
                                <div style="font-size:10px;color:#6B7280;text-transform:uppercase">${user.role}</div>
                            </div>
                        </div>
                    </div>
                </header>
                <main class="page-content" id="page-content"></main>
            </div>
        </div>
        <div id="toast-container"></div>`;

        // Listeners
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
            if (e.target.closest('#logout-btn')) { window.auth.logout(); return; }
            if (e.target.closest('#mobile-menu-btn')) {
                document.getElementById('sidebar').classList.toggle('open');
                document.getElementById('sidebar-overlay').classList.toggle('open');
                return;
            }
            if (e.target.closest('#sidebar-overlay')) {
                document.getElementById('sidebar').classList.remove('open');
                document.getElementById('sidebar-overlay').classList.remove('open');
                return;
            }
        });
    }

    document.querySelectorAll('.sidebar-nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === window.router.currentPage);
    });

    if (window._inactivityTimer) clearTimeout(window._inactivityTimer);
    window._inactivityTimer = setTimeout(() => {
        if (window.auth.isLoggedIn()) {
            window.ui.showToast('Session expired', 'info');
            window.auth.logout();
        }
    }, 30 * 60 * 1000);

    const content = document.getElementById('page-content');
    window.router.resolvePage(content);

    const currentNav = user.role === 'test_user' ? TEST_NAV : NAV_STRUCTURE;
    const currentItem = currentNav.flatMap(g => g.items).find(i => i.key === window.router.currentPage);
    if (currentItem) document.getElementById('page-title').textContent = currentItem.label;

  } catch (err) {
    console.error('Dashboard shell rendering failed:', err);
  }
}

window.renderDashboardShell = renderDashboardShell;
document.addEventListener('DOMContentLoaded', init);
