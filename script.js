const map = L.map("map").setView([39.10444, 35.12329], 6); 
const popup = L.popup();

L.control.zoom({ position: 'bottomright' }).addTo(map);

const loading = document.getElementById("loading");

const apiBaseUrl = "https://earthquake.usgs.gov";
const area =
  "maxlatitude=42.05&minlatitude=35.80&maxlongitude=44.82&minlongitude=25.98"; // turkey
const format = "geojson";


// localstorage
const startDateLocalStorage = localStorage.getItem('formattedStartDate');
const endDateLocalStorage = localStorage.getItem('formattedEndDate');
const minMagLocalStorage = localStorage.getItem('minMag');
const maxMagLocalStorage = localStorage.getItem('maxMag');
const userLatLocalStorage = localStorage.getItem('userLat');
const userLngLocalStorage = localStorage.getItem('userLng');
const userRadiusLocalStorage = localStorage.getItem('userRadius');

const defaultStartDate = Date.now() - 1 * 365 * 24 * 60 * 60 * 1000;
const defaultEndDate = Date.now();

let userMarker;
let minMag = minMagLocalStorage ? minMagLocalStorage : 5;
let maxMag = maxMagLocalStorage ? maxMagLocalStorage : 7;
let formattedStartDate = new Date(startDateLocalStorage ? startDateLocalStorage : defaultStartDate).toISOString();
let formattedEndDate = new Date(endDateLocalStorage ? endDateLocalStorage : defaultEndDate).toISOString();
let markers = new Array();

let userLat = userLatLocalStorage ? userLatLocalStorage : "";
let userLng = userLngLocalStorage ? userLngLocalStorage : "";
let userRadius = userRadiusLocalStorage ? userRadiusLocalStorage : "";

var centerLat = 39.10444; 
var centerLng = 35.12329; 
var radius = 150; 

// ------------ harita atamalari -------------------

const iconStyle = {
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
};

const greenIcon = L.icon({
  iconUrl:
    "https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  ...iconStyle,
});

const yellowIcon = L.icon({
  iconUrl:
    "https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png",
  ...iconStyle,
});

const orangeIcon = L.icon({
  iconUrl:
    "https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  ...iconStyle,
});

const redIcon = L.icon({
  iconUrl:
    "https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  ...iconStyle,
});

// ----------------------------------------- eventler ---------------------------------

const dateElement = document.getElementById("date");
const endDateElement = document.getElementById("endDate");
const minMagElement = document.getElementById("mag1");
const maxMagElement = document.getElementById("mag2");
const faultLine = document.querySelector("#faultLine");

const submitBtn = document.getElementById("submit");
const areaInput = document.getElementById("area-input");
const areaMenu = document.getElementById("area-menu");
const areaMenuContent = document.querySelector("#area-menu ul");
const positionalBtn = document.querySelector("#positional");
const arealBtn = document.querySelector("#areal");
const arealContainer = document.querySelector(".areal-container");
const positionalContainer = document.querySelector(".positional-container");
const totalEarthquake = document.querySelector(".header span");
const latInput = document.getElementById("lat-input");
const lngInput = document.getElementById("lng-input");
const userRadiusInput = document.getElementById("user-radius");

dateElement.value = startDateLocalStorage ? startDateLocalStorage.slice(0, 10) : formattedStartDate.slice(0, 10);
endDateElement.value = endDateLocalStorage ? endDateLocalStorage .slice(0, 10) : formattedEndDate.slice(0, 10);

latInput.value = userLatLocalStorage ? userLatLocalStorage : '';
lngInput.value = userLngLocalStorage ? userLngLocalStorage : '';
userRadiusInput.value = userRadiusLocalStorage ? userRadiusLocalStorage :'';
minMagElement.value = minMag;
maxMagElement.value = maxMag;
areaInput.value = radius;


minMagElement.addEventListener("change", ({ target }) => {
  minMag = target.value;
  localStorage.setItem('minMag', minMag);
});

maxMagElement.addEventListener("change", ({ target }) => {
  maxMag = target.value;
  localStorage.setItem('maxMag', maxMag);
});

dateElement.addEventListener("change", ({ target }) => {
  formattedStartDate = new Date(target.value).toISOString();
  localStorage.setItem('formattedStartDate', formattedStartDate);
});

