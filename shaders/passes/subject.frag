// DEMO SUBJECT — a procedural stand-in for the produced photograph.
//
// One scene, rendered several times before the timeline starts:
//   the ARCHIVE version   — what the photographs recorded (black and white, uMono)
//   the SYNTHESIS         — the hypothesis the system will accept
//   the ALTERNATIVES      — other hypotheses for what the archive does not know
//   the DATA pass         — depth and material id (the regions of the picture)
// Every hypothesis is a set of uniforms (see src/subject/hypotheses.ts): what is
// outside the window, what hangs on the wall, cup or glass, the colour of the
// coat, where the person is looking, whether there is sun.
//
// Three compositions are studied: 0 portrait · 1 environment · 2 figure + environment.
// When the real subject is produced (ComfyUI + depth + segmentation), these
// layers are replaced by files; nothing else changes.

#include "lib/noise.glsl"

in vec2 vUv;
out vec4 outColor;

uniform float uSeed;
uniform int uOutput;       // 0 colour · 1 data
uniform int uSteps;
uniform vec2 uResolution;
uniform int uComposition;
uniform int uMono;
uniform int uSupersample;

// Hypothesis.
uniform vec3 uHeadDir;
uniform float uTransomY;
uniform int uOutside;      // 0 blank · 1 city · 2 trees · 3 sea
uniform int uWallObject;   // 0 none · 1 frame · 2 mirror · 3 shelf
uniform int uVessel;       // 0 cup, handle right · 1 cup, handle left · 2 glass
uniform vec3 uCoat;
uniform float uSun;

// ---------------------------------------------------------------- primitives

float sdEllipsoid(vec3 p, vec3 r) {
  float k0 = length(p / r);
  float k1 = length(p / (r * r));
  return k0 * (k0 - 1.0) / k1;
}
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}
float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}
float sdRoundBox(vec3 p, vec3 b, float r) { return sdBox(p, b - r) - r; }
float sdCylinder(vec3 p, float r, float h) {
  vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}
float sdTorus(vec3 p, vec2 t) { return length(vec2(length(p.xz) - t.x, p.y)) - t.y; }
float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}
float smax(float a, float b, float k) { return -smin(-a, -b, k); }

// ---------------------------------------------------------------- materials
// Material ids are the regions of the picture: src/subject/regions.ts assigns
// each one an epistemic class and the evidence that supports it.
const float M_WALL = 1.0;
const float M_FRAME = 2.0;
const float M_OUTSIDE = 3.0;
const float M_TABLE = 4.0;
const float M_VESSEL = 5.0;
const float M_COAT = 6.0;
const float M_SKIN = 7.0;
const float M_HAIR = 8.0;
const float M_CHAIR = 9.0;
const float M_FLOOR = 10.0;
const float M_WALLOBJ = 11.0;
const float M_EYE = 12.0;
const float M_SHIRT = 13.0;

// ---------------------------------------------------------------- scene
const vec3 HEAD = vec3(0.07, 1.215, 0.0);
const float WALL_Z = -1.35;
const vec3 WIN = vec3(-0.46, 1.62, -1.35);
const vec3 WIN_HALF = vec3(0.3, 0.68, 0.2);

bool figure() { return uComposition != 1; }

