# SINTESI — Architettura tecnica

La gerarchia del progetto è `CONCEPT → SYSTEM → ALGORITHM → VISUAL`. Ogni componente esiste per rendere visibile una relazione concettuale, non per produrre un effetto.

## Stack

| ruolo | tecnologia | perché |
|---|---|---|
| linguaggio | TypeScript | un solo linguaggio per engine, script e test |
| build/dev | Vite | nessun framework, build statica offline |
| rendering | Three.js + GLSL 3 (WebGL2) | shader completamente controllati (`RawShaderMaterial`) |
| rendering offline | Playwright + Chromium headless | lo stesso codice del live produce i frame del master |
| video | FFmpeg (sistema o `ffmpeg-static`) | H.264 per l'esposizione, ProRes 422 HQ per l'archivio |
| test | Vitest | |

Nessun React, nessun backend, nessuna API esterna.

## Flusso dei dati

```text
dataset (archive/ o demo)          timeline (dichiarativa)          seed
        │                                   │                          │
        ▼                                   │                          │
  EVIDENCE ──► grafo semantico ──► layout deterministico               │
        │           │                       │                          │
        │           └──► INFERENCE (derivate, confidence ≤ supporto)   │
        ▼                                   ▼                          ▼
             CHOREOGRAPHY.evaluate(t)  — funzione pura del tempo
        │                 │                   │
        ▼                 ▼                   ▼
  elementi (pos, size,   relazioni          campo di confidence
  confidence, coherence) (strength, k)      (ancore + inferenze + reach)
        │                 │                   │
        ▼                 ▼                   ▼
  FragmentLayer        EdgeLayer        field.frag → composite.frag
        └─────────────────┴───────────────────┘
                          ▼
                     post.frag (grana, nero, dither) → frame
                          │
                          └──► ArtisticState ──► AudioParams / control.csv
```

## Componenti

**`config.ts`** — preset di qualità (`dev` 0.25×, `preview` 0.5×, `final` 1.0× di 2160 × 3840) tramite `renderScale`; risoluzione del campo, tap di blur, passi del raymarch, grana.

**`timeline/`** — la timeline è un dato: fasi con `start`, `end`, `title`. `evaluateTimeline(t)` restituisce la fase attiva e il progresso di *ogni* fase. I layer non conoscono tempi assoluti: chiedono "quanto siamo dentro CORRELATION?". Due timeline: `prototype` (25 s) e `full` (210 s). Si possono cambiare le durate senza toccare il renderer.

**`evidence/`** — il modello concettuale:

```ts
interface Evidence { id; type; source; provenance; semanticWeight; confidence; relationships; label?; visualProperties? }
interface Concept  { id; label; anchor }                 // dove la categoria vive nell'immagine
interface Inference { id; sourceEvidence; confidence; semanticCategory; visualImpact; center; radius }
type Provenance = 'observed' | 'derived' | 'inferred' | 'synthetic';
```

**`correlation/`** — `buildGraph` crea nodi (evidenze e concetti) e archi. La forza di una relazione non è scritta a mano: emerge da peso semantico e affidabilità delle due estremità (`√(wa·wb) · min(ca, cb)`). `forceLayout` è un layout force-directed deterministico con i concetti fissati nei loro punti dell'immagine.

**`inference/`** — per ogni concetto, le evidenze fotografiche collegate sostengono un'inferenza centrata su di esse. La sua confidence non può superare il supporto più debole ed è attenuata in quanto ipotesi (`inferredConfidence`).

**`core/choreography.ts`** — il cuore. `evaluate(t)` calcola posizione, dimensione, confidence e coerenza di ogni elemento, delle relazioni e del campo, *senza stato*: nessun valore passa da un frame al successivo. Ordine di acquisizione, catalogo dell'archivio, mappa semantica e punti d'arrivo sono calcolati una volta in `prepare()` dal seed.

**`subject/`** — l'immagine da ricostruire, come tre layer allineati (`SubjectSource`):
- `observed` — ciò che le fotografie d'archivio hanno registrato (bianco e nero);
- `inferred` — ciò che il sistema crede (colore, con differenze plausibili e non documentate);
- `data` — profondità, id di regione (per DECONSTRUCTION), id materiale.

Nella milestone 1 i tre layer sono generati da `subject.frag`, un raymarcher procedurale renderizzato una volta sola, a tile. Il soggetto definitivo (ComfyUI + stima di profondità + segmentazione) riempirà gli stessi tre layer da file: nient'altro cambia.

**`rendering/`** — `Atlas` disegna una volta, con Canvas2D alla densità d'uscita, tutto ciò che è tipografico o diagrammatico (testimonianze, date, forme d'onda, mappe, concetti, titoli). `FragmentLayer` e `EdgeLayer` sono quad istanziati (una draw call ciascuno). `glsl.ts` risolve `#include` a build time.

**`confidence/`** — `coherenceParams(k)` è l'implementazione di riferimento della legge visiva; `reconstruction.glsl` la replica. `artisticState.ts` riassume l'istante (confidence, acceptance, coherence, evidenze, relazione, quota inferita).

