/* ===================================================
   GEOMETRIA – Visual Lab (main.js)
   Senior Graphics Engineer Upgrade for LLT1 Requirements
   =================================================== */

// ======================== MATRIX UTILITY (LLT1 REQ 3) ========================

const Mat3 = {
  identity: () => [1, 0, 0, 0, 1, 0, 0, 0, 1],

  multiply: (a, b) => {
    const c = new Array(9).fill(0);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        for (let k = 0; k < 3; k++) {
          c[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
        }
      }
    }
    return c;
  },

  translation: (tx, ty) => [1, 0, tx, 0, 1, ty, 0, 0, 1],
  rotation: (deg) => {
    const rad = deg * Math.PI / 180;
    const c = Math.cos(rad), s = Math.sin(rad);
    return [c, -s, 0, s, c, 0, 0, 0, 1];
  },
  scaling: (sx, sy) => [sx, 0, 0, 0, sy, 0, 0, 0, 1],
  shearing: (shx, shy) => [1, shx, 0, shy, 1, 0, 0, 0, 1],
  reflection: (rx, ry) => [rx, 0, 0, 0, ry, 0, 0, 0, 1],

  apply: (m, p) => {
    const x = m[0] * p.x + m[1] * p.y + m[2];
    const y = m[3] * p.x + m[4] * p.y + m[5];
    const w = m[6] * p.x + m[7] * p.y + m[8];
    return { x: x / w, y: y / w };
  }
};

const Mat4 = {
  identity: () => [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ],

  multiply: (a, b) => {
    const c = new Array(16).fill(0);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        for (let k = 0; k < 4; k++) {
          c[i * 4 + j] += a[i * 4 + k] * b[k * 4 + j];
        }
      }
    }
    return c;
  },

  translation: (tx, ty, tz) => [
    1, 0, 0, tx,
    0, 1, 0, ty,
    0, 0, 1, tz,
    0, 0, 0, 1
  ],

  rotationX: (deg) => {
    const r = deg * Math.PI / 180;
    const c = Math.cos(r), s = Math.sin(r);
    return [
      1, 0, 0, 0,
      0, c, -s, 0,
      0, s, c, 0,
      0, 0, 0, 1
    ];
  },

  rotationY: (deg) => {
    const r = deg * Math.PI / 180;
    const c = Math.cos(r), s = Math.sin(r);
    return [
      c, 0, s, 0,
      0, 1, 0, 0,
      -s, 0, c, 0,
      0, 0, 0, 1
    ];
  },

  rotationZ: (deg) => {
    const r = deg * Math.PI / 180;
    const c = Math.cos(r), s = Math.sin(r);
    return [
      c, -s, 0, 0,
      s, c, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];
  },

  scaling: (sx, sy, sz) => [
    sx, 0, 0, 0,
    0, sy, 0, 0,
    0, 0, sz, 0,
    0, 0, 0, 1
  ],

  reflection: (rx, ry, rz) => [
    rx, 0, 0, 0,
    0, ry, 0, 0,
    0, 0, rz, 0,
    0, 0, 0, 1
  ],

  // For Three.js column-major conversion
  toColumnMajor: (m) => [
    m[0], m[4], m[8], m[12],
    m[1], m[5], m[9], m[13],
    m[2], m[6], m[10], m[14],
    m[3], m[7], m[11], m[15]
  ]
};

// ======================== STATE & GLOBAL VARS ========================

let originalPoints = [];
let transformedPoints = [];
let currentMatrix2D = Mat3.identity();
let reflection2D = { x: 1, y: 1 };

let history2D = [];
let future2D = [];

let scene, camera, orthoCamera, renderer, mesh, ghostMesh, axesGroup;
let reflection3D = { x: 1, y: 1, z: 1 };
let currentMatrix3D = Mat4.identity();
let isOrtho = false;

// Helpers
const g = (id) => +document.getElementById(id).value;
const s = (id, v) => { document.getElementById(id).value = v; };

// ======================== 2D ENGINE (LLT1 REQ 1, 2, 3, 4) ========================

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