endDateElement.addEventListener("change", ({ target }) => {
  formattedEndDate = new Date(target.value).toISOString();
  localStorage.setItem('formattedEndDate', formattedEndDate);
});

areaInput.addEventListener("keyup", ({ target }) => {
  radius = target.value;
  removeAllCircle();
  createCircle();
});

submitBtn.addEventListener("click", (event) => {
  event.preventDefault();
  apiRequest();
  zoomMap();
});

positionalBtn.addEventListener("click", (event) => {
  event.preventDefault();
  removeAllCircle();

  if (userLat.length > 0 && userLng.length > 0 && userRadius.length > 0)
    zoomMap();

  arealBtn.classList.remove("active");
  positionalBtn.classList.add("active");

  arealContainer.style.display = "none";
  positionalContainer.style.display = "block";

  removeAllCircle();
  areaInput.style.display = "none";
});

arealBtn.addEventListener("click", (event) => {
  event.preventDefault();
  removeAllCircle();
  positionalBtn.classList.remove("active");
  arealBtn.classList.add("active");

  positionalContainer.style.display = "none";
  arealContainer.style.display = "block";

  createCircle();
  areaInput.style.display = "block";
  cordinateZoom(centerLat, centerLng, 7);
});

latInput.addEventListener("change", function ({ target }) {
  userLat = target.value;
  localStorage.setItem('userLat', userLat);
});

lngInput.addEventListener("change", function ({ target }) {
  userLng = target.value;
  localStorage.setItem('userLng', userLng);
});

faultLine.addEventListener("click", function (event) {
  loading.style.display = "flex";
  event.preventDefault();
  const btnStatus = faultLine.classList.value;

  if (btnStatus === "active") {
    faultLine.classList.remove("active");
    removeAllPolyline();
    loading.style.display = "none";
  } else {
    faultLine.classList.add("active");
    getFaultLine();
  }
});

userRadiusInput.addEventListener("change", function ({ target }) {
  userRadius = target.value;
  localStorage.setItem('userRadius', userRadius);
});

// ---------------------------  UTILS  -------------------------------------------

function apiRequest() {
  loading.style.display = "flex";

  const endpoint = `${apiBaseUrl}/fdsnws/event/1/query?format=${format}&starttime=${formattedStartDate}&endtime=${formattedEndDate}&maxmagnitude=${maxMag}&minmagnitude=${minMag}&${area}`;

  fetch(endpoint)
    .then((response) => response.json())
    .then(({ features }) => {
      totalEarthquake.innerHTML = features.length;

      const optimizeData = dataParser(features);
      markers = optimizeData;

      removeAllMarker();
      optimizeData.forEach((feature) => {
        setTimeout(() => createMarker(feature), 100);
      });

      loading.style.display = "none";
    })
    .catch((error) => console.error(error));
}

