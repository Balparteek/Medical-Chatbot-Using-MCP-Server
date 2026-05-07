import { useState } from 'react';
import {
  ArrowLeft,
  Pill,
  BookOpen,
  ShieldCheck,
  Globe,
  AlertTriangle,
  Cpu,
  Server,
  ArrowRightLeft,
  Stethoscope,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ToolCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  bgColor: string;
}

function ToolCard({ icon, title, description, color, bgColor }: ToolCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white overflow-hidden transition-all hover:shadow-md ${
        expanded ? 'shadow-md' : ''
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-semibold ${color}`}>{title}</h4>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-0">
          <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
        </div>
      )}
    </div>
  );
}

interface Props {
  onBack: () => void;
}

export default function AboutPage({ onBack }: Props) {
  const tools: ToolCardProps[] = [
    {
      icon: <Pill size={20} className="text-teal-600" />,
      title: 'Drug Information Search',
      description:
        'Retrieves detailed drug data including dosage, indications, contraindications, pharmacokinetics, and manufacturer information. Queries real pharmaceutical databases to provide accurate, up-to-date medication details.',
      color: 'text-teal-700',
      bgColor: 'bg-teal-50',
    },
    {
      icon: <BookOpen size={20} className="text-amber-600" />,
      title: 'PubMed Research',
      description:
        'Searches peer-reviewed medical literature from the PubMed database. Retrieves abstracts, study summaries, and citation data from published clinical research papers to support evidence-based responses.',
      color: 'text-amber-700',
      bgColor: 'bg-amber-50',
    },
    {
      icon: <ShieldCheck size={20} className="text-sky-600" />,
      title: 'FDA Drug Database',
      description:
        'Looks up FDA-approved drugs, safety alerts, black box warnings, and regulatory information. Provides access to official FDA labeling, approval histories, and post-market surveillance data.',
      color: 'text-sky-700',
      bgColor: 'bg-sky-50',
    },
    {
      icon: <Globe size={20} className="text-emerald-600" />,
      title: 'WHO Guidelines',
      description:
        'References WHO clinical guidelines, health statistics, and global health recommendations. Accesses standardized treatment protocols and public health guidance from the World Health Organization.',
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
    },
    {
      icon: <AlertTriangle size={20} className="text-rose-600" />,
      title: 'Drug Interactions',
      description:
        'Checks for known interactions between multiple medications. Identifies contraindicated combinations, severity levels, and clinical significance of drug-drug, drug-food, and drug-disease interactions.',
      color: 'text-rose-700',
      bgColor: 'bg-rose-50',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-8 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Chat
        </button>

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-5">
            <Stethoscope size={40} className="text-teal-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">MedAssist AI</h1>
          <p className="text-slate-500 text-base">
            AI-Powered Medical Assistant with MCP Architecture
          </p>
        </div>

        {/* Project Info Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 mb-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0">
              <Cpu size={24} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Major Project
              </p>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">
                B.E. Software Engineering
              </h2>
              <p className="text-sm text-slate-600 mb-3">
                AI-Powered Medical Assistant with MCP Architecture
              </p>
              <p className="text-sm text-slate-500">
                Developed by <span className="font-semibold text-slate-700">Balparteek Singh</span>
              </p>
            </div>
          </div>
        </div>

        {/* What is MCP */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">What is MCP?</h2>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              <span className="font-semibold text-slate-800">Model Context Protocol (MCP)</span> is
              an open standard that allows AI language models to securely connect to external tools
              and data sources through a standardized interface.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              In this project, MCP enables the LangGraph agent to selectively call real medical
              databases — only when the user's question genuinely requires factual data. Simple
              conversational messages like "hello" or "thank you" are answered directly by the LLM
              without any tool invocation, keeping responses fast and efficient.
            </p>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                The <span className="font-semibold text-slate-700">medical-mcp server</span>{' '}
                (Node.js) runs as a subprocess managed by FastAPI, connected via{' '}
                <span className="font-semibold text-slate-700">stdio transport</span>. It stays
                alive for the entire server lifetime, eliminating connection overhead on each
                request.
              </p>
            </div>
          </div>
        </div>

        {/* Architecture Diagram */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Architecture</h2>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center gap-4">
              {/* User */}
              <div className="flex items-center gap-3 rounded-xl bg-teal-50 border border-teal-100 px-5 py-3">
                <Stethoscope size={18} className="text-teal-600" />
                <span className="text-sm font-medium text-teal-800">User (React Frontend)</span>
              </div>

              <ArrowRightLeft size={18} className="text-slate-300 rotate-90" />

              {/* FastAPI */}
              <div className="flex items-center gap-3 rounded-xl bg-slate-100 border border-slate-200 px-5 py-3">
                <Server size={18} className="text-slate-600" />
                <span className="text-sm font-medium text-slate-700">
                  FastAPI + LangGraph Agent
                </span>
              </div>

              <ArrowRightLeft size={18} className="text-slate-300 rotate-90" />

              {/* MCP Server */}
              <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-100 px-5 py-3">
                <Cpu size={18} className="text-amber-600" />
                <span className="text-sm font-medium text-amber-800">
                  Medical MCP Server (Node.js / stdio)
                </span>
              </div>

              <ArrowRightLeft size={18} className="text-slate-300 rotate-90" />

              {/* External APIs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-md">
                {['PubMed', 'FDA', 'WHO', 'Drug DB', 'RxNorm', 'Interactions'].map((name) => (
                  <div
                    key={name}
                    className="flex items-center justify-center rounded-lg bg-slate-50 border border-slate-100 px-3 py-2"
                  >
                    <span className="text-xs font-medium text-slate-600">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Available MCP Tools */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Available MCP Tools</h2>
          <div className="space-y-3">
            {tools.map((tool) => (
              <ToolCard key={tool.title} {...tool} />
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Tech Stack</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Frontend', value: 'React + TypeScript + Vite' },
              { label: 'Styling', value: 'Tailwind CSS' },
              { label: 'Backend', value: 'FastAPI (Python)' },
              { label: 'Agent', value: 'LangGraph + LLM' },
              { label: 'MCP Server', value: 'Node.js (stdio transport)' },
              { label: 'Database', value: 'Supabase (PostgreSQL)' },
              { label: 'Protocol', value: 'Model Context Protocol (MCP)' },
              { label: 'Auth', value: 'Supabase Auth + RLS' },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-center justify-between"
              >
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  {label}
                </span>
                <span className="text-sm font-semibold text-slate-700">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 mb-8">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-amber-800 mb-1">Medical Disclaimer</h3>
              <p className="text-xs text-amber-700 leading-relaxed">
                MedAssist AI provides general health information for educational purposes only. It
                is not a substitute for professional medical advice, diagnosis, or treatment. Always
                consult a qualified healthcare provider for medical conditions. In case of
                emergency, call your local emergency services immediately.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pb-8">
          <p className="text-xs text-slate-400">
            MedAssist AI &middot; Major Project &middot; B.E. Software Engineering
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Built with MCP Architecture &middot; Developed by Balparteek Singh
          </p>
        </div>
      </div>
    </div>
  );
}
