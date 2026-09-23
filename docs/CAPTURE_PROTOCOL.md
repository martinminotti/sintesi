# SINTESI — Protocollo di raccolta dell'archivio

Il soggetto dell'opera è l'autore. Il sistema, però, non deve conoscerlo: riceve soltanto una **selezione deliberatamente incompleta** di tracce. Questo documento descrive come costruire quella selezione.

> Regola: l'autore conosce la persona rappresentata; il sistema no. Ogni scelta di cosa *non* dare al sistema è una decisione artistica, e va registrata.

## 1. Principio di incompletezza

Per ogni categoria decidere prima **quanto** documentare. Le quantità diseguali sono il materiale dell'opera.

| categoria | quantità indicativa | esempi |
|---|---|---|
| PORTRAIT | 3–5 frammenti | un occhio, un orecchio, la linea della mascella, una mano. Mai un volto intero. |
| PLACE | 3–4 | lo spigolo di una finestra, un davanzale, un pezzo di pavimento, un interruttore |
| OBJECT | 2–3 | una tazza, una sedia, un oggetto personale ripreso da vicino |
| DOCUMENT | 1–2 | il retro di una stampa, un biglietto, una busta (fotografati, non trascritti) |
| TEXT | 4–6 | testimonianze brevi di persone che ti conoscono, trascritte parola per parola |
| DATE | 3–5 | una certa, una approssimata, una illeggibile |
| AUDIO | 2–3 | una voce (tua o di chi ti ricorda), un ambiente, qualcosa di fuori luogo |
| GEOMETRY | 1 | la pianta misurata di una stanza |
| METADATA | 2–3 | dati di scatto, pellicola, iscrizioni sul retro |
| ABSENCE | 2–4 | ciò che l'archivio dichiaratamente non contiene |

Tenere un archivio completo *privato*, fuori dal repository, e passare al sistema solo la selezione.

## 2. Fotografie

- **Archivio reale**: stampe e negativi di anni diversi, scansionati a 2400 dpi, 16 bit, in scala di grigi (anche se a colori: l'archivio del sistema è in bianco e nero, il colore resta un'inferenza).
- **Nuove riprese** (per i frammenti che devono combaciare con la scena): la stanza vera, luce naturale laterale, fotocamera su treppiede, stessa ottica per tutte le riprese (35–50 mm equivalente), esposizione manuale. Riprendere la **stessa composizione** 9:16 che la sintesi userà, poi ritagliare i frammenti da quelle foto: così i `crop` del dataset coincidono con la scena.
- Il volto: fotografare solo frammenti (occhio, orecchio, profilo parziale). Evitare di fornire al sistema un volto intero frontale: è la condizione per cui la sintesi dovrà *inventare* lo sguardo.
- Lo **sguardo reale** deve essere documentato in un solo frammento, e in una direzione precisa (per esempio verso il basso, sul tavolo). La sintesi lo contraddirà.

## 3. Testimonianze

Chiedere a 2–3 persone frasi brevi e concrete, senza spiegare il progetto. Esempi di domande: *"Dove si sedeva?"*, *"Che cappotto portava?"*, *"Cosa c'era sul tavolo?"*. Tenere le risposte incerte ("credo", "forse", "non ricordo"): sono la materia delle ipotesi. Trascrivere esattamente, in italiano. Chiedere il consenso scritto per l'uso delle frasi (non dei nomi).

## 4. Audio

Registratore o telefono, 48 kHz / 24 bit, WAV:
- una voce: 10–20 s, anche solo un frammento di conversazione (con consenso);
- il room tone della stanza reale: 60 s di silenzio;
- **una registrazione fuori luogo**: un ambiente che appartiene a un altro luogo della tua vita (il mare, una stazione, un bosco). È la traccia da cui la sintesi prenderà ciò che mette fuori dalla finestra.

## 5. Assenze

Scrivere esplicitamente cosa l'archivio non sa. Ogni assenza diventa un record `type: "absence"` con la regione della scena che lascia aperta:
- cosa stavi guardando;
- cosa c'era fuori;
- cosa accadde prima e dopo;
- cosa provavi.

## 6. Dataset

Compilare `archive/metadata/dataset.json` (formato in PRODUCTION.md). Per ogni traccia: `confidence` (quanto è affidabile), `semanticWeight` (quanto dice di te), `relationships`, `crop` per foto e assenze. Scegliere il `residue`: la traccia che sopravvive alla fine e apre il ciclo successivo.

## 7. Privacy

Nessun volto, voce o nome di terzi senza consenso scritto. I metadati EXIF delle foto nuove vanno rimossi (coordinate GPS comprese) prima di entrare nel repository; le coordinate nel dataset devono avere la precisione che l'autore sceglie di rendere pubblica (città, non indirizzo).