vec2 sdHead(vec3 p) {
  vec3 fz = normalize(uHeadDir);
  vec3 fx = normalize(cross(vec3(0.0, 1.0, 0.0), fz));
  vec3 fy = cross(fz, fx);
  vec3 q = p - HEAD;
  q = vec3(dot(q, fx), dot(q, fy), dot(q, fz));
  vec3 s = vec3(abs(q.x), q.yz);

  float d = sdEllipsoid(q - vec3(0.0, 0.02, -0.012), vec3(0.076, 0.098, 0.097));
  d = smin(d, sdEllipsoid(q - vec3(0.0, -0.045, 0.022), vec3(0.063, 0.074, 0.078)), 0.035);
  d = smin(d, sdEllipsoid(q - vec3(0.0, -0.1, 0.055), vec3(0.03, 0.022, 0.026)), 0.03);
  d = smin(d, sdEllipsoid(s - vec3(0.045, -0.072, 0.02), vec3(0.022, 0.03, 0.04)), 0.03);
  d = smin(d, sdEllipsoid(s - vec3(0.044, -0.012, 0.062), vec3(0.024, 0.018, 0.02)), 0.02);
  d = smin(d, sdEllipsoid(q - vec3(0.0, 0.033, 0.078), vec3(0.058, 0.014, 0.022)), 0.02);
  d = smin(d, sdCapsule(q, vec3(0.0, 0.012, 0.09), vec3(0.0, -0.028, 0.108), 0.0105), 0.014);
  d = smin(d, sdEllipsoid(q - vec3(0.0, -0.03, 0.104), vec3(0.016, 0.011, 0.012)), 0.01);
  d = smax(d, -sdEllipsoid(s - vec3(0.029, 0.01, 0.095), vec3(0.02, 0.013, 0.016)), 0.012);
  d = smin(d, sdEllipsoid(q - vec3(0.0, -0.058, 0.093), vec3(0.022, 0.0075, 0.012)), 0.008);
  d = smin(d, sdEllipsoid(q - vec3(0.0, -0.072, 0.089), vec3(0.02, 0.008, 0.012)), 0.008);
  d = smax(d, -sdEllipsoid(q - vec3(0.0, -0.065, 0.1), vec3(0.018, 0.0018, 0.01)), 0.002);
  d = smin(d, sdEllipsoid(s - vec3(0.074, -0.012, -0.012), vec3(0.009, 0.022, 0.014)), 0.006);
  d = smin(d, sdCapsule(p, HEAD + vec3(0.005, -0.07, -0.03), HEAD + vec3(0.015, -0.22, -0.03), 0.048), 0.03);
  vec2 res = vec2(d, M_SKIN);

  // Eyelids half-lowered: the eye reads as a direction, not as a stare.
  float eye = sdEllipsoid(s - vec3(0.029, 0.007, 0.08), vec3(0.0105, 0.0065, 0.01));
  if (eye < res.x) res = vec2(eye, M_EYE);

  float hair = sdEllipsoid(q - vec3(0.0, 0.034, -0.02), vec3(0.083, 0.1, 0.104));
  hair += 0.0015 * gnoise3(q * vec3(60.0, 140.0, 60.0));
  float keepTop = 0.043 - q.y + 0.12 * max(q.z - 0.02, 0.0);
  float keepBack = max(q.z + 0.03, -0.045 - q.y);
  hair = max(hair, min(keepTop, keepBack));
  if (hair < res.x) res = vec2(hair, M_HAIR);
  return res;
}

vec2 sdBody(vec3 p) {
  vec3 base = HEAD + vec3(0.02, -0.25, -0.035);
  vec3 fz = normalize(vec3(-0.4, 0.0, 0.92));
  vec3 fx = normalize(cross(vec3(0.0, 1.0, 0.0), fz));
  vec3 q = p - base;
  q = vec3(dot(q, fx), q.y, dot(q, fz));
  float torso = sdEllipsoid(q - vec3(0.0, -0.32, 0.0), vec3(0.18, 0.42, 0.12));
  float shoulders = sdCapsule(q, vec3(-0.15, -0.035, -0.01), vec3(0.15, -0.035, -0.01), 0.065);
  float d = smin(torso, shoulders, 0.09);
  vec3 sq = vec3(abs(q.x), q.yz);
  d = smin(d, sdCapsule(sq, vec3(0.175, -0.06, -0.01), vec3(0.2, -0.32, 0.09), 0.056), 0.05);
  d = smin(d, sdCapsule(sq, vec3(0.2, -0.32, 0.09), vec3(0.12, -0.44, 0.3), 0.048), 0.04);
  d += 0.003 * gnoise3(q * vec3(18.0, 7.0, 18.0));
  vec2 res = vec2(d, M_COAT);
  float collar = sdTorus(q - vec3(0.0, 0.035, 0.0), vec2(0.058, 0.02));
  collar = max(collar, -q.y);
  float collarShape = smin(collar, sdEllipsoid(q - vec3(0.0, 0.01, 0.045), vec3(0.06, 0.05, 0.02)), 0.02);
  float shirt = sdEllipsoid(q - vec3(0.0, -0.03, 0.06), vec3(0.045, 0.07, 0.03));
  if (shirt < res.x - 0.004) res = vec2(shirt, M_SHIRT);
  if (collarShape < res.x) res = vec2(collarShape, M_COAT);
  return res;
}

