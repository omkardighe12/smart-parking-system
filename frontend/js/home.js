/**
 * home.js — Homepage parking list
 * C.  Loading skeletons
 * E.  Animated slot meter
 * S.  30-second polling to keep slot counts live
 * T.  Favourites / saved locations (heart button)
 */
const API = window.APP_API_BASE || "http://localhost:5000/api";

const STATIC_LOCATIONS = [
  { _id: "1", name: "Main Plaza", totalSlots: 20, availableSlots: 12 },
  { _id: "2", name: "Green Square Garage", totalSlots: 19, availableSlots: 9 },
  { _id: "3", name: "Central Park Lot", totalSlots: 10, availableSlots: 2 },
  { _id: "4", name: "Riverside Parking", totalSlots: 10, availableSlots: 0 }
];

let liveParkingData = [];

document.addEventListener("DOMContentLoaded", () => {
  showSkeletons();
  fetchAndUpdateParkingCards();

  // ── Admin redirect notice ──────────────────────────────────────────────────
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("msg") === "admin_only") {
    // Clean the URL without reload
    window.history.replaceState({}, "", window.location.pathname);
    // Show toast after a short delay so navbar.js has time to init the toast system
    setTimeout(() => {
      if (window.showToast) window.showToast("⛔ Dashboard is restricted to admin users only.", "error", 4500);
    }, 300);
  }

  // ── S. Real-time polling every 30 s ───────────────────────────────────────
  setInterval(fetchAndUpdateParkingCards, 30000);

  // ── Details Modal ────────────────────────────────────────────────────────
  const detailsModalOverlay = document.getElementById("detailsModalOverlay");
  const modalCloseBtn = document.getElementById("modalCloseBtn");
  const modalTitle = document.getElementById("modalTitle");
  const modalStatus = document.getElementById("modalStatus");
  const modalSlots = document.getElementById("modalSlots");
  const modalReserveBtn = document.getElementById("modalReserveBtn");

  // ── Details Modal — event delegation (works for dynamically injected cards) ─
  const parkingList = document.querySelector(".parking-list");
  if (parkingList) {
    parkingList.addEventListener("click", (e) => {
      const detailsBtn = e.target.closest(".details");
      const reserveBtn = e.target.closest(".reserve");

      if (detailsBtn) {
        e.preventDefault();
        const card = detailsBtn.closest(".parking-card");
        const name = card ? card.querySelector("h3").textContent.trim() : "Parking Location";
        const slots = card ? card.querySelector(".slots span").textContent : "--";
        const statusEl = card ? card.querySelector(".status") : null;
        const statusText = statusEl ? statusEl.textContent : "Unknown";
        const isAvail = statusEl && statusEl.classList.contains("available");
        if (modalTitle) modalTitle.textContent = name;
        if (modalSlots) modalSlots.textContent = slots;
        if (modalStatus) {
          modalStatus.textContent = statusText;
          modalStatus.className = isAvail ? "status available" : statusEl && statusEl.classList.contains("full") ? "status full" : "status almost-full";
        }
        if (modalReserveBtn)
          modalReserveBtn.dataset.id = card ? (card.dataset.id || "") : "";
        if (detailsModalOverlay) detailsModalOverlay.classList.add("active");
      }

      if (reserveBtn && !reserveBtn.disabled) {
        e.preventDefault();
        const id = reserveBtn.dataset.id || "";
        window.location.href = `bookslot.html${id ? "?id=" + encodeURIComponent(id) : ""}`;
      }
    });
  }

  // ── Modal close controls ────────────────────────────────────────────────
  if (modalCloseBtn && detailsModalOverlay) {
    modalCloseBtn.setAttribute("aria-label", "Close modal");
    modalCloseBtn.addEventListener("click", () => detailsModalOverlay.classList.remove("active"));
    detailsModalOverlay.addEventListener("click", (e) => {
      if (e.target === detailsModalOverlay) detailsModalOverlay.classList.remove("active");
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") detailsModalOverlay.classList.remove("active");
    });
  }

  if (modalReserveBtn) {
    modalReserveBtn.addEventListener("click", () => {
      const id = modalReserveBtn.dataset.id || "";
      if (detailsModalOverlay) detailsModalOverlay.classList.remove("active");
      window.location.href = `bookslot.html${id ? "?id=" + encodeURIComponent(id) : ""}`;
    });
  }

  // ── Map Pins ─────────────────────────────────────────────────────────────
  const mapCard = document.getElementById("mapCard");
  const mcTitle = document.getElementById("mcTitle");
  const mcSlots = document.getElementById("mcSlots");
  const mcReserveBtn = document.getElementById("mcReserveBtn");

  document.querySelectorAll(".pin").forEach(pin => {
    pin.addEventListener("click", () => {
      const pinId = pin.dataset.id;
      const data = liveParkingData.length > 0 ? liveParkingData : STATIC_LOCATIONS;
      const idx = parseInt(pinId, 10) - 1;
      const p = data[idx];
      if (p) {
        if (mcTitle) mcTitle.textContent = p.name;
        if (mcSlots) mcSlots.textContent = `${p.availableSlots} / ${p.totalSlots} Slots Available`;
        if (mcReserveBtn) mcReserveBtn.dataset.id = p._id || pinId;
        if (mapCard) mapCard.classList.add("active");
      }
    });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".map-container") && mapCard && mapCard.classList.contains("active")) {
      mapCard.classList.remove("active");
    }
  });

  if (mcReserveBtn) {
    mcReserveBtn.addEventListener("click", () => {
      const id = mcReserveBtn.dataset.id || "";
      window.location.href = `bookslot.html${id ? "?id=" + encodeURIComponent(id) : ""}`;
    });
  }

  // ── Search ────────────────────────────────────────────────────────────────
  const searchBtn = document.getElementById("searchBtn");
  const searchInput = document.getElementById("searchInput");
  if (searchBtn && searchInput) {
    searchBtn.addEventListener("click", () => {
      const q = searchInput.value.trim();
      if (q) window.location.href = `findparking.html?q=${encodeURIComponent(q)}`;
      else window.showToast ? window.showToast("Please enter a location to search", "warning") : alert("Please enter a location to search");
    });
    searchInput.addEventListener("keypress", (e) => { if (e.key === "Enter") searchBtn.click(); });
  }

  const findParkingNowBtn = document.getElementById("findParkingNowBtn");
  if (findParkingNowBtn)
    findParkingNowBtn.addEventListener("click", () => { window.location.href = "findparking.html"; });

  const viewMapBtn = document.getElementById("viewMapBtn");
  const mapContainer = document.querySelector(".right-panel");
  if (viewMapBtn && mapContainer) {
    viewMapBtn.addEventListener("click", () => {
      mapContainer.scrollIntoView({ behavior: "smooth", block: "center" });
      mapContainer.style.transition = "box-shadow 0.3s ease";
      mapContainer.style.boxShadow = "0 0 0 4px var(--primary)";
      setTimeout(() => { mapContainer.style.boxShadow = "var(--shadow-soft)"; }, 1500);
    });
  }
});

