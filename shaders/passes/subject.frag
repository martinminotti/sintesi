// DEMO SUBJECT — a procedural stand-in for the synthesized photograph.
//
// A person seated at a table by a window, low-key daylight from the left.
// Rendered once, before the timeline starts, into three textures:
//   uOutput 0: the OBSERVED scene  — what the archive photographs recorded
//   uOutput 1: the INFERRED scene  — what the system believes; almost the same
//   uOutput 2: data                — depth, region id
// The inferred scene differs in a few plausible, undocumented details
// (a mullion, a frame on the wall, the cup handle, colour). Where the
// system's belief meets the archive, those differences surface as seams.
//
// When a real subject is produced (ComfyUI + depth + segmentation), these
// three textures are replaced by files; nothing else changes.

#include "lib/noise.glsl"

in vec2 vUv;
out vec4 outColor;

uniform float uSeed;
uniform int uOutput;
uniform int uSteps;
uniform vec2 uResolution;

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
const float M_WALL = 1.0;
const float M_FRAME = 2.0;
const float M_OUTSIDE = 3.0;
const float M_TABLE = 4.0;
const float M_CUP = 5.0;
const float M_COAT = 6.0;
const float M_SKIN = 7.0;
const float M_HAIR = 8.0;
const float M_CURTAIN = 9.0;
const float M_FLOOR = 10.0;
const float M_PICTURE = 11.0;
const float M_EYE = 12.0;
const float M_SHIRT = 13.0;

// Region ids used later by DECONSTRUCTION (order of removal is configured in TS).
// 1 environment · 2 background · 3 object · 4 body · 5 face · 6 identity
float regionOf(float m) {
  if (m == M_OUTSIDE || m == M_FRAME || m == M_CURTAIN || m == M_PICTURE) return 1.0;
  if (m == M_WALL || m == M_FLOOR) return 2.0;
  if (m == M_TABLE || m == M_CUP) return 3.0;
  if (m == M_COAT || m == M_SHIRT || m == M_HAIR) return 4.0;
  if (m == M_SKIN) return 5.0;
  if (m == M_EYE) return 6.0;
  return 0.0;
}

float inferred() { return uOutput == 1 ? 1.0 : 0.0; }

// ---------------------------------------------------------------- scene
const vec3 HEAD = vec3(0.07, 1.215, 0.0);
const float WALL_Z = -1.35;

vec3 headForward() { return normalize(vec3(-0.9, -0.17, 0.4)); }

