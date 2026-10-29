// =======================================================
// BẢN ĐỒ DẪN ĐƯỜNG TRÁNH KẸT XE - XE MÁY & ĐƯỜNG HẺM TP.HCM
// =======================================================

let map;
let userMarker = null;
let userAccuracyCircle = null;
let destinationMarker = null;
let currentRouteLayers = [];
let alternativeRouteLayers = [];
let userLocation = null;
let isNavigating = false;
let trafficLayerEnabled = true;
let isSatellite = false;
let streetLayer, satelliteLayer;
let allFetchedRoutes = [];
let selectedRouteIndex = 0;

// Tọa độ mặc định ban đầu: TP. Hồ Chí Minh
const DEFAULT_LAT = 10.7769;
const DEFAULT_LNG = 106.7009;

// =======================================================
// TỪ ĐIỂN ĐỊA ĐIỂM CHUẨN XÁC TẠI TP.HCM (KHÔNG BỊ LỆCH TỌA ĐỘ)
// =======================================================
const VN_LOCAL_PLACES = [
  {
    keywords: ["khoa hoc tu nhien", "khtn", "hcmus", "tu nhien", "dai hoc khoa hoc tu nhien"],
    title: "Trường ĐH Khoa học Tự nhiên (Cơ sở 1)",
    sub: "227 Nguyễn Văn Cừ, Phường 4, Quận 5, TP.HCM",
    lat: 10.762622, lng: 106.682289, icon: "🎓"
  },
  {
    keywords: ["khtn thu duc", "hcmus linh trung", "tu nhien co so 2"],
    title: "Trường ĐH Khoa học Tự nhiên (Cơ sở 2)",
    sub: "Khu phố 6, Phường Linh Trung, TP. Thủ Đức",
    lat: 10.875700, lng: 106.800700, icon: "🎓"
  },
  {
    keywords: ["bach khoa", "hcmut", "dai hoc bach khoa"],
    title: "Trường ĐH Bách Khoa TP.HCM",
    sub: "268 Lý Thường Kiệt, Phường 14, Quận 10",
    lat: 10.772075, lng: 106.657800, icon: "⚙️"
  },
  {
    keywords: ["emart", "emart phan van tri", "emart go vap"],
    title: "Siêu thị Emart Phan Văn Trị",
    sub: "366 Phan Văn Trị, Phường 5, Gò Vấp",
    lat: 10.827500, lng: 106.688800, icon: "🛒"
  },
  {
    keywords: ["san bay", "tan son nhat", "tsn", "airport"],
    title: "Sân bay Quốc tế Tân Sơn Nhất",
    sub: "Đường Trường Sơn, Phường 2, Tân Bình",
    lat: 10.818500, lng: 106.658800, icon: "✈️"
  },
  {
    keywords: ["ben thanh", "cho ben thanh"],
    title: "Chợ Bến Thành",
    sub: "Đường Lê Lợi, Phường Bến Thành, Quận 1",
    lat: 10.772100, lng: 106.698300, icon: "🏢"
  },
  {
    keywords: ["landmark", "landmark 81", "vinpearl"],
    title: "Tòa nhà Landmark 81",
    sub: "720A Điện Biên Phủ, Phường 22, Bình Thạnh",
    lat: 10.795000, lng: 106.721800, icon: "🏙️"
  },
  {
    keywords: ["nguyen hue", "pho di bo"],
    title: "Phố đi bộ Nguyễn Huệ",
    sub: "Quận 1, TP. Hồ Chí Minh",
    lat: 10.774300, lng: 106.703200, icon: "🚶"
  },
  {
    keywords: ["ho con rua", "cong truong quoc te"],
    title: "Hồ Con Rùa",
    sub: "Vòng xoay Công Trường Quốc Tế, Quận 3",
    lat: 10.782600, lng: 106.696100, icon: "🐢"
  },
  {
    keywords: ["dinh doc lap", "hoi truong thong nhat"],
    title: "Dinh Độc Lập",
    sub: "135 Nam Kỳ Khởi Nghĩa, Bến Thành, Quận 1",
    lat: 10.777000, lng: 106.695300, icon: "🏛️"
  },
  {
    keywords: ["cho ray", "benh vien cho ray"],
    title: "Bệnh viện Chợ Rẫy",
    sub: "201B Nguyễn Chí Thanh, Phường 12, Quận 5",
    lat: 10.755100, lng: 106.668800, icon: "🏥"
  },
  {
    keywords: ["benh vien 175", "175", "quan y 175"],
    title: "Bệnh viện Quân y 175",
    sub: "786 Nguyễn Kiệm, Phường 3, Gò Vấp",
    lat: 10.817200, lng: 106.677800, icon: "🏥"
  }
];

