// --- Parking background sketch -------------------------------------------
// Living system of intelligent agents reacting to time & parking price

// --- Firebase initialization ---------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyAYJwO4MKFSCfM4iHUTuJTzTzGRkBKrtTI",
  authDomain: "cicla-project.firebaseapp.com",
  projectId: "cicla-project",
  storageBucket: "cicla-project.firebasestorage.app",
  messagingSenderId: "943033387656",
  appId: "1:943033387656:web:c08795f4eed3a73279ad3d",
  databaseURL: "https://cicla-project-default-rtdb.europe-west1.firebasedatabase.app",
};

firebase.initializeApp(firebaseConfig);

// --- CICLA color system ---------------------------------------------------
const COLORS = {
  bgDark: [20, 20, 24],
  bgFadeAlpha: 28,

  orangeHue: 32,
  orangeSat: 90,
  orangeBright: 95,

  orangeSoft: 70,
  orangeDim: 55,

  trailAlpha: 110,
  headAlpha: 230
};

// --- Global state ---------------------------------------------------------
let agents = [];
let startTimestamp = null;   // REAL time (Date.now)
let pricePerHour = 1.2;
let currentPrice = 0;
let parkingSessionData = null;

// --- Load session info ----------------------------------------------------
function loadParkingSession() {
  const sessionData = localStorage.getItem("parkingSession");

  if (sessionData) {
    parkingSessionData = JSON.parse(sessionData);

    const titleEl = document.getElementById("parkingTitle");
    if (titleEl && parkingSessionData?.name) {
      titleEl.textContent = `Parking at ${parkingSessionData.name}`;
    }

    // persist start time
    startTimestamp = parkingSessionData.startTime || Date.now();
    localStorage.setItem(
      "activeParkingSession",
      JSON.stringify({ startTime: startTimestamp })
    );

    localStorage.removeItem("parkingSession");
  } else {
    const active = localStorage.getItem("activeParkingSession");
    startTimestamp = active
      ? JSON.parse(active).startTime
      : Date.now();
  }
}

// --- Agent behaviour modes ------------------------------------------------
const AgentBehaviors = {
  FLOW: 0,
  ORBIT: 1,
  BURST: 2,
  RETURN: 3
};

// --- ParkingAgent ---------------------------------------------------------
class ParkingAgent {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector();
    this.acc = createVector();

    this.state = floor(random(4));
    this.hue = random(COLORS.orangeHue - 6, COLORS.orangeHue + 6);
    this.size = random(3, 6);
    this.noiseOffset = random(1000);
    this.memory = [];
  }

  perceive() {
    const t = millis() * 0.0002;
    const center = createVector(width / 2, height / 2);
    const distToCenter = p5.Vector.dist(this.pos, center);
    const priceFactor = map(currentPrice, 0, 3, 0, 1, true);

    const angle =
      noise(
        this.pos.x * 0.005,
        this.pos.y * 0.005,
        this.noiseOffset + t
      ) *
      TWO_PI *
      2;

    return {
      center,
      distToCenter,
      priceFactor,
      flowDir: p5.Vector.fromAngle(angle)
    };
  }

  decide(p) {
    if (random() < 0.003 + p.priceFactor * 0.02) {
      if (p.distToCenter < min(width, height) * 0.25)
        this.state = AgentBehaviors.BURST;
      else if (p.distToCenter > min(width, height) * 0.45)
        this.state = AgentBehaviors.RETURN;
      else
        this.state =
          random() < 0.5 ? AgentBehaviors.FLOW : AgentBehaviors.ORBIT;
    }
  }

  act(p) {
    this.acc.mult(0);

    if (this.state === AgentBehaviors.FLOW)
      this.acc.add(p.flowDir.mult(0.4));

    if (this.state === AgentBehaviors.ORBIT) {
      const toCenter = p.center.copy().sub(this.pos);
      this.acc.add(createVector(-toCenter.y, toCenter.x).setMag(0.3));
    }

    if (this.state === AgentBehaviors.BURST)
      this.acc.add(p5.Vector.random2D().mult(0.9 + p.priceFactor * 1.4));

    if (this.state === AgentBehaviors.RETURN)
      this.acc.add(p.center.copy().sub(this.pos).setMag(0.35));

    this.vel.add(this.acc).limit(2.2 + currentPrice * 0.4);
    this.pos.add(this.vel);

    this.pos.x = (this.pos.x + width) % width;
    this.pos.y = (this.pos.y + height) % height;

    this.memory.push(this.pos.copy());
    if (this.memory.length > 20) this.memory.shift();

    this.render();
  }

  render() {
    push();
    colorMode(HSB, 360, 100, 100, 255);

    let sat = COLORS.orangeSat;
    let bright = COLORS.orangeBright;

    if (this.state === AgentBehaviors.BURST) {
      sat = 100;
      bright = 100;
    }
    if (this.state === AgentBehaviors.RETURN) {
      sat = COLORS.orangeSoft;
      bright = COLORS.orangeDim;
    }

    noFill();
    strokeWeight(2);

    beginShape();
    this.memory.forEach((m, i) => {
      stroke(this.hue, sat, bright, map(i, 0, this.memory.length, 0, COLORS.trailAlpha));
      curveVertex(m.x, m.y);
    });
    endShape();

    noStroke();
    fill(this.hue, sat + 5, bright + 5, COLORS.headAlpha);
    ellipse(this.pos.x, this.pos.y, this.size * 2.1);

    pop();
  }
}

// --- p5 lifecycle ---------------------------------------------------------
function setup() {
  const content = document.querySelector(".parking-content");
  const rect = content.getBoundingClientRect();

  const cnv = createCanvas(rect.width, rect.height);
  cnv.parent(content);
  cnv.style("position", "absolute");
  cnv.style("top", "0");
  cnv.style("left", "0");
  cnv.style("z-index", "1");
  cnv.style("pointer-events", "none");

  loadParkingSession();

  for (let i = 0; i < 12; i++)
    agents.push(new ParkingAgent(random(width), random(height)));
}

function draw() {
  background(...COLORS.bgDark, COLORS.bgFadeAlpha);

  const elapsedSeconds = Math.floor((Date.now() - startTimestamp) / 1000);
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  currentPrice = (elapsedSeconds / 3600) * pricePerHour;

  agents.forEach(a => {
    const p = a.perceive();
    a.decide(p);
    a.act(p);
  });

  const h = document.querySelector(".timer-hours");
  const m = document.querySelector(".timer-minutes");
  const s = document.querySelector(".timer-seconds");

  if (h && m && s) {
    h.textContent = String(hours).padStart(2, "0");
    m.textContent = String(minutes).padStart(2, "0");
    s.textContent = String(seconds).padStart(2, "0");
  }

  const priceEl = document.getElementById("currentPrice");
  if (priceEl) priceEl.textContent = `€${currentPrice.toFixed(2)}`;
}

function windowResized() {
  const content = document.querySelector(".parking-content");
  if (!content) return;
  const r = content.getBoundingClientRect();
  resizeCanvas(r.width, r.height);
}

// --- DOM hooks ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("endSessionBtn")?.addEventListener("click", async () => {
    if (!confirm("End parking session?")) return;
    await firebase.database().ref("GateControl/open_request").set(1);
    localStorage.removeItem("activeParkingSession");
    window.location.href = "/home";
  });

  document.getElementById("backBtn")?.addEventListener("click", () => {
    window.location.href = "/home";
  });
});
