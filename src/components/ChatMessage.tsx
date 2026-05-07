import { Bot, User } from 'lucide-react';
import type { Message } from '../lib/types';

interface Props {
  message: Message;
}

/** Lightweight markdown → React elements (no external deps) */
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Fenced code block ```
    if (line.trimStart().startsWith('```')) {
      const fence = line.trimStart().slice(3).trim(); // language hint
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <pre key={i} className="bg-slate-900 text-slate-100 rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono whitespace-pre">
          {fence && <span className="text-slate-400 text-[10px] block mb-1">{fence}</span>}
          {codeLines.join('\n')}
        </pre>
      );
      i++;
      continue;
    }

    // ── Heading #
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const cls = level === 1
        ? 'text-base font-bold mt-3 mb-1'
        : level === 2
          ? 'text-sm font-bold mt-2 mb-1'
          : 'text-sm font-semibold mt-1';
      nodes.push(<p key={i} className={cls}>{inlineMarkdown(headingMatch[2])}</p>);
      i++;
      continue;
    }

    // ── Horizontal rule ---
    if (/^[-*_]{3,}$/.test(line.trim())) {
      nodes.push(<hr key={i} className="border-slate-200 my-2" />);
      i++;
      continue;
    }

    // ── Table (lines that start and end with |)
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableRows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i].trim().slice(1, -1).split('|').map(c => c.trim());
        // skip separator rows like |---|---|
        if (!cells.every(c => /^[-: ]+$/.test(c))) {
          tableRows.push(cells);
        }
        i++;
      }
      if (tableRows.length > 0) {
        const [header, ...body] = tableRows;
        nodes.push(
          <div key={i} className="overflow-x-auto my-2">
            <table className="text-xs border-collapse w-full">
              <thead>
                <tr className="bg-slate-100">
                  {header.map((cell, ci) => (
                    <th key={ci} className="border border-slate-300 px-2 py-1 text-left font-semibold">
                      {inlineMarkdown(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? '' : 'bg-slate-50'}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="border border-slate-300 px-2 py-1">
                        {inlineMarkdown(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // ── Unordered list bullet (-, *, •)
    if (/^(\s*)([-*•])\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^(\s*)([-*•])\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^(\s*)([-*•])\s+/, ''));
        i++;
      }
      nodes.push(
        <ul key={i} className="list-disc list-outside pl-5 my-1 space-y-0.5">
          {listItems.map((item, li) => (
            <li key={li} className="text-sm">{inlineMarkdown(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // ── Ordered list 1. 2. …
    if (/^\d+\.\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      nodes.push(
        <ol key={i} className="list-decimal list-outside pl-5 my-1 space-y-0.5">
          {listItems.map((item, li) => (
            <li key={li} className="text-sm">{inlineMarkdown(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // ── Blockquote >
    if (line.startsWith('> ')) {
      nodes.push(
        <blockquote key={i} className="border-l-4 border-teal-400 pl-3 italic text-slate-500 my-1 text-sm">
          {inlineMarkdown(line.slice(2))}
        </blockquote>
      );
      i++;
      continue;
    }

    // ── Empty line → spacer
    if (line.trim() === '') {
      nodes.push(<div key={i} className="h-1" />);
      i++;
      continue;
    }

    // ── Normal paragraph
    nodes.push(
      <p key={i} className="text-sm leading-relaxed">
        {inlineMarkdown(line)}
      </p>
    );
    i++;
  }

  return nodes;
}

/** Handle inline: bold, italic, inline-code, links */
function inlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  // Patterns: **bold**, *italic*, `code`, [label](url)
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));

    if (match[2]) {
      parts.push(<strong key={match.index} className="font-semibold">{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={match.index}>{match[3]}</em>);
    } else if (match[4]) {
      parts.push(
        <code key={match.index} className="bg-slate-100 text-teal-700 rounded px-1 py-0.5 text-xs font-mono">
          {match[4]}
        </code>
      );
    } else if (match[5] && match[6]) {
      parts.push(
        <a key={match.index} href={match[6]} target="_blank" rel="noopener noreferrer"
          className="text-teal-600 underline hover:text-teal-800">
          {match[5]}
        </a>
      );
    }

    last = match.index + match[0].length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 ? parts[0] : parts;
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
        }`}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-teal-600 text-white rounded-tr-sm'
            : 'bg-white text-slate-700 border border-slate-200 rounded-tl-sm shadow-sm'
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <div className="prose-sm max-w-none">{renderMarkdown(message.content)}</div>
        )}

        <div className={`text-[10px] mt-1.5 ${isUser ? 'text-teal-200' : 'text-slate-400'}`}>
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