vec2 sdHead(vec3 p) {
  vec3 fz = headForward();
  vec3 fx = normalize(cross(vec3(0.0, 1.0, 0.0), fz));
  vec3 fy = cross(fz, fx);
  vec3 q = p - HEAD;
  q = vec3(dot(q, fx), dot(q, fy), dot(q, fz));
  vec3 s = vec3(abs(q.x), q.yz); // symmetric features

  float d = sdEllipsoid(q - vec3(0.0, 0.02, -0.012), vec3(0.076, 0.098, 0.097)); // cranium
  d = smin(d, sdEllipsoid(q - vec3(0.0, -0.045, 0.022), vec3(0.063, 0.074, 0.078)), 0.035); // face mass
  d = smin(d, sdEllipsoid(q - vec3(0.0, -0.1, 0.055), vec3(0.03, 0.022, 0.026)), 0.03); // chin
  d = smin(d, sdEllipsoid(s - vec3(0.045, -0.072, 0.02), vec3(0.022, 0.03, 0.04)), 0.03); // jaw
  d = smin(d, sdEllipsoid(s - vec3(0.044, -0.012, 0.062), vec3(0.024, 0.018, 0.02)), 0.02); // cheekbones
  d = smin(d, sdEllipsoid(q - vec3(0.0, 0.033, 0.078), vec3(0.058, 0.014, 0.022)), 0.02); // brow
  d = smin(d, sdCapsule(q, vec3(0.0, 0.012, 0.09), vec3(0.0, -0.028, 0.108), 0.0105), 0.014); // nose bridge
  d = smin(d, sdEllipsoid(q - vec3(0.0, -0.03, 0.104), vec3(0.016, 0.011, 0.012)), 0.01); // nose tip
  d = smax(d, -sdEllipsoid(s - vec3(0.029, 0.01, 0.095), vec3(0.02, 0.013, 0.016)), 0.012); // eye sockets
  d = smin(d, sdEllipsoid(q - vec3(0.0, -0.058, 0.093), vec3(0.022, 0.0075, 0.012)), 0.008); // upper lip
  d = smin(d, sdEllipsoid(q - vec3(0.0, -0.072, 0.089), vec3(0.02, 0.008, 0.012)), 0.008); // lower lip
  d = smax(d, -sdEllipsoid(q - vec3(0.0, -0.065, 0.1), vec3(0.018, 0.0018, 0.01)), 0.002); // mouth line
  d = smin(d, sdEllipsoid(s - vec3(0.074, -0.012, -0.012), vec3(0.009, 0.022, 0.014)), 0.006); // ears

  // Neck (follows the body more than the head).
  d = smin(d, sdCapsule(p, HEAD + vec3(0.005, -0.07, -0.03), HEAD + vec3(0.015, -0.22, -0.03), 0.048), 0.03);

  vec2 res = vec2(d, M_SKIN);

  float eye = sdEllipsoid(s - vec3(0.029, 0.009, 0.08), vec3(0.0105, 0.0085, 0.01));
  if (eye < res.x) res = vec2(eye, M_EYE);

  // Hair: a cap over the cranium, kept above the hairline and behind the ears.
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
  // Upper arms, resting forward towards the table.
  vec3 sq = vec3(abs(q.x), q.yz);
  d = smin(d, sdCapsule(sq, vec3(0.175, -0.06, -0.01), vec3(0.2, -0.32, 0.09), 0.056), 0.05);
  d = smin(d, sdCapsule(sq, vec3(0.2, -0.32, 0.09), vec3(0.12, -0.44, 0.3), 0.048), 0.04);
  // Coat texture: soft folds.
  d += 0.003 * gnoise3(q * vec3(18.0, 7.0, 18.0));

  // Collar: a raised band around the neck.
  float collar = sdTorus((q - vec3(0.0, 0.035, 0.0)).xzy * vec3(1.0, 1.0, 1.0), vec2(0.058, 0.02));
  collar = max(collar, -(q.y - 0.0));
  vec2 res = vec2(d, M_COAT);
  float collarShape = smin(collar, sdEllipsoid(q - vec3(0.0, 0.01, 0.045), vec3(0.06, 0.05, 0.02)), 0.02);
  // The shirt shows in the V of the coat.
  float shirt = sdEllipsoid(q - vec3(0.0, -0.03, 0.06), vec3(0.045, 0.07, 0.03));
  if (shirt < res.x - 0.004) res = vec2(shirt, M_SHIRT);
  if (collarShape < res.x) res = vec2(collarShape, M_COAT);
  return res;
}

