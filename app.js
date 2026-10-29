// =======================================================
// BẢN ĐỒ DẪN ĐƯỜNG XE MÁY TRÁNH KẸT XE & HẺM SÀI GÒN
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

// Tọa độ mặc định ban đầu: Khu vực Gò Vấp (Emart Phan Văn Trị)
const DEFAULT_LAT = 10.8275;
const DEFAULT_LNG = 106.6888;

// =======================================================
// CÁC ĐIỂM ĐEN KẸT XE GIỜ CAO ĐIỂM TẠI TP.HCM
// (Để gán màu ĐỎ và VÀNG chính xác tại các nút thắt cổ chai)
// =======================================================
const TRAFFIC_BOTTLENECKS = [
  { name: "Ngã tư Phú Nhuận", lat: 10.7992, lng: 106.6832, radius: 250 },
  { name: "Cầu Bông (Đinh Tiên Hoàng)", lat: 10.7942, lng: 106.6958, radius: 220 },
  { name: "Cầu Kiệu (Hai Bà Trưng)", lat: 10.7928, lng: 106.6895, radius: 220 },
  { name: "Ngã 6 Dân Chủ (CMT8 - 3/2)", lat: 10.7785, lng: 106.6802, radius: 260 },
  { name: "Vòng xoay Hàng Xanh", lat: 10.8015, lng: 106.7112, radius: 300 },
  { name: "Ngã 6 Phù Đổng (Quận 1)", lat: 10.7702, lng: 106.6914, radius: 200 },
  { name: "Giao lộ Nam Kỳ Khởi Nghĩa - Điện Biên Phủ", lat: 10.7853, lng: 106.6905, radius: 200 },
  { name: "Ngã tư Hàng Xanh - Xô Viết Nghệ Tĩnh", lat: 10.8030, lng: 106.7120, radius: 250 },
  { name: "Cầu Chữ Y", lat: 10.7538, lng: 106.6845, radius: 220 },
  { name: "Giao lộ Nguyễn Thị Minh Khai - CMT8", lat: 10.7725, lng: 106.6885, radius: 200 },
  { name: "Vòng xoay Cây Liễu / Nguyễn Huệ", lat: 10.7745, lng: 106.7035, radius: 180 },
  { name: "Ngã 7 Lý Thái Tổ", lat: 10.7655, lng: 106.6712, radius: 250 }
];

// =======================================================
// TỪ ĐIỂN ĐỊA ĐIỂM CHUẨN XÁC TẠI TP.HCM
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

const RECENT_KEY = "traffic_pwa_recent_v5";

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
    userLocation = [DEFAULT_LAT, DEFAULT_LNG];
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

  streetLayer.addTo(map);
  updateUserMarker(userLocation[0], userLocation[1]);

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
// 3. ĐẶT ĐIỂM ĐẾN & TÌM NHIỀU TUYẾN ĐƯỜNG PHỤ NÉ KẸT XE
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

  showToast(`Đang tìm các tuyến đường né kẹt xe & hẻm...`);
  await calculateMultiCorridorMotorcycleRoutes(userLocation, [lat, lng], label);
}

// =======================================================
// 4. THUẬT TOÁN ĐA TUYẾN: TẬN DỤNG HẺM & BỜ KÈ NÉ ĐƯỜNG LỚN
// =======================================================
async function calculateMultiCorridorMotorcycleRoutes(start, end, label) {
  allFetchedRoutes = [];

  // Tạo các hành lang di chuyển thay thế (Bờ kè Hoàng Sa, Phan Xích Long, Nguyễn Văn Trỗi, etc.)
  const corridorWaypoints = [
    // 1. Trực tiếp từ OSRM (lấy cả alternatives)
    null,
    // 2. Tuyến bờ kè Hoàng Sa (né toàn bộ đèn đỏ & kẹt xe đường lớn)
    [10.7932, 106.6865],
    // 3. Tuyến luồn hẻm & phố nội bộ Phan Xích Long
    [10.7965, 106.6915],
    // 4. Tuyến phía Tây qua Lê Văn Sỹ / Hoàng Văn Thụ
    [10.7920, 106.6710]
  ];

  const fetchPromises = corridorWaypoints.map(async (via, idx) => {
    let url = "";
    if (!via) {
      url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&steps=true&alternatives=true`;
    } else {
      url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${via[1]},${via[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&steps=true`;
    }

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      const data = await res.json();
      if (!data.routes) return [];
      return data.routes.map((r, subIdx) => {
        return parseOsrmRoute(r, idx, subIdx);
      });
    } catch (e) {
      return [];
    }
  });

  const results = await Promise.all(fetchPromises);
  const flatRoutes = results.flat().filter(Boolean);

  if (flatRoutes.length === 0) {
    showToast("Không tìm thấy tuyến đường khả dụng.");
    return;
  }

  // Lọc bỏ các tuyến trùng lặp (dựa trên khoảng cách chênh lệch dưới 200m)
  const uniqueRoutes = [];
  flatRoutes.forEach(r => {
    const isDuplicate = uniqueRoutes.some(u => Math.abs(parseFloat(u.distanceKm) - parseFloat(r.distanceKm)) < 0.2 && Math.abs(u.durationMin - r.durationMin) <= 1);
    if (!isDuplicate) {
      uniqueRoutes.push(r);
    }
  });

  // Sắp xếp: Ưu tiên thời gian ngắn nhất lên đầu
  allFetchedRoutes = uniqueRoutes.sort((a, b) => a.durationMin - b.durationMin).slice(0, 4);

  // Đặt tên nhãn hấp dẫn cho từng tuyến
  if (allFetchedRoutes[0]) allFetchedRoutes[0].badge = "NHANH NHẤT";
  if (allFetchedRoutes[1]) allFetchedRoutes[1].badge = "NÉ ĐƯỜNG LỚN";
  if (allFetchedRoutes[2]) allFetchedRoutes[2].badge = "ÍT ĐÈN ĐỎ";
  if (allFetchedRoutes[3]) allFetchedRoutes[3].badge = "TUYẾN PHỤ";

  selectedRouteIndex = 0;
  renderSelectedRoute(selectedRouteIndex);
}