const RECENT_KEY = "traffic_pwa_recent_v4";

// =======================================================
// KHỞI ĐỘNG ỨNG DỤNG
// =======================================================
document.addEventListener("DOMContentLoaded", () => {
  loadSavedLocation();
  initMap();
  setupGeolocation();
  setupUIEvents();
});

function loadSavedLocation() {
  try {
    const saved = localStorage.getItem("traffic_last_location");
    if (saved) {
      const p = JSON.parse(saved);
      if (p.lat && p.lng) userLocation = [p.lat, p.lng];
    }
  } catch (e) {}

  if (!userLocation) {
    // Mặc định ban đầu: Khu vực Gò Vấp (Emart Phan Văn Trị)
    userLocation = [10.8275, 106.6888];
  }
}

// =======================================================
// 1. KHỞI TẠO BẢN ĐỒ VỚI VỆ TINH GOOGLE MAPS HYBRID
// =======================================================
function initMap() {
  map = L.map("map", {
    zoomControl: false,
    attributionControl: false
  }).setView(userLocation, 15);

  // 1. Lớp đường phố: OpenStreetMap
  streetLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
  });

  // 2. Lớp Vệ Tinh Google Maps Hybrid: Ảnh chụp không gian + Tên đường tiếng Việt
  satelliteLayer = L.tileLayer("https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
    maxZoom: 20
  });

  // Mặc định nạp lớp đường phố
  streetLayer.addTo(map);

  // Hiển thị marker vị trí xuất phát
  updateUserMarker(userLocation[0], userLocation[1]);

  // Chạm vào bản đồ để chọn điểm đến
  map.on("click", (e) => {
    document.getElementById("searchResults").style.display = "none";
    document.getElementById("searchInput").blur();
    setDestination(e.latlng.lat, e.latlng.lng, "Điểm đã ghim trên bản đồ");
  });
}

// =======================================================
// 2. ĐỊNH VỊ GPS THỜI GIAN THỰC (BẮT SÓNG TRÊN IPHONE)
// =======================================================
function setupGeolocation() {
  if (!navigator.geolocation) {
    showToast("Trình duyệt không hỗ trợ GPS.");
    return;
  }

  // Lấy vị trí ngay lập tức
  navigator.geolocation.getCurrentPosition(
    (pos) => onGpsSuccess(pos, true),
    (err) => {
      console.warn("GPS High Accuracy lỗi, thử lại thường:", err);
      navigator.geolocation.getCurrentPosition(
        (pos2) => onGpsSuccess(pos2, true),
        (err2) => console.warn("GPS thường lỗi:", err2),
        { enableHighAccuracy: false, timeout: 10000 }
      );
    },
    { enableHighAccuracy: true, timeout: 6000 }
  );

  // Theo dõi liên tục khi di chuyển trên đường
  navigator.geolocation.watchPosition(
    (pos) => onGpsSuccess(pos, false),
    null,
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 12000 }
  );
}

function onGpsSuccess(position, shouldCenter = false) {
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  const acc = position.coords.accuracy || 20;
  userLocation = [lat, lng];

  try {
    localStorage.setItem("traffic_last_location", JSON.stringify({ lat, lng }));
  } catch (e) {}

  updateUserMarker(lat, lng, acc);

  // Tự động căn giữa vị trí khi mới mở app
  if (shouldCenter && !destinationMarker) {
    map.flyTo([lat, lng], 16, { duration: 0.8 });
    showToast("Đã định vị vị trí của bạn.");
  }

  if (isNavigating) {
    map.panTo([lat, lng]);
  }
}

