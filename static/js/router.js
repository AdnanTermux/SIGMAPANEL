const router = {
    routes: {},
    currentPage: 'dashboard',
    currentGroup: null,

    init() {
        window.addEventListener('popstate', () => {
            this.handleRoute();
        });
        this.handleRoute();
    },

    handleRoute() {
        const path = window.location.pathname.replace(/^\//, '') || 'dashboard';
        // Only navigate if we are already logged in or going to a public route
        // For this SPA, most routes require login except maybe login/signup if they were separate paths
        // But here we handle everything via renderDashboardShell
        this.navigateTo(path, false);
    },

    navigateTo(page, pushState = true) {
        this.currentPage = page;
        if (pushState) {
            const url = page === 'dashboard' ? '/' : `/${page}`;
            window.history.pushState({}, '', url);
        }

        if (typeof window.renderDashboardShell === 'function') {
            window.renderDashboardShell();
        } else {
            // If shell isn't ready, we might be in the middle of initialization
            console.warn('renderDashboardShell not yet available');
        }
    },

    resolvePage(contentContainer) {
        const page = this.currentPage;

        // Find if it's a known route
        if (this.routes[page]) {
            this.routes[page](contentContainer);
        } else {
            // Default or 404
            if (this.routes['dashboard']) {
                this.routes['dashboard'](contentContainer);
            } else {
                contentContainer.innerHTML = `<div class="empty-state"><h3>404</h3><p>Page ${page} not found</p></div>`;
            }
        }
    },

    addRoute(path, handler) {
        this.routes[path] = handler;
    }
};

window.router = router;
