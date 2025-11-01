import axios from 'axios';
import { DEFAULT_QUERY_LIMIT, DEFAULT_TOPICS } from './config.js';

const ICP_BASE_URL = 'https://ic-api.internetcomputer.org/api/v3/proposals';

export const STATUS_OPTIONS = [
  'ADOPTED',
  'EXECUTED',
  'FAILED',
  'OPEN',
  'REJECTED',
  'UNKNOWN',
];

export function computeProposalsResponse(data, query) {
  let parsed = data;
  
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch (_e) {
      return data; // if it isn't valid JSON, return as-is
    }
  }

  const proposalsArray = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.data)
    ? parsed.data
    : null;

  if (!proposalsArray) return parsed;

  const topicsFilter = Array.isArray(query?.include_topic)
    ? query.include_topic
    : query?.include_topic
    ? [query.include_topic]
    : DEFAULT_TOPICS;

  const rawStatuses = Array.isArray(query?.status)
    ? query.status
    : query?.status
    ? [query.status]
    : null;
  const statusesFilter = rawStatuses
    ? rawStatuses
        .map((s) => String(s).trim().toUpperCase())
        .filter((s) => STATUS_OPTIONS.includes(s))
    : null;

  let filtered = proposalsArray.filter((p) => topicsFilter.includes(p?.topic));
  if (statusesFilter) {
    filtered = filtered.filter((p) => statusesFilter.includes(p?.status));
  }

  const sorted = [...filtered].sort((a, b) => {
    const aId = Number(a?.proposal_id ?? a?.id ?? 0);
    const bId = Number(b?.proposal_id ?? b?.id ?? 0);
    return aId - bId; // asc by proposal_id
  });

  if (Array.isArray(parsed)) return sorted;
  return { ...parsed, data: sorted };
}

export async function fetchProposalsWithLatestIndex(queryParams) {
  const url0 = new URL(ICP_BASE_URL);
  url0.searchParams.set('limit', String(DEFAULT_QUERY_LIMIT));
  {
    const topics = Array.isArray(queryParams?.include_topic)
      ? queryParams.include_topic
      : queryParams?.include_topic
      ? [queryParams.include_topic]
      : DEFAULT_TOPICS;
    topics.forEach((t) => url0.searchParams.append('include_topic', t));
  }
  console.log('url0', url0.toString());
  const metaResp = await axios.get(url0.toString(), { timeout: 15000 });
  const maxIndex = metaResp?.data?.max_proposal_index;

  const url = new URL(ICP_BASE_URL);
  if (typeof maxIndex === 'number') {
    url.searchParams.set('max_proposal_index', String(maxIndex));
  }
  if (queryParams?.offset) url.searchParams.set('offset', String(queryParams.offset));
  url.searchParams.set('limit', String(queryParams?.limit || DEFAULT_QUERY_LIMIT));
  {
    const topics = Array.isArray(queryParams?.include_topic)
      ? queryParams.include_topic
      : queryParams?.include_topic
      ? [queryParams.include_topic]
      : DEFAULT_TOPICS;
    topics.forEach((t) => url.searchParams.append('include_topic', t));
  }

  const finalResp = await axios.get(url.toString(), { timeout: 15000 });
  return finalResp.data;
}

export async function getProposals(queryParams) {
  const data = await fetchProposalsWithLatestIndex(queryParams);
  const shaped = computeProposalsResponse(data, queryParams);
  const arr = Array.isArray(shaped)
    ? shaped
    : Array.isArray(shaped?.data)
    ? shaped.data
    : [];
  return arr;
}


