'use client';

import React, { useEffect, useState } from 'react';
import { TextField, Button, Typography } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import NeuralNetwork from '@/components/NeuralNetwork';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [codeValid, setCodeValid] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const oobCode = searchParams.get('oobCode');

  useEffect(() => {
    const verifyCode = async () => {
      if (!oobCode) {
        setVerificationError('Código de recuperación inválido o faltante.');
        return;
      }

      try {
        await verifyPasswordResetCode(auth, oobCode);
        setCodeValid(true);
      } catch (err) {
        console.error('Verify code error:', err);
        setVerificationError('El enlace de recuperación es inválido o ha expirado.');
      }
    };

    verifyCode();
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitMessage('');

    if (!oobCode) {
      setSubmitError('Código de recuperación inválido.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setSubmitError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setSubmitError('Las contraseñas no coinciden.');
      return;
    }

    try {
      setLoading(true);
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSubmitMessage('Tu contraseña ha sido actualizada correctamente. Ahora puedes iniciar sesión.');
    } catch (err: any) {
      console.error('Confirm reset error:', err);
      let msg = 'No se pudo actualizar la contraseña.';
      if (err.code === 'auth/expired-action-code') msg = 'El enlace de recuperación ha expirado.';
      if (err.code === 'auth/invalid-action-code') msg = 'El enlace de recuperación es inválido.';
      setSubmitError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center p-4 font-brand-primary">
      <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row w-full max-w-6xl h-[600px]">
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center overflow-y-auto">
          <Typography variant="h4" className="font-brand-secondary font-bold mb-2 text-brand-navy">
            Nueva contraseña
          </Typography>
          <Typography variant="body1" className="text-brand-indigo mb-6">
            Ingresa tu nueva contraseña y confírmala para completar el proceso.
          </Typography>

          {verificationError && (
            <Typography color="error" variant="body2" className="mb-4">
              {verificationError}
            </Typography>
          )}

          {codeValid && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Typography variant="body2" className="font-bold mb-1 text-brand-navy">
                  Nueva contraseña
                </Typography>
                <TextField
                  fullWidth
                  type="password"
                  variant="outlined"
                  size="small"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div>
                <Typography variant="body2" className="font-bold mb-1 text-brand-navy">
                  Confirmar contraseña
                </Typography>
                <TextField
                  fullWidth
                  type="password"
                  variant="outlined"
                  size="small"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              {submitError && (
                <Typography color="error" variant="caption" className="block">
                  {submitError}
                </Typography>
              )}
              {submitMessage && (
                <Typography variant="caption" className="block text-brand-indigo">
                  {submitMessage}
                </Typography>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                className="bg-brand-cyan hover:bg-[#0cd2db] text-brand-navy font-bold py-3 rounded-lg normal-case text-lg shadow-none mt-2"
              >
                {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
              </Button>

              <Button
                variant="text"
                onClick={() => router.push('/')}
                className="text-brand-indigo normal-case"
              >
                Volver a iniciar sesión
              </Button>
            </form>
          )}
        </div>

        <div className="w-full md:w-1/2 relative bg-brand-indigo overflow-hidden hidden md:block">
          <NeuralNetwork />
        </div>
      </div>
    </div>
  );
}

