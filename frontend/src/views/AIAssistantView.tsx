import React from 'react';
import { Bot, Database, Send, Sparkles } from 'lucide-react';
import { backendFetch } from '../lib/backendApi';
import { demoAiAnswer } from '../lib/demoAi';

type ChatMessage = {
  role: 'user' | 'assistant';
  text: string;
};

const starterQuestions = [
  'Who are my top customers?',
  'Show customer data for Target Corp',
  'Which loads are ready for invoicing?',
  'Summarize open invoices and revenue',
  'What compliance items need attention?',
];

export default function AIAssistantView() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: 'I can answer questions using your protected GridTMS customer, load, invoice, location, settlement, and compliance data. Ask me about a customer, a load, revenue, open invoices, dispatch, or compliance.',
    },
  ]);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const send = async (messageOverride?: string) => {
    const message = (messageOverride ?? input).trim();
    if (!message || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: message }]);
    setLoading(true);

    try {
      const result = await backendFetch('/chat', {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
      setMessages((prev) => [...prev, { role: 'assistant', text: result.answer || 'No answer returned.' }]);
    } catch (err: any) {
      const isBackendOffline = String(err?.message || '').toLowerCase().includes('backend offline') || String(err?.message || '').toLowerCase().includes('failed to fetch');
      setMessages((prev) => [...prev, { role: 'assistant', text: isBackendOffline ? demoAiAnswer(message, true) : (err.message || 'AI request failed.') }]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    send();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-widest text-orange-600 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-300">
            <Sparkles size={14} /> AI Assistance
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">GridTMS AI Assistant</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-zinc-400">
            Ask operational questions backed by your Supabase data. The backend checks your verified business session first, then gives the chatbot customer/load/invoice context for your company only.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-zinc-800 dark:bg-[#111113]">
          <div className="flex items-center gap-2 font-black text-slate-900 dark:text-white"><Database size={17} /> Data-aware mode</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-zinc-400">Customers • Loads • Invoices • Locations • Settlements</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-h-[620px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-[#111113]">
          <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-950 px-5 py-4 text-white dark:border-zinc-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500"><Bot size={22} /></div>
            <div>
              <div className="font-black">GridTMS AI</div>
              <div className="text-xs text-slate-300">Ask questions about customer and operational data</div>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] whitespace-pre-wrap rounded-3xl px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-zinc-100'}`}>
                  {message.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="max-w-[82%] rounded-3xl bg-slate-100 px-4 py-3 text-sm text-slate-500 dark:bg-zinc-800 dark:text-zinc-300">
                Thinking through your GridTMS data...
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="flex gap-3 border-t border-slate-200 p-4 dark:border-zinc-800">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a customer, load, invoice, settlement, or compliance item..."
              className="ai-chat-input min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-orange-400 dark:border-zinc-800 dark:bg-black dark:text-white dark:placeholder:text-zinc-500"
            />
            <button disabled={loading} className="rounded-2xl bg-orange-500 px-5 text-white hover:bg-orange-600 disabled:opacity-60" type="submit">
              <Send size={18} />
            </button>
          </form>
        </div>

        <aside className="space-y-3 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-[#111113]">
          <div className="text-sm font-black text-slate-950 dark:text-white">Try asking</div>
          {starterQuestions.map((question) => (
            <button
              key={question}
              onClick={() => send(question)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-orange-950/20"
            >
              {question}
            </button>
          ))}
        </aside>
      </div>
    </div>
  );
}
