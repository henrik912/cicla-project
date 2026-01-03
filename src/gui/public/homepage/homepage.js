import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  query,
  limit,
  onSnapshot,
  addDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import {
  getDatabase,
  ref,
  set
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// --- Firebase config ---
const firebaseConfig = {
  apiKey: "AIzaSyAYJwO4MKFSCfM4iHUTuJTzTzGRkBKrtTI",
  authDomain: "cicla-project.firebaseapp.com",
  projectId: "cicla-project",
  storageBucket: "cicla-project.firebasestorage.app",
  messagingSenderId: "943033387656",
  appId: "1:943033387656:web:c08795f4eed3a73279ad3d",
  databaseURL: "https://cicla-project-default-rtdb.europe-west1.firebasedatabase.app"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 🔥 Realtime Database (for IoT gate control)
const rtdb = getDatabase(app);


// 🔥 GLOBALS
let homeCard, navbar, menuBtn, logo, accountBtn, mapArea, findNearestBtn, helpBtn;
let currentPopup = null;
let currentInfoWindow = null;
let mapClickListener = null;
let escKeyListener = null;
let googleMap = null;
let userLocationMarker = null;
let directionsService = null;
let directionsRenderer = null;
let parkingOverlay = null;
let parkingHistoryDrawer = null;
let parkingCloseBtn = null;
let db, userBikesUnsubscribe = null;
let currentUser = null; // store logged‑in user

let placeholderParkingHistory = [
  {
    date: "2025-11-28",
    time: "14:32",
    duration: "2h 15m",
    cost: "1.2 €"
  },
  {
    date: "2025-11-27",
    time: "09:15",
    duration: "1h 45m",
    cost: "0.9 €"
  },
  {
    date: "2025-11-26",
    time: "17:50",
    duration: "3h 10m",
    cost: "1.8 €"
  },
  {
    date: "2025-11-25",
    time: "12:05",
    duration: "55m",
    cost: "0.6 €"
  }
];

const staticLandmarks = [
  { name: "Praça do Comércio", position: { lat: 38.7079, lng: -9.1366 } },
  { name: "Rossio Square", position: { lat: 38.7142, lng: -9.1400 } },
  { name: "Avenida da Liberdade", position: { lat: 38.7202, lng: -9.1440 } },
  { name: "Belém Tower", position: { lat: 38.6916, lng: -9.2159 } },
  { name: "Parque Eduardo VII", position: { lat: 38.7276, lng: -9.1526 } },
  { name: "IADE", position: { lat: 38.781931, lng: -9.102924 } },
  { name: "Alfama District", position: { lat: 38.7115, lng: -9.1305 } },
  { name: "Bairro Alto", position: { lat: 38.7103, lng: -9.1450 } },
  { name: "Carmo Convent", position: { lat: 38.7110, lng: -9.1410 } },
  { name: "Castelo de São Jorge", position: { lat: 38.7139, lng: -9.1334 } },
  { name: "Chiado", position: { lat: 38.7098, lng: -9.1415 } },
  { name: "EDP Cool Jazz Festival Venue (near Belém)", position: { lat: 38.6960, lng: -9.2050 } },
  { name: "Jerónimos Monastery", position: { lat: 38.6987, lng: -9.2064 } },
  { name: "Lisbon Cathedral (Sé de Lisboa)", position: { lat: 38.7098, lng: -9.1333 } },
  { name: "LX Factory", position: { lat: 38.7025, lng: -9.1770 } },
  { name: "Miradouro da Senhora do Monte", position: { lat: 38.7183, lng: -9.1342 } },
  { name: "Miradouro de Santa Catarina", position: { lat: 38.7075, lng: -9.1600 } },
  { name: "Museu Nacional do Azulejo", position: { lat: 38.7150, lng: -9.1270 } },
  { name: "Oceanário de Lisboa", position: { lat: 38.7640, lng: -9.0950 } },
  { name: "Padrão dos Descobrimentos", position: { lat: 38.6938, lng: -9.2059 } },
  { name: "Parque das Nações", position: { lat: 38.7630, lng: -9.0950 } },
  { name: "Santa Justa Lift", position: { lat: 38.7128, lng: -9.1399 } },
  { name: "Time Out Market", position: { lat: 38.7075, lng: -9.1365 } },
  { name: "Tram 28 Route Start (Martim Moniz)", position: { lat: 38.7140, lng: -9.1390 } },
  { name: "Vasco da Gama Tower", position: { lat: 38.7606, lng: -9.0997 } },
  { name: "JONKOPING", position: { lat: 57.78145, lng: 14.15618 } }
];

// Auth gate: just keep currentUser in sync
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User is logged in:", user.email);
    currentUser = user;
    if (userBikesUnsubscribe) {
      userBikesUnsubscribe();
      userBikesUnsubscribe = null;
    }
  } else {
    currentUser = null;
    if (userBikesUnsubscribe) {
      userBikesUnsubscribe();
      userBikesUnsubscribe = null;
    }
    console.log("No user logged in — redirecting to login.");
    window.open("/", "_self");
  }
});

