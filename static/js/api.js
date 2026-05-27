const API = '/api';

const api = {
    getToken() { return localStorage.getItem('token'); },
    getUser() {
        try { return JSON.parse(localStorage.getItem('user')); }
        catch { return null; }
    },
    async call(endpoint, options = {}) {
        const token = this.getToken();
        const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers };
        const res = await fetch(endpoint, { ...options, headers });
        if (res.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (!location.pathname.includes('/login')) {
                location.reload();
            }
            throw new Error('Unauthorized');
        }
        if (!res.ok) {
            let msg = 'Request failed';
            try {
                const j = await res.json();
                if (Array.isArray(j.detail)) {
                    msg = j.detail.map(d => `${d.loc.join('.')}: ${d.msg}`).join(' | ');
                } else {
                    msg = j.error || j.detail || msg;
                }
            } catch {}
            throw new Error(msg);
        }
        return res.json();
    }
};

window.api = api;
