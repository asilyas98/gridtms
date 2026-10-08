import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

const components: Components = {
  h1: ({ children }) => <h1 className="mb-3 mt-1 text-xl font-black tracking-tight">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 mt-4 text-lg font-black tracking-tight first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 mt-3 text-base font-extrabold first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-extrabold text-slate-950 dark:text-white">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5 marker:text-orange-500">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-2 pl-5 marker:font-bold marker:text-orange-500">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-4 border-orange-400 bg-white/60 py-2 pl-3 pr-2 italic text-slate-600 dark:bg-black/20 dark:text-zinc-300">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-slate-300 dark:border-zinc-600" />,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-bold text-orange-600 underline decoration-orange-300 underline-offset-2 hover:text-orange-700 dark:text-orange-300"
    >
      {children}
    </a>
  ),
  code: ({ children, className }) => (
    <code className={`${className ?? ''} rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[0.9em] text-rose-700 dark:bg-zinc-950 dark:text-rose-300`}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-100 [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-inherit">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-xl border border-slate-300 dark:border-zinc-600">
      <table className="w-full border-collapse text-left text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-200/80 dark:bg-zinc-950">{children}</thead>,
  th: ({ children }) => <th className="border-b border-slate-300 px-3 py-2 font-extrabold dark:border-zinc-600">{children}</th>,
  td: ({ children }) => <td className="border-b border-slate-200 px-3 py-2 align-top last:border-b-0 dark:border-zinc-700">{children}</td>,
};

type FormattedMessageProps = {
  content: string;
};

export default function FormattedMessage({ content }: FormattedMessageProps) {
  return (
    <div className="min-w-0 break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
