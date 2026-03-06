/**
 * admin-guard.js — Admin-only Route Guard
 * Place as the FIRST script on admin-only pages (e.g. dashboard.html).
 * Redirects non-authenticated and non-admin users to their home page.
 */
(function () {
    const token = localStorage.getItem("token");
    const currentPage = window.location.pathname.split("/").pop() || "";

    // 1. Must be logged in
    if (!token) {
        window.location.href = `login.html?next=${encodeURIComponent(currentPage)}`;
        return;
    }

    // 2. Check JWT expiry
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.exp && payload.exp < Date.now() / 1000) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = `login.html?expired=1&next=${encodeURIComponent(currentPage)}`;
            return;
        }
    } catch (_) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = `login.html?next=${encodeURIComponent(currentPage)}`;
        return;
    }

    // 3. Must be an admin
    try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        if (!user.isAdmin) {
            // Redirect regular users to homepage with a message
            window.location.href = `homepage.html?msg=admin_only`;
            return;
        }
    } catch (_) {
        window.location.href = `homepage.html`;
    }
})();
