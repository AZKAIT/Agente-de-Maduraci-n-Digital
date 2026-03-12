import { NextResponse } from 'next/server';
import { SpeechClient } from '@google-cloud/speech';

export async function POST(request: Request) {
  try {
    // 1. Validar credenciales
    if (!process.env.GOOGLE_PROJECT_ID || !process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return NextResponse.json({ success: false, error: 'Credenciales de Google no configuradas' }, { status: 500 });
    }

    // 2. Obtener el archivo de audio del FormData
    const formData = await request.formData();
    const audioFile = formData.get('audio') as Blob;

    if (!audioFile) {
      return NextResponse.json({ success: false, error: 'No se recibió ningún archivo de audio' }, { status: 400 });
    }

    // 3. Convertir Blob a Buffer
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const audioBytes = buffer.toString('base64');

    // 4. Configurar el cliente de Google Speech
    const client = new SpeechClient({
      projectId: process.env.GOOGLE_PROJECT_ID,
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
    });

    // 5. Configurar la solicitud de reconocimiento
    // Nota: 'WEBM_OPUS' es el formato estándar de MediaRecorder en navegadores modernos
    const requestConfig = {
      audio: {
        content: audioBytes,
      },
      config: {
        encoding: 'WEBM_OPUS' as const,
        sampleRateHertz: 48000, // Tasa estándar para WebM Opus
        languageCode: 'es-ES',  // Español
        alternativeLanguageCodes: ['es-MX', 'en-US'], // Opciones alternativas
        enableAutomaticPunctuation: true,
      },
    };

    // 6. Enviar a Google
    const [response] = await client.recognize(requestConfig);
    
    // 7. Procesar respuesta
    const transcription = response.results
      ?.map(result => result.alternatives?.[0].transcript)
      .join('\n');

    return NextResponse.json({ 
      success: true, 
      transcription: transcription || 'No se pudo reconocer nada.' 
    });

  } catch (error: any) {
    console.error('Error en transcripción:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Error interno del servidor' 
    }, { status: 500 });
  }
}
