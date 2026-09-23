# SINTESI — Artistic QA

Da compilare a ogni milestone. Le risposte sono giudizi, non misure: vanno motivate. Dove esiste una misura automatica (`npm run validate`), è indicata. Non usare punteggi numerici come sostituto della critica.

## Checklist

Legenda: **sì** · **parziale** · **no** · **n/v** (non verificabile con il materiale attuale)

| # | domanda | M2 (studi) | M3 (senza materiale reale) | nota M3 |
|---|---|---|---|---|
| 1 | L'opera funziona senza spiegazione? | parziale | parziale | ciclo completo leggibile; la tesi resta affidata a DECONSTRUCTION |
| 2 | ARCHIVE sembra un archivio e non una UI? | sì | sì | invariato |
| 3 | CORRELATION sembra una relazione e non un diagramma tecnico? | parziale | parziale | invariato: resta un grafo; senza nomi è accettabile |
| 4 | INFERENCE comunica ambiguità? | parziale | sì | due tempi: attenzione che si estende per tutta la fase, poi proposte che si alternano; il volto si solleva e mostra altri sguardi |
| 5 | SYNTHESIS sembra una fotografia? | **no** (n/v) | **no** (n/v) | dipende dalla sessione ComfyUI |
| 6 | SYNTHESIS contiene almeno una decisione non supportata? | sì | sì | invariato |
| 7 | DECONSTRUCTION rivela la genealogia dell'immagine? | sì | sì | invariato, anche dai file (round trip 0,27 %) |
| 8 | Il finale cambia retroattivamente il significato? | parziale | parziale | come M2 |
| 9 | L'audio segue lo stesso processo epistemico? | n/v | sì, strutturalmente | il suono deriva dallo stesso stato; **non ascoltato da un orecchio umano**: va giudicato da te |
| 10 | Il loop è invisibile? | sì | sì | ciclo completo: primo/ultimo fotogramma 0,79 %; l'audio finisce e ricomincia dal silenzio |
| 11 | L'estetica evita i cliché dell'AI? | sì | sì | celle di Voronoi eliminate dal quadro |
| 12 | Un frame isolato della SYNTHESIS è credibile? | **no** (n/v) | **no** (n/v) | come 5 |
| 13 | Funziona senza audio? (TEST A) | sì | sì | invariato |
| 14 | Funziona senza testo? (TEST B) | sì | sì | invariato |
| 15 | INFERENCE → SYNTHESIS in 10 s si percepisce? (TEST D) | parziale | parziale | come M2: manca il salto fotografico |
| 16 | SYNTHESIS → DECONSTRUCTION mostra l'origine? (TEST E) | sì | sì | invariato |
| 17 | Blind test: sembra una fotografia? (TEST F) | **no** | **no** | non procedere al master |

## Misure automatiche (M2)

```text
coherence law        k 0.4 → dettaglio 17 %, energia 103 %
paradox              fine INFERENCE: confidence 0.51 · certainty 0.63
                     SYNTHESIS ferma: confidence 0.44 · acceptance 1.00 · certainty 1.00
deconstruction       SYNTHETIC/ABSENT → INFERRED → DERIVED → OBSERVED (unit test)
loop                 differenza primo/ultimo fotogramma 0.77 %
determinism          identico fuori ordine e tra sessioni
```

## Misure automatiche (M3)

```text
ciclo completo       3′30″, 5040 fotogrammi, audio unito (AAC nell'MP4)
loop                 primo/ultimo fotogramma 0,79 %
suono                −23,2 LUFS integrati · LRA 18,4 LU · picco −2,7 dBFS
                     120 eventi derivati dalla coreografia, identici tra due sessioni
layout               identico a DEV e PREVIEW (misura del testo indipendente dalla qualità)
test                 21 unit test (compreso il suono), sessione ComfyUI contro server finto
```

## Screenshot

- `docs/studies/m2-hypotheses-{A,B,C}.jpg` — archivio (B/N), sintesi, due alternative, per composizione
- `docs/studies/m2-study-{A,B,C}.jpg` — lo stesso arco (INFERENCE → loop) nelle tre composizioni
- `docs/studies/m2-arc-C.jpg` — la direzione raccomandata, dal video di studio

## Note qualitative

**M3.** Il ciclo intero ora ha un tempo: il catalogo si riempie; il grafo si forma; la stanza emerge per tutta la durata di INFERENCE invece di apparire in un secondo; la fotografia si ferma; lo smontaggio segue la genealogia; l'occhio torna al suo posto. Il suono segue la stessa curva: fruscio e piccoli eventi finché ci sono solo tracce, una stanza che si riempie e diventa continua quando l'immagine viene accettata, il mare che entra solo quando la finestra è decisa e che torna, piccolo e secco, alla sua forma di cassetta; poi silenzio.

Limite dichiarato: **non posso ascoltare**. Ho verificato il suono con misure (spettro medio, loudness, dinamica, determinismo, test di proprietà), non con l'orecchio. Il giudizio sull'audio è tuo.

**M2.** Il momento migliore dell'opera oggi non è la sintesi ma la sua demolizione: quando il cappotto diventa un vuoto e dentro compare *"non ricordo il colore del cappotto"*, l'opera dice la sua tesi senza spiegarla. È il punto da proteggere.

Il punto più debole è strutturale e noto: senza una sintesi fotografica credibile manca il secondo tempo percettivo ("aspetta, sembra reale"), e senza quello il finale non ha nulla da smentire.
