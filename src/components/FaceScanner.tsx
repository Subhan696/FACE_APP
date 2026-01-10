'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import { loadModels, detectFace, analyzeFace, AnalysisResult } from '../utils/faceAnalysis';
import { Camera, RefreshCw, Upload } from 'lucide-react';

export default function FaceScanner() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [results, setResults] = useState<AnalysisResult | null>(null);
    const [imageSrc, setImageSrc] = useState<string | null>(null);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                await loadModels();
                setIsModelLoaded(true);
            } catch (err) {
                console.error("Model loading error:", err);
                setError("Failed to load AI models. Check console.");
            }
        };
        init();
    }, []);

    const startCamera = async () => {
        setImageSrc(null);
        setResults(null);
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                    setIsCameraActive(true);
                }
            } catch (e) {
                console.error("Camera failed", e);
                alert("Could not access camera. Please allow permissions.");
            }
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setImageSrc(event.target.result as string);
                    setIsCameraActive(false);
                    setResults(null);
                    // Stop camera if running
                    if (videoRef.current && videoRef.current.srcObject) {
                        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
                        tracks.forEach(track => track.stop());
                        videoRef.current.srcObject = null;
                    }
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const scanFace = async () => {
        if (!isModelLoaded) return;
        setIsScanning(true);

        // Simulate "scanning" delay for effect
        await new Promise(r => setTimeout(r, 1500));

        let input: HTMLVideoElement | HTMLImageElement | null = videoRef.current;
        if (imageSrc) {
            const img = document.createElement('img');
            img.src = imageSrc;
            await new Promise((resolve) => { img.onload = resolve });
            input = img;
        }

        if (input) {
            const detection = await detectFace(input);
            if (detection) {
                const analysis = analyzeFace(detection);
                setResults(analysis);
            } else {
                alert('No face detected. Try better lighting or centering your face.');
            }
        }
        setIsScanning(false);
    };

    return (
        <div className="flex flex-col items-center justify-center p-4 w-full max-w-md mx-auto">
            <div className="relative w-full aspect-[3/4] bg-black/50 rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl">
                {!imageSrc ? (
                    <video
                        ref={videoRef}
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <img src={imageSrc} className="w-full h-full object-cover" alt="Uploaded face" />
                )}

                {/* Scanning Overlay */}
                {isScanning && (
                    <div className="absolute inset-0 bg-scan-gradient animate-scan z-10 pointer-events-none"></div>
                )}

                {/* Placeholder / Start UI */}
                {!isCameraActive && !imageSrc && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-0 text-slate-400">
                        <Camera size={48} className="mb-2 opacity-50" />
                        <p>Start Camera or Upload</p>
                    </div>
                )}
            </div>

            <div className="flex gap-4 mt-6 w-full">
                <button
                    onClick={startCamera}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-lg flex items-center justify-center gap-2 transition-all font-medium border border-slate-600"
                >
                    <Camera size={18} /> Live Cam
                </button>
                <label className="flex-1 bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-lg flex items-center justify-center gap-2 transition-all font-medium border border-slate-600 cursor-pointer">
                    <Upload size={18} /> Upload
                    <input type="file" onChange={handleFileUpload} className="hidden" accept="image/*" />
                </label>
            </div>

            <button
                onClick={scanFace}
                disabled={!isModelLoaded || isScanning || (!isCameraActive && !imageSrc)}
                className={`w-full mt-4 p-4 rounded-xl text-lg font-bold tracking-wide transition-all
          ${(isModelLoaded && (isCameraActive || imageSrc)) ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}
        `}
            >
                {!isModelLoaded ? (error || 'Loading AI Models...') : (isScanning ? 'Analyzing...' : 'CALCULATE VISUALS')}
            </button>

            {/* Results Section */}
            {results && (
                <div className="mt-8 w-full animate-in fade-in slide-in-from-bottom-4">
                    {/* Main Score Card */}
                    <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-indigo-500/30 mb-4 shadow-xl shadow-indigo-500/10">
                        <div className="flex justify-between items-start">
                            <div className="flex flex-col">
                                <span className="text-slate-400 text-sm font-medium tracking-wider uppercase">Overall Aesthetic</span>
                                <h2 className="text-3xl font-black text-white px-2">
                                    {results.score >= 90 ? "GOD TIER" : (results.score >= 80 ? "MODEL TIER" : (results.score >= 70 ? "ABOVE AVERAGE" : "AVERAGE"))}
                                </h2>
                            </div>
                            <div className="text-right">
                                <span className="text-xl font-bold text-white">{results.score}</span>
                                <span className="text-sm text-slate-500 block">/100</span>
                            </div>
                        </div>

                        {/* Potential Bar */}
                        {results.potential && (
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-400">Current</span>
                                    <span className="text-indigo-300">Max Potential: {results.potential}</span>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-1000" style={{ width: `${results.score}%` }}></div>
                                    <div className="h-full bg-indigo-500/30 -mt-2 transition-all duration-1000" style={{ width: `${results.potential}%` }}></div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Report Card Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {Object.entries(results.traits).map(([key, value]) => (
                            <div key={key} className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
                                <span className="text-slate-500 text-xs uppercase font-bold tracking-wider block mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                <span className="text-white font-semibold text-lg">{value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Advice */}
                    <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-700/50">
                        <h3 className="text-sm font-bold text-indigo-300 mb-3 uppercase tracking-wider flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            Looksmaxxing Advice
                        </h3>
                        <ul className="space-y-2">
                            {results.advice.map((tip, i) => (
                                <li key={i} className="text-sm text-slate-300 flex gap-2">
                                    <span className="text-indigo-500">•</span>
                                    {tip}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
