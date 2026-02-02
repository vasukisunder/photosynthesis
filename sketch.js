

let carbonParticles = [];
let oxygenParticles = [];
let plants = [];
let detachedElements = [];
let t = 0;
let lastCarbonBurst = 0;
const MAX_CARBON = 450;

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent(document.querySelector('main'));
  colorMode(HSB, 360, 100, 100, 1);
  noFill();
  smooth();

  background(224, 22, 8);
  initPlants();
}

function initPlants() {
  plants = [];
  const types = ['radial', 'spiral', 'network'];
  // Plant-like hues: forest green, leaf green, teal, aqua, blue-green, sage, moss
  const plantHues = [118, 128, 138, 155, 168, 178, 188, 95, 105];
  const minDist = min(width, height) * 0.12;
  let attempts = 0;
  const maxPlants = 10;

  while (plants.length < maxPlants && attempts < 80) {
    attempts++;
    const x = width * (0.08 + 0.84 * random());
    const y = height * (0.08 + 0.84 * random());
    const tooClose = plants.some(
      (other) => dist(x, y, other.x, other.y) < minDist
    );
    if (!tooClose) {
      const plant = {
        x,
        y,
        type: types[plants.length % 3],
        phase: random(TWO_PI),
        rotation: random(TWO_PI),
        size: min(width, height) * (0.14 + random(0.1)),
        hue: random(plantHues),
        sat: random(28, 52),
        pulseRate: 0.8 + random(0.6),
        wobblePhase: random(TWO_PI),
        wobbleRate: 0.5 + random(0.4),
        elements: [],
        growthCenters: [],
      };
      initPlantElements(plant);
      plants.push(plant);
    }
  }
}

function initPlantElements(plant) {
  plant.elements = [];
  plant.growthCenters = [];
  const numCenters = 2 + floor(random(3));
  for (let i = 0; i < numCenters; i++) {
    const angle = random(TWO_PI);
    const r = plant.size * (0.15 + random(0.25));
    plant.growthCenters.push({
      x: cos(angle) * r,
      y: sin(angle) * r,
      phase: random(TWO_PI),
    });
  }
  if (plant.type === 'radial') {
    for (let i = 0; i < 48; i++) {
      plant.elements.push({
        type: 'ray',
        angle: (i / 48) * TWO_PI,
        life: random(0.3, 1),
        growthPhase: random(TWO_PI),
        detached: false,
      });
    }
  } else if (plant.type === 'spiral') {
    const goldenAngle = PI * (3 - sqrt(5));
    for (let i = 5; i < 65; i++) {
      plant.elements.push({
        type: 'node',
        index: i,
        angle: i * goldenAngle,
        life: random(0.4, 1),
        growthPhase: random(TWO_PI),
        detached: false,
      });
    }
  } else {
    for (let ring = 0; ring < 4; ring++) {
      const numNodes = 6 + ring * 4;
      for (let i = 0; i < numNodes; i++) {
        plant.elements.push({
          type: 'node',
          ring,
          index: i,
          angle: (i / numNodes) * TWO_PI + ring * 0.35,
          life: random(0.3, 1),
          growthPhase: random(TWO_PI),
          detached: false,
        });
      }
    }
  }
}

function draw() {
  t = millis() * 0.0004;

  background(224, 22, 8);
  fill(224, 22, 8, 0.0055);
  noStroke();
  rect(0, 0, width, height);

  suffuseCarbon();
  emitCarbonBurst();
  updateCarbonParticles();
  updateOxygenParticles();
  updateDetachedElements();
  drawPlants(); // plants on top — the luminous heroes
}

function drawPlants() {
  plants.forEach((p) => {
    push();
    translate(p.x, p.y);
    p.phase += 0.0038 * (p.pulseRate || 1);
    p.wobblePhase += 0.0028 * (p.wobbleRate || 1);
    const breathe = sin(p.phase) * 0.2 + 1;
    const glow = 0.7 + 0.3 * sin(p.phase * 2.3);
    const wobble = sin(p.wobblePhase) * 0.048;
    rotate(p.rotation + wobble);
    p.breathe = breathe;
    p.glow = glow;
    p.wobblePhaseVal = p.wobblePhase;

    updatePlantElements(p);
    if (p.type === 'radial') drawRadialPlant(p, breathe, glow);
    else if (p.type === 'spiral') drawSpiralPlant(p, breathe, glow);
    else drawNetworkPlant(p, breathe, glow);
    pop();
  });
}

