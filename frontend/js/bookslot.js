/**
 * bookslot.js — Book Parking Slot page
 * D.  Booking confirmation modal
 * L.  Glassmorphism pricing card
 * P.  Auto-fill vehicle number from localStorage
 * U.  Print receipt button
 * V.  Inline vehicle number validation (Indian plate regex)
 * BB. Minimum 30-min booking duration guard
 * R.  Uses window.showToast (global)
 */
const API = window.APP_API_BASE || "http://localhost:5000/api";

const STATIC_LOCATIONS = [
  { _id: "loc1", name: "Main Plaza", location: "City Center", totalSlots: 20, availableSlots: 12, price: 40 },
  { _id: "loc2", name: "Green Square Garage", location: "Green Square", totalSlots: 19, availableSlots: 9, price: 35 },
  { _id: "loc3", name: "Central Park Lot", location: "Central Park", totalSlots: 10, availableSlots: 2, price: 50 },
  { _id: "loc4", name: "Riverside Parking", location: "Riverside Drive", totalSlots: 10, availableSlots: 0, price: 30 }
];

let allParkings = [];

// Indian vehicle plate regex: MH01AB1234 or MH01A1234
const PLATE_REGEX = /^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/;

document.addEventListener("DOMContentLoaded", () => {
  const now = new Date();
  const dateEl = document.getElementById("reserveDate");
  if (dateEl) dateEl.value = now.toISOString().split("T")[0];

  const inEl = document.getElementById("reserveStartTime");
  const outEl = document.getElementById("reserveEndTime");
  if (inEl && outEl) {
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    inEl.value = `${hh}:${mm}`;
    const later = new Date(now.getTime() + 3600000);
    outEl.value = `${String(later.getHours()).padStart(2, "0")}:${String(later.getMinutes()).padStart(2, "0")}`;
  }

  // ── P. Auto-fill vehicle number ──────────────────────────────────────────
  const vehicleEl = document.getElementById("vehicleNumber");
  if (vehicleEl) {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      const plate = u.vehicleNumber || localStorage.getItem("lastVehicle") || "";
      if (plate) vehicleEl.value = plate.toUpperCase();
    } catch (_) { }

    // ── V. Inline validation ─────────────────────────────────────────────────
    vehicleEl.addEventListener("input", () => {
      const val = vehicleEl.value.toUpperCase();
      vehicleEl.value = val;
      vehicleEl.classList.remove("input-error", "input-ok");
      if (val.length >= 9) {
        vehicleEl.classList.add(PLATE_REGEX.test(val) ? "input-ok" : "input-error");
      }
    });
  }

  const urlId = new URLSearchParams(window.location.search).get("id");
  loadLocations(urlId);

  ["locationSelect", "reserveDate", "reserveStartTime", "reserveEndTime"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", updateCostEstimate);
  });

  const reserveBtn = document.getElementById("reserveBtn");
  if (reserveBtn) reserveBtn.addEventListener("click", handleReserve);

  // ── D. Modal close handlers ───────────────────────────────────────────────
  const modalOverlay = document.getElementById("bookingConfirmModal");
  const closeModalBtn = document.getElementById("confirmModalClose");
  const viewBookingsBtn = document.getElementById("confirmViewBookings");
  const printBtn = document.getElementById("cmPrintBtn");

  if (closeModalBtn) closeModalBtn.addEventListener("click", () => modalOverlay.classList.remove("active"));
  if (viewBookingsBtn) viewBookingsBtn.addEventListener("click", () => window.location.href = "my-bookings.html");
  if (printBtn) printBtn.addEventListener("click", () => window.print());           /* U */
  if (modalOverlay) {
    modalOverlay.addEventListener("click", e => {
      if (e.target === modalOverlay) modalOverlay.classList.remove("active");
    });
    document.addEventListener("keydown", e => { /* DD */
      if (e.key === "Escape") modalOverlay.classList.remove("active");
    });
  }
});

// ── Load locations ─────────────────────────────────────────────────────────────
async function loadLocations(preselectId = null) {
  const select = document.getElementById("locationSelect");
  if (!select) return;

  try {
    const res = await fetch(`${API}/parking`);
    const json = await res.json();
    const live = json.data || json;
    allParkings = Array.isArray(live) && live.length > 0 ? live : STATIC_LOCATIONS;
  } catch (err) {
    console.warn("Backend offline — using static locations.", err);
    allParkings = STATIC_LOCATIONS;
  }

  select.innerHTML = `<option value="">— Select a Location —</option>`;
  allParkings.forEach(p => {
    const isFull = p.availableSlots === 0;
    const label = `${p.name} (${isFull ? "FULL" : p.availableSlots + " slots free"})`;
    select.innerHTML += `<option value="${p._id}" ${isFull ? "disabled" : ""}>${label}</option>`;
  });

  if (preselectId) select.value = preselectId;

  select.addEventListener("change", () => {
    updateCard(select.value);
    updateCostEstimate();
  });

  if (preselectId) {
    updateCard(preselectId);
    updateCostEstimate();
  }
}

