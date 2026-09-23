# SINTESI — Workflow del materiale generativo (locale, offline)

> Modello AI = materiale. Engine SINTESI = autore del processo.
> Il modello produce immagini; l'engine decide quanto, quando e con quale certezza mostrarle.

Stato: **pronto, non ancora eseguito**. La prima sessione concreta è in [COMFYUI_SESSION_01.md](COMFYUI_SESSION_01.md) (`tools/comfy/`), testata contro un server finto con la stessa API di ComfyUI.

> **Revisione per la sessione 01.** Il percorso qui sotto (blockout in Blender, LoRA dell'autore) resta un'opzione per iterazioni successive. La sessione 01 è più semplice e più onesta: parte dalla fotografia reale P1, la rigenera interamente a bassa intensità tenuta dalla sua profondità, e decide per inpainting solo nelle regioni non supportate. Non servono né blockout né LoRA, e nessun modello di riconoscimento facciale.

## Cosa serve all'engine

Gli stessi layer che il soggetto procedurale produce oggi (`src/subject/SubjectSource.ts`), tutti a 2160 × 3840, allineati al pixel:

| file | contenuto | chi lo produce |
|---|---|---|
| `observed.png` | la scena come l'archivio l'ha registrata, bianco e nero | fotografie reali dell'autore (non generata) |
| `synthesis.png` | l'ipotesi che il sistema accetterà | ComfyUI |
| `alt-1.png`, `alt-2.png`, `alt-3.png` | ipotesi alternative, solo dove l'archivio tace | ComfyUI, inpainting mascherato |
| `depth.png` | profondità (16 bit) | Depth Anything V2 Small |
| `regions.png` | id di regione (8 bit, un valore per regione) | SAM 2 + pittura a mano |
| `regions.json` | per ogni id: classe epistemica, tracce di supporto, traccia sorgente | l'autore |

`regions.png` + `regions.json` sono la **mappa epistemica**: l'atto autoriale centrale. Decidono cosa è OBSERVED / DERIVED / INFERRED / SYNTHETIC / ABSENT.

## Strumenti e licenze

| ruolo | strumento | licenza | nota |
|---|---|---|---|
| orchestrazione | ComfyUI | GPL-3.0 | locale |
| modello base | SDXL 1.0 | CreativeML OpenRAIL++-M | uso espositivo consentito con le restrizioni d'uso della licenza |
| identità | LoRA addestrata sulle foto dell'autore (kohya_ss) | proprio materiale | evitare InstantID/insightface: modelli di riconoscimento a uso non commerciale |
| struttura | ControlNet depth + lineart per SDXL | verificare per checkpoint | dalla scena di blockout |
| profondità | Depth Anything V2 **Small** | Apache-2.0 | Base/Large sono CC-BY-NC |
| segmentazione | SAM 2 | Apache-2.0 | |
| upscale | Real-ESRGAN | BSD-3 | |
| blockout 3D | Blender | GPL | |
| da evitare | FLUX.1-dev | non commerciale | un concorso con premio può essere uso commerciale |

## Pipeline

1. **Blockout** (Blender): camera 9:16, figura, tavolo, sedia, finestra, alla stessa posizione della fotografia reale della stanza. Render: depth + lineart. *La composizione è decisa qui, dall'autore, non dal modello.*
2. **LoRA dell'autore**: 20–30 foto, tratti del volto e del corpo; allenamento locale; token raro (es. `mnm_person`).
3. **Synthesis**: SDXL + LoRA + ControlNet(depth, lineart) + prompt fotografico sobrio ("35mm film photograph, overcast afternoon window light, grain, shallow depth of field, interior, a man seated at a table, profile…"), seed fisso. Generare a 1024 × 1792, scegliere, upscale a 2160 × 3840.
   Le decisioni non supportate vanno **scritte nel prompt deliberatamente**: la direzione dello sguardo verso la finestra, il mare, la cornice sulla parete, il colore del cappotto.
4. **Alternative**: per ogni regione ASSENTE o SINTETICA, inpainting con maschera SAM sulla stessa immagine, stesso seed di base, prompt diversi (fuori: città / alberi / bianco; parete: niente / specchio / mensola; tazza / bicchiere; sguardo in basso / verso l'obiettivo). Le alternative devono cambiare *solo* dentro le regioni non supportate.
5. **Mappe**: Depth Anything V2 Small su `synthesis.png` → `depth.png`. SAM 2 → maschere; unirle e pulirle a mano in Krita → `regions.png`.
6. **Controllo**: `npm run snapshot -- --view=epistemic` sovrappone la mappa alla scena.

## Integrazione (milestone successiva)

Un `SubjectSource` da file che carichi questi PNG al posto del raymarcher (stessa interfaccia). La finitura fotografica (grana, ottica, alone) resta nell'engine, deterministica.