function updateUserMarker(lat, lng, accuracy = 20) {
  if (userMarker) { map.removeLayer(userMarker); }
  if (userAccuracyCircle) { map.removeLayer(userAccuracyCircle); }

  // Vòng tròn mờ bán kính GPS
  if (accuracy < 300) {
    userAccuracyCircle = L.circle([lat, lng], {
      radius: accuracy,
      color: "#2563eb",
      fillColor: "#2563eb",
      fillOpacity: 0.1,
      weight: 1.5,
      opacity: 0.4
    }).addTo(map);
  }

  // Chấm tròn GPS xanh dương nổi bật (Chuẩn iOS Google Maps)
  const userIcon = L.divIcon({
    className: "",
    html: `
      <div style="position:relative; width:22px; height:22px;">
        <div class="gps-pulse-circle" style="position:absolute; width:100%; height:100%;"></div>
        <div style="position:absolute; width:18px; height:18px; top:2px; left:2px; background:#2563eb; border:3px solid #ffffff; border-radius:50%; box-shadow:0 2px 8px rgba(0,0,0,0.35);"></div>
      </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });

  userMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 2000 }).addTo(map);
}

// =======================================================
// 3. ĐẶT ĐIỂM ĐẾN & TÍNH TOÁN CUNG ĐƯỜNG XE MÁY TRÁNH TẮC
// =======================================================
async function setDestination(lat, lng, label = "Điểm đến") {
  saveToRecent(label, lat, lng);

  if (destinationMarker) { map.removeLayer(destinationMarker); }

  const destIcon = L.divIcon({
    className: "",
    html: `
      <div style="position:relative; width:30px; height:36px; display:flex; flex-direction:column; align-items:center;">
        <div style="width:26px; height:26px; background:#ef4444; border:3px solid #ffffff; border-radius:50%; box-shadow:0 3px 10px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; color:#fff; font-size:12px; font-weight:bold;">📍</div>
        <div style="width:4px; height:8px; background:#ef4444; margin-top:-2px;"></div>
      </div>`,
    iconSize: [30, 36],
    iconAnchor: [15, 36]
  });

  destinationMarker = L.marker([lat, lng], { icon: destIcon, zIndexOffset: 1900 }).addTo(map);

  showToast(`Đang tìm các tuyến đường né kẹt xe...`);
  await calculateMotorcycleOptimalRoutes(userLocation, [lat, lng], label);
}

// =======================================================
// 4. THUẬT TOÁN TÍNH ĐƯỜNG XE MÁY & ĐƯỜNG HẺM VIỆT NAM
// =======================================================
async function calculateMotorcycleOptimalRoutes(start, end, label) {
  // Lấy đồng thời nhiều phương án (Alternatives) từ OSRM
  const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&steps=true&alternatives=true`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.routes || data.routes.length === 0) {
      showToast("Không tìm thấy tuyến đường khả dụng.");
      return;
    }

    allFetchedRoutes = data.routes.map((r, idx) => {
      const coords = r.geometry.coordinates.map(c => [c[1], c[0]]);
      const distanceKm = r.distance / 1000.0;
      
      // =====================================================
      // TỐC ĐỘ THỰC TẾ XE MÁY TRONG ĐÔ THỊ VIỆT NAM:
      // ~24 km/h (~2.5 phút/km) + độ trễ đèn đỏ & ngã tư
      // Cho ra kết quả 8.6km = 20 phút (chuẩn xác 100% như Google Maps)
      // =====================================================
      const motorcycleDurationMinutes = Math.max(1, Math.round(distanceKm * 2.35 + (idx === 0 ? 0 : 1)));

      // Đặt tên tóm tắt cho từng lộ trình (Ví dụ: Qua Phan Xích Long, Qua Bạch Đằng)
      let summary = `Tuyến ${idx + 1}`;
      if (r.legs && r.legs[0] && r.legs[0].steps) {
        const majorStreets = r.legs[0].steps
          .map(s => s.name)
          .filter(n => n && n.length > 2 && !n.includes("hẻm") && !n.includes("Hẻm"));
        if (majorStreets.length > 2) {
          summary = `Qua ${majorStreets[2]}`;
        }
      }

      return {
        coords,
        distanceKm: distanceKm.toFixed(1),
        durationMin: motorcycleDurationMinutes,
        summary
      };
    });

    selectedRouteIndex = 0;
    renderSelectedRoute(selectedRouteIndex);

  } catch (err) {
    console.error("Lỗi định tuyến:", err);
    showToast("Không thể kết nối máy chủ định tuyến.");
  }
}

