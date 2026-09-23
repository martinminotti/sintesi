# SINTESI — Concept artistico

*Un ritratto di ciò che rimane* · Martin Minotti · 2026

## La domanda

**Che cosa rimane di una persona quando la sua identità viene ricostruita esclusivamente attraverso le tracce che ha lasciato?**

L'opera immagina un sistema incaricato di ricostruire un individuo a partire da frammenti: fotografie, testimonianze, date, coordinate, registrazioni, dati tecnici. All'inizio lavora su informazioni relativamente certe. Poi incontra ciò che manca, e deve inferire. L'inferenza introduce probabilità; la probabilità introduce interpretazione; l'interpretazione produce una nuova realtà. Alla fine il sistema consegna un'immagine estremamente credibile di una persona e di una situazione che non sono mai esistite nella forma rappresentata.

Questa è la contraddizione fondamentale dell'opera.

## La tesi: la certezza è visibile

SINTESI non è una galleria di immagini generate e non è un commento sull'intelligenza artificiale. È un sistema in cui **la disponibilità di informazione determina il grado di certezza con cui una persona può essere rappresentata** — e questo è visibile nel comportamento dell'immagine.

Un solo parametro, `confidence` (0 → 1), governa tutto. Non controlla la trasparenza: controlla la **coerenza**. Ciò che è certo è fermo, nitido, intero. Ciò che è incerto non svanisce: si frammenta, deriva, perde dettaglio e profondità tonale, e continua a *cercare* la propria forma. Solo l'assenza totale di informazione è nero.

| confidence | significato | comportamento visivo |
|---|---|---|
| 1.0 | certo | immobile, nitido |
| 0.8 | molto probabile | quasi fermo |
| 0.6 | plausibile | leggera deriva, perdita di dettaglio |
| 0.4 | inferito | frammentazione, sfocatura, pochi toni |
| 0.2 | molto incerto | struttura sostituita da rumore della stessa energia |
| 0.0 | assenza | nero |

Il sistema distingue quattro provenienze dell'informazione — **observed**, **derived**, **inferred**, **synthetic** — e ciascuna ha un comportamento riconoscibile.

## Il meccanismo centrale: *acceptance*

Accanto alla confidence esiste un secondo valore: **acceptance**, il grado in cui il sistema smette di *mostrare* la propria incertezza.

```text
coerenza mostrata = mix(confidence, 1, acceptance)
```

Fino a INFERENCE, acceptance è 0: il sistema è onesto, e ciò che non sa appare instabile. In SYNTHESIS acceptance sale a 1: la confidence non cambia, ma l'immagine diventa stabile, fotografica, definitiva. È il momento `inferenza → realtà accettata`, il punto concettualmente ambiguo dell'opera. Lo spettatore non può più distinguere il registrato dall'inferito dal generato.

## Le fasi

**I — ARCHIVE** (0:00–0:35). Frammenti emergono dal nero uno alla volta, in un catalogo quasi forense: ritagli di stampe in bianco e nero (un occhio, un orecchio, lo spigolo di una finestra, una tazza), testimonianze trascritte, date, coordinate, la forma d'onda di una voce, una mappa. Ogni traccia *si risolve* dall'incertezza invece di comparire in dissolvenza. Nessuna persona è ancora visibile.

**II — CORRELATION** (0:35–1:15). Il sistema comincia a "capire". Compaiono le categorie — PERSON, PLACE, OBJECT, DATE — e le relazioni. Le relazioni forti sono linee stabili e continue; quelle deboli sono intermittenti e oscillano. Le tracce migrano in una mappa semantica; ciò che dice poco della persona perde stabilità. Le categorie occupano già i luoghi dove, più tardi, starà l'immagine: la mappa semantica anticipa la composizione.

