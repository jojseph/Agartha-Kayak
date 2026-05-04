'use client';

export default function VaultTestPage() {
    return (
        <main className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-6 animate-in zoom-in-95 fade-in duration-700">
            
            {/* Glowing Kayak Emoji */}
            <div className="text-8xl drop-shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-bounce">
            🚣‍♂️
            </div>

            <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 tracking-tight flex flex-col md:flex-row items-center justify-center gap-4">
            <span>Kayak ta BRAH!</span>
            <span className="text-2xl md:text-4xl px-4 py-1 bg-yellow-500/20 text-yellow-500 border-2 border-yellow-500/50 rounded-xl transform rotate-3">
                TEST
            </span>
            </h1>
            
            <p className="text-slate-400 text-lg uppercase tracking-widest font-bold">
            Registration 100% Confirmed
            </p>

            <div className="pt-8">
            <button 
                onClick={() => window.history.back()}
                className="px-6 py-2 text-sm text-slate-500 hover:text-white border border-slate-800 hover:border-slate-600 rounded-full transition-all"
            >
                ← Back to Auth
            </button>
            </div>
        </div>
        </main>
    );
}