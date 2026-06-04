import { type UserSettings } from '../context/UserSettingsContext';
import { type StageInfo, formatINR } from './financialCalc';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const DEFAULT_MODEL = 'llama-3.1-8b-instant';

export interface CoachMsg {
  role: 'user' | 'assistant';
  text: string;
}

export function buildContext(
  settings: UserSettings,
  stages: StageInfo[],
  corpus: number
): string {
  const crossover = stages.find((s) => s.label === 'Crossover');
  const crore = stages.find((s) => s.label === '₹1 Crore');
  const currentYear = new Date().getFullYear();
  const sorted = [...settings.phases].sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  const currentSIP = sorted[0]?.monthlyAmount ?? 0;

  return [
    `current corpus ${formatINR(corpus)}`,
    `monthly SIP ${formatINR(currentSIP)}`,
    `projected XIRR ${(settings.projectedXIRR * 100).toFixed(1)}%`,
    `investor age ${currentYear - settings.birthYear}`,
    crossover ? `SIP crossover in ${crossover.date.getFullYear()} at age ${crossover.age} (annual returns exceed annual SIP contributions)` : '',
    crore ? `₹1 Crore milestone in ${crore.date.getFullYear()} at age ${crore.age}` : '',
  ].filter(Boolean).join(', ');
}

export async function queryCoach(
  question: string,
  context: string,
  groqKey: string,
  model = DEFAULT_MODEL
): Promise<string> {
  const resp = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a concise SIP (Systematic Investment Plan) financial advisor in India. The user's portfolio: ${context}. Answer in 2–3 sentences using specific numbers from their portfolio. Be direct and actionable.`,
        },
        { role: 'user', content: question },
      ],
      max_tokens: 220,
      temperature: 0.35,
    }),
  });

  if (!resp.ok) {
    let msg = `HTTP ${resp.status}`;
    try {
      const err = await resp.json() as { error?: { message?: string } };
      msg = err.error?.message ?? msg;
    } catch { /* ignore */ }
    if (resp.status === 401) throw new Error('Invalid Groq API key — check VITE_GROQ_KEY in .env.local');
    if (resp.status === 429) throw new Error('Rate limited — wait a moment and try again');
    throw new Error(msg);
  }

  const data = await resp.json() as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content?.trim() ?? 'No response. Try rephrasing.';
}
