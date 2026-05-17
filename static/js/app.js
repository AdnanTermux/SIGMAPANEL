// ========== SIGMAPANEL SPA ==========
const API = '/api';

// ========== API HELPER ==========
function getToken() { return localStorage.getItem('token'); }
function getUser() {
    try { return JSON.parse(localStorage.getItem('user')); }
    catch { return null; }
}

async function apiCall(endpoint, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers };
    const res = await fetch(endpoint, { ...options, headers });
    if (res.status === 401) { localStorage.removeItem('token'); localStorage.removeItem('user'); location.reload(); throw new Error('Unauthorized'); }
    if (!res.ok) {
        let msg = 'Request failed';
        try { const j = await res.json(); msg = j.error || j.detail || msg; } catch {}
        throw new Error(msg);
    }
    return res.json();
}

// ========== TOAST ==========
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ========== ICONS (inline SVGs) ==========
const ICONS = {
    dashboard: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    phone: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    layers: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
    sms: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    users: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    settings: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    logout: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    send: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    plus: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    edit: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    trash: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    x: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    menu: '<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    bell: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    eye: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeOff: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
    search: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    lock: '<svg width="64" height="64" viewBox="0 0 64 64"><path fill="#6446fe" d="M59,8H5A1,1,0,0,0,4,9V55a1,1,0,0,0,1,1H59a1,1,0,0,0,1-1V9A1,1,0,0,0,59,8ZM58,54H6V10H58Z"/><path fill="#735DFF" d="M36,35H28a3,3,0,0,1-3-3V27a3,3,0,0,1,3-3h8a3,3,0,0,1,3,3v5A3,3,0,0,1,36,35Zm-8-9a1,1,0,0,0-1,1v5a1,1,0,0,0,1,1h8a1,1,0,0,0,1-1V27a1,1,0,0,0-1-1Z"/><path fill="#735DFF" d="M36 26H28a1 1 0 0 1-1-1V24a5 5 0 0 1 10 0v1A1 1 0 0 1 36 26zm-7-2h6a3 3 0 0 0-6 0zM32 31a1 1 0 0 1-1-1V29a1 1 0 0 1 2 0v1A1 1 0 0 1 32 31z"/></svg>',
};

// ========== NAV ITEMS ==========
// Extra icons
ICONS.server = '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>';
ICONS.ban = '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>';
ICONS.key = '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>';
ICONS.wallet = '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>';
ICONS.ticket = '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/></svg>';
ICONS.chart = '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>';
ICONS.tag = '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>';
ICONS.shield = '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
ICONS.transfer = '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>';

const ROLE_LABELS = { admin:'Admin', manager:'Manager', reseller:'Reseller', sub_reseller:'Sub Reseller', end_user:'End User', super_admin:'Super Admin' };
const ROLE_COLORS = { admin:'badge-danger', manager:'badge-warning', reseller:'badge-primary', sub_reseller:'badge-secondary', end_user:'badge-secondary', super_admin:'badge-danger' };

const NAV_ITEMS = [
    { key: 'dashboard',     label: 'Dashboard',    icon: ICONS.dashboard, roles: null },
    { key: 'numbers',       label: 'Numbers',       icon: ICONS.phone,    roles: null },
    { key: 'ranges',        label: 'Ranges',        icon: ICONS.layers,   roles: null },
    { key: 'allocations',   label: 'Allocations',   icon: ICONS.chart,    roles: null },
    { key: 'sms-reports',   label: 'SMS Reports',   icon: ICONS.sms,      roles: null },
    { key: 'users',         label: 'Users',         icon: ICONS.users,    roles: ['admin','manager'] },
    { key: 'providers',     label: 'Providers',     icon: ICONS.server,   roles: ['admin'] },
    { key: 'blacklist',     label: 'App Blacklist', icon: ICONS.ban,      roles: ['admin','manager'] },
    { key: 'pricing',       label: 'Pricing',       icon: ICONS.tag,      roles: ['admin','manager','reseller'] },
    { key: 'transactions',  label: 'Ledger',        icon: ICONS.transfer, roles: null },
    { key: 'audit-logs',    label: 'Audit Logs',    icon: ICONS.shield,   roles: ['admin'] },
    { key: 'support',       label: 'Support',       icon: ICONS.ticket,   roles: null },
    { key: 'settings',      label: 'Settings',      icon: ICONS.settings, roles: null },
];

const PAGE_TITLES = {
    'dashboard':'Dashboard','numbers':'Numbers','ranges':'Ranges','allocations':'Allocations',
    'sms-reports':'SMS Reports','users':'Users','providers':'Providers',
    'blacklist':'App Blacklist','pricing':'Pricing Rules','transactions':'Transaction Ledger',
    'audit-logs':'Audit Logs','support':'Support Tickets','settings':'Settings',
};

let currentPage = 'dashboard';
let user = getUser();

// ========== INIT ==========
function init() {
    if (getToken() && user) {
        renderDashboard();
    } else {
        renderLogin();
    }
}

// ========== LOGIN ==========
function renderLogin() {
    document.getElementById('app').innerHTML = `
    <div class="auth-page">
        <div class="auth-card">
            <div class="auth-cover">
                <div class="auth-cover-content">
                    <div style="font-size:64px;opacity:0.9;margin-bottom:16px">${ICONS.send}</div>
                    <h2>"Welcome to SIGMAPANEL. Your one stop solutions for all A2P, P2P SMS with High Availability and Worldwide Access"</h2>
                </div>
            </div>
            <div class="auth-form">
                <div class="auth-form-inner">
                    <div style="text-align:center;margin-bottom:16px">${ICONS.lock}</div>
                    <h1 style="text-align:center;font-size:24px;font-weight:600;color:#222F36;margin-bottom:4px">Sign In</h1>
                    <p style="text-align:center;color:#6B7280;font-size:14px;margin-bottom:24px">Welcome back!</p>
                    <div id="login-error" style="display:none;margin-bottom:16px;padding:12px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;color:#ef4444;font-size:13px;font-weight:500"></div>
                    <form id="login-form">
                        <div class="form-group">
                            <label class="fly-label">User Name</label>
                            <input type="text" id="login-username" class="fly-input" placeholder="Enter User Name" autocomplete="username" required>
                        </div>
                        <div class="form-group">
                            <label class="fly-label">Password</label>
                            <div class="input-wrapper">
                                <input type="password" id="login-password" class="fly-input" placeholder="Password" autocomplete="current-password" required style="padding-right:44px">
                                <button type="button" class="password-toggle" id="toggle-password">${ICONS.eye}</button>
                            </div>
                        </div>
                        <div class="form-group">
                            <div class="captcha-section">
                                <div class="captcha-question">What is <span id="captcha-text"></span> = ?</div>
                                <div class="captcha-answer">
                                    <input type="number" id="captcha-answer" class="fly-input" placeholder="Answer" style="font-size:14px;padding:6px 12px">
                                </div>
                            </div>
                        </div>
                        <div style="margin-top:20px">
                            <button type="submit" class="fly-btn" style="width:100%" id="login-btn">Sign-In</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>`;

    // Captcha
    const ops = ['+', '-'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let n1, n2, answer;
    if (op === '+') { n1 = Math.floor(Math.random() * 9) + 1; n2 = Math.floor(Math.random() * 9) + 1; answer = n1 + n2; }
    else { n1 = Math.floor(Math.random() * 9) + 2; n2 = Math.floor(Math.random() * (n1 - 1)) + 1; answer = n1 - n2; }
    window._captchaAnswer = answer;
    document.getElementById('captcha-text').textContent = `${n1} ${op} ${n2}`;

    // Events
    document.getElementById('toggle-password').addEventListener('click', () => {
        const inp = document.getElementById('login-password');
        const isPassword = inp.type === 'password';
        inp.type = isPassword ? 'text' : 'password';
        document.getElementById('toggle-password').innerHTML = isPassword ? ICONS.eyeOff : ICONS.eye;
    });

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const captchaVal = document.getElementById('captcha-answer').value;
        const errorEl = document.getElementById('login-error');

        if (!username || !password) { errorEl.textContent = 'Username and password are required'; errorEl.style.display = 'block'; return; }
        if (!captchaVal || parseInt(captchaVal) !== window._captchaAnswer) { errorEl.textContent = 'Incorrect captcha answer'; errorEl.style.display = 'block'; return; }
        errorEl.style.display = 'none';

        const btn = document.getElementById('login-btn');
        btn.disabled = true;
        btn.textContent = 'Signing In...';

        try {
            const data = await apiCall(`${API}/auth/login`, { method: 'POST', body: JSON.stringify({ username, password }) });
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            user = data.user;
            renderDashboard();
            showToast('Welcome back!', 'success');
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Sign-In';
        }
    });
}

// ========== DASHBOARD SHELL ==========
function renderDashboard() {
    if (!user) user = getUser();
    const role = user?.role || 'admin';
    const navItems = NAV_ITEMS
        .filter(item => !item.roles || item.roles.includes(role))
        .map(item => `
        <button class="sidebar-nav-item ${currentPage === item.key ? 'active' : ''}" data-page="${item.key}">
            ${item.icon} ${item.label}
        </button>
    `).join('');

    document.getElementById('app').innerHTML = `
    <div class="dashboard-layout">
        <button class="mobile-menu-btn" id="mobile-menu-btn">${ICONS.menu}</button>
        <div class="sidebar-overlay" id="sidebar-overlay"></div>
        <aside class="sidebar" id="sidebar">
            <div class="sidebar-logo">
                <div class="sidebar-logo-icon">${ICONS.send}</div>
                <div><h1>SIGMAPANEL</h1><p>SMS Panel</p></div>
            </div>
            <nav class="sidebar-nav">${navItems}</nav>
            <div class="sidebar-user">
                <div class="sidebar-user-info">
                    <div class="sidebar-user-avatar">${(user?.username || 'U').charAt(0).toUpperCase()}</div>
                    <div><div class="sidebar-user-name">${user?.fullName || user?.username || 'User'}</div><div class="sidebar-user-role">${user?.role || 'admin'}</div></div>
                </div>
                <button class="sidebar-logout" id="logout-btn">${ICONS.logout} Logout</button>
            </div>
        </aside>
        <div class="main-content">
            <header class="top-bar">
                <h2 class="top-bar-title">${PAGE_TITLES[currentPage] || 'Dashboard'}</h2>
                <div class="top-bar-actions">
                    <button style="position:relative;padding:8px;border-radius:8px;border:none;background:none;cursor:pointer;color:#6B7280">${ICONS.bell}<span style="position:absolute;top:6px;right:6px;width:8px;height:8px;background:#ef4444;border-radius:50%"></span></button>
                    <div class="top-bar-user">
                        <div class="top-bar-avatar">${(user?.username || 'U').charAt(0).toUpperCase()}</div>
                        <div class="top-bar-user-name"><div style="font-size:12px;font-weight:600;color:#222F36">${user?.fullName || user?.username || 'User'}</div><div class="top-bar-user-role" style="font-size:10px;color:#6B7280;text-transform:uppercase;letter-spacing:0.1em">${user?.role || 'admin'}</div></div>
                    </div>
                </div>
            </header>
            <main class="page-content" id="page-content"></main>
        </div>
    </div>
    <div class="toast-container" id="toast-container"></div>`;

    // Events
    document.querySelectorAll('.sidebar-nav-item').forEach(btn => {
        btn.addEventListener('click', () => { currentPage = btn.dataset.page; renderDashboard(); });
    });
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        localStorage.removeItem('token'); localStorage.removeItem('user'); user = null; renderLogin();
    });
    document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
        document.getElementById('sidebar-overlay').classList.toggle('open');
    });
    document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebar-overlay').classList.remove('open');
    });

    // Render page content
    const content = document.getElementById('page-content');
    switch (currentPage) {
        case 'dashboard':    renderDashboardPage(content); break;
        case 'numbers':      renderNumbersPage(content); break;
        case 'ranges':       renderRangesPage(content); break;
        case 'allocations':  renderAllocationsPage(content); break;
        case 'sms-reports':  renderSmsReportsPage(content); break;
        case 'users':        renderUsersPage(content); break;
        case 'providers':    renderProvidersPage(content); break;
        case 'blacklist':    renderBlacklistPage(content); break;
        case 'pricing':      renderPricingPage(content); break;
        case 'transactions': renderTransactionsPage(content); break;
        case 'audit-logs':   renderAuditLogsPage(content); break;
        case 'support':      renderSupportPage(content); break;
        case 'settings':     renderSettingsPage(content); break;
        default:             renderDashboardPage(content);
    }
}

