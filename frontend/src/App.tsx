import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Shield, AlertTriangle, CheckCircle, Activity, Globe } from 'lucide-react';

const SERVICE_ENDPOINT = "http://localhost:8000/api";

type ScanFindings = {
    overall_score: number;
    risk_level: string;
    executive_summary: string;
    action_items: Array<{priority: number, category: string, issue: string, fix: string, estimated_impact: string}>;
    eeat: any;
    technical: any;
    content_patterns: any;
};

type AnalysisSession = {
    id: string;
    url: string;
    status: string;
    result: ScanFindings | null;
};

export default function App() {
    const [targetUrl, setTargetUrl] = useState("");
    const [runningSessionToken, setRunningSessionToken] = useState<string | null>(null);

    const triggerDeepScan = useMutation({
        mutationFn: async (urlToHit: string) => {
            const req = await fetch(`${SERVICE_ENDPOINT}/audit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: urlToHit })
            });
            if (!req.ok) throw new Error("Connection dropped. The target might be blocking us.");
            return req.json();
        },
        onSuccess: (data) => {
            setRunningSessionToken(data.job_id);
        }
    });

    const { data: currentSession } = useQuery<AnalysisSession>({
        queryKey: ['activeScan', runningSessionToken],
        queryFn: async () => {
            if (!runningSessionToken) return null;
            const req = await fetch(`${SERVICE_ENDPOINT}/audit/${runningSessionToken}`);
            // if it drops, handle gracefully
            if (!req.ok) throw new Error("Session disconnected.");
            return req.json();
        },
        enabled: !!runningSessionToken,
        refetchInterval: (query) => {
             const state = query.state.data?.status;
             return (state === 'complete' || state === 'failed') ? false : 2000;
        }
    });

    const runAnalysis = (e: React.FormEvent) => {
        e.preventDefault();
        if (targetUrl) triggerDeepScan.mutate(targetUrl);
    };

    return (
        <main className="min-h-screen p-8 max-w-7xl mx-auto flex flex-col gap-8">
            <Helmet>
                <title>Anti-BS SEO Auditor | Expose The Flaws</title>
                <meta name="description" content="We built this engine because manual site auditing is completely dead. Find your real technical flaws and E-E-A-T gaps." />
            </Helmet>

            <header className="flex flex-col items-center gap-4 text-center">
                 <Shield className="w-16 h-16 text-primary" />
                 <h1 className="text-4xl font-black tracking-tight" id="main-heading">
                     Anti-BS <span className="text-primary">SEO Auditor</span>
                 </h1>
                 <p className="text-slate-400 max-w-xl">
                     Manual SEO sweeps are entirely dead. Nobody has time for that. Drop a link below so our agents can aggressively rip through the structure. You get technical truths, E-E-A-T gaps, and AI footprints that standard scanners blind-spot.
                 </p>
            </header>

            <section aria-labelledby="main-heading">
                <form onSubmit={runAnalysis} className="flex gap-4 w-full max-w-3xl mx-auto glass-panel p-2 rounded-full shadow-2xl shadow-indigo-500/10">
                    <div className="relative flex-1 flex items-center">
                        <label htmlFor="target-url" className="sr-only">Target Website URL</label>
                        <Globe aria-hidden="true" className="absolute left-4 w-5 h-5 text-slate-500" />
                        <input 
                            id="target-url"
                            type="url" 
                            required 
                            value={targetUrl}
                            onChange={(e) => setTargetUrl(e.target.value)}
                            placeholder="https://example.com" 
                            className="w-full bg-transparent border-none outline-none py-4 pl-12 pr-4 text-lg placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 rounded-full"
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={triggerDeepScan.isPending}
                        className="bg-primary hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-full transition-all disabled:opacity-50"
                        aria-live="polite"
                    >
                        {triggerDeepScan.isPending ? "Connecting..." : "Blast It"}
                    </button>
                </form>
            </section>

            {currentSession && (
                <article className="mt-8 flex flex-col gap-8 animate-in fade-in duration-500 border-t border-slate-800/50 pt-8">
                    <header className="glass-panel rounded-2xl p-8 flex items-center justify-between shadow-sm">
                        <div className="flex flex-col gap-2">
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                {currentSession.status === 'complete' ? <CheckCircle aria-hidden="true" className="text-emerald-500" /> : <Activity aria-hidden="true" className="text-primary animate-pulse" />}
                                Scan Status: <span className="capitalize">{currentSession.status}</span>
                            </h2>
                            <p className="text-slate-400 font-mono text-sm">{currentSession.url} • Session Token: {currentSession.id}</p>
                        </div>
                    </header>

                    {currentSession.status === 'complete' && currentSession.result && (
                        <FindingsReport payload={currentSession.result} />
                    )}
                </article>
            )}
        </main>
    );
}

function FindingsReport({ payload }: { payload: ScanFindings }) {
    const calculateSeverity = (score: number) => {
        // somewhat brutal logic 
        if (score >= 80) return "text-emerald-500";
        if (score >= 60) return "text-amber-500";
        return "text-rose-500";
    };

    return (
        <section className="flex flex-col gap-8" aria-label="Analysis Results">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="glass-panel p-8 rounded-2xl flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden group">
                     <span className="text-slate-400 font-semibold uppercase tracking-wider text-xs">Final Grade</span>
                     <div className={`text-8xl font-black tracking-tighter ${calculateSeverity(payload.overall_score)} transition-transform group-hover:scale-110`}>
                         {payload.overall_score}
                     </div>
                </div>
                
                <article className="glass-panel p-8 rounded-2xl md:col-span-2 flex flex-col gap-4">
                     <h3 className="text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-2 text-xs">
                         <AlertTriangle aria-hidden="true" className={payload.risk_level === 'High' ? 'text-rose-500' : 'text-amber-500'} /> 
                         The Breakdown
                     </h3>
                     <p className="text-lg leading-relaxed text-slate-200">
                        {payload.executive_summary}
                     </p>
                </article>
            </div>

            <section className="glass-panel rounded-2xl p-8 shadow-xl">
                <h3 className="text-2xl font-bold mb-6 border-b border-slate-800/80 pb-4">Critical Fixes (Do These Now)</h3>
                <div className="flex flex-col gap-5">
                     {payload.action_items?.map((task, idx) => (
                         <div key={idx} className="flex flex-col md:flex-row gap-5 p-5 rounded-xl bg-slate-900/40 hover:bg-slate-900/70 transition-colors border border-slate-800/60 shadow-inner">
                             <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-900/30 text-indigo-400 font-black shrink-0 border border-indigo-500/20">
                                 {task.priority}
                             </div>
                             
                             <div className="flex flex-col gap-3 flex-1">
                                 <header className="flex items-center gap-3">
                                     <span className="text-xs font-bold uppercase tracking-widest bg-slate-950 px-3 py-1.5 rounded text-slate-300 shadow-sm border border-slate-800">{task.category}</span>
                                     <span className="text-sm text-slate-500 font-medium">Impact <span className="text-slate-200">{task.estimated_impact}</span></span>
                                 </header>
                                 <h4 className="font-bold text-xl text-slate-100">{task.issue}</h4>
                                 <figure className="m-0 mt-2 rounded-xl overflow-hidden shadow-2xl border border-slate-800/50">
                                     <figcaption className="sr-only">Recommended Fix Snippet</figcaption>
                                     <pre className="bg-black/80 p-5 font-mono text-sm overflow-x-auto text-emerald-400/90 leading-relaxed">
                                         {task.fix}
                                     </pre>
                                 </figure>
                             </div>
                         </div>
                     ))}
                </div>
            </section>
        </section>
    );
}
