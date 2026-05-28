const auth = {
    async login(username, password, captchaAnswer, userCaptcha) {
        if (!username || !password) throw new Error('Username and password are required');
        if (parseInt(userCaptcha) !== captchaAnswer) throw new Error('Incorrect captcha answer');

        const data = await window.api.call('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        return data.user;
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
    },

    getUser() {
        return window.api.getUser();
    },

    isLoggedIn() {
        return !!localStorage.getItem('token');
    },

    async signup(payload) {
        return window.api.call('/api/auth/signup', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    renderLogin() {
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
                            <div style="margin-top:16px; text-align:center">
                                <a href="/signup" id="go-to-signup" style="color:var(--primary); font-weight:600; text-decoration:none; font-size:14px">Don't have an account? Sign Up</a>
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
        this._captchaAnswer = answer;
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

            const btn = document.getElementById('login-btn');
            btn.disabled = true;
            btn.textContent = 'Signing In...';

            try {
                await this.login(username, password, this._captchaAnswer, captchaVal);
                window.ui.showToast('Welcome back!', 'success');
                window.router.navigateTo('dashboard');
            } catch (err) {
                errorEl.textContent = err.message;
                errorEl.style.display = 'block';
                btn.disabled = false;
                btn.textContent = 'Sign-In';
            }
        });

        document.getElementById('go-to-signup').addEventListener('click', (e) => {
            e.preventDefault();
            this.renderSignup().catch(err => {
                console.error('Signup render failed:', err);
                window.ui.showToast('Failed to load signup page', 'error');
            });
        });
    },

    async renderSignup() {
        // Fetch signup settings
        let settings = { enabled: 'true', whatsapp: '+923000767749', teams: 'adnanman2026@outlook.com', telegram: '@sigmapanel' };
        try {
            const res = await window.api.call('/api/settings?key=signup_enabled', { timeout: 5000 });
            if (res.data && res.data.length) settings.enabled = res.data[0].setting_value;

            const contactRes = await window.api.call('/api/settings', { timeout: 5000 });
            contactRes.data.forEach(s => {
                if (s.setting_key === 'contact_whatsapp') settings.whatsapp = s.setting_value;
                if (s.setting_key === 'contact_teams') settings.teams = s.setting_value;
                if (s.setting_key === 'contact_telegram') settings.telegram = s.setting_value;
            });
        } catch (e) {
            console.warn('Could not fetch settings for signup, using defaults', e);
        }

        if (settings.enabled === 'false') {
            document.getElementById('app').innerHTML = `
            <div class="auth-page">
                <div class="auth-card" style="max-width:450px; flex-direction:column">
                    <div style="padding:40px; text-align:center">
                        <div style="font-size:48px; color:var(--danger); margin-bottom:16px">${ICONS.ban}</div>
                        <h1 style="font-size:22px; font-weight:700; margin-bottom:8px">Registration Closed</h1>
                        <p style="color:var(--text-secondary); margin-bottom:32px; line-height:1.5">Public signup is currently restricted. Please reach out to our team for manual onboarding.</p>

                        <div style="display:grid; gap:12px; text-align:left">
                            <div style="background:var(--bg-page); padding:12px 16px; border-radius:8px; border:1px solid var(--border)">
                                <div style="font-size:11px; text-transform:uppercase; color:var(--text-secondary); font-weight:700; margin-bottom:4px">WhatsApp</div>
                                <div style="font-family:monospace; font-weight:600">${settings.whatsapp}</div>
                            </div>
                            <div style="background:var(--bg-page); padding:12px 16px; border-radius:8px; border:1px solid var(--border)">
                                <div style="font-size:11px; text-transform:uppercase; color:var(--text-secondary); font-weight:700; margin-bottom:4px">Microsoft Teams</div>
                                <div style="font-family:monospace; font-weight:600">${settings.teams}</div>
                            </div>
                            <div style="background:var(--bg-page); padding:12px 16px; border-radius:8px; border:1px solid var(--border)">
                                <div style="font-size:11px; text-transform:uppercase; color:var(--text-secondary); font-weight:700; margin-bottom:4px">Telegram</div>
                                <div style="font-family:monospace; font-weight:600">${settings.telegram}</div>
                            </div>
                        </div>

                        <button class="fly-btn" style="margin-top:32px; width:100%" onclick="window.auth.renderLogin()">Return to Sign In</button>
                    </div>
                </div>
            </div>`;
            return;
        }

        document.getElementById('app').innerHTML = `
        <div class="auth-page">
            <div class="auth-card" style="max-width:600px">
                <div class="auth-form" style="padding:2rem">
                    <div class="auth-form-inner">
                        <h1 style="text-align:center;font-size:24px;font-weight:600;color:#222F36;margin-bottom:4px">Create Account</h1>
                        <p style="text-align:center;color:#6B7280;font-size:14px;margin-bottom:24px">Join SIGMAPANEL infrastructure</p>
                        <div id="signup-error" style="display:none;margin-bottom:16px;padding:12px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;color:#ef4444;font-size:13px;font-weight:500"></div>
                        <form id="signup-form">
                            <div class="form-row">
                                <div class="form-group"><label class="fly-label">User Name *</label><input type="text" id="s-username" class="fly-input" required></div>
                                <div class="form-group"><label class="fly-label">Email *</label><input type="email" id="s-email" class="fly-input" required></div>
                            </div>
                            <div class="form-row">
                                <div class="form-group"><label class="fly-label">Password *</label><input type="password" id="s-password" class="fly-input" required></div>
                                <div class="form-group"><label class="fly-label">Full Name</label><input type="text" id="s-fullname" class="fly-input"></div>
                            </div>
                            <div class="form-row">
                                <div class="form-group"><label class="fly-label">Phone</label><input type="text" id="s-phone" class="fly-input"></div>
                                <div class="form-group"><label class="fly-label">Country</label><input type="text" id="s-country" class="fly-input"></div>
                            </div>
                            <div class="form-group">
                                <label class="fly-label">Profession</label>
                                <select id="s-profession" class="fly-input">
                                    <option value="solo">Solo Worker</option>
                                    <option value="team">Team Owner</option>
                                    <option value="programmer">Programmer</option>
                                    <option value="marketer">Marketer</option>
                                    <option value="agency">Agency</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="fly-label">Payment Method (Preferred)</label>
                                <select id="s-payment" class="fly-input">
                                    <option value="binance">Binance Pay</option>
                                    <option value="usdt">USDT TRC20</option>
                                </select>
                            </div>
                            <div class="form-group"><label class="fly-label">Binance UID or USDT Address</label><input type="text" id="s-pay-detail" class="fly-input"></div>

                            <div style="margin-top:20px">
                                <button type="submit" class="fly-btn" style="width:100%" id="signup-btn">Register</button>
                            </div>
                            <div style="margin-top:16px; text-align:center">
                                <a href="/login" id="go-to-login" style="color:var(--primary); font-weight:600; text-decoration:none; font-size:14px">Already have an account? Sign In</a>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>`;

        document.getElementById('go-to-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.renderLogin();
        });

        document.getElementById('signup-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('signup-btn');
            btn.disabled = true;
            btn.textContent = 'Processing...';

            const payload = {
                username: document.getElementById('s-username').value,
                email: document.getElementById('s-email').value,
                password: document.getElementById('s-password').value,
                fullName: document.getElementById('s-fullname').value,
                phone: document.getElementById('s-phone').value,
                country: document.getElementById('s-country').value,
                profession: document.getElementById('s-profession').value,
                paymentMethod: document.getElementById('s-payment').value,
                binanceUid: document.getElementById('s-payment').value === 'binance' ? document.getElementById('s-pay-detail').value : null,
                usdtAddress: document.getElementById('s-payment').value === 'usdt' ? document.getElementById('s-pay-detail').value : null
            };

            try {
                const res = await this.signup(payload);
                window.ui.showToast(res.message, 'success');
                this.renderLogin();
            } catch (err) {
                const errEl = document.getElementById('signup-error');
                errEl.textContent = err.message;
                errEl.style.display = 'block';
                btn.disabled = false;
                btn.textContent = 'Register';
            }
        });
    }
};

window.auth = auth;
