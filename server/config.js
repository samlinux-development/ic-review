// Configure recipients per topics.
// Each entry defines a set of topics and an array of recipient email addresses.
// Example:
// export const TOPIC_RECIPIENTS = [
//   { topics: ['TOPIC_APPLICATION_CANISTER_MANAGEMENT'], to: ['team-app@example.com'] },
//   { topics: ['TOPIC_PROTOCOL_CANISTER_MANAGEMENT'], to: ['team-proto@example.com', 'ops@example.com'] },
// ];

export const TOPIC_RECIPIENTS = [
  { topics: ['TOPIC_APPLICATION_CANISTER_MANAGEMENT'], 
    to: ['rbole@samlinux.at'] 
  },
];

// Extract all unique topics from TOPIC_RECIPIENTS
export const DEFAULT_TOPICS = [
  ...new Set(
    TOPIC_RECIPIENTS.flatMap((entry) => entry?.topics || [])
  )
];

export const DEFAULT_QUERY_LIMIT = 50;