function changeShape(type) {
  if (type === "triangle") {
    originalPoints = [{ x: -80, y: 60 }, { x: 0, y: -60 }, { x: 80, y: 60 }];
  } else if (type === "rectangle") {
    originalPoints = [{ x: -80, y: -50 }, { x: 80, y: -50 }, { x: 80, y: 50 }, { x: -80, y: 50 }];
  } else {
    originalPoints = [];
    for (let i = 0; i < 5; i++) {
      let a = (i * 72 - 90) * Math.PI / 180;
      originalPoints.push({ x: 70 * Math.cos(a), y: 70 * Math.sin(a) });
    }
  }
  update2D();
}

function update2D() {
  const txv = g("tx"), tyv = g("ty"), deg = g("angle");
  const sxv = g("sx"), syv = g("sy"), shx = g("shx"), shy = g("shy");

  // Update Labels
  document.getElementById("txVal").textContent = txv;
  document.getElementById("tyVal").textContent = tyv;
  document.getElementById("angleVal").textContent = deg + "°";
  document.getElementById("sxVal").textContent = sxv.toFixed(1);
  document.getElementById("syVal").textContent = syv.toFixed(1);
  document.getElementById("shxVal").textContent = shx.toFixed(1);
  document.getElementById("shyVal").textContent = shy.toFixed(1);

  // Build Matrix: T * Reflect * R * Shear * S (LLT1 REQ 3)
  let m = Mat3.identity();
  m = Mat3.multiply(Mat3.translation(txv, tyv), m);
  m = Mat3.multiply(Mat3.reflection(reflection2D.x, reflection2D.y), m);
  m = Mat3.multiply(Mat3.rotation(deg), m);
  m = Mat3.multiply(Mat3.shearing(shx, shy), m);
  m = Mat3.multiply(Mat3.scaling(sxv, syv), m);

  currentMatrix2D = m;

  // Apply Matrix (LLT1 REQ 3)
  transformedPoints = originalPoints.map(p => Mat3.apply(m, p));

  draw2D();
  displayMatrix2D(m);
}

function displayMatrix2D(m) {
  const el = document.getElementById("matrix2d");
  if (!el) return;
  el.textContent =
    `┌                          ┐
│ ${m[0].toFixed(2).padStart(6)}  ${m[1].toFixed(2).padStart(6)}  ${m[2].toFixed(1).padStart(5)} │
│ ${m[3].toFixed(2).padStart(6)}  ${m[4].toFixed(2).padStart(6)}  ${m[5].toFixed(1).padStart(5)} │
│   0.00    0.00     1.0 │
└                          ┘`;
}

function reflectX2D() { saveState(); reflection2D.y *= -1; update2D(); }
function reflectY2D() { saveState(); reflection2D.x *= -1; update2D(); }

function reset2D() {
  saveState();
  s("tx", 0); s("ty", 0); s("angle", 0);
  s("sx", 1); s("sy", 1); s("shx", 0); s("shy", 0);
  reflection2D = { x: 1, y: 1 };
  update2D();
}

function saveState() {
  history2D.push({
    tx: g("tx"), ty: g("ty"), angle: g("angle"),
    sx: g("sx"), sy: g("sy"), shx: g("shx"), shy: g("shy"),
    ref: { ...reflection2D }
  });
  future2D = [];
}

function undo2D() {
  if (!history2D.length) return;
  future2D.push({
    tx: g("tx"), ty: g("ty"), angle: g("angle"),
    sx: g("sx"), sy: g("sy"), shx: g("shx"), shy: g("shy"),
    ref: { ...reflection2D }
  });
  const state = history2D.pop();
  applyState2D(state);
}

function redo2D() {
  if (!future2D.length) return;
  history2D.push({
    tx: g("tx"), ty: g("ty"), angle: g("angle"),
    sx: g("sx"), sy: g("sy"), shx: g("shx"), shy: g("shy"),
    ref: { ...reflection2D }
  });
  const state = future2D.pop();
  applyState2D(state);
}

function applyState2D(st) {
  s("tx", st.tx); s("ty", st.ty); s("angle", st.angle);
  s("sx", st.sx); s("sy", st.sy); s("shx", st.shx); s("shy", st.shy);
  reflection2D = { ...st.ref };
  update2D();
}