function updatePlantElements(p) {
  p.elements.forEach((el) => {
    if (el.detached) return;
    el.growthPhase += 0.004;
    el.life += 0.0008;
    if (el.life > 1) el.life = 1;
    if (random() < 0.0003 && el.life > 0.6) {
      el.detached = true;
      const worldX = p.x + cos(p.rotation + el.angle) * (p.size * 0.7);
      const worldY = p.y + sin(p.rotation + el.angle) * (p.size * 0.7);
      detachedElements.push({
        x: worldX,
        y: worldY,
        vx: cos(el.angle + p.rotation) * 0.08 + (random(2) - 1) * 0.04,
        vy: sin(el.angle + p.rotation) * 0.08 + (random(2) - 1) * 0.04,
        life: 1,
        hue: p.hue,
        sat: p.sat,
        size: 1.2 + random(0.8),
        type: el.type,
      });
    }
    if (random() < 0.0005 && el.life < 0.3) {
      el.life = random(0.4, 0.7);
      el.growthPhase = random(TWO_PI);
    }
  });
}

function updateDetachedElements() {
  for (let i = detachedElements.length - 1; i >= 0; i--) {
    const el = detachedElements[i];
    el.x += el.vx;
    el.y += el.vy;
    el.vx *= 0.998;
    el.vy *= 0.998;
    el.life -= 0.003;
    if (el.life <= 0) {
      detachedElements.splice(i, 1);
      continue;
    }
    const alpha = el.life * 0.4;
    noStroke();
    fill(el.hue, el.sat, 85, alpha);
    circle(el.x, el.y, el.size * el.life);
  }
}

function drawRadialPlant(p, breathe, glow) {
  const alpha = 0.88 * glow;
  const size = p.size;

  // Honeycomb rings — luminous cellular structure
  noFill();
  stroke(p.hue, p.sat, 90, alpha * 0.7);
  strokeWeight(0.38);
  for (let ring = 0; ring < 2; ring++) {
    const numCells = 6 + ring * 6;
    const rPulse = 1 + sin(p.phase + ring) * 0.09;
    const r = (8 + ring * 10) * (size / 80) * breathe * rPulse;
    for (let i = 0; i < numCells; i++) {
      const a = (i / numCells) * TWO_PI + p.wobblePhaseVal * 0.6;
      const cx = cos(a) * r;
      const cy = sin(a) * r;
      beginShape();
      for (let j = 0; j < 6; j++) {
        const ha = (j / 6) * TWO_PI;
        vertex(cx + cos(ha) * 4 * (size / 80), cy + sin(ha) * 4 * (size / 80));
      }
      endShape(CLOSE);
    }
  }

  // Radiating lines — regeneration: elongation, contraction, detachment
  stroke(p.hue, p.sat, 92, alpha * 0.82);
  strokeWeight(0.32);
  const numRays = 48;
  const growWave = sin(p.phase * 0.8) * (size * 0.15);
  for (let i = 0; i < p.elements.length; i++) {
    const el = p.elements[i];
    if (el.detached) continue;
    const angle = el.angle + p.wobblePhaseVal * 0.4;
    const growth = sin(el.growthPhase) * 0.5 + 0.5;
    const elongation = growth * (1 - el.life * 0.3);
    const contraction = (1 - growth) * el.life;
    const rayPulse = sin(p.phase * 2.2 + angle * 6 + p.wobblePhaseVal * 2) * (8 + growWave);
    const inner = 18 * (size / 80) * breathe;
    const outer = (size * (0.4 + elongation * 0.6) + rayPulse - contraction * 12) * breathe;
    const elAlpha = alpha * (0.5 + el.life * 0.5);
    stroke(p.hue, p.sat, 92, elAlpha * 0.82);
    line(cos(angle) * inner, sin(angle) * inner, cos(angle) * outer, sin(angle) * outer);
  }

  noStroke();
  fill(p.hue, p.sat, 96, alpha * 0.6);
  circle(0, 0, 16 * (size / 80) * breathe);
}

