# SINTESI — Allestimento

L'opera è un video verticale 9:16 con suono, 3′30″ in loop continuo. Il **master prerenderizzato è la forma principale dell'opera**; il software generativo è la sua origine, non il suo supporto espositivo.

## 1. Come la vede chi entra

Il pubblico reale entra a metà ciclo e spesso resta 20–30 secondi. L'opera è costruita perché ogni finestra di 30 secondi dica già qualcosa:

| se entri durante… | vedi | capisci (senza leggere nulla) |
|---|---|---|
| ARCHIVE (0:00–0:32) | frammenti che emergono dal nero, uno alla volta | qualcuno sta raccogliendo tracce |
| CORRELATION (0:32–1:06) | le tracce si collegano e migrano | le tracce vengono messe in relazione |
| INFERENCE (1:06–1:54) | una stanza e una persona emergono tra i frammenti, instabili | qualcosa viene ricostruito, e non tutto è sicuro |
| SYNTHESIS (1:54–2:50) | una fotografia, ferma | "è una fotografia" — ed è esattamente l'inganno |
| DECONSTRUCTION (2:50–3:30) | la fotografia si smonta per regioni, restano poche prove, poi il nero | quell'immagine era fatta di altro |

Chi resta un ciclo intero vede il paradosso completo. Chi resta 30 secondi ne vede comunque una parte leggibile. Chi entra durante la quiete di SYNTHESIS vede "solo una foto": è previsto, ed è la condizione che l'opera vuole mettere in discussione.

Il ciclo non ha inizio né fine visibili. L'ultima traccia a sopravvivere (l'occhio d'archivio) torna al suo posto nel catalogo ed è la prima del ciclo successivo: tra l'ultimo e il primo fotogramma la differenza misurata è inferiore all'1 %.

## 2. Tre opzioni

### A — Monitor verticale (riferimento)

- **Schermo OLED 4K da 65″**, ruotato in verticale: immagine 0,81 × 1,43 m.
  - OLED, non LCD: l'opera vive nel nero e in piccoli frammenti luminosi su nero. La retroilluminazione a zone di un LCD crea aloni attorno a ogni frammento, cioè un effetto grafico che l'opera non ha.
  - Da 55″ è accettabile; da 77″ è migliore se la distanza di visione supera i 3 m.
- **Montaggio:** centro dell'immagine a 1,50–1,55 m da terra (bordo inferiore a circa 0,8 m). Nessuna cornice, oppure cornice nera sottile. Cavi nascosti.
- **Distanza di visione:** 1,5–4 m. Una panca a 2,5 m.
- **Impostazioni dello schermo:** modalità "film" o "cinema"; spenti "dinamico", "vivido", contrasto dinamico, riduzione del rumore, motion smoothing; temperatura colore D65; luminanza di picco moderata (circa 150–200 nit). La grana è parte dell'immagine: non va filtrata.

### B — Proiezione verticale

- Proiettore laser 4K (o 1080p nativo come minimo) che supporti l'installazione in verticale, oppure uno specchio a 45°.
- Immagine di 1,6 × 2,85 m fino a 2 × 3,55 m, a partire da 30 cm da terra: la figura della sintesi diventa a grandezza quasi naturale.
- Richiede una sala buia: meno di 20 lux sullo schermo. Superficie **grigia** ad alto contrasto, non bianca, per non perdere i neri.
- Più immersiva e più fragile: con luce ambientale anche moderata il nero diventa grigio e la prima metà dell'opera si indebolisce. Scegliere B solo se la sala può essere oscurata.

### C — Monitor + ascolto personale

- Come A, più **due cuffie chiuse** con cavo (fissate a 1,3 m, volume bloccato), oppure un **diffusore direzionale** sopra lo spettatore (a pannello o a ultrasuoni) che crei una zona d'ascolto di circa 1,5 m davanti all'opera.
- È la soluzione consigliata negli spazi rumorosi o condivisi: il suono dell'opera è fatto di piccoli eventi e di silenzi, e in un ambiente rumoroso si perde prima dell'immagine.