// ── C. Skeleton placeholder cards ────────────────────────────────────────────
function showSkeletons() {
  const list = document.querySelector(".parking-list");
  if (!list) return;
  list.innerHTML = `
    <div class="skeleton-card"><div class="skeleton sk-title"></div><div class="skeleton sk-line"></div><div class="skeleton sk-line short"></div></div>
    <div class="skeleton-card"><div class="skeleton sk-title"></div><div class="skeleton sk-line"></div><div class="skeleton sk-line short"></div></div>
    <div class="skeleton-card"><div class="skeleton sk-title"></div><div class="skeleton sk-line"></div><div class="skeleton sk-line short"></div></div>
    <div class="skeleton-card"><div class="skeleton sk-title"></div><div class="skeleton sk-line"></div><div class="skeleton sk-line short"></div></div>`;
}

// ── Fetch live parking data & update homepage cards ──────────────────────────
async function fetchAndUpdateParkingCards() {
  try {
    const res = await fetch(`${API}/parking`);
    const json = await res.json();
    const data = json.data || json;
    if (Array.isArray(data) && data.length > 0) {
      liveParkingData = data;
      updateParkingCards(data);
    } else {
      // DB is empty or no slots yet — show static demo data
      liveParkingData = STATIC_LOCATIONS;
      updateParkingCards(STATIC_LOCATIONS);
    }
  } catch (err) {
    console.warn("Backend offline — homepage showing static slot counts.", err);
    liveParkingData = STATIC_LOCATIONS;
    updateParkingCards(STATIC_LOCATIONS);
  }
}

