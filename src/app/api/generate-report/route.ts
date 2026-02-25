import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, getDocs, orderBy, query } from 'firebase/firestore';
import { AGENT_CONTEXT } from '@/lib/agent-context';

// Helper to call Vertex AI (Reusing logic from chat route or similar would be better, but copying for speed/isolation)
// actually, I should reuse the token logic.
import { createSign } from 'crypto';

function base64UrlEncode(input: string | Buffer) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function getAccessToken() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;
  if (!clientEmail || !privateKeyRaw) throw new Error('Credenciales de Google no configuradas');
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
  const now = Math.floor(Date.now() / 1000);
  const jwt = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };
  const encodedHeader = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const encodedPayload = base64UrlEncode(JSON.stringify(jwt));
  const signer = createSign('RSA-SHA256');
  signer.update(`${encodedHeader}.${encodedPayload}`);
  const signature = base64UrlEncode(signer.sign(privateKey));
  
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodedHeader}.${encodedPayload}.${signature}`
  });
  const data = await res.json();
  return data.access_token;
}

export async function POST(request: Request) {
  try {
    const { interviewId, userEmail } = await request.json();

    if (!interviewId) {
      return NextResponse.json({ success: false, error: 'Falta interviewId' }, { status: 400 });
    }

    // 1. Fetch Interview Data
    const docRef = doc(db, 'interviews', interviewId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
        return NextResponse.json({ success: false, error: 'Entrevista no encontrada' }, { status: 404 });
    }

    const interviewData = docSnap.data();
    
    // Gather messages
    let fullTranscript = "";
    
    if (interviewData.type === 'enterprise') {
        if (userEmail) {
            // --- Individual Report ---
            const sessionRef = doc(db, 'interviews', interviewId, 'sessions', userEmail);
            const sessionSnap = await getDoc(sessionRef);
            
            if (sessionSnap.exists()) {
                 const msgsSnap = await getDocs(query(collection(sessionRef, 'messages'), orderBy('timestamp', 'asc')));
                 const msgs = msgsSnap.docs.map(d => `${d.data().role}: ${d.data().text}`).join('\n');
                 fullTranscript += `\n--- Sesión individual de ${userEmail} ---\n${msgs}\n`;
            }
        } else {
            // --- Aggregate Report ---
            const sessionsSnap = await getDocs(collection(db, 'interviews', interviewId, 'sessions'));
            for (const session of sessionsSnap.docs) {
                const msgsSnap = await getDocs(query(collection(session.ref, 'messages'), orderBy('timestamp', 'asc')));
                const msgs = msgsSnap.docs.map(d => `${d.data().role}: ${d.data().text}`).join('\n');
                fullTranscript += `\n--- Sesión con ${session.id} (${session.data().role || 'Sin rol'}) ---\n${msgs}\n`;
            }
        }
    } else {
        // Micro/Individual (Standard)
        const msgsSnap = await getDocs(query(collection(db, 'interviews', interviewId, 'messages'), orderBy('timestamp', 'asc')));
        const msgs = msgsSnap.docs.map(d => `${d.data().role}: ${d.data().text}`).join('\n');
        fullTranscript += `\n--- Transcripción ---\n${msgs}\n`;
    }

    if (!fullTranscript.trim()) {
        return NextResponse.json({ success: true, report: null, message: "No hay datos para analizar" });
    }

    // 2. Call Gemini
    const accessToken = await getAccessToken();
    const projectId = process.env.GOOGLE_PROJECT_ID;
    const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash-lite:generateContent`;

    const systemPrompt = `
      Eres un consultor senior de estrategia digital y tecnología (CIO/CDO) con experiencia en transformación empresarial.
      Tu tarea es analizar la transcripción de la entrevista y generar un "Reporte Ejecutivo de Madurez Digital e IA" altamente profesional y detallado.

      CONTEXTO:
      ${userEmail ? 'Reporte individual para un líder/rol específico. Usa sus respuestas textuales como evidencia.' : 'Reporte corporativo consolidado. Identifica patrones, silos y consensos.'}

      OBJETIVO:
      Proveer un diagnóstico crudo pero constructivo, con un tono ejecutivo, formal y directo. Evita generalidades; basa cada afirmación en lo dicho por el usuario.

      ESTRUCTURA DEL REPORTE (JSON):
      Debes evaluar 7 dimensiones: Estrategia, Cultura, Procesos, Datos, Analítica, Tecnología, Gobierno.

      Para cada dimensión, genera:
      - score: 1-5 (entero).
      - level: "Inicial", "Básico", "Intermedio", "Avanzado", "Optimizado".
      - analysis: CRÍTICO. Un párrafo detallado (50-70 palabras) explicando el estado actual. MENCIONA EVIDENCIA DE LA ENTREVISTA. Si no hay suficiente info, infiere basado en el contexto pero NO lo dejes vacío.
      - recommendation: Una acción estratégica concreta.

      Calcula:
      - overallScore: Promedio (1 decimal).
      - strongestArea: Nombre de la dimensión más fuerte.
      - mainOpportunity: Nombre de la dimensión más crítica.
      - executiveSummary: Un resumen gerencial de 2-3 párrafos (150-200 palabras) que sintetice el estado actual, los riesgos de no actuar y la visión de futuro.

      Genera un Roadmap Estratégico Detallado (3 HORIZONTES):
      Debes generar iniciativas para CADA horizonte (NOW, NEXT, FUTURE).
      
      Cada iniciativa (item) del roadmap debe tener OBLIGATORIAMENTE:
      - title: Nombre del proyecto.
      - impact: "Alta", "Media", "Baja".
      - description: Resumen muy breve y llamativo (máximo 25 palabras).
      - objective: El objetivo de negocio detallado (KPIs esperados, valor estratégico, ROI estimado). Se muy específico.
      - steps: Array con 6-10 pasos detallados de implementación técnica/operativa. Incluye tecnologías sugeridas, roles necesarios y validaciones.

      FORMATO JSON (Estricto):
      {
        "overallScore": number,
        "strongestArea": string,
        "mainOpportunity": string,
        "executiveSummary": string,
        "dimensions": {
          "strategy": { "score": number, "level": string, "analysis": string, "recommendation": string },
          "culture": { "score": number, "level": string, "analysis": string, "recommendation": string },
          "processes": { "score": number, "level": string, "analysis": string, "recommendation": string },
          "data": { "score": number, "level": string, "analysis": string, "recommendation": string },
          "analytics": { "score": number, "level": string, "analysis": string, "recommendation": string },
          "technology": { "score": number, "level": string, "analysis": string, "recommendation": string },
          "governance": { "score": number, "level": string, "analysis": string, "recommendation": string }
        },
        "roadmap": {
          "shortTerm": [{ "title": string, "impact": string, "description": string, "objective": string, "steps": [string] }],
          "mediumTerm": [{ "title": string, "impact": string, "description": string, "objective": string, "steps": [string] }],
          "longTerm": [{ "title": string, "impact": string, "description": string, "objective": string, "steps": [string] }]
        }
      }
    `;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        contents: [{
            role: 'user',
            parts: [{ text: `Transcripción:\n${fullTranscript}\n\nGenera el reporte JSON.` }]
        }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { responseMimeType: "application/json" }
      }),
    });

    const data = await response.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidate) {
        throw new Error("No se generó respuesta de IA");
    }

    let reportJson;
    try {
        reportJson = JSON.parse(candidate);
    } catch (e) {
        const clean = candidate.replace(/```json/g, '').replace(/```/g, '');
        reportJson = JSON.parse(clean);
    }

    // NORMALIZE KEYS (AI sometimes capitalizes keys)
    if (reportJson.dimensions) {
        for (const key in reportJson.dimensions) {
            const dim = reportJson.dimensions[key];
            if (!dim.analysis && dim.Analysis) dim.analysis = dim.Analysis;
            if (!dim.recommendation && dim.Recommendation) dim.recommendation = dim.Recommendation;
            if (!dim.score && dim.Score) dim.score = dim.Score;
            if (!dim.level && dim.Level) dim.level = dim.Level;
        }
    }
    
    if (reportJson.roadmap) {
        ['shortTerm', 'mediumTerm', 'longTerm'].forEach(term => {
             if (reportJson.roadmap[term]) {
                 reportJson.roadmap[term] = reportJson.roadmap[term].map((item: any) => ({
                     ...item,
                     title: item.title || item.Title,
                     impact: item.impact || item.Impact,
                     description: item.description || item.Description || item.desc,
                     objective: item.objective || item.Objective,
                     steps: item.steps || item.Steps
                 }));
             }
        });
    }

    // 3. Save to Firestore
    if (userEmail && interviewData.type === 'enterprise') {
        // Save to individual session
         await updateDoc(doc(db, 'interviews', interviewId, 'sessions', userEmail), {
            report: reportJson,
            reportGeneratedAt: new Date().toISOString()
        });
    } else {
        // Save to main doc (Aggregate or Micro)
        await updateDoc(docRef, {
            report: reportJson,
            reportGeneratedAt: new Date().toISOString()
        });
    }

    return NextResponse.json({ success: true, report: reportJson });

  } catch (error: any) {
    console.error('Error generando reporte:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
