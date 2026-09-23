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

1. **Raccolta** secondo [docs/CAPTURE_PROTOCOL.md](docs/CAPTURE_PROTOCOL.md): cosa è autentico, cosa è costruito, formati, maschere. Verifica con `python tools/intake.py archive/intake`.
2. **Sessione ComfyUI** secondo [docs/COMFYUI_SESSION_01.md](docs/COMFYUI_SESSION_01.md), sulla macchina dell'autore, locale e offline: la fotografia P1 rigenerata interamente a bassa intensità, le decisioni del sistema per regione, tre alternative, profondità. Uscita in `archive/synthesis/session-01/`.
3. **Nell'engine:** `?subject=session-01` (live) o `--subject=session-01` (render). Il soggetto procedurale viene sostituito dai file; nient'altro cambia.
4. Ogni iterazione è un nuovo `session_NN.json`, mai un ritocco a mano delle immagini: il processo deve restare riproducibile.

Nessun servizio a pagamento è necessario. GPU: una consumer con ≥ 8 GB di VRAM, oppure poche ore di GPU a noleggio (< € 20).

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
- **Audio.** Il suono è generato dall'opera stessa (`npm run render` lo produce insieme ai fotogrammi, `npm run audio` da solo), dallo stesso stato dell'immagine. Le registrazioni reali entrano per nome di file in `archive/audio/` (vedi TECHNICAL_ARCHITECTURE, *Suono*). Una DAW (Logic Pro, Reaper) serve solo per l'ascolto critico e per eventuali correzioni di livello: nessun elemento sonoro va aggiunto a mano, altrimenti il suono smette di derivare dal processo. `control.csv` resta disponibile.
- **Finitura opzionale** in DaVinci Resolve (gratuito): solo controllo, nessuna correzione creativa che l'engine non possa riprodurre.
