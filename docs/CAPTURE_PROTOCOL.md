# SINTESI — Protocollo di raccolta (direzione C)

Questo documento dice **esattamente** cosa consegnare per la prima sintesi reale: quanti file, in che formato, con quali regole, e per ogni elemento se deve essere **autentico** o se può essere **costruito** per l'opera.

Nessun materiale personale viene inventato da me: testi, date, voci, luoghi e la traccia firma vengono solo da te. Io scrivo le *istruzioni* e le *decisioni del sistema* (cosa la sintesi inventerà); tu fornisci le *prove*.

---

## 0. Tre regole

**1. Tre statuti del materiale.**

| statuto | significato | chi lo produce |
|---|---|---|
| **AUTENTICO** | esisteva prima del progetto; non va rifatto, ritoccato o completato | la tua vita |
| **COSTRUITO** | prodotto adesso per l'opera, ma con elementi reali: la tua stanza, i tuoi oggetti, il tuo corpo, le tue misure | tu, seguendo questo protocollo |
| **GENERATO** | prodotto dal modello; non entra mai nell'archivio del sistema | ComfyUI, nella sessione 01 |

Le prove che il sistema riceve sono AUTENTICHE o COSTRUITE. La sintesi è GENERATA. Non mescolare mai: nessuna immagine generata entra nell'archivio.

**2. L'incompletezza è una scelta.** Il sistema riceve solo ciò che è elencato qui. Tutto il resto resta fuori, anche se esiste. Ciò che manca non è un difetto del dataset: è la materia dell'opera.

**3. Il repository è pubblico.** Nessun file di questo protocollo va committato. Le cartelle `archive/intake/`, `archive/private/`, `archive/synthesis/` e il contenuto di `archive/*/` sono già escluse da git. Come trasferire il materiale è spiegato al §10.

---

## 1. Riepilogo della consegna

| # | cosa | statuto | quantità | formato |
|---|---|---|---|---|
| F1 | **traccia firma** | AUTENTICO | 1 | originale (vedi §2) + `firma.txt` |
| P1 | fotografia della scena, tu presente | COSTRUITO | 1 scelta (+ 2 bracketing) | RAW + TIFF 16 bit |
| P2 | stessa scena, vuota | COSTRUITO | 1 | RAW + TIFF 16 bit |
| P0 | scena con cartoncino grigio | COSTRUITO | 1 | RAW |
| D1–D4 | dettagli materici | COSTRUITO | 4 | TIFF 16 bit |
| S1–S3 | stampe fotografiche del tuo passato, fronte e retro | AUTENTICO | 2–3 stampe | scansione TIFF 16 bit grigi |
| T | testimonianze | AUTENTICO | 5–8 frasi da 2–3 persone | `testimonianze.txt` + consensi |
| A1 | una voce | AUTENTICO (preferito) o COSTRUITO | 1 | WAV (o originale) |
| A2 | room tone della stanza | COSTRUITO | 1 | WAV 48 kHz / 24 bit, 90 s |
| G | misure della stanza | COSTRUITO | 1 | `misure.txt` (+ schizzo) |
| Z | assenze | COSTRUITO (le tue parole) | 3–4 | `assenze.txt` |
| M | maschere delle regioni | COSTRUITO | 6 | PNG sulla fotografia P1 |
| R | registro privato | tuo, **mai consegnato** | 1 | dove vuoi, fuori dal repository |

Tempo stimato: mezza giornata per la sessione nella stanza, qualche giorno per raccogliere le testimonianze.

---

## 2. La traccia firma (F1) — AUTENTICA

È l'elemento reale della tua vita che il sistema metterà **fuori contesto**: la sintesi lo userà per riempire ciò che l'archivio non sa, cioè cosa c'era fuori dalla finestra. Nello smontaggio finale riaffiorerà al posto di ciò che ha generato: la prova che quella parte dell'immagine veniva da altrove.

### Criteri (tutti obbligatori)

