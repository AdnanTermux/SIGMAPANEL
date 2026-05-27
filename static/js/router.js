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
        this.navigateTo(path, false);
    },

    navigateTo(page, pushState = true) {
        this.currentPage = page;
        if (pushState) {
            window.history.pushState({}, '', `/${page}`);
        }

        if (typeof window.renderDashboardShell === 'function') {
            window.renderDashboardShell();
        } else {
            console.error('renderDashboardShell not found');
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
