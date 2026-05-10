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
const NAV_ITEMS = [
    { key: 'dashboard', label: 'Dashboard', icon: ICONS.dashboard },
    { key: 'numbers', label: 'Numbers', icon: ICONS.phone },
    { key: 'ranges', label: 'Ranges', icon: ICONS.layers },
    { key: 'sms-reports', label: 'SMS Reports', icon: ICONS.sms },
    { key: 'users', label: 'Users', icon: ICONS.users },
    { key: 'settings', label: 'Settings', icon: ICONS.settings },
];

const PAGE_TITLES = { 'dashboard': 'Dashboard', 'numbers': 'Numbers', 'ranges': 'Ranges', 'sms-reports': 'SMS Reports', 'users': 'Users', 'settings': 'Settings' };

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
    const navItems = NAV_ITEMS.map(item => `
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
        case 'dashboard': renderDashboardPage(content); break;
        case 'numbers': renderNumbersPage(content); break;
        case 'ranges': renderRangesPage(content); break;
        case 'sms-reports': renderSmsReportsPage(content); break;
        case 'users': renderUsersPage(content); break;
        case 'settings': renderSettingsPage(content); break;
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
                        <thead><tr><th>Username</th><th>Full Name</th><th>Email</th><th>Role</th><th>Status</th><th>Balance</th><th>Last Login</th><th>Actions</th></tr></thead>
                        <tbody id="users-tbody">
                            ${rows.length ? rows.map(u => `
                                <tr>
                                    <td style="font-weight:600">${escapeHtml(u.username)}</td>
                                    <td>${u.full_name || '-'}</td>
                                    <td>${u.email || '-'}</td>
                                    <td><span class="badge badge-primary">${u.role}</span></td>
                                    <td><span class="badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}">${u.status}</span></td>
                                    <td>$${(u.balance || 0).toFixed(2)}</td>
                                    <td style="font-size:12px;color:#6B7280">${u.last_login ? formatDate(u.last_login) : '-'}</td>
                                    <td class="actions-cell">
                                        <button class="action-btn" onclick="editUser('${u.id}')">${ICONS.edit}</button>
                                        <button class="action-btn delete" onclick="deleteUser('${u.id}','${escapeHtml(u.username)}')">${ICONS.trash}</button>
                                    </td>
                                </tr>
                            `).join('') : '<tr class="empty-row"><td colspan="8">No users found</td></tr>'}
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
                    <div class="form-group"><label>Username *</label><input class="fly-input" id="usr-username" value="${existing?.username || ''}" ${isEdit ? 'readonly' : ''}></div>
                    <div class="form-group"><label>${isEdit ? 'New Password' : 'Password *'}</label><input class="fly-input" id="usr-password" type="password" placeholder="${isEdit ? 'Leave blank to keep' : ''}"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Full Name</label><input class="fly-input" id="usr-fullName" value="${existing?.full_name || ''}"></div>
                    <div class="form-group"><label>Email</label><input class="fly-input" id="usr-email" type="email" value="${existing?.email || ''}"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Role</label><select class="fly-input" id="usr-role"><option value="admin" ${existing?.role === 'admin' ? 'selected' : ''}>Admin</option><option value="manager" ${existing?.role === 'manager' ? 'selected' : ''}>Manager</option><option value="reseller" ${existing?.role === 'reseller' ? 'selected' : ''}>Reseller</option><option value="sub_reseller" ${existing?.role === 'sub_reseller' ? 'selected' : ''}>Sub Reseller</option></select></div>
                    <div class="form-group"><label>Status</label><select class="fly-input" id="usr-status"><option value="active" ${existing?.status === 'active' ? 'selected' : ''}>Active</option><option value="blocked" ${existing?.status === 'blocked' ? 'selected' : ''}>Blocked</option></select></div>
                </div>
            </div>
            <div class="modal-footer"><button class="fly-btn fly-btn-secondary" id="cancel-modal">Cancel</button><button class="fly-btn" id="save-modal">${isEdit ? 'Update' : 'Create'}</button></div>
        </div>
    </div>`;

    const close = () => root.innerHTML = '';
    document.getElementById('close-modal').onclick = close;
    document.getElementById('cancel-modal').onclick = close;
    document.getElementById('user-modal-overlay').onclick = (e) => { if (e.target.id === 'user-modal-overlay') close(); };

    document.getElementById('save-modal').onclick = async () => {
        const body = {
            username: document.getElementById('usr-username').value.trim(),
            fullName: document.getElementById('usr-fullName').value.trim() || null,
            email: document.getElementById('usr-email').value.trim() || null,
            role: document.getElementById('usr-role').value,
            status: document.getElementById('usr-status').value,
        };
        const pw = document.getElementById('usr-password').value;
        if (pw) body.password = pw;
        if (!body.username && !isEdit) { showToast('Username is required', 'error'); return; }
        if (!body.password && !isEdit) { showToast('Password is required', 'error'); return; }
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