// A plain wooden chair; in the environment study the coat hangs on it.
vec2 sdChair(vec3 p) {
  vec3 c = p - vec3(0.1, 0.0, -0.1);
  vec3 a = vec3(abs(c.x), c.y, c.z);
  float d = sdBox(c - vec3(0.0, 0.46, 0.0), vec3(0.2, 0.018, 0.19));
  d = min(d, sdBox(a - vec3(0.175, 0.23, 0.165), vec3(0.016, 0.23, 0.016)));
  d = min(d, sdBox(a - vec3(0.175, 0.48, -0.175), vec3(0.016, 0.48, 0.016)));
  d = min(d, sdBox(c - vec3(0.0, 0.86, -0.175), vec3(0.19, 0.05, 0.014)));
  d = min(d, sdBox(c - vec3(0.0, 0.68, -0.175), vec3(0.19, 0.012, 0.012)));
  vec2 res = vec2(d, M_CHAIR);
  if (!figure()) {
    // The coat, draped over the back.
    vec3 k = c - vec3(0.0, 0.73, -0.19);
    float fold = 0.012 * sin(k.x * 38.0 + 1.3 * sin(k.y * 9.0)) + 0.004 * gnoise3(k * 30.0);
    float coat = sdRoundBox(k - vec3(0.0, -0.02, fold - 0.01), vec3(0.215, 0.22, 0.05), 0.04);
    coat = smin(coat, sdCapsule(k, vec3(-0.21, 0.19, 0.0), vec3(0.21, 0.19, 0.0), 0.045), 0.03);
    coat = smin(coat, sdCapsule(k, vec3(0.2, 0.15, 0.02), vec3(0.25, -0.2, 0.08), 0.04), 0.03); // a sleeve
    if (coat < res.x) res = vec2(coat, M_COAT);
  }
  return res;
}

vec2 sdVessel(vec3 p) {
  vec3 cp = p - vec3(-0.17, 0.733 + 0.04, 0.36);
  if (uVessel == 2) {
    // A tumbler: slightly tapered, open.
    float r = 0.029 + 0.004 * (cp.y / 0.045);
    float g = max(length(cp.xz) - r, abs(cp.y) - 0.045);
    g = max(g, -max(length(cp.xz) - (r - 0.0025), abs(cp.y - 0.004) - 0.045));
    return vec2(g, M_VESSEL);
  }
  float cup = sdCylinder(cp, 0.031, 0.04) - 0.003;
  cup = max(cup, -sdCylinder(cp - vec3(0.0, 0.01, 0.0), 0.027, 0.04));
  float side = uVessel == 1 ? -1.0 : 1.0;
  float handle = sdTorus((cp - vec3(0.037 * side, 0.0, 0.0)).xzy, vec2(0.016, 0.0045));
  cup = min(cup, max(handle, -side * (cp.x - side * 0.03)));
  return vec2(cup, M_VESSEL);
}

