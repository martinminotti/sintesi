# SINTESI — Milestone 2: analisi e piano

> Tesi: **un sistema non ha bisogno di conoscere tutta la realtà per produrre un'immagine convincente della realtà. Gli basta imparare a nascondere ciò che non conosce.**
> Principio: costruire una macchina che mostra come un'immagine diventa credibile senza diventare più vera.

## 1. Valutazione critica della milestone 1

La milestone 1 ha dimostrato la *legge*: la confidence governa la struttura, non l'opacità (misurato: a k = 0.4 resta il 15 % del dettaglio e il 95 % dell'energia). Ha anche un gesto forte: le fotografie che tornano esattamente nel punto da cui erano state ritagliate.

Ma racconta ancora la storia sbagliata. In INFERENCE il sistema **rivela** un'unica immagine già esistente: sfoca meno dove sa di più. Non **propone**. Non esistono alternative, quindi non c'è nulla da scegliere, e senza scelta non c'è il paradosso centrale (più coerenza, non più verità). Inoltre l'assenza è resa come nero, esattamente ciò che la nuova direzione esclude.

## 2. Elementi già abbastanza forti (da non toccare nella sostanza)

- La legge della coerenza (`reconstruction.glsl` / `coherenceParams`): incertezza = perdita di forma a energia costante.
- Il catalogo di ARCHIVE: acquisizione per risoluzione, non per dissolvenza.
- Il ritorno dei frammenti al loro posto all'inizio di INFERENCE.
- Le cuciture tra evidenza (grigia, stampata) e credenza (a colori, sfocata).
- Il colore come inferenza: appare solo dove il sistema crede.
- Tutta l'infrastruttura: determinismo verificato, render CPU riproducibile, manifest, `control.csv`, validazione quantitativa.

## 3. Elementi ancora da tech demo

| elemento | problema |
|---|---|
| titoli di capitolo ARCHIVE / CORRELATION / INFERENCE | sono una presentazione, non un'esperienza; il TEST B li esclude |
| label `IMG_0412`, `TEX_01` | vocabolario da file system |
| nomi dei concetti `PERSON`, `PLACE` con anello | glifo da diagramma, legenda di un grafo |
| tratteggi che scorrono lungo le relazioni | "marching ants": movimento da interfaccia |
| metadati `SCAN 2400 DPI 8 BIT` | leggibili come dato di software, non come traccia |
| celle di Voronoi riconoscibili a media confidence | algoritmo visibile |
| il soggetto procedurale | manichino CG: non potrà mai superare i test C e F |
| assenza = nero | contraddice ABSENCE come condizione epistemica |
| "0% ARCHIVE / 100% SYNTHESIS" (previsto) | è una statistica a schermo, cioè una dashboard |

## 4–5. Tre direzioni per la scena finale, e l'errore di ciascuna

Il principio comune dell'errore (la firma dell'opera): **ogni elemento della sintesi è sostenuto da una traccia; nessuna traccia sostiene la loro compresenza.** Il sistema non sbaglia: compone correttamente cose vere separatamente e mai insieme. E sceglie, al posto dell'autore, ciò che l'archivio non può sapere.

### A — Ritratto
Testa e spalle, tre quarti verso la finestra, volto ≈ 35 % dell'altezza.
**Errore:** lo sguardo. L'archivio contiene un occhio (IMG_0412) che guarda in basso, verso il tavolo. Cosa stesse guardando l'autore è un'ASSENZA documentata. La sintesi gira lo sguardo verso la finestra: gli dà una direzione, quindi un'interiorità. In DECONSTRUCTION il frammento reale dell'occhio riaffiora sopra quello sintetico, e i due non coincidono.
**Rischio:** "AI portrait". Tutto si gioca sulla credibilità di un volto, il terreno dove i generatori sono più riconoscibili.

### B — Ambiente
La stanza senza la persona: sedia, cappotto sullo schienale, tazza, finestra, luce. L'identità emerge dai segni d'uso. È "ciò che rimane" alla lettera.
**Errore:** la vista dalla finestra. L'archivio non sa cosa ci fosse fuori (ASSENZA). Contiene però una registrazione (REC_07) che è risacca. La sintesi mette il mare fuori da una stanza le cui coordinate (45.47° N, 9.18° E) sono in una città senza mare. In DECONSTRUCTION il mare si dissolve nella forma d'onda da cui è nato.
**Rischio:** fotografia d'interni. Il "chi" si indebolisce, e si perde il primo passaggio percettivo ("sto vedendo una persona").

