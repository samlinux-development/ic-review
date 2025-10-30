import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { DEFAULT_QUERY_LIMIT } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', 'data');
const SENT_FILE = join(DATA_DIR, 'sent.json');

async function ensureDataFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(SENT_FILE).catch(async () => {
      await fs.writeFile(SENT_FILE, JSON.stringify({ sent: {} }, null, 2), 'utf8');
    });
  } catch {}
}

export async function loadSentMap() {
  await ensureDataFile();
  try {
    const raw = await fs.readFile(SENT_FILE, 'utf8');
    const json = JSON.parse(raw || '{"sent":{}}');
    return typeof json === 'object' && json?.sent && typeof json.sent === 'object' ? json.sent : {};
  } catch {
    return {};
  }
}

export async function markProposalsSent(proposalIds, options = {}) {
  if (!Array.isArray(proposalIds) || proposalIds.length === 0) return;
  const sent = await loadSentMap();
  const now = Date.now();
  for (const id of proposalIds) {
    if (!id) continue;
    sent[String(id)] = now;
  }

  // Prune to cap: default 2x query limit or env override
  const envCap = Number(process.env.STORAGE_MAX_IDS);
  const queryLimit = Number(options.queryLimit || DEFAULT_QUERY_LIMIT);
  const cap = Number.isFinite(envCap) && envCap > 0 ? envCap : Math.max(1, 2 * queryLimit);

  const entries = Object.entries(sent)
    .map(([id, ts]) => [id, Number(ts) || 0])
    .sort((a, b) => b[1] - a[1]); // newest first

  const pruned = entries.slice(0, cap);
  const next = {};
  for (const [id, ts] of pruned) next[id] = ts;

  await ensureDataFile();
  await fs.writeFile(SENT_FILE, JSON.stringify({ sent: next }, null, 2), 'utf8');
}

export async function filterUnsentProposals(proposals) {
  const sent = await loadSentMap();
  return (Array.isArray(proposals) ? proposals : []).filter((p) => {
    const id = p?.id ?? p?.proposal_id;
    return id !== undefined && sent[String(id)] === undefined;
  });
}


