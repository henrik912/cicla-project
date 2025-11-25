import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// --- Firebase config ---
const firebaseConfig = {
  apiKey: "AIzaSyAYJwO4MKFSCfM4iHUTuJTzTzGRkBKrtTI",
  authDomain: "cicla-project.firebaseapp.com",
  projectId: "cicla-project",
  storageBucket: "cicla-project.firebasestorage.app",
  messagingSenderId: "943033387656",
  appId: "1:943033387656:web:c08795f4eed3a73279ad3d"
};

//Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

//Auth gate: delay setup so p5 is ready
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User is logged in:", user.email);
    //Schedule setup so p5 has fully initialized its globals
    requestAnimationFrame(() => setup());
  } else {
    console.log("No user logged in — redirecting to login.");
    window.open("/", "_self");
  }
});

//p5.js setup and UI logic (global mode)
let homeCard, navbar, menuBtn, logo, accountBtn, mapArea, findNearestBtn, helpBtn;
let currentPopup = null;


window.setup = () => {}; // Prevent p5 from auto-calling setup
function setup() {
  noCanvas();

  //Main Card
  homeCard = createDiv();
  homeCard.addClass('home-card');

  //Navbar
  navbar = createDiv();
  navbar.addClass('navbar');
  navbar.parent(homeCard);

  menuBtn = createDiv("&#9776;").addClass('nav-btn').parent(navbar);
  logo = createDiv('<img src="assets/cicla_logo.png" style="height:45px;vertical-align:middle;">').addClass('nav-logo').parent(navbar);
  accountBtn = createDiv("&#128100;").addClass('nav-btn').parent(navbar);

  //Map Area
  mapArea = createDiv();
  mapArea.addClass('map-area');
  mapArea.parent(homeCard);

  //Legend
  let legend = createDiv();
  legend.addClass("legend-box");
  legend.parent(homeCard);
  legend.html(`
    <div class="legend-item"><span class="legend-dot legend-green"></span><span class="legend-label">&gt;50% available</span></div>
    <div class="legend-item"><span class="legend-dot legend-orange"></span><span class="legend-label">20-50% available</span></div>
    <div class="legend-item"><span class="legend-dot legend-red"></span><span class="legend-label">&lt;20% available</span></div>
  `);

  //Buttons
  findNearestBtn = createButton('Find nearest station').addClass('find-nearest-btn').parent(homeCard);
  helpBtn = createButton("?").addClass('help-btn').parent(homeCard);

  //Build account drawer before wiring the button (so the handler exists)
  createAccountDrawer();

  //Now that window.toggleAccountDrawer exists, wire the button
  accountBtn.mousePressed(() => window.toggleAccountDrawer());

  window.initMap();
}

const staticLandmarks = [
  {
    name: "Praça do Comércio",
    position: { lat: 38.7079, lng: -9.1366 }
  },
  {
    name: "Rossio Square",
    position: { lat: 38.7142, lng: -9.1400 }
  },
  {
    name: "Avenida da Liberdade",
    position: { lat: 38.7202, lng: -9.1440 }
  },
  {
    name: "Belém Tower",
    position: { lat: 38.6916, lng: -9.2159 }
  },
  {
    name: "Parque Eduardo VII",
    position: { lat: 38.7276, lng: -9.1526 }
  },
  {
    name: "IADE",
    position: { lat: 38.781931, lng: -9.102924}
  }
];

let googleMap = null;
let userLocationMarker = null;
let directionsService = null;
let directionsRenderer = null;


window.initMap = function () {
  googleMap = new google.maps.Map(document.querySelector('.map-area'), {
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
    suppressMarkers: true, //in order to keep the custom pins
  });
};

function routeTo(destination) {
  if (!userLocationMarker) {
    alert("User location not known yet!");
    return;
  }

  const origin = userLocationMarker.getPosition(); // user's LatLng
  const destLatLng = new google.maps.LatLng(destination.lat, destination.lng);

  directionsService.route(
    {
      origin: origin,
      destination: destLatLng,
      travelMode: google.maps.TravelMode.BICYCLING, // ← Bicycle route
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

    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div class="marker-popup">
          <strong class="popup-title">${landmark.name}</strong>
          <div class="popup-capacity">🚴 Spots available: ${capacity}/${total}</div>
          <button class="popup-btn" id="route-btn-${landmark.name.replace(/\s+/g,'-')}">Get route to here</button>
        </div>
      `
    });

    marker.addListener("click", () => {
      infoWindow.open(googleMap, marker);
      google.maps.event.addListenerOnce(infoWindow, 'domready', () => {
        const btn = document.getElementById(`route-btn-${landmark.name.replace(/\s+/g,'-')}`);
        if (btn) btn.onclick = () => routeTo(landmark.position);
      });
    });
  });
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

      // Create marker
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

      // 🔥 Center map on user *now that we have the coordinates*
      googleMap.panTo(coords);
    }
  );
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

  const signOutBtn = createButton('Sign Out').addClass('account-signout-btn').parent(header);
  signOutBtn.mousePressed(async () => {
    await signOut(auth);
    localStorage.clear();
    window.open("/", "_self");
  });

  //Tabs
  const tabs = createDiv().addClass('account-tabs').parent(accountDrawer);
  const tabBtns = [
    createButton('Info').addClass('account-tab-btn active').parent(tabs),
    createButton('Password').addClass('account-tab-btn').parent(tabs),
    createButton('My Bikes').addClass('account-tab-btn').parent(tabs)
  ];

  const infoTab = createDiv().addClass('account-tab').parent(accountDrawer);
  const pwTab = createDiv().addClass('account-tab').style('display', 'none').parent(accountDrawer);
  const bikesTab = createDiv().addClass('account-tab').style('display', 'none').parent(accountDrawer);

  //Info tab
  createElement('label', 'Full Name').parent(infoTab);
  createInput(localStorage.getItem('userName') || 'John Doe').attribute('readonly', true).parent(infoTab);
  createElement('label', 'Email').parent(infoTab);
  createInput(localStorage.getItem('userEmail') || '').attribute('readonly', true).parent(infoTab);

  //Password Tab
  createElement('label', 'Current Password').parent(pwTab);
  const currentPwInput = createInput('').attribute('type', 'password').parent(pwTab);

  createElement('label', 'New Password').parent(pwTab);
  const newPwInput = createInput('').attribute('type', 'password').parent(pwTab);

  createElement('label', 'Confirm New Password').parent(pwTab);
  const confirmPwInput = createInput('').attribute('type', 'password').parent(pwTab);

  const changePwBtn = createButton('Change Password').addClass('account-save-btn').parent(pwTab);
  changePwBtn.mousePressed(() => changePassword(currentPwInput.value(), newPwInput.value(), confirmPwInput.value()));

  //Bikes Tab
  createElement('div', 'Your bikes will appear here.').parent(bikesTab);

  //Tab switching
  tabBtns.forEach((btn, i) => {
    btn.mousePressed(() => {
      [infoTab, pwTab, bikesTab].forEach((tab, j) => {
        tab.style('display', j === i ? '' : 'none');
        tabBtns[j].removeClass('active');
        if (i === j) tabBtns[j].addClass('active');
      });
    });
  });

  //Expose drawer toggler globally for the navbar button
  window.toggleAccountDrawer = () => {
    accountDrawer.toggleClass('open');
  };
}

//Password Update Logic
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