import nodemailer from 'nodemailer';
import { TOPIC_RECIPIENTS } from './config.js';
import { filterUnsentProposals, markProposalsSent } from './storage.js';
import { logger } from './logger.js';

function parseBool(value, defaultValue = false) {
  if (value === undefined || value === null) return defaultValue;
  const s = String(value).toLowerCase().trim();
  if (['1', 'true', 'yes', 'on'].includes(s)) return true;
  if (['0', 'false', 'no', 'off'].includes(s)) return false;
  return defaultValue;
}

export async function sendProposalsEmail({ proposals, transportOptions = {}, mailOptions = {} }) {
  if (!Array.isArray(proposals) || proposals.length === 0) return { sent: false, reason: 'no_proposals' };

  const envPort = Number(process.env.SMTP_PORT || 587);
  const envSecure = parseBool(process.env.SMTP_SECURE, envPort === 465);
  const ignoreTLS = parseBool(process.env.SMTP_IGNORE_TLS, false);
  const requireTLS = parseBool(process.env.SMTP_REQUIRE_TLS, false);
  const greetingTimeout = Number(process.env.SMTP_GREETING_TIMEOUT || 30000);
  const connectionTimeout = Number(process.env.SMTP_CONNECTION_TIMEOUT || 30000);
  const name = process.env.SMTP_NAME; // optional client hostname for EHLO

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: envPort,
    secure: envSecure,
    name,
    greetingTimeout,
    connectionTimeout,
    ignoreTLS,
    requireTLS,
    auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    } : undefined,
    tls: {
      // Allow overriding strict TLS via env var if the server presents unusual banners/certs
      rejectUnauthorized: parseBool(process.env.SMTP_TLS_REJECT_UNAUTHORIZED, true),
    },
    ...transportOptions,
  });

  const from = process.env.MAIL_FROM || 'support@sdg-office.at';
  const to = process.env.MAIL_TO || ''; // comma-separated list
  const subject = mailOptions.subject || process.env.MAIL_SUBJECT || 'ICP Proposals Update';

  const lines = proposals.map((p) => {
    const id = p?.id ?? p?.proposal_id ?? 'unknown';
    const updatedAt = p?.updated_at ?? p?.updated_at_time ?? '';
    const title = p?.title ?? '';
    const status = p?.status ?? '';
    const topic = p?.topic ?? '';
    return `#${id} [${status}] (${topic}) ${updatedAt} ${title}`.trim();
  });

  const text = `New proposals available (${proposals.length}):\n\n${lines.join('\n')}`;

  const dashboardBase = process.env.PROPOSAL_DASHBOARD_BASE_URL || 'https://dashboard.internetcomputer.org/proposal';
  const htmlItems = proposals.map((p) => {
    const id = p?.id ?? p?.proposal_id ?? 'unknown';
    const timestamp = p?.proposal_timestamp_seconds ?? p?.created_at_time ?? '';
    const title = (p?.title || '').toString();
    const status = (p?.status || '').toString();
    const topic = (p?.topic || '').toString();
    const href = `${dashboardBase}/${id}`;
   

    return `
      <li>
        <a href="${href}" target="_blank" rel="noopener noreferrer">Proposal #${id}</a>
        ${title ? `<div><strong>Title:</strong> ${escapeHtml(title)}</div>` : ''}
        <div><strong>Topic:</strong> ${topic} · <strong>Status:</strong> ${status}</div>
        <div><strong>Created:</strong> ${new Date(timestamp * 1000).toISOString()}</div>
      </li>`;
  }).join('');

  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-size:14px; color:#111;">
      <p>New proposals available (${proposals.length}):</p>
      <ul style="padding-left:16px;">${htmlItems}</ul>
    </div>
  `;

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
    ...mailOptions,
  });
  logger.debug({ messageId: info.messageId, to }, 'email sent');
  return { sent: true, messageId: info.messageId };
}

function uniq(array) {
  return Array.from(new Set(array.filter(Boolean)));
}

function resolveRecipientGroups(proposals) {
  const groups = [];
  const mappings = Array.isArray(TOPIC_RECIPIENTS) ? TOPIC_RECIPIENTS : [];
  const unmatched = [];

  for (const p of proposals) {
    const matchedEntries = mappings.filter((m) => Array.isArray(m?.topics) && m.topics.includes(p?.topic));
    if (matchedEntries.length === 0) {
      unmatched.push(p);
      continue;
    }
    for (const entry of matchedEntries) {
      const key = uniq((entry.to || []).map((s) => String(s).trim().toLowerCase())).join(',');
      if (!key) continue;
      let group = groups.find((g) => g.key === key);
      if (!group) {
        group = { key, to: uniq(entry.to || []), proposals: [] };
        groups.push(group);
      }
      group.proposals.push(p);
    }
  }

  // Fallback: send unmatched to MAIL_TO if configured
  const fallbackTo = (process.env.MAIL_TO || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (unmatched.length > 0 && fallbackTo.length > 0) {
    groups.push({ key: fallbackTo.join(','), to: uniq(fallbackTo), proposals: unmatched });
  }

  return groups;
}

export async function sendProposalsByConfig({ proposals, transportOptions = {}, mailOptions = {}, dedupe = true }) {
  if (!Array.isArray(proposals) || proposals.length === 0) return { sent: false, reason: 'no_proposals' };

  const toProcess = dedupe ? await filterUnsentProposals(proposals) : proposals;
  if (toProcess.length === 0) return { sent: false, reason: 'already_sent' };

  const groups = resolveRecipientGroups(toProcess);
  if (groups.length === 0) return { sent: false, reason: 'no_recipients' };

  const results = [];
  for (const group of groups) {
    const res = await sendProposalsEmail({
      proposals: group.proposals,
      transportOptions,
      mailOptions: { ...(mailOptions || {}), to: group.to.join(',') },
    });
    results.push({ to: group.to, ...res });
  }
  if (dedupe) {
    const sentIds = toProcess.map((p) => p?.id ?? p?.proposal_id).filter((v) => v !== undefined);
    await markProposalsSent(sentIds);
  }
  return { sent: true, results };
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