// let p5 call setup
window.setup = () => {};

function setup() {
  noCanvas();

  homeCard = createDiv();
  homeCard.addClass('home-card');

  navbar = createDiv();
  navbar.addClass('navbar');
  navbar.parent(homeCard);

  menuBtn = createDiv("☰").addClass('nav-btn').parent(navbar);
  logo = createDiv('<img src="assets/logo_podlock.png" style="height:150px;vertical-align:middle;">')
    .addClass('nav-logo')
    .parent(navbar);
  accountBtn = createDiv("👤").addClass('nav-btn').parent(navbar);

  mapArea = createDiv();
  mapArea.addClass('map-area');
  mapArea.parent(homeCard);

  let legend = createDiv();
  legend.addClass("legend-box");
  legend.parent(homeCard);
  legend.html(`
    <div class="legend-item"><span class="legend-dot legend-green"></span><span class="legend-label">&gt;50% available</span></div>
    <div class="legend-item"><span class="legend-dot legend-orange"></span><span class="legend-label">20-50% available</span></div>
    <div class="legend-item"><span class="legend-dot legend-red"></span><span class="legend-label">&lt;20% available</span></div>
  `);

  findNearestBtn = createButton('Find nearest station').addClass('find-nearest-btn').parent(homeCard);
  helpBtn = createButton("?").addClass('help-btn').parent(homeCard);

  createParkingHistoryDrawer();
  createAccountDrawer();

  accountBtn.mousePressed(() => window.toggleAccountDrawer());
  menuBtn.mousePressed(toggleParkingHistoryDrawer);

  window.initMap();
}

