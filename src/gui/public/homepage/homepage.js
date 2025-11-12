let homeCard, navbar, menuBtn, logo, accountBtn, mapArea, findNearestBtn, helpBtn;

function setup() {
  noCanvas();

  // Main Card
  homeCard = createDiv();
  homeCard.addClass('home-card');

  // Navbar
  navbar = createDiv();
  navbar.addClass('navbar');
  navbar.parent(homeCard);

  menuBtn = createDiv("&#9776;").addClass('nav-btn').parent(navbar);
  logo = createDiv('<img src="assets/cicla_logo.png" style="height:45px;vertical-align:middle;">').addClass('nav-logo').parent(navbar);
  accountBtn = createDiv("&#128100;").addClass('nav-btn').parent(navbar);

  // Map Area (Inside the card)
  mapArea = createDiv();
  mapArea.addClass('map-area');
  mapArea.parent(homeCard);
  
  // Legend container
  let legend = createDiv();
  legend.addClass("legend-box");
  legend.parent(homeCard);

  // Add legend items
  legend.html(`
    <div class="legend-item">
      <span class="legend-dot legend-green"></span>
      <span class="legend-label">&gt;50% available</span>
    </div>
    <div class="legend-item">
      <span class="legend-dot legend-orange"></span>
      <span class="legend-label">20-50% available</span>
    </div>
    <div class="legend-item">
      <span class="legend-dot legend-red"></span>
      <span class="legend-label">&lt;20% available</span>
    </div>
  `);

  // Add three pins (positions are relative within map-area)
  addPin(18, 38, "green", "Rossio", 8, 15);
  addPin(43, 25, "orange", "Avenida", 4, 15);
  addPin(47, 63, "red", "Commerce Sq.", 2, 15); 
  

  // Find nearest station
  findNearestBtn = createButton('Find nearest station').addClass('find-nearest-btn').parent(homeCard);

  // Help button
  helpBtn = createButton("?").addClass('help-btn').parent(homeCard);
}

function addPin(xPercent, yPercent, color, stationName, bikes, total) {
  let pinDiv = createDiv();
  pinDiv.addClass("station-pin " + color);
  pinDiv.parent(homeCard);
  pinDiv.style('position', 'absolute');
  pinDiv.style('left', xPercent + '%');
  pinDiv.style('top', yPercent + '%');

  // Attach click event for popup
  pinDiv.mousePressed(() => showStationPopup(xPercent, yPercent, color, stationName, bikes, total));
}

let currentPopup = null;

function showStationPopup(xPercent, yPercent, color, stationName, bikes, total) {
  if (currentPopup) currentPopup.remove();

  currentPopup = createDiv();
  currentPopup.addClass("station-popup");
  currentPopup.parent(homeCard);

  currentPopup.style('position', 'absolute');
  currentPopup.style('left', `calc(${xPercent}% - 70px)`);
  currentPopup.style('top', `calc(${yPercent}% - 110px)`);

  currentPopup.html(
    `<button class="popup-close-btn">×</button>
     <b>${stationName}</b><br>
     <span style="font-size:22px;">🚴‍♂️ <b>${bikes}/${total}</b> bikes available</span>
     <br>
     <button class="navigate-btn">Navigate</button>`
  );

  // Native JS event for close button:
  const closeBtn = currentPopup.elt.querySelector('.popup-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      currentPopup.remove();
      currentPopup = null;
    });
  }

  // Native JS event for navigate button (optional example):
  const navBtn = currentPopup.elt.querySelector('.navigate-btn');
  if (navBtn) {
    navBtn.addEventListener('click', function() {
      alert('Navigation not implemented.');
    });
  }
}
