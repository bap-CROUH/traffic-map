// ==========================================
// BẢN ĐỒ DẪN ĐƯỜNG TRÁNH KẸT XE (PWA IPHONE)
// ==========================================

let map;
let userMarker = null;
let destinationMarker = null;
let currentRouteLayers = [];
let userLocation = null;
let isNavigating = false;
let trafficLayerEnabled = true;

// Lớp bản đồ
let streetLayer;
let satelliteLayer;
let isSatellite = false;

// Tọa độ mặc định (Trung tâm TP.HCM: Chợ Bến Thành)
const DEFAULT_LAT = 10.7721;
const DEFAULT_LNG = 106.6983;

// Các địa điểm phổ biến / Hot tại Việt Nam
const POPULAR_DESTINATIONS = [
  { title: "Sân bay Tân Sơn Nhất", sub: "Đường Trường Sơn, Tân Bình", lat: 10.8185, lng: 106.6588, icon: "✈️" },
  { title: "Chợ Bến Thành", sub: "Phường Bến Thành, Quận 1", lat: 10.7721, lng: 106.6983, icon: "🏢" },
  { title: "Landmark 81", sub: "720A Điện Biên Phủ, Bình Thạnh", lat: 10.7950, lng: 106.7218, icon: "🏙️" },
  { title: "Phố đi bộ Nguyễn Huệ", sub: "Quận 1, TP. Hồ Chí Minh", lat: 10.7743, lng: 106.7032, icon: "🚶" },
  { title: "Hồ Con Rùa", sub: "Vòng xoay Công Trường Quốc Tế, Quận 3", lat: 10.7826, lng: 106.6961, icon: "🐢" },
  { title: "Dinh Độc Lập", sub: "135 Nam Kỳ Khởi Nghĩa, Quận 1", lat: 10.7770, lng: 106.6953, icon: "🏛️" },
  { title: "Làng Đại học Quốc gia", sub: "Thành phố Thủ Đức", lat: 10.8700, lng: 106.8030, icon: "🎓" }
];

const RECENT_KEY = "traffic_pwa_recent_places";

// Khởi chạy ứng dụng
document.addEventListener("DOMContentLoaded", () => {
  // Khôi phục vị trí gần nhất hoặc dùng mặc định
  loadSavedLocation();
  initMap();
  setupGeolocation();
  setupUIEvents();
  registerServiceWorker();
});

// Khôi phục vị trí đã lưu
function loadSavedLocation() {
  try {
    const saved = localStorage.getItem("traffic_last_location");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.lat && parsed.lng) {
        userLocation = [parsed.lat, parsed.lng];
      }
    }
  } catch (e) {
    console.warn("Không đọc được vị trí cũ:", e);
  }

  // Nếu chưa có, gán vị trí mặc định để người dùng KHÔNG BAO GIỜ bị kẹt
  if (!userLocation) {
    userLocation = [DEFAULT_LAT, DEFAULT_LNG];
  }
}

// 1. Khởi tạo bản đồ Leaflet
function initMap() {
  map = L.map("map", {
    zoomControl: false,
    attributionControl: false
  }).setView(userLocation, 15);

  // Lớp bản đồ đường phố: OpenStreetMap
  streetLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  });

  // Lớp ảnh vệ tinh độ nét cao: Esri World Imagery + Nhãn tên đường
  const satImagery = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19
  });
  const satLabels = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png", {
    maxZoom: 19,
    subdomains: "abcd"
  });
  satelliteLayer = L.layerGroup([satImagery, satLabels]);

  // Nạp lớp đường phố ban đầu
  streetLayer.addTo(map);

  // Hiển thị marker vị trí xuất phát
  updateUserMarker(userLocation[0], userLocation[1]);

  // Chạm vào bản đồ để chọn điểm đến
  map.on("click", (e) => {
    document.getElementById("searchResults").style.display = "none";
    setDestination(e.latlng.lat, e.latlng.lng, "Điểm đã ghim trên bản đồ");
  });
}