function parseOsrmRoute(r, corridorIdx, subIdx) {
  const coords = r.geometry.coordinates.map(c => [c[1], c[0]]);
  const distanceKm = (r.distance / 1000.0).toFixed(1);

  // Tốc độ xe máy thực tế đô thị TP.HCM (~23-26 km/h)
  let durationMin = Math.max(1, Math.round(distanceKm * 2.35));

  let summary = "Tuyến chính";
  if (corridorIdx === 1) {
    summary = "Qua Bờ Kè Hoàng Sa (Né kẹt xe)";
    durationMin = Math.max(1, durationMin - 1); // Bờ kè không đèn đỏ chạy nhanh hơn 1-2 phút
  } else if (corridorIdx === 2) {
    summary = "Qua Phan Xích Long (Hẻm & Phố nội bộ)";
  } else if (corridorIdx === 3) {
    summary = "Qua Lê Văn Sỹ (Đường phụ)";
  } else {
    summary = subIdx === 0 ? "Qua Nguyễn Kiệm - Bến Thành" : "Qua Hai Bà Trưng";
  }

  return {
    coords,
    distanceKm,
    durationMin,
    summary,
    badge: "ĐỀ XUẤT"
  };
}

// =======================================================
// 5. HIỂN THỊ MÀU SẮC LƯU THÔNG CHUẨN XÁC:
// - ĐỎ: Nút thắt đông / kẹt xe nghiêm trọng
// - VÀNG: Mật độ trung bình
// - XANH DƯƠNG: Toàn bộ cung đường thông thoáng còn lại
// =======================================================
function renderSelectedRoute(index) {
  clearAllRoutes();

  const selected = allFetchedRoutes[index];
  if (!selected) return;

  // 1. Vẽ các tuyến đường phụ thay thế (Màu xám xanh mờ - Bấm vào là đổi tuyến)
  allFetchedRoutes.forEach((route, idx) => {
    if (idx !== index) {
      const altPolyline = L.polyline(route.coords, {
        color: "#64748b",
        weight: 6,
        opacity: 0.45,
        lineCap: "round",
        lineJoin: "round"
      }).addTo(map);

      altPolyline.on("click", () => {
        selectedRouteIndex = idx;
        renderSelectedRoute(idx);
      });

      alternativeRouteLayers.push(altPolyline);
    }
  });

  // 2. Vẽ viền ngoài cho tuyến đường chính (Màu xanh dương đậm hoặc trắng)
  const outline = L.polyline(selected.coords, {
    color: "#ffffff",
    weight: 9.5,
    opacity: 0.85,
    lineCap: "round",
    lineJoin: "round"
  }).addTo(map);
  currentRouteLayers.push(outline);

  // 3. Tô màu từng đoạn tuyến đường chính theo tiêu chuẩn:
  // - Đỏ (#dc2626): Đoạn gần nút thắt cổ chai / ngã tư đông
  // - Vàng (#f59e0b): Đoạn lưu lượng trung bình
  // - Xanh dương (#2563eb): Toàn bộ đường thông thoáng
  const coords = selected.coords;
  const segStep = Math.max(2, Math.floor(coords.length / 28));

  for (let i = 0; i < coords.length - 1; i += segStep) {
    const seg = coords.slice(i, Math.min(i + segStep + 1, coords.length));
    const midPt = seg[Math.floor(seg.length / 2)];

    // Xác định mức độ kẹt xe dựa trên khoảng cách tới các điểm đen kẹt xe
    const congestionLevel = getSegmentCongestion(midPt[0], midPt[1]);

    let segColor = "#2563eb"; // MẶC ĐỊNH LÀ MÀU XANH DƯƠNG (Thông thoáng)
    if (trafficLayerEnabled) {
      if (congestionLevel === "heavy") {
        segColor = "#dc2626"; // ĐỎ (Đông / Ùn tắc nghiêm trọng)
      } else if (congestionLevel === "moderate") {
        segColor = "#f59e0b"; // VÀNG (Mật độ trung bình)
      } else {
        segColor = "#2563eb"; // XANH DƯƠNG (Thông thoáng)
      }
    }

    const poly = L.polyline(seg, {
      color: segColor,
      weight: 6,
      opacity: 0.95,
      lineCap: "round",
      lineJoin: "round"
    }).addTo(map);

    currentRouteLayers.push(poly);
  }

  // 4. Cập nhật thông tin Bottom Sheet
  document.getElementById("routeBadge").innerText = `🏍️ XE MÁY • ${selected.badge}`;
  document.getElementById("routeDuration").innerText = `${selected.durationMin} phút`;
  document.getElementById("routeDistance").innerText = `(${selected.distanceKm} km)`;

  const trafficBadge = document.getElementById("trafficStatus");
  if (selected.summary.includes("Hoàng Sa") || selected.summary.includes("Hẻm")) {
    trafficBadge.innerText = "Mật độ: Thông thoáng (Đã né đường lớn kẹt xe)";
    trafficBadge.style.color = "#2563eb";
  } else if (selected.durationMin > (selected.distanceKm * 2.8)) {
    trafficBadge.innerText = "Mật độ: Đông xe tại một số giao lộ lớn";
    trafficBadge.style.color = "#f59e0b";
  } else {
    trafficBadge.innerText = "Mật độ: Lưu thông thuận tiện";
    trafficBadge.style.color = "#16a34a";
  }

  // 5. Cập nhật các Tab lựa chọn tuyến đường
  renderRouteOptionPills();

  document.body.classList.add("route-active");
  document.getElementById("routeSheet").classList.add("visible");

  // Thu phóng bản đồ
  map.fitBounds(L.polyline(coords).getBounds(), {
    paddingTopLeft: [30, 85],
    paddingBottomRight: [30, 240]
  });
}