function drawSpiralPlant(p, breathe, glow) {
  const alpha = 0.9 * glow;
  const size = p.size;

  // Fibonacci-style spirals — magical growth pattern, organic pulse
  noFill();
  stroke(p.hue, p.sat, 90, alpha * 0.78);
  strokeWeight(0.34);
  const spiralGrow = sin(p.phase * 0.7) * 0.12 + 1;
  for (let s = 0; s < 3; s++) {
    const offset = (s / 3) * TWO_PI + p.wobblePhaseVal * 0.8;
    beginShape();
    const steps = 90;
    for (let i = 0; i < steps; i++) {
      const angle = i * 0.13 + offset;
      const rPulse = 1 + sin(p.phase + i * 0.15) * 0.11;
      const r = sqrt(i) * 2.2 * (size / 80) * breathe * rPulse * spiralGrow;
      vertex(cos(angle) * r, sin(angle) * r);
    }
    endShape();
  }

  // Seed nodes — regeneration: appear, grow, fade, regenerate
  noStroke();
  const goldenAngle = PI * (3 - sqrt(5));
  for (let i = 0; i < p.elements.length; i++) {
    const el = p.elements[i];
    if (el.detached) continue;
    const angle = el.angle + p.wobblePhaseVal * 0.8;
    const r = sqrt(el.index) * 2.8 * (size / 80) * breathe;
    const growth = sin(el.growthPhase) * 0.5 + 0.5;
    const thickening = growth * el.life;
    const desiccation = (1 - growth) * (1 - el.life);
    const nodeSize = map(el.index, 5, 65, 1.4, 0.6) * (0.3 + thickening * 0.7 - desiccation * 0.3);
    const elAlpha = alpha * (0.4 + el.life * 0.6);
    fill(p.hue, p.sat, 94, elAlpha * 0.7);
    circle(cos(angle) * r, sin(angle) * r, nodeSize);
  }
  fill(p.hue, p.sat, 96, alpha * 0.65);
  circle(0, 0, 10 * (size / 80) * breathe);
}

