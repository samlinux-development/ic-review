// Configure recipients per topics.
// Each entry defines a set of topics and an array of recipient email addresses.
// Example:
// export const TOPIC_RECIPIENTS = [
//   { topics: ['TOPIC_APPLICATION_CANISTER_MANAGEMENT'], to: ['team-app@example.com'] },
//   { topics: ['TOPIC_PROTOCOL_CANISTER_MANAGEMENT'], to: ['team-proto@example.com', 'ops@example.com'] },
// ];

export const TOPIC_RECIPIENTS = [
  { topics: ['TOPIC_APPLICATION_CANISTER_MANAGEMENT', 'TOPIC_PROTOCOL_CANISTER_MANAGEMENT', 'TOPIC_GOVERNANCE'], 
    to: ['rbole@samlinux.at'] 
  },
];


