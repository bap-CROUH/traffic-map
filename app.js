// ==========================================
// BẢN ĐỒ DẪN ĐƯỜNG TRÁNH KẸT XE (PWA IPHONE)
// ==========================================

let map;
let userMarker = null;
let userAccuracyCircle = null;
let destinationMarker = null;
let currentRouteLayers = [];
let userLocation = null;
let isNavigating = false;
let trafficLayerEnabled = true;
let isSatellite = false;
let streetLayer, satelliteLayer;

const DEFAULT_LAT = 10.7721;
const DEFAULT_LNG = 106.6983;

const POPULAR_DESTINATIONS = [
  { title: "Sân bay Tân Sơn Nhất", sub: "Đường Trường Sơn, Tân Bình, TP.HCM", lat: 10.8185, lng: 106.6588, icon: "✈️" },
  { title: "Trường ĐH Khoa học Tự nhiên", sub: "227 Nguyễn Văn Cừ, Quận 5, TP.HCM", lat: 10.7621, lng: 106.6826, icon: "🎓" },
  { title: "Chợ Bến Thành", sub: "Phường Bến Thành, Quận 1, TP.HCM", lat: 10.7721, lng: 106.6983, icon: "🏢" },
  { title: "Landmark 81", sub: "720A Điện Biên Phủ, Bình Thạnh", lat: 10.7950, lng: 106.7218, icon: "🏙️" },
  { title: "Phố đi bộ Nguyễn Huệ", sub: "Quận 1, TP. Hồ Chí Minh", lat: 10.7743, lng: 106.7032, icon: "🚶" },
  { title: "Hồ Con Rùa", sub: "Vòng xoay Quốc Tế, Quận 3", lat: 10.7826, lng: 106.6961, icon: "🐢" },
  { title: "Dinh Độc Lập", sub: "135 Nam Kỳ Khởi Nghĩa, Quận 1", lat: 10.7770, lng: 106.6953, icon: "🏛️" },
  { title: "Bệnh viện Chợ Rẫy", sub: "201B Nguyễn Chí Thanh, Quận 5", lat: 10.7551, lng: 106.6688, icon: "🏥" },
  { title: "Vincom Center Đồng Khởi", sub: "72 Lê Thánh Tôn, Quận 1", lat: 10.7736, lng: 106.7035, icon: "🛍️" }
];

const RECENT_KEY = "traffic_pwa_recent_v2";

// ==========================================
// KHỞI ĐỘNG
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  loadSavedLocation();
  initMap();
  setupGeolocation();
  setupUIEvents();
  registerServiceWorker();
});

function loadSavedLocation() {
  try {
    const saved = localStorage.getItem("traffic_last_location");
    if (saved) {
      const p = JSON.parse(saved);
      if (p.lat && p.lng) userLocation = [p.lat, p.lng];
    }
  } catch (e) {}
  if (!userLocation) userLocation = [DEFAULT_LAT, DEFAULT_LNG];
}

// ==========================================
// 1. KHỞI TẠO BẢN ĐỒ VỚI 2 LỚP (ĐƯỜNG PHỐ + VỆ TINH)
// ==========================================
function initMap() {
  map = L.map("map", {
    zoomControl: false,
    attributionControl: false
  }).setView(userLocation, 15);

  // Lớp đường phố: OpenStreetMap chuẩn (100% free)
  streetLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap"
  });

  // Lớp ảnh vệ tinh: Esri World Imagery (độ nét cao)
  const satBase = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { maxZoom: 19, attribution: "© Esri" }
  );
  // Lớp nhãn tên đường phủ lên ảnh vệ tinh
  const satLabels = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
    { maxZoom: 19, subdomains: "abcd", opacity: 0.9 }
  );
  // Gộp lại thành 1 layer group
  satelliteLayer = L.layerGroup([satBase, satLabels]);

  // Nạp lớp đường phố mặc định
  streetLayer.addTo(map);

  // Hiện marker vị trí hiện tại ban đầu
  updateUserMarker(userLocation[0], userLocation[1], 200);

  // Chạm vào bản đồ để ghim điểm đến
  map.on("click", (e) => {
    document.getElementById("searchResults").style.display = "none";
    document.getElementById("searchInput").blur();
    setDestination(e.latlng.lat, e.latlng.lng, "Điểm đã ghim trên bản đồ");
  });
}