// ── Right-panel location card ──────────────────────────────────────────────────
function updateCard(id) {
  const p = allParkings.find(x => x._id === id);
  const container = document.getElementById("dynamicCardContainer");
  if (!container) return;

  if (!p) {
    container.innerHTML = `<div class="dynamic-location-card"><p style="color:#64748b;text-align:center;">Select a location to view details</p></div>`;
    return;
  }

  const isFull = p.availableSlots === 0;
  const statusColor = isFull ? "#ef4444" : (p.availableSlots < 4 ? "#f59e0b" : "#10b981");
  const statusText = isFull ? "No slots available" : `${p.availableSlots} / ${p.totalSlots} slots available`;

  container.innerHTML = `
    <div class="dynamic-location-card">
      <div class="dlc-header">
        <span class="dlc-icon">🅿️</span>
        <div>
          <h3>${p.name}</h3>
          <p class="dlc-loc">📍 ${p.location || "Smart Parking Zone"}</p>
        </div>
      </div>
      <div class="dlc-stats">
        <div class="dlc-stat"><span class="dlc-stat-val" style="color:${statusColor}">${p.availableSlots}</span><span class="dlc-stat-lbl">Free Slots</span></div>
        <div class="dlc-stat"><span class="dlc-stat-val">${p.totalSlots}</span><span class="dlc-stat-lbl">Total Slots</span></div>
        <div class="dlc-stat"><span class="dlc-stat-val">₹${p.price || 40}</span><span class="dlc-stat-lbl">Per Hour</span></div>
      </div>
      <p class="dlc-status" style="color:${statusColor}">● ${statusText}</p>
    </div>`;
}

// ── L. Pricing card (with BB minimum guard) ────────────────────────────────────
function updateCostEstimate() {
  const select = document.getElementById("locationSelect");
  const dateEl = document.getElementById("reserveDate");
  const inEl = document.getElementById("reserveStartTime");
  const outEl = document.getElementById("reserveEndTime");
  const costEl = document.getElementById("costEstimate");
  if (!costEl) return;

  const p = allParkings.find(x => x._id === select?.value);
  if (!p || !dateEl?.value || !inEl?.value || !outEl?.value) {
    costEl.innerHTML = "";
    costEl.className = "";
    return;
  }

  const start = new Date(`${dateEl.value}T${inEl.value}`);
  const end = new Date(`${dateEl.value}T${outEl.value}`);
  if (end <= start) {
    costEl.innerHTML = `<span style="color:#ef4444;">⚠️ Out time must be after in time.</span>`;
    costEl.className = "";
    return;
  }

  const hours = (end - start) / 3600000;

  // ── BB. Minimum 30-min duration guard ────────────────────────────────────
  if (hours < 0.5) {
    costEl.className = "";
    costEl.innerHTML = `<span style="color:#ef4444;">⚠️ Minimum booking duration is 30 minutes.</span>`;
    return;
  }

  const price = p.price || 40;
  const total = Math.ceil(hours * price);

  costEl.className = "pricing-card";
  costEl.innerHTML = `
    <div class="pc-header"><span class="pc-icon">💳</span><span class="pc-title">Price Summary</span></div>
    <div class="pc-row"><span>📍 Location</span><strong>${p.name}</strong></div>
    <div class="pc-row"><span>⏱ Duration</span><strong>${hours.toFixed(1)} hr</strong></div>
    <div class="pc-row"><span>💵 Rate</span><strong>₹${price}/hr</strong></div>
    <div class="pc-divider"></div>
    <div class="pc-row pc-total"><span>Total Estimate</span><strong class="pc-amount">₹${total}</strong></div>`;
}

