/**
 * my-bookings.js — Booking History Page
 * I.  Booking history fetch & render
 * Q.  Extend Booking modal
 * Z.  Auto-load from localStorage user / lastVehicle
 */
const API = window.APP_API_BASE || "http://localhost:5000/api";

document.addEventListener("DOMContentLoaded", () => {
    // Auto-load bookings for the logged-in user via JWT
    fetchBookings();

    // Keep the search/refresh button functional
    const searchBtn = document.getElementById("searchBtn");
    if (searchBtn) searchBtn.addEventListener("click", () => fetchBookings());

    const input = document.getElementById("vehicleInput");
    if (input) input.addEventListener("keypress", e => { if (e.key === "Enter") fetchBookings(); });

    // ── Q. Extend modal close handlers ───────────────────────────────────────
    const extendOverlay = document.getElementById("extendModal");
    const extendClose = document.getElementById("extendModalClose");
    if (extendClose) extendClose.addEventListener("click", closeExtendModal);
    if (extendOverlay) extendOverlay.addEventListener("click", e => { if (e.target === extendOverlay) closeExtendModal(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeExtendModal(); });

    const confirmExtendBtn = document.getElementById("confirmExtendBtn");
    if (confirmExtendBtn) confirmExtendBtn.addEventListener("click", submitExtend);
});

// ── Fetch ────────────────────────────────────────────────────────────────────────────
async function fetchBookings() {
    const results = document.getElementById("mbResults");
    if (!results) return;
    results.innerHTML = `<p class="mb-loading">🔍 Loading your bookings...</p>`;

    const token = localStorage.getItem("token");
    if (!token) {
        results.innerHTML = `<p class="mb-empty">Please <a href="login.html">log in</a> to view your bookings.</p>`;
        return;
    }

    try {
        const res = await fetch(`${API}/bookings/my`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        const bookings = Array.isArray(data) ? data : [];

        if (bookings.length === 0) {
            results.innerHTML = `<p class="mb-empty">No bookings found.</p>`;
            return;
        }
        renderBookings(bookings);
    } catch (err) {
        results.innerHTML = `<p class="mb-empty" style="color:#ef4444;">Failed to load bookings. Is the server running?</p>`;
        console.error(err);
    }
}

// ── Render ────────────────────────────────────────────────────────────────────────────
function renderBookings(bookings) {
    const results = document.getElementById("mbResults");
    const fmt = d => new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

    const badgeClass = {
        active: "mb-status-booked",
        cancelled: "mb-status-cancelled",
        completed: "mb-status-expired"
    };

    const totalCount = bookings.length;
    const activeCount = bookings.filter(b => b.status === "active").length;

    results.innerHTML = `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
    <h3 style="font-size:1rem;color:var(--text-dark);">Found <strong>${totalCount}</strong> booking(s) &nbsp;•&nbsp; <span style="color:#10b981;font-weight:600;">${activeCount} active</span></h3>
  </div>
  ${bookings.map(b => {
        const inTime = b.inTime || b.startTime;
        const outTime = b.outTime || b.endTime;
        const hours = (((new Date(outTime)) - (new Date(inTime))) / 3600000).toFixed(1);
        const cost = b.totalCost || Math.ceil(hours * 40);
        const cls = badgeClass[b.status] || "mb-status-cancelled";
        const canAct = b.status === "active";
        const parkName = b.parkingName || (b.parking && b.parking.name) || "Unknown";
        const location = (b.parking && b.parking.location) || "";

        return `
    <div class="mb-booking-card" id="mb-${b._id}">
      <div class="mb-card-info">
        <div class="mb-card-title">
          🅿️ ${parkName}
          <span class="mb-status-badge ${cls}">${b.status}</span>
        </div>
        ${location ? `<div class="mb-card-detail">📍 ${location}</div>` : ""}
        <div class="mb-card-detail">🚗 ${b.vehicleNumber}</div>
        <div class="mb-card-detail">🕐 In: ${fmt(inTime)}</div>
        <div class="mb-card-detail">🕑 Out: ${fmt(outTime)}</div>
        <div class="mb-card-cost">⏱ ${hours} hr &nbsp;•&nbsp; 💰 ₹${cost}</div>
      </div>
      <div class="mb-card-actions">
        ${canAct ? `
          <button class="mb-extend-btn" aria-label="Extend booking"
            onclick="openExtendModal('${b._id}','${outTime}')">⏰ Extend</button>
          <button class="mb-cancel-btn" aria-label="Cancel booking"
            onclick="cancelBooking('${b._id}')">✕ Cancel</button>
        ` : ""}
      </div>
    </div>`;
    }).join("")}`;
}

// ── Q. Extend modal ───────────────────────────────────────────────────────────
let _extendBookingId = null;

function openExtendModal(bookingId, currentEndTime) {
    _extendBookingId = bookingId;

    const modal = document.getElementById("extendModal");
    const timeEl = document.getElementById("extendTimeInput");
    const dateEl = document.getElementById("extendDateInput");
    if (!modal || !timeEl || !dateEl) return;

    const current = new Date(currentEndTime);
    const later = new Date(current.getTime() + 3600000); /* default +1 hr */
    dateEl.value = later.toISOString().split("T")[0];
    timeEl.value = `${String(later.getHours()).padStart(2, "0")}:${String(later.getMinutes()).padStart(2, "0")}`;
    modal.classList.add("active");
}

function closeExtendModal() {
    const modal = document.getElementById("extendModal");
    if (modal) modal.classList.remove("active");
}

async function submitExtend() {
    const timeEl = document.getElementById("extendTimeInput");
    const dateEl = document.getElementById("extendDateInput");
    if (!timeEl || !dateEl || !_extendBookingId) return;

    // extraHours = difference from new end time to old end time (rounded up)
    const newEndTime = new Date(`${dateEl.value}T${timeEl.value}`);
    const extraHours = Math.max(1, Math.ceil((newEndTime - new Date()) / 3600000));

    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`${API}/bookings/${_extendBookingId}/extend`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ extraHours })
        });
        const data = await res.json();
        if (res.ok) {
            if (window.showToast) window.showToast("Booking extended! ⏰", "success");
            closeExtendModal();
            fetchBookings(); // Fetch all bookings for the user
        } else {
            if (window.showToast) window.showToast(data.message || "Could not extend.", "error");
        }
    } catch {
        if (window.showToast) window.showToast("Server offline — could not extend.", "error");
    }
}

// ── Cancel ────────────────────────────────────────────────────────────────────────────
async function cancelBooking(bookingId) {
    const card = document.getElementById(`mb-${bookingId}`);
    if (card) { card.style.opacity = "0.5"; card.style.pointerEvents = "none"; }

    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`${API}/bookings/${bookingId}/cancel`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
            if (window.showToast) window.showToast("Booking cancelled successfully. ✅", "success");
            fetchBookings(); // Fetch all bookings for the user
        } else {
            if (window.showToast) window.showToast(data.message || "Could not cancel booking.", "error");
            if (card) { card.style.opacity = "1"; card.style.pointerEvents = ""; }
        }
    } catch {
        if (window.showToast) window.showToast("Server offline — could not cancel.", "error");
        if (card) { card.style.opacity = "1"; card.style.pointerEvents = ""; }
    }
}
