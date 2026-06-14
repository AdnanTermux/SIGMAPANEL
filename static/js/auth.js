const auth = {
    getToken() { return localStorage.getItem('token'); },
    getUser() { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } },
    isLoggedIn() { return !!this.getToken(); },

    async login(username, password) {
        const res = await window.api.call('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        return res;
    },

    async signup(payload) {
        return await window.api.call('/api/auth/signup', { method: 'POST', body: JSON.stringify(payload) });
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        location.reload();
    },

    renderLogin() {
        document.getElementById('app').innerHTML = `
        <div style="min-height:100vh; display:flex; align-items:center; justify-content:center; background:rgba(115,93,255,0.05)">
            <div class="card" style="width:100%; max-width:400px; padding:40px">
                <div style="text-align:center; margin-bottom:32px">
                    <h1 style="color:var(--primary)">SIGMAPANEL</h1>
                    <p style="color:var(--text-secondary)">Infrastructure Access</p>
                </div>
                <div id="login-error" style="display:none; color:var(--danger); margin-bottom:16px; font-size:13px"></div>
                <form id="login-form">
                    <div class="form-group"><label>Username</label><input type="text" id="l-user" class="fly-input" required></div>
                    <div class="form-group"><label>Password</label><input type="password" id="l-pass" class="fly-input" required></div>
                    <button type="submit" class="fly-btn" style="width:100%">Sign In</button>
                </form>
                <div style="margin-top:24px; text-align:center"><a href="/signup" id="to-signup" style="font-size:14px; color:var(--primary)">Create Account</a></div>
            </div>
        </div>`;

        document.getElementById('login-form').onsubmit = async (e) => {
            e.preventDefault();
            const err = document.getElementById('login-error');
            try {
                await this.login(document.getElementById('l-user').value, document.getElementById('l-pass').value);
                window.renderDashboardShell();
            } catch (e) { err.textContent = e.message; err.style.display = 'block'; }
        };

        document.getElementById('to-signup').onclick = (e) => { e.preventDefault(); this.renderSignup(); };
    },

    renderSignup() {
        document.getElementById('app').innerHTML = `
        <div style="min-height:100vh; display:flex; align-items:center; justify-content:center; background:rgba(115,93,255,0.05)">
            <div class="card" style="width:100%; max-width:500px; padding:40px">
                <h2 style="text-align:center; margin-bottom:24px">Join SIGMAPANEL</h2>
                <div id="signup-error" style="display:none; color:var(--danger); margin-bottom:16px"></div>
                <form id="signup-form">
                    <div class="form-row"><div class="form-group"><label>User ID</label><input type="text" id="s-user" class="fly-input" required></div><div class="form-group"><label>Email</label><input type="email" id="s-email" class="fly-input" required></div></div>
                    <div class="form-group"><label>Security PIN / Password</label><input type="password" id="s-pass" class="fly-input" required></div>
                    <button type="submit" class="fly-btn" style="width:100%">Submit Registration</button>
                </form>
                <div style="margin-top:20px; text-align:center"><a href="/login" id="to-login" style="color:var(--primary)">Back to Login</a></div>
            </div>
        </div>`;

        document.getElementById('signup-form').onsubmit = async (e) => {
            e.preventDefault();
            try {
                await this.signup({ username: document.getElementById('s-user').value, email: document.getElementById('s-email').value, password: document.getElementById('s-pass').value });
                window.ui.showToast('Request submitted', 'success');
                this.renderLogin();
            } catch (e) { const err = document.getElementById('signup-error'); err.textContent = e.message; err.style.display = 'block'; }
        };

        document.getElementById('to-login').onclick = (e) => { e.preventDefault(); this.renderLogin(); };
    }
};
window.auth = auth;