**III — INFERENCE** (1:15–2:10). Le fotografie tornano esattamente nel punto da cui erano state ritagliate. Tra loro il sistema estende ciò che crede: una scena si forma a partire dai frammenti, sfocata e instabile dove nessuna prova la sostiene. Ai bordi dei frammenti affiorano piccole incongruenze — non glitch, ma conseguenze naturali dell'inferenza: la traversa della finestra non coincide, il manico della tazza è dalla parte sbagliata, su una parete documentata come vuota compare una cornice. Il colore, che nessuna fotografia d'archivio ha mai registrato, appare solo dove il sistema è più sicuro di sé: *"non ricordo il colore del cappotto"*.

**IV — SYNTHESIS** (2:10–3:05) — *milestone successiva*. L'immagine si stabilizza fino a sembrare una fotografia. Per alcuni secondi resta quasi immobile: il pubblico deve avere il tempo di crederci. Nel farlo, il sistema rigenera anche i frammenti osservati per renderli coerenti con la sintesi: alla fine, nell'immagine non rimane nessun pixel dell'archivio.

**V — DECONSTRUCTION** (3:05–3:30) — *milestone successiva*. La scena viene smontata proceduralmente, per regioni: periferia, sfondo, materia, ambiente, corpo, volto, identità, luce. Fino al nero. Poi:

```text
0% ARCHIVE
100% SYNTHESIS
```

pausa.

```text
THE IMAGE NEVER EXISTED.
```

Nero. Il ciclo ricomincia.

## Linguaggio visivo

Nero, bianco, grigi, toni naturali e desaturati. Tipografia minima: un sans-serif contemporaneo (Inter) per i titoli dei capitoli, un monospaziato (IBM Plex Mono) solo per le tracce che *sono* testo. Nessuna UI, nessun HUD, nessun logo, nessun neon, nessun glitch RGB. La tecnologia si percepisce attraverso il comportamento dell'immagine, mai attraverso cliché visivi. Il registro di riferimento è la fotografia sfocata e la pittura fotografica — un'immagine vera ma non afferrabile — non l'estetica digitale.

## Il ruolo dell'AI

L'intelligenza artificiale è **materiale di produzione**, non spettacolo né soggetto dichiarato. La parola "AI" non compare mai nell'opera. I modelli generativi (open source, locali, via ComfyUI) servono a produrre la scena sintetica finale e le sue mappe (profondità, segmentazione); il sistema di SINTESI decide *come* e *quanto* quell'immagine può essere mostrata in funzione di ciò che l'archivio sostiene. L'AI emerge dal concetto: è il meccanismo stesso dell'inferenza che l'opera rende visibile.

L'opera finale non dipende da alcun servizio online: è un asset autonomo.

## Il ruolo dell'artista

L'artista costruisce l'archivio, decide cosa è documentato e cosa no, stabilisce il peso semantico e l'affidabilità di ogni traccia, sceglie le relazioni, dirige il soggetto sintetico e le sue anomalie, e fissa la legge che collega certezza e forma. Il codice non è un mezzo invisibile né uno spettacolo: è la struttura nascosta attraverso cui il significato prende forma. Ogni versione dell'opera è riproducibile a partire da `seed + dataset + configurazione`.

## Decisioni artistiche aperte

Queste scelte sono irreversibili per l'opera finale e spettano all'autore:

1. **Il soggetto.** (a) L'autore stesso, ricostruito dal proprio archivio reale — massima forza concettuale, nessun problema di privacy; (b) una persona interamente fittizia, con archivio costruito per l'opera — pieno controllo, meno carica emotiva; (c) un composito di frammenti donati da più persone consenzienti — "una persona che non è mai esistita" diventa letterale, ma richiede liberatorie.
2. **La lingua delle tracce.** Italiano (attuale: autentico, intimo), inglese (coerente con i titoli), o misto (l'archivio in italiano, il sistema in inglese — la distanza tra testimonianza e macchina diventa linguistica).
3. **Il colore.** Archivio in bianco e nero e sintesi a colori (attuale: il colore come inferenza non verificabile), oppure tutto monocromo (più austero, perde uno dei segni più leggibili dell'invenzione).