function draw2D() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid2D();

  const showOrig = document.getElementById("toggleOriginal")?.checked;
  if (showOrig) {
    // Original -> light/transparent (LLT1 REQ 1)
    drawPolygon2D(originalPoints, "rgba(247,140,108,0.4)", "rgba(247,140,108,0.05)", "#f78c6c", 1.5);
  }

  // Transformed -> bright (LLT1 REQ 1)
  drawPolygon2D(transformedPoints, "#82aaff", "rgba(130,170,255,0.15)", "#82aaff", 2.5);
}

function drawGrid2D() {
  const w = canvas.width, h = canvas.height;
  const cx = w / 2, cy = h / 2;
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  for (let x = cx % 25; x < w; x += 25) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = cy % 25; y < h; y += 25) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
}

function drawPolygon2D(points, stroke, fill, glow, lw) {
  const cx = canvas.width / 2, cy = canvas.height / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(points[0].x, -points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, -points[i].y);
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  ctx.shadowColor = glow; ctx.shadowBlur = 10;
  ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke();
  ctx.restore();
}

// ======================== 3D ENGINE (LLT1 REQ 1, 2, 3, 4, 5, 6) ========================

function init3D() {
  if (scene) return;
  const container = document.getElementById("threeContainer");
  const w = container.clientWidth || 600, h = container.clientHeight || 600;

  scene = new THREE.Scene();
  scene.background = null;

  // Projection Clarity (LLT1 REQ 6)
  camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
  camera.position.set(5, 4, 6);
  camera.lookAt(0, 0, 0);

  orthoCamera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 1000);
  orthoCamera.position.set(5, 4, 6);
  orthoCamera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const p1 = new THREE.PointLight(0xc792ea, 1); p1.position.set(5, 10, 5); scene.add(p1);
  const p2 = new THREE.PointLight(0xf78c6c, 0.6); p2.position.set(-5, 5, -5); scene.add(p2);

  scene.add(new THREE.GridHelper(10, 20, 0x222233, 0x111122));

  // Custom Colored Axes with Labels (LLT1 REQ 5)
  axesGroup = new THREE.Group();
  const createAxis = (dir, color, label) => {
    const mat = new THREE.LineBasicMaterial({ color });
    const points = [new THREE.Vector3(0, 0, 0), dir.clone().multiplyScalar(5)];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    axesGroup.add(new THREE.Line(geo, mat));

    // Label Sprite
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 64; canvas.height = 64;
    context.fillStyle = '#' + new THREE.Color(color).getHexString();
    context.font = 'Bold 48px Inter';
    context.textAlign = 'center';
    context.fillText(label, 32, 48);
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.copy(dir.clone().multiplyScalar(5.5));
    sprite.scale.set(0.6, 0.6, 1);
    axesGroup.add(sprite);
  };
  createAxis(new THREE.Vector3(1, 0, 0), 0xff4444, "X");
  createAxis(new THREE.Vector3(0, 1, 0), 0x44ff44, "Y");
  createAxis(new THREE.Vector3(0, 0, 1), 0x4444ff, "Z");
  scene.add(axesGroup);

  const geo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
  // Transformed -> bright (LLT1 REQ 1)
  mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x82aaff, transparent: true, opacity: 0.9 }));
  mesh.matrixAutoUpdate = false;
  scene.add(mesh);

  // Original -> transparent (LLT1 REQ 1)
  ghostMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xf78c6c, wireframe: true, transparent: true, opacity: 0.2 }));
  scene.add(ghostMesh);

  // Orbit controls (manual implementation for simplicity & no extra libs)
  let isDragging = false, prev = { x: 0, y: 0 }, rot = { x: 0.6, y: 0.8 };
  renderer.domElement.addEventListener("mousedown", e => { isDragging = true; prev = { x: e.clientX, y: e.clientY }; });
  window.addEventListener("mousemove", e => {
    if (!isDragging) return;
    rot.y += (e.clientX - prev.x) * 0.01; rot.x += (e.clientY - prev.y) * 0.01;
    prev = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener("mouseup", () => isDragging = false);

  function animate() {
    requestAnimationFrame(animate);
    const cam = isOrtho ? orthoCamera : camera;
    const dist = 8;
    cam.position.x = dist * Math.cos(rot.x) * Math.sin(rot.y);
    cam.position.y = dist * Math.sin(rot.x);
    cam.position.z = dist * Math.cos(rot.x) * Math.cos(rot.y);
    cam.lookAt(0, 0, 0);
    renderer.render(scene, cam);
  }
  animate();
}

function update3D() {
  if (!mesh) return;
  const tx = g("t3x"), ty = g("t3y"), tz = g("t3z");
  const rx = g("r3x"), ry = g("r3y"), rz = g("r3z");
  const sx = g("s3x"), sy = g("s3y"), sz = g("s3z");

  ["t3x", "t3y", "t3z", "r3x", "r3y", "r3z", "s3x", "s3y", "s3z"].forEach(id => {
    document.getElementById(id + "Val").textContent = g(id).toFixed(1) + (id.includes("r") ? "°" : "");
  });

  // Build Matrix: T * Reflect * Rz * Ry * Rx * S (LLT1 REQ 3)
  let m = Mat4.identity();
  m = Mat4.multiply(Mat4.translation(tx, ty, tz), m);
  m = Mat4.multiply(Mat4.reflection(reflection3D.x, reflection3D.y, reflection3D.z), m);
  m = Mat4.multiply(Mat4.rotationZ(rz), m);
  m = Mat4.multiply(Mat4.rotationY(ry), m);
  m = Mat4.multiply(Mat4.rotationX(rx), m);
  m = Mat4.multiply(Mat4.scaling(sx, sy, sz), m);

  currentMatrix3D = m;

  // Set Three.js matrix directly (LLT1 REQ 3)
  mesh.matrix.fromArray(Mat4.toColumnMajor(m));
  displayMatrix3D(m);
}

function displayMatrix3D(m) {
  const el = document.getElementById("matrix3d");
  if (!el) return;
  const f = (v) => v.toFixed(2).padStart(6);
  el.textContent =
    `┌                                  ┐
│ ${f(m[0])} ${f(m[1])} ${f(m[2])} ${m[3].toFixed(1).padStart(5)} │
│ ${f(m[4])} ${f(m[5])} ${f(m[6])} ${m[7].toFixed(1).padStart(5)} │
│ ${f(m[8])} ${f(m[9])} ${f(m[10])} ${m[11].toFixed(1).padStart(5)} │
│   0.00   0.00   0.00   1.0 │
└                                  ┘`;
}

function toggleProjection() {
  isOrtho = document.getElementById("orthoToggle").checked;
  document.getElementById("projLabel").textContent = isOrtho ? "📐 Orthographic Projection" : "📐 Perspective Projection";
}

function reflect3D(axis) { reflection3D[axis] *= -1; update3D(); }

function reset3D() {
  ["t3x", "t3y", "t3z", "r3x", "r3y", "r3z"].forEach(id => s(id, 0));
  ["s3x", "s3y", "s3z"].forEach(id => s(id, 1));
  reflection3D = { x: 1, y: 1, z: 1 };
  update3D();
}



function change3DShape(type) {
  if (!mesh) return;
  let geo;
  if (type === "sphere") geo = new THREE.SphereGeometry(1, 32, 32);
  else if (type === "torus") geo = new THREE.TorusGeometry(0.7, 0.3, 16, 48);
  else if (type === "cone") geo = new THREE.ConeGeometry(0.8, 1.6, 32);
  else geo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
  mesh.geometry.dispose(); mesh.geometry = geo;
  ghostMesh.geometry.dispose(); ghostMesh.geometry = geo.clone();
  update3D();
}

// ======================== GLOBAL INIT & SWITCH ========================

function switchMode(mode) {
  document.getElementById("controls2D").style.display = mode === "2d" ? "block" : "none";
  document.getElementById("controls3D").style.display = mode === "3d" ? "block" : "none";
  canvas.style.display = mode === "2d" ? "block" : "none";
  document.getElementById("threeContainer").style.display = mode === "3d" ? "block" : "none";
  document.getElementById("btn2d").classList.toggle("active", mode === "2d");
  document.getElementById("btn3d").classList.toggle("active", mode === "3d");
  if (mode === "2d") resizeCanvas(); else init3D();
}

function resizeCanvas() {
  const w = canvas.parentElement.clientWidth, h = canvas.parentElement.clientHeight;
  canvas.width = w; canvas.height = h;
  draw2D();
}

window.addEventListener("resize", resizeCanvas);
changeShape("triangle");
switchMode("2d");
resizeCanvas();