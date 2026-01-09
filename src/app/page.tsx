
import FaceScanner from '@/components/FaceScanner';

export default function Home() {
    return (
        <main className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center py-12 px-4 selection:bg-indigo-500/30">
            <div className="max-w-2xl w-full flex flex-col items-center">
                <div className="text-center mb-8">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        LOOKSMAX AI
                    </h1>
                    <p className="text-slate-400 text-lg">Analyze your aesthetics with AI precision</p>
                </div>

                <FaceScanner />
            </div>
        </main>
    );
}
