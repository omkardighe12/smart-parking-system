/**
 * dashboard.js — Dashboard page
 * C.  Loading skeletons
 * E.  Animated slot meter
 * K.  Vehicle search
 * Y.  Occupancy doughnut chart (Chart.js)
 * CC. Today's stats (bookingsToday, revenueToday) fetched from /api/stats
 */
const API_BASE_URL = window.APP_API_BASE || "http://localhost:5000/api";
let allParkingData = [];
let occupancyChart = null; /* Y */

const FALLBACK_PARKINGS = [
  { _id: "loc1", name: "Main Plaza", location: "City Center", totalSlots: 20, availableSlots: 12, price: 40 },
  { _id: "loc2", name: "Green Square Garage", location: "Green Square", totalSlots: 19, availableSlots: 9, price: 35 },
  { _id: "loc3", name: "Central Park Lot", location: "Central Park", totalSlots: 10, availableSlots: 2, price: 50 },
  { _id: "loc4", name: "Riverside Parking", location: "Riverside Drive", totalSlots: 10, availableSlots: 0, price: 30 }
];

document.addEventListener("DOMContentLoaded", () => {
  showParkingSkeletons();
  fetchDashboardData();
  fetchTodayStats(); /* CC */
  setupMapPins();
  setupMapCardClose();

  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.setAttribute("aria-label", "Refresh parking data"); /* DD */
    refreshBtn.addEventListener("click", () => {
      refreshBtn.textContent = "🔄 Refreshing...";
      Promise.all([fetchDashboardData(), fetchTodayStats()]).finally(() => {
        setTimeout(() => refreshBtn.textContent = "🔄 Refresh", 700);
      });
    });
  }

  setInterval(() => { fetchDashboardData(); fetchTodayStats(); }, 30000);

  // ── K. Vehicle search ─────────────────────────────────────────────────────
  const vehicleSearchBtn = document.getElementById("vehicleSearchBtn");
  const vehicleSearchInput = document.getElementById("vehicleSearchInput");
  if (vehicleSearchBtn && vehicleSearchInput) {
    vehicleSearchBtn.addEventListener("click", () => {
      const plate = vehicleSearchInput.value.trim().toUpperCase();
      if (plate) searchByVehicle(plate);
    });
    vehicleSearchInput.addEventListener("keypress", e => {
      if (e.key === "Enter") vehicleSearchBtn.click();
    });
  }
});

// ── C. Skeleton ───────────────────────────────────────────────────────────────
function showParkingSkeletons() {
  const container = document.getElementById("parking-cards-container");
  if (!container) return;
  container.innerHTML = `
    <div class="skeleton-card"><div class="skeleton sk-title"></div><div class="skeleton sk-line"></div><div class="skeleton sk-line short"></div></div>
    <div class="skeleton-card"><div class="skeleton sk-title"></div><div class="skeleton sk-line"></div><div class="skeleton sk-line short"></div></div>
    <div class="skeleton-card"><div class="skeleton sk-title"></div><div class="skeleton sk-line"></div><div class="skeleton sk-line short"></div></div>
    <div class="skeleton-card"><div class="skeleton sk-title"></div><div class="skeleton sk-line"></div><div class="skeleton sk-line short"></div></div>`;
}

// ── Fetch Parking ─────────────────────────────────────────────────────────────
async function fetchDashboardData() {
  try {
    const res = await fetch(`${API_BASE_URL}/parking`);
    const json = await res.json();
    const data = json.data || json;
    allParkingData = (Array.isArray(data) && data.length > 0) ? data : FALLBACK_PARKINGS;
  } catch {
    allParkingData = FALLBACK_PARKINGS;
  }
  updateStats(allParkingData);
  renderParkingCards(allParkingData);
  updateSectionTitle(allParkingData.length);
  renderOccupancyChart(allParkingData); /* Y */
}