vec2 map(vec3 p) {
  // Back wall with a window opening.
  vec3 win = vec3(-0.46, 1.62, WALL_Z);
  vec3 winHalf = vec3(0.3, 0.68, 0.2);
  float wall = p.z - WALL_Z;
  wall = max(wall, (WALL_Z - 0.12) - p.z);
  wall = max(wall, -sdBox(p - win, winHalf));
  vec2 res = vec2(wall, M_WALL);

  float floorD = p.y;
  if (floorD < res.x) res = vec2(floorD, M_FLOOR);

  // Outside: an overexposed field beyond the glass.
  float outside = p.z - (WALL_Z - 1.6);
  if (outside < res.x) res = vec2(outside, M_OUTSIDE);

  // Window frame and mullions (the inferred scene misplaces the transom).
  float transomY = mix(1.83, 1.71, inferred());
  vec3 w = p - win;
  float frame = sdBox(w, vec3(winHalf.x, winHalf.y, 0.035));
  frame = max(frame, -sdBox(w, vec3(winHalf.x - 0.035, winHalf.y - 0.035, 0.1)));
  frame = min(frame, sdBox(w - vec3(0.0, 0.0, 0.0), vec3(0.016, winHalf.y, 0.03)));
  frame = min(frame, sdBox(p - vec3(win.x, transomY, win.z), vec3(winHalf.x, 0.016, 0.03)));
  frame = min(frame, sdBox(p - vec3(win.x, win.y - winHalf.y - 0.02, WALL_Z + 0.06), vec3(winHalf.x + 0.06, 0.018, 0.08))); // sill
  if (frame < res.x) res = vec2(frame, M_FRAME);

  // A small frame on the wall — only the system believes it exists.
  if (inferred() > 0.5) {
    float pic = sdBox(p - vec3(0.42, 1.52, WALL_Z + 0.012), vec3(0.11, 0.14, 0.012));
    if (pic < res.x) res = vec2(pic, M_PICTURE);
  }

  // Table and cup.
  float table = sdRoundBox(p - vec3(-0.15, 0.715, 0.35), vec3(0.95, 0.018, 0.42), 0.006);
  if (table < res.x) res = vec2(table, M_TABLE);
  vec3 cp = p - vec3(-0.17, 0.733 + 0.04, 0.36);
  float cup = sdCylinder(cp, 0.031, 0.04) - 0.003;
  cup = max(cup, -sdCylinder(cp - vec3(0.0, 0.01, 0.0), 0.027, 0.04));
  float handleSide = mix(1.0, -1.0, inferred());
  float handle = sdTorus((cp - vec3(0.037 * handleSide, 0.0, 0.0)).xzy, vec2(0.016, 0.0045));
  cup = min(cup, max(handle, -handleSide * (cp.x - handleSide * 0.03)));
  if (cup < res.x) res = vec2(cup, M_CUP);

  vec2 body = sdBody(p);
  if (body.x < res.x) res = body;
  vec2 head = sdHead(p);
  if (head.x < res.x) res = head;
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
  if (m == M_FLOOR) return vec3(0.12, 0.09, 0.07);
  if (m == M_FRAME) return vec3(0.62, 0.6, 0.56);
  if (m == M_TABLE) {
    float grain = fbm(vec2(p.x * 3.0, p.z * 60.0) + o, 4);
    return vec3(0.2, 0.13, 0.08) * (0.8 + 0.35 * grain);
  }
  if (m == M_CUP) return vec3(0.66, 0.64, 0.6);
  if (m == M_COAT) {
    float weave = 0.3 * (sin(p.x * 900.0) * sin(p.y * 900.0) * 0.5 + 0.5);
    // The archive never recorded the colour of the coat.
    vec3 tone = mix(vec3(0.17, 0.16, 0.15), vec3(0.23, 0.15, 0.1), inferred());
    return tone * (0.85 + 0.2 * weave + 0.15 * fbm(p.xy * 30.0 + o, 3));
  }
  if (m == M_SHIRT) return vec3(0.62, 0.61, 0.58);
  if (m == M_SKIN) return vec3(0.63, 0.47, 0.39) * (0.94 + 0.08 * fbm(p.xy * 90.0 + o, 3));
  if (m == M_HAIR) return vec3(0.055, 0.045, 0.04) * (0.8 + 0.4 * fbm(p.xy * 400.0 + o, 2));
  if (m == M_CURTAIN) return vec3(0.74, 0.72, 0.66);
  if (m == M_PICTURE) return vec3(0.3, 0.29, 0.27);
  if (m == M_EYE) return vec3(0.05, 0.045, 0.04);
  return vec3(0.5);
}

