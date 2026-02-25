import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { encodeUserIdentifier } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const { interviewId, interviewees, companyName } = await request.json();

    if (!interviewees || !Array.isArray(interviewees) || interviewees.length === 0) {
      return NextResponse.json({ error: 'No interviewees provided' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
      secure: process.env.EMAIL_SERVER_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });

    if (!process.env.EMAIL_SERVER_USER || !process.env.EMAIL_SERVER_PASSWORD) {
        console.log('WARNING: No email credentials found. Simulating email send.');
        console.log('Would send to:', interviewees.map((i: any) => i.email));
        return NextResponse.json({ success: true, message: 'Simulated sent (configure .env for real emails)' });
    }

    const sendPromises = interviewees.map((person: any) => {
      const encodedEmail = encodeUserIdentifier(person.email);
      const link = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/interview_micro?id=${interviewId}&u=${encodedEmail}`;
      
      const mailOptions = {
        from: `"Azkait Diagnostic" <${process.env.EMAIL_SERVER_USER}>`,
        to: person.email,
        subject: `Invitación a Diagnóstico Enterprise - ${companyName || 'Azkait'}`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>Hola ${person.name},</h2>
            <p>Has sido invitado a participar en el diagnóstico de madurez de IA para <strong>${companyName || 'tu organización'}</strong>.</p>
            <p>Tu rol asignado es: <strong>${person.role}</strong>.</p>
            <p>Por favor, haz clic en el siguiente enlace para comenzar tu evaluación:</p>
            <p>
              <a href="${link}" style="background-color: #00d4b6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Comenzar Diagnóstico
              </a>
            </p>
            <p>Si el botón no funciona, copia y pega este enlace:</p>
            <p>${link}</p>
            <br/>
            <p>Gracias,<br/>El equipo de Azkait</p>
          </div>
        `,
      };
      return transporter.sendMail(mailOptions);
    });

    await Promise.all(sendPromises);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error sending emails:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