## 3. Luce ambientale non controllata

- **Mai luce diretta sullo schermo.** Se lo spazio è luminoso: schermo opaco antiriflesso, e opzione A o C, mai B.
- La prima metà dell'opera (nero, frammenti) richiede più buio della seconda (la fotografia). Se la luce non si può abbassare, **non** si schiarisce il master: si sposta l'opera in un angolo più scuro o si usa uno schermo più luminoso.
- Il master resta uno solo. Non esistono versioni "per sala luminosa".

## 4. Suono

- **Livello del master:** −23 LUFS integrati, picco reale ≤ −1 dBFS, stereo 48 kHz / 24 bit. Ampia gamma dinamica (LRA intorno a 20 LU): i silenzi e gli eventi minimi sono parte dell'opera e non vanno compressi.
- **Livello in sala:** circa 55–60 dB(A) sulla posizione d'ascolto durante SYNTHESIS (il momento più pieno). Il resto resta volutamente più basso.
- **Casse:** una coppia di monitor compatti ai lati dello schermo, oppure l'opzione C. Niente subwoofer: la risonanza grave è quasi fisica, non un basso.
- Nessun'altra musica nello spazio.

## 5. Riproduzione e loop

- File di mostra: `…mp4`, H.264 ad alto bitrate con audio AAC 320k, generato da `npm run render:final`. L'archivio è il `.mov` ProRes 422 HQ con audio PCM.
- **Loop senza giunture.** Molti lettori, al ritorno all'inizio, lasciano un nero o un fotogramma fermo. Per eliminare il problema, si prepara un file di mostra con **10 cicli concatenati** (35 minuti, un solo punto di ritorno ogni 35 minuti):
  ```bash
  npm run exhibition -- renders/full-final-seed1987/full-final-seed1987.mp4 --cycles=10
  ```
- **Lettore:** un media player dedicato con loop seamless (tipo BrightSign), oppure un mini-PC con `mpv --fs --loop-file=inf --no-osc --no-input-default-bindings master_x10.mp4`.
- Il sistema operativo va configurato senza aggiornamenti automatici, notifiche, salvaschermo o risparmio energetico, con avvio automatico del lettore all'accensione.

## 6. Didascalia

Minima, a parete, lontana dallo schermo:

> **Martin Minotti** — *SINTESI (Un ritratto di ciò che rimane)*, 2026
> Video generativo verticale, suono stereo, 3′30″ in loop.
> Sistema scritto dall'autore; immagini prodotte con modelli generativi eseguiti localmente, a partire dall'archivio dell'autore.

Nessuna spiegazione del concetto sulla parete. Se il concorso richiede un testo, deve descrivere *cosa accade* e non *cosa significa*: l'ultima comprensione deve arrivare dall'opera.

## 7. Scheda tecnica (rider)

| voce | A | B | C |
|---|---|---|---|
| display | OLED 4K 55–77″ verticale | proiettore laser 4K, schermo grigio | come A |
| lettore | media player con loop seamless o mini-PC | idem | idem |
| audio | 2 monitor attivi compatti | 2 monitor | 2 cuffie chiuse o diffusore direzionale |
| luce | ≤ 50 lux sull'area, niente luce diretta | < 20 lux | ≤ 50 lux |
| spazio | 3 × 4 m min. | 4 × 6 m min. | 2,5 × 3 m min. |
| corrente | 1 presa | 1 presa | 1 presa |
| file | `master_x10.mp4` + copia su USB | idem | idem |

## 8. Ridondanza

- Due copie del file di mostra sul posto (lettore e USB) più l'archivio ProRes fuori sede.
- Prima dell'apertura: un ciclo completo in sala, verificando il passaggio dal nero al nero, il livello audio in SYNTHESIS e l'assenza di aloni sui frammenti.

## 9. Modalità live (secondaria)

Il software può girare dal vivo (`npm run build && npm run exhibit`, offline), ma il master è identico e più affidabile. La modalità live ha senso solo in contesti dove il processo stesso va mostrato, per esempio una presentazione o uno studio aperto, non in mostra.
