# SINTESI — Sessione ComfyUI 01

Prima sintesi reale, direzione C. Si esegue **sulla tua macchina**: l'ambiente in cui lavoro non ha GPU e non può scaricare modelli. Tutta la logica della sessione (grafi, ordine, seed, ritagli, controlli) è già scritta e testata contro un server che imita l'API di ComfyUI (`python tools/comfy/test_session.py`). Mancano solo i modelli e il tuo materiale.

## Cosa fa, in una frase

Rigenera **ogni pixel** della tua fotografia P1 a bassa intensità, tenuto fermo dalla sua stessa profondità: il risultato ti somiglia, ma non contiene più nessun pixel d'archivio. Poi prende, regione per regione, le decisioni che l'archivio non autorizza (la vista, la parete, la tazza, il cappotto, lo sguardo) e produce tre versioni alternative delle stesse regioni.

```text
P1 (tuo, B/N)  ──►  observed.png          ciò che l'archivio sa (mai generato)
P1 ──► base  ──►  synthesis.png            le decisioni accettate
          └────►  alt-1 · alt-2 · alt-3    le altre proposte, stesse regioni
synthesis ──►  depth.png                    profondità per l'ottica
```

Fuori dalle maschere, sintesi e alternative sono identiche pixel per pixel: cambiano solo le regioni non supportate. È ciò che permette all'engine di sovrapporle e farle collassare.

## Requisiti

- GPU NVIDIA con **≥ 8 GB** di VRAM (12 GB consigliati), oppure Apple Silicon con ≥ 16 GB (più lento).
- ComfyUI aggiornato (versione portable su Windows, oppure `git clone` + ambiente Python).
- Il custom node **comfyui_controlnet_aux**, installabile da ComfyUI-Manager: fornisce `DepthAnythingV2Preprocessor`.
- Python con `pip install pillow` per lo script.

## Modelli

Scarica i modelli, verifica la licenza sulla pagina di ciascuno al momento del download e mettili nelle cartelle indicate. I nomi dei file devono coincidere con `tools/comfy/session_01.json`. Se li rinomini, cambia il JSON.

| ruolo | dove | file atteso | licenza da verificare |
|---|---|---|---|
| checkpoint fotografico | Hugging Face `SG161222/RealVisXL_V5.0` | `models/checkpoints/RealVisXL_V5.0_fp16.safetensors` | pagina del modello |
| alternativa sicura | `stabilityai/stable-diffusion-xl-base-1.0` | `models/checkpoints/sd_xl_base_1.0.safetensors` | CreativeML OpenRAIL++-M |
| ControlNet profondità SDXL | `diffusers/controlnet-depth-sdxl-1.0`, file `diffusion_pytorch_model.fp16.safetensors` | rinominalo in `models/controlnet/controlnet-depth-sdxl-1.0.fp16.safetensors` | OpenRAIL++ |
| profondità | scaricato da comfyui_controlnet_aux al primo uso | `depth_anything_v2_vits.pth` (la *Small*) | Apache-2.0. Non usare `vitb`/`vitl`: non commerciali |
| upscale | GitHub `xinntao/Real-ESRGAN`, release | `models/upscale_models/RealESRGAN_x2plus.pth` | BSD-3 |

Nessun modello di riconoscimento facciale (InstantID, insightface, PuLID) e nessuna LoRA in questa sessione: l'identità viene dalla tua fotografia stessa, a bassa intensità di rigenerazione.

## Esecuzione

1. Materiale pronto e verificato: `python tools/intake.py archive/intake` senza errori (✗).
2. Avvia ComfyUI (porta predefinita 8188).
3. Controllo preliminare, che non genera nulla:
   ```bash
   python tools/comfy/run_session.py tools/comfy/session_01.json --check
   ```
   Elenca nodi e modelli mancanti, con i nomi disponibili.
4. Sessione:
   ```bash
   python tools/comfy/run_session.py tools/comfy/session_01.json
   ```
   26 passaggi. Su una GPU da 12 GB indicativamente 20–40 minuti.

Se la composizione 9:16 va spostata dentro il fotogramma di P1, cambia `plate.crop_x` / `crop_y` (0–1) nel JSON: il ritaglio si applica identico alle maschere.

## Cosa esce

`archive/synthesis/session-01/` (esclusa da git):

```text
observed.png            P1 ritagliata, 2160 × 3840, bianco e nero
synthesis.png           la sintesi
alt-1.png alt-2.png alt-3.png
depth.png
mask-*.png              le maschere al formato master (compresa figure, solo per l'engine)
working/                ogni passaggio intermedio, per capire cosa è successo
session.log.json        ogni grafo inviato, con seed e tempi
```

## Cosa la sintesi decide, e cosa sa l'archivio

| regione | l'archivio sa | la sintesi decide | tra le alternative |
|---|---|---|---|
| fuori dalla finestra | niente (ASSENZA) | ciò che dicono le parole di `firma.txt` | facciata, alberi, cielo bianco |
| parete | intonaco nudo (D2) | una piccola fotografia incorniciata | **intonaco nudo** (alt-1), mensola, specchio |
| tazza | una tazza, manico a destra | manico a sinistra | bicchiere, **manico a destra** (alt-2), bicchiere d'acqua |
| cappotto | nessun colore (archivio B/N) | marrone | blu, verde scuro, grigio |
| sguardo | occhi in basso | verso la finestra | verso l'obiettivo, **in basso** (alt-2), chiusi |

In grassetto: la verità è sempre una delle ipotesi, e non è quella scelta.

## Come giudichiamo il risultato

Prima di integrarlo nell'engine, su `synthesis.png` a schermo intero:

1. **TEST F:** a chi non sa nulla, sembra una fotografia? Se no, si corregge qui, non nell'engine.
2. Il volto è ancora il tuo, senza pelle di plastica? Se no: `resynthesis.denoise` da 0.32 a 0.25.
3. La vista dalla finestra sembra incollata? Se sì: `regions.view.grow` più alto, oppure `denoise` a 1.0.
4. Lo sguardo cambiato è credibile o deforma l'occhio? Se deforma: `regions.gaze.denoise` a 0.4 e maschera più stretta.
5. Le alternative sono plausibili quanto la sintesi? Devono esserlo: nessuna deve sembrare "sbagliata".
6. Aprendo `synthesis.png` e `alt-2.png` in sovrapposizione, cambiano solo le regioni mascherate?

Ogni modifica va nel JSON (`session_02.json`), non a mano sulle immagini: il processo deve restare riproducibile.

## Consegna

Nel repository privato (vedi CAPTURE_PROTOCOL §10), la cartella `session-01/` completa. Da lì la collego all'engine: il soggetto procedurale viene sostituito dai tuoi file, e l'arco intero gira sulla tua immagine.
