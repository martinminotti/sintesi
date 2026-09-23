# SINTESI — Esposizione

## Formato

- Verticale 9:16, master 2160 × 3840 px, 24 fps, ≈ 3′30″ in loop continuo.
- Il ciclo termina sul nero e ricomincia dal nero: il loop è senza giunture.

## Dimensioni e supporto

| supporto | note |
|---|---|
| **Monitor 4K ruotato in verticale** (55″–75″) | soluzione di riferimento; pannello OLED preferito (neri reali: l'opera vive nel nero) |
| Proiezione verticale | proiettore 4K ruotato o con lens shift su parete scura; ≥ 1.5 × 2.7 m; richiede un ambiente quasi buio |
| Monitor 1080p verticale | accettabile con il master `preview`; perde la grana fine dei frammenti tipografici |

Montaggio: nessuna cornice o cornice nera sottile, bordo inferiore a ~90 cm da terra, centro immagine ad altezza occhi. Nessuna didascalia a schermo: titolo, anno e testo breve su una targa a parete.

## Ambiente

Luce ambiente bassa e senza riflessi sullo schermo. Lo spettatore deve poter restare davanti all'opera almeno un ciclo: prevedere una distanza di 2–4 m e, se possibile, una panca. Suono in cuffia o su una coppia di diffusori direzionali a basso volume; mai musica di sottofondo nell'ambiente.

## Due modalità

### MODE B — Master video (predefinita, sempre disponibile)

Il file prerenderizzato è identico all'output del sistema.

- File: `…mp4` H.264 (da `npm run render:final`), riprodotto in loop da un media player 4K (lettore dedicato, mini-PC con mpv, o player integrato nel monitor).
- mpv: `mpv --fs --loop=inf --no-osc --no-input-default-bindings master.mp4`
- Tenere sempre sul posto una copia su USB e il master ProRes d'archivio.

### MODE A — Live generativo

Il software gira direttamente, offline.

```bash
npm ci && npm run build      # una volta, in studio
npm run exhibit              # server locale su http://127.0.0.1:4173
```

Aprire Chromium in kiosk: `chromium --kiosk --autoplay-policy=no-user-gesture-required "http://127.0.0.1:4173/?quality=final&timeline=full"` (tasto `f` per fullscreen se necessario). Nessuna connessione internet richiesta: font, shader e dati sono inclusi nella build.

Requisiti hardware indicativi per il live a 4K: GPU dedicata recente (classe RTX 3060 / Apple M2 Pro o superiore), 16 GB RAM. Con hardware inferiore usare `?quality=preview` o passare al MODE B. **Se il computer dell'esposizione non garantisce 24 fps stabili, si usa il master.**

## Audio

Stereo 48 kHz, incorporato nel master (MODE B) o riprodotto in sincrono con il loop. Livello basso: la perdita di struttura sonora deve essere udibile senza invadere lo spazio.

## Checklist di installazione

1. Monitor ruotato, rotazione impostata nel sistema operativo (non nel player).
2. Risparmio energetico, screensaver, notifiche e aggiornamenti automatici disattivati.
3. Avvio automatico del player all'accensione.
4. Verifica di un ciclo completo sul posto, compreso il passaggio dal nero al nero.
5. Copia di riserva del master sul posto.
