import { NextResponse } from 'next/server';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ success: false, error: 'Texto vacío' }, { status: 400 });
    }

    if (!process.env.GOOGLE_PROJECT_ID || !process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return NextResponse.json({ success: false, error: 'Credenciales de Google no configuradas' }, { status: 500 });
    }

    const client = new TextToSpeechClient({
      projectId: process.env.GOOGLE_PROJECT_ID,
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
    });

    const requestConfig = {
      input: { text },
      // Selección de voz: español, femenino, estándar
      voice: { languageCode: 'es-ES', ssmlGender: 'FEMALE' as const },
      // Configuración de audio: MP3
      audioConfig: { audioEncoding: 'MP3' as const },
    };

    const [response] = await client.synthesizeSpeech(requestConfig);
    const audioContent = response.audioContent;

    if (!audioContent) {
      throw new Error('No se generó contenido de audio');
    }

    // Convertir a base64 para enviar al cliente
    const audioBase64 = Buffer.from(audioContent).toString('base64');

    return NextResponse.json({ success: true, audioContent: audioBase64 });

  } catch (error: any) {
    console.error('Error en Text-to-Speech API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
