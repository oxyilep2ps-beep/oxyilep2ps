import { searchBotKnowledge } from '@/lib/bot-knowledge';
import { fetchDynamicKnowledge, matchDynamicKnowledge } from '@/lib/oliver/dynamic-knowledge';

const GREETING_PATTERNS: { pattern: RegExp; replies: string[] }[] = [
  {
    pattern: /\b(hi|hey|hello|hiya|yo|sup|good\s*(morning|afternoon|evening))\b/i,
    replies: [
      "Hi there! I'm Oliver — your Oxyile guide. How can I help you today?",
      'Hello! Great to see you on Oxyile. Ask me about handshakes, EMIs, or account setup.',
      "Hey! I'm here for P2P lending questions, GoCardless, and smart contracts.",
    ],
  },
  {
    pattern: /\b(how\s*are\s*you|how\s*is\s*your\s*day|how'?s\s*your\s*day|how\s*you\s*doing)\b/i,
    replies: [
      "I'm doing well, thank you — busy helping borrowers and investors! How's your day going?",
      'All systems green on my side! What would you like to know about Oxyile?',
      'Running smoothly — like a good EMI schedule. What can I help with?',
    ],
  },
  {
    pattern: /\b(thanks|thank\s*you|cheers|appreciate)\b/i,
    replies: [
      "You're welcome! Anything else about Oxyile?",
      'Happy to help — that is what I am here for.',
    ],
  },
  {
    pattern: /\b(bye|goodbye|see\s*you|later)\b/i,
    replies: [
      'Goodbye! Come back anytime you need help with Oxyile.',
      "Take care — I'll be here when you need me.",
    ],
  },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const OLIVER_FALLBACK_MARKDOWN =
  "I'm still learning! For complex queries, please [Contact Support](/contact) or [Raise a Complaint](/raise-complaint).";

export async function parseOliverReply(userText: string): Promise<string> {
  const trimmed = userText.trim();
  if (!trimmed) {
    return 'Type a question about Oxyile — handshakes, payments, KYC, or security.';
  }

  for (const { pattern, replies } of GREETING_PATTERNS) {
    if (pattern.test(trimmed)) {
      return pick(replies);
    }
  }

  const dynamicEntries = await fetchDynamicKnowledge();
  const dynamic = matchDynamicKnowledge(trimmed, dynamicEntries);
  if (dynamic) return dynamic;

  const knowledge = searchBotKnowledge(trimmed);
  if (knowledge) return knowledge;

  return OLIVER_FALLBACK_MARKDOWN;
}
