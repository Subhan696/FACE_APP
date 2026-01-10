let faceapi: any;

export const loadModels = async () => {
    if (typeof window === 'undefined') return;
    try {
        // @ts-ignore
        const faceapiModule = await import('face-api.js/dist/face-api.min.js');
        faceapi = faceapiModule.default || faceapiModule;

        console.log('FaceAPI loaded keys:', Object.keys(faceapi));

        if (!faceapi.nets) {
            console.warn("faceapi.nets is undefined, checking top-level methods");
        }

        const MODEL_URL = '/models';
        console.log('Loading models from:', MODEL_URL);

        // Use top-level loader functions which are often more reliable in bundled environments
        await Promise.all([
            (faceapi as any).loadSsdMobilenetv1Model(MODEL_URL),
            (faceapi as any).loadFaceLandmarkModel(MODEL_URL),
        ]);
        console.log('Models loaded successfully');
        console.log('Models loaded successfully');
    } catch (error) {
        console.error('Failed to load models:', error);
        throw error;
    }
};

export const detectFace = async (imageElement: HTMLImageElement | HTMLVideoElement) => {
    if (!faceapi) return null;
    const detection = await faceapi
        .detectSingleFace(imageElement, new faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks();
    return detection;
};

// Heuristic Analysis
export interface AnalysisResult {
    score: number;
    potential?: number; // Added potential score
    traits: Record<string, string>; // More flexible traits
    advice: string[];
}

export const analyzeFace = (detection: any): AnalysisResult => {
    const landmarks = detection.landmarks;
    const positions = landmarks.positions;

    // --- MEASUREMENTS ---
    // 1. Jawline Definition (Bigonial Width vs face width)
    // Indices: 4 (left jaw) to 12 (right jaw)
    const bigonialWidth = Math.abs(positions[12].x - positions[4].x);
    // Indices: 0 (left ear/side) to 16 (right ear/side)
    const bizygomaticWidth = Math.abs(positions[16].x - positions[0].x);
    const jawRatio = bigonialWidth / bizygomaticWidth;

    // 2. Cheekbone Prominence (Cheek vs jaw)
    // Approximate cheek width using indices 1 and 15 (slightly below eyes) if exact zygoma is hard, but 0-16 is often bizygomatic.
    // Let's use simple cheekbone height relative to nose.
    const leftCheek = positions[1];
    const rightCheek = positions[15];
    // Compare cheek height to nose tip (30)
    const noseTipY = positions[30].y;
    // Lower y is higher on face.
    const cheekHeight = ((noseTipY - leftCheek.y) + (noseTipY - rightCheek.y)) / 2;
    // Normalize by face height (chin 8 to eyebrows 24 approx)
    const faceHeight = positions[8].y - ((positions[19].y + positions[24].y) / 2);
    const cheekboneRatio = cheekHeight / faceHeight;


    // 3. Canthal Tilt (Positive is attractive)
    // Inner corners: 39 (left), 42 (right). Outer corners: 36 (left), 45 (right).
    // Left Eye Tilt: Inner 39 to Outer 36. Reference: 36 is outer left, 39 is inner left.
    // Right Eye Tilt: Inner 42 to Outer 45. Reference: 42 is inner right, 45 is outer right.
    const leftOuter = positions[36];
    const leftInner = positions[39];
    const rightInner = positions[42];
    const rightOuter = positions[45];

    // Y decreases going up. Positive tilt = outer corner HIGHER (smaller Y) than inner.
    const leftTilt = leftInner.y - leftOuter.y;
    const rightTilt = rightInner.y - rightOuter.y;
    const avgTilt = (leftTilt + rightTilt) / 2;

    // 4. Midface Ratio (Compact is better usually)
    // Distance between pupils vs distance from pupil to lip line?
    // Often: Distance between eyes (pupils) / Distance from eyes to mouth.
    // Let's use IPD vs (Pupil mid-point to Mouth Center)
    const leftPupil = { x: (positions[37].x + positions[38].x + positions[40].x + positions[41].x) / 4, y: (positions[37].y + positions[38].y + positions[40].y + positions[41].y) / 4 };
    const rightPupil = { x: (positions[43].x + positions[44].x + positions[46].x + positions[47].x) / 4, y: (positions[43].y + positions[44].y + positions[46].y + positions[47].y) / 4 };

    const ipd = Math.hypot(rightPupil.x - leftPupil.x, rightPupil.y - leftPupil.y);
    const mouthCenter = positions[62]; // top of upper lip lower edge
    const midfaceHeight = Math.abs(mouthCenter.y - ((leftPupil.y + rightPupil.y) / 2));
    const midfaceRatio = ipd / midfaceHeight; // Higher might be better (compact midface)


    console.log("--- FACE ANALYSIS LOG ---");
    console.log(`Jaw Ratio (Width/Face): ${jawRatio.toFixed(3)} (Ideal ~0.8-0.9)`);
    console.log(`Cheekbone Height Ratio: ${cheekboneRatio.toFixed(3)} (Higher is prominent)`);
    console.log(`Avg Canthal Tilt (pixels diff): ${avgTilt.toFixed(3)} (Positive is hunter)`);
    console.log(`Midface Ratio (IPD/Height): ${midfaceRatio.toFixed(3)}`);
    console.log("-------------------------");


    // --- SCORING LOGIC ---
    let score = 50; // Start neutral
    const advice: string[] = [];

    // Jaw
    if (jawRatio > 0.82) {
        score += 15;
    } else {
        score += 5;
        if (jawRatio < 0.76) advice.push("Jawline is soft. Lower body fat or mewing recommended.");
    }

    // Cheekbones
    if (cheekboneRatio > 0.28) {
        score += 10;
        // High cheekbones
    } else {
        score += 5;
    }

    // Tilt
    if (avgTilt > 2) {
        score += 10; // Positive tilt
    } else if (avgTilt < -2) {
        score -= 5;
        advice.push("Negative canthal tilt detected. Maximize sleep and hydration.");
    } else {
        score += 5; // Neutral
    }

    // Midface
    if (midfaceRatio > 0.95) {
        score += 10; // Compact midface
    } else {
        // Long midface
        if (midfaceRatio < 0.85) advice.push("Midface appears elongated. Consider hairstyle to add width.");
        score += 2;
    }

    // Symmetry
    // Compare eye heights
    const symmetryScoreY = Math.abs(leftPupil.y - rightPupil.y);
    if (symmetryScoreY < 4) {
        score += 5;
    } else {
        advice.push("Slight facial asymmetry detected (normal).");
    }

    // Normalize
    score = Math.min(98, Math.max(60, Math.round(score)));

    // Traits text
    const jawText = jawRatio > 0.8 ? "Chiseled" : (jawRatio > 0.75 ? "Defined" : "Soft");
    const cheekText = cheekboneRatio > 0.3 ? "High" : "Average";
    const tiltText = avgTilt > 3 ? "Hunter" : (avgTilt < -1 ? "Prey" : "Neutral");

    return {
        score,
        traits: {
            jawline: jawText,
            cheekbones: cheekText,
            eyes: tiltText
        },
        advice: advice.length ? advice : ["Great facial harmony detected."]
    };
};
