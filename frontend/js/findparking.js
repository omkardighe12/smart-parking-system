/**
 * findparking.js — Find Parking page
 * C.  Loading skeletons
 * E.  Animated slot meter
 * S.  30-second live polling (already existed, confirming)
 * T.  Favourites heart button on each card
 * AA. Sort & Filter dropdown
 */
const API = window.APP_API_BASE || "http://localhost:5000/api";
let allParkingData = [];

document.addEventListener("DOMContentLoaded", () => {
  showSkeletons();
  loadParking();

  // ── S. 30-second live polling ─────────────────────────────────────────────
  setInterval(loadParking, 30000);

  // Search
  const searchBtn = document.getElementById("searchBtn");
  if (searchBtn) searchBtn.addEventListener("click", handleSearch);

  const clearSearchBtn = document.getElementById("clearSearchBtn");
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
      ["searchLocation", "searchDate", "searchTime"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });
      const svt = document.getElementById("searchVehicleType");
      if (svt) svt.value = "all";
      handleSearch();
    });
  }

  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.setAttribute("aria-label", "Refresh parking data"); /* DD */
    refreshBtn.addEventListener("click", () => {
      refreshBtn.innerHTML = "🔄 Refreshing...";
      loadParking().then(() => { setTimeout(() => refreshBtn.innerHTML = "🔄 Refresh", 500); });
    });
  }

  // ── AA. Sort dropdown ────────────────────────────────────────────────────
  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) {
    sortSelect.addEventListener("change", () => handleSearch());
  }

  // Map Pin Interactivity
  const mapCard = document.getElementById("mapCard");
  const mcTitle = document.getElementById("mcTitle");
  const mcSlots = document.getElementById("mcSlots");
  const mcReserveBtn = document.getElementById("mcReserveBtn");

  document.querySelectorAll(".pin").forEach(pin => {
    pin.addEventListener("click", () => {
      const pinIdx = parseInt(pin.dataset.id, 10) - 1;
      const p = allParkingData[pinIdx];
      if (p) {
        if (mcTitle) mcTitle.textContent = p.name;
        if (mcSlots) mcSlots.textContent = `${p.availableSlots} / ${p.totalSlots} Slots Available`;
        if (mcReserveBtn) {
          mcReserveBtn.dataset.id = p._id;
          mcReserveBtn.onclick = () => { window.location.href = `bookslot.html?id=${encodeURIComponent(p._id)}`; };
        }
        if (mapCard) mapCard.classList.add("active");
      }
    });
  });

  document.addEventListener("click", (e) => {
    if (mapCard && !e.target.closest(".map-container") && mapCard.classList.contains("active")) {
      mapCard.classList.remove("active");
    }
  });

  // Pre-fill search from URL ?q=
  const urlQ = new URLSearchParams(window.location.search).get("q");
  if (urlQ) {
    const searchLoc = document.getElementById("searchLocation");
    if (searchLoc) {
      searchLoc.value = urlQ;
      // will trigger handleSearch after loadParking populates data
    }
  }
});

// ── C. Skeleton cards ─────────────────────────────────────────────────────────
function showSkeletons() {
  const container = document.getElementById("parkingList");
  if (!container) return;
  container.innerHTML = `
    <div class="skeleton-card"><div class="skeleton sk-title"></div><div class="skeleton sk-line"></div><div class="skeleton sk-line short"></div></div>
    <div class="skeleton-card"><div class="skeleton sk-title"></div><div class="skeleton sk-line"></div><div class="skeleton sk-line short"></div></div>
    <div class="skeleton-card"><div class="skeleton sk-title"></div><div class="skeleton sk-line"></div><div class="skeleton sk-line short"></div></div>`;
}

async function loadParking() {
  const container = document.getElementById("parkingList");
  if (!container) return;
  try {
    const res = await fetch(`${API}/parking`);
    const data = await res.json();
    allParkingData = data.data || data;
    handleSearch();
  } catch (err) {
    console.error("❌ Failed to load parking data", err);
    container.innerHTML = `<p style="text-align:center;color:red;">Failed to load live availability. Please try again.</p>`;
  }
}