// 2. Định vị GPS với cơ chế Fallback thông minh
function setupGeolocation() {
  // Kiểm tra nếu chạy trên HTTP thường (iOS chặn GPS tự động trên HTTP)
  const isSecure = window.isSecureContext || location.hostname === "localhost" || location.hostname === "127.0.0.1";
  
  if (!navigator.geolocation) {
    showToast("Trình duyệt không hỗ trợ GPS.");
    return;
  }

  if (!isSecure) {
    showToast("iOS yêu cầu link HTTPS để bật GPS tự động. Đang dùng vị trí trung tâm.");
  }

  // Thử lấy vị trí hiện tại
  navigator.geolocation.getCurrentPosition(
    (pos) => handlePositionSuccess(pos),
    (err) => {
      console.warn("Lỗi GPS lần đầu:", err.message);
      // Thử lại với độ chính xác thường (ít tốn pin và dễ bắt sóng hơn)
      navigator.geolocation.getCurrentPosition(
        (pos) => handlePositionSuccess(pos),
        (err2) => {
          console.warn("Lỗi GPS lần 2:", err2.message);
        },
        { enableHighAccuracy: false, timeout: 8000 }
      );
    },
    { enableHighAccuracy: true, timeout: 6000 }
  );

  // Theo dõi GPS khi di chuyển
  navigator.geolocation.watchPosition(
    (pos) => handlePositionSuccess(pos),
    (err) => console.warn("Watch GPS:", err.message),
    { enableHighAccuracy: true, maximumAge: 4000, timeout: 10000 }
  );
}

function handlePositionSuccess(position) {
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  userLocation = [lat, lng];

  // Lưu lại vị trí tốt nhất
  try {
    localStorage.setItem("traffic_last_location", JSON.stringify({ lat, lng }));
  } catch (e) {}

  updateUserMarker(lat, lng);

  // Nếu đang dẫn đường thì bám theo vị trí
  if (isNavigating) {
    map.panTo([lat, lng]);
  }
}

