/**
 * guard.js — H. Protected Routes
 * Place this as the FIRST script in body on pages that require authentication.
 * If no valid token found, redirects to login.html?next=<currentPage>
 */
(function () {
    const token = localStorage.getItem("token");
    const currentPage = window.location.pathname.split("/").pop() || "";

    if (!token) {
        window.location.href = `login.html?next=${encodeURIComponent(currentPage)}`;
        return;
    }

    // Also check JWT expiry
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.exp && payload.exp < Date.now() / 1000) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = `login.html?expired=1&next=${encodeURIComponent(currentPage)}`;
        }
    } catch (_) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = `login.html?next=${encodeURIComponent(currentPage)}`;
    }
})();