// Parking history drawer
function createParkingHistoryDrawer() {
  const style = createElement('style');
  style.html(`
    .parking-history-drawer {
      position: fixed;
      top: 0;
      right: -350px;
      width: 350px;
      height: 100vh;
      background: white;
      box-shadow: -4px 0 12px rgba(0,0,0,0.15);
      transition: right 0.3s ease;
      z-index: 1000;
      overflow-y: auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .parking-history-drawer.open {
      right: 0;
    }
    .parking-header {
      padding: 20px;
      border-bottom: 1px solid #eee;
      background: #f8f9fa;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .parking-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }
    .parking-close-btn {
      width: 36px;
      height: 36px;
      border: none;
      background: #f0f0f0;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: bold;
      color: #666;
      transition: all 0.2s ease;
    }
    .parking-close-btn:hover {
      background: #e0e0e0;
      color: #E07F00;
      transform: scale(1.05);
    }
    .parking-history-list {
      padding: 0;
      margin: 0;
    }
    .parking-entry {
      display: flex;
      justify-content: space_between;
      padding: 16px 20px;
      border-bottom: 1px solid #f0f0f0;
      transition: background 0.2s;
      cursor: pointer;
    }
    .parking-entry:hover {
      background: #f8f9fa;
    }
    .parking-entry:last-child {
      border-bottom: none;
    }
    .parking-details {
      flex: 1;
    }
    .parking-date {
      font-weight: 600;
      color: #333;
      margin: 0 0 4px 0;
    }
    .parking-time-duration {
      color: #666;
      font-size: 14px;
      margin: 0 0 2px 0;
    }
    .parking-cost {
      font-weight: 600;
      color: #28a745;
      font-size: 16px;
    }
    .parking-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0,0,0,0.5);
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
      z-index: 999;
    }
    .parking-overlay.open {
      opacity: 1;
      visibility: visible;
    }
    @media (max-width: 768px) {
      .parking-history-drawer {
        width: 100vw;
        right: -100vw;
      }
    }
    .bike-card {
      background: #f8f9fa;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 16px;
      margin: 12px 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .bike-title {
      font-weight: 600;
      font-size: 16px;
      color: #333;
      margin-bottom: 8px;
    }
    .bike-detail {
      color: #666;
      font-size: 14px;
      margin-bottom: 4px;
    }
    .bike-add-btn {
      width: 100%;
      background: #f39200;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 10px;
      font-size: 14px;popup-btn parking-start-btn
      font-weight: 500;
      cursor: pointer;
      margin-top: 12px;
    }
    .bike-add-btn:hover {
      background: #E07F00;
    }
    @media (max-width: 768px) {
      .bike-card {
        margin: 8px 0;
        padding: 12px;
      }
    }
    .bike-form {
      padding: 16px;
      border-bottom: 1px solid #f0f0f0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: #ffffff;
    }
    .bike-form-title {
      font-weight: 600;
      font-size: 15px;
      color: #333;
      margin-bottom: 4px;
    }
    .bike-form input {
      width: 100%;
      box-sizing: border-box;
    }
  `);
  style.parent(homeCard);

  parkingOverlay = createDiv().addClass('parking-overlay').parent(homeCard);
  parkingOverlay.id('parkingOverlay');
  parkingOverlay.mousePressed(toggleParkingHistoryDrawer);

  parkingHistoryDrawer = createDiv().addClass('parking-history-drawer').parent(homeCard);
  parkingHistoryDrawer.id('parkingHistoryDrawer');

  const header = createDiv().addClass('parking-header').parent(parkingHistoryDrawer);
  createDiv('Previous Parkings').addClass('parking-title').parent(header);

  parkingCloseBtn = createButton('×').addClass('parking-close-btn').parent(header);
  parkingCloseBtn.mousePressed(toggleParkingHistoryDrawer);

  const list = createDiv().addClass('parking-history-list').parent(parkingHistoryDrawer);

  placeholderParkingHistory.forEach(entry => {
    const entryDiv = createDiv().addClass('parking-entry').parent(list);
    const details = createDiv().parent(entryDiv);
    createDiv(entry.date).addClass('parking-date').parent(details);
    createDiv(`${entry.time} • ${entry.duration}`).addClass('parking-time-duration').parent(details);
    createDiv(entry.cost).addClass('parking-cost').parent(entryDiv);
  });
}

function toggleParkingHistoryDrawer() {
  if (!parkingHistoryDrawer || !parkingOverlay) return;
  parkingHistoryDrawer.toggleClass('open');
  parkingOverlay.toggleClass('open');
}

window.initMap = function () {
  const mapDiv = document.querySelector('.map-area');
  if (!mapDiv) {
    console.error('Map div not found!');
    return;
  }

  googleMap = new google.maps.Map(mapDiv, {
    center: { lat: 38.7223, lng: -9.1393 },
    zoom: 14,
    disableDefaultUI: true,
    gestureHandling: "greedy",
  });
  console.log("Google Map initialized!");
  addStaticLandmarks();
  addUserLocation();
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({
    map: googleMap,
    suppressMarkers: true,
  });
};

function routeTo(destination) {
  if (!userLocationMarker) {
    alert("User location not known yet!");
    return;
  }

  const origin = userLocationMarker.getPosition();
  const destLatLng = new google.maps.LatLng(destination.lat, destination.lng);

  directionsService.route(
    {
      origin: origin,
      destination: destLatLng,
      travelMode: google.maps.TravelMode.BICYCLING,
    },
    (result, status) => {
      if (status === "OK") {
        directionsRenderer.setDirections(result);
      } else {
        alert("Could not calculate route: " + status);
      }
    }
  );
}