// Render parking cards from scratch into .parking-list
// (showSkeletons() wipes the list innerHTML, so we must re-build, not patch)
function updateParkingCards(dataList) {
  const list = document.querySelector(".parking-list");
  if (!list) return;

  const favs = getFavourites(); /* T */

  // Build all card HTML at once
  list.innerHTML = dataList.map((p, idx) => {
    const isFull = p.availableSlots === 0;
    const isAlmost = !isFull && p.availableSlots < 4;
    const statusClass = isFull ? "full" : isAlmost ? "almost-full" : "available";
    const statusText = isFull ? "Full" : isAlmost ? "Almost Full" : "Available";
    const cardId = p._id || String(idx + 1);

    return `
      <div class="parking-card" data-id="${cardId}">
        <div class="card-header">
          <h3>${p.name}</h3>
          <span class="status ${statusClass}">${statusText}</span>
        </div>
        <p class="slots"><span>${p.availableSlots} / ${p.totalSlots}</span> Slots available</p>
        <div class="btn-group">
          <button class="btn btn-outline details">Details</button>
          <button class="btn btn-primary reserve" data-id="${cardId}"${isFull ? " disabled" : ""}>Reserve</button>
        </div>
      </div>`;
  }).join("");

  // After DOM is built, inject meters + fav buttons
  list.querySelectorAll(".parking-card").forEach((card, idx) => {
    const p = dataList[idx];
    if (!p) return;
    injectSlotMeter(card, p);      /* E */
    injectFavButton(card, p, favs); /* T */
  });
}

// ── E. Slot meter helper ──────────────────────────────────────────────────────
function injectSlotMeter(container, p) {
  const old = container.querySelector(".slot-meter");
  if (old) old.remove();

  const pct = p.totalSlots > 0
    ? Math.round(((p.totalSlots - p.availableSlots) / p.totalSlots) * 100)
    : 100;
  const fillColor = pct >= 90 ? "var(--meter-red)"
    : pct >= 60 ? "var(--meter-orange)"
      : "var(--meter-green)";

  const meter = document.createElement("div");
  meter.className = "slot-meter";
  meter.innerHTML = `<div class="slot-fill" style="width:0%;background:${fillColor}" data-pct="${pct}"></div>`;

  const slotsP = container.querySelector(".slots");
  if (slotsP) slotsP.insertAdjacentElement("afterend", meter);
  else container.appendChild(meter);

  requestAnimationFrame(() => {
    const fill = meter.querySelector(".slot-fill");
    if (fill) fill.style.width = pct + "%";
  });
}

// ── T. Favourites helpers ─────────────────────────────────────────────────────
function getFavourites() {
  try { return JSON.parse(localStorage.getItem("favourites") || "[]"); } catch { return []; }
}
function saveFavourites(favs) {
  localStorage.setItem("favourites", JSON.stringify(favs));
}

function injectFavButton(card, p, favs) {
  const oldFav = card.querySelector(".fav-btn");
  if (oldFav) oldFav.remove();

  const isFav = favs.includes(p._id);
  const btn = document.createElement("button");
  btn.className = `fav-btn${isFav ? " active" : ""}`;
  btn.title = isFav ? "Remove from favourites" : "Save to favourites";
  btn.setAttribute("aria-label", btn.title); /* DD */
  btn.innerHTML = isFav ? "❤️" : "🤍";

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    let f = getFavourites();
    if (f.includes(p._id)) {
      f = f.filter(id => id !== p._id);
      btn.className = "fav-btn";
      btn.innerHTML = "🤍";
      btn.title = "Save to favourites";
      if (window.showToast) window.showToast("Removed from favourites", "warning");
    } else {
      f.push(p._id);
      btn.className = "fav-btn active";
      btn.innerHTML = "❤️";
      btn.title = "Remove from favourites";
      if (window.showToast) window.showToast(`${p.name} saved to favourites ❤️`, "success");
    }
    saveFavourites(f);
  });

  // Insert in the btn-group
  const btnGroup = card.querySelector(".btn-group");
  if (btnGroup) btnGroup.prepend(btn);
  else card.appendChild(btn);
}
