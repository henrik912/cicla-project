// --- Parking background sketch -------------------------------------------
// This p5.js sketch turns the parking screen into a living system of
// intelligent agents whose behaviour reacts to time and parking price. [file:1]

// --- Firebase initialization ---
const firebaseConfig = {
  apiKey: "AIzaSyAYJwO4MKFSCfM4iHUTuJTzTzGRkBKrtTI",
  authDomain: "cicla-project.firebaseapp.com",
  projectId: "cicla-project",
  storageBucket: "cicla-project.firebasestorage.app",
  messagingSenderId: "943033387656",
  appId: "1:943033387656:web:c08795f4eed3a73279ad3d",
  databaseURL: "https://cicla-project-default-rtdb.europe-west1.firebasedatabase.app",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);


let agents = [];               // all active agents in the scene
let startTime;                 // when the parking session started
let pricePerHour = 1.8;        // € per hour
let currentPrice = 0;          // live price, updated every frame
let parkingSessionData = null; // metadata about the selected station

// Load session info (landmark name) passed from the homepage and update title
function loadParkingSession() {
  const sessionData = localStorage.getItem('parkingSession');
  if (sessionData) {
    parkingSessionData = JSON.parse(sessionData);
    const titleEl = document.getElementById('parkingTitle');
    if (titleEl && parkingSessionData) {
      titleEl.textContent = `Parking at ${parkingSessionData.name}`;
    }
    localStorage.removeItem('parkingSession');
  }
}

// --- Agent behaviour “modes” ---------------------------------------------
// Each agent can be in one of four qualitative modes, similar to
// structured / exploratory / chaotic / erratic from the lecture. [file:1]
const AgentBehaviors = {
  FLOW:   0,   // follows a smooth vector field across the card
  ORBIT:  1,   // orbits around an invisible attractor near the center
  BURST:  2,   // short chaotic burst step (energetic accent)
  RETURN: 3    // glides back toward the center to keep things balanced
};

// --- Agent definition ----------------------------------------------------
// A ParkingAgent is a tiny autonomous drawer that perceives the scene
// (position, time, price), decides a behaviour, and then acts. [file:1]
class ParkingAgent {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);

    this.state = floor(random(4));     // start in a random behaviour mode
    this.hue = random(330, 20);        // warm CICLA‑ish red / orange range
    this.size = random(3, 6);
    this.noiseOffset = random(1000);   // phase offset into the flow field
    this.memory = [];                  // short trail of past positions
  }

  // --- perceive ----------------------------------------------------------
  // Collect local context: where am I, how far from the center, how high is
  // the current price, and what does the flow field look like here? [file:1]
  perceive() {
    const t = millis() * 0.0002;                         // slow time
    const center = createVector(width / 2, height / 2);
    const distToCenter = p5.Vector.dist(this.pos, center);

    // Price factor goes from 0 → 1 as the session gets more expensive.
    // Later in the parking session the animation becomes a bit livelier. [file:2]
    const priceFactor = map(currentPrice || 0, 0, 3, 0, 1, true);

    // Flow field direction based on Perlin noise in space + time. [file:2]
    const angle = noise(
      this.pos.x * 0.005,
      this.pos.y * 0.005,
      this.noiseOffset + t
    ) * TWO_PI * 2;
    const flowDir = p5.Vector.fromAngle(angle);

    return { t, center, distToCenter, priceFactor, flowDir };
  }

  // --- decide ------------------------------------------------------------
  // Probabilistically switch behaviour based on price + position. [file:1]
  decide(p) {
    const r = random(1);

    // Higher priceFactor = slightly higher chance that the agent
    // changes mood (state) and becomes more expressive. [file:2]
    if (r < 0.003 + p.priceFactor * 0.02) {
      if (p.distToCenter < min(width, height) * 0.25) {
        this.state = AgentBehaviors.BURST;
      } else if (p.distToCenter > min(width, height) * 0.45) {
        this.state = AgentBehaviors.RETURN;
      } else {
        this.state =
          random() < 0.5 ? AgentBehaviors.FLOW : AgentBehaviors.ORBIT;
      }
    }
  }

  // --- act ---------------------------------------------------------------
  // Turn state + perception into forces, then move and draw.
  act(p) {
    this.acc.mult(0);

    switch (this.state) {
      case AgentBehaviors.FLOW: {
        // Slide along the flow field (smooth, calm motion). [file:2]
        const force = p.flowDir.copy().mult(0.4);
        this.acc.add(force);
        break;
      }
      case AgentBehaviors.ORBIT: {
        // Orbit around the center: perpendicular to vector to center.
        const toCenter = p.center.copy().sub(this.pos);
        const tangent = createVector(-toCenter.y, toCenter.x).setMag(0.3);
        this.acc.add(tangent);
        break;
      }
      case AgentBehaviors.BURST: {
        // Chaotic little kick – more intense when price is higher.
        const jitter = p5.Vector.random2D().mult(0.9 + p.priceFactor * 1.4);
        this.acc.add(jitter);
        break;
      }
      case AgentBehaviors.RETURN: {
        // Gently pull back toward the center to keep density balanced.
        const home = p.center.copy().sub(this.pos).setMag(0.35);
        this.acc.add(home);
        break;
      }
    }

    // Integrate motion and limit max speed so it stays legible.
    this.vel.add(this.acc);
    this.vel.limit(2.2 + (currentPrice || 0) * 0.4);
    this.pos.add(this.vel);

    // Wrap around the edges so agents never disappear. [file:1]
    if (this.pos.x < 0) this.pos.x = width;
    if (this.pos.x > width) this.pos.x = 0;
    if (this.pos.y < 0) this.pos.y = height;
    if (this.pos.y > height) this.pos.y = 0;

    // Remember a short trail to draw a ribbon‑like path.
    this.memory.push(this.pos.copy());
    if (this.memory.length > 20) this.memory.shift();

    this.render(p);
  }

  // --- render ------------------------------------------------------------
  // Draw the agent as a soft ribbon + bright head whose colour is tied
  // to time and behaviour state. [file:1]
  render(p) {
    push();
    colorMode(HSB, 360, 100, 100, 255);

    let baseHue = (this.hue + p.t * 40) % 360;
    if (this.state === AgentBehaviors.BURST)  baseHue = (baseHue + 20) % 360;
    if (this.state === AgentBehaviors.RETURN) baseHue = (baseHue + 320) % 360;

    noFill();
    stroke(baseHue, 75, 90, 120);
    strokeWeight(2);

    // Draw a smooth ribbon through the memory points.
    beginShape();
    for (let i = 0; i < this.memory.length; i++) {
      const m = this.memory[i];
      const alpha = map(i, 0, this.memory.length - 1, 0, 255);
      stroke(baseHue, 75, 90, alpha);
      curveVertex(m.x, m.y);
    }
    endShape();

    // Bright “head” dot at the current position.
    noStroke();
    fill(baseHue, 85, 100, 230);
    ellipse(this.pos.x, this.pos.y, this.size * 2.1, this.size * 2.1);

    pop();
  }
}

