# Auto-pubblicazione Storie Instagram — su GitHub Actions (gratis per sempre)

Questo sistema legge i risultati da federvolley, genera la grafica "Risultato" e la
**pubblica come Storia Instagram** in automatico. Gira su **GitHub Actions**: nessun server,
nessun credito che scade (niente Netlify), nessun proxy esterno.

Come funziona: GitHub esegue un piccolo programma Node ogni 30 minuti (o quando lo avvii tu).
Il programma scarica la pagina della tappa, disegna il JPEG, lo carica su GitHub (URL pubblico)
e chiama l'API ufficiale di Instagram per pubblicarlo. Le partite già fatte non vengono ripetute.

---

## Attivazione (una volta sola, ~10 minuti)

### 1) Crea il repository
- Crea un **nuovo repository PUBBLICO** su GitHub (es. `locandine-bv-auto`).
  Deve essere pubblico perché Instagram possa scaricare le immagini da `raw.githubusercontent.com`.
- Carica **il contenuto di questa cartella `Auto-Instagram`** nella radice del repo
  (trascinando i file su github.com, oppure con `git push`). Nella radice devono esserci
  `publish-gh.mjs`, `package.json`, la cartella `lib/`, `tappe.txt` e `.github/`.

### 2) Permessi delle Actions
- Repo → **Settings → Actions → General → Workflow permissions** → scegli
  **"Read and write permissions"** → Save. (Serve per salvare grafiche e stato nel repo.)

### 3) Credenziali Instagram (Secrets)
Repo → **Settings → Secrets and variables → Actions → New repository secret**. Aggiungi:
- `IG_USER_ID` → l'ID dell'account Instagram **Professionale/Business** (collegato a una Pagina Facebook).
- `IG_TOKEN` → un **token di lunga durata** con permessi `instagram_basic`, `instagram_content_publish`,
  `pages_show_list`, `business_management`.

> Come ottenerli: da [developers.facebook.com](https://developers.facebook.com) crea un'app,
> collega la Pagina Facebook all'account IG Business, genera un token utente di lunga durata
> e ricava lo User ID Instagram. Se avevi già collegato Instagram nella vecchia versione
> (`/oauth` di Auto-Instagram), puoi riusare lo stesso ID e token.
> ⚠️ Il token di lunga durata dura ~60 giorni: rigeneralo e aggiorna il Secret quando scade.

**Telegram (facoltativo — ti arriva un messaggio per ogni storia pubblicata):**
- `TELEGRAM_BOT_TOKEN` → token del bot (creato con @BotFather).
- `TELEGRAM_CHAT_ID` → l'ID della chat dove ricevere i messaggi (scrivi al bot, poi leggi il `chat.id`
  da `https://api.telegram.org/bot<TOKEN>/getUpdates`).

Se non li metti, il sistema pubblica su Instagram senza mandare nulla su Telegram.

### 4) (Facoltativo) Impostazioni — Settings → Secrets and variables → Actions → Variables
- `ROUNDS_REGEX` → quali partite pubblicare. Vuoto = **tutte**. Per solo semifinali e finali: `semifinal|finale`.
- `MAX_PER_RUN` → quante storie al massimo per giro (default `10`). Tiene basso il rischio di superare
  il limite Instagram (~50 pubblicazioni/24h).
- `DRY_RUN` → metti `1` per la **modalità prova**: genera le grafiche e (se hai messo Telegram) te le
  manda su Telegram, ma **non pubblica nulla su Instagram**. Ottimo per il primo test. Toglilo per andare live.

---

## Uso quotidiano (dal telefono)

Due modi, entrambi gratis:

- **A mano (consigliato durante una tappa):** vai su **Actions → "Pubblica storie Instagram" →
  Run workflow**, incolla i link delle tappe nel riquadro e avvia. Pubblica le storie nuove.
- **Automatico:** scrivi i link (uno per riga) nel file **`tappe.txt`** del repo. Ogni 30 minuti
  il sistema controlla quelle tappe e pubblica le partite appena concluse.

Le partite già pubblicate sono ricordate in `state.json`: non vengono mai ripetute.

---

## Verifica veloce
- Dopo un run, in **Actions** vedi il log (quante grafiche generate / storie pubblicate).
- Le immagini finiscono nella cartella `published/` del repo.
- Se qualcosa non pubblica: controlla che il repo sia **pubblico**, i Secrets corretti e
  il token non scaduto.