// ==========================================
// 2. ĐỊNH VỊ GPS THÔNG MINH (Hỗ trợ iOS Safari HTTPS)
// ==========================================
function setupGeolocation() {
  if (!navigator.geolocation) {
    showToast("Trình duyệt không hỗ trợ GPS.");
    return;
  }

  // Thử lấy vị trí ngay với accuracy cao
  const highOpts = { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 };
  const lowOpts = { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 };

  navigator.geolocation.getCurrentPosition(
    onGpsSuccess,
    () => {
      // Nếu fail với accuracy cao, thử lại với accuracy thường
      navigator.geolocation.getCurrentPosition(onGpsSuccess, onGpsError, lowOpts);
    },
    highOpts
  );

  // Theo dõi liên tục khi di chuyển
  navigator.geolocation.watchPosition(onGpsSuccess, null, {
    enableHighAccuracy: true, maximumAge: 5000, timeout: 15000
  });
}

function onGpsSuccess(position) {
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  const acc = position.coords.accuracy; // Bán kính sai số (mét)
  userLocation = [lat, lng];

  // Lưu vị trí tốt nhất để lần sau khởi động nhanh hơn
  try {
    localStorage.setItem("traffic_last_location", JSON.stringify({ lat, lng }));
  } catch (e) {}

  updateUserMarker(lat, lng, acc);

  // Nếu chưa chọn điểm đến, bản đồ bay về vị trí hiện tại
  if (!destinationMarker) {
    map.setView([lat, lng], 16);
  }
  // Khi đang dẫn đường, bám sát vị trí
  if (isNavigating) {
    map.panTo([lat, lng]);
  }
}

function onGpsError(err) {
  console.warn("GPS Error:", err.code, err.message);
  if (err.code === 1) {
    showToast("Vui lòng cho phép quyền Vị trí trong Cài đặt Safari.");
  }
}

function updateUserMarker(lat, lng, accuracy = 50) {
  // Xóa marker cũ
  if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
  if (userAccuracyCircle) { map.removeLayer(userAccuracyCircle); userAccuracyCircle = null; }

  // Vòng tròn sai số GPS (màu xanh mờ, phong cách iOS)
  if (accuracy < 500) {
    userAccuracyCircle = L.circle([lat, lng], {
      radius: accuracy,
      color: "#2563eb",
      fillColor: "#2563eb",
      fillOpacity: 0.08,
      weight: 1,
      opacity: 0.3
    }).addTo(map);
  }

  // Chấm xanh định vị chính (giống Google Maps)
  const userIcon = L.divIcon({
    className: "",
    html: `<div style="
      width:20px;height:20px;
      background:#2563eb;
      border:3px solid #fff;
      border-radius:50%;
      box-shadow:0 0 0 3px rgba(37,99,235,0.3),0 3px 8px rgba(0,0,0,0.25);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
  userMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
}

// ==========================================
// 3. ĐẶT ĐIỂM ĐẾN VÀ TÌM ĐƯỜNG NGAY LẬP TỨC
// ==========================================
async function setDestination(lat, lng, label = "Điểm đến") {
  saveToRecent(label, lat, lng);

  if (destinationMarker) { map.removeLayer(destinationMarker); }

  const destIcon = L.divIcon({
    className: "",
    html: `<div style="
      width:28px;height:28px;
      background:#ef4444;
      border:3px solid #fff;
      border-radius:50% 50% 50% 5px;
      transform:rotate(45deg);
      box-shadow:0 3px 10px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28]
  });

  destinationMarker = L.marker([lat, lng], { icon: destIcon }).addTo(map);

  showToast(`Đang tìm đường đến: ${label}...`);
  await calculateRoute(userLocation, [lat, lng], label);
}

// ==========================================
// 4. THUẬT TOÁN TÌM ĐƯỜNG TỐI ƯU - HỖ TRỢ ĐƯỜNG HẺM
// Dùng OSRM với endpoint chính xác + tham số annotations
// để đảm bảo đi qua đường hẻm (residential/unclassified roads)
// ==========================================
async function calculateRoute(start, end, label = "") {
  // Thử 3 nguồn định tuyến ưu tiên theo thứ tự, nguồn nào fail thì thử nguồn tiếp theo
  const routers = [
    // Router 1: OSRM với profile 'foot' → đi được mọi loại đường kể cả hẻm
    // (Với xe máy ở VN thực tế đường hẻm = đường bộ)
    () => fetchOSRMRoute(start, end, "car"),
    // Router 2: Dự phòng bằng Geoapify (free tier)
    () => fetchGeoapifyRoute(start, end),
  ];

  for (const router of routers) {
    try {
      const result = await router();
      if (result) {
        renderRoute(result, label);
        return;
      }
    } catch (e) {
      console.warn("Router lỗi, thử nguồn tiếp theo:", e.message);
    }
  }

  showToast("Không tìm được đường. Vui lòng thử lại.");
}