### C — Figura + ambiente *(raccomandata)*
Figura seduta al tavolo, di profilo verso la finestra, stanza leggibile. Il volto non è mai frontale: l'identità è ricostruita da postura, oggetti e luce, e il volto resta una delle tracce, non il soggetto.
**Errore:** entrambi, in scala: lo sguardo inventato (A) *e* il mare fuori dalla finestra (B). Sono legati: la sintesi fa guardare la persona verso il mare che ha inventato. Due assenze colmate da una sola decisione coerente: l'invenzione si giustifica da sola. Secondari: la cornice sulla parete documentata come intonaco nudo; il bicchiere/tazza ("una tazza, credo. o un bicchiere."); il colore del cappotto ("non ricordo il colore del cappotto").
**Rischio:** è la più complessa da rendere fotografica (figura + ambiente + luce coerenti).

Gli studi A/B/C sono renderizzati con il soggetto procedurale: valutano **composizione e dinamica epistemica**, non il fotorealismo, che richiede il materiale reale (§7).

## 6. SYNTHESIS → DECONSTRUCTION, concretamente

**Fine di INFERENCE** — le regioni ASSENTI non sono nere: mostrano la sovrapposizione delle ipotesi (fuori dalla finestra: città, alberi, bianco, mare; sulla parete: cornice, specchio, niente; sul tavolo: tazza o bicchiere). Informazione senza determinazione: una doppia esposizione quieta. Le cornici vuote dell'archivio (tracce di ASSENZA) si posano proprio lì.

**SYNTHESIS**, `acceptance → 1` per regione, in ordine di supporto:
1. le regioni derivate si stabilizzano (parete, tavolo);
2. le inferite smettono di cercare (corpo, volto, cappotto: il colore si decide);
3. le assenti riducono le alternative, prima per cella poi per regione, fino a una sola: il mare, lo sguardo;
4. la risposta fotografica cresce con l'acceptance: profondità di campo dalla depth map, alone della finestra, grana, vignettatura ottica;
5. i frammenti osservati vengono **riscritti** dalla sintesi: le cuciture guariscono, nessuno se ne accorge (è il punto);
6. **quiete**: 12–18 s quasi immobili, solo grana e un respiro di luce. Deve sembrare una fotografia.

La confidence globale non sale mai sopra ~0.5. L'acceptance arriva a 1.