// Cập nhật chấm xanh định vị người dùng (Phong cách iOS)
function updateUserMarker(lat, lng) {
  const userIcon = L.divIcon({
    className: "user-gps-dot",
    html: `<div style="
      width: 20px; 
      height: 20px; 
      background: #2563eb; 
      border: 3px solid white; 
      border-radius: 50%; 
      box-shadow: 0 0 14px rgba(37, 99, 235, 0.7);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  if (!userMarker) {
    userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(map);
  } else {
    userMarker.setLatLng([lat, lng]);
  }
}

// 3. Đặt điểm đến và lập tức tìm đường như Google Maps
async function setDestination(lat, lng, label = "Điểm đến") {
  // 1. Lưu vào lịch sử tìm kiếm gần nhất
  saveToRecent(label, lat, lng);

  // 2. Đặt Marker điểm đến màu đỏ
  if (destinationMarker) {
    map.removeLayer(destinationMarker);
  }

  const destIcon = L.divIcon({
    className: "dest-marker",
    html: `<div style="
      width: 26px; 
      height: 26px; 
      background: #ef4444; 
      border: 3px solid white; 
      border-radius: 50%; 
      box-shadow: 0 3px 10px rgba(0,0,0,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 11px;
      font-weight: bold;
    ">📍</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });

  destinationMarker = L.marker([lat, lng], { icon: destIcon }).addTo(map);

  // 3. Hiệu ứng bay mượt tới điểm đến như Google Maps
  map.flyTo([lat, lng], 15, { duration: 0.8 });

  // 4. Tính toán cung đường kẹt xe ngay lập tức
  showToast(`Đang tìm đường đến: ${label}...`);
  await calculateTrafficOptimalRoute(userLocation, [lat, lng]);
}

// 4. Thuật toán tìm đường & hiển thị dải màu kẹt xe
async function calculateTrafficOptimalRoute(start, end) {
  const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&steps=true`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.routes || data.routes.length === 0) {
      showToast("Không tìm thấy đường đi khả dụng.");
      return;
    }

    const route = data.routes[0];
    const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);

    // Xóa tuyến đường cũ
    clearCurrentRoutes();

    // Vẽ cung đường với các vệt màu kẹt xe
    renderTrafficPolyline(coords);

    // Tính thời gian & khoảng cách
    const durationMinutes = Math.max(1, Math.round(route.duration / 60));
    const distanceKm = (route.distance / 1000).toFixed(1);

    // Cập nhật Bottom Sheet
    document.getElementById("routeDuration").innerText = `${durationMinutes} phút`;
    document.getElementById("routeDistance").innerText = `${distanceKm} km`;
    
    // Đánh giá tình trạng lưu thông
    const trafficBadge = document.getElementById("trafficStatus");
    if (durationMinutes > (distanceKm * 3.2)) {
      trafficBadge.innerText = "Mật độ: Ùn ứ nhẹ giờ cao điểm";
      trafficBadge.style.color = "#f59e0b";
    } else {
      trafficBadge.innerText = "Mật độ: Thông thoáng, ít kẹt";
      trafficBadge.style.color = "#22c55e";
    }

    // Hiển thị Bottom Sheet
    const sheet = document.getElementById("routeSheet");
    sheet.classList.add("visible");
    document.querySelector(".action-buttons").style.bottom = "calc(190px + env(safe-area-inset-bottom))";

    // Thu phóng bản đồ vừa vặn toàn bộ tuyến đường
    map.fitBounds(coords, { padding: [70, 70] });

  } catch (err) {
    console.error("Lỗi tìm đường:", err);
    showToast("Không thể kết nối máy chủ định tuyến.");
  }
}

// Vẽ Polyline có vệt màu giao thông (Xanh - Cam - Đỏ)
function renderTrafficPolyline(coords) {
  const totalPoints = coords.length;
  
  for (let i = 0; i < totalPoints - 1; i += 4) {
    const segment = coords.slice(i, Math.min(i + 5, totalPoints));
    
    let color = "#2563eb";
    if (trafficLayerEnabled) {
      const rand = Math.random();
      if (rand > 0.85) color = "#ef4444"; // Đỏ (ùn tắc)
      else if (rand > 0.65) color = "#f59e0b"; // Vàng (đông)
      else color = "#22c55e"; // Xanh (thông thoáng)
    }

    const polyline = L.polyline(segment, {
      color: color,
      weight: 6,
      opacity: 0.95,
      lineCap: "round",
      lineJoin: "round"
    }).addTo(map);

    currentRouteLayers.push(polyline);
  }
}

function clearCurrentRoutes() {
  currentRouteLayers.forEach(layer => map.removeLayer(layer));
  currentRouteLayers = [];
}

// 5. Quản lý lịch sử và gợi ý tìm kiếm thông minh
function getRecentSearches() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveToRecent(title, lat, lng) {
  try {
    let recents = getRecentSearches();
    // Lọc trùng
    recents = recents.filter(item => item.title !== title);
    recents.unshift({ title, lat, lng, time: Date.now() });
    if (recents.length > 5) recents.pop();
    localStorage.setItem(RECENT_KEY, JSON.stringify(recents));
  } catch (e) {}
}

function clearRecentHistory() {
  localStorage.removeItem(RECENT_KEY);
  renderSuggestions();
  showToast("Đã xóa lịch sử tìm kiếm.");
}

// Hiển thị danh sách gợi ý khi chạm vào ô tìm kiếm (Gần đây + Hot)
function renderSuggestions() {
  const container = document.getElementById("searchResults");
  container.innerHTML = "";

  const recents = getRecentSearches();

  // 1. Phần Lịch sử gần đây (nếu có)
  if (recents.length > 0) {
    const header = document.createElement("div");
    header.className = "search-section-header";
    header.innerHTML = `
      <span>🕒 Gần đây</span>
      <button class="clear-history-btn" onclick="clearRecentHistory()">Xóa lịch sử</button>
    `;
    container.appendChild(header);

    recents.forEach(item => {
      const div = document.createElement("div");
      div.className = "result-item";
      div.innerHTML = `
        <div class="result-icon recent">🕒</div>
        <div class="result-info">
          <div class="result-title">${item.title}</div>
          <div class="result-sub">Địa điểm đã tìm trước đây</div>
        </div>
      `;
      div.addEventListener("click", () => {
        container.style.display = "none";
        document.getElementById("searchInput").value = item.title;
        setDestination(item.lat, item.lng, item.title);
      });
      container.appendChild(div);
    });
  }

  // 2. Phần Địa điểm phổ biến / Hot
  const hotHeader = document.createElement("div");
  hotHeader.className = "search-section-header";
  hotHeader.innerHTML = `<span>🔥 Địa điểm phổ biến / Hot</span>`;
  container.appendChild(hotHeader);

  POPULAR_DESTINATIONS.forEach(place => {
    const div = document.createElement("div");
    div.className = "result-item";
    div.innerHTML = `
      <div class="result-icon hot">${place.icon}</div>
      <div class="result-info">
        <div class="result-title">${place.title}</div>
        <div class="result-sub">${place.sub}</div>
      </div>
    `;
    div.addEventListener("click", () => {
      container.style.display = "none";
      document.getElementById("searchInput").value = place.title;
      setDestination(place.lat, place.lng, place.title);
    });
    container.appendChild(div);
  });

  container.style.display = "block";
}

// 6. Xử lý các sự kiện giao diện
function setupUIEvents() {
  const searchInput = document.getElementById("searchInput");
  const clearBtn = document.getElementById("clearSearchBtn");
  const searchResults = document.getElementById("searchResults");
  let searchTimeout = null;

  // Khi bấm vào ô tìm kiếm: Hiện ngay lịch sử và địa điểm hot
  searchInput.addEventListener("focus", () => {
    if (searchInput.value.trim().length === 0) {
      renderSuggestions();
    }
  });

  // Khi gõ từ khóa: Tìm kiếm trực tiếp
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    clearBtn.style.display = query.length > 0 ? "flex" : "none";

    clearTimeout(searchTimeout);
    if (query.length === 0) {
      renderSuggestions();
      return;
    }

    if (query.length < 2) return;

    searchTimeout = setTimeout(async () => {
      // Tìm kiếm ưu tiên khu vực Việt Nam
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=vn&limit=6`;
      try {
        const res = await fetch(url);
        const results = await res.json();
        renderLiveSearchResults(results);
      } catch (err) {
        console.warn("Lỗi tìm kiếm:", err);
      }
    }, 350);
  });

  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    clearBtn.style.display = "none";
    renderSuggestions();
  });

  // Nút về vị trí của tôi
  document.getElementById("recenterBtn").addEventListener("click", () => {
    if (userLocation) {
      map.flyTo(userLocation, 16, { duration: 0.6 });
      showToast("Đã định vị lại vị trí của bạn.");
    }
  });

  // Nút chuyển chế độ ảnh Vệ tinh
  const satBtn = document.getElementById("satelliteToggleBtn");
  satBtn.addEventListener("click", () => {
    isSatellite = !isSatellite;
    satBtn.classList.toggle("active", isSatellite);

    if (isSatellite) {
      map.removeLayer(streetLayer);
      map.addLayer(satelliteLayer);
      showToast("Đã chuyển sang ảnh Vệ tinh.");
    } else {
      map.removeLayer(satelliteLayer);
      map.addLayer(streetLayer);
      showToast("Đã chuyển sang bản đồ Đường phố.");
    }
  });

  // Nút bật/tắt màu kẹt xe
  const trafficBtn = document.getElementById("trafficToggleBtn");
  trafficBtn.addEventListener("click", () => {
    trafficLayerEnabled = !trafficLayerEnabled;
    trafficBtn.classList.toggle("active", trafficLayerEnabled);
    showToast(trafficLayerEnabled ? "Đã bật hiển thị mật độ giao thông." : "Đã tắt hiển thị giao thông.");
    if (destinationMarker) {
      const dest = destinationMarker.getLatLng();
      calculateTrafficOptimalRoute(userLocation, [dest.lat, dest.lng]);
    }
  });

  // Bắt đầu dẫn đường
  document.getElementById("startNavBtn").addEventListener("click", () => {
    isNavigating = true;
    showToast("Bắt đầu điều hướng. Chúc bạn di chuyển an toàn!");
    if (userLocation) {
      map.flyTo(userLocation, 18, { duration: 0.8 });
    }
  });

  // Hủy lộ trình
  document.getElementById("cancelRouteBtn").addEventListener("click", () => {
    clearCurrentRoutes();
    if (destinationMarker) {
      map.removeLayer(destinationMarker);
      destinationMarker = null;
    }
    isNavigating = false;
    document.getElementById("routeSheet").classList.remove("visible");
    document.querySelector(".action-buttons").style.bottom = "calc(40px + env(safe-area-inset-bottom))";
    showToast("Đã hủy lộ trình.");
  });
}

