import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

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

export async function markProposalsSent(proposalIds) {
  if (!Array.isArray(proposalIds) || proposalIds.length === 0) return;
  const sent = await loadSentMap();
  const now = Date.now();
  for (const id of proposalIds) {
    if (!id) continue;
    sent[String(id)] = now;
  }
  await ensureDataFile();
  await fs.writeFile(SENT_FILE, JSON.stringify({ sent }, null, 2), 'utf8');
}

export async function filterUnsentProposals(proposals) {
  const sent = await loadSentMap();
  return (Array.isArray(proposals) ? proposals : []).filter((p) => {
    const id = p?.id ?? p?.proposal_id;
    return id !== undefined && sent[String(id)] === undefined;
  });
}