// ========== DASHBOARD PAGE ==========
async function renderDashboardPage(container) {
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    try {
        const stats = await apiCall(`${API}/dashboard/stats`);
        const recent = await apiCall(`${API}/dashboard/recent-sms?limit=10`);

        const maxChart = Math.max(...stats.weekSmsByDay.map(d => d.count), 1);

        container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-card-label">Today's SMS</div><div class="stat-card-value">${stats.todaySms}</div></div>
            <div class="stat-card"><div class="stat-card-label">This Week</div><div class="stat-card-value">${stats.weekSms}</div></div>
            <div class="stat-card"><div class="stat-card-label">This Month</div><div class="stat-card-value">${stats.monthSms}</div></div>
            <div class="stat-card"><div class="stat-card-label">Total Numbers</div><div class="stat-card-value">${stats.totalNumbers}</div><div class="stat-card-change">${stats.activeNumbers} active</div></div>
            <div class="stat-card"><div class="stat-card-label">Today's Profit</div><div class="stat-card-value">$${stats.todayProfit.toFixed(2)}</div></div>
            <div class="stat-card"><div class="stat-card-label">Month Profit</div><div class="stat-card-value">$${stats.monthProfit.toFixed(2)}</div></div>
            <div class="stat-card"><div class="stat-card-label">Total Users</div><div class="stat-card-value">${stats.totalUsers}</div></div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
            <div class="card">
                <div class="card-header"><div class="card-title">Weekly SMS Activity</div></div>
                <div class="chart-container" id="weekly-chart">
                    ${stats.weekSmsByDay.map(d => `
                        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%">
                            <div style="font-size:11px;font-weight:600;color:#222F36;margin-bottom:4px">${d.count}</div>
                            <div style="width:100%;max-width:40px;background:linear-gradient(to top,#735DFF,#a78bfa);border-radius:4px 4px 0 0;height:${Math.max((d.count / maxChart) * 100, 4)}%;transition:height 0.3s ease"></div>
                            <div style="font-size:10px;color:#6B7280;margin-top:6px">${d.date.slice(5)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="card">
                <div class="card-header"><div class="card-title">Top Services Today</div></div>
                <div class="service-list">
                    ${stats.todaySmsByService.length ? stats.todaySmsByService.map(s => `
                        <div class="service-chip">${s.service || 'Unknown'} <span class="service-chip-count">${s.count}</span></div>
                    `).join('') : '<div class="empty-state"><p>No SMS received today</p></div>'}
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header"><div class="card-title">Recent SMS</div></div>
            <div class="table-wrapper">
                <table class="fly-table">
                    <thead><tr><th>Number</th><th>Service (Sender)</th><th>Recipient</th><th>OTP</th><th>Message</th><th>Received</th></tr></thead>
                    <tbody>
                        ${recent.data.length ? recent.data.map(s => `
                            <tr>
                                <td><code style="font-size:12px">${s.number}</code></td>
                                <td>${s.service ? `<span class="badge badge-primary">${s.service}</span>` : '<span style="color:#9ca3af">N/A</span>'}</td>
                                <td>${s.recipient || '<span style="color:#9ca3af">-</span>'}</td>
                                <td>${s.otp ? `<span class="otp-code">${s.otp}</span>` : '-'}</td>
                                <td class="message-text" title="${escapeHtml(s.message)}">${escapeHtml(s.message)}</td>
                                <td style="font-size:12px;color:#6B7280">${formatDate(s.received_at)}</td>
                            </tr>
                        `).join('') : '<tr class="empty-row"><td colspan="6">No SMS received yet</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>`;
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
    }
}

// ========== GENERIC CRUD PAGE ==========
async function renderNumbersPage(container) {
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    let page = 1;
    const load = async () => {
        try {
            const data = await apiCall(`${API}/numbers?page=${page}&limit=20`);
            const rows = data.data || [];
            const pg = data.pagination;
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Numbers (${pg.total})</div>
                    <button class="fly-btn fly-btn-sm" id="add-number-btn">${ICONS.plus} Add Number</button>
                </div>
                <div class="filter-bar">
                    <input type="text" class="search-input" placeholder="Search numbers..." id="numbers-search">
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Number</th><th>Country</th><th>Service</th><th>Range</th><th>Status</th><th>SMS Count</th><th>Actions</th></tr></thead>
                        <tbody id="numbers-tbody">
                            ${rows.length ? rows.map(n => `
                                <tr>
                                    <td><code style="font-size:12px">${n.number}</code></td>
                                    <td>${n.country_name || n.country || '-'}</td>
                                    <td>${n.service ? `<span class="badge badge-primary">${n.service}</span>` : '-'}</td>
                                    <td>${n.range_name || '-'}</td>
                                    <td><span class="badge ${n.status === 'active' ? 'badge-success' : n.status === 'inactive' ? 'badge-danger' : 'badge-warning'}">${n.status}</span></td>
                                    <td>${n.total_sms}</td>
                                    <td class="actions-cell">
                                        <button class="action-btn" onclick="editNumber('${n.id}')">${ICONS.edit}</button>
                                        <button class="action-btn delete" onclick="deleteNumber('${n.id}','${escapeHtml(n.number)}')">${ICONS.trash}</button>
                                    </td>
                                </tr>
                            `).join('') : '<tr class="empty-row"><td colspan="7">No numbers found</td></tr>'}
                        </tbody>
                    </table>
                </div>
                ${renderPagination(pg, (p) => { page = p; load(); })}
            </div>
            <div id="modal-root"></div>`;

            document.getElementById('add-number-btn')?.addEventListener('click', () => showNumberModal());
            document.getElementById('numbers-search')?.addEventListener('input', debounce(async (e) => {
                const q = e.target.value;
                const data = await apiCall(`${API}/numbers?search=${encodeURIComponent(q)}&limit=50`);
                renderTableRows('numbers-tbody', data.data, 'numbers');
            }, 300));
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    };
    await load();
}

async function showNumberModal(existing = null) {
    const isEdit = !!existing;
    const root = document.getElementById('modal-root');
    if (!root) return;
    root.innerHTML = `
    <div class="modal-overlay" id="number-modal-overlay">
        <div class="modal">
            <div class="modal-header"><div class="modal-title">${isEdit ? 'Edit Number' : 'Add Number'}</div><button class="modal-close" id="close-modal">${ICONS.x}</button></div>
            <div class="modal-body">
                <div class="form-group"><label>Number *</label><input class="fly-input" id="num-number" value="${existing?.number || ''}" ${isEdit ? 'readonly' : ''} placeholder="+1234567890"></div>
                <div class="form-row">
                    <div class="form-group"><label>Country Code</label><input class="fly-input" id="num-country" value="${existing?.country || ''}" placeholder="US"></div>
                    <div class="form-group"><label>Country Name</label><input class="fly-input" id="num-countryName" value="${existing?.country_name || ''}" placeholder="United States"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Service</label><input class="fly-input" id="num-service" value="${existing?.service || ''}" placeholder="Google"></div>
                    <div class="form-group"><label>Range</label><input class="fly-input" id="num-rangeName" value="${existing?.range_name || ''}" placeholder="US-Mobile"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Status</label><select class="fly-input" id="num-status"><option value="active" ${existing?.status === 'active' ? 'selected' : ''}>Active</option><option value="inactive" ${existing?.status === 'inactive' ? 'selected' : ''}>Inactive</option><option value="maintenance" ${existing?.status === 'maintenance' ? 'selected' : ''}>Maintenance</option></select></div>
                    <div class="form-group"><label>Assigned To</label><input class="fly-input" id="num-assignedTo" value="${existing?.assigned_to || ''}" placeholder="username"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Rate ($)</label><input class="fly-input" id="num-rate" type="number" step="0.01" value="${existing?.rate || 0}"></div>
                    <div class="form-group"><label>Profit Margin (%)</label><input class="fly-input" id="num-profitMargin" type="number" step="0.01" value="${existing?.profit_margin || 0}"></div>
                </div>
            </div>
            <div class="modal-footer"><button class="fly-btn fly-btn-secondary" id="cancel-modal">Cancel</button><button class="fly-btn" id="save-modal">${isEdit ? 'Update' : 'Create'}</button></div>
        </div>
    </div>`;

    const close = () => root.innerHTML = '';
    document.getElementById('close-modal').onclick = close;
    document.getElementById('cancel-modal').onclick = close;
    document.getElementById('number-modal-overlay').onclick = (e) => { if (e.target.id === 'number-modal-overlay') close(); };

    document.getElementById('save-modal').onclick = async () => {
        const body = {
            number: document.getElementById('num-number').value.trim(),
            country: document.getElementById('num-country').value.trim() || null,
            countryName: document.getElementById('num-countryName').value.trim() || null,
            service: document.getElementById('num-service').value.trim() || null,
            rangeName: document.getElementById('num-rangeName').value.trim() || null,
            status: document.getElementById('num-status').value,
            assignedTo: document.getElementById('num-assignedTo').value.trim() || null,
            rate: parseFloat(document.getElementById('num-rate').value) || 0,
            profitMargin: parseFloat(document.getElementById('num-profitMargin').value) || 0,
        };
        if (!body.number && !isEdit) { showToast('Number is required', 'error'); return; }
        try {
            if (isEdit) { await apiCall(`${API}/numbers/${existing.id}`, { method: 'PUT', body: JSON.stringify(body) }); showToast('Number updated', 'success'); }
            else { await apiCall(`${API}/numbers`, { method: 'POST', body: JSON.stringify(body) }); showToast('Number created', 'success'); }
            close(); renderDashboard();
        } catch (err) { showToast(err.message, 'error'); }
    };
}

window.editNumber = async (id) => {
    try { const { data } = await apiCall(`${API}/numbers/${id}`); showNumberModal(data); } catch (err) { showToast(err.message, 'error'); }
};
window.deleteNumber = async (id, number) => {
    if (!confirm(`Delete number ${number}?`)) return;
    try { await apiCall(`${API}/numbers/${id}`, { method: 'DELETE' }); showToast('Number deleted', 'success'); renderDashboard(); } catch (err) { showToast(err.message, 'error'); }
};

// ========== RANGES PAGE ==========
async function renderRangesPage(container) {
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    let page = 1;
    const load = async () => {
        try {
            const data = await apiCall(`${API}/ranges?page=${page}&limit=20`);
            const rows = data.data || [];
            const pg = data.pagination;
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Ranges (${pg.total})</div>
                    <button class="fly-btn fly-btn-sm" id="add-range-btn">${ICONS.plus} Add Range</button>
                </div>
                <div class="filter-bar">
                    <input type="text" class="search-input" placeholder="Search ranges..." id="ranges-search">
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Name</th><th>Country</th><th>Rate</th><th>Profit %</th><th>Numbers</th><th>Total SMS</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody id="ranges-tbody">
                            ${rows.length ? rows.map(r => `
                                <tr>
                                    <td style="font-weight:600">${escapeHtml(r.name)}</td>
                                    <td>${r.country_name || r.country_code || '-'}</td>
                                    <td>$${r.rate}</td>
                                    <td>${r.profit_margin}%</td>
                                    <td>${r._count?.numbers || 0}</td>
                                    <td>${r.total_sms}</td>
                                    <td><span class="badge ${r.status === 'active' ? 'badge-success' : r.status === 'inactive' ? 'badge-danger' : 'badge-warning'}">${r.status}</span></td>
                                    <td class="actions-cell">
                                        <button class="action-btn" onclick="editRange('${r.id}')">${ICONS.edit}</button>
                                        <button class="action-btn delete" onclick="deleteRange('${r.id}','${escapeHtml(r.name)}')">${ICONS.trash}</button>
                                    </td>
                                </tr>
                            `).join('') : '<tr class="empty-row"><td colspan="8">No ranges found</td></tr>'}
                        </tbody>
                    </table>
                </div>
                ${renderPagination(pg, (p) => { page = p; load(); })}
            </div>
            <div id="modal-root"></div>`;

            document.getElementById('add-range-btn')?.addEventListener('click', () => showRangeModal());
            document.getElementById('ranges-search')?.addEventListener('input', debounce(async (e) => {
                const q = e.target.value;
                const data = await apiCall(`${API}/ranges?search=${encodeURIComponent(q)}&limit=50`);
                renderTableRows('ranges-tbody', data.data, 'ranges');
            }, 300));
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    };
    await load();
}

async function showRangeModal(existing = null) {
    const isEdit = !!existing;
    const root = document.getElementById('modal-root');
    if (!root) return;
    root.innerHTML = `
    <div class="modal-overlay" id="range-modal-overlay">
        <div class="modal">
            <div class="modal-header"><div class="modal-title">${isEdit ? 'Edit Range' : 'Add Range'}</div><button class="modal-close" id="close-modal">${ICONS.x}</button></div>
            <div class="modal-body">
                <div class="form-group"><label>Range Name *</label><input class="fly-input" id="rng-name" value="${existing?.name || ''}" placeholder="US-Mobile"></div>
                <div class="form-row">
                    <div class="form-group"><label>Country Code</label><input class="fly-input" id="rng-countryCode" value="${existing?.country_code || ''}" placeholder="US"></div>
                    <div class="form-group"><label>Country Name</label><input class="fly-input" id="rng-countryName" value="${existing?.country_name || ''}" placeholder="United States"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Rate ($)</label><input class="fly-input" id="rng-rate" type="number" step="0.01" value="${existing?.rate || 0}"></div>
                    <div class="form-group"><label>Profit Margin (%)</label><input class="fly-input" id="rng-profitMargin" type="number" step="0.01" value="${existing?.profit_margin || 0}"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>OTP Limit/Day</label><input class="fly-input" id="rng-otpLimit" type="number" value="${existing?.otp_limit_per_day || 0}"></div>
                    <div class="form-group"><label>Status</label><select class="fly-input" id="rng-status"><option value="active" ${existing?.status === 'active' ? 'selected' : ''}>Active</option><option value="inactive" ${existing?.status === 'inactive' ? 'selected' : ''}>Inactive</option><option value="maintenance" ${existing?.status === 'maintenance' ? 'selected' : ''}>Maintenance</option></select></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Global Allocation Limit</label><input class="fly-input" id="rng-allocGlobal" type="number" value="${existing?.allocation_limit_global || 10000}"></div>
                    <div class="form-group"><label>Per-User Limit</label><input class="fly-input" id="rng-allocPerUser" type="number" value="${existing?.allocation_limit_per_user || 100}"></div>
                </div>
            </div>
            <div class="modal-footer"><button class="fly-btn fly-btn-secondary" id="cancel-modal">Cancel</button><button class="fly-btn" id="save-modal">${isEdit ? 'Update' : 'Create'}</button></div>
        </div>
    </div>`;

    const close = () => root.innerHTML = '';
    document.getElementById('close-modal').onclick = close;
    document.getElementById('cancel-modal').onclick = close;
    document.getElementById('range-modal-overlay').onclick = (e) => { if (e.target.id === 'range-modal-overlay') close(); };

    document.getElementById('save-modal').onclick = async () => {
        const body = {
            name: document.getElementById('rng-name').value.trim(),
            countryCode: document.getElementById('rng-countryCode').value.trim() || null,
            countryName: document.getElementById('rng-countryName').value.trim() || null,
            rate: parseFloat(document.getElementById('rng-rate').value) || 0,
            profitMargin: parseFloat(document.getElementById('rng-profitMargin').value) || 0,
            otpLimitPerDay: parseInt(document.getElementById('rng-otpLimit').value) || 0,
            status: document.getElementById('rng-status').value,
            allocationLimitGlobal: parseInt(document.getElementById('rng-allocGlobal').value) || 10000,
            allocationLimitPerUser: parseInt(document.getElementById('rng-allocPerUser').value) || 100,
        };
        if (!body.name) { showToast('Range name is required', 'error'); return; }
        try {
            if (isEdit) { await apiCall(`${API}/ranges/${existing.id}`, { method: 'PUT', body: JSON.stringify(body) }); showToast('Range updated', 'success'); }
            else { await apiCall(`${API}/ranges`, { method: 'POST', body: JSON.stringify(body) }); showToast('Range created', 'success'); }
            close(); renderDashboard();
        } catch (err) { showToast(err.message, 'error'); }
    };
}

window.editRange = async (id) => {
    try { const { data } = await apiCall(`${API}/ranges/${id}`); showRangeModal(data); } catch (err) { showToast(err.message, 'error'); }
};
window.deleteRange = async (id, name) => {
    if (!confirm(`Delete range "${name}"? Numbers will be unlinked.`)) return;
    try { await apiCall(`${API}/ranges/${id}`, { method: 'DELETE' }); showToast('Range deleted', 'success'); renderDashboard(); } catch (err) { showToast(err.message, 'error'); }
};

// ========== SMS REPORTS PAGE ==========
async function renderSmsReportsPage(container) {
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    let page = 1;
    const load = async () => {
        try {
            const data = await apiCall(`${API}/sms?page=${page}&limit=20`);
            const rows = data.data || [];
            const pg = data.pagination;
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">SMS Reports (${pg.total})</div></div>
                <div class="filter-bar">
                    <input type="text" class="search-input" placeholder="Search by number, service..." id="sms-search">
                    <select class="filter-select" id="sms-otp-filter"><option value="">All SMS</option><option value="true">With OTP only</option><option value="false">Without OTP</option></select>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Number</th><th>Service (Sender)</th><th>Recipient</th><th>OTP</th><th>Country</th><th>Message</th><th>Received</th></tr></thead>
                        <tbody id="sms-tbody">
                            ${rows.length ? rows.map(s => `
                                <tr>
                                    <td><code style="font-size:12px">${s.number}</code></td>
                                    <td>${s.service ? `<span class="badge badge-primary">${s.service}</span>` : (s.sender ? `<span class="badge badge-secondary">${escapeHtml(s.sender)}</span>` : '<span style="color:#9ca3af">N/A</span>')}</td>
                                    <td>${s.recipient || '<span style="color:#9ca3af">-</span>'}</td>
                                    <td>${s.otp ? `<span class="otp-code">${s.otp}</span>` : '-'}</td>
                                    <td>${s.country || '-'}</td>
                                    <td class="message-text" title="${escapeHtml(s.message)}">${escapeHtml(s.message)}</td>
                                    <td style="font-size:12px;color:#6B7280">${formatDate(s.received_at)}</td>
                                </tr>
                            `).join('') : '<tr class="empty-row"><td colspan="7">No SMS found</td></tr>'}
                        </tbody>
                    </table>
                </div>
                ${renderPagination(pg, (p) => { page = p; load(); })}
            </div>`;

            document.getElementById('sms-search')?.addEventListener('input', debounce(async (e) => {
                const q = e.target.value;
                const data = await apiCall(`${API}/sms?number=${encodeURIComponent(q)}&limit=50`);
                renderTableRows('sms-tbody', data.data, 'sms');
            }, 300));
            document.getElementById('sms-otp-filter')?.addEventListener('change', async (e) => {
                const val = e.target.value;
                const data = await apiCall(`${API}/sms?hasOtp=${val}&limit=20`);
                renderTableRows('sms-tbody', data.data, 'sms');
            });
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    };
    await load();
}

// ========== USERS PAGE ==========
async function renderUsersPage(container) {
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    let page = 1;
    const load = async () => {
        try {
            const data = await apiCall(`${API}/users?page=${page}&limit=20`);
            const rows = data.data || [];
            const pg = data.pagination;
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Users (${pg.total})</div>
                    <button class="fly-btn fly-btn-sm" id="add-user-btn">${ICONS.plus} Add User</button>
                </div>
                <div class="filter-bar">
                    <input type="text" class="search-input" placeholder="Search users..." id="users-search">
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Username</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Balance</th><th>Violations</th><th>Last Login</th><th>Actions</th></tr></thead>
                        <tbody id="users-tbody">
                            ${rows.length ? rows.map(u => `
                                <tr>
                                    <td>
                                        <div style="font-weight:600">${escapeHtml(u.username)}</div>
                                        <div style="font-size:11px;color:#9ca3af">${u.full_name || ''}</div>
                                    </td>
                                    <td>${u.email || '-'}</td>
                                    <td>${u.phone || '-'}</td>
                                    <td><span class="badge ${ROLE_COLORS[u.role]||'badge-secondary'}">${ROLE_LABELS[u.role]||u.role}</span></td>
                                    <td><span class="badge ${u.status==='active'?'badge-success':u.status==='suspended'?'badge-warning':'badge-danger'}">${u.status}</span>${u.suspended_until?`<div style="font-size:10px;color:#d97706">Until ${formatDate(u.suspended_until)}</div>`:''}</td>
                                    <td>$${(u.balance || 0).toFixed(4)}</td>
                                    <td><span class="badge badge-${(u.violation_count||0)>0?'danger':'secondary'}">${u.violation_count||0}</span></td>
                                    <td style="font-size:11px;color:#6B7280">${u.last_login ? formatDate(u.last_login) : '-'}</td>
                                    <td class="actions-cell" style="gap:3px">
                                        <button class="action-btn" onclick="editUser('${u.id}')" title="Edit">${ICONS.edit}</button>
                                        <button class="action-btn" onclick="suspendUser('${u.id}','${escapeHtml(u.username)}')" title="Suspend" style="color:#d97706">⏸</button>
                                        <button class="action-btn" onclick="adjustBalance('${u.id}','${escapeHtml(u.username)}')" title="Adjust Balance" style="color:#735DFF">$</button>
                                        ${u.status!=='active'?`<button class="action-btn" onclick="unblockUser('${u.id}')" title="Unblock" style="color:#22c55e">✓</button>`:''}
                                        <button class="action-btn delete" onclick="deleteUser('${u.id}','${escapeHtml(u.username)}')">${ICONS.trash}</button>
                                    </td>
                                </tr>
                            `).join('') : '<tr class="empty-row"><td colspan="9">No users found</td></tr>'}
                        </tbody>
                    </table>
                </div>
                ${renderPagination(pg, (p) => { page = p; load(); })}
            </div>
            <div id="modal-root"></div>`;

            document.getElementById('add-user-btn')?.addEventListener('click', () => showUserModal());
            document.getElementById('users-search')?.addEventListener('input', debounce(async (e) => {
                const q = e.target.value;
                const data = await apiCall(`${API}/users?search=${encodeURIComponent(q)}&limit=50`);
                renderTableRows('users-tbody', data.data, 'users');
            }, 300));
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    };
    await load();
}

async function showUserModal(existing = null) {
    const isEdit = !!existing;
    const root = document.getElementById('modal-root');
    if (!root) return;
    root.innerHTML = `
    <div class="modal-overlay" id="user-modal-overlay">
        <div class="modal">
            <div class="modal-header"><div class="modal-title">${isEdit ? 'Edit User' : 'Add User'}</div><button class="modal-close" id="close-modal">${ICONS.x}</button></div>
            <div class="modal-body">
                <div class="form-row">
                    <div class="form-group"><label>Username *</label><input class="fly-input" id="usr-username" value="${existing?.username || ''}" ${isEdit ? 'readonly' : ''} placeholder="3-50 chars, letters/numbers/_"></div>
                    <div class="form-group"><label>${isEdit ? 'New Password (blank = no change)' : 'Password *'}</label><input class="fly-input" id="usr-password" type="password" placeholder="${isEdit ? 'Leave blank to keep current' : 'Min 6 characters'}"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Full Name</label><input class="fly-input" id="usr-fullName" value="${existing?.full_name || ''}" placeholder="Full name (optional)"></div>
                    <div class="form-group"><label>Email (optional)</label><input class="fly-input" id="usr-email" type="email" value="${existing?.email || ''}" placeholder="user@example.com"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Phone (optional)</label><input class="fly-input" id="usr-phone" value="${existing?.phone || ''}" placeholder="+525529001312"></div>
                    <div class="form-group"><label>Country (optional)</label><input class="fly-input" id="usr-country" value="${existing?.country || ''}" placeholder="Mexico"></div>
                </div>
                <div class="form-group"><label>Address (optional)</label><input class="fly-input" id="usr-address" value="${existing?.address || ''}"></div>
                <div class="form-row">
                    <div class="form-group"><label>Role *</label>
                        <select class="fly-input" id="usr-role">
                            <option value="sub_reseller" ${existing?.role === 'sub_reseller' ? 'selected' : ''}>Sub Reseller (Agent)</option>
                            <option value="reseller" ${existing?.role === 'reseller' ? 'selected' : ''}>Reseller</option>
                            <option value="manager" ${existing?.role === 'manager' ? 'selected' : ''}>Manager</option>
                            <option value="admin" ${existing?.role === 'admin' ? 'selected' : ''}>Admin</option>
                            <option value="end_user" ${existing?.role === 'end_user' ? 'selected' : ''}>End User</option>
                        </select>
                    </div>
                    <div class="form-group"><label>Status</label>
                        <select class="fly-input" id="usr-status">
                            <option value="active" ${existing?.status === 'active' ? 'selected' : ''}>Active</option>
                            <option value="blocked" ${existing?.status === 'blocked' ? 'selected' : ''}>Blocked</option>
                            <option value="inactive" ${existing?.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                            <option value="suspended" ${existing?.status === 'suspended' ? 'selected' : ''}>Suspended</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Balance ($)</label><input class="fly-input" id="usr-balance" type="number" step="0.0001" value="${existing?.balance || 0}"></div>
                    <div class="form-group"><label>Credit Limit ($)</label><input class="fly-input" id="usr-creditLimit" type="number" step="0.01" value="${existing?.credit_limit || 0}"></div>
                </div>
                <div class="form-group" id="usr-notes-group"><label>Admin Notes</label><input class="fly-input" id="usr-notes" value="${existing?.notes || ''}" placeholder="Internal notes about this user"></div>
                <div id="usr-validation-error" style="display:none;margin-top:8px;padding:8px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;color:#ef4444;font-size:12px"></div>
            </div>
            <div class="modal-footer"><button class="fly-btn fly-btn-secondary" id="cancel-modal">Cancel</button><button class="fly-btn" id="save-modal">${isEdit ? 'Update' : 'Create'}</button></div>
        </div>
    </div>`;

    const close = () => root.innerHTML = '';
    document.getElementById('close-modal').onclick = close;
    document.getElementById('cancel-modal').onclick = close;
    document.getElementById('user-modal-overlay').onclick = (e) => { if (e.target.id === 'user-modal-overlay') close(); };

    document.getElementById('save-modal').onclick = async () => {
        const un = document.getElementById('usr-username').value.trim();
        const pw = document.getElementById('usr-password').value;
        const errEl = document.getElementById('usr-validation-error');
        const errors = [];
        if (!isEdit) {
            if (!un) errors.push('Username is required');
            else if (!/^[a-zA-Z0-9_]{3,50}$/.test(un)) errors.push('Username: 3-50 chars, letters/numbers/underscore only');
            if (!pw) errors.push('Password is required');
            else if (pw.length < 6) errors.push('Password must be at least 6 characters');
        } else if (pw && pw.length < 6) {
            errors.push('Password must be at least 6 characters');
        }
        const email = document.getElementById('usr-email').value.trim();
        if (email && !/^[^@]+@[^@]+\.[^@]+$/.test(email)) errors.push('Invalid email format');
        const phone = document.getElementById('usr-phone').value.trim();
        if (phone && !/^\+?[0-9\s\-\(\)]{7,20}$/.test(phone)) errors.push('Invalid phone format');
        if (errors.length) { errEl.textContent = errors.join(' • '); errEl.style.display = 'block'; return; }
        errEl.style.display = 'none';
        const body = {
            username: un,
            fullName: document.getElementById('usr-fullName').value.trim() || null,
            email: email || null,
            phone: phone || null,
            country: document.getElementById('usr-country').value.trim() || null,
            role: document.getElementById('usr-role').value,
            status: document.getElementById('usr-status').value,
            balance: parseFloat(document.getElementById('usr-balance').value) || 0,
            creditLimit: parseFloat(document.getElementById('usr-creditLimit').value) || 0,
            notes: document.getElementById('usr-notes')?.value.trim() || null,
        };
        if (pw) body.password = pw;
        if (!body.username && !isEdit) { showToast('Username is required', 'error'); return; }
        try {
            if (isEdit) { await apiCall(`${API}/users/${existing.id}`, { method: 'PUT', body: JSON.stringify(body) }); showToast('User updated', 'success'); }
            else { await apiCall(`${API}/users`, { method: 'POST', body: JSON.stringify(body) }); showToast('User created', 'success'); }
            close(); renderDashboard();
        } catch (err) { showToast(err.message, 'error'); }
    };
}

window.editUser = async (id) => {
    try { const { data } = await apiCall(`${API}/users/${id}`); showUserModal(data); } catch (err) { showToast(err.message, 'error'); }
};
window.deleteUser = async (id, username) => {
    if (!confirm(`Delete user "${username}"?`)) return;
    try { await apiCall(`${API}/users/${id}`, { method: 'DELETE' }); showToast('User deleted', 'success'); renderDashboard(); } catch (err) { showToast(err.message, 'error'); }
};

// ========== SETTINGS PAGE ==========
async function renderSettingsPage(container) {
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    try {
        const { data: settings } = await apiCall(`${API}/settings`);
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">System Settings</div></div>
            <div style="padding:20px">
                <div class="form-group">
                    <label>Webhook URL (for receiving SMS)</label>
                    <div style="display:flex;gap:8px;margin-top:4px">
                        <input class="fly-input" id="webhook-url" value="${location.origin}/api/webhook/sms" readonly style="flex:1;background:#f9fafb">
                        <button class="fly-btn fly-btn-sm" onclick="navigator.clipboard.writeText(document.getElementById('webhook-url').value);showToast('Copied!','success')">Copy</button>
                    </div>
                </div>
                <div class="form-group" style="margin-top:16px">
                    <label>Supported Formats</label>
                    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px">
                        ${['Standard JSON', 'Array', 'aaData (DataTables)', 'Nested Data', 'Provider SMS', 'Form Encoded', 'text/plain'].map(f => `<span class="badge badge-primary">${f}</span>`).join('')}
                    </div>
                </div>
                <div class="form-group" style="margin-top:16px">
                    <label>Default Credentials</label>
                    <div style="background:#f9fafb;padding:12px 16px;border-radius:8px;margin-top:4px;font-size:13px">
                        <div><strong>Username:</strong> admin</div>
                        <div><strong>Password:</strong> admin123 <span class="badge badge-warning" style="margin-left:8px">Change immediately!</span></div>
                    </div>
                </div>
            </div>
        </div>
        <div class="card" style="margin-top:16px">
            <div class="card-header"><div class="card-title">Account</div></div>
            <div style="padding:20px">
                <div class="form-row">
                    <div class="form-group"><label>Username</label><input class="fly-input" value="${user?.username || ''}" readonly style="background:#f9fafb"></div>
                    <div class="form-group"><label>Role</label><input class="fly-input" value="${user?.role || 'admin'}" readonly style="background:#f9fafb"></div>
                </div>
            </div>
        </div>`;
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
    }
}

// ========== HELPERS ==========
function renderPagination(pg, onPageChange) {
    if (pg.totalPages <= 1) return '';
    let btns = '';
    for (let i = 1; i <= pg.totalPages && i <= 10; i++) {
        btns += `<button class="pagination-btn ${i === pg.page ? 'active' : ''}" onclick="(${onPageChange})(${i})">${i}</button>`;
    }
    return `<div class="pagination"><div class="pagination-info">Showing ${(pg.page - 1) * pg.limit + 1}-${Math.min(pg.page * pg.limit, pg.total)} of ${pg.total}</div><div class="pagination-buttons"><button class="pagination-btn" ${pg.page <= 1 ? 'disabled' : ''} onclick="(${onPageChange})(${pg.page - 1})">Prev</button>${btns}<button class="pagination-btn" ${!pg.hasMore ? 'disabled' : ''} onclick="(${onPageChange})(${pg.page + 1})">Next</button></div></div>`;
}

function renderTableRows(tbodyId, rows, type) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    if (!rows || !rows.length) {
        const cols = type === 'numbers' ? 7 : type === 'ranges' ? 8 : type === 'users' ? 8 : 7;
        tbody.innerHTML = `<tr class="empty-row"><td colspan="${cols}">No results found</td></tr>`;
        return;
    }
    if (type === 'sms') {
        tbody.innerHTML = rows.map(s => `<tr><td><code style="font-size:12px">${s.number}</code></td><td>${s.service ? `<span class="badge badge-primary">${s.service}</span>` : (s.sender ? `<span class="badge badge-secondary">${escapeHtml(s.sender)}</span>` : '-')}</td><td>${s.recipient || '-'}</td><td>${s.otp ? `<span class="otp-code">${s.otp}</span>` : '-'}</td><td>${s.country || '-'}</td><td class="message-text" title="${escapeHtml(s.message)}">${escapeHtml(s.message)}</td><td style="font-size:12px;color:#6B7280">${formatDate(s.received_at)}</td></tr>`).join('');
    } else if (type === 'numbers') {
        tbody.innerHTML = rows.map(n => `<tr><td><code style="font-size:12px">${n.number}</code></td><td>${n.country_name || n.country || '-'}</td><td>${n.service ? `<span class="badge badge-primary">${n.service}</span>` : '-'}</td><td>${n.range_name || '-'}</td><td><span class="badge ${n.status === 'active' ? 'badge-success' : 'badge-danger'}">${n.status}</span></td><td>${n.total_sms}</td><td class="actions-cell"><button class="action-btn" onclick="editNumber('${n.id}')">${ICONS.edit}</button><button class="action-btn delete" onclick="deleteNumber('${n.id}','${escapeHtml(n.number)}')">${ICONS.trash}</button></td></tr>`).join('');
    } else if (type === 'ranges') {
        tbody.innerHTML = rows.map(r => `<tr><td style="font-weight:600">${escapeHtml(r.name)}</td><td>${r.country_name || r.country_code || '-'}</td><td>$${r.rate}</td><td>${r.profit_margin}%</td><td>${r._count?.numbers || 0}</td><td>${r.total_sms}</td><td><span class="badge ${r.status === 'active' ? 'badge-success' : 'badge-danger'}">${r.status}</span></td><td class="actions-cell"><button class="action-btn" onclick="editRange('${r.id}')">${ICONS.edit}</button><button class="action-btn delete" onclick="deleteRange('${r.id}','${escapeHtml(r.name)}')">${ICONS.trash}</button></td></tr>`).join('');
    } else if (type === 'users') {
        tbody.innerHTML = rows.map(u => `<tr><td style="font-weight:600">${escapeHtml(u.username)}</td><td>${u.full_name || '-'}</td><td>${u.email || '-'}</td><td><span class="badge badge-primary">${u.role}</span></td><td><span class="badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}">${u.status}</span></td><td>$${(u.balance || 0).toFixed(2)}</td><td style="font-size:12px;color:#6B7280">${u.last_login ? formatDate(u.last_login) : '-'}</td><td class="actions-cell"><button class="action-btn" onclick="editUser('${u.id}')">${ICONS.edit}</button><button class="action-btn delete" onclick="deleteUser('${u.id}','${escapeHtml(u.username)}')">${ICONS.trash}</button></td></tr>`).join('');
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now - d;
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return dateStr; }
}

function debounce(fn, delay) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

// ========== START ==========
document.addEventListener('DOMContentLoaded', init);


// ========== SUSPEND USER ==========
window.suspendUser = async (id, username) => {
    const root = document.getElementById('modal-root') || (() => {
        const d = document.createElement('div'); d.id = 'modal-root'; document.body.appendChild(d); return d;
    })();
    root.innerHTML = `
    <div class="modal-overlay" id="suspend-overlay">
        <div class="modal" style="max-width:420px">
            <div class="modal-header"><div class="modal-title">Suspend: ${username}</div><button class="modal-close" id="close-suspend">${ICONS.x}</button></div>
            <div class="modal-body">
                <div class="form-group"><label>Duration</label>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px">
                        ${[['30 minutes','30'],['1 hour','60'],['1 day','1440'],['Custom','custom']].map(([l,v])=>`
                        <button class="fly-btn fly-btn-secondary fly-btn-sm" style="justify-content:center" onclick="document.getElementById('suspend-mins').value='${v}';document.getElementById('custom-mins-row').style.display='${v==='custom'?'block':'none'}">${l}</button>`).join('')}
                    </div>
                    <input type="hidden" id="suspend-mins" value="30">
                    <div id="custom-mins-row" style="display:none;margin-top:8px">
                        <label>Custom minutes</label>
                        <input class="fly-input" id="suspend-custom" type="number" min="1" placeholder="e.g. 120" oninput="document.getElementById('suspend-mins').value=this.value">
                    </div>
                </div>
                <div class="form-group"><label>Reason</label><input class="fly-input" id="suspend-reason" placeholder="Reason for suspension"></div>
            </div>
            <div class="modal-footer">
                <button class="fly-btn fly-btn-secondary" id="cancel-suspend">Cancel</button>
                <button class="fly-btn" id="do-suspend" style="background:#d97706">Suspend</button>
            </div>
        </div>
    </div>`;
    const close = () => root.innerHTML = '';
    document.getElementById('close-suspend').onclick = close;
    document.getElementById('cancel-suspend').onclick = close;
    document.getElementById('suspend-overlay').onclick = e => { if(e.target.id==='suspend-overlay') close(); };
    document.getElementById('do-suspend').onclick = async () => {
        const mins = parseInt(document.getElementById('suspend-mins').value) || 30;
        const reason = document.getElementById('suspend-reason').value.trim() || 'Manual suspension';
        try {
            await apiCall(`${API}/users/${id}`, { method:'PUT', body: JSON.stringify({ status:'suspended', violation_reason: reason }) });
            showToast(`${username} suspended for ${mins} mins`, 'success');
            close(); renderDashboard();
        } catch(err) { showToast(err.message, 'error'); }
    };
};

// ========== UNBLOCK USER ==========
window.unblockUser = async (id) => {
    try {
        await apiCall(`${API}/users/${id}`, { method:'PUT', body: JSON.stringify({ status:'active', violation_reason:'', unlock:true }) });
        showToast('User restored to active', 'success');
        renderDashboard();
    } catch(err) { showToast(err.message, 'error'); }
};

// ========== ADJUST BALANCE ==========
window.adjustBalance = async (id, username) => {
    const root = document.getElementById('modal-root') || (() => {
        const d = document.createElement('div'); d.id = 'modal-root'; document.body.appendChild(d); return d;
    })();
    root.innerHTML = `
    <div class="modal-overlay" id="bal-overlay">
        <div class="modal" style="max-width:380px">
            <div class="modal-header"><div class="modal-title">Adjust Balance: ${username}</div><button class="modal-close" id="close-bal">${ICONS.x}</button></div>
            <div class="modal-body">
                <div class="form-group"><label>Amount (positive = add, negative = deduct)</label><input class="fly-input" id="bal-amount" type="number" step="0.0001" placeholder="e.g. 10.00 or -5.00"></div>
                <div class="form-group"><label>Note</label><input class="fly-input" id="bal-note" placeholder="Reason for adjustment"></div>
            </div>
            <div class="modal-footer">
                <button class="fly-btn fly-btn-secondary" id="cancel-bal">Cancel</button>
                <button class="fly-btn" id="do-bal">Apply</button>
            </div>
        </div>
    </div>`;
    const close = () => root.innerHTML = '';
    document.getElementById('close-bal').onclick = close;
    document.getElementById('cancel-bal').onclick = close;
    document.getElementById('bal-overlay').onclick = e => { if(e.target.id==='bal-overlay') close(); };
    document.getElementById('do-bal').onclick = async () => {
        const amount = parseFloat(document.getElementById('bal-amount').value);
        const note = document.getElementById('bal-note').value.trim() || 'Manual adjustment';
        if (isNaN(amount)) { showToast('Enter a valid amount', 'error'); return; }
        try {
            await apiCall(`${API}/transactions/balance-adjust`, { method:'POST', body: JSON.stringify({ userId: id, amount, note }) });
            showToast(`Balance adjusted by $${amount.toFixed(4)}`, 'success');
            close(); renderDashboard();
        } catch(err) { showToast(err.message, 'error'); }
    };
};

// ========== ALLOCATIONS PAGE ==========
async function renderAllocationsPage(container) {
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    let statusFilter = '', rangeFilter = '';
    const load = async () => {
        try {
            let url = `${API}/numbers-ext/allocations`;
            const params = [];
            if (statusFilter) params.push(`status=${statusFilter}`);
            if (params.length) url += '?' + params.join('&');
            const data = await apiCall(url);
            const rows = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Allocations (${rows.length})</div>
                    <button class="fly-btn fly-btn-sm" id="self-alloc-btn">${ICONS.plus} Self-Allocate</button>
                </div>
                <div class="filter-bar">
                    <select class="filter-select" id="alloc-status-filter">
                        <option value="">All Status</option>
                        <option value="active" ${statusFilter==='active'?'selected':''}>Active</option>
                        <option value="returned" ${statusFilter==='returned'?'selected':''}>Returned</option>
                        <option value="expired" ${statusFilter==='expired'?'selected':''}>Expired</option>
                    </select>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>User</th><th>Range</th><th>Qty</th><th>Duration</th><th>Status</th><th>Allocated</th><th>Expires</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${rows.length ? rows.map(a => `
                            <tr>
                                <td style="font-weight:600">${escapeHtml(a.username)}</td>
                                <td><span class="badge badge-primary">${escapeHtml(a.range_name)}</span></td>
                                <td style="font-weight:700">${a.quantity}</td>
                                <td style="text-transform:capitalize">${a.duration}</td>
                                <td><span class="badge ${a.status==='active'?'badge-success':a.status==='returned'?'badge-secondary':'badge-danger'}">${a.status}</span></td>
                                <td style="font-size:12px;color:#6B7280">${formatDate(a.created_at)}</td>
                                <td style="font-size:12px;color:#6B7280">${a.expires_at ? formatDate(a.expires_at) : '—'}</td>
                                <td class="actions-cell">
                                    ${a.status==='active' ? `<button class="action-btn delete" onclick="returnAlloc('${a.id}')">Return</button>` : ''}
                                </td>
                            </tr>`).join('') : '<tr class="empty-row"><td colspan="8">No allocations found</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
            <div id="modal-root"></div>`;
            document.getElementById('alloc-status-filter').onchange = e => { statusFilter = e.target.value; load(); };
            document.getElementById('self-alloc-btn').onclick = () => showSelfAllocModal();
        } catch(err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    };
    await load();
}

window.returnAlloc = async (id) => {
    if (!confirm('Return this allocation? Numbers will be unassigned.')) return;
    try {
        const data = await apiCall(`${API}/numbers-ext/allocations/${id}/return`, { method:'POST' });
        showToast(`Returned ${data.returned} numbers`, 'success');
        renderDashboard();
    } catch(err) { showToast(err.message, 'error'); }
};

async function showSelfAllocModal() {
    const root = document.getElementById('modal-root');
    if (!root) return;
    const rangeData = await apiCall(`${API}/ranges?status=active&limit=100`);
    const ranges = rangeData.data || [];
    root.innerHTML = `
    <div class="modal-overlay" id="sa-overlay">
        <div class="modal" style="max-width:460px">
            <div class="modal-header"><div class="modal-title">Self-Allocate Numbers</div><button class="modal-close" id="close-sa">${ICONS.x}</button></div>
            <div class="modal-body">
                <div class="form-group"><label>Range *</label>
                    <select class="fly-input" id="sa-range">
                        <option value="">— Select Range —</option>
                        ${ranges.map(r=>`<option value="${r.name}" data-max="${r.allocation_limit_per_user}" data-global="${r.allocation_limit_global}" data-alloc="${r.allocated_numbers||0}">${escapeHtml(r.name)} (${r.country_name||r.country_code||'—'}) — ${r._count?.numbers||0} numbers</option>`).join('')}
                    </select>
                </div>
                <div id="sa-info" style="display:none;padding:10px 14px;background:#f5f3ff;border:1px solid #e0e7ff;border-radius:8px;margin-bottom:16px;font-size:13px">
                    <div>Max per request: <strong id="sa-max">—</strong></div>
                    <div>Global slots remaining: <strong id="sa-remaining">—</strong></div>
                </div>
                <div class="form-group"><label>Quantity *</label><input class="fly-input" id="sa-qty" type="number" min="1" placeholder="How many numbers"></div>
                <div class="form-group"><label>Duration *</label>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                        ${[['Weekly','weekly'],['Monthly','monthly'],['Yearly','yearly'],['Custom','custom']].map(([l,v])=>`
                        <button class="fly-btn fly-btn-secondary fly-btn-sm sa-dur-btn" data-val="${v}" style="justify-content:center" onclick="selectDuration('${v}')">${l}</button>`).join('')}
                    </div>
                    <input type="hidden" id="sa-dur" value="monthly">
                    <div id="sa-custom-days" style="display:none;margin-top:8px">
                        <input class="fly-input" id="sa-days" type="number" min="1" placeholder="Custom days (e.g. 14)">
                    </div>
                </div>
                <div id="sa-limit-warn" style="display:none;padding:10px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:13px;color:#92400e">
                    ⚠ Self-allocation limit reached for this range. Contact support for additional numbers.
                </div>
            </div>
            <div class="modal-footer">
                <button class="fly-btn fly-btn-secondary" id="cancel-sa">Cancel</button>
                <button class="fly-btn" id="do-sa">Allocate Numbers</button>
            </div>
        </div>
    </div>`;
    const close = () => root.innerHTML = '';
    document.getElementById('close-sa').onclick = close;
    document.getElementById('cancel-sa').onclick = close;
    document.getElementById('sa-overlay').onclick = e => { if(e.target.id==='sa-overlay') close(); };
    document.getElementById('sa-range').onchange = function() {
        const opt = this.options[this.selectedIndex];
        if (!opt.value) { document.getElementById('sa-info').style.display='none'; return; }
        const max = opt.dataset.max || 100;
        const remaining = (opt.dataset.global||10000) - (opt.dataset.alloc||0);
        document.getElementById('sa-max').textContent = max;
        document.getElementById('sa-remaining').textContent = remaining;
        document.getElementById('sa-info').style.display = 'block';
        document.getElementById('sa-limit-warn').style.display = remaining <= 0 ? 'block' : 'none';
    };
    document.getElementById('do-sa').onclick = async () => {
        const rangeName = document.getElementById('sa-range').value;
        const qty = parseInt(document.getElementById('sa-qty').value);
        const dur = document.getElementById('sa-dur').value;
        const days = dur==='custom' ? parseInt(document.getElementById('sa-days').value)||14 : null;
        if (!rangeName) { showToast('Select a range', 'error'); return; }
        if (!qty || qty < 1) { showToast('Enter valid quantity', 'error'); return; }
        try {
            const data = await apiCall(`${API}/numbers-ext/allocate`, { method:'POST', body: JSON.stringify({ rangeName, quantity:qty, duration:dur, customDays:days }) });
            showToast(`Allocated ${data.allocated} numbers! Expires: ${data.expires_at ? formatDate(data.expires_at) : 'never'}`, 'success');
            close(); renderDashboard();
        } catch(err) { showToast(err.message, 'error'); }
    };
}

window.selectDuration = (val) => {
    document.getElementById('sa-dur').value = val;
    document.getElementById('sa-custom-days').style.display = val==='custom'?'block':'none';
    document.querySelectorAll('.sa-dur-btn').forEach(b => {
        b.classList.toggle('fly-btn-secondary', b.dataset.val!==val);
        if (b.dataset.val===val) { b.style.background='#735DFF'; b.style.color='white'; b.style.borderColor='#735DFF'; }
        else { b.style.background=''; b.style.color=''; b.style.borderColor=''; }
    });
};

// ========== PROVIDERS PAGE ==========
async function renderProvidersPage(container) {
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    const load = async () => {
        try {
            const data = await apiCall(`${API}/providers`);
            const rows = data.data || [];
            container.innerHTML = `
            <div class="card" style="margin-bottom:16px">
                <div class="card-header">
                    <div class="card-title">SMS Providers (${rows.length})</div>
                    <button class="fly-btn fly-btn-sm" id="add-provider-btn">${ICONS.plus} Add Provider</button>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Details</th><th>Total SMS</th><th>Last Active</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${rows.length ? rows.map(p => `
                            <tr>
                                <td style="font-weight:600">${escapeHtml(p.name)}</td>
                                <td><span class="badge ${p.type==='smpp'?'badge-warning':'badge-primary'}">${p.type.toUpperCase()}</span></td>
                                <td><span class="badge ${p.status==='active'?'badge-success':p.status==='testing'?'badge-warning':'badge-danger'}">${p.status}</span></td>
                                <td style="font-size:12px;color:#6B7280">${p.type==='http' ? (p.api_url||'No URL set') : `${p.smpp_host||'No host'}:${p.smpp_port||2775}`}</td>
                                <td>${p.total_sms_received||0}</td>
                                <td style="font-size:12px;color:#6B7280">${p.last_active_at ? formatDate(p.last_active_at) : '—'}</td>
                                <td class="actions-cell">
                                    <button class="action-btn" onclick="editProvider('${p.id}')">${ICONS.edit}</button>
                                    <button class="action-btn delete" onclick="deleteProvider('${p.id}','${escapeHtml(p.name)}')">${ICONS.trash}</button>
                                </td>
                            </tr>`).join('') : '<tr class="empty-row"><td colspan="7">No providers configured</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><div class="card-title">📋 SMPP 3.4 deliver_sm Reference</div></div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;padding:0">
                    <div style="padding:20px;border-right:1px solid var(--border)">
                        <div style="font-size:12px;font-weight:700;color:#735DFF;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px">Mandatory PDU Fields</div>
                        <table class="fly-table" style="font-size:12px">
                            <tbody>
                                ${[['service_type','e.g. "itel"'],['source_addr_ton','1 = INTERNATIONAL'],['source_addr_npi','1 = ISDN'],['source_addr','Sender number'],['dest_addr_ton','1 = INTERNATIONAL'],['dest_addr_npi','1 = ISDN'],['destination_addr','+525529001312 (intl format)'],['esm_class','4'],['protocol_id','0'],['priority_flag','0'],['registered_delivery','0'],['data_coding','0=GSM7 | 8=UCS2'],['sm_length','Message byte length'],['short_message','Message content']].map(([f,d])=>`
                                <tr><td style="font-family:monospace;font-weight:600;color:#222F36;padding:6px 12px">${f}</td><td style="color:#6B7280;padding:6px 12px">${d}</td></tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                    <div style="padding:20px">
                        <div style="font-size:12px;font-weight:700;color:#735DFF;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px">Data Coding</div>
                        <div style="display:flex;gap:8px;margin-bottom:16px">
                            <span class="badge badge-primary">0 = GSM7 (English/ASCII)</span>
                            <span class="badge badge-warning">8 = UCS2 (Unicode/Arabic/Chinese)</span>
                        </div>
                        <div style="font-size:12px;font-weight:700;color:#735DFF;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">Sample deliver_sm PDU</div>
                        <pre style="background:#f9fafb;border:1px solid var(--border);border-radius:8px;padding:14px;font-size:11px;line-height:1.7;overflow-x:auto">Error Code: 0
Length: 174 | Sequence: 204953
Service Type: itel
source TON: INTERNATIONAL (1)
source NPI: ISDN (1)
Source: 0123456789
Dest TON: INTERNATIONAL (1)
Dest NPI: ISDN (1)
Destination: 525529001312
ESM Class: 4 | Data Coding: 0 (GSM7)
Message: id:12469 sub:001 dlvrd:001
submit date:2605090348 done date:2605090348
stat:DELIVRD err:0
text:American Express: AI</pre>
                        <div style="margin-top:16px">
                            <div style="font-size:12px;font-weight:700;color:#735DFF;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">REVE SMS HTTP Format</div>
                            <pre style="background:#f9fafb;border:1px solid var(--border);border-radius:8px;padding:14px;font-size:11px;line-height:1.7">POST /api/webhook/sms
Content-Type: application/json

{
  "to":   "+525529001312",
  "from": "AmericanExpress",
  "msg":  "Your OTP is 847291",
  "uuid": "msg-204953"
}</pre>
                        </div>
                    </div>
                </div>
            </div>
            <div id="modal-root"></div>`;
            document.getElementById('add-provider-btn').onclick = () => showProviderModal();
        } catch(err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    };
    await load();
}

async function showProviderModal(existing = null) {
    const isEdit = !!existing;
    const root = document.getElementById('modal-root');
    if (!root) return;
    const type = existing?.type || 'http';
    root.innerHTML = `
    <div class="modal-overlay" id="pv-overlay">
        <div class="modal" style="max-width:600px">
            <div class="modal-header"><div class="modal-title">${isEdit?'Edit Provider':'Add Provider'}</div><button class="modal-close" id="close-pv">${ICONS.x}</button></div>
            <div class="modal-body">
                <div class="form-row">
                    <div class="form-group"><label>Provider Name *</label><input class="fly-input" id="pv-name" value="${existing?.name||''}" placeholder="My Provider"></div>
                    <div class="form-group"><label>Type</label>
                        <select class="fly-input" id="pv-type" onchange="toggleProviderFields()">
                            <option value="http" ${type==='http'?'selected':''}>HTTP</option>
                            <option value="smpp" ${type==='smpp'?'selected':''}>SMPP</option>
                        </select>
                    </div>
                </div>
                <div class="form-group"><label>Status</label>
                    <select class="fly-input" id="pv-status">
                        <option value="active" ${existing?.status==='active'?'selected':''}>Active</option>
                        <option value="testing" ${existing?.status==='testing'?'selected':''}>Testing</option>
                        <option value="inactive" ${existing?.status==='inactive'?'selected':''}>Inactive</option>
                    </select>
                </div>
                <!-- HTTP Fields -->
                <div id="pv-http-fields" style="display:${type!=='smpp'?'block':'none'}">
                    <div style="font-size:12px;font-weight:700;color:#735DFF;text-transform:uppercase;margin-bottom:12px">HTTP Settings</div>
                    <div class="form-group"><label>API URL</label><input class="fly-input" id="pv-url" value="${existing?.api_url||''}" placeholder="https://provider.com/sms/receive"></div>
                    <div class="form-row">
                        <div class="form-group"><label>API Token</label><input class="fly-input" id="pv-token" value="${existing?.api_token||''}" placeholder="Bearer token"></div>
                        <div class="form-group"><label>Method</label><select class="fly-input" id="pv-method"><option value="POST" ${existing?.api_method==='POST'||!existing?'selected':''}>POST</option><option value="GET" ${existing?.api_method==='GET'?'selected':''}>GET</option></select></div>
                    </div>
                    <div style="font-size:12px;font-weight:600;color:#6B7280;margin-bottom:8px">Field Name Mapping</div>
                    <div class="form-row">
                        <div class="form-group"><label>Destination (to)</label><input class="fly-input" id="pv-fto" value="${existing?.field_to||'to'}" placeholder="to"></div>
                        <div class="form-group"><label>Sender (from)</label><input class="fly-input" id="pv-ffr" value="${existing?.field_from||'from'}" placeholder="from"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Message (msg)</label><input class="fly-input" id="pv-fmg" value="${existing?.field_msg||'msg'}" placeholder="msg"></div>
                        <div class="form-group"><label>Unique ID (uuid)</label><input class="fly-input" id="pv-fid" value="${existing?.field_uuid||'uuid'}" placeholder="uuid"></div>
                    </div>
                </div>
                <!-- SMPP Fields -->
                <div id="pv-smpp-fields" style="display:${type==='smpp'?'block':'none'}">
                    <div style="font-size:12px;font-weight:700;color:#735DFF;text-transform:uppercase;margin-bottom:12px">SMPP Settings (SMPP 3.4)</div>
                    <div class="form-row">
                        <div class="form-group"><label>Host</label><input class="fly-input" id="pv-sh" value="${existing?.smpp_host||''}" placeholder="smpp.provider.com"></div>
                        <div class="form-group"><label>Port</label><input class="fly-input" id="pv-sp" type="number" value="${existing?.smpp_port||2775}"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>System ID</label><input class="fly-input" id="pv-sid" value="${existing?.smpp_system_id||''}"></div>
                        <div class="form-group"><label>Password</label><input class="fly-input" id="pv-spw" type="password" placeholder="••••••"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>System Type</label><input class="fly-input" id="pv-sst" value="${existing?.smpp_system_type||''}"></div>
                        <div class="form-group"><label>Service Type</label><input class="fly-input" id="pv-ssv" value="${existing?.smpp_service_type||''}" placeholder="itel"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Source TON <span style="color:#9ca3af">(1=INTL)</span></label><input class="fly-input" id="pv-ston" type="number" value="${existing?.smpp_source_ton||1}"></div>
                        <div class="form-group"><label>Source NPI <span style="color:#9ca3af">(1=ISDN)</span></label><input class="fly-input" id="pv-snpi" type="number" value="${existing?.smpp_source_npi||1}"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Dest TON</label><input class="fly-input" id="pv-dton" type="number" value="${existing?.smpp_dest_ton||1}"></div>
                        <div class="form-group"><label>Dest NPI</label><input class="fly-input" id="pv-dnpi" type="number" value="${existing?.smpp_dest_npi||1}"></div>
                    </div>
                    <div class="form-group"><label>Data Coding</label>
                        <select class="fly-input" id="pv-dc">
                            <option value="0" ${(existing?.smpp_data_coding||0)==0?'selected':''}>0 — GSM7 (English/ASCII)</option>
                            <option value="8" ${existing?.smpp_data_coding==8?'selected':''}>8 — UCS2 (Unicode/Arabic/Chinese)</option>
                        </select>
                    </div>
                </div>
                <div class="form-group" style="margin-top:8px"><label>Notes</label><textarea class="fly-input" id="pv-notes" rows="2" style="resize:vertical">${existing?.notes||''}</textarea></div>
            </div>
            <div class="modal-footer">
                <button class="fly-btn fly-btn-secondary" id="cancel-pv">Cancel</button>
                <button class="fly-btn" id="save-pv">${isEdit?'Update':'Create'}</button>
            </div>
        </div>
    </div>`;
    const close = () => root.innerHTML = '';
    document.getElementById('close-pv').onclick = close;
    document.getElementById('cancel-pv').onclick = close;
    document.getElementById('pv-overlay').onclick = e => { if(e.target.id==='pv-overlay') close(); };
    document.getElementById('save-pv').onclick = async () => {
        const t = document.getElementById('pv-type').value;
        const body = {
            name: document.getElementById('pv-name').value.trim(),
            type: t, status: document.getElementById('pv-status').value,
            notes: document.getElementById('pv-notes').value.trim()||null,
            apiUrl: document.getElementById('pv-url')?.value.trim()||null,
            apiToken: document.getElementById('pv-token')?.value.trim()||null,
            apiMethod: document.getElementById('pv-method')?.value||'POST',
            fieldTo: document.getElementById('pv-fto')?.value.trim()||'to',
            fieldFrom: document.getElementById('pv-ffr')?.value.trim()||'from',
            fieldMsg: document.getElementById('pv-fmg')?.value.trim()||'msg',
            fieldUuid: document.getElementById('pv-fid')?.value.trim()||'uuid',
            smppHost: document.getElementById('pv-sh')?.value.trim()||null,
            smppPort: parseInt(document.getElementById('pv-sp')?.value)||2775,
            smppSystemId: document.getElementById('pv-sid')?.value.trim()||null,
            smppPassword: document.getElementById('pv-spw')?.value||null,
            smppSystemType: document.getElementById('pv-sst')?.value.trim()||'',
            smppServiceType: document.getElementById('pv-ssv')?.value.trim()||null,
            smppSourceTon: parseInt(document.getElementById('pv-ston')?.value)||1,
            smppSourceNpi: parseInt(document.getElementById('pv-snpi')?.value)||1,
            smppDestTon: parseInt(document.getElementById('pv-dton')?.value)||1,
            smppDestNpi: parseInt(document.getElementById('pv-dnpi')?.value)||1,
            smppDataCoding: parseInt(document.getElementById('pv-dc')?.value)||0,
        };
        if (!body.name) { showToast('Provider name is required', 'error'); return; }
        try {
            if (isEdit) await apiCall(`${API}/providers/${existing.id}`, { method:'PUT', body:JSON.stringify(body) });
            else await apiCall(`${API}/providers`, { method:'POST', body:JSON.stringify(body) });
            showToast(isEdit?'Provider updated':'Provider created', 'success');
            close(); renderDashboard();
        } catch(err) { showToast(err.message, 'error'); }
    };
}

window.toggleProviderFields = () => {
    const t = document.getElementById('pv-type').value;
    document.getElementById('pv-http-fields').style.display = t==='http'?'block':'none';
    document.getElementById('pv-smpp-fields').style.display = t==='smpp'?'block':'none';
};
window.editProvider = async (id) => {
    try { const { data } = await apiCall(`${API}/providers/${id}`); showProviderModal(data); } catch(err) { showToast(err.message, 'error'); }
};
window.deleteProvider = async (id, name) => {
    if (!confirm(`Delete provider "${name}"?`)) return;
    try { await apiCall(`${API}/providers/${id}`, { method:'DELETE' }); showToast('Provider deleted', 'success'); renderDashboard(); } catch(err) { showToast(err.message, 'error'); }
};

// ========== BLACKLIST PAGE ==========
async function renderBlacklistPage(container) {
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    const load = async () => {
        try {
            const data = await apiCall(`${API}/transactions/blacklist`);
            const rows = data.data || [];
            container.innerHTML = `
            <div class="card" style="margin-bottom:16px">
                <div class="card-header">
                    <div class="card-title">Blacklisted Apps (${rows.length})</div>
                    <button class="fly-btn fly-btn-sm" id="add-bl-btn">${ICONS.plus} Blacklist App</button>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>App Name</th><th>Pattern (regex)</th><th>Status</th><th>Description</th><th>Added</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${rows.length ? rows.map(a=>`
                            <tr>
                                <td style="font-weight:600">${escapeHtml(a.app_name)}</td>
                                <td><code style="font-size:11px;background:#f3f4f6;padding:2px 6px;border-radius:4px">${a.pattern||'—'}</code></td>
                                <td><span class="badge ${a.is_active?'badge-danger':'badge-secondary'}">${a.is_active?'ENFORCED':'Disabled'}</span></td>
                                <td style="color:#6B7280;font-size:12px">${a.description||'—'}</td>
                                <td style="font-size:12px;color:#6B7280">${formatDate(a.created_at)}</td>
                                <td class="actions-cell">
                                    <button class="action-btn" onclick="toggleBL('${a.id}','${a.is_active}')">${a.is_active?'Disable':'Enable'}</button>
                                    <button class="action-btn delete" onclick="deleteBL('${a.id}','${escapeHtml(a.app_name)}')">${ICONS.trash}</button>
                                </td>
                            </tr>`).join('') : '<tr class="empty-row"><td colspan="6">No blacklisted apps</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><div class="card-title">⚖️ Auto-Suspension Escalation Rules</div></div>
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0">
                    ${[['1st Violation','30 minutes','#fef9c3','#ca8a04'],['2nd Violation','1 hour','#ffedd5','#ea580c'],['3rd Violation','24 hours','#fee2e2','#dc2626'],['4th+ Violation','Permanent Block','#1e1b4b','#ffffff']].map(([title,dur,bg,col])=>`
                    <div style="background:${bg};padding:20px;text-align:center;border-right:1px solid var(--border)">
                        <div style="font-size:22px;font-weight:700;color:${col};margin-bottom:4px">${title.split(' ')[0]}</div>
                        <div style="font-size:11px;font-weight:600;color:#6B7280;text-transform:uppercase;margin-bottom:8px">${title.split(' ').slice(1).join(' ')}</div>
                        <div style="font-size:13px;font-weight:600;color:${col==='#ffffff'?'#a5b4fc':col}">${dur}</div>
                    </div>`).join('')}
                </div>
            </div>
            <div id="modal-root"></div>`;
            document.getElementById('add-bl-btn').onclick = () => showBLModal();
        } catch(err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    };
    await load();
}

async function showBLModal(existing=null) {
    const root = document.getElementById('modal-root'); if (!root) return;
    root.innerHTML = `
    <div class="modal-overlay" id="bl-overlay">
        <div class="modal" style="max-width:420px">
            <div class="modal-header"><div class="modal-title">Blacklist App</div><button class="modal-close" id="close-bl">${ICONS.x}</button></div>
            <div class="modal-body">
                <div class="form-group"><label>App Name *</label><input class="fly-input" id="bl-name" placeholder="e.g. Telegram" value="${existing?.app_name||''}"></div>
                <div class="form-group"><label>Match Pattern (regex, optional)</label><input class="fly-input" id="bl-pattern" placeholder="telegram|Telegram|TG" value="${existing?.pattern||''}"></div>
                <div class="form-group"><label>Description</label><input class="fly-input" id="bl-desc" placeholder="Why this app is blacklisted" value="${existing?.description||''}"></div>
            </div>
            <div class="modal-footer">
                <button class="fly-btn fly-btn-secondary" id="cancel-bl">Cancel</button>
                <button class="fly-btn fly-btn-danger" id="save-bl">Blacklist</button>
            </div>
        </div>
    </div>`;
    const close = () => root.innerHTML = '';
    document.getElementById('close-bl').onclick = close;
    document.getElementById('cancel-bl').onclick = close;
    document.getElementById('bl-overlay').onclick = e => { if(e.target.id==='bl-overlay') close(); };
    document.getElementById('save-bl').onclick = async () => {
        const body = { appName: document.getElementById('bl-name').value.trim(), pattern: document.getElementById('bl-pattern').value.trim()||null, description: document.getElementById('bl-desc').value.trim()||null };
        if (!body.appName) { showToast('App name required', 'error'); return; }
        try {
            await apiCall(`${API}/transactions/blacklist`, { method:'POST', body:JSON.stringify(body) });
            showToast('App blacklisted', 'success'); close(); renderDashboard();
        } catch(err) { showToast(err.message, 'error'); }
    };
}
window.toggleBL = async (id, isActive) => {
    try { await apiCall(`${API}/transactions/blacklist/${id}/toggle`, { method:'PATCH' }); showToast(isActive==='1'||isActive===true?'Disabled':'Enabled', 'success'); renderDashboard(); } catch(err) { showToast(err.message, 'error'); }
};
window.deleteBL = async (id, name) => {
    if (!confirm(`Remove "${name}" from blacklist?`)) return;
    try { await apiCall(`${API}/transactions/blacklist/${id}`, { method:'DELETE' }); showToast('Removed', 'success'); renderDashboard(); } catch(err) { showToast(err.message, 'error'); }
};

// ========== PRICING PAGE ==========
async function renderPricingPage(container) {
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    const load = async () => {
        try {
            const data = await apiCall(`${API}/transactions/pricing`);
            const rows = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Pricing Rules (${rows.length})</div>
                    <button class="fly-btn fly-btn-sm" id="add-pr-btn">${ICONS.plus} Add Rule</button>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Name</th><th>Scope</th><th>Role/Range</th><th>Rate ($)</th><th>Margin %</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${rows.length ? rows.map(r=>`
                            <tr>
                                <td style="font-weight:600">${escapeHtml(r.name)}</td>
                                <td><span class="badge badge-primary">${r.scope}</span></td>
                                <td style="font-size:12px;color:#6B7280">${r.role||r.range_name||'—'}</td>
                                <td style="font-weight:600">$${parseFloat(r.rate).toFixed(4)}</td>
                                <td>${r.profit_margin}%</td>
                                <td><span class="badge ${r.is_active?'badge-success':'badge-secondary'}">${r.is_active?'Active':'Inactive'}</span></td>
                                <td class="actions-cell">
                                    <button class="action-btn" onclick="editPricing('${r.id}')">${ICONS.edit}</button>
                                    <button class="action-btn delete" onclick="deletePricing('${r.id}')">${ICONS.trash}</button>
                                </td>
                            </tr>`).join('') : '<tr class="empty-row"><td colspan="7">No pricing rules</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
            <div id="modal-root"></div>`;
            document.getElementById('add-pr-btn').onclick = () => showPricingModal();
        } catch(err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    };
    await load();
}

async function showPricingModal(existing=null) {
    const isEdit = !!existing;
    const root = document.getElementById('modal-root'); if (!root) return;
    const rangeData = await apiCall(`${API}/ranges?limit=100`).catch(()=>({data:[]}));
    const ranges = rangeData.data||[];
    root.innerHTML = `
    <div class="modal-overlay" id="pr-overlay">
        <div class="modal" style="max-width:440px">
            <div class="modal-header"><div class="modal-title">${isEdit?'Edit Pricing Rule':'New Pricing Rule'}</div><button class="modal-close" id="close-pr">${ICONS.x}</button></div>
            <div class="modal-body">
                <div class="form-group"><label>Name *</label><input class="fly-input" id="pr-name" value="${existing?.name||''}"></div>
                <div class="form-row">
                    <div class="form-group"><label>Scope</label>
                        <select class="fly-input" id="pr-scope" onchange="togglePRScope()">
                            <option value="global" ${existing?.scope==='global'?'selected':''}>Global</option>
                            <option value="role" ${existing?.scope==='role'?'selected':''}>By Role</option>
                            <option value="range" ${existing?.scope==='range'?'selected':''}>By Range</option>
                        </select>
                    </div>
                    <div class="form-group" id="pr-role-grp" style="display:${existing?.scope==='role'?'block':'none'}">
                        <label>Role</label>
                        <select class="fly-input" id="pr-role">
                            ${Object.entries(ROLE_LABELS).map(([k,v])=>`<option value="${k}" ${existing?.role===k?'selected':''}>${v}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" id="pr-range-grp" style="display:${existing?.scope==='range'?'block':'none'}">
                        <label>Range</label>
                        <select class="fly-input" id="pr-range">
                            <option value="">— Select —</option>
                            ${ranges.map(r=>`<option value="${r.name}" ${existing?.range_name===r.name?'selected':''}>${escapeHtml(r.name)}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Rate ($)</label><input class="fly-input" id="pr-rate" type="number" step="0.0001" value="${existing?.rate||0.05}"></div>
                    <div class="form-group"><label>Profit Margin (%)</label><input class="fly-input" id="pr-margin" type="number" step="0.01" value="${existing?.profit_margin||50}"></div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="fly-btn fly-btn-secondary" id="cancel-pr">Cancel</button>
                <button class="fly-btn" id="save-pr">${isEdit?'Update':'Create'}</button>
            </div>
        </div>
    </div>`;
    const close = () => root.innerHTML = '';
    document.getElementById('close-pr').onclick = close;
    document.getElementById('cancel-pr').onclick = close;
    document.getElementById('pr-overlay').onclick = e => { if(e.target.id==='pr-overlay') close(); };
    document.getElementById('save-pr').onclick = async () => {
        const scope = document.getElementById('pr-scope').value;
        const body = { name: document.getElementById('pr-name').value.trim(), scope, role: scope==='role'?document.getElementById('pr-role')?.value:null, rangeName: scope==='range'?document.getElementById('pr-range')?.value:null, rate: parseFloat(document.getElementById('pr-rate').value)||0, profitMargin: parseFloat(document.getElementById('pr-margin').value)||50 };
        if (!body.name) { showToast('Name required', 'error'); return; }
        try {
            if (isEdit) await apiCall(`${API}/transactions/pricing/${existing.id}`, { method:'PUT', body:JSON.stringify(body) });
            else await apiCall(`${API}/transactions/pricing`, { method:'POST', body:JSON.stringify(body) });
            showToast(isEdit?'Updated':'Created', 'success'); close(); renderDashboard();
        } catch(err) { showToast(err.message, 'error'); }
    };
}
window.togglePRScope = () => {
    const s = document.getElementById('pr-scope').value;
    document.getElementById('pr-role-grp').style.display = s==='role'?'block':'none';
    document.getElementById('pr-range-grp').style.display = s==='range'?'block':'none';
};
window.editPricing = async (id) => {
    try { const rows = (await apiCall(`${API}/transactions/pricing`)).data||[]; const r = rows.find(x=>x.id===id); if(r) showPricingModal(r); } catch(err) { showToast(err.message,'error'); }
};
window.deletePricing = async (id) => {
    if (!confirm('Delete pricing rule?')) return;
    try { await apiCall(`${API}/transactions/pricing/${id}`, { method:'DELETE' }); showToast('Deleted','success'); renderDashboard(); } catch(err) { showToast(err.message,'error'); }
};

// ========== TRANSACTIONS PAGE ==========
async function renderTransactionsPage(container) {
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    let txType = '', days = 30;
    const load = async () => {
        try {
            const data = await apiCall(`${API}/transactions/ledger?days=${days}&limit=200${txType?'&tx_type='+txType:''}`);
            const rows = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Transaction Ledger (${data.total||rows.length})</div>
                    <button class="fly-btn fly-btn-sm fly-btn-secondary" onclick="exportLedger(${days})">Export CSV</button>
                </div>
                <div class="filter-bar">
                    <select class="filter-select" id="tx-type-filter">
                        <option value="">All Types</option>
                        ${['credit','debit','transfer_in','transfer_out','payout','adjustment'].map(t=>`<option value="${t}" ${txType===t?'selected':''}>${t}</option>`).join('')}
                    </select>
                    <select class="filter-select" id="tx-days-filter">
                        ${[7,30,90,365].map(d=>`<option value="${d}" ${days===d?'selected':''}>${d === 7 ? 'Last 7 days' : d===30?'Last 30 days':d===90?'Last 90 days':'Last year'}</option>`).join('')}
                    </select>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>ID</th><th>User</th><th>Type</th><th>Amount</th><th>Before</th><th>After</th><th>Note</th><th>Date</th></tr></thead>
                        <tbody>
                            ${rows.length ? rows.map(t=>`
                            <tr>
                                <td style="font-size:11px;color:#9ca3af;font-family:monospace">${t.id.slice(0,12)}…</td>
                                <td style="font-weight:600">${escapeHtml(t.username)}</td>
                                <td><span class="badge ${['credit','transfer_in'].includes(t.tx_type)?'badge-success':['debit','transfer_out','payout'].includes(t.tx_type)?'badge-danger':'badge-warning'}">${t.tx_type}</span></td>
                                <td style="font-weight:700;color:${t.amount>=0?'#16a34a':'#ef4444'}">${t.amount>=0?'+':''}$${Math.abs(t.amount).toFixed(4)}</td>
                                <td style="font-size:12px;color:#6B7280">$${(t.balance_before||0).toFixed(4)}</td>
                                <td style="font-size:12px">$${(t.balance_after||0).toFixed(4)}</td>
                                <td style="font-size:12px;color:#6B7280;max-width:160px;overflow:hidden;text-overflow:ellipsis">${t.note||'—'}</td>
                                <td style="font-size:12px;color:#6B7280">${formatDate(t.created_at)}</td>
                            </tr>`).join('') : '<tr class="empty-row"><td colspan="8">No transactions</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>`;
            document.getElementById('tx-type-filter').onchange = e => { txType=e.target.value; load(); };
            document.getElementById('tx-days-filter').onchange = e => { days=parseInt(e.target.value); load(); };
        } catch(err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    };
    await load();
}
window.exportLedger = async (days=30) => {
    try {
        const r = await fetch(`${API}/transactions/ledger/export?days=${days}`, { headers:{ Authorization:`Bearer ${getToken()}` } });
        const b = await r.blob();
        const a = document.createElement('a'); a.href=URL.createObjectURL(b); a.download=`ledger_${days}d.csv`; a.click();
    } catch(err) { showToast('Export failed', 'error'); }
};

// ========== AUDIT LOGS PAGE ==========
async function renderAuditLogsPage(container) {
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    let actor='', action='', days=7;
    const load = async () => {
        try {
            let url = `${API}/transactions/audit-logs?days=${days}&limit=200`;
            if (actor) url += `&actor=${encodeURIComponent(actor)}`;
            if (action) url += `&action=${encodeURIComponent(action)}`;
            const data = await apiCall(url);
            const rows = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Audit Logs (${data.total||rows.length})</div></div>
                <div class="filter-bar">
                    <input type="text" class="search-input" placeholder="Filter by actor…" id="al-actor" value="${actor}" style="max-width:160px">
                    <input type="text" class="search-input" placeholder="Filter by action…" id="al-action" value="${action}" style="max-width:160px">
                    <select class="filter-select" id="al-days">
                        ${[1,7,30].map(d=>`<option value="${d}" ${days===d?'selected':''}>${d===1?'Last 24h':d===7?'Last 7 days':'Last 30 days'}</option>`).join('')}
                    </select>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Actor</th><th>Action</th><th>Target</th><th>Detail</th><th>IP</th><th>Time</th></tr></thead>
                        <tbody>
                            ${rows.length ? rows.map(a=>`
                            <tr>
                                <td style="font-weight:600">${a.actor||'system'}</td>
                                <td><span class="badge badge-primary" style="font-family:monospace;font-size:11px">${a.action}</span></td>
                                <td style="font-size:12px;color:#6B7280">${(a.target_type||'')+(a.target_id?'#'+a.target_id:'')}</td>
                                <td style="font-size:12px;color:#6B7280;max-width:200px;overflow:hidden;text-overflow:ellipsis">${a.detail||'—'}</td>
                                <td style="font-size:12px;font-family:monospace;color:#6B7280">${a.ip||'—'}</td>
                                <td style="font-size:12px;color:#6B7280">${formatDate(a.created_at)}</td>
                            </tr>`).join('') : '<tr class="empty-row"><td colspan="6">No audit logs</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>`;
            document.getElementById('al-actor').oninput = debounce(e=>{ actor=e.target.value; load(); }, 400);
            document.getElementById('al-action').oninput = debounce(e=>{ action=e.target.value; load(); }, 400);
            document.getElementById('al-days').onchange = e=>{ days=parseInt(e.target.value); load(); };
        } catch(err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    };
    await load();
}

// ========== SUPPORT TICKETS PAGE ==========
async function renderSupportPage(container) {
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    let statusFilter='', priorityFilter='';
    const load = async () => {
        try {
            let url = `${API}/transactions/tickets`;
            const params=[];
            if (statusFilter) params.push(`status=${statusFilter}`);
            if (priorityFilter) params.push(`priority=${priorityFilter}`);
            if (params.length) url += '?' + params.join('&');
            const data = await apiCall(url);
            const rows = data.data || [];
            const role = user?.role || 'admin';
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Support Tickets (${rows.length})</div>
                    <button class="fly-btn fly-btn-sm" id="new-ticket-btn">${ICONS.plus} New Ticket</button>
                </div>
                <div class="filter-bar">
                    <select class="filter-select" id="tk-status">
                        <option value="">All Status</option>
                        ${['open','in_progress','resolved','closed'].map(s=>`<option value="${s}" ${statusFilter===s?'selected':''}>${s.replace('_',' ')}</option>`).join('')}
                    </select>
                    <select class="filter-select" id="tk-priority">
                        <option value="">All Priority</option>
                        ${['urgent','high','medium','low'].map(p=>`<option value="${p}" ${priorityFilter===p?'selected':''}>${p}</option>`).join('')}
                    </select>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>User</th><th>Subject</th><th>Priority</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${rows.length ? rows.map(t=>`
                            <tr>
                                <td style="font-weight:600">${escapeHtml(t.username)}</td>
                                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">${escapeHtml(t.subject)}</td>
                                <td><span class="badge ${t.priority==='urgent'?'badge-danger':t.priority==='high'?'badge-warning':t.priority==='medium'?'badge-primary':'badge-secondary'}">${t.priority}</span></td>
                                <td><span class="badge ${t.status==='open'?'badge-warning':t.status==='resolved'?'badge-success':t.status==='in_progress'?'badge-primary':'badge-secondary'}">${t.status.replace('_',' ')}</span></td>
                                <td style="font-size:12px;color:#6B7280">${formatDate(t.created_at)}</td>
                                <td class="actions-cell">
                                    <button class="action-btn" onclick="viewTicket('${t.id}')">View</button>
                                    ${['admin','manager'].includes(role) && t.status!=='closed' ? `<button class="action-btn" onclick="replyTicket('${t.id}')">Reply</button>` : ''}
                                </td>
                            </tr>`).join('') : '<tr class="empty-row"><td colspan="6">No tickets</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
            <div id="modal-root"></div>`;
            document.getElementById('tk-status').onchange = e=>{ statusFilter=e.target.value; load(); };
            document.getElementById('tk-priority').onchange = e=>{ priorityFilter=e.target.value; load(); };
            document.getElementById('new-ticket-btn').onclick = () => showTicketModal();
        } catch(err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    };
    await load();
}

async function showTicketModal(existing=null, replyMode=false) {
    const root = document.getElementById('modal-root'); if (!root) return;
    root.innerHTML = `
    <div class="modal-overlay" id="tk-overlay">
        <div class="modal" style="max-width:480px">
            <div class="modal-header"><div class="modal-title">${replyMode?'Reply to Ticket #'+existing?.id?.slice(0,8)+'…':existing?'View Ticket':'New Support Ticket'}</div><button class="modal-close" id="close-tk">${ICONS.x}</button></div>
            <div class="modal-body">
                ${existing ? `<div style="background:#f9fafb;border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:16px"><div style="font-weight:700;margin-bottom:4px">${escapeHtml(existing.subject)}</div><div style="font-size:13px;color:#6B7280">${escapeHtml(existing.message)}</div>${existing.reply?`<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)"><div style="font-size:12px;font-weight:600;color:#735DFF;margin-bottom:4px">Reply:</div><div style="font-size:13px">${escapeHtml(existing.reply)}</div></div>`:''}</div>` : ''}
                ${!replyMode && !existing ? `
                <div class="form-group"><label>Subject *</label><input class="fly-input" id="tk-subject"></div>
                <div class="form-group"><label>Priority</label><select class="fly-input" id="tk-priority"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
                <div class="form-group"><label>Message *</label><textarea class="fly-input" id="tk-message" rows="4" style="resize:vertical"></textarea></div>` : ''}
                ${replyMode ? `
                <div class="form-group"><label>Reply *</label><textarea class="fly-input" id="tk-reply" rows="4" style="resize:vertical"></textarea></div>
                <div class="form-group"><label>Status</label><select class="fly-input" id="tk-status"><option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></div>` : ''}
            </div>
            <div class="modal-footer">
                <button class="fly-btn fly-btn-secondary" id="cancel-tk">Cancel</button>
                ${!existing || replyMode ? `<button class="fly-btn" id="save-tk">${replyMode?'Send Reply':'Create Ticket'}</button>` : ''}
            </div>
        </div>
    </div>`;
    const close = () => root.innerHTML = '';
    document.getElementById('close-tk').onclick = close;
    document.getElementById('cancel-tk').onclick = close;
    document.getElementById('tk-overlay').onclick = e => { if(e.target.id==='tk-overlay') close(); };
    document.getElementById('save-tk')?.addEventListener('click', async () => {
        try {
            if (replyMode) {
                const reply = document.getElementById('tk-reply').value.trim();
                const status = document.getElementById('tk-status').value;
                if (!reply) { showToast('Reply is required', 'error'); return; }
                await apiCall(`${API}/transactions/tickets/${existing.id}`, { method:'PUT', body:JSON.stringify({ reply, status }) });
                showToast('Reply sent', 'success');
            } else {
                const subject = document.getElementById('tk-subject').value.trim();
                const message = document.getElementById('tk-message').value.trim();
                if (!subject||!message) { showToast('Subject and message required', 'error'); return; }
                await apiCall(`${API}/transactions/tickets`, { method:'POST', body:JSON.stringify({ subject, message, priority: document.getElementById('tk-priority').value }) });
                showToast('Ticket created', 'success');
            }
            close(); renderDashboard();
        } catch(err) { showToast(err.message, 'error'); }
    });
}

window.viewTicket = async (id) => {
    try { const rows = (await apiCall(`${API}/transactions/tickets`)).data||[]; const t = rows.find(x=>x.id===id); if(t) showTicketModal(t,false); } catch(err) { showToast(err.message,'error'); }
};
window.replyTicket = async (id) => {
    try { const rows = (await apiCall(`${API}/transactions/tickets`)).data||[]; const t = rows.find(x=>x.id===id); if(t) showTicketModal(t,true); } catch(err) { showToast(err.message,'error'); }
};

// ========== SUSPEND USER ==========
window.suspendUser = async (userId, username) => {
    const root = _modal();
    root.innerHTML = `
    <div class="modal-overlay" id="sp-overlay">
        <div class="modal" style="max-width:400px">
            <div class="modal-header"><div class="modal-title">Suspend ${username}</div><button class="modal-close" id="close-sp">${ICONS.x}</button></div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Duration</label>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px">
                        <button class="fly-btn fly-btn-secondary sp-dur" data-v="30" onclick="setSPDur(30)">30 minutes</button>
                        <button class="fly-btn fly-btn-secondary sp-dur" data-v="60" onclick="setSPDur(60)">1 hour</button>
                        <button class="fly-btn fly-btn-secondary sp-dur" data-v="1440" onclick="setSPDur(1440)">1 day</button>
                        <button class="fly-btn fly-btn-secondary sp-dur" data-v="0" onclick="setSPDur(0)">Custom</button>
                    </div>
                    <input type="hidden" id="sp-dur" value="30">
                    <div id="sp-custom" style="display:none;margin-top:8px">
                        <input class="fly-input" id="sp-custom-val" type="number" min="1" placeholder="Minutes" oninput="document.getElementById('sp-dur').value=this.value">
                    </div>
                </div>
                <div class="form-group" style="margin-top:12px">
                    <label>Reason</label>
                    <input class="fly-input" id="sp-reason" placeholder="e.g. Policy violation">
                </div>
            </div>
            <div class="modal-footer">
                <button class="fly-btn fly-btn-secondary" id="cancel-sp">Cancel</button>
                <button class="fly-btn" id="do-sp" style="background:#d97706;border-color:#d97706">Suspend</button>
            </div>
        </div>
    </div>`;
    const close = () => root.innerHTML = '';
    document.getElementById('close-sp').onclick = close;
    document.getElementById('cancel-sp').onclick = close;
    document.getElementById('sp-overlay').onclick = e => { if (e.target.id === 'sp-overlay') close(); };
    document.getElementById('do-sp').onclick = async () => {
        const minutes = parseInt(document.getElementById('sp-dur').value) || 30;
        const reason = document.getElementById('sp-reason').value.trim() || 'Manual suspension';
        try {
            await apiCall(`${API}/users/${userId}/suspend`, { method: 'POST', body: JSON.stringify({ minutes, reason }) });
            showToast(`${username} suspended for ${minutes} mins`, 'success');
            close(); renderDashboard();
        } catch (err) { showToast(err.message, 'error'); }
    };
};

window.setSPDur = (v) => {
    document.getElementById('sp-dur').value = v;
    document.getElementById('sp-custom').style.display = v === 0 ? 'block' : 'none';
    document.querySelectorAll('.sp-dur').forEach(b => {
        const active = parseInt(b.dataset.v) === v;
        b.style.background = active ? '#735DFF' : '';
        b.style.color = active ? 'white' : '';
        b.style.borderColor = active ? '#735DFF' : '';
    });
};

// ========== UNBLOCK USER ==========
window.unblockUser = async (userId) => {
    try {
        await apiCall(`${API}/users/${userId}/unblock`, { method: 'POST' });
        showToast('User restored to active', 'success');
        renderDashboard();
    } catch (err) { showToast(err.message, 'error'); }
};

// ========== ADJUST BALANCE ==========
window.adjustBalance = async (userId, username) => {
    const root = _modal();
    root.innerHTML = `
    <div class="modal-overlay" id="bal-overlay">
        <div class="modal" style="max-width:380px">
            <div class="modal-header"><div class="modal-title">Adjust Balance — ${username}</div><button class="modal-close" id="close-bal">${ICONS.x}</button></div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Amount (USD) — positive to add, negative to deduct</label>
                    <input class="fly-input" id="bal-amount" type="number" step="0.0001" placeholder="e.g. 10.00 or -5.00">
                </div>
                <div class="form-group" style="margin-top:12px">
                    <label>Reason</label>
                    <input class="fly-input" id="bal-reason" placeholder="e.g. Manual top-up">
                </div>
            </div>
            <div class="modal-footer">
                <button class="fly-btn fly-btn-secondary" id="cancel-bal">Cancel</button>
                <button class="fly-btn" id="do-bal">Apply</button>
            </div>
        </div>
    </div>`;
    const close = () => root.innerHTML = '';
    document.getElementById('close-bal').onclick = close;
    document.getElementById('cancel-bal').onclick = close;
    document.getElementById('bal-overlay').onclick = e => { if (e.target.id === 'bal-overlay') close(); };
    document.getElementById('do-bal').onclick = async () => {
        const amount = parseFloat(document.getElementById('bal-amount').value);
        const reason = document.getElementById('bal-reason').value.trim() || 'Manual adjustment';
        if (isNaN(amount)) { showToast('Enter a valid amount', 'error'); return; }
        try {
            await apiCall(`${API}/transactions/balance-adjust`, { method: 'POST', body: JSON.stringify({ userId, amount, note: reason }) });
            showToast(`Balance adjusted by $${amount.toFixed(4)}`, 'success');
            close(); renderDashboard();
        } catch (err) { showToast(err.message, 'error'); }
    };
};

// ========== BULK IMPORT NUMBERS ==========
window.showBulkImportModal = (container) => {
    const root = document.getElementById('modal-root') || (() => {
        const d = document.createElement('div'); d.id = 'modal-root'; container.appendChild(d); return d;
    })();
    root.innerHTML = `
    <div class="modal-overlay" id="bi-overlay">
        <div class="modal" style="max-width:560px">
            <div class="modal-header"><div class="modal-title">Bulk Import Numbers (one per line)</div><button class="modal-close" id="close-bi">${ICONS.x}</button></div>
            <div class="modal-body">
                <p style="font-size:12px;color:#6B7280;margin-bottom:12px">Paste your numbers below — one per line. Duplicates are automatically skipped.</p>
                <div class="form-group">
                    <label>Numbers *</label>
                    <textarea class="fly-input" id="bi-numbers" rows="8" style="font-family:monospace;font-size:12px;resize:vertical" placeholder="+525529001312&#10;+923001234567&#10;+447911123456"></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Country Code *</label><input class="fly-input" id="bi-country" placeholder="PK"></div>
                    <div class="form-group"><label>Country Name</label><input class="fly-input" id="bi-cname" placeholder="Pakistan"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Range Name</label><input class="fly-input" id="bi-range" placeholder="PK-Range-01"></div>
                    <div class="form-group"><label>Rate ($)</label><input class="fly-input" id="bi-rate" type="number" step="0.0001" value="0.05"></div>
                </div>
                <div id="bi-result" style="display:none;margin-top:12px;padding:12px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:13px"></div>
            </div>
            <div class="modal-footer">
                <button class="fly-btn fly-btn-secondary" id="cancel-bi">Cancel</button>
                <button class="fly-btn" id="do-bi">Import Numbers</button>
            </div>
        </div>
    </div>`;
    const close = () => root.innerHTML = '';
    document.getElementById('close-bi').onclick = close;
    document.getElementById('cancel-bi').onclick = close;
    document.getElementById('bi-overlay').onclick = e => { if (e.target.id === 'bi-overlay') close(); };
    document.getElementById('do-bi').onclick = async () => {
        const cc = document.getElementById('bi-country').value.trim();
        if (!cc) { showToast('Country code is required', 'error'); return; }
        const txt = document.getElementById('bi-numbers').value.trim();
        if (!txt) { showToast('Paste some numbers first', 'error'); return; }
        const btn = document.getElementById('do-bi');
        btn.disabled = true; btn.textContent = 'Importing…';
        try {
            const data = await apiCall(`${API}/numbers/bulk-import`, { method: 'POST', body: JSON.stringify({
                numbersText: txt,
                country: cc,
                countryName: document.getElementById('bi-cname').value.trim() || null,
                rangeName: document.getElementById('bi-range').value.trim() || null,
                rate: parseFloat(document.getElementById('bi-rate').value) || 0.05,
            })});
            const r = document.getElementById('bi-result');
            r.style.display = 'block';
            r.innerHTML = `✓ <strong>${data.success}</strong> imported &nbsp;·&nbsp; <strong>${data.skipped}</strong> skipped${data.errors?.length ? ` &nbsp;·&nbsp; ${data.errors.length} errors` : ''}`;
            showToast(`Imported ${data.success} numbers`, 'success');
            setTimeout(() => { close(); renderDashboard(); }, 1800);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            btn.disabled = false; btn.textContent = 'Import Numbers';
        }
    };
};

// ========== ALLOCATIONS PAGE ==========
async function renderAllocationsPage(container) {
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    let statusFilter = '';
    const load = async () => {
        try {
            const url = `${API}/numbers-ext/allocations${statusFilter ? '?status=' + statusFilter : ''}`;
            const data = await apiCall(url);
            const rows = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Allocations (${rows.length})</div>
                    <button class="fly-btn fly-btn-sm" id="self-alloc-btn">${ICONS.plus} Allocate Numbers</button>
                </div>
                <div class="filter-bar">
                    <select class="filter-select" id="alloc-status">
                        <option value="">All Status</option>
                        <option value="active" ${statusFilter === 'active' ? 'selected' : ''}>Active</option>
                        <option value="returned" ${statusFilter === 'returned' ? 'selected' : ''}>Returned</option>
                        <option value="expired" ${statusFilter === 'expired' ? 'selected' : ''}>Expired</option>
                    </select>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>User</th><th>Range</th><th>Qty</th><th>Duration</th><th>Status</th><th>Allocated On</th><th>Expires</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${rows.length ? rows.map(a => `
                            <tr>
                                <td style="font-weight:600">${escapeHtml(a.username)}</td>
                                <td><span class="badge badge-primary">${escapeHtml(a.range_name)}</span></td>
                                <td style="font-weight:700">${a.quantity}</td>
                                <td style="text-transform:capitalize">${a.duration}</td>
                                <td><span class="badge ${a.status === 'active' ? 'badge-success' : a.status === 'returned' ? 'badge-secondary' : 'badge-danger'}">${a.status}</span></td>
                                <td style="font-size:12px;color:#6B7280">${formatDate(a.created_at)}</td>
                                <td style="font-size:12px;color:#6B7280">${a.expires_at ? formatDate(a.expires_at) : '—'}</td>
                                <td class="actions-cell">
                                    ${a.status === 'active' ? `<button class="action-btn delete" onclick="returnAllocation('${a.id}')">Return</button>` : ''}
                                </td>
                            </tr>`).join('') : '<tr class="empty-row"><td colspan="8">No allocations found</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
            <div id="modal-root"></div>`;
            document.getElementById('alloc-status').onchange = e => { statusFilter = e.target.value; load(); };
            document.getElementById('self-alloc-btn').onclick = () => showAllocModal();
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error loading allocations</h3><p>${err.message}</p></div>`;
        }
    };
    await load();
}

window.returnAllocation = async (id) => {
    if (!confirm('Return this allocation? All numbers will be unassigned.')) return;
    try {
        const data = await apiCall(`${API}/numbers-ext/allocations/${id}/return`, { method: 'POST' });
        showToast(`Returned ${data.returned} numbers`, 'success');
        renderDashboard();
    } catch (err) { showToast(err.message, 'error'); }
};

async function showAllocModal() {
    const root = _modal();
    let ranges = [];
    try { ranges = (await apiCall(`${API}/ranges?status=active&limit=100`)).data || []; } catch (e) {}
    root.innerHTML = `
    <div class="modal-overlay" id="alloc-overlay">
        <div class="modal" style="max-width:480px">
            <div class="modal-header"><div class="modal-title">Allocate Numbers</div><button class="modal-close" id="close-alloc">${ICONS.x}</button></div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Range *</label>
                    <select class="fly-input" id="alloc-range" onchange="updateAllocInfo()">
                        <option value="">— Select a range —</option>
                        ${ranges.map(r => `<option value="${r.name}" data-max="${r.allocation_limit_per_user || 100}" data-avail="${r._count?.available || 0}" data-global="${r.allocation_limit_global || 10000}" data-used="${r.allocated_numbers || 0}">${escapeHtml(r.name)} (${r.country_name || r.country_code || '—'}) — ${r._count?.available || 0} free</option>`).join('')}
                    </select>
                </div>
                <div id="alloc-info" style="display:none;margin-bottom:16px;padding:12px 14px;background:#f5f3ff;border:1px solid #e0e7ff;border-radius:8px;font-size:13px">
                    <div>Available: <strong id="alloc-avail">—</strong> &nbsp;·&nbsp; Max per request: <strong id="alloc-max">—</strong></div>
                    <div style="margin-top:4px">Slots remaining (global): <strong id="alloc-slots">—</strong></div>
                </div>
                <div id="alloc-limit-warn" style="display:none;padding:10px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:13px;color:#92400e;margin-bottom:16px">
                    ⚠ Self-allocation limit reached for this range. Contact support for additional numbers.
                </div>
                <div class="form-group">
                    <label>Quantity *</label>
                    <input class="fly-input" id="alloc-qty" type="number" min="1" placeholder="How many numbers do you need">
                </div>
                <div class="form-group" style="margin-top:12px">
                    <label>Rental Duration *</label>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px">
                        <button class="fly-btn fly-btn-secondary alloc-dur" data-v="weekly" onclick="setAllocDur('weekly')">Weekly</button>
                        <button class="fly-btn fly-btn-secondary alloc-dur" data-v="monthly" onclick="setAllocDur('monthly')">Monthly</button>
                        <button class="fly-btn fly-btn-secondary alloc-dur" data-v="yearly" onclick="setAllocDur('yearly')">Yearly</button>
                        <button class="fly-btn fly-btn-secondary alloc-dur" data-v="custom" onclick="setAllocDur('custom')">Custom</button>
                    </div>
                    <input type="hidden" id="alloc-dur" value="monthly">
                    <div id="alloc-custom-days" style="display:none;margin-top:8px">
                        <input class="fly-input" id="alloc-days" type="number" min="1" placeholder="Number of days">
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="fly-btn fly-btn-secondary" id="cancel-alloc">Cancel</button>
                <button class="fly-btn" id="do-alloc">Allocate</button>
            </div>
        </div>
    </div>`;
    const close = () => root.innerHTML = '';
    document.getElementById('close-alloc').onclick = close;
    document.getElementById('cancel-alloc').onclick = close;
    document.getElementById('alloc-overlay').onclick = e => { if (e.target.id === 'alloc-overlay') close(); };
    document.getElementById('do-alloc').onclick = async () => {
        const rangeName = document.getElementById('alloc-range').value;
        const qty = parseInt(document.getElementById('alloc-qty').value);
        const dur = document.getElementById('alloc-dur').value;
        const days = dur === 'custom' ? parseInt(document.getElementById('alloc-days').value) : null;
        if (!rangeName) { showToast('Select a range', 'error'); return; }
        if (!qty || qty < 1) { showToast('Enter a valid quantity', 'error'); return; }
        if (!dur) { showToast('Select a duration', 'error'); return; }
        try {
            const data = await apiCall(`${API}/numbers-ext/allocate`, { method: 'POST', body: JSON.stringify({ rangeName, quantity: qty, duration: dur, customDays: days }) });
            showToast(`Allocated ${data.allocated} numbers! Expires: ${data.expires_at ? formatDate(data.expires_at) : 'never'}`, 'success');
            close(); renderDashboard();
        } catch (err) { showToast(err.message, 'error'); }
    };
}

window.updateAllocInfo = () => {
    const sel = document.getElementById('alloc-range');
    const opt = sel.options[sel.selectedIndex];
    if (!opt?.value) { document.getElementById('alloc-info').style.display = 'none'; return; }
    const avail = parseInt(opt.dataset.avail) || 0;
    const max = parseInt(opt.dataset.max) || 100;
    const slots = (parseInt(opt.dataset.global) || 10000) - (parseInt(opt.dataset.used) || 0);
    document.getElementById('alloc-avail').textContent = avail;
    document.getElementById('alloc-max').textContent = max;
    document.getElementById('alloc-slots').textContent = Math.max(0, slots);
    document.getElementById('alloc-info').style.display = 'block';
    document.getElementById('alloc-limit-warn').style.display = slots <= 0 ? 'block' : 'none';
};

window.setAllocDur = (v) => {
    document.getElementById('alloc-dur').value = v;
    document.getElementById('alloc-custom-days').style.display = v === 'custom' ? 'block' : 'none';
    document.querySelectorAll('.alloc-dur').forEach(b => {
        const on = b.dataset.v === v;
        b.style.background = on ? '#735DFF' : '';
        b.style.color = on ? 'white' : '';
        b.style.borderColor = on ? '#735DFF' : '';
    });
};

// ========== SETTINGS PAGE (fixed) ==========
async function renderSettingsPage(container) {
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    try {
        const info = await apiCall(`${API}/settings/webhook-info`);
        container.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Webhook / HTTP API</div></div>
            <div style="padding:20px">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
                    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px">
                        <div style="font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">Server IP</div>
                        <div style="font-size:16px;font-weight:600;font-family:monospace;color:#222F36">${info.serverIp}</div>
                    </div>
                    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px">
                        <div style="font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">Port</div>
                        <div style="font-size:16px;font-weight:600;font-family:monospace;color:#222F36">${info.port}</div>
                    </div>
                </div>
                <div class="form-group">
                    <label>Webhook URL — POST your SMS here</label>
                    <div style="display:flex;gap:8px;margin-top:4px">
                        <input class="fly-input" id="wh-url" value="${info.webhookUrl}" readonly style="flex:1;font-family:monospace;font-size:13px;background:#f9fafb">
                        <button class="fly-btn fly-btn-sm" onclick="navigator.clipboard.writeText('${info.webhookUrl}').then(()=>showToast('Copied!','success'))">Copy</button>
                    </div>
                </div>
                <div style="margin-top:20px">
                    <div style="font-size:13px;font-weight:600;margin-bottom:10px">Required POST fields</div>
                    <table class="fly-table" style="font-size:13px">
                        <thead><tr><th>Field</th><th>Description</th><th>Example</th></tr></thead>
                        <tbody>
                            <tr><td><code>to</code></td><td>Destination number (international format)</td><td><code>+525529001312</code></td></tr>
                            <tr><td><code>from</code></td><td>Service name or sender ID</td><td><code>AmericanExpress</code></td></tr>
                            <tr><td><code>msg</code></td><td>Full SMS message body</td><td><code>Your OTP is 847291</code></td></tr>
                            <tr><td><code>uuid</code></td><td>Unique message ID (optional)</td><td><code>msg-204953</code></td></tr>
                        </tbody>
                    </table>
                </div>
                <div style="margin-top:20px;background:#1e1b4b;border-radius:8px;padding:16px;font-family:monospace;font-size:12px;color:#a5b4fc;line-height:1.8">
                    <div style="color:#6ee7b7;margin-bottom:8px"># Example POST request</div>
                    <div>POST ${info.webhookUrl}</div>
                    <div>Content-Type: application/json</div>
                    <div style="margin-top:8px">{</div>
                    <div style="padding-left:20px">"to": "+525529001312",</div>
                    <div style="padding-left:20px">"from": "AmericanExpress",</div>
                    <div style="padding-left:20px">"msg": "Your OTP is 847291",</div>
                    <div style="padding-left:20px">"uuid": "msg-204953"</div>
                    <div>}</div>
                    <div style="margin-top:8px;color:#6ee7b7"># Response on success</div>
                    <div>{ "status": "ok", "otp": "847291", "number": "+525529001312" }</div>
                </div>
            </div>
        </div>
        <div class="card" style="margin-top:16px">
            <div class="card-header"><div class="card-title">Account Info</div></div>
            <div style="padding:20px">
                <div class="form-row">
                    <div class="form-group"><label>Username</label><input class="fly-input" value="${user?.username || ''}" readonly style="background:#f9fafb"></div>
                    <div class="form-group"><label>Role</label><input class="fly-input" value="${ROLE_LABELS[user?.role] || user?.role || ''}" readonly style="background:#f9fafb"></div>
                </div>
            </div>
        </div>`;
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
    }
}

// ========== PROVIDERS PAGE ==========
async function renderProvidersPage(container) {
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    const load = async () => {
        try {
            const data = await apiCall(`${API}/providers`);
            const rows = data.data || [];
            container.innerHTML = `
            <div class="card" style="margin-bottom:16px">
                <div class="card-header">
                    <div class="card-title">SMS Providers (${rows.length})</div>
                    <button class="fly-btn fly-btn-sm" id="add-pv-btn">${ICONS.plus} Add Provider</button>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Connection</th><th>SMS Received</th><th>Last Active</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${rows.length ? rows.map(p => `
                            <tr>
                                <td style="font-weight:600">${escapeHtml(p.name)}</td>
                                <td><span class="badge ${p.type === 'smpp' ? 'badge-warning' : 'badge-primary'}">${p.type.toUpperCase()}</span></td>
                                <td><span class="badge ${p.status === 'active' ? 'badge-success' : p.status === 'testing' ? 'badge-warning' : 'badge-danger'}">${p.status}</span></td>
                                <td style="font-size:12px;font-family:monospace;color:#6B7280">${p.type === 'http' ? (p.api_url || 'No URL set') : `${p.smpp_host || 'No host'}:${p.smpp_port || 2775}`}</td>
                                <td>${p.total_sms_received || 0}</td>
                                <td style="font-size:12px;color:#6B7280">${p.last_active_at ? formatDate(p.last_active_at) : '—'}</td>
                                <td class="actions-cell">
                                    <button class="action-btn" onclick="editProvider('${p.id}')">${ICONS.edit}</button>
                                    <button class="action-btn delete" onclick="deleteProvider('${p.id}','${escapeHtml(p.name)}')">${ICONS.trash}</button>
                                </td>
                            </tr>`).join('') : '<tr class="empty-row"><td colspan="7">No providers configured</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><div class="card-title">SMPP 3.4 Reference (deliver_sm)</div></div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
                    <div style="padding:20px;border-right:1px solid var(--border)">
                        <div style="font-size:12px;font-weight:700;color:#735DFF;text-transform:uppercase;margin-bottom:12px">Mandatory Fields</div>
                        <table class="fly-table" style="font-size:12px"><tbody>
                            <tr><td style="font-family:monospace;font-weight:600;padding:5px 12px">service_type</td><td style="color:#6B7280;padding:5px 12px">e.g. "itel"</td></tr>
                            <tr><td style="font-family:monospace;font-weight:600;padding:5px 12px">source_addr_ton</td><td style="color:#6B7280;padding:5px 12px">1 = INTERNATIONAL</td></tr>
                            <tr><td style="font-family:monospace;font-weight:600;padding:5px 12px">source_addr_npi</td><td style="color:#6B7280;padding:5px 12px">1 = ISDN</td></tr>
                            <tr><td style="font-family:monospace;font-weight:600;padding:5px 12px">destination_addr</td><td style="color:#6B7280;padding:5px 12px">+525529001312 (intl)</td></tr>
                            <tr><td style="font-family:monospace;font-weight:600;padding:5px 12px">dest_addr_ton</td><td style="color:#6B7280;padding:5px 12px">1 = INTERNATIONAL</td></tr>
                            <tr><td style="font-family:monospace;font-weight:600;padding:5px 12px">dest_addr_npi</td><td style="color:#6B7280;padding:5px 12px">1 = ISDN</td></tr>
                            <tr><td style="font-family:monospace;font-weight:600;padding:5px 12px">data_coding</td><td style="color:#6B7280;padding:5px 12px">0=GSM7 · 8=UCS2</td></tr>
                            <tr><td style="font-family:monospace;font-weight:600;padding:5px 12px">short_message</td><td style="color:#6B7280;padding:5px 12px">Message content</td></tr>
                        </tbody></table>
                    </div>
                    <div style="padding:20px">
                        <div style="font-size:12px;font-weight:700;color:#735DFF;text-transform:uppercase;margin-bottom:8px">Data Coding</div>
                        <div style="display:flex;gap:8px;margin-bottom:16px">
                            <span class="badge badge-primary">0 = GSM7 (English/ASCII)</span>
                            <span class="badge badge-warning">8 = UCS2 (Unicode)</span>
                        </div>
                        <div style="font-size:12px;font-weight:700;color:#735DFF;text-transform:uppercase;margin-bottom:8px">Sample PDU</div>
                        <pre style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;font-size:11px;line-height:1.7;overflow-x:auto">Error Code: 0
Service Type: itel
source TON: INTERNATIONAL (1)
source NPI: ISDN (1)
Destination: 525529001312
Dest TON: INTERNATIONAL (1)
Data Coding: 0 (GSM7)
Message: id:12469 dlvrd:001
stat:DELIVRD err:0
text:American Express OTP: 847291</pre>
                    </div>
                </div>
            </div>
            <div id="modal-root"></div>`;
            document.getElementById('add-pv-btn').onclick = () => showProviderModal();
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    };
    await load();
}

async function showProviderModal(existing = null) {
    const isEdit = !!existing;
    const root = _modal();
    const type = existing?.type || 'http';
    root.innerHTML = `
    <div class="modal-overlay" id="pv-overlay">
        <div class="modal" style="max-width:580px">
            <div class="modal-header"><div class="modal-title">${isEdit ? 'Edit Provider' : 'Add Provider'}</div><button class="modal-close" id="close-pv">${ICONS.x}</button></div>
            <div class="modal-body" style="max-height:70vh;overflow-y:auto">
                <div class="form-row">
                    <div class="form-group"><label>Name *</label><input class="fly-input" id="pv-name" value="${existing?.name || ''}" placeholder="My Provider"></div>
                    <div class="form-group"><label>Type</label>
                        <select class="fly-input" id="pv-type" onchange="togglePvFields()">
                            <option value="http" ${type === 'http' ? 'selected' : ''}>HTTP</option>
                            <option value="smpp" ${type === 'smpp' ? 'selected' : ''}>SMPP</option>
                        </select>
                    </div>
                </div>
                <div class="form-group"><label>Status</label>
                    <select class="fly-input" id="pv-status">
                        <option value="active" ${(existing?.status || 'active') === 'active' ? 'selected' : ''}>Active</option>
                        <option value="testing" ${existing?.status === 'testing' ? 'selected' : ''}>Testing</option>
                        <option value="inactive" ${existing?.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                    </select>
                </div>
                <div id="pv-http" style="display:${type !== 'smpp' ? 'block' : 'none'}">
                    <div style="font-size:12px;font-weight:700;color:#735DFF;text-transform:uppercase;margin:16px 0 10px">HTTP Settings</div>
                    <div class="form-group"><label>API URL</label><input class="fly-input" id="pv-url" value="${existing?.api_url || ''}" placeholder="https://provider.com/receive"></div>
                    <div class="form-row">
                        <div class="form-group"><label>API Token</label><input class="fly-input" id="pv-tok" value="${existing?.api_token || ''}"></div>
                        <div class="form-group"><label>Method</label><select class="fly-input" id="pv-mth"><option value="POST" ${(existing?.api_method || 'POST') === 'POST' ? 'selected' : ''}>POST</option><option value="GET" ${existing?.api_method === 'GET' ? 'selected' : ''}>GET</option></select></div>
                    </div>
                    <div style="font-size:12px;font-weight:600;color:#6B7280;margin-bottom:8px">Field Mapping</div>
                    <div class="form-row">
                        <div class="form-group"><label>Number field (to)</label><input class="fly-input" id="pv-fto" value="${existing?.field_to || 'to'}"></div>
                        <div class="form-group"><label>Sender field (from)</label><input class="fly-input" id="pv-ffr" value="${existing?.field_from || 'from'}"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Message field (msg)</label><input class="fly-input" id="pv-fmg" value="${existing?.field_msg || 'msg'}"></div>
                        <div class="form-group"><label>ID field (uuid)</label><input class="fly-input" id="pv-fid" value="${existing?.field_uuid || 'uuid'}"></div>
                    </div>
                </div>
                <div id="pv-smpp" style="display:${type === 'smpp' ? 'block' : 'none'}">
                    <div style="font-size:12px;font-weight:700;color:#735DFF;text-transform:uppercase;margin:16px 0 10px">SMPP 3.4 Settings</div>
                    <div class="form-row">
                        <div class="form-group"><label>Host</label><input class="fly-input" id="pv-sh" value="${existing?.smpp_host || ''}" placeholder="smpp.provider.com"></div>
                        <div class="form-group"><label>Port</label><input class="fly-input" id="pv-sp" type="number" value="${existing?.smpp_port || 2775}"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>System ID</label><input class="fly-input" id="pv-sid" value="${existing?.smpp_system_id || ''}"></div>
                        <div class="form-group"><label>Password</label><input class="fly-input" id="pv-spw" type="password"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>System Type</label><input class="fly-input" id="pv-sst" value="${existing?.smpp_system_type || ''}"></div>
                        <div class="form-group"><label>Service Type</label><input class="fly-input" id="pv-ssv" value="${existing?.smpp_service_type || ''}" placeholder="itel"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Source TON (1=INTL)</label><input class="fly-input" id="pv-ston" type="number" value="${existing?.smpp_source_ton ?? 1}"></div>
                        <div class="form-group"><label>Source NPI (1=ISDN)</label><input class="fly-input" id="pv-snpi" type="number" value="${existing?.smpp_source_npi ?? 1}"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Dest TON</label><input class="fly-input" id="pv-dton" type="number" value="${existing?.smpp_dest_ton ?? 1}"></div>
                        <div class="form-group"><label>Dest NPI</label><input class="fly-input" id="pv-dnpi" type="number" value="${existing?.smpp_dest_npi ?? 1}"></div>
                    </div>
                    <div class="form-group"><label>Data Coding</label>
                        <select class="fly-input" id="pv-dc">
                            <option value="0" ${(existing?.smpp_data_coding ?? 0) == 0 ? 'selected' : ''}>0 — GSM7 (English/ASCII)</option>
                            <option value="8" ${existing?.smpp_data_coding == 8 ? 'selected' : ''}>8 — UCS2 (Unicode/Arabic/Chinese)</option>
                        </select>
                    </div>
                </div>
                <div class="form-group" style="margin-top:12px"><label>Notes</label><textarea class="fly-input" id="pv-notes" rows="2" style="resize:vertical">${existing?.notes || ''}</textarea></div>
            </div>
            <div class="modal-footer">
                <button class="fly-btn fly-btn-secondary" id="cancel-pv">Cancel</button>
                <button class="fly-btn" id="save-pv">${isEdit ? 'Update' : 'Create'}</button>
            </div>
        </div>
    </div>`;
    const close = () => root.innerHTML = '';
    document.getElementById('close-pv').onclick = close;
    document.getElementById('cancel-pv').onclick = close;
    document.getElementById('pv-overlay').onclick = e => { if (e.target.id === 'pv-overlay') close(); };
    document.getElementById('save-pv').onclick = async () => {
        const t = document.getElementById('pv-type').value;
        const body = {
            name: document.getElementById('pv-name').value.trim(), type: t,
            status: document.getElementById('pv-status').value,
            notes: document.getElementById('pv-notes').value.trim() || null,
            apiUrl: document.getElementById('pv-url')?.value.trim() || null,
            apiToken: document.getElementById('pv-tok')?.value.trim() || null,
            apiMethod: document.getElementById('pv-mth')?.value || 'POST',
            fieldTo: document.getElementById('pv-fto')?.value.trim() || 'to',
            fieldFrom: document.getElementById('pv-ffr')?.value.trim() || 'from',
            fieldMsg: document.getElementById('pv-fmg')?.value.trim() || 'msg',
            fieldUuid: document.getElementById('pv-fid')?.value.trim() || 'uuid',
            smppHost: document.getElementById('pv-sh')?.value.trim() || null,
            smppPort: parseInt(document.getElementById('pv-sp')?.value) || 2775,
            smppSystemId: document.getElementById('pv-sid')?.value.trim() || null,
            smppPassword: document.getElementById('pv-spw')?.value || null,
            smppSystemType: document.getElementById('pv-sst')?.value.trim() || '',
            smppServiceType: document.getElementById('pv-ssv')?.value.trim() || null,
            smppSourceTon: parseInt(document.getElementById('pv-ston')?.value) ?? 1,
            smppSourceNpi: parseInt(document.getElementById('pv-snpi')?.value) ?? 1,
            smppDestTon: parseInt(document.getElementById('pv-dton')?.value) ?? 1,
            smppDestNpi: parseInt(document.getElementById('pv-dnpi')?.value) ?? 1,
            smppDataCoding: parseInt(document.getElementById('pv-dc')?.value) || 0,
        };
        if (!body.name) { showToast('Provider name is required', 'error'); return; }
        try {
            if (isEdit) await apiCall(`${API}/providers/${existing.id}`, { method: 'PUT', body: JSON.stringify(body) });
            else await apiCall(`${API}/providers`, { method: 'POST', body: JSON.stringify(body) });
            showToast(isEdit ? 'Provider updated' : 'Provider created', 'success');
            close(); renderDashboard();
        } catch (err) { showToast(err.message, 'error'); }
    };
}
window.togglePvFields = () => {
    const t = document.getElementById('pv-type').value;
    document.getElementById('pv-http').style.display = t === 'http' ? 'block' : 'none';
    document.getElementById('pv-smpp').style.display = t === 'smpp' ? 'block' : 'none';
};
window.editProvider = async (id) => {
    try { const { data } = await apiCall(`${API}/providers/${id}`); showProviderModal(data); } catch (err) { showToast(err.message, 'error'); }
};
window.deleteProvider = async (id, name) => {
    if (!confirm(`Delete provider "${name}"?`)) return;
    try { await apiCall(`${API}/providers/${id}`, { method: 'DELETE' }); showToast('Deleted', 'success'); renderDashboard(); } catch (err) { showToast(err.message, 'error'); }
};

// ========== BLACKLIST PAGE ==========
async function renderBlacklistPage(container) {
    const load = async () => {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await apiCall(`${API}/transactions/blacklist`);
            const rows = data.data || [];
            container.innerHTML = `
            <div class="card" style="margin-bottom:16px">
                <div class="card-header">
                    <div class="card-title">Blacklisted Apps (${rows.length})</div>
                    <button class="fly-btn fly-btn-sm" id="add-bl-btn">${ICONS.plus} Blacklist App</button>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>App Name</th><th>Match Pattern (regex)</th><th>Status</th><th>Description</th><th>Added</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${rows.length ? rows.map(a => `
                            <tr>
                                <td style="font-weight:600">${escapeHtml(a.app_name)}</td>
                                <td><code style="font-size:12px;background:#f3f4f6;padding:2px 8px;border-radius:4px">${a.pattern || '—'}</code></td>
                                <td><span class="badge ${a.is_active ? 'badge-danger' : 'badge-secondary'}">${a.is_active ? 'ENFORCED' : 'Disabled'}</span></td>
                                <td style="color:#6B7280;font-size:12px">${a.description || '—'}</td>
                                <td style="font-size:12px;color:#6B7280">${formatDate(a.created_at)}</td>
                                <td class="actions-cell">
                                    <button class="action-btn" onclick="toggleBL('${a.id}',${a.is_active})">${a.is_active ? 'Disable' : 'Enable'}</button>
                                    <button class="action-btn delete" onclick="deleteBL('${a.id}','${escapeHtml(a.app_name)}')">${ICONS.trash}</button>
                                </td>
                            </tr>`).join('') : '<tr class="empty-row"><td colspan="6">No blacklisted apps</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><div class="card-title">Auto-Suspension Rules</div></div>
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0">
                    ${[['1st','30 minutes','#fef9c3','#854d0e'],['2nd','1 hour','#ffedd5','#9a3412'],['3rd','24 hours','#fee2e2','#7f1d1d'],['4th+','Permanent Block','#1e1b4b','#c7d2fe']].map(([n,d,bg,col]) => `
                    <div style="background:${bg};padding:20px;text-align:center;border-right:1px solid #e5e7eb">
                        <div style="font-size:24px;font-weight:700;color:${col};margin-bottom:4px">${n}</div>
                        <div style="font-size:11px;font-weight:600;color:#6B7280;text-transform:uppercase;margin-bottom:8px">Violation</div>
                        <div style="font-size:14px;font-weight:600;color:${col}">${d}</div>
                    </div>`).join('')}
                </div>
            </div>
            <div id="modal-root"></div>`;
            document.getElementById('add-bl-btn').onclick = () => showBLModal(null, load);
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    };
    await load();
}

function showBLModal(existing, reload) {
    const root = _modal();
    root.innerHTML = `
    <div class="modal-overlay" id="bl-overlay">
        <div class="modal" style="max-width:420px">
            <div class="modal-header"><div class="modal-title">Blacklist App</div><button class="modal-close" id="close-bl">${ICONS.x}</button></div>
            <div class="modal-body">
                <div class="form-group"><label>App Name *</label><input class="fly-input" id="bl-name" value="${existing?.app_name || ''}" placeholder="e.g. Telegram"></div>
                <div class="form-group" style="margin-top:12px"><label>Match Pattern (regex, optional)</label><input class="fly-input" id="bl-pat" value="${existing?.pattern || ''}" placeholder="telegram|Telegram|TG"></div>
                <div class="form-group" style="margin-top:12px"><label>Description</label><input class="fly-input" id="bl-desc" value="${existing?.description || ''}" placeholder="Why this app is blocked"></div>
            </div>
            <div class="modal-footer">
                <button class="fly-btn fly-btn-secondary" id="cancel-bl">Cancel</button>
                <button class="fly-btn" id="save-bl" style="background:#ef4444;border-color:#ef4444">Blacklist</button>
            </div>
        </div>
    </div>`;
    const close = () => root.innerHTML = '';
    document.getElementById('close-bl').onclick = close;
    document.getElementById('cancel-bl').onclick = close;
    document.getElementById('bl-overlay').onclick = e => { if (e.target.id === 'bl-overlay') close(); };
    document.getElementById('save-bl').onclick = async () => {
        const n = document.getElementById('bl-name').value.trim();
        if (!n) { showToast('App name is required', 'error'); return; }
        try {
            await apiCall(`${API}/transactions/blacklist`, { method: 'POST', body: JSON.stringify({ appName: n, pattern: document.getElementById('bl-pat').value.trim() || null, description: document.getElementById('bl-desc').value.trim() || null }) });
            showToast('App blacklisted', 'success'); close(); if (reload) reload(); else renderDashboard();
        } catch (err) { showToast(err.message, 'error'); }
    };
}
window.toggleBL = async (id, isActive) => {
    try { await apiCall(`${API}/transactions/blacklist/${id}/toggle`, { method: 'PATCH' }); showToast(isActive ? 'Disabled' : 'Enabled', 'success'); renderDashboard(); } catch (err) { showToast(err.message, 'error'); }
};
window.deleteBL = async (id, name) => {
    if (!confirm(`Remove "${name}" from blacklist?`)) return;
    try { await apiCall(`${API}/transactions/blacklist/${id}`, { method: 'DELETE' }); showToast('Removed', 'success'); renderDashboard(); } catch (err) { showToast(err.message, 'error'); }
};

// ========== PRICING PAGE ==========
async function renderPricingPage(container) {
    const load = async () => {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const data = await apiCall(`${API}/transactions/pricing`);
            const rows = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Pricing Rules (${rows.length})</div>
                    <button class="fly-btn fly-btn-sm" id="add-pr-btn">${ICONS.plus} Add Rule</button>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Name</th><th>Scope</th><th>Role / Range</th><th>Rate ($)</th><th>Margin (%)</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${rows.length ? rows.map(r => `
                            <tr>
                                <td style="font-weight:600">${escapeHtml(r.name)}</td>
                                <td><span class="badge badge-primary">${r.scope}</span></td>
                                <td style="font-size:12px;color:#6B7280">${r.role || r.range_name || '—'}</td>
                                <td style="font-weight:600">$${parseFloat(r.rate || 0).toFixed(4)}</td>
                                <td>${r.profit_margin}%</td>
                                <td><span class="badge ${r.is_active ? 'badge-success' : 'badge-secondary'}">${r.is_active ? 'Active' : 'Inactive'}</span></td>
                                <td class="actions-cell">
                                    <button class="action-btn delete" onclick="deletePR('${r.id}')">${ICONS.trash}</button>
                                </td>
                            </tr>`).join('') : '<tr class="empty-row"><td colspan="7">No pricing rules configured</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
            <div id="modal-root"></div>`;
            document.getElementById('add-pr-btn').onclick = () => showPRModal(load);
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    };
    await load();
}

async function showPRModal(reload) {
    const root = _modal();
    let ranges = [];
    try { ranges = (await apiCall(`${API}/ranges?limit=100`)).data || []; } catch (e) {}
    root.innerHTML = `
    <div class="modal-overlay" id="pr-overlay">
        <div class="modal" style="max-width:440px">
            <div class="modal-header"><div class="modal-title">New Pricing Rule</div><button class="modal-close" id="close-pr">${ICONS.x}</button></div>
            <div class="modal-body">
                <div class="form-group"><label>Name *</label><input class="fly-input" id="pr-name"></div>
                <div class="form-row" style="margin-top:12px">
                    <div class="form-group"><label>Scope</label>
                        <select class="fly-input" id="pr-scope" onchange="togglePRScope()">
                            <option value="global">Global</option>
                            <option value="role">By Role</option>
                            <option value="range">By Range</option>
                        </select>
                    </div>
                    <div class="form-group" id="pr-role-grp" style="display:none"><label>Role</label>
                        <select class="fly-input" id="pr-role">
                            ${Object.entries(ROLE_LABELS).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" id="pr-range-grp" style="display:none"><label>Range</label>
                        <select class="fly-input" id="pr-range">
                            <option value="">— Select —</option>
                            ${ranges.map(r => `<option value="${r.name}">${escapeHtml(r.name)}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row" style="margin-top:12px">
                    <div class="form-group"><label>Rate ($)</label><input class="fly-input" id="pr-rate" type="number" step="0.0001" value="0.05"></div>
                    <div class="form-group"><label>Profit Margin (%)</label><input class="fly-input" id="pr-margin" type="number" value="50"></div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="fly-btn fly-btn-secondary" id="cancel-pr">Cancel</button>
                <button class="fly-btn" id="save-pr">Create Rule</button>
            </div>
        </div>
    </div>`;
    const close = () => root.innerHTML = '';
    document.getElementById('close-pr').onclick = close;
    document.getElementById('cancel-pr').onclick = close;
    document.getElementById('pr-overlay').onclick = e => { if (e.target.id === 'pr-overlay') close(); };
    document.getElementById('save-pr').onclick = async () => {
        const scope = document.getElementById('pr-scope').value;
        const body = { name: document.getElementById('pr-name').value.trim(), scope, role: scope === 'role' ? document.getElementById('pr-role')?.value : null, rangeName: scope === 'range' ? document.getElementById('pr-range')?.value : null, rate: parseFloat(document.getElementById('pr-rate').value) || 0, profitMargin: parseFloat(document.getElementById('pr-margin').value) || 50 };
        if (!body.name) { showToast('Name required', 'error'); return; }
        try {
            await apiCall(`${API}/transactions/pricing`, { method: 'POST', body: JSON.stringify(body) });
            showToast('Rule created', 'success'); close(); if (reload) reload(); else renderDashboard();
        } catch (err) { showToast(err.message, 'error'); }
    };
}
window.togglePRScope = () => {
    const s = document.getElementById('pr-scope').value;
    document.getElementById('pr-role-grp').style.display = s === 'role' ? 'block' : 'none';
    document.getElementById('pr-range-grp').style.display = s === 'range' ? 'block' : 'none';
};
window.deletePR = async (id) => {
    if (!confirm('Delete this pricing rule?')) return;
    try { await apiCall(`${API}/transactions/pricing/${id}`, { method: 'DELETE' }); showToast('Deleted', 'success'); renderDashboard(); } catch (err) { showToast(err.message, 'error'); }
};

// ========== TRANSACTIONS PAGE ==========
async function renderTransactionsPage(container) {
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    let txType = '', days = 30;
    const load = async () => {
        try {
            const data = await apiCall(`${API}/transactions/ledger?days=${days}&limit=200${txType ? '&tx_type=' + txType : ''}`);
            const rows = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Transaction Ledger (${data.total || rows.length})</div>
                    <button class="fly-btn fly-btn-sm fly-btn-secondary" onclick="exportLedger(${days})">Export CSV</button>
                </div>
                <div class="filter-bar">
                    <select class="filter-select" id="tx-type">
                        <option value="">All Types</option>
                        ${['credit','debit','transfer_in','transfer_out','payout','adjustment'].map(t => `<option value="${t}" ${txType === t ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                    <select class="filter-select" id="tx-days">
                        ${[[7,'Last 7 days'],[30,'Last 30 days'],[90,'Last 90 days']].map(([d,l]) => `<option value="${d}" ${days === d ? 'selected' : ''}>${l}</option>`).join('')}
                    </select>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>User</th><th>Type</th><th>Amount</th><th>Balance Before</th><th>Balance After</th><th>Note</th><th>Date</th></tr></thead>
                        <tbody>
                            ${rows.length ? rows.map(t => `
                            <tr>
                                <td style="font-weight:600">${escapeHtml(t.username)}</td>
                                <td><span class="badge ${['credit','transfer_in'].includes(t.tx_type) ? 'badge-success' : ['debit','transfer_out','payout'].includes(t.tx_type) ? 'badge-danger' : 'badge-warning'}">${t.tx_type}</span></td>
                                <td style="font-weight:700;color:${t.amount >= 0 ? '#16a34a' : '#ef4444'}">${t.amount >= 0 ? '+' : ''}$${Math.abs(t.amount).toFixed(4)}</td>
                                <td style="font-size:12px;color:#6B7280">$${(t.balance_before || 0).toFixed(4)}</td>
                                <td style="font-size:12px">$${(t.balance_after || 0).toFixed(4)}</td>
                                <td style="font-size:12px;color:#6B7280;max-width:160px;overflow:hidden;text-overflow:ellipsis">${t.note || '—'}</td>
                                <td style="font-size:12px;color:#6B7280">${formatDate(t.created_at)}</td>
                            </tr>`).join('') : '<tr class="empty-row"><td colspan="7">No transactions found</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>`;
            document.getElementById('tx-type').onchange = e => { txType = e.target.value; load(); };
            document.getElementById('tx-days').onchange = e => { days = parseInt(e.target.value); load(); };
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    };
    await load();
}
window.exportLedger = async (days = 30) => {
    try {
        const r = await fetch(`${API}/transactions/ledger/export?days=${days}`, { headers: { Authorization: `Bearer ${getToken()}` } });
        const b = await r.blob();
        const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `ledger_${days}d.csv`; a.click();
    } catch (err) { showToast('Export failed', 'error'); }
};

// ========== AUDIT LOGS PAGE ==========
async function renderAuditLogsPage(container) {
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    let actor = '', action = '', days = 7;
    const load = async () => {
        try {
            let url = `${API}/transactions/audit-logs?days=${days}&limit=200`;
            if (actor) url += `&actor=${encodeURIComponent(actor)}`;
            if (action) url += `&action=${encodeURIComponent(action)}`;
            const data = await apiCall(url);
            const rows = data.data || [];
            container.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Audit Logs (${data.total || rows.length})</div></div>
                <div class="filter-bar">
                    <input type="text" class="search-input" placeholder="Filter by actor…" id="al-actor" value="${actor}" style="max-width:160px">
                    <input type="text" class="search-input" placeholder="Filter by action…" id="al-action" value="${action}" style="max-width:160px">
                    <select class="filter-select" id="al-days">
                        <option value="1" ${days === 1 ? 'selected' : ''}>Last 24h</option>
                        <option value="7" ${days === 7 ? 'selected' : ''}>Last 7 days</option>
                        <option value="30" ${days === 30 ? 'selected' : ''}>Last 30 days</option>
                    </select>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>Actor</th><th>Action</th><th>Target</th><th>Detail</th><th>IP</th><th>Time</th></tr></thead>
                        <tbody>
                            ${rows.length ? rows.map(a => `
                            <tr>
                                <td style="font-weight:600">${a.actor || 'system'}</td>
                                <td><span class="badge badge-primary" style="font-family:monospace;font-size:11px">${a.action}</span></td>
                                <td style="font-size:12px;color:#6B7280">${(a.target_type || '') + (a.target_id ? ' #' + a.target_id : '')}</td>
                                <td style="font-size:12px;color:#6B7280;max-width:200px;overflow:hidden;text-overflow:ellipsis">${a.detail || '—'}</td>
                                <td style="font-size:12px;font-family:monospace;color:#6B7280">${a.ip || '—'}</td>
                                <td style="font-size:12px;color:#6B7280">${formatDate(a.created_at)}</td>
                            </tr>`).join('') : '<tr class="empty-row"><td colspan="6">No audit logs found</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>`;
            document.getElementById('al-actor').oninput = debounce(e => { actor = e.target.value; load(); }, 400);
            document.getElementById('al-action').oninput = debounce(e => { action = e.target.value; load(); }, 400);
            document.getElementById('al-days').onchange = e => { days = parseInt(e.target.value); load(); };
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    };
    await load();
}

// ========== SUPPORT TICKETS PAGE ==========
async function renderSupportPage(container) {
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    let statusFilter = '', priorityFilter = '';
    const load = async () => {
        try {
            let url = `${API}/transactions/tickets`;
            const params = [];
            if (statusFilter) params.push(`status=${statusFilter}`);
            if (priorityFilter) params.push(`priority=${priorityFilter}`);
            if (params.length) url += '?' + params.join('&');
            const data = await apiCall(url);
            const rows = data.data || [];
            const role = user?.role || 'admin';
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Support Tickets (${rows.length})</div>
                    <button class="fly-btn fly-btn-sm" id="new-tk-btn">${ICONS.plus} New Ticket</button>
                </div>
                <div class="filter-bar">
                    <select class="filter-select" id="tk-status">
                        <option value="">All Status</option>
                        ${['open','in_progress','resolved','closed'].map(s => `<option value="${s}" ${statusFilter === s ? 'selected' : ''}>${s.replace('_', ' ')}</option>`).join('')}
                    </select>
                    <select class="filter-select" id="tk-priority">
                        <option value="">All Priority</option>
                        ${['urgent','high','medium','low'].map(p => `<option value="${p}" ${priorityFilter === p ? 'selected' : ''}>${p}</option>`).join('')}
                    </select>
                </div>
                <div class="table-wrapper">
                    <table class="fly-table">
                        <thead><tr><th>User</th><th>Subject</th><th>Priority</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${rows.length ? rows.map(t => `
                            <tr>
                                <td style="font-weight:600">${escapeHtml(t.username)}</td>
                                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">${escapeHtml(t.subject)}</td>
                                <td><span class="badge ${t.priority === 'urgent' ? 'badge-danger' : t.priority === 'high' ? 'badge-warning' : t.priority === 'medium' ? 'badge-primary' : 'badge-secondary'}">${t.priority}</span></td>
                                <td><span class="badge ${t.status === 'open' ? 'badge-warning' : t.status === 'resolved' ? 'badge-success' : t.status === 'in_progress' ? 'badge-primary' : 'badge-secondary'}">${t.status.replace('_', ' ')}</span></td>
                                <td style="font-size:12px;color:#6B7280">${formatDate(t.created_at)}</td>
                                <td class="actions-cell">
                                    ${['admin','manager'].includes(role) && t.status !== 'closed' ? `<button class="action-btn" onclick="replyTicket('${t.id}')">Reply</button>` : ''}
                                    ${['admin','manager'].includes(role) && t.status !== 'closed' ? `<button class="action-btn" onclick="closeTK('${t.id}')">Close</button>` : ''}
                                </td>
                            </tr>`).join('') : '<tr class="empty-row"><td colspan="6">No tickets found</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
            <div id="modal-root"></div>`;
            document.getElementById('tk-status').onchange = e => { statusFilter = e.target.value; load(); };
            document.getElementById('tk-priority').onchange = e => { priorityFilter = e.target.value; load(); };
            document.getElementById('new-tk-btn').onclick = () => showTicketModal(null, false, load);
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    };
    await load();
}

function showTicketModal(existing, isReply, reload) {
    const root = _modal();
    root.innerHTML = `
    <div class="modal-overlay" id="tk-overlay">
        <div class="modal" style="max-width:460px">
            <div class="modal-header"><div class="modal-title">${isReply ? 'Reply to Ticket' : 'New Support Ticket'}</div><button class="modal-close" id="close-tk">${ICONS.x}</button></div>
            <div class="modal-body">
                ${existing ? `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin-bottom:16px"><div style="font-weight:700;margin-bottom:6px">${escapeHtml(existing.subject)}</div><div style="font-size:13px;color:#6B7280">${escapeHtml(existing.message)}</div>${existing.reply ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid #e5e7eb"><div style="font-size:12px;font-weight:600;color:#735DFF;margin-bottom:4px">Previous Reply:</div><div style="font-size:13px">${escapeHtml(existing.reply)}</div></div>` : ''}</div>` : ''}
                ${!isReply ? `
                <div class="form-group"><label>Subject *</label><input class="fly-input" id="tk-subject"></div>
                <div class="form-group" style="margin-top:12px"><label>Priority</label>
                    <select class="fly-input" id="tk-priority">
                        <option value="low">Low</option><option value="medium" selected>Medium</option>
                        <option value="high">High</option><option value="urgent">Urgent</option>
                    </select>
                </div>
                <div class="form-group" style="margin-top:12px"><label>Message *</label><textarea class="fly-input" id="tk-message" rows="4" style="resize:vertical"></textarea></div>
                ` : `
                <div class="form-group"><label>Reply *</label><textarea class="fly-input" id="tk-reply" rows="4" style="resize:vertical"></textarea></div>
                <div class="form-group" style="margin-top:12px"><label>Update Status</label>
                    <select class="fly-input" id="tk-status">
                        <option value="open">Open</option><option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option><option value="closed">Closed</option>
                    </select>
                </div>`}
            </div>
            <div class="modal-footer">
                <button class="fly-btn fly-btn-secondary" id="cancel-tk">Cancel</button>
                <button class="fly-btn" id="save-tk">${isReply ? 'Send Reply' : 'Create Ticket'}</button>
            </div>
        </div>
    </div>`;
    const close = () => root.innerHTML = '';
    document.getElementById('close-tk').onclick = close;
    document.getElementById('cancel-tk').onclick = close;
    document.getElementById('tk-overlay').onclick = e => { if (e.target.id === 'tk-overlay') close(); };
    document.getElementById('save-tk').onclick = async () => {
        try {
            if (isReply) {
                const reply = document.getElementById('tk-reply').value.trim();
                if (!reply) { showToast('Reply is required', 'error'); return; }
                await apiCall(`${API}/transactions/tickets/${existing.id}`, { method: 'PUT', body: JSON.stringify({ reply, status: document.getElementById('tk-status').value }) });
                showToast('Reply sent', 'success');
            } else {
                const subject = document.getElementById('tk-subject').value.trim();
                const message = document.getElementById('tk-message').value.trim();
                if (!subject || !message) { showToast('Subject and message are required', 'error'); return; }
                await apiCall(`${API}/transactions/tickets`, { method: 'POST', body: JSON.stringify({ subject, message, priority: document.getElementById('tk-priority').value }) });
                showToast('Ticket created', 'success');
            }
            close(); if (reload) reload(); else renderDashboard();
        } catch (err) { showToast(err.message, 'error'); }
    };
}

window.replyTicket = async (id) => {
    try { const rows = (await apiCall(`${API}/transactions/tickets`)).data || []; const t = rows.find(x => x.id === id); if (t) showTicketModal(t, true, () => renderDashboard()); } catch (err) { showToast(err.message, 'error'); }
};
window.closeTK = async (id) => {
    try { await apiCall(`${API}/transactions/tickets/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'closed' }) }); showToast('Ticket closed', 'success'); renderDashboard(); } catch (err) { showToast(err.message, 'error'); }
};

// ========== NUMBERS PAGE OVERRIDE (add Bulk Import button) ==========
const _baseRenderNumbers = renderNumbersPage;
renderNumbersPage = async (container) => {
    await _baseRenderNumbers(container);
    const hdr = container.querySelector('.card-header');
    if (hdr && !hdr.querySelector('#bulk-import-btn')) {
        const btn = document.createElement('button');
        btn.className = 'fly-btn fly-btn-sm fly-btn-secondary';
        btn.id = 'bulk-import-btn';
        btn.innerHTML = `${ICONS.plus} Bulk Import TXT`;
        btn.onclick = () => showBulkImportModal(container);
        hdr.appendChild(btn);
    }
};

// ========== SHARED MODAL ROOT HELPER ==========
function _modal() {
    let r = document.getElementById('modal-root');
    if (!r) {
        r = document.createElement('div'); r.id = 'modal-root'; document.body.appendChild(r);
    }
    return r;
}

// ========== INIT ==========
init();
