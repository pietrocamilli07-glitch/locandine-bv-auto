# Auto Instagram Beach Volley — guida di setup

Servizio automatico che ogni **15 minuti** legge le tappe federvolley, trova le **partite finite** (di default semifinali e finali), genera la grafica **Risultato** e te la manda su **Telegram**: tu tocchi **✅ Pubblica** e va su Instagram.

Tutto gira nel cloud su **Netlify** (gratis). Non serve tenere il computer acceso.

---

## Come funziona (in breve)

1. `watcher` (ogni 15 min) → legge le tappe, trova le partite nuove finite, crea la grafica e la mette in coda.
2. Ti arriva su **Telegram** l'anteprima con i bottoni **Pubblica / Scarta**.
3. Tocchi **Pubblica** → `telegram-webhook` pubblica la grafica su Instagram e segna la partita come fatta (non si ripete).

Di default pubblica come **Storia** (la grafica è 9:16, formato perfetto). Si può passare al feed cambiando `PUBLISH_MODE` (vedi sotto), ma il feed richiede una grafica 4:5 — chiedimi e la aggiungo.

---

## Cosa ti serve (4 cose)

### 1) Bot Telegram (2 minuti)
1. Su Telegram cerca **@BotFather** → `/newbot` → dai un nome → ottieni un **token** tipo `123456:ABC-...`. Questo è `TELEGRAM_BOT_TOKEN`.
2. Cerca **@userinfobot** e premi Start: ti dice il tuo **id numerico**. Questo è `TELEGRAM_CHAT_ID`.
3. Apri una chat col tuo bot e premi **Start** (serve perché il bot possa scriverti).

### 2) Account Instagram **Business o Creator**
- Su Instagram: Impostazioni → Tipo di account → passa a **Professionale** (Business o Creator).
- Collegalo a una **Pagina Facebook** (Impostazioni Instagram → Condivisione su altre app → Facebook).

### 3) Token Instagram (Meta) — la parte più tecnica
> Se ti blocchi qui, fermati e scrivimi: ti guido passo-passo, oppure colleghiamo **Make** che salta questa parte.

1. Vai su **developers.facebook.com** → My Apps → **Create App** → tipo "Business".
2. Aggiungi il prodotto **Instagram** (Instagram Graph API).
3. Collega la tua Pagina Facebook e l'account Instagram professionale.
4. Da **Graph API Explorer** genera un token con i permessi: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`.
5. Prendi l'**IG User ID** (l'id del tuo account Instagram business) → è `IG_USER_ID`.
6. Trasforma il token in **long-lived** (60 giorni) e mettilo in `IG_TOKEN`.
   - Nota: il token scade ogni ~60 giorni e va rigenerato. Più avanti possiamo automatizzare anche il refresh.

### 4) Account Netlify
Quello che usi già per il sito locandine va benissimo (ma questo conviene tenerlo come **sito separato**).

---

## Deploy su Netlify (consigliato: via GitHub)

Le funzioni schedulate hanno bisogno della build di Netlify, quindi il drag-and-drop dello zip **non basta**. Il modo più semplice:

1. Crea un repository su **github.com** (anche privato): "New repository" → carica **tutti i file di questa cartella** (puoi trascinarli nella pagina "uploading an existing file"). **Non** caricare la cartella `node_modules`.
2. Su Netlify: **Add new site → Import an existing project → GitHub** → scegli il repo.
3. Build: lascia vuoto il "Build command", "Publish directory" = `public`. Netlify rileva da solo `netlify.toml`. Deploy.

In alternativa, da computer con Node installato: `npm i -g netlify-cli`, poi nella cartella `netlify deploy --build --prod`.

---

## Variabili d'ambiente (Netlify → Site settings → Environment variables)

Imposta queste (vedi anche `.env.example`):

| Variabile | Valore |
|---|---|
| `TAPPA_URLS` | link della/e tappa da seguire, separati da virgola |
| `TELEGRAM_BOT_TOKEN` | token del bot |
| `TELEGRAM_CHAT_ID` | il tuo id numerico |
| `IG_USER_ID` | id dell'account Instagram business |
| `IG_TOKEN` | token long-lived Meta |
| `PUBLISH_MODE` | `story` (default) o `feed` |
| `ROUNDS_REGEX` | *(opzionale)* quali round pubblicare. Default: `semifinal\|finale`. Per **tutte** le partite: `.*` |

`SITE_URL` non serve impostarlo: Netlify usa in automatico la variabile `URL`.

Dopo aver messo/cambiato le variabili, fai un nuovo **Deploy** (Deploys → Trigger deploy).

---

## Ultimo passo: collegare Telegram al sito (1 volta)

Apri questo indirizzo nel browser (sostituendo `IL_TUO_TOKEN` e `IL_TUO_SITO`):

```
https://api.telegram.org/botIL_TUO_TOKEN/setWebhook?url=https://IL_TUO_SITO.netlify.app/.netlify/functions/telegram-webhook
```

Se vedi `{"ok":true,...}` è fatto: da ora i bottoni Pubblica/Scarta funzionano.

---

## Come cambiare la/e tappa da seguire
Aggiorna `TAPPA_URLS` nelle variabili d'ambiente di Netlify (più link separati da virgola) e fai un nuovo deploy. Le partite già pubblicate restano segnate e non si ripetono.

## Prova
- Aspetta il giro automatico (ogni 15 min) oppure forza il watcher da Netlify (Functions → `watcher` → Run/Trigger).
- Ti arriva l'anteprima su Telegram → **Pubblica**.

## Note di sicurezza
- Pubblica **solo** dopo il tuo tap: un errore di lettura non finisce mai online da solo.
- Il bot accetta i comandi **solo** dalla tua chat (`TELEGRAM_CHAT_ID`).