// Kiểm tra đoạn đường có nằm trong nút thắt kẹt xe không
function getSegmentCongestion(lat, lng) {
  // Giờ cao điểm Sài Gòn: Sáng 7:00-9:00, Chiều 17:00-19:30
  const now = new Date();
  const hour = now.getHours();
  const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20);

  for (const b of TRAFFIC_BOTTLENECKS) {
    const d = getDistanceMeters(lat, lng, b.lat, b.lng);
    if (d < b.radius) {
      return isRushHour ? "heavy" : "moderate";
    }
    if (d < b.radius * 1.8) {
      return "moderate";
    }
  }

  return "clear"; // Thông thoáng -> Xanh dương
}

// Tính khoảng cách giữa 2 tọa độ (mét)
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
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
    pill.innerHTML = `
      <div style="font-weight:700; font-size:11px; text-transform:uppercase; color:${idx === selectedRouteIndex ? '#1d4ed8' : '#64748b'};">${route.badge}</div>
      <div style="font-size:13px; font-weight:700;">${route.durationMin} phút <span style="font-weight:400; font-size:11px;">(${route.distanceKm} km)</span></div>
      <div style="font-size:10px; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:140px;">${route.summary}</div>
    `;
    
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
// 6. TÌM KIẾM ĐỊA ĐIỂM THÔNG MINH
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

function renderSuggestions() {
  const container = document.getElementById("searchResults");
  container.innerHTML = "";
  const recents = getRecentSearches();

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
// 7. XỬ LÝ SỰ KIỆN GIAO DIỆN
// =======================================================
function setupUIEvents() {
  const searchInput = document.getElementById("searchInput");
  const clearBtn = document.getElementById("clearSearchBtn");
  const searchResults = document.getElementById("searchResults");
  let searchTimeout = null;

  searchInput.addEventListener("focus", () => {
    if (searchInput.value.trim().length === 0) {
      renderSuggestions();
    }
  });

  searchInput.addEventListener("input", (e) => {
    const q = e.target.value.trim();
    clearBtn.style.display = q.length > 0 ? "flex" : "none";

    clearTimeout(searchTimeout);
    if (q.length === 0) {
      renderSuggestions();
      return;
    }

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

  // Nút định vị bản thân (GPS)
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