// ── CC. Today's Stats ─────────────────────────────────────────────────────────
async function fetchTodayStats() {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_BASE_URL}/admin/stats`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {}
    });
    if (!res.ok) return; // silently skip if not admin
    const data = await res.json();
    setValueText("statBookingsToday", data.todayBookings ?? "–");
    setValueText("statRevenueToday", data.todayRevenue ? `₹${data.todayRevenue}` : "–");
    setValueText("statTotalUsers", data.totalUsers ?? "–");
    setValueText("statTotalRevenue", data.totalRevenue ? `₹${data.totalRevenue}` : "–");
  } catch {
    setValueText("statBookingsToday", "–");
    setValueText("statRevenueToday", "–");
  }
}

// ── Stats bar ─────────────────────────────────────────────────────────────────
function updateStats(parkings) {
  const totalLocations = parkings.length;
  const availableSlots = parkings.reduce((sum, p) => sum + (p.availableSlots || 0), 0);
  const fullLots = parkings.filter(p => p.availableSlots === 0).length;
  const totalCapacity = parkings.reduce((sum, p) => sum + (p.totalSlots || 0), 0);
  const occupiedSlots = totalCapacity - availableSlots;
  const avgOccupancy = totalCapacity > 0 ? Math.round((occupiedSlots / totalCapacity) * 100) : 0;

  animateValue("statTotal", totalLocations);
  animateValue("statAvail", availableSlots);
  animateValue("statFull", fullLots);
  setValueText("statOccupancy", `${avgOccupancy}%`);

  const occEl = document.getElementById("statOccupancy");
  if (occEl) occEl.style.color = avgOccupancy >= 80 ? "#ef4444" : avgOccupancy >= 50 ? "#f59e0b" : "#10b981";
}

function animateValue(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  const duration = 600;
  const step = Math.ceil(Math.abs(target - start) / (duration / 16));
  let current = start;
  const timer = setInterval(() => {
    current += (target > start ? step : -step);
    if ((target > start && current >= target) || (target <= start && current <= target)) {
      el.textContent = target; clearInterval(timer);
    } else { el.textContent = current; }
  }, 16);
}

function setValueText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function updateSectionTitle(count) {
  const el = document.getElementById("sectionTitle");
  if (el) el.textContent = `${count} Live Parking Location${count !== 1 ? "s" : ""}`;
}

// ── Render Cards ──────────────────────────────────────────────────────────────
function renderParkingCards(parkings) {
  const container = document.getElementById("parking-cards-container");
  if (!container) return;

  if (parkings.length === 0) {
    container.innerHTML = `<p class="loading-text">No parking locations found.</p>`;
    return;
  }

  container.innerHTML = parkings.map(p => {
    const isFull = p.availableSlots === 0;
    const isLow = !isFull && p.availableSlots < 4;
    const dotClass = isFull ? "full" : (isLow ? "low" : "available");
    const slotLabel = isFull ? "No slots left" : `${p.availableSlots} / ${p.totalSlots} Available`;
    const pct = p.totalSlots > 0 ? Math.round(((p.totalSlots - p.availableSlots) / p.totalSlots) * 100) : 100;
    const fillColor = pct >= 90 ? "var(--meter-red)" : pct >= 60 ? "var(--meter-orange)" : "var(--meter-green)";
    return `
    <div class="parking-card">
      <div class="card-header">
        <div class="icon-p">P</div>
        <div class="title-group">
          <h3>${p.name}</h3>
          <p class="availability-text">${slotLabel}</p>
          <div class="slot-meter"><div class="slot-fill" style="width:${pct}%;background:${fillColor}"></div></div>
        </div>
        <span class="status-dot ${dotClass}"></span>
      </div>
      <div class="button-group">
        <button class="btn-details" onclick="showPinDetails('${p._id}')">Details</button>
        <button class="btn-reserve"
          ${isFull ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}
          onclick="location.href='bookslot.html?id=${p._id}'">
          ${isFull ? "Full" : "Reserve"}
        </button>
      </div>
    </div>`;
  }).join("");
}

// ── Y. Occupancy Doughnut Chart ───────────────────────────────────────────────
function renderOccupancyChart(parkings) {
  const canvas = document.getElementById("occupancyChart");
  if (!canvas || typeof Chart === "undefined") return;

  const totalSlots = parkings.reduce((s, p) => s + (p.totalSlots || 0), 0);
  const occupied = parkings.reduce((s, p) => s + (p.totalSlots - p.availableSlots), 0);
  const available = totalSlots - occupied;

  const chartData = {
    labels: ["Occupied", "Available"],
    datasets: [{
      data: [occupied, available],
      backgroundColor: ["#ef4444", "#10b981"],
      borderColor: ["#dc2626", "#059669"],
      borderWidth: 2,
      hoverOffset: 8
    }]
  };

  if (occupancyChart) {
    occupancyChart.data = chartData;
    occupancyChart.update();
    return;
  }

  occupancyChart = new Chart(canvas, {
    type: "doughnut",
    data: chartData,
    options: {
      responsive: false,
      cutout: "65%",
      plugins: {
        legend: { position: "bottom", labels: { font: { family: "Outfit", size: 12 }, padding: 12 } },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.label}: ${ctx.parsed} slots (${Math.round(ctx.parsed / totalSlots * 100)}%)`
          }
        }
      }
    }
  });
}