function addStaticLandmarks() {
  staticLandmarks.forEach((landmark) => {
    const capacity = Math.floor(Math.random() * 12) + 1;
    const total = 12;
    const percent = (capacity / total) * 100;

    let pinColor = "green";
    if (percent <= 20) pinColor = "red";
    else if (percent <= 50) pinColor = "yellow";

    const marker = new google.maps.Marker({
      position: landmark.position,
      map: googleMap,
      title: landmark.name,
      icon: {
        url: `https://maps.google.com/mapfiles/ms/icons/${pinColor}-dot.png`,
        scaledSize: new google.maps.Size(42, 42)
      }
    });

    const safeId = landmark.name.replace(/\s+/g, '-');

    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div class="marker-popup">
          <strong class="popup-title">${landmark.name}</strong>
          <div class="popup-capacity">🚴 Spots available: ${capacity}/${total}</div>
          <button class="popup-btn" id="route-btn-${safeId}">Get route to here</button>
          <button class="popup-btn parking-start-btn" id="parking-btn-${safeId}">Start Parking</button>
        </div>
      `
    });

    marker.addListener("click", () => {
      if (currentInfoWindow && currentInfoWindow !== infoWindow) {
        currentInfoWindow.close();
      }
      currentInfoWindow = infoWindow;
      infoWindow.open(googleMap, marker);

      google.maps.event.addListenerOnce(infoWindow, 'domready', () => {
        const routeBtn = document.getElementById(`route-btn-${safeId}`);
        if (routeBtn) {
          routeBtn.onclick = () => routeTo(landmark.position);
        }

    const parkingBtn = document.getElementById(`parking-btn-${safeId}`);
      if (parkingBtn) {
        parkingBtn.onclick = async () => {

          const parkingData = {
            name: landmark.name,
            position: landmark.position,
            capacity,
            total
          };

          localStorage.setItem('parkingSession', JSON.stringify(parkingData));

          // 🚪 SEND GATE OPEN REQUEST TO ESP32
          try {
            await set(ref(rtdb, "GateControl/open_request"), 1);
            console.log("Gate open request sent");
          } catch (err) {
            console.error("Failed to send gate request:", err);
          }

          window.open('/parking', '_self');
        };
      }




        const signOutBtn = document.getElementById(`signout-btn-${safeId}`);
        if (signOutBtn) {
          signOutBtn.onclick = async () => {
            try {
              await signOut(auth);
              localStorage.clear();
              window.open("/", "_self");
            } catch (e) {
              console.error("Error signing out:", e);
              alert("Could not sign out, please try again.");
            }
          };
        }
      });
    });
  });

  setupMapClickListener();
  setupEscKeyListener();
}


function setupMapClickListener() {
  if (mapClickListener) {
    google.maps.event.removeListener(mapClickListener);
  }
  mapClickListener = google.maps.event.addListener(googleMap, 'click', () => {
    if (currentInfoWindow) {
      currentInfoWindow.close();
      currentInfoWindow = null;
    }
  });
}

function setupEscKeyListener() {
  if (escKeyListener) {
    document.removeEventListener('keydown', escKeyListener);
  }

  escKeyListener = (e) => {
    if (e.key === 'Escape') {
      if (currentInfoWindow) {
        currentInfoWindow.close();
        currentInfoWindow = null;
      }
      toggleParkingHistoryDrawer();
    }
  };
  document.addEventListener('keydown', escKeyListener);
}

function addUserLocation() {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const coords = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };

      console.log("User location:", coords);

      if (!userLocationMarker) {
        userLocationMarker = new google.maps.Marker({
          position: coords,
          map: googleMap,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: "#4285F4",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "white"
          }
        });
      } else {
        userLocationMarker.setPosition(coords);
      }

      googleMap.panTo(coords);
    }
  );
}

function loadUserBikes(bikesList) {
  console.log('loadUserBikes currentUser =', currentUser && currentUser.uid);
  db = getFirestore(app);

  if (!currentUser) {
    bikesList.html('');
    createElement('div', 'Please log in to see your bikes.').parent(bikesList);
    return;
  }

  bikesList.html('');
  console.log('Loading bikes for uid', currentUser.uid);

  const bikesQuery = query(
    collection(db, 'users', currentUser.uid, 'bike'),
    limit(12)
  );

  userBikesUnsubscribe = onSnapshot(bikesQuery, (snapshot) => {
    bikesList.html('');

    if (snapshot.empty) {
      createElement('div', 'No bikes registered yet.').parent(bikesList);
      return;
    }

    snapshot.forEach((bikeDoc) => {
      const bike = bikeDoc.data();
      const bikeDiv = createDiv().addClass('bike-card').parent(bikesList);

      createDiv(`${bike.brand || 'Unknown'} ${bike.model || ''}`).addClass('bike-title').parent(bikeDiv);
      createDiv(`Color: ${bike.color || 'N/A'}`).addClass('bike-detail').parent(bikeDiv);
      createDiv(`Plate: ${bike.licenceplate || 'N/A'}`).addClass('bike-detail').parent(bikeDiv);
      createDiv(`Year: ${bike.year || 'N/A'}`).addClass('bike-detail').parent(bikeDiv);

      const addBtn = createButton('Select as current bike').addClass('bike-add-btn').parent(bikeDiv);
      addBtn.mousePressed(() => {
        alert(`Adding ${bike.brand || ''} ${bike.model || ''} as current bike`);
      });
    });
  }, (error) => {
    console.error('Error loading bikes:', error);
    createElement('div', 'Error loading bikes.').parent(bikesList);
  });
}

function createAccountDrawer() {
  const accountDrawer = createDiv().addClass('account-drawer').parent(homeCard);

  const header = createDiv().addClass('account-header').parent(accountDrawer);
  createDiv('👤').addClass('account-avatar').parent(header);

  const headerText = createDiv().parent(header);
  createElement('div', 'My Account').addClass('account-title').parent(headerText);
  createElement('div', 'Manage your profile and bikes').addClass('account-subtitle').parent(headerText);

  const closeBtn = createButton('×').addClass('account-close-btn').parent(header);
  closeBtn.mousePressed(() => accountDrawer.removeClass('open'));

  const tabs = createDiv().addClass('account-tabs').parent(accountDrawer);
  const tabBtns = [
    createButton('Info').addClass('account-tab-btn active').parent(tabs),
    createButton('Password').addClass('account-tab-btn').parent(tabs),
    createButton('My Bikes').addClass('account-tab-btn').parent(tabs),
    createButton('My Payment Method').addClass('account-tab-btn').parent(tabs)
  ];

  const infoTab = createDiv().addClass('account-tab').parent(accountDrawer);
  const pwTab = createDiv().addClass('account-tab').style('display', 'none').parent(accountDrawer);
  const bikesTab = createDiv().addClass('account-tab').style('display', 'none').parent(accountDrawer);
  const paymentTab = createDiv().addClass('account-tab').style('display', 'none').parent(accountDrawer);

  // --- My Bikes form ---
  const bikeForm = createDiv().addClass('bike-form').parent(bikesTab);
  createDiv('Add a bike').addClass('bike-form-title').parent(bikeForm);
  const brandInput = createInput('').attribute('placeholder', 'Brand').parent(bikeForm);
  const modelInput = createInput('').attribute('placeholder', 'Model').parent(bikeForm);
  const colorInput = createInput('').attribute('placeholder', 'Color').parent(bikeForm);
  const plateInput = createInput('').attribute('placeholder', 'Licence plate').parent(bikeForm);
  const yearInput = createInput('').attribute('placeholder', 'Year').parent(bikeForm);

  const addBikeBtn = createButton('Add Bike')
    .addClass('bike-add-btn')
    .parent(bikeForm);

  addBikeBtn.mousePressed(async () => {
    if (!currentUser) {
      alert('You must be logged in to add a bike.');
      return;
    }

    const brand = brandInput.value().trim();
    const model = modelInput.value().trim();
    const color = colorInput.value().trim();
    const licenceplate = plateInput.value().trim();
    const year = yearInput.value().trim();

    if (!brand || !model || !color || !licenceplate || !year) {
      alert('Please enter everything before clicking add bike');
      return;
    }

    try {
      const db = getFirestore(app);
      await addDoc(
        collection(db, 'users', currentUser.uid, 'bike'),
        { brand, model, color, licenceplate, year }
      );
      // clear inputs; onSnapshot will refresh list
      brandInput.value('');
      modelInput.value('');
      colorInput.value('');
      plateInput.value('');
      yearInput.value('');
    } catch (e) {
      console.error('Error adding bike:', e);
      alert('Could not add bike (check rules).');
    }
  });

  // list container (so loadUserBikes doesn't clear the form)
  const bikesList = createDiv().addClass('bikes-list').parent(bikesTab);

  createElement('label', 'Email').parent(infoTab);
  createInput(localStorage.getItem('userEmail') || '').attribute('readonly', true).parent(infoTab);

  const logoutBtn = createButton('Sign Out').addClass('account-logout-btn').parent(infoTab);
  logoutBtn.mousePressed(async () => {
    try {
      await signOut(auth);
      localStorage.clear();
      window.open("/", "_self");
    } catch (e) {
      console.error("Error signing out:", e);
      alert("Could not sign out, please try again.");
    }
  });

  createElement('label', 'Current Password').parent(pwTab);
  const currentPwInput = createInput('').attribute('type', 'password').parent(pwTab);

  createElement('label', 'New Password').parent(pwTab);
  const newPwInput = createInput('').attribute('type', 'password').parent(pwTab);

  createElement('label', 'Confirm New Password').parent(pwTab);
  const confirmPwInput = createInput('').attribute('type', 'password').parent(pwTab);

  const changePwBtn = createButton('Change Password').addClass('account-save-btn').parent(pwTab);
  changePwBtn.mousePressed(() => changePassword(currentPwInput.value(), newPwInput.value(), confirmPwInput.value()));

  // Tabs: load bikes when "My Bikes" is clicked
  tabBtns.forEach((btn, i) => {
    btn.mousePressed(() => {
      [infoTab, pwTab, bikesTab, paymentTab].forEach((tab, j) => {
        tab.style('display', j === i ? '' : 'none');
        tabBtns[j].removeClass('active');
        if (i === j) tabBtns[j].addClass('active');
      });

      if (i === 2) {
        loadUserBikes(bikesList);
      }
    });
  });

  createElement('label', 'Cardholder Name').parent(paymentTab);
  const cardNameInput = createInput('')
    .attribute('type', 'text')
    .attribute('placeholder', 'Full name on card')
    .parent(paymentTab);

  createElement('label', 'Card Number').parent(paymentTab);
  const cardNumberInput = createInput('')
    .attribute('type', 'text')
    .attribute('inputmode', 'numeric')
    .attribute('maxlength', '19')
    .attribute('placeholder', 'XXXX XXXX XXXX XXXX')
    .parent(paymentTab);

  cardNumberInput.input(function () {
    let v = this.value().replace(/\D/g, '');
    v = v.slice(0, 16);
    const groups = v.match(/.{1,4}/g);
    const formatted = groups ? groups.join(' ') : '';
    this.value(formatted);
  });

  createElement('label', 'Expiry Date').parent(paymentTab);
  const expiryInput = createInput('')
    .attribute('type', 'text')
    .attribute('inputmode', 'numeric')
    .attribute('maxlength', '5')
    .attribute('placeholder', 'MM/YY')
    .parent(paymentTab);

  expiryInput.input(function () {
    let v = this.value().replace(/\D/g, '');
    v = v.slice(0, 4);
    if (v.length >= 3) {
      v = v.slice(0, 2) + '/' + v.slice(2);
    }
    this.value(v);
  });

  createElement('label', 'CVV').parent(paymentTab);
  const cvvInput = createInput('')
    .attribute('type', 'text')
    .attribute('inputmode', 'numeric')
    .attribute('placeholder', 'CVV')
    .attribute('maxlength', 3)
    .parent(paymentTab);

  const savePaymentBtn = createButton('Save Payment Method')
    .addClass('account-save-btn')
    .parent(paymentTab);

  savePaymentBtn.mousePressed(() => {
    alert('Payment details saved (placeholder only).');
  });

  window.toggleAccountDrawer = () => {
    accountDrawer.toggleClass('open');
  };
}

async function changePassword(currentPassword, newPassword, confirmPassword) {
  const user = auth.currentUser;

  if (!user) {
    alert("You must be logged in to change your password.");
    return;
  }

  if (!currentPassword || !newPassword || !confirmPassword) {
    alert("Please fill in all password fields.");
    return;
  }

  if (newPassword !== confirmPassword) {
    alert("New passwords do not match.");
    return;
  }

  try {
    const cred = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, cred);
    await updatePassword(user, newPassword);
    alert("Password updated successfully!");
  } catch (error) {
    console.error("Password update error:", error);
    if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
      alert("Incorrect current password.");
    } else if (error.code === "auth/requires-recent-login") {
      alert("Please sign in again to change your password.");
    } else {
      alert("Error updating password: " + error.message);
    }
  }
}

window.setup = setup;
