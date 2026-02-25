'use client';

import React, { useState } from 'react';
import { TextField, Button, Typography, Box } from '@mui/material';
import { useRouter } from 'next/navigation';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import NeuralNetwork from '@/components/NeuralNetwork';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Ingresa el correo con el que te registraste.');
      return;
    }

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email.trim());
      router.push('/?reset=sent');
    } catch (err: any) {
      console.error('Password reset error:', err);
      let msg = 'No se pudo enviar el correo de recuperación.';
      if (err.code === 'auth/user-not-found') msg = 'No encontramos una cuenta con ese correo.';
      if (err.code === 'auth/invalid-email') msg = 'El correo no es válido.';
      if (err.code === 'auth/operation-not-allowed') msg = 'El proveedor de correo/contraseña no está habilitado en Firebase.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center p-4 font-brand-primary">
      <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row w-full max-w-6xl h-[600px]">
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center overflow-y-auto">
          <Typography variant="h4" className="font-brand-secondary font-bold mb-2 text-brand-navy">
            Recuperar contraseña
          </Typography>
          <Typography variant="body1" className="text-brand-indigo mb-6">
            Ingresa tu correo y te enviaremos un enlace de recuperación a tu bandeja de entrada.
          </Typography>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Typography variant="body2" className="font-bold mb-1 text-brand-navy">
                Correo electrónico
              </Typography>
              <TextField
                fullWidth
                type="email"
                placeholder="example@empresa.com"
                variant="outlined"
                size="small"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {error && (
              <Typography color="error" variant="caption" className="block">
                {error}
              </Typography>
            )}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              className="bg-brand-cyan hover:bg-[#0cd2db] text-brand-navy font-bold py-3 rounded-lg normal-case text-lg shadow-none mt-2"
            >
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </Button>

            <Box className="flex justify-center mt-4">
              <Button
                variant="text"
                onClick={() => router.push('/')}
                className="text-brand-indigo normal-case"
              >
                Volver a iniciar sesión
              </Button>
            </Box>
          </form>
        </div>

        <div className="w-full md:w-1/2 relative bg-brand-indigo overflow-hidden hidden md:block">
          <NeuralNetwork />
        </div>
      </div>
    </div>
  );
}
