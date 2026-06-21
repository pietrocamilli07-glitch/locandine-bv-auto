// Storage su FILE (per GitHub Actions) — sostituisce store.mjs (Netlify Blobs).
// Lo stato e le immagini vivono nel repo: niente servizi esterni, niente crediti.
//  - state.json        -> partite gia pubblicate (anti-doppioni). NESSUN segreto qui dentro.
//  - published/<key>.jpg-> le grafiche, servite pubblicamente da raw.githubusercontent.
//  - to-publish.json   -> coda tra lo step "render" e lo step "publish" dello stesso run.
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.env.REPO_DIR || process.cwd();
const STATE_FILE = join(ROOT, 'state.json');
const QUEUE_FILE = join(ROOT, 'to-publish.json');
const IMG_DIR = join(ROOT, 'published');

export function matchKey(tappaId, match){ return `${tappaId}_${match.id}`; }
export const IMAGE_SUBDIR = 'published';

function readJson(p, fallback){ try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return fallback; } }

export function loadState(){ return readJson(STATE_FILE, { posted: {}, pending: {} }); }
export function saveState(s){ writeFileSync(STATE_FILE, JSON.stringify(s, null, 2) + '\n'); }

export function loadQueue(){ return readJson(QUEUE_FILE, []); }
export function saveQueue(q){ writeFileSync(QUEUE_FILE, JSON.stringify(q, null, 2) + '\n'); }
export function clearQueue(){ try { rmSync(QUEUE_FILE); } catch {} }

// scrive il JPEG in published/<key>.jpg e ritorna il path relativo (per l'URL raw)
export function putImage(key, buffer){
  mkdirSync(IMG_DIR, { recursive: true });
  const rel = `${IMAGE_SUBDIR}/${key}.jpg`;
  writeFileSync(join(ROOT, rel), buffer);
  return rel;
}

// URL pubblico dell'immagine su GitHub (raw). Richiede repo PUBBLICO.
export function rawUrl(relPath){
  const repo = process.env.GITHUB_REPOSITORY;                 // "utente/repo"
  const ref  = process.env.GITHUB_REF_NAME || 'main';         // branch corrente
  if (!repo) throw new Error('GITHUB_REPOSITORY non impostata (esegui dentro GitHub Actions)');
  return `https://raw.githubusercontent.com/${repo}/${ref}/${relPath}`;
}