1. **Esisteva prima del progetto.** Un file, una registrazione, una stampa che hai già. Non si rifà e non si ritocca.
2. **È un luogo o una materia, non un evento.** Un suono di un posto, una vista, una superficie. Niente persone, volti, nomi, ricorrenze, niente di drammatico: l'opera non deve diventare *quella* storia.
3. **Appartiene a un altro luogo, non alla stanza.** Deve poter diventare "la vista dalla finestra" ed essere incompatibile con dove la stanza si trova (mare in una città senza mare, neve in una stanza d'estate, un binario fuori da un appartamento).
4. **È riconoscibile per tipo, non per identità.** Chiunque capisce "mare", "stazione", "bosco"; nessuno deve capire "la casa di X a Y".
5. **Non ha didascalia.** Perché conta per te va solo nel registro privato (R). Il sistema, e io, non lo sappiamo.

### Tipi, in ordine di preferenza

| tipo | perché | consegna |
|---|---|---|
| **a) una registrazione audio di un luogo** (memo vocale, audio di un vecchio video, cassetta) | la più forte: il sistema trasforma un *suono* in un'*immagine*, e questo salto è la tesi dell'opera. È anche la meno autobiografica: un luogo sentito è anonimo. | file originale non riconvertito (m4a, mp3, wav, mov…) |
| b) una fotografia di una vista, senza persone | la più leggibile nello smontaggio, ma rischia di diventare "la foto di quel posto" | file originale o scansione 16 bit |
| c) un documento di un luogo (cartolina, biglietto, mappa) | debole: è già narrativo | scansione 16 bit fronte/retro |

Da evitare: foto di famiglia, qualunque volto, messaggi personali, oggetti legati a lutti o a eventi riconoscibili.

### `firma.txt` (tutto qui, niente di più)

```text
tipo: audio | foto | documento
data: AAAA o AAAA-MM (anche approssimativa, con "ca.")
percepibile: 1–3 sostantivi su ciò che si sente o si vede, non su cosa significa
             (es. "mare, vento" · "binari, pioggia" · "neve")
luogo diverso dalla stanza: sì
```

Il campo `percepibile` è **l'unica cosa** che il sistema saprà per inferire la vista. Il prompt della finestra verrà costruito da quelle parole, non da una mia invenzione.

---

## 3. La sessione nella stanza (P0, P1, P2, D, A2, G) — COSTRUITA

Una sola sessione, stessa luce, stessa posizione della fotocamera, in una stanza reale che usi o hai usato, con i tuoi oggetti reali.

### Attrezzatura

- Fotocamera con RAW, ≥ 20 MP, oppure un telefono recente in RAW (DNG/ProRAW) **con l'obiettivo 2× o 3×**, non il grandangolo.
- Focale equivalente **40–50 mm**; treppiede; scatto remoto o autoscatto 10 s.
- Un cartoncino grigio o un foglio bianco opaco (P0).
- Registratore o telefono per il room tone (A2).
- Metro.

### Composizione C (verticale 9:16)

```text
        0                0.4               1   (larghezza)
   0 ┌─────────────────┬────────────────────┐
     │ FINESTRA        │  parete vuota      │  ← niente appeso qui
     │ (terzo sinistro,│  (dove la sintesi  │    (togli quadri, calendari)
     │  telaio e       │   appenderà una    │
     │  traverse       │   cornice)         │
0.35 │  visibili)      │      ● testa       │  ← testa al 35–40 % dall'alto,
     │                 │     ╱ spalle       │    circa a metà orizzontale
     │─ davanzale ─────│    ╱  cappotto     │
0.55 │                 │   ╱                │
     │                 │  busto al tavolo   │
0.80 │═════════════ piano del tavolo ═══════│
     │  tazza ◐┐                            │  ← tazza in basso a sinistra,
   1 └──────────────────────────────────────┘    MANICO A DESTRA
```

