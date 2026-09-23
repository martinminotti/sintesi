# SINTESI

**Un ritratto di ciò che rimane** — Martin Minotti, 2026

SINTESI è un sistema audiovisivo generativo che ricostruisce progressivamente l'identità di un soggetto a partire da informazioni frammentarie. Quando i dati finiscono, il sistema comincia a inferire. Quando l'inferenza diventa indistinguibile dall'informazione, nasce un'immagine credibile di qualcosa che non è mai esistito.

Formato 9:16 verticale · master 2160 × 3840 · 24 fps · durata ≈ 3′30″ · loop.

> **Stato: milestone 2 (studi)** — l'arco completo esiste: ARCHIVE → CORRELATION → INFERENCE → SYNTHESIS → DECONSTRUCTION → loop, con ipotesi alternative, regioni epistemiche, acceptance e smontaggio genealogico. Il soggetto è ancora procedurale: la sintesi non è una fotografia (vedi [ARTISTIC_QA.md](ARTISTIC_QA.md) e [docs/MILESTONE_2_REVIEW.md](docs/MILESTONE_2_REVIEW.md)).

---

## Requisiti

- Node.js ≥ 20 (sviluppato con 22)
- Un browser con WebGL2 (Chrome/Chromium consigliato)
- Per il rendering offline: Chromium di Playwright (`npx playwright install chromium`, una volta)
- FFmpeg: usato quello di sistema se presente, altrimenti quello incluso (`ffmpeg-static`)

Nessun servizio cloud, nessuna API, nessuna connessione necessaria durante la riproduzione.

## Avvio

```bash
npm install
npm run dev            # riproduzione live, qualità DEV → http://127.0.0.1:5173
```

Parametri URL: `?quality=dev|preview|final` · `?seed=1987` · `?timeline=prototype|study|full` ·
`?composition=A|B|C` (ritratto · ambiente · figura + ambiente, default C) · `?typography=none|minimal` ·
`?subject=<sessione>` (una sessione di sintesi in `archive/synthesis/`, al posto del soggetto procedurale) ·
`?view=work|epistemic|field|subject-observed|subject-synthesis|subject-alt1…3|subject-data` (viste diagnostiche).

Tastiera (solo sviluppo/installazione, nessuna UI a schermo): `spazio` pausa · `←/→` ±1 s · `1–5` salta alla fase · `d` stato interno · `f` fullscreen.

## Preview e render

```bash
npm run render:dev       # 540 × 960, veloce
npm run render:preview   # 1080 × 1920
npm run render:final     # 2160 × 3840 + master ProRes 422 HQ
npm run render -- --quality=preview --seed=7 --timeline=full --composition=C --from=10 --to=20 --gpu
npm run snapshot -- --t=4,12,21 --quality=preview   # fotogrammi singoli per revisione
npm run export -- renders/<nome>                     # (ri)assembla il video dai frame
```

Ogni render produce in `renders/<timeline>-<qualità>-seed<seed>/`:

| file | contenuto |
|---|---|
| `frames/NNNNNN.png` | fotogrammi numerati |
| `<nome>.mp4` | H.264 (preview/esposizione) |
| `<nome>.mov` | ProRes 422 HQ (solo `final`, master d'archivio) |
| `manifest.json` | seed, qualità, dataset hash, commit, renderer, SHA-256 di ogni frame |
| `control.csv` | stato artistico per frame (confidence, coherence, …) per il sound design |

Senza `--gpu` il rendering usa SwiftShader (CPU): più lento, ma **identico bit per bit su qualunque macchina**.

## Verifica

```bash
npm test            # unit test (timeline, confidence, grafo, determinismo del layout)
npm run validate    # dataset, timeline, determinismo dei frame, legge della coerenza
npm run test:tools  # sessione ComfyUI contro un server finto (Python + Pillow)
npm run build       # typecheck + build statica in dist/
```

`validate` misura quantitativamente che abbassare la confidence distrugga la **struttura** dell'immagine molto più della sua **energia**: confidence ↓ ⇒ coherence ↓, non opacity ↓.

## Struttura

```text
sintesi/
├── archive/            dataset artistico (vuoto: si usa l'archivio demo sintetico)
├── shaders/
│   ├── lib/            noise · displacement · blur · grain · reconstruction
│   └── passes/         subject · field · composite · fragment · edge · post
├── src/
│   ├── config.ts       qualità DEV/PREVIEW/FINAL, renderScale, seed
│   ├── timeline/       timeline dichiarativa (prototype, full)
│   ├── evidence/       modello concettuale: Evidence, Concept, Inference
│   ├── confidence/     legge della coerenza, calendario epistemico, ArtworkState
│   ├── correlation/    grafo semantico, layout deterministico
│   ├── inference/      inferenze derivate dal grafo
│   ├── data/           archivio demo e caricamento del dataset
│   ├── subject/        il soggetto: ipotesi (sintesi + alternative), regioni epistemiche
│   ├── rendering/      atlas tipografico, layer, include GLSL
│   ├── audio/          mappatura stato → parametri sonori (architettura)
│   └── core/           Engine, coreografia (funzione pura del tempo), player live
├── scripts/            render · export · validate · snapshot
├── tests/
└── renders/            output (ignorato da git)
```

## Documentazione

- [ARTISTIC_CONCEPT.md](ARTISTIC_CONCEPT.md) — concept, domanda, fasi, ruolo dell'AI e dell'artista
- [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md) — componenti, flusso dati, shader, confidence, determinismo
- [PRODUCTION.md](PRODUCTION.md) — dataset, asset generativi, master
- [EXHIBITION.md](EXHIBITION.md) — installazione, hardware, loop, fallback
- [ARTISTIC_QA.md](ARTISTIC_QA.md) — domande di verifica artistica a ogni milestone
- [docs/MILESTONE_2_PLAN.md](docs/MILESTONE_2_PLAN.md) · [docs/MILESTONE_2_REVIEW.md](docs/MILESTONE_2_REVIEW.md)
- [docs/CAPTURE_PROTOCOL.md](docs/CAPTURE_PROTOCOL.md) — come costruire l'archivio reale
- [docs/AI_MATERIAL_WORKFLOW.md](docs/AI_MATERIAL_WORKFLOW.md) — ComfyUI e mappe, locale e offline
- [docs/COMFYUI_SESSION_01.md](docs/COMFYUI_SESSION_01.md) — la prima sintesi reale (`tools/comfy/`)

> Il repository è **pubblico**: il materiale personale dell'autore non vi entra mai (`archive/` è esclusa da git).
