# SINTESI — Produzione

Budget target: €0–50 oltre agli strumenti già posseduti. Tutto il flusso è possibile con software gratuito e open source; i servizi commerciali sono opzionali e mai necessari.

## 1. Il dataset

Il sistema funziona sempre: finché `archive/metadata/dataset.json` non esiste, usa l'archivio demo sintetico (`src/data/demoDataset.ts`), che non contiene dati di persone reali.

```text
archive/
├── photographs/   stampe e negativi scansionati (grigi, 16 bit se possibile)
├── textures/      macro di materiali
├── text/          trascrizioni di testimonianze, lettere
├── audio/         registrazioni (wav)
├── locations/     mappe, rilievi
└── metadata/      dataset.json — l'indice di tutto
```

`dataset.json` ha la stessa forma di `Dataset` (vedi `src/evidence/types.ts`):

```json
{
  "name": "sintesi-2026",
  "concepts": [{ "id": "PERSON", "label": "PERSON", "anchor": { "x": 0.56, "y": 0.36 } }],
  "evidence": [
    {
      "id": "IMG_0412", "type": "photograph", "source": "subject:observed", "provenance": "observed",
      "label": "IMG_0412", "confidence": 0.97, "semanticWeight": 0.95,
      "relationships": ["PERSON", "IMG_0418"],
      "visualProperties": { "crop": { "x": 0.47, "y": 0.375, "w": 0.13, "h": 0.055 } }
    },
    {
      "id": "TXT_02", "type": "text", "source": "testimony/B", "provenance": "observed",
      "confidence": 0.72, "semanticWeight": 0.75, "relationships": ["PERSON"],
      "visualProperties": { "text": "“non ricordo il colore del cappotto”" }
    }
  ]
}
```

Regole di autorialità:

- `confidence` = quanto la traccia in sé è affidabile (una stampa rovinata 0.6, una data scritta a mano con punto interrogativo 0.5).
- `semanticWeight` = quanto dice della persona (un occhio 0.95, una parete vuota 0.2).
- `crop` = rettangolo normalizzato (origine in alto a sinistra, fotogramma 9:16) della scena finale da cui il frammento proviene. È il punto in cui la traccia tornerà in INFERENCE.
- Le relazioni vanno scritte; la loro forza viene calcolata.
- `npm run validate` controlla id, riferimenti, intervalli e ritagli.

**Privacy.** Solo dati dell'autore, dati sintetici o dati creati per l'opera con liberatoria scritta. Nessun dato di terzi senza autorizzazione. La versione finale va verificata su questo punto prima dell'invio.

## 2. Il soggetto sintetico (asset generativi)

La scena di SYNTHESIS è prodotta localmente e poi *consegnata al sistema*, che decide quanto mostrarne. Flusso consigliato, tutto open source:

1. **Composizione di riferimento.** Fotografare (o disegnare) la composizione 9:16: la figura, la finestra, il tavolo. Serve per controllare luce e inquadratura; il registro è low-key, luce naturale laterale, nessuna estetica "AI".
2. **Generazione — ComfyUI** (locale, gratuito) con un modello open (famiglia SDXL/Flux con licenza compatibile), ControlNet (profondità/linee) dalla composizione di riferimento, IP-Adapter dai frammenti d'archivio dell'autore. Risoluzione target 2160 × 3840 (generare più piccolo e fare upscale con un modello open, es. 4x-UltraSharp/ESRGAN).
3. **Due versioni della stessa scena.** `observed` (convertita in bianco e nero, fedele ai frammenti) e `inferred` (a colori, con 3–5 differenze plausibili e non documentate: un oggetto in più, un dettaglio architettonico spostato, un riflesso impossibile). Le differenze sono la drammaturgia delle cuciture: vanno scelte, non lasciate al caso.
4. **Mappe.** Profondità con Depth Anything v2 (open) e segmentazione con SAM 2 (open) → `data.png` (R profondità, G regione/8: 1 ambiente, 2 sfondo, 3 oggetti, 4 corpo, 5 volto, 6 identità).
5. **Ritagli d'archivio.** I `crop` del dataset devono cadere su dettagli della scena `observed` (un occhio, un orecchio, uno spigolo): sono le prove.

Salvare in `archive/synthesis/{observed,inferred,data}.png` e implementare un `SubjectSource` da file (milestone 2). Runway o altri servizi a pagamento: solo se un risultato non è ottenibile localmente, e solo in produzione — mai a runtime.

GPU per la generazione: una GPU consumer con ≥ 8 GB di VRAM è sufficiente con modelli quantizzati. In assenza, una sessione cloud a ore (poche ore di GPU, < €20) rientra nel budget.

## 3. Aggiornare il progetto

```bash
npm run dev                       # guardare
npm run snapshot -- --t=4,12,21   # fotogrammi da confrontare
npm test && npm run validate      # prima di ogni commit
```

Ogni milestone significativa è un commit (`feat: …`). Il `manifest.json` di un render registra il commit: ogni versione è ricostruibile.

## 4. Produrre il master

```bash
npm run render:final
```

Output in `renders/full-final-seed1987/` (con `--timeline=full`): frame PNG, `…mov` ProRes 422 HQ (archivio), `…mp4` H.264 (esposizione), `manifest.json`, `control.csv`.

- Con SwiftShader (default) il render è riproducibile bit per bit ovunque, ma lento a 4K; con `--gpu` è molto più rapido. Si può renderizzare a pezzi (`--from/--to`, frame numerati per tempo assoluto) e assemblare con `npm run export -- renders/<nome>`.
- **Audio.** `control.csv` contiene per ogni frame confidence, coherence, relazione, quota inferita e i parametri audio derivati. Importarlo come automazione in Logic Pro (o Reaper/Ardour, gratuiti): la perdita di certezza visiva deve corrispondere alla perdita di struttura sonora. Il mix stereo (48 kHz, 24 bit) si unisce al master con FFmpeg: `ffmpeg -i master.mov -i mix.wav -c:v copy -c:a pcm_s24le master_av.mov`.
- **Finitura opzionale** in DaVinci Resolve (gratuito): solo controllo, nessuna correzione creativa che l'engine non possa riprodurre.