- **Fotocamera:** in verticale, obiettivo a **115–120 cm** da terra, **1,6–2,0 m** dal soggetto, leggermente di tre quarti. Lascia margine attorno: il taglio 9:16 si fa dopo.
- **Tu:** seduto al tavolo, busto girato di circa 30° verso la finestra, testa ancora più girata **verso il basso, verso la tazza o le mani**. **Gli occhi guardano in basso.** È lo sguardo reale, e il sistema lo contraddirà. Non esiste nessuno scatto in cui guardi fuori dalla finestra, e non va fatto.
- **Cappotto:** quello vero, scuro, a tinta unita, senza loghi. Il suo colore reale non verrà mai dato al sistema (l'archivio sarà in bianco e nero).
- **Tazza:** una tua tazza reale, manico verso destra.
- **Mani:** ferme, appoggiate; meglio se parzialmente fuori dal gesto (le mani sono il punto debole dei generatori, qui non verranno toccate).
- **Luce:** solo la finestra. Luce diffusa (cielo coperto o finestra non esposta al sole diretto). Nessuna macchia di sole dentro la stanza: se un giorno ci sarà il sole, sarà una decisione della sintesi, non un fatto dell'archivio. Luci artificiali spente.
- **Esposizione manuale**, uguale per tutti gli scatti: misura sulla pelle; la finestra può bruciare, ma il telaio deve restare leggibile. f/4–5.6, ISO 100–400, tempo ≥ 1/60. Bilanciamento del bianco fisso su "luce diurna". Messa a fuoco manuale sull'occhio più vicino, poi bloccata.

### Scatti

| id | cosa | quanti | note |
|---|---|---|---|
| P0 | cartoncino grigio tenuto dove sarà il tuo volto | 1 | serve a fissare colore ed esposizione |
| P1 | la scena, con te | 15 di posa → sceglierne **1** | + bracketing −1/+1 EV della scelta |
| P2 | la stessa scena **vuota**: sedia, tavolo, tazza al loro posto | 3 → 1 | subito dopo P1, stessa luce, fotocamera non toccata |
| D1 | tessuto del cappotto, a riempire il fotogramma | 3 → 1 | luce radente |
| D2 | l'intonaco della parete vuota, **esattamente dove sarà la cornice** | 3 → 1 | è la prova che contraddirà la sintesi |
| D3 | il legno del tavolo | 3 → 1 | |
| D4 | il bordo della tazza | 3 → 1 | |

Consegna di P1, P2, D1–D4: il **RAW originale** più un **TIFF 16 bit sRGB** sviluppato senza filtri, senza ritocco della pelle, senza "migliora". P1 e P2 alla risoluzione piena, non ritagliati.

### Room tone (A2)

Nella stanza, subito dopo gli scatti: **90 secondi** di silenzio, finestra come durante le foto, nessuno che parla, telefono in modalità aereo. WAV 48 kHz / 24 bit (o il formato migliore del registratore).

### Misure (G) — `misure.txt`

```text
stanza: larghezza × profondità × altezza (m)
finestra: larghezza × altezza, altezza del davanzale da terra, distanza dall'angolo sinistro
tavolo: dimensioni, distanza dalla parete della finestra
fotocamera: altezza obiettivo, distanza dal soggetto, focale equivalente
città della stanza (solo la città)
```

Se vuoi, aggiungi uno schizzo della pianta fotografato. La pianta che comparirà nell'archivio sarà ridisegnata dall'engine con queste misure.

---

## 4. Stampe dal tuo passato (S1–S3) — AUTENTICHE

- **2–3 fotografie stampate** esistenti, di qualunque epoca, in cui **non** compare un volto intero: un luogo, un oggetto, una parte di te (una mano, una spalla, di spalle), una stanza. Niente persone terze riconoscibili.
- Scansione del **fronte e del retro** (il retro porta date, timbri, scritte: sono tracce DATE e METADATA autentiche).
- 1200–2400 dpi, **TIFF 16 bit in scala di grigi**, senza pulizia di polvere e graffi.
- Non verranno collocate nella scena: nell'archivio sono prove che il sistema non sa dove mettere, e che assorbe.

---

## 5. Testimonianze (T) — AUTENTICHE

Da **2–3 persone** che ti conoscono. **5–8 frasi in totale.** Non spiegare il progetto prima delle risposte.

Domande (scegline 4–6, falle una alla volta, a voce):

1. Dove ti sedevi di solito, in casa?
2. Cosa c'era sul tavolo?
3. Che cappotto portavo? Di che colore?
4. Com'era la luce in quella stanza?
5. Cosa si vedeva dalla finestra?
6. Com'era la mia voce?

Regole:
- **Trascrivi esattamente**, con le esitazioni ("credo", "forse", "non ricordo"). L'incertezza è materiale: non va corretta.
- Se una risposta contraddice un'altra, tienile entrambe.
- Nessun nome nelle frasi.

`testimonianze.txt`:

```text
[A] “…”
[A] “…”
[B] “…”
[C] “…”
```

Consenso: per ogni persona una riga firmata (foto del foglio in `04_testimonianze/consensi/`):
*"Autorizzo l'uso anonimo delle mie parole, trascritte, nell'opera SINTESI di Martin Minotti."*

---

## 6. La voce (A1)

- **Preferibile AUTENTICA:** un frammento di 5–20 s della tua voce da una registrazione che già esiste (un vecchio video, un messaggio vocale), senza che si capisca cosa dici.
- In alternativa COSTRUITA: 10–20 s registrati ora, parole qualsiasi, a bassa voce.
- Consegna nel formato originale; se registri ora, WAV 48 kHz / 24 bit.

---

## 7. Date (in `date.txt`)

Almeno **3 date reali**, ciascuna con la sua fonte:

```text
certa:          AAAA-MM-GG  — fonte (retro della stampa S1, file EXIF…)
approssimata:   ca. AAAA    — fonte (una testimonianza)
parziale:       AAAA-MM-··  — fonte (un documento con cifre illeggibili)
```

Non ricostruire le cifre mancanti.

---

## 8. Assenze (Z) — `assenze.txt`

Scrivi, con parole tue, ciò che l'archivio **non sa**. Ogni assenza sarà una casella vuota nell'archivio e occuperà una regione della scena.

```text
sguardo:  (es. "cosa stavo guardando")
fuori:    (es. "cosa c'era fuori dalla finestra")
tempo:    (es. "prima, dopo")
[facoltativa] interno: (es. "cosa provavo")
```

---

## 9. Il registro privato (R) — tuo, mai consegnato

Un file o un quaderno fuori dal repository, che nessuno riceve (io compreso). Per ogni traccia: da dove viene davvero, cosa significa, cosa ricordi. In particolare perché hai scelto la traccia firma.

Non è burocrazia. È la condizione dell'opera: **l'autore conosce la persona rappresentata; il sistema no.** Il registro è la prova che quella distanza esiste.

---

## 10. Consegna

### Struttura

```text
archive/intake/                      ← già esclusa da git
  00_firma/        firma.<est>  firma.txt
  01_scena/        P0.<raw>  P1.<raw>  P1.tif  P1_-1ev.<raw>  P1_+1ev.<raw>  P2.<raw>  P2.tif
  02_dettagli/     D1_cappotto.tif  D2_intonaco.tif  D3_legno.tif  D4_tazza.tif
  03_stampe/       S1_fronte.tif  S1_retro.tif  S2_fronte.tif  …
  04_testimonianze/ testimonianze.txt  consensi/
  05_audio/        A1_voce.<est>  A2_room_tone.wav
  06_geometria/    misure.txt  [schizzo.jpg]
  07_date/         date.txt
  08_assenze/      assenze.txt
  09_maschere/     view.png  wall.png  vessel.png  coat.png  gaze.png  figure.png   (vedi sotto)
```

### Maschere (M)

Sul **TIFF di P1** (stessa risoluzione, stesso taglio), in Krita o GIMP: una PNG per regione, **bianco = regione, nero = resto**, bordi morbidi di pochi pixel.

| file | regione |
|---|---|
| `view.png` | solo il vetro della finestra: ciò che si vede fuori, senza il telaio |
| `wall.png` | il rettangolo di parete vuota dove comparirà la cornice (circa 25 × 30 cm reali) |
| `vessel.png` | la tazza, con un po' di margine |
| `coat.png` | il cappotto, senza colletto della camicia né mani |
| `gaze.png` | occhi e palpebre, con 1–2 cm di margine; non il resto del volto |
| `figure.png` | **tutta la persona**: testa, capelli, collo, mani, cappotto compreso. Non serve alla generazione ma all'opera: dice al sistema che la persona è un'inferenza tra i frammenti, e nello smontaggio si ritira prima della stanza |

### Verifica

```bash
pip install pillow
python tools/intake.py archive/intake
```

Lo script controlla presenza, formati, risoluzioni, profondità di bit, durata dell'audio e **coordinate GPS rimaste nei file**, e scrive `archive/intake/INTAKE_REPORT.md`.

### Trasferimento

Il repository `martinminotti/sintesi` è **pubblico**: non si committa nulla di questo materiale. Due possibilità:
1. **(consigliata)** un secondo repository **privato**, per esempio `martinminotti/sintesi-archive`, che contiene solo `intake/`. Lo aggiungo alla sessione e lo leggo da lì.
2. rendere privato `sintesi` (decisione tua, dalle impostazioni di GitHub).

---

## 11. Poi

Con P1 e le maschere si fa la **sessione ComfyUI 01** (`docs/COMFYUI_SESSION_01.md`), sulla tua macchina. Da lì escono sintesi, alternative e profondità. Le prove (P1 in bianco e nero, D, S, T, A, date, assenze, firma) diventano il dataset reale in `archive/metadata/dataset.json`, anche questo fuori da git.