**`audio/`** — `audioParams(state)`: armonicità ← coerenza, pulsazione ← relazioni, densità ← evidenze, ampiezza spettrale ← quota inferita, livello (solo l'assenza è silenzio). Nella milestone 1 non c'è un motore audio: i parametri vengono scritti per frame in `control.csv` per automatizzare il sound design in una DAW.

## Il confidence system

Due grandezze:

- `confidence` — epistemica: quanto il sistema sa.
- `acceptance` — quanto il sistema smette di segnalare ciò che non sa.

```text
k = mix(confidence, 1, acceptance)          // coerenza mostrata
```

`k` controlla, e non l'opacità:

| parametro | legge (u = 1 − k) | significato |
|---|---|---|
| displacement | 0.07 · u^1.5 | la materia fluisce (campo a divergenza nulla) |
| fragmentation | 0.32 · u² | i pezzi si allontanano da dove appartengono |
| dropout | 0.8 · smoothstep(0.45, 0.97, u) | celle di cui non si sa nulla |
| blur | u^1.4 | il dettaglio si dissolve |
| noise | smoothstep(0.35, 1, u) | struttura sostituita da rumore di pari energia |
| levels | 256 → 5 | l'informazione tonale collassa (bit depth) |
| instability | u | ciò che è incerto continua a cercare, ciò che è certo è fermo |
| presence | smoothstep(0, 0.12, k) | solo l'assenza scompare |

La soglia di ogni cella di dropout è fissa: quando la confidence sale, i pezzi mancanti si riempiono uno alla volta, senza sfarfallio. `npm run validate` misura questa legge: a `k = 0.4` la struttura (correlazione con l'immagine certa) crolla mentre l'energia (luminanza media) resta.

### Il campo di confidence (INFERENCE)

`field.frag` calcola a risoluzione ridotta, per ogni punto dell'immagine:
- dentro un frammento fotografico arrivato al suo posto → confidence del frammento (**observed**);
- attorno ai frammenti → confidence decrescente (≤ 0.5 × frammento), con raggio che cresce con `reach`;
- attorno a ogni inferenza → la sua confidence (bassa per costruzione), su un raggio che cresce con `reach`;
- ovunque → un `prior` debole ("la stanza esiste").

Il confine è irregolare (fbm) e lentamente vivo. `composite.frag` rende il layer `inferred` con la coerenza che il campo consente: la struttura si decide per cella di Voronoi, l'assenza per pixel. Il colore appare solo dove la coerenza supera ~0.5. I frammenti osservati sono disegnati sopra, nitidi: le **cuciture** tra ciò che è registrato e ciò che è creduto sono il segno dell'inferenza.

## Shader

```text
shaders/lib/
  noise.glsl           hash aritmetici (niente sin), gradient/value noise, fbm, voronoi — tutto seedato
  displacement.glsl    deformazione controllata: curl di un potenziale fbm
  blur.glsl            blur a disco golden-angle su mipmap, raggio ← confidence
  grain.glsl           grana pellicola sottilissima, per (pixel, frame, seed)
  reconstruction.glsl  la legge della coerenza, ricerca delle celle, quantizzazione, riempimento a rumore, risposta di stampa
shaders/passes/
  subject.frag         soggetto demo procedurale (observed / inferred / data)
  fragment.vert/.frag  ogni traccia d'archivio
  edge.vert/.frag      relazioni (stabilità = forza)
  field.frag           campo di confidence
  composite.frag       immagine inferita
  post.frag            nero, vignettatura minima, grana, dither
```

`deconstruction.glsl` arriverà con la milestone di DECONSTRUCTION (rimozione per regione dal layer `data`, ordine configurabile).

## Rendering deterministico

`seed + dataset + configurazione ⇒ sempre lo stesso risultato.`

- Nessun `Math.random()`: tutta la casualità viene da `createRng(seed, stream)` (sfc32) o da `hash32`.
- Nessun tempo reale nel percorso di rendering (solo il player live legge l'orologio).
- Hash GLSL aritmetici (niente `fract(sin(dot()))`, che varia tra GPU).
- `renderAt(t)` è una funzione pura: il frame N è identico se renderizzato in sequenza, fuori ordine o in una sessione nuova (`npm run validate` lo verifica).
- Il render offline usa per default SwiftShader (rasterizzazione su CPU): stesso output bit per bit su qualunque macchina. `--gpu` è più veloce ma può differire di un LSB tra GPU diverse.
- Il `manifest.json` di ogni render registra seed, qualità, commit, stato del working tree, hash del dataset, renderer e SHA-256 di ogni frame: due versioni dell'opera si confrontano frame per frame.

## Modalità di qualità

| | DEV | PREVIEW | FINAL |
|---|---|---|---|
| risoluzione | 540 × 960 | 1080 × 1920 | 2160 × 3840 |
| campo di confidence | 50% | 35% | 25% |
| tap di blur | 8 | 12 | 16 |
| passi raymarch soggetto | 72 | 110 | 160 |

Tempi misurati in questo ambiente (4 core CPU, SwiftShader, nessuna GPU): DEV ≈ 0.2 s/frame; il soggetto procedurale si costruisce una volta sola all'avvio. Su una GPU moderna il live DEV/PREVIEW gira in tempo reale.

## Estendere

- **Nuova fase**: aggiungerla alla timeline e leggere `frame.timeline.progress.<FASE>` nella coreografia.
- **Nuovo tipo di evidenza**: `EvidenceType`, un disegno in `atlasContent.ts`, una voce in `TYPE_ORDER`.
- **Soggetto reale**: implementare un `SubjectSource` da file (vedi PRODUCTION.md).