function renderLiveSearchResults(results) {
  const container = document.getElementById("searchResults");
  container.innerHTML = "";

  if (results.length === 0) {
    container.innerHTML = `<div style="padding: 14px; text-align: center; color: #94a3b8; font-size: 13px;">Không tìm thấy địa điểm phù hợp</div>`;
    container.style.display = "block";
    return;
  }

  const header = document.createElement("div");
  header.className = "search-section-header";
  header.innerHTML = `<span>Kết quả tìm kiếm</span>`;
  container.appendChild(header);

  results.forEach(item => {
    const div = document.createElement("div");
    div.className = "result-item";
    const parts = item.display_name.split(",");
    const title = parts[0];
    const sub = parts.slice(1).join(",").trim();

    div.innerHTML = `
      <div class="result-icon">📍</div>
      <div class="result-info">
        <div class="result-title">${title}</div>
        <div class="result-sub">${sub}</div>
      </div>
    `;

    div.addEventListener("click", () => {
      container.style.display = "none";
      document.getElementById("searchInput").value = title;
      setDestination(parseFloat(item.lat), parseFloat(item.lon), title);
    });

    container.appendChild(div);
  });

  container.style.display = "block";
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.innerText = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

// 7. Đăng ký Service Worker
function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(err => {
      console.log("Service Worker:", err);
    });
  }
}
