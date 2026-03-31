import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Shield, AlertTriangle, CheckCircle, Activity, Globe } from 'lucide-react';

const API_BASE = "http://localhost:8000/api";

type AuditResult = {
    overall_score: number;
    risk_level: string;
    executive_summary: string;
    action_items: Array<{priority: number, category: string, issue: string, fix: string, estimated_impact: string}>;
    eeat: any;
    technical: any;
    content_patterns: any;
};

type JobStatus = {
    id: string;
    url: string;
    status: string;
    result: AuditResult | null;
};

export default function App() {
    const [url, setUrl] = useState("");
    const [activeJobId, setActiveJobId] = useState<string | null>(null);

    const startAudit = useMutation({
        mutationFn: async (targetUrl: string) => {
            const res = await fetch(`${API_BASE}/audit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: targetUrl })
            });
            if (!res.ok) throw new Error("Failed to start audit");
            return res.json();
        },
        onSuccess: (data) => {
            setActiveJobId(data.job_id);
        }
    });

    const { data: jobStatus, refetch } = useQuery<JobStatus>({
        queryKey: ['auditJob', activeJobId],
        queryFn: async () => {
            if (!activeJobId) return null;
            const res = await fetch(`${API_BASE}/audit/${activeJobId}`);
            if (!res.ok) throw new Error("Failed to fetch job");
            return res.json();
        },
        enabled: !!activeJobId,
        refetchInterval: (query) => {
             const status = query.state.data?.status;
             return (status === 'complete' || status === 'failed') ? false : 2000;
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (url) startAudit.mutate(url);
    };

    return (
        <div className="min-h-screen p-8 max-w-7xl mx-auto flex flex-col gap-8">
            <header className="flex flex-col items-center gap-4 text-center">
                 <Shield className="w-16 h-16 text-primary" />
                 <h1 className="text-4xl font-black tracking-tight">Anti-BS <span className="text-primary">SEO Auditor</span></h1>
                 <p className="text-slate-400 max-w-xl">Deep structural analysis using Antigravity multi-agent intelligence to detect technical SEO flaws, E-E-A-T gaps, and AI-generated content footprints.</p>
            </header>

            <form onSubmit={handleSubmit} className="flex gap-4 w-full max-w-3xl mx-auto glass-panel p-2 rounded-full shadow-2xl shadow-indigo-500/10">
                <div className="relative flex-1 flex items-center">
                    <Globe className="absolute left-4 w-5 h-5 text-slate-500" />
                    <input 
                        type="url" 
                        required 
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com" 
                        className="w-full bg-transparent border-none outline-none py-4 pl-12 pr-4 text-lg placeholder:text-slate-600"
                    />
                </div>
                <button 
                    type="submit" 
                    disabled={startAudit.isPending}
                    className="bg-primary hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-full transition-all disabled:opacity-50"
                >
                    {startAudit.isPending ? "Starting..." : "Run Deep Audit"}
                </button>
            </form>

            {jobStatus && (
                <div className="mt-8 flex flex-col gap-8 animate-in fade-in duration-500">
                    <div className="glass-panel rounded-2xl p-8 flex items-center justify-between">
                        <div className="flex flex-col gap-2">
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                {jobStatus.status === 'complete' ? <CheckCircle className="text-emerald-500" /> : <Activity className="text-primary animate-pulse" />}
                                Audit Status: <span className="capitalize">{jobStatus.status}</span>
                            </h2>
                            <p className="text-slate-400 font-mono text-sm">{jobStatus.url} • {jobStatus.id}</p>
                        </div>
                    </div>

                    {jobStatus.status === 'complete' && jobStatus.result && (
                        <Dashboard result={jobStatus.result} />
                    )}
                </div>
            )}
        </div>
    );
}

function Dashboard({ result }: { result: AuditResult }) {
    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-emerald-500";
        if (score >= 60) return "text-amber-500";
        return "text-rose-500";
    };

    return (
        <div className="flex flex-col gap-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="glass-panel p-8 rounded-2xl flex flex-col items-center justify-center text-center gap-4">
                     <span className="text-slate-400 font-semibold uppercase tracking-wider">Overall Score</span>
                     <div className={`text-7xl font-black ${getScoreColor(result.overall_score)}`}>
                         {result.overall_score}
                     </div>
                </div>
                <div className="glass-panel p-8 rounded-2xl md:col-span-2 flex flex-col gap-4">
                     <span className="text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-2">
                         <AlertTriangle className={result.risk_level === 'High' ? 'text-rose-500' : 'text-amber-500'} /> 
                         Executive Summary
                     </span>
                     <p className="text-lg leading-relaxed">{result.executive_summary}</p>
                </div>
            </div>

            <div className="glass-panel rounded-2xl p-8">
                <h3 className="text-xl font-bold mb-6 border-b border-slate-800 pb-4">Prioritized Action Items</h3>
                <div className="flex flex-col gap-4">
                     {result.action_items?.map((item, i) => (
                         <div key={i} className="flex flex-col md:flex-row gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800/50">
                             <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold shrink-0">
                                 {item.priority}
                             </div>
                             <div className="flex flex-col gap-2 flex-1">
                                 <div className="flex items-center gap-3">
                                     <span className="text-xs font-bold uppercase tracking-wider bg-slate-800 px-2 py-1 rounded text-slate-300">{item.category}</span>
                                     <span className="text-sm text-slate-400">Impact: <span className="font-semibold text-white">{item.estimated_impact}</span></span>
                                 </div>
                                 <h4 className="font-bold text-lg">{item.issue}</h4>
                                 <pre className="bg-black/50 p-4 rounded-lg font-mono text-sm overflow-x-auto border border-slate-800 text-emerald-400">
                                     {item.fix}
                                 </pre>
                             </div>
                         </div>
                     ))}
                </div>
            </div>
        </div>
    );
}