// ── Handle Reservation ────────────────────────────────────────────────────────
async function handleReserve() {
  const select = document.getElementById("locationSelect");
  const dateEl = document.getElementById("reserveDate");
  const inEl = document.getElementById("reserveStartTime");
  const outEl = document.getElementById("reserveEndTime");
  const vehicleEl = document.getElementById("vehicleNumber");
  const btn = document.getElementById("reserveBtn");

  const parkingId = select?.value;
  const date = dateEl?.value;
  const startTimeRaw = inEl?.value;
  const endTimeRaw = outEl?.value;
  const vehicleNumber = vehicleEl?.value.trim().toUpperCase();

  const toast = (msg, t = "error") => window.showToast ? window.showToast(msg, t) : alert(msg);

  if (!parkingId) { toast("Please select a parking location."); return; }
  if (!date) { toast("Please select a date."); return; }
  if (!startTimeRaw) { toast("Please select In Time."); return; }
  if (!endTimeRaw) { toast("Please select Out Time."); return; }
  if (!vehicleNumber) { toast("Please enter your vehicle number."); return; }
  if (!PLATE_REGEX.test(vehicleNumber)) { toast("Enter a valid Indian plate (e.g. MH01AB1234)."); return; }

  const startTime = new Date(`${date}T${startTimeRaw}`).toISOString();
  const endTime = new Date(`${date}T${endTimeRaw}`).toISOString();

  if (new Date(endTime) <= new Date(startTime)) { toast("Out time must be after in time."); return; }

  const hours = (new Date(endTime) - new Date(startTime)) / 3600000;
  // ── BB. Guard on submit too ───────────────────────────────────────────────
  if (hours < 0.5) { toast("Minimum booking duration is 30 minutes."); return; }

  btn.innerHTML = `<span style="font-size:1.1rem;">⏳</span> Reserving…`;
  btn.disabled = true;

  // Save last used plate for P/Z
  localStorage.setItem("lastVehicle", vehicleNumber);

  // ── Guard: static IDs can't be booked (backend offline fallback) ────────────
  // Static locations use "loc1".."loc4" — these are NOT MongoDB ObjectIds
  if (!/^[0-9a-fA-F]{24}$/.test(parkingId)) {
    btn.disabled = false;
    btn.innerHTML = `<span style="font-size:1.1rem;">🅿️</span> Reserve Slot — Direct Entry`;
    toast("🔌 Booking server is offline. Please try again when the server is available.", "warning");
    return;
  }

  try {
    const token = localStorage.getItem("token");
    if (!token) { toast("Please log in to book a slot."); btn.disabled = false; btn.innerHTML = `<span style='font-size:1.1rem;'>🅿️</span> Reserve Slot`; return; }

    const res = await fetch(`${API}/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ parkingId, vehicleNumber, inTime: startTime, outTime: endTime })
    });

    const data = await res.json();

    if (res.ok && data.booking) {
      showConfirmModal(data.booking);
      loadLocations();
    } else {
      toast(data.message || "Reservation failed.");
    }
  } catch (err) {
    toast("Server offline — reservation could not be completed.");
  } finally {
    btn.innerHTML = `<span style="font-size:1.1rem;">🅿️</span> Reserve Slot`;
    btn.disabled = false;
  }
}

// ── D. Booking Confirmation Modal ──────────────────────────────────────────────
function showConfirmModal(booking) {
  const modal = document.getElementById("bookingConfirmModal");
  if (!modal) {
    if (window.showToast) window.showToast("Slot reserved successfully! ✅", "success");
    return;
  }

  const fmt = d => new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  // Backend returns inTime/outTime
  const inTime = booking.inTime || booking.startTime;
  const outTime = booking.outTime || booking.endTime;
  const start = new Date(inTime);
  const end = new Date(outTime);
  const hours = ((end - start) / 3600000).toFixed(1);
  const cost = booking.totalCost || Math.ceil(hours * 40);
  const ref = String(booking.id || booking._id).slice(-8).toUpperCase();

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl("cmRef", ref);
  setEl("cmLocation", booking.parkingName || "");
  setEl("cmVehicle", booking.vehicleNumber || "");
  setEl("cmIn", fmt(inTime));
  setEl("cmOut", fmt(outTime));
  setEl("cmDuration", `${hours} hr`);
  setEl("cmCost", `₹${cost}`);

  modal.classList.add("active");
}

// ── My Bookings (shown below form after booking) ───────────────────────────────
async function loadMyBookings() {
  const section = document.getElementById("myBookingsSection");
  const container = document.getElementById("myBookingsList");
  if (!section || !container) return;

  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(`${API}/bookings/my`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    const bookings = Array.isArray(data) ? data : [];
    if (bookings.length === 0) { section.style.display = "none"; return; }

    section.style.display = "block";
    const fmt = d => new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    container.innerHTML = bookings.map(b => {
      const start = new Date(b.inTime);
      const end = new Date(b.outTime);
      const hours = ((end - start) / 3600000).toFixed(1);
      const cost = b.totalCost || Math.ceil(hours * 40);
      const parkName = b.parkingName || (b.parking && b.parking.name) || "Unknown";
      return `
        <div class="my-booking-card" id="booking-${b._id}">
          <div class="mbc-info">
            <div class="mbc-loc"><strong>🅿️ ${parkName}</strong> <span class="mbc-badge">${b.status || "active"}</span></div>
            <div class="mbc-detail">🚗 ${b.vehicleNumber}</div>
            <div class="mbc-detail">🕐 In:  ${fmt(b.inTime)}</div>
            <div class="mbc-detail">🕑 Out: ${fmt(b.outTime)}</div>
            <div class="mbc-detail mbc-cost">⏱ ${hours} hr &nbsp;•&nbsp; 💰 ₹${cost}</div>
          </div>
          <button class="btn-cancel" aria-label="Cancel booking" onclick="cancelBooking('${b._id}')">✕ Cancel</button>
        </div>`;
    }).join("");
  } catch (err) { section.style.display = "none"; }
}

async function cancelBooking(bookingId) {
  const card = document.getElementById(`booking-${bookingId}`);
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
      loadLocations();
      loadMyBookings();
    } else {
      if (window.showToast) window.showToast(data.message || "Could not cancel booking.", "error");
      if (card) { card.style.opacity = "1"; card.style.pointerEvents = ""; }
    }
  } catch {
    if (window.showToast) window.showToast("Server offline — could not cancel.", "error");
    if (card) { card.style.opacity = "1"; card.style.pointerEvents = ""; }
  }
}