// Filmic tone curve (Hable), normalised to white = 6.
vec3 hable(vec3 x) {
  const float A = 0.15, B = 0.5, C = 0.1, D = 0.2, E = 0.02, F = 0.3;
  return ((x * (A * x + C * B) + D * E) / (x * (A * x + B) + D * F)) - E / F;
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

  if (uOutput == 2) {
    // Data pass: linear depth (normalised to 4 m) and region id.
    return vec4(clamp(t / 4.0, 0.0, 1.0), regionOf(m) / 8.0, m / 16.0, 1.0);
  }

  if (m == M_OUTSIDE) {
    float g = 0.5 + 0.5 * p.y;
    vec3 sky = vec3(3.2, 3.25, 3.3) * (0.9 + 0.1 * g);
    // The faint silhouette of a building across the courtyard.
    float facade = step(p.x, -0.52 + 0.04 * sin(p.y * 2.0)) * step(p.y, 2.05);
    sky = mix(sky, vec3(1.5, 1.45, 1.4), facade * 0.6);
    return vec4(sky, 1.0);
  }

  vec3 n = calcNormal(p);
  vec3 alb = albedo(m, p);
  float ao = ambientOcclusion(p, n);

  // Key: daylight through a large window outside the frame, left and slightly in front.
  vec3 keyDir = normalize(vec3(-1.0, 0.42, 0.55));
  float keyWrap = (m == M_SKIN) ? 0.35 : 0.12;
  float ndl = clamp((dot(n, keyDir) + keyWrap) / (1.0 + keyWrap), 0.0, 1.0);
  float sh = softShadow(p + n * 0.002, keyDir, 3.0, 9.0);
  vec3 key = vec3(1.0, 0.96, 0.9) * 1.7 * ndl * mix(0.08, 1.0, sh);

  // The visible window lights the room from behind: rim and wall glow.
  vec3 win = vec3(-0.46, 1.62, WALL_Z - 0.1);
  vec3 wl = win - p;
  float wd = length(wl);
  wl /= wd;
  float wndl = clamp(dot(n, wl), 0.0, 1.0);
  float wsh = (m == M_WALL || m == M_FRAME || m == M_CURTAIN) ? 1.0 : softShadow(p + n * 0.002, wl, wd - 0.2, 6.0);
  vec3 back = vec3(0.92, 0.95, 1.0) * 1.3 * wndl * wsh / (0.4 + wd * wd);

  // Near the opening, the wall catches spill.
  vec3 spill = vec3(0.0);
  if (m == M_WALL || m == M_FRAME) {
    float dx = max(abs(p.x - win.x) - 0.3, 0.0);
    float dy = max(abs(p.y - win.y) - 0.68, 0.0);
    spill = vec3(0.95, 0.96, 1.0) * 0.55 * exp(-8.0 * length(vec2(dx, dy)));
  }

  vec3 amb = vec3(0.1, 0.1, 0.105) * ao;
  vec3 col = alb * (key + back + amb + spill);

  // Curtain transmits daylight.
  if (m == M_CURTAIN) col += alb * vec3(1.6, 1.6, 1.55) * 0.55;

  // Speculars: skin sheen, eye highlight, glaze of the cup.
  vec3 hv = normalize(keyDir - rd);
  float spec = pow(clamp(dot(n, hv), 0.0, 1.0), m == M_EYE ? 180.0 : (m == M_CUP ? 90.0 : 30.0));
  float specAmt = m == M_EYE ? 0.7 : (m == M_CUP ? 0.6 : (m == M_SKIN ? 0.07 : (m == M_HAIR ? 0.05 : 0.0)));
  col += spec * specAmt * sh;

  // Atmosphere: light depth haze towards the back of the room.
  col = mix(col, vec3(0.13, 0.13, 0.135), clamp((t - 1.6) * 0.12, 0.0, 0.35));
  return vec4(col, 1.0);
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  vec3 ro = vec3(0.02, 1.2, 1.42);
  vec3 target = vec3(-0.02, 1.08, -0.4);
  vec3 fw = normalize(target - ro);
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(rt, fw);
  float tanHalf = tan(radians(21.0));
  vec2 ndc = uv * 2.0 - 1.0;

  // 2×2 supersampling for the colour passes.
  int ss = uOutput == 2 ? 1 : 2;
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
  if (uOutput == 2) { outColor = c; return; }

  // Photographic response.
  vec3 col = c.rgb * 0.95;
  col = hable(col) / hable(vec3(6.0));
  // Lens: gentle vignette.
  vec2 vq = (uv - 0.5) * vec2(aspect, 1.0);
  col *= 1.0 - 0.35 * dot(vq, vq);
  col = pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2));

  if (uOutput == 0) {
    // The archive is black and white: silver prints, slightly warm.
    float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
    l = smoothstep(-0.02, 1.02, l);
    col = vec3(l) * vec3(1.0, 0.985, 0.96);
  } else {
    // The system's belief is in colour, restrained.
    float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(vec3(l), col, 0.72);
  }
  outColor = vec4(col, 1.0);
}