vec2 map(vec3 p) {
  float wall = max(p.z - WALL_Z, (WALL_Z - 0.12) - p.z);
  wall = max(wall, -sdBox(p - WIN, WIN_HALF));
  vec2 res = vec2(wall, M_WALL);

  float floorD = p.y;
  if (floorD < res.x) res = vec2(floorD, M_FLOOR);

  float outside = p.z - (WALL_Z - 1.6);
  if (outside < res.x) res = vec2(outside, M_OUTSIDE);

  vec3 w = p - WIN;
  float frame = sdBox(w, vec3(WIN_HALF.x, WIN_HALF.y, 0.035));
  frame = max(frame, -sdBox(w, vec3(WIN_HALF.x - 0.035, WIN_HALF.y - 0.035, 0.1)));
  frame = min(frame, sdBox(w, vec3(0.016, WIN_HALF.y, 0.03)));
  frame = min(frame, sdBox(p - vec3(WIN.x, uTransomY, WIN.z), vec3(WIN_HALF.x, 0.016, 0.03)));
  frame = min(frame, sdBox(p - vec3(WIN.x, WIN.y - WIN_HALF.y - 0.02, WALL_Z + 0.06), vec3(WIN_HALF.x + 0.06, 0.018, 0.08)));
  if (frame < res.x) res = vec2(frame, M_FRAME);

  if (uWallObject == 1 || uWallObject == 2) {
    vec2 size = uWallObject == 1 ? vec2(0.11, 0.14) : vec2(0.13, 0.19);
    float obj = sdBox(p - vec3(0.42, 1.52, WALL_Z + 0.012), vec3(size, 0.012));
    if (obj < res.x) res = vec2(obj, M_WALLOBJ);
  } else if (uWallObject == 3) {
    float shelf = sdBox(p - vec3(0.4, 1.42, WALL_Z + 0.08), vec3(0.24, 0.012, 0.08));
    shelf = min(shelf, sdBox(p - vec3(0.33, 1.5, WALL_Z + 0.07), vec3(0.03, 0.07, 0.05)));  // a book
    shelf = min(shelf, sdBox(p - vec3(0.37, 1.49, WALL_Z + 0.07), vec3(0.018, 0.06, 0.05)));
    if (shelf < res.x) res = vec2(shelf, M_WALLOBJ);
  }

  float table = sdRoundBox(p - vec3(-0.15, 0.715, 0.35), vec3(0.95, 0.018, 0.42), 0.006);
  if (table < res.x) res = vec2(table, M_TABLE);
  vec2 v = sdVessel(p);
  if (v.x < res.x) res = v;

  vec2 chair = sdChair(p);
  if (chair.x < res.x) res = chair;
  if (figure()) {
    vec2 body = sdBody(p);
    if (body.x < res.x) res = body;
    vec2 head = sdHead(p);
    if (head.x < res.x) res = head;
  }
  return res;
}

vec3 calcNormal(vec3 p) {
  const vec2 k = vec2(1.0, -1.0);
  const float e = 0.0006;
  return normalize(k.xyy * map(p + k.xyy * e).x + k.yyx * map(p + k.yyx * e).x +
                   k.yxy * map(p + k.yxy * e).x + k.xxx * map(p + k.xxx * e).x);
}

float softShadow(vec3 ro, vec3 rd, float tmax, float k) {
  float res = 1.0;
  float t = 0.015;
  for (int i = 0; i < 40; i++) {
    float h = map(ro + rd * t).x;
    res = min(res, k * h / t);
    t += clamp(h, 0.01, 0.15);
    if (res < 0.002 || t > tmax) break;
  }
  return clamp(res, 0.0, 1.0);
}

float ambientOcclusion(vec3 p, vec3 n) {
  float occ = 0.0, sca = 1.0;
  for (int i = 0; i < 5; i++) {
    float h = 0.01 + 0.06 * float(i);
    occ += (h - map(p + n * h).x) * sca;
    sca *= 0.8;
  }
  return clamp(1.0 - 2.2 * occ, 0.0, 1.0);
}