// ── K. Vehicle Search ─────────────────────────────────────────────────────────
async function searchByVehicle(plate) {
  const resultsPanel = document.getElementById("vehicleSearchResults");
  if (!resultsPanel) return;

  resultsPanel.innerHTML = `<p class="loading-text">Searching...</p>`;
  resultsPanel.style.display = "block";

  const token = localStorage.getItem("token");
  try {
    // Admin: fetch all bookings and filter by vehicle number client-side
    const res = await fetch(`${API_BASE_URL}/bookings`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    const all = Array.isArray(data) ? data : [];
    const bookings = all.filter(b => (b.vehicleNumber || "").toUpperCase().includes(plate));

    if (bookings.length === 0) {
      resultsPanel.innerHTML = `<p class="loading-text">No bookings found for <strong>${plate}</strong>.</p>`;
      return;
    }

    const fmt = d => new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    const badgeColor = { BOOKED: "#10b981", EXPIRED: "#f59e0b", CANCELLED: "#94a3b8" };

    resultsPanel.innerHTML = `
      <h3 style="margin:0 0 12px;font-size:1rem;">📋 Bookings for <strong>${plate}</strong></h3>
      ${data.bookings.map(b => {
      const hours = ((new Date(b.endTime) - new Date(b.startTime)) / 3600000).toFixed(1);
      const cost = Math.ceil(hours * (b.price || 40));
      const color = badgeColor[b.status] || "#94a3b8";
      return `
          <div class="vehicle-result-card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <strong>🅿️ ${b.parkingName}</strong>
              <span style="background:${color};color:white;padding:2px 10px;border-radius:20px;font-size:0.78rem;font-weight:600;">${b.status}</span>
            </div>
            <div style="font-size:0.85rem;color:var(--text-muted,#64748b);">
              📍 ${b.parkingLoc || ""} &nbsp;|&nbsp; 🕐 ${fmt(b.startTime)} → ${fmt(b.endTime)}
            </div>
            <div style="font-size:0.85rem;margin-top:4px;">⏱ ${hours} hr &nbsp;•&nbsp; 💰 ₹${cost}</div>
          </div>`;
    }).join("")}`;
  } catch {
    resultsPanel.innerHTML = `<p class="loading-text" style="color:#ef4444;">Failed to fetch bookings.</p>`;
  }
}

// ── Map Pins ──────────────────────────────────────────────────────────────────
function setupMapPins() {
  const mapCard = document.getElementById("mapCard");
  const mcTitle = document.getElementById("mcTitle");
  const mcSlots = document.getElementById("mcSlots");
  const mcReserveBtn = document.getElementById("mcReserveBtn");

  const locationData = {
    "1": { title: "Main Plaza", slots: "12 / 20", id: "loc1" },
    "2": { title: "Green Square Garage", slots: "9 / 19", id: "loc2" },
    "3": { title: "Central Park Lot", slots: "2 / 10", id: "loc3" },
    "4": { title: "Riverside Parking", slots: "0 / 10", id: "loc4" }
  };

  document.querySelectorAll(".pin").forEach(pin => {
    pin.addEventListener("click", e => {
      e.stopPropagation();
      const loc = locationData[pin.dataset.id];
      if (loc && mapCard) {
        if (mcTitle) mcTitle.textContent = loc.title;
        if (mcSlots) mcSlots.textContent = `${loc.slots} Slots Available`;
        if (mcReserveBtn) mcReserveBtn.onclick = () => location.href = `bookslot.html?id=${loc.id}`;
        mapCard.classList.add("active");
      }
    });
  });
}

function showPinDetails(parkingId) {
  const p = allParkingData.find(pd => pd._id === parkingId);
  if (!p) return;

  const mapCard = document.getElementById("mapCard");
  const mcTitle = document.getElementById("mcTitle");
  const mcSlots = document.getElementById("mcSlots");
  const mcReserveBtn = document.getElementById("mcReserveBtn");

  if (mcTitle) mcTitle.textContent = p.name;
  if (mcSlots) mcSlots.textContent = `${p.availableSlots} / ${p.totalSlots} Slots Available`;
  if (mcReserveBtn) mcReserveBtn.onclick = () => location.href = `bookslot.html?id=${p._id}`;
  if (mapCard) mapCard.classList.add("active");
}

function setupMapCardClose() {
  document.addEventListener("click", e => {
    const mapCard = document.getElementById("mapCard");
    if (mapCard && !e.target.closest(".map-container") && mapCard.classList.contains("active")) {
      mapCard.classList.remove("active");
    }
  });
}
