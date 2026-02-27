import { NextResponse } from 'next/server';
import { createSign } from 'crypto';
import { AGENT_CONTEXT } from '@/lib/agent-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { getServerEnv } from '@/lib/env';

function base64UrlEncode(input: string | Buffer) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function getAccessToken() {
  const env = getServerEnv();
  const clientEmail = env.GOOGLE_CLIENT_EMAIL;
  const privateKeyRaw = env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !privateKeyRaw) {
    throw new Error('Credenciales de Google no configuradas para Vertex AI');
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const toSign = `${encodedHeader}.${encodedPayload}`;

  const signer = createSign('RSA-SHA256');
  signer.update(toSign);
  signer.end();
  const signature = signer.sign(privateKey);
  const encodedSignature = base64UrlEncode(signature);
  const assertion = `${toSign}.${encodedSignature}`;

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Error obteniendo token de acceso:', JSON.stringify(errorData, null, 2));
    throw new Error('No se pudo obtener token de acceso de Google');
  }

  const data = await response.json();
  const accessToken = data.access_token as string | undefined;

  if (!accessToken) {
    throw new Error('Respuesta de token sin access_token');
  }

  return accessToken;
}

export async function POST(request: Request) {
  try {
    const { message, history, interviewId, role, userEmail } = await request.json();

    if (!message) {
      return NextResponse.json({ success: false, error: 'Mensaje vacío' }, { status: 400 });
    }

    let additionalContext = "";
    if (interviewId && role && userEmail) {
        try {
            const parentDoc = await getDoc(doc(db, 'interviews', interviewId));
            if (parentDoc.exists()) {
                const data = parentDoc.data();
                const team = data.interviewees || [];
                const otherRoles = team.filter((m: any) => m.email !== userEmail).map((m: any) => `${m.name} (${m.role})`);
                
                additionalContext += `\n\nCONTEXTO DE LA ENTREVISTA ENTERPRISE:\n`;
                additionalContext += `Estás entrevistando a: ${userEmail} con el rol de: ${role}.\n`;
                additionalContext += `El equipo está compuesto por: ${otherRoles.join(', ')}.\n`;
                
                if (team.length <= 1) {
                     additionalContext += `Como es el único miembro, evalúa TODAS las 7 dimensiones del diagnóstico.\n`;
                } else {
                     additionalContext += `Como hay múltiples miembros, enfócate PRINCIPALMENTE en las dimensiones y preguntas más relevantes para un ${role}. No intentes cubrir todo si no es pertinente para su rol. Confía en que otros miembros cubrirán otras áreas.\n`;
                }
                
                // Shared Context
                 const sessionsSnap = await getDocs(collection(db, 'interviews', interviewId, 'sessions'));
                 let sharedInsights = "";
                 
                 for (const sessionDoc of sessionsSnap.docs) {
                     if (sessionDoc.id !== userEmail) {
                          const msgsSnap = await getDocs(query(collection(sessionDoc.ref, 'messages'), orderBy('timestamp', 'desc'), limit(5)));
                          const msgs = msgsSnap.docs.map(d => `${d.data().role}: ${d.data().text}`).reverse().join('\n');
                          if (msgs) {
                              sharedInsights += `\n--- Entrevistado: ${sessionDoc.id} ---\n${msgs}\n`;
                          }
                     }
                 }
                 
                 if (sharedInsights) {
                     additionalContext += `\nCONTEXTO COMPARTIDO (Lo que han dicho otros miembros):\n${sharedInsights}\nUtiliza esta información para contrastar o profundizar.\n`;
                 }
            }
        } catch (error) {
            console.error("Error fetching enterprise context:", error);
        }
    }

  const env = getServerEnv();
  const projectId = env.GOOGLE_PROJECT_ID;

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'Project ID de Google no configurado' }, { status: 500 });
    }

    const accessToken = await getAccessToken();
    const location = 'us-central1';
    const model = 'gemini-2.5-flash-lite';

    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

    // Preparar el contenido incluyendo el historial
    // Vertex AI espera: { role: string, parts: { text: string }[] }[]
    let contents: { role: string; parts: { text: string }[] }[] = [];

    if (Array.isArray(history)) {
      contents = history.map((msg: any) => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));
    }

    // Agregar el mensaje actual
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        contents: contents,
        systemInstruction: {
          parts: [
            {
              text: AGENT_CONTEXT + additionalContext,
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Vertex AI Error:', JSON.stringify(errorData, null, 2));
      const errorMessage = (errorData as any)?.error?.message || 'Error en la API de Vertex AI';
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const candidates = (data as any).candidates;
    const firstCandidate = candidates && candidates[0];
    const parts = firstCandidate && firstCandidate.content && firstCandidate.content.parts;

    const aiResponse =
      (Array.isArray(parts)
        ? parts
            .map((part: any) => part.text)
            .filter((t: unknown) => typeof t === 'string')
            .join('\n')
        : undefined) || 'Lo siento, no pude generar una respuesta.';

    return NextResponse.json({ success: true, response: aiResponse });
  } catch (error: any) {
    console.error('Error en Chat API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
