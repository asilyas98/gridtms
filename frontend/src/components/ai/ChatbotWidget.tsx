import React from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { backendFetch } from '../../lib/backendApi';
import { demoAiAnswer } from '../../lib/demoAi';

type ChatMessage = {
  role: 'user' | 'assistant';
  text: string;
};

export default function ChatbotWidget() {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    { role: 'assistant', text: 'Ask me about customer data, loads, dispatch, invoices, settlements, compliance, or revenue.' },
  ]);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = input.trim();
    if (!message) return;

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
      setMessages((prev) => [...prev, { role: 'assistant', text: isBackendOffline ? demoAiAnswer(message, true) : (err.message || 'Chatbot request failed.') }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[80] flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-white shadow-2xl hover:bg-orange-600"
        title="Open GridTMS AI"
      >
        <MessageCircle size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[80] w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-[#111113]">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-950 px-4 py-3 text-white dark:border-zinc-800">
        <div>
          <div className="text-sm font-black">GridTMS AI</div>
          <div className="text-[11px] text-slate-300">Data-aware backend chatbot</div>
        </div>
        <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-white/10">
          <X size={18} />
        </button>
      </div>

      <div className="max-h-[420px] space-y-3 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div key={index} className={`rounded-2xl px-3 py-2 text-sm leading-6 ${message.role === 'user' ? 'ml-8 bg-orange-500 text-white' : 'mr-8 bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-zinc-100'}`}>
            {message.text}
          </div>
        ))}
        {loading && <div className="mr-8 rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-500 dark:bg-zinc-800">Thinking...</div>}
      </div>

      <form onSubmit={sendMessage} className="flex gap-2 border-t border-slate-200 p-3 dark:border-zinc-800">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask GridTMS AI..."
          className="ai-chat-input min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-orange-400 dark:border-zinc-800 dark:bg-black dark:text-white dark:placeholder:text-zinc-500"
        />
        <button className="rounded-xl bg-orange-500 px-3 text-white hover:bg-orange-600" type="submit">
          <Send size={17} />
        </button>
      </form>
    </div>
  );
}