function haversine(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = deg2rad(lat2 - lat1);
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c; 
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function createCircle() {
  const circle = L.circle([centerLat, centerLng], {
    color: "red", 
    fillColor: "#f03", 
    fillOpacity: 0.2, 
    radius: radius * 1000,
  }).addTo(map);

  calculateInCircle(centerLat, centerLng);

  circle.on({
    mousedown: function () {
      map.on("mousemove", function (e) {
        centerLat = e.latlng.lat;
        centerLng = e.latlng.lng;
        circle.setLatLng(e.latlng);
      });
    },
    mousemove: function () {
      map.dragging.disable();
    },
    mouseout: function () {
      map.dragging.enable();
    },
    mouseup: function () {
      calculateInCircle(centerLat, centerLng);
      cordinateZoom(centerLat, centerLng, null , true);

      setTimeout(() => {
        removeTileLayer();
        createTileLayer();

        removeAllMarker();
        markers.forEach((feature) => {
          setTimeout(() => createMarker(feature), 100);
        });
      }, 100);
    },
    click: function () {
      map.removeEventListener();
    },
  });
}

function removeAllCircle() {
  map.eachLayer(function (layer) {
    if (layer instanceof L.Circle) {
      map.removeLayer(layer);
    }
  });
}

function removeAllPolyline() {
  map.eachLayer(function (layer) {
    if (layer instanceof L.Polyline) {
      map.removeLayer(layer);
    }
  });
}

function createTileLayer() {
  L.tileLayer(
    "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiemV5bmVwYmFsdGEiLCJhIjoiY2wzN21xbGQyMDFrcDNibXFhdHFwZ2hyZiJ9.pMWr9RF_HntGAoRMnGKFMA",
    {
      maxZoom: 18,
      id: "mapbox/streets-v11",
      tileSize: 512,
      zoomOffset: -1,
      accessToken: "your.mapbox.access.token",
    }
  ).addTo(map);
}

function removeTileLayer() {
  map.eachLayer(function (layer) {
    if (layer instanceof L.TileLayer) {
      map.removeLayer(layer);
    }
  });
}

function dataParser(array) {
  const chunkSize = 100;
  const chunks = [];

  while (array.length) {
    chunks.push(array.splice(0, chunkSize));
  }

  return chunks;
}

function createMarker(feature) {
  feature.forEach((data) => {
    const [y, x] = data.geometry.coordinates; 
    const { place, mag, time } = data.properties; 

    const date = new Date(time);
    const formatDate = date.toLocaleDateString();

    const text = `
      <div>
        <div><b>${place}</b></div>
        <br/>
        <div>Büyüklük: ${mag}</div>
        <div>Tarih: ${formatDate}</div>
      </div>
    `;

    if (mag < 4) icon = greenIcon;
    else if (mag >= 4 && mag < 5) icon = yellowIcon;
    else if (mag >= 5 && mag < 7) icon = orangeIcon;
    else icon = redIcon;

    // marker'ı haritaya atıyoruz
    L.marker([x, y], { icon }).addTo(map).bindPopup(text);
  });
}

function removeAllMarker() {
  map.eachLayer((layer) => {
    if (layer instanceof L.Marker) map.removeLayer(layer);
  });
}

function calculateInCircle(dx, dy) {
  let distanceCount = 0;
  areaMenuContent.innerHTML = "";

  markers.forEach((data) => {
    setTimeout(() => {
      data.forEach((marker) => {
        const [y, x] = marker.geometry.coordinates; // depremin yaşandığı kordinat noktalarını seçiyoruz
        const { place, mag, time } = marker.properties; // depremin bilgilerini seçiyoruz

        const date = new Date(time);
        const formatDate = date.toLocaleDateString();

        var distance = haversine(dx, dy, x, y);

        if (distance < radius) {
          distanceCount++;
          areaMenuContent.innerHTML += `
          <li>
            <div class="menu-item">
              <div><b>${place}</b></div>
              <div>Tarih : ${formatDate}</div>
              <div id='getDeprem'>
              <span>Büyüklük : ${mag}</span>
              <span onclick="goOnCordinate(${x},${y},'${place}',${mag},${time})">Git<img src="./images/go-icon.png" alt="logo"></span>
            </div>
          </li>
          `;
        }
      });

      if (distanceCount > 0) areaMenu.style.display = "block";
      else areaMenu.style.display = "none";
    }, 100);
  });
}

function goOnCordinate(x, y, place, mag, time) {
  console.log(x, y, place, mag, time);
  const date = new Date(time);
  const formatDate = date.toLocaleDateString();

  // popup açıldığında gözükecek olan içeriği oluşturuyoruz
  const text = `
      <div>
        <div><b>${place}</b></div>
        <br/>
        <div>Büyüklük: ${mag}</div>
        <div>Tarih: ${formatDate}</div>
      </div>
    `;

  targetClearMarker(x, y);
  L.marker([x, y]).addTo(map).bindPopup(text);

  removeAllCircle();
  cordinateZoom(x, y, 10);
}

// bu fonksiyona verdiigm cordinatlardaki markeri kaldir
function targetClearMarker(x, y) {
  var markerCoordinates = L.latLng(x, y);
  map.eachLayer(function (layer) {
    // Eğer layer bir Marker ise ve koordinatlar eşleşiyorsa, layer'ı kaldırın
    if (
      layer instanceof L.Marker &&
      layer.getLatLng().equals(markerCoordinates)
    ) {
      map.removeLayer(layer);
    }
  });
}

function zoomMap() {
  removeAllCircle();
  // yakınlaştırılacak koordinatları belirleme
  if (!userLat && !userLng) return;
  if (!userRadius) userRadius = 10; // userRadius girilmemisse 10

  // var latlng = L.latLng(userLat, userLng);
  // map.setView(latlng, 7);

  setTimeout(() => {
    L.circle([userLat, userLng], {
      color: "green", // sınır rengi
      fillColor: "rgb(191, 255, 191)", // dolgu rengi
      fillOpacity: 0.2, // dolgu opaklığı
      radius: userRadius * 1000,
    }).addTo(map);

    var customIcon = L.icon({
      iconUrl: "./images/custom-icon.png", // ozek icon dosya yolu
      iconSize: [38, 38],
      iconAnchor: [19, 38],
    });

    userMarker = L.marker([userLat, userLng], { icon: customIcon }).addTo(map);
  }, 300);
  cordinateZoom(userLat, userLng);
  calculateInCircle(userLat, userLng);
}

function cordinateZoom(lat, lang, zoomValue = 8, zoomMapPassive = false) {
  // Kullanıcının seçtiği alanın koordinatlarını alın
  var targetCoordinate = L.latLng(lat, lang);
  if(!zoomMapPassive) map.setView(targetCoordinate, zoomValue);
  else map.setView(targetCoordinate);
}

map.on("zoomend", function (e) {
  // removeAllCircle();
});

//-----------------------------------------------

// fay hatlarini cekip dondurur
function getFaultLine() {
  fetch("./fay.json")
    .then((response) => response.json()) // veri cok buyuk oldugu icin ilk then'de veriyi bellege kaydediyoruz
    .then((data) => {
      // veri bloklarini donuyoruz
      data.forEach((faultLine) => {
        L.polyline(faultLine, { color: "red" }).addTo(map);
      });
      loading.style.display = "none";
    });
}

// sag ustte butonu hem olusturur hemde islevsellgiini kazandirir
function layerControl() {
  const tileLayerData = {
    normal: L.tileLayer(
      "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}",
      {
        maxZoom: 18,
        id: "mapbox/streets-v10",
        tileSize: 512,
        zoomOffset: -1,
        accessToken:
          "pk.eyJ1IjoiemV5bmVwYmFsdGEiLCJhIjoiY2wzN21xbGQyMDFrcDNibXFhdHFwZ2hyZiJ9.pMWr9RF_HntGAoRMnGKFMA",
      }
    ).addTo(map),
    // ------------------------------------------------------------------------------------------------------------------
    alternative: L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
      }
    ),
    // -------------------
    detail: L.tileLayer(
      "https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
      {
        maxZoom: 20,
        attribution:
          '&copy; OpenStreetMap France | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }
    ),
    countryBorders: L.tileLayer(
      "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>',
      }
    ),
    airport: L.tileLayer(
      "https://tileserver.memomaps.de/tilegen/{z}/{x}/{y}.png",
      {
        maxZoom: 18,
        attribution:
          'Map <a href="https://memomaps.de/">memomaps.de</a> <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }
    ),
    elevation: L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
      maxZoom: 17,
      attribution:
        'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    }),
    light: L.tileLayer(
      "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 20,
        attribution:
          '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
      }
    ),
    dark: L.tileLayer(
      "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 20,
        attribution:
          '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
      }
    ),

    realistic: L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution:
          "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
      }
    ),
  };

  var baseMaps = {
    "Varsayılan Görünüm": tileLayerData.normal,
    "Yükselti Haritası Görünümü": tileLayerData.elevation,
    "Uydu Görünümü": tileLayerData.realistic,
    "Alternatif Görünüm": tileLayerData.alternative,
    "Detaylı Görünüm": tileLayerData.detail,
    "Ülke Sınırları Görünümü": tileLayerData.countryBorders,
    "Hava Limanları Görünümü": tileLayerData.airport,
    "Sade Görünüm": tileLayerData.light,
    "Koyu Görünüm": tileLayerData.dark,
  };

  // Layer Control oluştur
  L.control.layers(baseMaps).addTo(map);

  // Layer Control'ü özelleştir
  var layerControlContainer = document.querySelector(".leaflet-control-layers");
  layerControlContainer.classList.add("layer-control");
}

// baslangicta yapilacak isler
apiRequest();
layerControl(); // sag ustte yer alan butonu aktif eder layerlari yukler