// --- p5 lifecycle --------------------------------------------------------
// Create a canvas sized to the parking card's content area and
// spawn a small swarm of agents exploring that space. [file:1]
function setup() {
  const content = document.querySelector('.parking-content');
  const rect = content.getBoundingClientRect();

  let cnv = createCanvas(rect.width, rect.height);
  cnv.parent(content);
  cnv.style('position', 'absolute');
  cnv.style('top', '0');
  cnv.style('left', '0');
  cnv.style('z-index', '1');
  cnv.style('pointer-events', 'none');

  startTime = millis();
  loadParkingSession();

  for (let i = 0; i < 12; i++) {
    agents.push(new ParkingAgent(random(width), random(height)));
  }
}

function draw() {
  // Dark translucent fill so trails accumulate but still fade over time.
  background(26, 26, 46, 35);

  const elapsedTime = (millis() - startTime) / 1000;
  const hours   = Math.floor(elapsedTime / 3600);
  const minutes = Math.floor((elapsedTime % 3600) / 60);
  const seconds = Math.floor(elapsedTime % 60);
  currentPrice  = (elapsedTime / 3600) * pricePerHour;

  // Core agent loop: perceive → decide → act. [file:1]
  agents.forEach(agent => {
    const perception = agent.perceive();
    agent.decide(perception);
    agent.act(perception);
  });

  // UI: update timer + price in the DOM (p5 select is fine in draw). [file:1]
  const timerEl = select('#timerDisplay');
  const priceEl = select('#currentPrice');

  if (timerEl) {
    timerEl.html(`
      <span class="timer-hours">${hours.toString().padStart(2, '0')}</span>
      <span class="timer-colon">:</span>
      <span class="timer-minutes">${minutes.toString().padStart(2, '0')}</span>
      <span class="timer-colon">:</span>
      <span class="timer-seconds">${seconds.toString().padStart(2, '0')}</span>
    `);
  }

  if (priceEl) {
    priceEl.html(`€${currentPrice.toFixed(2)}`);
  }
}

// Keep canvas aligned with the card when orientation / size changes.
function windowResized() {
  const content = document.querySelector('.parking-content');
  if (!content) return;
  const rect = content.getBoundingClientRect();
  resizeCanvas(rect.width, rect.height);
}

// --- Plain DOM hooks for buttons (outside p5) ----------------------------
// --- Plain DOM hooks for buttons (outside p5) ----------------------------
document.addEventListener('DOMContentLoaded', () => {
  const endBtn  = document.getElementById('endSessionBtn');
  const backBtn = document.getElementById('backBtn');

  if (endBtn) {
    endBtn.addEventListener('click', async () => {
      if (!confirm('End parking session?')) return;

      try {
        // 🔥 Trigger gate open (same as start parking)
        await firebase
          .database()
          .ref('GateControl/open_request')
          .set(1);

        console.log('Gate open request sent (end session)');

        // Small delay to guarantee Firebase write
        setTimeout(() => {
          window.location.href = '/home';
        }, 300);

      } catch (err) {
        console.error('Failed to trigger gate:', err);
        alert('Could not open gate. Please try again.');
      }
    });
  }

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = '/home';
    });
  }
});