**DECONSTRUCTION** per genealogia, non per dissolvenza:
1. la fotografia è intera;
2. le regioni SINTETICHE e ASSENTI perdono acceptance per prime: il mare torna alle sue alternative, poi si ritira; al suo posto riaffiora la **traccia da cui è nato** (la forma d'onda);
3. le INFERITE perdono decisione: il colore se ne va, il volto torna instabile;
4. le DERIVATE si sciolgono;
5. restano **soltanto i frammenti osservati**, grigi, nei loro rettangoli, sopra il nero: l'intera immagine poggiava su queste poche prove. L'occhio reale guarda in basso;
6. i frammenti si spengono in ordine inverso di acquisizione;
7. l'ultimo (la prima traccia acquisita) torna alla sua posizione di catalogo e resta, quasi indeterminato: è il primo fotogramma del ciclo successivo.

Il loop è `ABSENCE → ARCHIVE`: l'archivio viene di nuovo consultato. La chiusura testuale va prototipata **dopo**, e solo se l'immagine non basta.

## 7. Workflow AI locale/offline

L'AI è materia; l'engine è l'autore del processo. Tutto locale, open source, con licenze verificate per un uso espositivo.

1. **Tracce reali** (autore): 20–40 fotografie proprie (d'archivio scansionate e nuove), testi, 2–3 registrazioni. Protocollo in `docs/CAPTURE_PROTOCOL.md`.
2. **Blockout della scena** in Blender (gratuito): camera 9:16, figura, tavolo, finestra. Esporta depth e linee → ControlNet. La composizione è decisa dall'engine/autore, non dal modello.
3. **Identità**: LoRA dell'autore su SDXL, addestrata localmente (kohya_ss) sulle sue foto. Evito InstantID/insightface: i modelli di riconoscimento sono per uso non commerciale.
4. **Generazione** in ComfyUI: SDXL (licenza OpenRAIL++) con checkpoint fotografico a licenza compatibile, ControlNet depth + lineart, LoRA autore, seed fissi. Output: `synthesis.png` (l'ipotesi scelta) e **N ipotesi per regione** (inpainting mascherato: fuori-finestra ×4, parete ×3, oggetto ×2, sguardo ×2). *FLUX.1-dev ha licenza non commerciale: da evitare per un concorso con premio.*
5. **Mappe**: Depth Anything V2 *Small* (Apache-2.0; le varianti Base/Large sono non commerciali) → `depth.png`; SAM 2 (Apache-2.0) → maschere delle regioni.
6. **Mappa epistemica**: dipinta a mano dall'autore in Krita/GIMP a partire dalle maschere SAM (OBSERVED / DERIVED / INFERRED / SYNTHETIC / ABSENT), più `regions.json` con le tracce che sostengono ogni regione. È l'atto autoriale centrale: decidere cosa è documentato.
7. **Upscale** Real-ESRGAN (BSD) a 2160 × 3840.
8. **Finitura fotografica nell'engine** (grana, alone, ottica), non nel modello: deterministica e controllabile.

Hardware: GPU consumer ≥ 8 GB VRAM; in alternativa poche ore di GPU a noleggio (< € 20).

## 8. Modifiche architetturali

- **ArtworkState unico**: fase, seed, confidence globale, acceptance globale e stato **per regione** (confidence, acceptance, attenzione, determinazione). Visual e audio derivano entrambi da qui.
- **Modello epistemico**: `Region { class: observed | derived | inferred | synthetic | absent, evidence[], hypotheses, confidence }`. Le regioni sono i materiali/maschere del soggetto; la confidence per pixel = max(ancore osservate, confidence della regione).
- **Ipotesi**: il soggetto diventa `observed` (verità d'archivio) + `synthesis` (la scelta) + K alternative. Il compositing seleziona per cella tra le ipotesi; l'acceptance riduce le alternative fino a una.
- **Presenza ≠ confidence**: una regione è visibile quando il sistema la *considera* (attenzione), non quando la conosce. L'assenza diventa visibile come indeterminazione.
- **Timeline completa** con SYNTHESIS, quiete, DECONSTRUCTION genealogica e seam del loop.
- **Tipografia** configurabile (`none` | `minimal`), default `none`.
- **Tipi di evidenza nuovi**: `absence` (una cornice vuota nel catalogo) e `geometry` (una pianta).
- **Composizione** (A/B/C) come parametro, con crop dell'archivio per composizione.
- In seguito: `SubjectSource` da file e audio offline deterministico da ArtworkState.

## 9. Da eliminare rispetto alla milestone 1

- Titoli di capitolo (tenuti solo come opzione).
- Label dei frammenti e nomi dei concetti: i concetti diventano punti invisibili verso cui le relazioni convergono. Un centro vuoto, dove poi comparirà il volto.
- Tratteggi scorrevoli.
- Il nero come assenza; il `prior` a nebbia grigia.
- La cornice numerica "0% ARCHIVE / 100% SYNTHESIS".

## 10. Esperimenti (output verificabili)

**E1 — Ipotesi e acceptance.** Soggetto con 1 sintesi + 3 alternative; mappa epistemica per materiale; compositing a ipotesi.
*Verifica:* `view=epistemic`; fotogrammi con acceptance 0 / 0.5 / 1; `validate` misura il paradosso: tra fine INFERENCE e fine SYNTHESIS la confidence globale **non sale** mentre la coerenza mostrata sale a ~1 e la varianza tra ipotesi scende a 0.

**E2 — Studi A / B / C.** Tre composizioni, ciascuna INFERENCE → SYNTHESIS (≈ 18 s) + fermo immagine della sintesi.
*Verifica:* tre video, tre contact sheet, revisione scritta con i test A–F.

**E3 — DECONSTRUCTION genealogica + loop.** Sulla direzione raccomandata.
*Verifica:* un video SYNTHESIS → DECONSTRUCTION → ARCHIVE; `validate` controlla l'ordine di collasso per classe (SYNTHETIC/ABSENT → INFERRED → DERIVED → OBSERVED) e che l'ultimo e il primo fotogramma del ciclo coincidano entro una soglia.

Audio (step 7) e master (step 9) restano dopo la stabilizzazione del timing visivo.