// ── AA. Sort helper ────────────────────────────────────────────────────────────
function sortParkings(list) {
  const sortVal = document.getElementById("sortSelect")?.value || "default";
  const sorted = [...list];
  if (sortVal === "slots") sorted.sort((a, b) => b.availableSlots - a.availableSlots);
  else if (sortVal === "price") sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
  else if (sortVal === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
  return sorted;
}

function handleSearch() {
  const searchLocation = (document.getElementById("searchLocation")?.value || "").toLowerCase().trim();
  const searchVehicleType = document.getElementById("searchVehicleType")?.value || "all";
  const searchDate = document.getElementById("searchDate")?.value || "";
  const searchTime = document.getElementById("searchTime")?.value || "";

  const summaryContainer = document.getElementById("searchSummary");
  const summaryText = document.getElementById("summaryText");

  if (searchLocation || searchVehicleType !== "all" || searchDate || searchTime) {
    if (summaryContainer && summaryText) {
      const parts = [];
      if (searchLocation) parts.push(`Loc: <b>${searchLocation}</b>`);
      if (searchVehicleType !== "all") parts.push(`Vehicle: <b>${searchVehicleType}</b>`);
      if (searchDate) parts.push(`Date: <b>${searchDate}</b>`);
      if (searchTime) parts.push(`Time: <b>${searchTime}</b>`);
      summaryText.innerHTML = parts.join(" | ");
      summaryContainer.style.display = "block";
    }
  } else {
    if (summaryContainer) summaryContainer.style.display = "none";
  }

  let filtered = allParkingData.filter(p =>
    p.name.toLowerCase().includes(searchLocation) ||
    p.location.toLowerCase().includes(searchLocation)
  );

  // ── AA. Apply sort ────────────────────────────────────────────────────────
  filtered = sortParkings(filtered);

  renderParkingList(filtered);
}

function renderParkingList(parkingList) {
  const container = document.getElementById("parkingList");
  if (!container) return;
  container.innerHTML = "";

  if (parkingList.length === 0) {
    container.innerHTML = `<p style="text-align:center;color:#777;margin-top:20px;">No parking locations found matching your search.</p>`;
    return;
  }

  const vehicleType = document.getElementById("searchVehicleType")?.value;
  const date = document.getElementById("searchDate")?.value;
  const time = document.getElementById("searchTime")?.value;
  const favs = getFavourites(); /* T */

  parkingList.forEach(p => {
    const isFull = p.availableSlots === 0;
    const statusColor = isFull ? "red" : (p.availableSlots < 5 ? "orange" : "green");
    const statusText = isFull ? "FULL" : (p.availableSlots < 5 ? "Almost Full" : "Available");

    // ── E. Slot meter ──
    const pct = p.totalSlots > 0 ? Math.round(((p.totalSlots - p.availableSlots) / p.totalSlots) * 100) : 100;
    const fillColor = pct >= 90 ? "var(--meter-red)" : pct >= 60 ? "var(--meter-orange)" : "var(--meter-green)";
    const meterHtml = `<div class="slot-meter"><div class="slot-fill" style="width:${pct}%;background:${fillColor}"></div></div>`;

    // ── T. Favourite icon ──
    const isFav = favs.includes(p._id);
    const favHtml = `<button class="fav-btn${isFav ? " active" : ""}" data-id="${p._id}"
        aria-label="${isFav ? "Remove from favourites" : "Save to favourites"}"
        onclick="toggleFav('${p._id}','${p.name}',this)">${isFav ? "❤️" : "🤍"}</button>`;

    const card = document.createElement("div");
    card.className = "location-card";
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <h3>${p.name}</h3>
        ${favHtml}
      </div>
      <p class="status-text ${statusColor}">${statusText} &bull; <span style="font-weight:bold;">${p.availableSlots}</span> / ${p.totalSlots} Slots</p>
      ${meterHtml}
      <p class="location-text" style="font-size:0.95rem;font-weight:500;margin-bottom:5px;color:var(--text-dark);">₹${p.price || 50} / hour</p>
      <p class="location-text" style="margin-bottom:5px;">📍 ${p.location}</p>
      <p class="location-text" style="font-size:0.8rem;">
        ${vehicleType && vehicleType !== "all" ? `🚗 Vehicle: ${vehicleType}` : ""}
        ${date ? `📅 Date: ${date}` : ""}
        ${time ? `⏰ Time: ${time}` : ""}
      </p>
      <button class="btn-details" onclick="showDetails('${p._id}')">View Details</button>`;
    container.appendChild(card);
  });
}

// ── T. Favourites helpers ─────────────────────────────────────────────────────
function getFavourites() {
  try { return JSON.parse(localStorage.getItem("favourites") || "[]"); } catch { return []; }
}
function toggleFav(id, name, btn) {
  let favs = getFavourites();
  if (favs.includes(id)) {
    favs = favs.filter(f => f !== id);
    btn.className = "fav-btn";
    btn.innerHTML = "🤍";
    btn.setAttribute("aria-label", "Save to favourites");
    if (window.showToast) window.showToast("Removed from favourites", "warning");
  } else {
    favs.push(id);
    btn.className = "fav-btn active";
    btn.innerHTML = "❤️";
    btn.setAttribute("aria-label", "Remove from favourites");
    if (window.showToast) window.showToast(`${name} saved to favourites ❤️`, "success");
  }
  localStorage.setItem("favourites", JSON.stringify(favs));
}

// ── Show Details on Map Card ──────────────────────────────────────────────────
function showDetails(parkingId) {
  const mapCard = document.getElementById("mapCard");
  const mcTitle = document.getElementById("mcTitle");
  const mcSlots = document.getElementById("mcSlots");
  const mcReserveBtn = document.getElementById("mcReserveBtn");

  const p = allParkingData.find(pd => pd._id === parkingId);
  if (p) {
    if (mcTitle) mcTitle.textContent = p.name;
    if (mcSlots) mcSlots.textContent = `${p.availableSlots} / ${p.totalSlots} Slots Available`;
    if (mcReserveBtn) {
      mcReserveBtn.dataset.id = p._id;
      mcReserveBtn.onclick = () => window.location.href = `bookslot.html?id=${encodeURIComponent(p._id)}`;
    }
    if (mapCard) mapCard.classList.add("active");
  }
}