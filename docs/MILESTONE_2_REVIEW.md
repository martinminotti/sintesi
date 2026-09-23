# SINTESI — Milestone 2: revisione degli esperimenti

Esperimenti E1 (ipotesi e acceptance), E2 (studi A/B/C), E3 (DECONSTRUCTION genealogica e loop). Tutto renderizzato con il soggetto procedurale: valuta dinamica e composizione, non fotorealismo.

## Confronto delle direzioni

| | A — Ritratto | B — Ambiente | C — Figura + ambiente |
|---|---|---|---|
| "sto vedendo una persona ricostruita" | fortissimo | debole: è una stanza | forte |
| "il sistema completa ciò che non sa" | sul volto: leggibile ma inquietante in modo generico | nella finestra e sulla sedia: leggibile | finestra, parete, oggetto, volto: il più ricco |
| "sembra reale" | dipende tutto dal volto: il terreno più riconoscibile come AI | il più facile da rendere fotografico | medio: figura + stanza + luce |
| "non è mai esistita così" | lo sguardo contraddetto dall'occhio reale: immagine fortissima | il mare fuori da una stanza di Milano: concettuale, poco visibile | entrambi, legati da una sola decisione |
| rischio | "AI portrait" | fotografia d'interni, nessuna posta in gioco | complessità di produzione |

**Raccomandazione: C**, con due correzioni prese dagli altri studi:
- da A: inquadratura un po' più stretta sulla figura, perché il momento "l'occhio reale riaffiora sul volto inventato" deve essere leggibile a 3 m;
- da B: la luce del sole sul tavolo, che nella sintesi è la cosa più fotografica.

La scelta resta dell'autore: è irreversibile per la produzione (determina foto, blockout, LoRA).

## WHAT WORKS

- **DECONSTRUCTION genealogica.** Il mare torna alle sue alternative e poi a un'assenza incorniciata, su cui riaffiora la forma d'onda della risacca. Il cappotto diventa un vuoto con dentro la testimonianza. Poi restano soltanto i frammenti grigi, con le loro relazioni. È la parte più intelligente dell'opera, come richiesto, e si legge senza testo esplicativo.
- **Il paradosso è misurato.** Dalla fine di INFERENCE alla sintesi ferma, la confidence scende da 0.51 a 0.44 mentre la certezza mostrata sale da 0.63 a 1.00. La confidence scende perché i frammenti riscritti dalla sintesi smettono di valere come prova: l'immagine finale contiene 0 % d'archivio, senza bisogno di scriverlo.
- **ABSENCE come categoria.** Nell'archivio è una cornice vuota con gli angoli portafoto. In INFERENCE si posa sulla regione che lascia aperta e lì il sistema propone alternative leggibili (città, alberi, mare). In SYNTHESIS si chiude. In DECONSTRUCTION riappare.
- **Il loop.** L'occhio è la prima traccia acquisita e l'ultima a sopravvivere; torna alla sua posizione di catalogo. Differenza tra ultimo e primo fotogramma: 0.77 %.
- **Tipografia assente di default.** L'archivio senza titoli e label è più un archivio e meno un'interfaccia.

## WHAT DOESN'T

- **La sintesi non è una fotografia.** È un rendering CG. I test C e F falliscono, e con questo soggetto non possono passare: la milestone non può chiudersi sul materiale procedurale.
- **INFERENCE è ancora piatta** nella seconda metà: la stanza si stabilizza presto e poi resta ferma. Le proposte si vedono solo nella finestra.
- **Le sovrapposizioni di ipotesi sulla figura** sono coperte dai frammenti osservati: il volto non mostra le sue alternative (sguardi diversi), che sarebbero la cosa più forte di INFERENCE.
- **Le regioni che si ritirano** lasciano sagome nere nette lungo i confini dei materiali: l'erosione aiuta, ma il contorno resta digitale.
- **CORRELATION** è ancora un grafo di linee su nero; senza nomi è più astratto, ma resta un diagramma.

## WHAT IS ARTISTICALLY RISKY

- **Il volto.** Se la sintesi del volto dell'autore scivola verso il "ritratto AI", compromette tutto: il pubblico riconoscerà lo strumento prima dell'idea. Mitigazione: profilo, sguardo abbassato o rivolto fuori campo, mai frontale, grana e ottica fotografiche.
- **L'errore firma (il mare).** Funziona solo se il pubblico si accorge che non appartiene alla stanza. Senza la genealogia (forma d'onda) è solo un bel panorama. Va reso visibile nel momento in cui crolla.
- **La durata della quiete.** 12–18 s di immagine ferma in un contesto espositivo sono lunghi: servono per credere, ma chi entra in quel momento vede "una foto". Accettabile, forse desiderabile.
- **Pannelli espositivi**: se il testo di sala spiega troppo, toglie al finale il suo effetto.

## WHAT SHOULD BE REMOVED

- I titoli dei capitoli (già opzionali, `typography=minimal`).
- I nomi dei concetti e le label (già tolti di default).
- La cornice numerica "0% ARCHIVE / 100% SYNTHESIS": sostituita dalla misura interna (i frammenti riscritti non contano più come prova) e dalla genealogia visibile.
- Le celle di Voronoi a media confidenza nel quadro: da sostituire con deformazioni continue.
- Le tre texture macro quasi nere (TEX_01/03) nella scena: da vicino sono quadrati scuri illeggibili.

## NEXT EXPERIMENTS

1. **Materiale reale minimo (massimo potenziale, costo medio).** Una sessione fotografica di un'ora nella stanza reale, secondo `docs/CAPTURE_PROTOCOL.md`, più una sola sintesi SDXL locale a bassa risoluzione con 3 alternative per la finestra. Verifica: `SubjectSource` da file + TEST C/F su un frame reale. È l'unico esperimento che può dire se l'opera funziona.
2. **Le alternative del volto (alto potenziale, costo basso).** In INFERENCE i frammenti del volto si ritirano per qualche secondo e lasciano vedere tre sguardi sovrapposti. Verifica: fotogrammi di INFERENCE dove si distinguono tre direzioni dello sguardo.
3. **Suono dallo stato (medio, costo basso).** Un renderer audio offline deterministico (Node, WAV) da `ArtworkState`: transienti per ogni traccia acquisita, room tone che si riempie con l'acceptance, risacca che si ritira dentro la sua forma d'onda. Verifica: un WAV del ciclo di studio allineato al video.
4. **INFERENCE a due tempi (medio, costo basso).** Prima l'attenzione si espande (la stanza è considerata ma indeterminata), poi le proposte si alternano con ritmo crescente. Verifica: contact sheet con progressione visibile tra ogni fotogramma.
