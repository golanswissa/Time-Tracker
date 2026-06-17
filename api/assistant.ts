import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Server-side only. The key lives in the Vercel env var ANTHROPIC_API_KEY and
// never reaches the browser. The frontend posts a message + lightweight context
// here; we ask Claude to turn it into proposed tasks (or a clarifying question)
// and return that JSON for the UI's existing approve-before-apply flow.
const MODEL = 'claude-sonnet-4-6';

const SYSTEM = `You are the task-capture assistant inside a freelance designer's time-tracker.
The user pastes or types notes (often messy, sometimes Hebrew) and you turn them into clean, schedulable tasks.

The app's model:
- Projects belong to clients. You are given the list of projects (id, name, clientId) and clients (id, name) in CONTEXT.
- A task has: a concise English title, an optional projectId (chosen from CONTEXT.projects), a priority (high | normal | low), an optional scheduled day (dateKey, YYYY-MM-DD), and an optional hard deadline (YYYY-MM-DD).

Your job — call the "propose" tool with the result:
- Translate non-English input to a concise English title; keep the original phrasing in "original" only if it wasn't English.
- Map each task to the best-fitting project id from CONTEXT.projects (match on project/client name or obvious topic). If nothing fits, leave projectId empty.
- Infer priority from urgency cues ("asap", "urgent" -> high; default -> normal; "whenever", "low" -> low).
- Dates are relative to CONTEXT.today. "by Friday" sets a deadline; a day mentioned for doing the work sets dateKey. If the user asks to spread several tasks across the week, distribute dateKey across upcoming weekdays (Mon–Fri), most-urgent first.
- Keep titles short and specific. Put extra detail in "description".
- If the request is genuinely too ambiguous to act on, set "clarify" to ONE short question and return an empty tasks array. Otherwise leave clarify empty. Do not ask about things you can reasonably infer.
- "reply" is one short, friendly intro line for the proposed tasks (e.g. "Here you go — 3 tasks across the week:").`;

const SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string', description: 'One short friendly intro line, or empty.' },
    clarify: { type: 'string', description: 'A single short clarifying question if the request is too ambiguous to act on; otherwise empty.' },
    tasks: {
      type: 'array',
      description: 'Proposed tasks. Empty when clarify is set.',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Concise English task title.' },
          original: { type: 'string', description: 'Original phrasing if not English, else empty.' },
          description: { type: 'string', description: 'Optional extra detail, else empty.' },
          projectId: { type: 'string', description: "Best-matching project id from CONTEXT.projects, or empty." },
          priority: { type: 'string', enum: ['high', 'normal', 'low'] },
          dateKey: { type: 'string', description: 'Scheduled day YYYY-MM-DD, or empty.' },
          deadline: { type: 'string', description: 'Hard deadline YYYY-MM-DD, or empty.' },
          reason: { type: 'string', description: 'Short reason for the project guess, or empty.' },
        },
        required: ['title', 'priority'],
      },
    },
  },
  required: ['tasks'],
} as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server.' }); return; }

  try {
    const { message, today, projects = [], clients = [] } = (req.body || {}) as {
      message?: string; today?: string; projects?: unknown; clients?: unknown;
    };
    if (!message || typeof message !== 'string') { res.status(400).json({ error: 'message is required' }); return; }

    const client = new Anthropic({ apiKey });
    const context = JSON.stringify({ today, projects, clients });

    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM,
      tools: [{ name: 'propose', description: 'Return the proposed tasks, or a clarifying question.', input_schema: SCHEMA as unknown as Anthropic.Tool.InputSchema }],
      tool_choice: { type: 'tool', name: 'propose' },
      messages: [{ role: 'user', content: `CONTEXT:\n${context}\n\nMESSAGE:\n${message}` }],
    });

    const toolUse = resp.content.find((b) => b.type === 'tool_use');
    const out = toolUse && toolUse.type === 'tool_use' ? toolUse.input : { tasks: [] };
    res.status(200).json(out);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'assistant error';
    res.status(500).json({ error: msg });
  }
}