vec3 albedo(float m, vec3 p) {
  vec2 o = seedOffset(uSeed);
  if (m == M_WALL) {
    float stain = fbm(p.xy * 2.3 + o, 4) * 0.5 + 0.5;
    float fine = fbm(p.xy * 40.0 + o, 3);
    return vec3(0.4, 0.38, 0.35) * (0.86 + 0.18 * stain + 0.05 * fine);
  }
  if (m == M_FLOOR) return vec3(0.12, 0.09, 0.07) * (0.85 + 0.3 * fbm(vec2(p.x * 2.0, p.z * 30.0) + o, 3));
  if (m == M_FRAME) return vec3(0.62, 0.6, 0.56);
  if (m == M_TABLE) {
    float grain = fbm(vec2(p.x * 3.0, p.z * 60.0) + o, 4);
    return vec3(0.2, 0.13, 0.08) * (0.8 + 0.35 * grain);
  }
  if (m == M_CHAIR) return vec3(0.16, 0.1, 0.065) * (0.85 + 0.3 * fbm(vec2(p.y * 40.0, p.x * 4.0) + o, 3));
  if (m == M_VESSEL) return uVessel == 2 ? vec3(0.08, 0.09, 0.09) : vec3(0.66, 0.64, 0.6);
  if (m == M_COAT) {
    float weave = 0.3 * (sin(p.x * 900.0) * sin(p.y * 900.0) * 0.5 + 0.5);
    return uCoat * (0.85 + 0.2 * weave + 0.15 * fbm(p.xy * 30.0 + o, 3));
  }
  if (m == M_SHIRT) return vec3(0.62, 0.61, 0.58);
  if (m == M_SKIN) return vec3(0.63, 0.47, 0.39) * (0.94 + 0.08 * fbm(p.xy * 90.0 + o, 3));
  if (m == M_HAIR) return vec3(0.055, 0.045, 0.04) * (0.8 + 0.4 * fbm(p.xy * 400.0 + o, 2));
  if (m == M_WALLOBJ) return uWallObject == 2 ? vec3(0.06, 0.065, 0.07) : vec3(0.3, 0.29, 0.27);
  if (m == M_EYE) return vec3(0.05, 0.045, 0.04);
  return vec3(0.5);
}

// What the window shows. Nothing in the archive says what was outside.
vec3 outsideView(vec3 p) {
  vec2 q = p.xy;
  float g = clamp((q.y - 0.8) / 2.0, 0.0, 1.0);
  vec3 sky = vec3(3.1, 3.08, 3.02) * (0.92 + 0.12 * g);
  if (uOutside == 1) {
    // A facade across the courtyard, its windows in shadow.
    vec2 cell = vec2(q.x * 3.2, q.y * 2.6);
    vec2 f = fract(cell);
    float win = step(0.3, f.x) * step(f.x, 0.72) * step(0.25, f.y) * step(f.y, 0.8);
    vec3 facade = vec3(1.25, 1.2, 1.12) * (1.0 - 0.55 * win) * (0.9 + 0.1 * fbm(q * 6.0, 3));
    return mix(facade, sky, smoothstep(2.25, 2.3, q.y));
  }
  if (uOutside == 2) {
    float crown = fbm(q * 3.5 + 11.0, 5) + (2.1 - q.y) * 0.9;
    vec3 leaves = vec3(0.45, 0.52, 0.42) * (0.6 + 0.6 * fbm(q * 18.0, 3));
    return mix(sky, leaves, smoothstep(0.35, 0.5, crown));
  }
  if (uOutside == 3) {
    // The sea: a hard horizon, darker water, a trail of light under the sun.
    float horizon = 1.48;
    if (q.y > horizon) return sky * (0.9 + 0.1 * smoothstep(horizon, horizon + 0.6, q.y));
    float depth = clamp((horizon - q.y) / 0.7, 0.0, 1.0);
    vec3 water = mix(vec3(1.3, 1.34, 1.36), vec3(0.4, 0.45, 0.5), pow(depth, 0.6));
    float swell = gnoise(vec2(q.x * 9.0, q.y * 70.0)) * 0.5 + 0.5;
    water *= 0.9 + 0.2 * swell;
    float glint = gnoise(vec2(q.x * 70.0, q.y * 420.0)) * 0.5 + 0.5;
    water += vec3(2.2, 2.1, 1.9) * pow(glint, 5.0) * smoothstep(0.35, 0.0, abs(q.x + 0.5)) * (1.0 - 0.6 * depth);
    return water;
  }
  return sky;
}

