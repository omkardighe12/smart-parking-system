/**
 * navbar.js — Shared across all pages.
 * A.  Hamburger menu toggle (mobile)
 * B.  Dark mode toggle (persists to localStorage)
 * F.  JWT expiry check — redirects to login?expired=1 if token is expired
 * I.  My Bookings link in profile dropdown
 * R.  Global window.showToast(msg, type, duration) — replaces per-file implementations
 * DD. ESC key closes dropdown; aria-expanded on avatar button
 */
(function () {
  /* ── F. JWT Expiry Check ─────────────────────────────────────────────────── */
  const rawToken = localStorage.getItem("token");
  if (rawToken) {
    try {
      const payload = JSON.parse(atob(rawToken.split(".")[1]));
      if (payload.exp && payload.exp < Date.now() / 1000) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        const page = encodeURIComponent(window.location.pathname.split("/").pop() || "");
        window.location.href = `login.html?expired=1${page ? "&next=" + page : ""}`;
        return;
      }
    } catch (_) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }

  /* ── B. Dark Mode — Apply saved preference immediately ───────────────────── */
  if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark-mode");
  }

  /* ── Hide admin-only nav links for regular users ─────────────────────────── */
  (function hideAdminLinks() {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (!user.isAdmin) {
        document.querySelectorAll("[data-admin-only]").forEach(el => el.remove());
      }
    } catch (_) {
      document.querySelectorAll("[data-admin-only]").forEach(el => el.remove());
    }
  })();

  /* ── R. Global Toast System ──────────────────────────────────────────────── */
  (function setupToast() {
    const container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);

    window.showToast = function (msg, type = "success", duration = 3500) {
      const toast = document.createElement("div");
      toast.className = `toast toast-${type}`;
      const icon = type === "success" ? "✅" : type === "warning" ? "⚠️" : "❌";
      toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
      container.appendChild(toast);
      requestAnimationFrame(() => toast.classList.add("toast-show"));
      setTimeout(() => {
        toast.classList.remove("toast-show");
        toast.classList.add("toast-hide");
        setTimeout(() => toast.remove(), 400);
      }, duration);
    };
  })();

  /* ── A. Hamburger toggle ─────────────────────────────────────────────────── */
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const menu = document.querySelector(".menu");
  if (hamburgerBtn && menu) {
    hamburgerBtn.setAttribute("aria-label", "Toggle navigation menu"); /* DD */
    hamburgerBtn.setAttribute("aria-expanded", "false"); /* DD */
    hamburgerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = menu.classList.toggle("open");
      hamburgerBtn.classList.toggle("open", isOpen);
      hamburgerBtn.setAttribute("aria-expanded", isOpen ? "true" : "false"); /* DD */
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".navbar")) {
        menu.classList.remove("open");
        hamburgerBtn.classList.remove("open");
        hamburgerBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ── Auth Area ───────────────────────────────────────────────────────────── */
  const authArea = document.getElementById("authArea");
  if (!authArea) return;

  const userRaw = localStorage.getItem("user");

  // ── B. Dark toggle button (always present) ────────────────────────────────
  const darkBtn = document.createElement("button");
  darkBtn.className = "dark-toggle";
  darkBtn.id = "darkToggleBtn";
  darkBtn.title = "Toggle dark mode";
  darkBtn.setAttribute("aria-label", "Toggle dark mode"); /* DD */
  darkBtn.textContent = document.body.classList.contains("dark-mode") ? "☀️" : "🌙";
  darkBtn.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark-mode");
    localStorage.setItem("darkMode", isDark);
    darkBtn.textContent = isDark ? "☀️" : "🌙";
  });

  if (!userRaw) {
    authArea.appendChild(darkBtn);
    const loginLink = document.createElement("a");
    loginLink.href = "login.html";
    loginLink.className = "btn btn-outline login";
    loginLink.textContent = "Login";
    const regLink = document.createElement("a");
    regLink.href = "register.html";
    regLink.className = "btn btn-primary register";
    regLink.textContent = "Register";
    authArea.appendChild(loginLink);
    authArea.appendChild(regLink);
    return;
  }

  let user = {};
  try { user = JSON.parse(userRaw); } catch (_) { }

  const name = user.name || user.username || user.email || "User";
  const email = user.email || "";
  const initials = name.trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const isAdmin = user.isAdmin === true;

  const profileDiv = document.createElement("div");
  profileDiv.className = "nav-profile";
  profileDiv.id = "navProfile";
  profileDiv.innerHTML = `
    <button class="nav-avatar" id="navAvatarBtn" title="${name}" aria-label="Open profile menu" aria-expanded="false" aria-haspopup="true">${initials}</button>
    <div class="nav-dropdown" id="navDropdown" role="menu">
      <div class="nav-dropdown-header">
        <div class="nav-dropdown-avatar">${initials}</div>
        <div>
          <div class="nav-dropdown-name">${name}</div>
          <div class="nav-dropdown-email">${email}</div>
        </div>
      </div>
      <div class="nav-dropdown-divider"></div>
      ${isAdmin ? `<a href="dashboard.html" class="nav-dropdown-item" role="menuitem"><span>📊</span> Dashboard</a>` : `<a href="admin-setup.html" class="nav-dropdown-item nav-admin-setup" role="menuitem"><span>🛡️</span> Become Admin</a>`}
      <a href="bookslot.html" class="nav-dropdown-item" role="menuitem"><span>🅿️</span> Book Slot</a>
      <a href="my-bookings.html" class="nav-dropdown-item" role="menuitem"><span>📋</span> My Bookings</a>
      <div class="nav-dropdown-divider"></div>
      <button class="nav-dropdown-item nav-logout" id="navLogoutBtn" role="menuitem"><span>🚪</span> Logout</button>
    </div>`;

  authArea.appendChild(darkBtn);
  authArea.appendChild(profileDiv);

  const avatarBtn = document.getElementById("navAvatarBtn");
  const dropdown = document.getElementById("navDropdown");

  function openDropdown() {
    dropdown.classList.add("open");
    avatarBtn.setAttribute("aria-expanded", "true");
  }
  function closeDropdown() {
    dropdown.classList.remove("open");
    avatarBtn.setAttribute("aria-expanded", "false");
  }

  avatarBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.contains("open") ? closeDropdown() : openDropdown();
  });

  document.addEventListener("click", () => closeDropdown());

  /* DD — ESC key closes dropdown */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDropdown();
  });

  document.getElementById("navLogoutBtn").addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
  });
})();
