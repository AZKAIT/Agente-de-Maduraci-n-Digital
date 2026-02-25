import { NextResponse } from 'next/server';
import { SpeechClient } from '@google-cloud/speech';

export async function GET() {
  try {
    // Verificar que las variables de entorno existan
    if (!process.env.GOOGLE_PROJECT_ID || !process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      throw new Error('Faltan credenciales de Google en las variables de entorno');
    }

    const client = new SpeechClient({
      projectId: process.env.GOOGLE_PROJECT_ID,
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
    });

    // Intentar obtener el Project ID para verificar la autenticación
    const projectId = await client.getProjectId();

    return NextResponse.json({ 
      success: true, 
      message: 'Cliente de Google Speech inicializado correctamente', 
      projectId 
    });
  } catch (error: any) {
    console.error('Error initializing Speech Client:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      details: 'Verifica que las credenciales en .env sean correctas'
    }, { status: 500 });
  }
}