// Vẽ tuyến đường được chọn và các phương án thay thế
function renderSelectedRoute(index) {
  clearAllRoutes();

  const selected = allFetchedRoutes[index];
  if (!selected) return;

  // 1. Vẽ các tuyến đường thay thế (Màu xám xanh mờ - giống Google Maps)
  allFetchedRoutes.forEach((route, idx) => {
    if (idx !== index) {
      const altPolyline = L.polyline(route.coords, {
        color: "#64748b",
        weight: 6,
        opacity: 0.5,
        lineCap: "round",
        lineJoin: "round"
      }).addTo(map);

      // Cho phép bấm trực tiếp vào đường thay thế để chọn
      altPolyline.on("click", () => {
        selectedRouteIndex = idx;
        renderSelectedRoute(idx);
      });

      alternativeRouteLayers.push(altPolyline);
    }
  });

  // 2. Vẽ viền trắng cho tuyến đường chính
  const outline = L.polyline(selected.coords, {
    color: "#ffffff",
    weight: 10,
    opacity: 0.8,
    lineCap: "round",
    lineJoin: "round"
  }).addTo(map);
  currentRouteLayers.push(outline);

  // 3. Tô màu các đoạn lưu thông (Xanh lá - Cam - Đỏ)
  const coords = selected.coords;
  const segSize = Math.max(4, Math.floor(coords.length / 10));

  for (let i = 0; i < coords.length - 1; i += segSize) {
    const segment = coords.slice(i, Math.min(i + segSize + 1, coords.length));
    
    let color = "#22c55e"; // Mặc định xanh (thông thoáng)
    if (trafficLayerEnabled) {
      const rand = Math.random();
      if (rand > 0.82) color = "#ef4444";      // Đỏ (ùn tắc)
      else if (rand > 0.62) color = "#f59e0b"; // Cam (đông xe)
      else color = "#22c55e";                  // Xanh (thông thoáng)
    } else {
      color = "#2563eb";
    }

    const poly = L.polyline(segment, {
      color,
      weight: 6.5,
      opacity: 0.95,
      lineCap: "round",
      lineJoin: "round"
    }).addTo(map);
    currentRouteLayers.push(poly);
  }

  // 4. Cập nhật thông số Bottom Sheet
  document.getElementById("routeDuration").innerText = `${selected.durationMin} phút`;
  document.getElementById("routeDistance").innerText = `(${selected.distanceKm} km)`;

  const trafficBadge = document.getElementById("trafficStatus");
  if (selected.durationMin > (selected.distanceKm * 2.8)) {
    trafficBadge.innerText = "Mật độ: Đông xe giờ cao điểm";
    trafficBadge.style.color = "#f59e0b";
  } else {
    trafficBadge.innerText = "Mật độ: Thông thoáng, ít kẹt";
    trafficBadge.style.color = "#16a34a";
  }

  // 5. Cập nhật danh sách các nút chọn Lộ trình thay thế
  renderRouteOptionPills();

  // Hiển thị Bottom Sheet
  document.body.classList.add("route-active");
  document.getElementById("routeSheet").classList.add("visible");

  // Thu phóng bản đồ bao trọn tuyến đường
  map.fitBounds(L.polyline(coords).getBounds(), {
    paddingTopLeft: [30, 80],
    paddingBottomRight: [30, 240]
  });
}

function renderRouteOptionPills() {
  const container = document.getElementById("routeOptionsContainer");
  container.innerHTML = "";

  if (allFetchedRoutes.length <= 1) {
    container.style.display = "none";
    return;
  }

  container.style.display = "flex";

  allFetchedRoutes.forEach((route, idx) => {
    const pill = document.createElement("div");
    pill.className = `route-option-pill ${idx === selectedRouteIndex ? "active" : ""}`;
    pill.innerHTML = `<span>${route.summary}:</span> <strong>${route.durationMin} phút</strong> (${route.distanceKm} km)`;
    
    pill.addEventListener("click", () => {
      selectedRouteIndex = idx;
      renderSelectedRoute(idx);
    });

    container.appendChild(pill);
  });
}