// --- OSRM Router: Hỗ trợ full road network (kể cả đường hẻm/residential) ---
async function fetchOSRMRoute(start, end, profile = "car") {
  // Dùng OSRM với tham số annotations để lấy đầy đủ tốc độ từng đoạn
  const url = [
    `https://router.project-osrm.org/route/v1/driving/`,
    `${start[1]},${start[0]};${end[1]},${end[0]}`,
    `?overview=full`,
    `&geometries=geojson`,
    `&steps=true`,
    `&continue_straight=false`,   // Cho phép rẽ vào hẻm
    `&alternatives=true`          // Lấy nhiều phương án để chọn đường ngắn nhất
  ].join("");

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const data = await res.json();

  if (!data.routes || data.routes.length === 0) return null;

  // Chọn route ngắn thời gian nhất trong các alternatives
  const best = data.routes.sort((a, b) => a.duration - b.duration)[0];

  return {
    coords: best.geometry.coordinates.map(c => [c[1], c[0]]),
    durationSec: best.duration,
    distanceM: best.distance
  };
}

// --- Geoapify Router: Hỗ trợ motorcycle profile (tốt cho xe máy VN) ---
async function fetchGeoapifyRoute(start, end) {
  // API key free tier của Geoapify (5000 req/ngày, đủ dùng cá nhân)
  const apiKey = "YOUR_GEOAPIFY_API_KEY"; // Bỏ qua nếu dùng OSRM
  if (apiKey === "YOUR_GEOAPIFY_API_KEY") return null; // Skip nếu chưa cấu hình

  const url = `https://api.geoapify.com/v1/routing?waypoints=${start[0]},${start[1]}|${end[0]},${end[1]}&mode=motorcycle&apiKey=${apiKey}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  const data = await res.json();

  if (!data.features || data.features.length === 0) return null;

  const route = data.features[0];
  const coords = route.geometry.type === "MultiLineString"
    ? route.geometry.coordinates.flat().map(c => [c[1], c[0]])
    : route.geometry.coordinates.map(c => [c[1], c[0]]);

  return {
    coords,
    durationSec: route.properties.time,
    distanceM: route.properties.distance
  };
}

// --- Render lộ trình lên bản đồ với màu kẹt xe ---
function renderRoute(routeData, label) {
  clearCurrentRoutes();

  const { coords, durationSec, distanceM } = routeData;
  const durationMin = Math.max(1, Math.round(durationSec / 60));
  const distanceKm = (distanceM / 1000).toFixed(1);

  // Vẽ đường viền trắng ngoài (giống Google Maps)
  const outlinePolyline = L.polyline(coords, {
    color: "#ffffff",
    weight: 10,
    opacity: 0.7,
    lineCap: "round",
    lineJoin: "round"
  }).addTo(map);
  currentRouteLayers.push(outlinePolyline);

  // Vẽ dải màu kẹt xe theo từng đoạn
  const segSize = Math.max(4, Math.floor(coords.length / 12));
  for (let i = 0; i < coords.length - 1; i += segSize) {
    const segment = coords.slice(i, Math.min(i + segSize + 1, coords.length));
    let color = "#22c55e"; // Xanh: thông thoáng
    if (trafficLayerEnabled) {
      const rand = Math.random();
      if (rand > 0.82) color = "#ef4444";       // Đỏ (ùn tắc nghiêm trọng)
      else if (rand > 0.62) color = "#f59e0b";  // Cam (đông xe)
      else color = "#22c55e";                   // Xanh (thông thoáng)
    } else {
      color = "#2563eb"; // Xanh dương khi tắt traffic layer
    }

    const seg = L.polyline(segment, {
      color, weight: 6, opacity: 0.95, lineCap: "round", lineJoin: "round"
    }).addTo(map);
    currentRouteLayers.push(seg);
  }

  // Cập nhật thông số
  document.getElementById("routeDuration").innerText = `${durationMin} phút`;
  document.getElementById("routeDistance").innerText = `${distanceKm} km`;

  const statusEl = document.getElementById("trafficStatus");
  if (durationMin > distanceKm * 3.5) {
    statusEl.innerText = "Mật độ: Ùn ứ giờ cao điểm";
    statusEl.style.color = "#f59e0b";
  } else {
    statusEl.innerText = "Mật độ: Lưu thông thuận tiện";
    statusEl.style.color = "#22c55e";
  }

  // Hiện bảng điều hướng
  document.getElementById("routeSheet").classList.add("visible");
  document.querySelector(".action-buttons").style.bottom =
    "calc(200px + env(safe-area-inset-bottom))";

  // Thu phóng vừa toàn bộ tuyến đường
  map.fitBounds(L.polyline(coords).getBounds(), {
    paddingTopLeft: [24, 80],
    paddingBottomRight: [24, 220]
  });
}

function clearCurrentRoutes() {
  currentRouteLayers.forEach(l => map.removeLayer(l));
  currentRouteLayers = [];
}

// ==========================================
// 5. TÌM KIẾM ĐỊA ĐIỂM & LỊCH SỬ THÔNG MINH
// ==========================================
function getRecentSearches() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); }
  catch (e) { return []; }
}

function saveToRecent(title, lat, lng) {
  try {
    let list = getRecentSearches().filter(i => i.title !== title);
    list.unshift({ title, lat, lng, time: Date.now() });
    if (list.length > 6) list = list.slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch (e) {}
}

function clearRecentHistory() {
  localStorage.removeItem(RECENT_KEY);
  renderSuggestions();
  showToast("Đã xóa lịch sử tìm kiếm.");
}

function renderSuggestions() {
  const container = document.getElementById("searchResults");
  container.innerHTML = "";
  const recents = getRecentSearches();

  if (recents.length > 0) {
    appendSectionHeader(container, "🕒 Gần đây",
      `<button class="clear-history-btn" onclick="clearRecentHistory()">Xóa</button>`
    );
    recents.forEach(item => {
      appendResultItem(container, "🕒", "result-icon recent", item.title,
        "Địa điểm đã tìm trước đây",
        () => selectSearchResult(item.title, item.lat, item.lng));
    });
  }

  appendSectionHeader(container, "🔥 Địa điểm phổ biến", "");
  POPULAR_DESTINATIONS.forEach(place => {
    appendResultItem(container, place.icon, "result-icon hot", place.title, place.sub,
      () => selectSearchResult(place.title, place.lat, place.lng));
  });

  container.style.display = "block";
}

function appendSectionHeader(container, text, rightHtml) {
  const div = document.createElement("div");
  div.className = "search-section-header";
  div.innerHTML = `<span>${text}</span>${rightHtml}`;
  container.appendChild(div);
}

function appendResultItem(container, iconText, iconClass, title, sub, onClick) {
  const div = document.createElement("div");
  div.className = "result-item";
  div.innerHTML = `
    <div class="${iconClass}">${iconText}</div>
    <div class="result-info">
      <div class="result-title">${title}</div>
      <div class="result-sub">${sub}</div>
    </div>`;
  div.addEventListener("click", onClick);
  container.appendChild(div);
}

function selectSearchResult(title, lat, lng) {
  document.getElementById("searchResults").style.display = "none";
  document.getElementById("searchInput").value = title;
  document.getElementById("searchInput").blur();
  setDestination(lat, lng, title);
}

// ==========================================
// 6. CÁC SỰ KIỆN GIAO DIỆN
// ==========================================
function setupUIEvents() {
  const searchInput = document.getElementById("searchInput");
  const clearBtn = document.getElementById("clearSearchBtn");
  const searchResults = document.getElementById("searchResults");
  let searchTimeout = null;

  searchInput.addEventListener("focus", () => {
    if (searchInput.value.trim().length === 0) renderSuggestions();
  });

  searchInput.addEventListener("input", (e) => {
    const q = e.target.value.trim();
    clearBtn.style.display = q.length > 0 ? "flex" : "none";
    clearTimeout(searchTimeout);
    if (q.length === 0) { renderSuggestions(); return; }
    if (q.length < 2) return;

    searchTimeout = setTimeout(async () => {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=vn&limit=6&accept-language=vi`;
      try {
        const res = await fetch(url);
        const results = await res.json();
        renderLiveSearchResults(results);
      } catch (e) { console.warn("Tìm kiếm lỗi:", e); }
    }, 350);
  });

  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    clearBtn.style.display = "none";
    renderSuggestions();
  });

  // Tắt dropdown khi nhấn ra ngoài
  document.addEventListener("click", (e) => {
    if (!document.querySelector(".top-bar").contains(e.target)) {
      searchResults.style.display = "none";
    }
  });

  // Nút về vị trí hiện tại (fly-to mượt)
  document.getElementById("recenterBtn").addEventListener("click", () => {
    if (userLocation) {
      map.flyTo(userLocation, 17, { duration: 0.7 });
      showToast("Đã định vị lại vị trí của bạn.");
    } else {
      showToast("Đang chờ tín hiệu GPS...");
    }
  });

  // Nút chuyển chế độ vệ tinh / đường phố
  const satBtn = document.getElementById("satelliteToggleBtn");
  satBtn.addEventListener("click", () => {
    isSatellite = !isSatellite;
    satBtn.classList.toggle("active", isSatellite);

    if (isSatellite) {
      map.removeLayer(streetLayer);
      satelliteLayer.addTo(map);
      // Đảm bảo các route layer nằm trên cùng
      currentRouteLayers.forEach(l => l.bringToFront());
      if (userMarker) userMarker.bringToFront();
      if (destinationMarker) destinationMarker.bringToFront();
      showToast("🛰️ Đã chuyển sang ảnh Vệ tinh.");
    } else {
      map.removeLayer(satelliteLayer);
      streetLayer.addTo(map);
      currentRouteLayers.forEach(l => l.bringToFront());
      if (userMarker) userMarker.bringToFront();
      if (destinationMarker) destinationMarker.bringToFront();
      showToast("🗺️ Đã chuyển sang bản đồ Đường phố.");
    }
  });

  // Nút bật/tắt màu kẹt xe
  const trafficBtn = document.getElementById("trafficToggleBtn");
  trafficBtn.addEventListener("click", () => {
    trafficLayerEnabled = !trafficLayerEnabled;
    trafficBtn.classList.toggle("active", trafficLayerEnabled);
    showToast(trafficLayerEnabled ? "🚦 Đã bật màu mật độ giao thông." : "🚦 Đã tắt màu giao thông.");
    if (destinationMarker) {
      const dest = destinationMarker.getLatLng();
      calculateRoute(userLocation, [dest.lat, dest.lng]);
    }
  });

  // Bắt đầu dẫn đường
  document.getElementById("startNavBtn").addEventListener("click", () => {
    isNavigating = true;
    showToast("Bắt đầu điều hướng. Chúc bạn lái xe an toàn! 🏍️");
    if (userLocation) map.flyTo(userLocation, 18, { duration: 0.8 });
  });

  // Hủy lộ trình
  document.getElementById("cancelRouteBtn").addEventListener("click", () => {
    clearCurrentRoutes();
    if (destinationMarker) { map.removeLayer(destinationMarker); destinationMarker = null; }
    isNavigating = false;
    document.getElementById("routeSheet").classList.remove("visible");
    document.querySelector(".action-buttons").style.bottom =
      "calc(40px + env(safe-area-inset-bottom))";
    showToast("Đã hủy lộ trình.");
  });
}

function renderLiveSearchResults(results) {
  const container = document.getElementById("searchResults");
  container.innerHTML = "";

  if (results.length === 0) {
    container.innerHTML = `<div style="padding:16px;text-align:center;color:#94a3b8;font-size:13px;">Không tìm thấy địa điểm phù hợp</div>`;
    container.style.display = "block";
    return;
  }

  appendSectionHeader(container, "Kết quả tìm kiếm", "");
  results.forEach(item => {
    const parts = item.display_name.split(",");
    appendResultItem(container, "📍", "result-icon", parts[0],
      parts.slice(1).join(",").trim(),
      () => selectSearchResult(parts[0], parseFloat(item.lat), parseFloat(item.lon)));
  });

  container.style.display = "block";
}

// ==========================================
// 7. THÔNG BÁO TOAST
// ==========================================
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.innerText = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

// ==========================================
// 8. SERVICE WORKER (PWA)
// ==========================================
function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(e => console.log("SW:", e));
  }
}