vec3 hable(vec3 x) {
  const float A = 0.15, B = 0.5, C = 0.1, D = 0.2, E = 0.02, F = 0.3;
  return ((x * (A * x + C * B) + D * E) / (x * (A * x + B) + D * F)) - E / F;
}

// Sunlight through the window: only points whose path to the sun crosses the glass.
float sunThroughWindow(vec3 p, vec3 n, vec3 L) {
  if (uSun <= 0.0 || L.z >= 0.0) return 0.0;
  float t = (WALL_Z - p.z) / L.z;
  if (t <= 0.0) return 0.0;
  vec3 q = p + L * t;
  vec2 d = abs(q.xy - WIN.xy) - (WIN_HALF.xy - 0.035);
  float inWin = 1.0 - smoothstep(-0.01, 0.01, max(d.x, d.y));
  float mull = smoothstep(0.012, 0.022, abs(q.x - WIN.x)) * smoothstep(0.012, 0.022, abs(q.y - uTransomY));
  float ndl = max(dot(n, L), 0.0);
  if (inWin * mull * ndl <= 0.0) return 0.0;
  return inWin * mull * ndl * softShadow(p + n * 0.002, L, t - 0.05, 14.0);
}

vec4 shade(vec3 ro, vec3 rd) {
  float t = 0.0;
  vec2 h = vec2(0.0);
  for (int i = 0; i < 256; i++) {
    if (i >= uSteps) break;
    vec3 p = ro + rd * t;
    h = map(p);
    if (h.x < 0.0004 * t) break;
    t += h.x * 0.85;
    if (t > 8.0) break;
  }
  vec3 p = ro + rd * t;
  float m = h.y;

  if (uOutput == 1) return vec4(clamp(t / 4.0, 0.0, 1.0), m / 16.0, 0.0, 1.0);
  if (m == M_OUTSIDE) return vec4(outsideView(p), 1.0);

  vec3 n = calcNormal(p);
  vec3 alb = albedo(m, p);
  float ao = ambientOcclusion(p, n);

  vec3 keyDir = normalize(vec3(-1.0, 0.42, 0.55));
  float keyWrap = (m == M_SKIN) ? 0.35 : 0.12;
  float ndl = clamp((dot(n, keyDir) + keyWrap) / (1.0 + keyWrap), 0.0, 1.0);
  float sh = softShadow(p + n * 0.002, keyDir, 3.0, 9.0);
  // With sun the room is a little darker by contrast; without it, softer.
  vec3 key = vec3(1.0, 0.96, 0.9) * mix(1.7, 1.35, uSun) * ndl * mix(0.08, 1.0, sh);

  vec3 wc = WIN + vec3(0.0, 0.0, -0.1);
  vec3 wl = wc - p;
  float wd = length(wl);
  wl /= wd;
  float wndl = clamp(dot(n, wl), 0.0, 1.0);
  float wsh = (m == M_WALL || m == M_FRAME) ? 1.0 : softShadow(p + n * 0.002, wl, wd - 0.2, 6.0);
  vec3 back = vec3(0.92, 0.95, 1.0) * 1.3 * wndl * wsh / (0.4 + wd * wd);

  vec3 spill = vec3(0.0);
  if (m == M_WALL || m == M_FRAME) {
    float dx = max(abs(p.x - WIN.x) - 0.3, 0.0);
    float dy = max(abs(p.y - WIN.y) - 0.68, 0.0);
    spill = vec3(0.95, 0.96, 1.0) * 0.55 * exp(-8.0 * length(vec2(dx, dy)));
  }

  vec3 L = normalize(vec3(-0.28, 0.5, -0.82));
  vec3 sun = vec3(7.0, 5.6, 3.9) * uSun * sunThroughWindow(p, n, L);

  vec3 amb = vec3(0.1, 0.1, 0.105) * ao;
  vec3 col = alb * (key + back + amb + spill + sun);

  vec3 hv = normalize(keyDir - rd);
  float glossy = m == M_EYE ? 180.0 : (m == M_VESSEL ? 90.0 : (m == M_WALLOBJ ? 200.0 : 30.0));
  float spec = pow(clamp(dot(n, hv), 0.0, 1.0), glossy);
  float specAmt = m == M_EYE ? 0.7 : (m == M_VESSEL ? (uVessel == 2 ? 1.4 : 0.6) : (m == M_SKIN ? 0.07 : (m == M_HAIR ? 0.05 : (m == M_WALLOBJ && uWallObject == 2 ? 1.0 : 0.0))));
  col += spec * specAmt * sh;
  // A glass or a mirror catches the window.
  if ((m == M_VESSEL && uVessel == 2) || (m == M_WALLOBJ && uWallObject == 2)) {
    float fres = pow(1.0 - abs(dot(n, -rd)), 3.0);
    col += vec3(0.9, 0.93, 1.0) * (0.15 + 0.8 * fres) * wndl;
  }

  col = mix(col, vec3(0.13, 0.13, 0.135), clamp((t - 1.6) * 0.12, 0.0, 0.35));
  return vec4(col, 1.0);
}