function drawNetworkPlant(p, breathe, glow) {
  const alpha = 0.88 * glow;
  const size = p.size;
  const nodes = [];
  const networkGrow = sin(p.phase * 0.6) * 0.08 + 1;

  // Build nodes from elements (regenerating structure)
  p.elements.forEach((el) => {
    if (el.detached) return;
    const rPulse = 1 + sin(p.phase * 1.5 + el.ring) * 0.07;
    const r = (12 + el.ring * 14) * (size / 80) * breathe * rPulse * networkGrow;
    const angle = el.angle + p.wobblePhaseVal * 0.5;
    nodes.push({
      x: cos(angle) * r,
      y: sin(angle) * r,
      el,
    });
  });

  stroke(p.hue, p.sat, 88, alpha * 0.72);
  strokeWeight(0.32);
  for (let i = 0; i < nodes.length; i++) {
    const elAlpha = alpha * (0.5 + nodes[i].el.life * 0.5);
    stroke(p.hue, p.sat, 88, elAlpha * 0.72);
    line(0, 0, nodes[i].x, nodes[i].y);
    for (let j = i + 1; j < nodes.length; j++) {
      const d = dist(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
      if (d < 28 * (size / 80) * breathe) {
        const connAlpha = alpha * 0.5 * (nodes[i].el.life + nodes[j].el.life) * 0.5;
        stroke(p.hue, p.sat, 86, connAlpha);
        line(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
        stroke(p.hue, p.sat, 88, elAlpha * 0.72);
      }
    }
  }

  noStroke();
  nodes.forEach((n) => {
    const el = n.el;
    const growth = sin(el.growthPhase) * 0.5 + 0.5;
    const expansion = growth * el.life;
    const contraction = (1 - growth) * (1 - el.life);
    const nodeSize = 1.8 * (0.4 + expansion * 0.6 - contraction * 0.2);
    const elAlpha = alpha * (0.5 + el.life * 0.5);
    fill(p.hue, p.sat, 94, elAlpha * 0.75);
    circle(n.x, n.y, nodeSize);
  });
  fill(p.hue, p.sat, 96, alpha * 0.65);
  circle(0, 0, 8 * (size / 80) * breathe);
  
  // Multiple growth centers — "centres of indetermination"
  p.growthCenters.forEach((center) => {
    center.phase += 0.002;
    const centerGlow = sin(center.phase) * 0.3 + 0.7;
    fill(p.hue, p.sat, 92, alpha * 0.3 * centerGlow);
    circle(center.x, center.y, 4 * centerGlow);
  });
}

function suffuseCarbon() {
  if (carbonParticles.length >= MAX_CARBON || plants.length === 0) return;
  const n = 4 + floor(random(4));
  for (let i = 0; i < n; i++) {
    carbonParticles.push({
      x: random(width),
      y: random(height),
      vx: (random(2) - 1) * 0.06,
      vy: (random(2) - 1) * 0.06,
      size: 2.2 + random(1.4),
      hue: random(0, 14),
      sat: random(48, 72),
      trail: [],
      maxTrail: 185,
      phase: random(100),
    });
  }
}

function emitCarbonBurst() {
  if (plants.length === 0) return;
  const now = millis();
  if (now - lastCarbonBurst > 3200) {
    lastCarbonBurst = now;
    const burst = 45 + floor(random(25));
    for (let i = 0; i < burst; i++) {
      carbonParticles.push({
        x: random(width),
        y: random(height),
        vx: (random(2) - 1) * 0.06,
        vy: (random(2) - 1) * 0.06,
        size: 2.2 + random(1.4),
        hue: random(0, 14),
        sat: random(48, 72),
        trail: [],
        maxTrail: 185,
        phase: random(100),
      });
    }
  }
}

function updateCarbonParticles() {
  for (let i = carbonParticles.length - 1; i >= 0; i--) {
    const p = carbonParticles[i];

    let nearest = null;
    let nearestD = Infinity;
    for (const plant of plants) {
      const d = dist(p.x, p.y, plant.x, plant.y);
      if (d < nearestD) {
        nearestD = d;
        nearest = plant;
      }
    }

    const absorbRadius = nearest ? nearest.size * 0.55 : 999;
    if (nearest && nearestD < absorbRadius) {
      for (let j = 0; j < 3 + floor(random(3)); j++) {
        const angle = random(TWO_PI);
        oxygenParticles.push({
          x: nearest.x + random(-6, 6),
          y: nearest.y + random(-6, 6),
          vx: cos(angle) * (0.12 + random(0.15)),
          vy: sin(angle) * (0.12 + random(0.15)) - 0.08,
          life: 1,
          size: 0.9 + random(0.5),
        });
      }
      carbonParticles.splice(i, 1);
      continue;
    }

    const vacuumRadius = nearest ? nearest.size * 1.05 : 0;
    const inVacuum = nearest && nearestD < vacuumRadius;

    if (inVacuum) {
      const dx = nearest.x - p.x;
      const dy = nearest.y - p.y;
      const d = max(nearestD, 1);
      const pull = 0.5 + 0.5 * (1 - nearestD / vacuumRadius);
      p.vx += (dx / d) * pull;
      p.vy += (dy / d) * pull;
    }

    const n = noise(p.x * 0.002, p.y * 0.002, t * 0.15 + (p.phase || 0)) * TWO_PI;
    const drift = inVacuum ? 0.02 : 0.032;
    p.vx += cos(n) * drift;
    p.vy += sin(n) * drift;
    p.vx *= 0.998;
    p.vy *= 0.998;
    const maxSpeed = inVacuum ? 0.85 : 0.28;
    const speed = sqrt(p.vx * p.vx + p.vy * p.vy);
    if (speed > maxSpeed) {
      p.vx *= maxSpeed / speed;
      p.vy *= maxSpeed / speed;
    }
    p.x += p.vx;
    p.y += p.vy;

    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > p.maxTrail) p.trail.shift();

    const alpha = 0.9;
    if (p.trail.length >= 2) {
      strokeWeight(0.42);
      const n = p.trail.length;
      for (let k = 1; k < n; k++) {
        const t = k / n;
        const a = (0.04 + 0.22 * t * t) * alpha;
        stroke(p.hue, p.sat, 90, a);
        line(p.trail[k - 1].x, p.trail[k - 1].y, p.trail[k].x, p.trail[k].y);
      }
    }
    noStroke();
    fill(p.hue, p.sat, 98, alpha);
    circle(p.x, p.y, p.size);
  }
}

function updateOxygenParticles() {
  for (let i = oxygenParticles.length - 1; i >= 0; i--) {
    const o = oxygenParticles[i];
    o.x += o.vx;
    o.y += o.vy;
    o.life -= 0.02;
    o.vx *= 0.99;
    o.vy *= 0.99;

    if (o.life <= 0) {
      oxygenParticles.splice(i, 1);
      continue;
    }
    noStroke();
    fill(178, 28, 96, o.life * 0.28);
    circle(o.x, o.y, o.size);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initPlants();
}
