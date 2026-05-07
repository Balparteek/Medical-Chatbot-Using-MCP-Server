import { MessageSquarePlus, Trash2, Stethoscope, Info } from 'lucide-react';
import type { Session } from '../lib/types';

interface Props {
  sessions: Session[];
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onAbout: () => void;
}

export default function Sidebar({ sessions, activeSessionId, onSelect, onNew, onDelete, onAbout }: Props) {
  return (
    <aside className="w-72 bg-slate-900 text-white flex flex-col h-full">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-lg bg-teal-500 flex items-center justify-center">
            <Stethoscope size={20} />
          </div>
          <div>
            <h1 className="font-semibold text-base leading-tight">MedAssist AI</h1>
            <p className="text-[11px] text-slate-400">Healthcare Chatbot</p>
          </div>
        </div>
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
        >
          <MessageSquarePlus size={16} />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {sessions.length === 0 && (
          <p className="text-center text-slate-500 text-xs py-8">No conversations yet</p>
        )}
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`group flex items-center gap-2 rounded-lg px-3 py-2.5 mb-1 cursor-pointer transition-all ${
              session.id === activeSessionId
                ? 'bg-slate-700/80 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
            onClick={() => onSelect(session.id)}
          >
            <span className="flex-1 text-sm truncate">{session.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(session.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all p-1"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-700 space-y-3">
        <button
          onClick={onAbout}
          className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all"
        >
          <Info size={16} />
          About this Project
        </button>
        <p className="text-[10px] text-slate-500 text-center leading-relaxed">
          This AI provides general information only.<br />
          Not a substitute for professional medical advice.
        </p>
      </div>
    </aside>
  );
}