void camera(out vec3 ro, out vec3 target, out float fov) {
  if (uComposition == 0) { ro = vec3(-0.03, 1.21, 0.82); target = vec3(0.03, 1.15, 0.0); fov = 21.0; }
  else if (uComposition == 1) { ro = vec3(0.22, 1.26, 1.8); target = vec3(-0.08, 0.92, -0.6); fov = 22.0; }
  else { ro = vec3(0.02, 1.2, 1.42); target = vec3(-0.02, 1.08, -0.4); fov = 21.0; }
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  vec3 ro, target;
  float fov;
  camera(ro, target, fov);
  vec3 fw = normalize(target - ro);
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(rt, fw);
  float tanHalf = tan(radians(fov));
  vec2 ndc = uv * 2.0 - 1.0;

  int ss = uOutput == 1 ? 1 : uSupersample;
  vec4 acc = vec4(0.0);
  for (int j = 0; j < 2; j++)
  for (int i = 0; i < 2; i++) {
    if (i >= ss || j >= ss) continue;
    vec2 jitter = (vec2(float(i), float(j)) + 0.5) / float(ss) - 0.5;
    vec2 q = ndc + jitter * 2.0 / uResolution;
    vec3 rd = normalize(fw + q.x * aspect * tanHalf * rt + q.y * tanHalf * up);
    acc += shade(ro, rd);
  }
  vec4 c = acc / float(ss * ss);
  if (uOutput == 1) { outColor = c; return; }

  vec3 col = c.rgb * 0.95;
  col = hable(col) / hable(vec3(6.0));
  vec2 vq = (uv - 0.5) * vec2(aspect, 1.0);
  col *= 1.0 - 0.35 * dot(vq, vq);
  col = pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2));

  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  if (uMono == 1) {
    // The archive is black and white: silver prints, slightly warm.
    col = vec3(smoothstep(-0.02, 1.02, l)) * vec3(1.0, 0.985, 0.96);
  } else {
    col = mix(vec3(l), col, 0.75);
  }
  outColor = vec4(col, 1.0);
}