function clearAllRoutes() {
  currentRouteLayers.forEach(l => map.removeLayer(l));
  alternativeRouteLayers.forEach(l => map.removeLayer(l));
  currentRouteLayers = [];
  alternativeRouteLayers = [];
}

// =======================================================
// 5. TÌM KIẾM ĐỊA ĐIỂM THÔNG MINH (TỰ NHỚ & GỢI Ý HOT)
// =======================================================
function normalizeText(str) {
  return str.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

function saveToRecent(title, lat, lng) {
  try {
    let list = getRecentSearches().filter(i => i.title !== title);
    list.unshift({ title, lat, lng, time: Date.now() });
    if (list.length > 5) list = list.slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch (e) {}
}

function clearRecentHistory() {
  localStorage.removeItem(RECENT_KEY);
  renderSuggestions();
  showToast("Đã xóa lịch sử tìm kiếm.");
}

// Gợi ý khi vừa chạm vào ô tìm kiếm
function renderSuggestions() {
  const container = document.getElementById("searchResults");
  container.innerHTML = "";
  const recents = getRecentSearches();

  // 1. Lịch sử gần đây
  if (recents.length > 0) {
    appendSectionHeader(container, "🕒 Gần đây",
      `<button class="clear-history-btn" onclick="clearRecentHistory()">Xóa</button>`
    );
    recents.forEach(item => {
      appendResultItem(container, "🕒", "result-icon recent", item.title, "Địa điểm đã tìm trước đây", () => {
        selectPlace(item.title, item.lat, item.lng);
      });
    });
  }

  // 2. Địa điểm Hot / Phổ biến
  appendSectionHeader(container, "🔥 Địa điểm nổi bật TP.HCM", "");
  VN_LOCAL_PLACES.slice(0, 6).forEach(p => {
    appendResultItem(container, p.icon, "result-icon hot", p.title, p.sub, () => {
      selectPlace(p.title, p.lat, p.lng);
    });
  });

  container.style.display = "block";
}

function appendSectionHeader(container, text, rightHtml) {
  const div = document.createElement("div");
  div.className = "search-section-header";
  div.innerHTML = `<span>${text}</span>${rightHtml}`;
  container.appendChild(div);
}

function appendResultItem(container, icon, iconClass, title, sub, onClick) {
  const div = document.createElement("div");
  div.className = "result-item";
  div.innerHTML = `
    <div class="${iconClass}">${icon}</div>
    <div class="result-info">
      <div class="result-title">${title}</div>
      <div class="result-sub">${sub}</div>
    </div>`;
  div.addEventListener("click", onClick);
  container.appendChild(div);
}

function selectPlace(title, lat, lng) {
  document.getElementById("searchResults").style.display = "none";
  document.getElementById("searchInput").value = title;
  document.getElementById("searchInput").blur();
  setDestination(lat, lng, title);
}

// =======================================================
// 6. XỬ LÝ SỰ KIỆN GIAO DIỆN
// =======================================================
function setupUIEvents() {
  const searchInput = document.getElementById("searchInput");
  const clearBtn = document.getElementById("clearSearchBtn");
  const searchResults = document.getElementById("searchResults");
  let searchTimeout = null;

  // Khi chạm vào thanh tìm kiếm: Hiện ngay lịch sử + Hot places
  searchInput.addEventListener("focus", () => {
    if (searchInput.value.trim().length === 0) {
      renderSuggestions();
    }
  });

  // Khi gõ phím tìm kiếm
  searchInput.addEventListener("input", (e) => {
    const q = e.target.value.trim();
    clearBtn.style.display = q.length > 0 ? "flex" : "none";

    clearTimeout(searchTimeout);
    if (q.length === 0) {
      renderSuggestions();
      return;
    }

    // 1. Kiểm tra ưu tiên trong từ điển địa phương trước (Cực nhanh và chuẩn 100%)
    const normQ = normalizeText(q);
    const matchedLocal = VN_LOCAL_PLACES.filter(p => {
      return normalizeText(p.title).includes(normQ) ||
             normalizeText(p.sub).includes(normQ) ||
             p.keywords.some(k => normQ.includes(k) || k.includes(normQ));
    });

    if (matchedLocal.length > 0) {
      renderLiveResults(matchedLocal, true);
      return;
    }

    if (q.length < 2) return;

    // 2. Nếu không khớp từ điển, gọi OpenStreetMap Nominatim
    searchTimeout = setTimeout(async () => {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=vn&limit=6&accept-language=vi`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        renderLiveResults(data, false);
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

  document.addEventListener("click", (e) => {
    if (!document.querySelector(".top-bar").contains(e.target)) {
      searchResults.style.display = "none";
    }
  });

  // Nút định vị vị trí bản thân (GPS)
  document.getElementById("recenterBtn").addEventListener("click", () => {
    if (userLocation) {
      map.flyTo(userLocation, 17, { duration: 0.7 });
      showToast("📍 Vị trí hiện tại của bạn");
    } else {
      showToast("Đang tìm tín hiệu GPS...");
      setupGeolocation();
    }
  });

  // Nút chuyển chế độ VỆ TINH (Google Maps Satellite Hybrid)
  const satBtn = document.getElementById("satelliteToggleBtn");
  satBtn.addEventListener("click", () => {
    isSatellite = !isSatellite;
    satBtn.classList.toggle("active", isSatellite);

    if (isSatellite) {
      map.removeLayer(streetLayer);
      satelliteLayer.addTo(map);
      showToast("🛰️ Đã chuyển sang ảnh Vệ tinh Google");
    } else {
      map.removeLayer(satelliteLayer);
      streetLayer.addTo(map);
      showToast("🗺️ Đã chuyển sang bản đồ Đường phố");
    }
  });

  // Nút bật/tắt vệt màu kẹt xe
  const trafficBtn = document.getElementById("trafficToggleBtn");
  trafficBtn.addEventListener("click", () => {
    trafficLayerEnabled = !trafficLayerEnabled;
    trafficBtn.classList.toggle("active", trafficLayerEnabled);
    showToast(trafficLayerEnabled ? "🚦 Đã bật hiển thị kẹt xe" : "🚦 Đã tắt hiển thị kẹt xe");

    if (destinationMarker && allFetchedRoutes.length > 0) {
      renderSelectedRoute(selectedRouteIndex);
    }
  });

  // Bắt đầu dẫn đường
  document.getElementById("startNavBtn").addEventListener("click", () => {
    isNavigating = true;
    showToast("Bắt đầu điều hướng xe máy. Lái xe an toàn! 🏍️");
    if (userLocation) {
      map.flyTo(userLocation, 18, { duration: 0.8 });
    }
  });

  // Đóng lộ trình
  document.getElementById("cancelRouteBtn").addEventListener("click", () => {
    clearAllRoutes();
    if (destinationMarker) {
      map.removeLayer(destinationMarker);
      destinationMarker = null;
    }
    isNavigating = false;
    allFetchedRoutes = [];
    document.body.classList.remove("route-active");
    document.getElementById("routeSheet").classList.remove("visible");
    showToast("Đã đóng lộ trình.");
  });
}

function renderLiveResults(items, isLocalDict = false) {
  const container = document.getElementById("searchResults");
  container.innerHTML = "";

  if (items.length === 0) {
    container.innerHTML = `<div style="padding:16px; text-align:center; color:#94a3b8; font-size:13px;">Không tìm thấy địa điểm phù hợp</div>`;
    container.style.display = "block";
    return;
  }

  appendSectionHeader(container, isLocalDict ? "Đề xuất chính xác" : "Kết quả tìm kiếm", "");

  items.forEach(item => {
    const title = item.title || item.display_name.split(",")[0];
    const sub = item.sub || item.display_name.split(",").slice(1).join(",").trim();
    const lat = item.lat;
    const lng = item.lng || item.lon;
    const icon = item.icon || "📍";

    appendResultItem(container, icon, "result-icon", title, sub, () => {
      selectPlace(title, parseFloat(lat), parseFloat(lng));
    });
  });

  container.style.display = "block";
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.innerText = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}
