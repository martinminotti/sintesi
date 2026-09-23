# SINTESI — Artistic QA

Da compilare a ogni milestone. Le risposte sono giudizi, non misure: vanno motivate. Dove esiste una misura automatica (`npm run validate`), è indicata. Non usare punteggi numerici come sostituto della critica.

## Checklist

Legenda: **sì** · **parziale** · **no** · **n/v** (non verificabile con il materiale attuale)

| # | domanda | M2 (studi) | nota |
|---|---|---|---|
| 1 | L'opera funziona senza spiegazione? | parziale | la progressione archivio → immagine → smontaggio si legge; la tesi (più certa, non più vera) si legge solo in DECONSTRUCTION |
| 2 | ARCHIVE sembra un archivio e non una UI? | sì | senza label/titoli: stampe, testimonianze, angoli portafoto vuoti |
| 3 | CORRELATION sembra una relazione e non un diagramma tecnico? | parziale | senza nomi dei concetti va meglio; le linee restano un grafo |
| 4 | INFERENCE comunica ambiguità? | parziale | le proposte nella finestra ora si leggono; il resto della fase è troppo uniforme |
| 5 | SYNTHESIS sembra una fotografia? | **no** (n/v) | soggetto procedurale: impossibile finché non c'è il materiale reale |
| 6 | SYNTHESIS contiene almeno una decisione non supportata? | sì | mare, sguardo, cornice, colore del cappotto, tazza |
| 7 | DECONSTRUCTION rivela la genealogia dell'immagine? | sì | l'ordine è misurato (test); ogni regione mostra la traccia da cui viene |
| 8 | Il finale cambia retroattivamente il significato? | parziale | il momento "restano solo le prove" funziona; manca il peso fotografico della sintesi per renderlo un colpo |
| 9 | L'audio segue lo stesso processo epistemico? | n/v | solo mappatura (`control.csv`); nessun suono ancora |
| 10 | Il loop è invisibile? | sì | differenza media primo/ultimo fotogramma 0.77 % (misurato) |
| 11 | L'estetica evita i cliché dell'AI? | sì | nessun glitch, neon, HUD; rischio residuo: le celle di Voronoi a media confidenza |
| 12 | Un frame isolato della SYNTHESIS è credibile? | **no** (n/v) | vedi 5 |
| 13 | Funziona senza audio? (TEST A) | sì | tutta la narrazione è visiva |
| 14 | Funziona senza testo? (TEST B) | sì | tipografia `none` è ora il default; restano solo le tracce che *sono* testo |
| 15 | INFERENCE → SYNTHESIS in 10 s si percepisce? (TEST D) | parziale | si vede la stabilizzazione e l'arrivo del colore; manca il salto verso la fotografia |
| 16 | SYNTHESIS → DECONSTRUCTION mostra l'origine? (TEST E) | sì | assenze, fonti, prove, nero |
| 17 | Blind test: sembra una fotografia? (TEST F) | **no** | non procedere al master |

## Misure automatiche (M2)

```text
coherence law        k 0.4 → dettaglio 17 %, energia 103 %
paradox              fine INFERENCE: confidence 0.51 · certainty 0.63
                     SYNTHESIS ferma: confidence 0.44 · acceptance 1.00 · certainty 1.00
deconstruction       SYNTHETIC/ABSENT → INFERRED → DERIVED → OBSERVED (unit test)
loop                 differenza primo/ultimo fotogramma 0.77 %
determinism          identico fuori ordine e tra sessioni
```

## Screenshot

- `docs/studies/m2-hypotheses-{A,B,C}.jpg` — archivio (B/N), sintesi, due alternative, per composizione
- `docs/studies/m2-study-{A,B,C}.jpg` — lo stesso arco (INFERENCE → loop) nelle tre composizioni
- `docs/studies/m2-arc-C.jpg` — la direzione raccomandata, dal video di studio

## Note qualitative

**M2.** Il momento migliore dell'opera oggi non è la sintesi ma la sua demolizione: quando il cappotto diventa un vuoto e dentro compare *"non ricordo il colore del cappotto"*, l'opera dice la sua tesi senza spiegarla. È il punto da proteggere.

Il punto più debole è strutturale e noto: senza una sintesi fotografica credibile manca il secondo tempo percettivo ("aspetta, sembra reale"), e senza quello il finale non ha nulla da smentire.
