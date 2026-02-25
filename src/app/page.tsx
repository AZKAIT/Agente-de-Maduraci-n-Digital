'use client';

import React, { useState, useEffect } from 'react';
import { 
  TextField, 
  Button, 
  Typography, 
  InputAdornment, 
  IconButton,
  Link as MuiLink,
  Divider,
  Box
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import GoogleIcon from '@mui/icons-material/Google';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import NeuralNetwork from '@/components/NeuralNetwork';
import { auth, db } from '@/lib/firebase';
import { decodeUserIdentifier } from '@/lib/utils';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';

export default function LoginPage() {
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  const [showResetAlert, setShowResetAlert] = useState(false);
  const [showVerifyAlert, setShowVerifyAlert] = useState(false);

  useEffect(() => {
    if (searchParams) {
        const mode = searchParams.get('mode');
        const encodedEmail = searchParams.get('u');
        const rawEmail = searchParams.get('email');
        const emailParam = encodedEmail ? decodeUserIdentifier(encodedEmail) : rawEmail;
        const reset = searchParams.get('reset');
        const verify = searchParams.get('verify');
        
        if (mode === 'register') {
            setIsRegistering(true);
        }
        if (emailParam) {
            setEmail(emailParam);
        }
        if (reset === 'sent') {
            setShowResetAlert(true);
        }
        if (verify === 'sent') {
            setShowVerifyAlert(true);
        }
    }
  }, [searchParams]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegistering) {
        // Registro con Email
        if (!company.trim()) {
          throw new Error('Por favor ingresa el nombre de tu empresa.');
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        try {
          await sendEmailVerification(user);
        } catch (verifyError) {
          console.error('Error enviando correo de verificación:', verifyError);
        }

        // Guardar datos en Firestore
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          companyName: company,
          createdAt: serverTimestamp(),
          authProvider: 'email'
        });

        // Cerrar sesión hasta que verifique el correo
        await signOut(auth);
        router.push(`/?verify=sent&email=${encodeURIComponent(email)}`);
      } else {
        // Login con Email
        const loginCredential = await signInWithEmailAndPassword(auth, email, password);
        const loginUser = loginCredential.user;

        if (!loginUser.emailVerified) {
          try {
            await sendEmailVerification(loginUser);
          } catch (verifyError) {
            console.error('Error reenviando correo de verificación:', verifyError);
          }
          await signOut(auth);
          setShowVerifyAlert(true);
          return;
        }

        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      let msg = 'Error de autenticación.';
      if (err.code === 'auth/invalid-credential') msg = 'Credenciales inválidas.';
      if (err.code === 'auth/email-already-in-use') msg = 'Este correo ya está registrado.';
      if (err.code === 'auth/weak-password') msg = 'La contraseña debe tener al menos 6 caracteres.';
      if (err.message && !err.code) msg = err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Verificar si el usuario ya existe para no sobrescribir datos importantes si los hubiera
      // O usamos merge: true para actualizar lastLogin
      const userDocRef = doc(db, 'users', user.uid);
      
      // Guardamos/Actualizamos usuario
      await setDoc(userDocRef, {
        email: user.email,
        lastLogin: serverTimestamp(),
        authProvider: 'google',
        // Si es la primera vez, se crea. Si ya existe, se actualiza.
        // Nota: Con Google no tenemos el nombre de la empresa inmediatamente.
      }, { merge: true });

      router.push('/dashboard');
    } catch (err: any) {
      console.error("Google login error:", err);
      setError('Error al iniciar sesión con Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center p-4 font-brand-primary relative">
      {/* Contenedor principal más ancho (max-w-6xl) y con esquinas más redondeadas */}
      <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row w-full max-w-6xl h-[600px]">
        
        {/* Sección Izquierda: Formulario */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center overflow-y-auto">
          <div className="mb-6 flex flex-col gap-2">
            <Image src="/azkait-logo-wordmark.png" alt="Azkait" width={240} height={72} priority />
            <Typography variant="subtitle1" className="text-brand-indigo font-medium leading-tight">
              Consultoría Estratégica de Inteligencia Artificial
            </Typography>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <Typography variant="body2" className="font-bold mb-1 text-brand-navy">
                Email
              </Typography>
              <TextField
                fullWidth
                placeholder="example@empresa.com"
                variant="outlined"
                size="small"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={{ 
                  '& .MuiOutlinedInput-root': { 
                    borderRadius: '8px',
                    backgroundColor: '#e2e8f0', 
                    fontSize: '1rem'
                  },
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                }}
              />
            </div>

            <div>
              <Typography variant="body2" className="font-bold mb-1 text-brand-navy">
                Contraseña
              </Typography>
              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                placeholder="********"
                variant="outlined"
                size="small"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleClickShowPassword}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ 
                  '& .MuiOutlinedInput-root': { 
                    borderRadius: '8px',
                    backgroundColor: '#e2e8f0',
                    fontSize: '1rem'
                  },
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                }}
              />
            </div>

            {isRegistering && (
              <div>
                <Typography variant="body2" className="font-bold mb-1 text-brand-navy">
                  Empresa
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Nombre de tu empresa"
                  variant="outlined"
                  size="small"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                      borderRadius: '8px',
                      backgroundColor: '#e2e8f0',
                      fontSize: '1rem'
                    },
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                  }}
                />
              </div>
            )}

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
              {loading ? (isRegistering ? 'Registrando...' : 'Entrando...') : (isRegistering ? 'Siguiente' : 'Entrar')}
            </Button>

            <div className="relative flex items-center w-full mt-4">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">O continúa con</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            <Button
              fullWidth
              variant="outlined"
              onClick={handleGoogleLogin}
              disabled={loading}
              startIcon={<GoogleIcon />}
              className="border-brand-indigo text-brand-navy hover:bg-[#f5faff] font-semibold py-2.5 rounded-lg normal-case text-base"
              sx={{ 
                borderColor: '#152084',
                color: '#00122b',
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#1B006A',
                  backgroundColor: '#f5faff'
                }
              }}
            >
              Google
            </Button>

            <div className="text-center space-y-2 mt-4">
              <Typography variant="body2" className="text-slate-600 font-medium">
                {isRegistering ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
                <MuiLink 
                  component="button" 
                  type="button"
                  onClick={() => setIsRegistering(!isRegistering)}
                  underline="hover" 
                  className="text-brand-indigo font-bold cursor-pointer bg-transparent border-0 p-0 align-baseline"
                >
                  {isRegistering ? 'Inicia sesión' : 'Regístrate'}
                </MuiLink>
              </Typography>
              
              {!isRegistering && (
                <Typography variant="body2">
                  <MuiLink
                    component="button"
                    type="button"
                    onClick={() => router.push('/forgot-password')}
                    underline="hover"
                    className="text-brand-cyan font-medium bg-transparent border-0 p-0"
                  >
                    ¿Olvidaste tu contraseña?
                  </MuiLink>
                </Typography>
              )}
            </div>
          </form>
        </div>

        {/* Sección Derecha: Animación Neuronal */}
        <div className="w-full md:w-1/2 relative bg-brand-indigo overflow-hidden hidden md:block">
          <NeuralNetwork />
        </div>

        {/* Versión móvil de la animación (header pequeño) */}
        <div className="w-full h-32 md:hidden relative bg-brand-indigo overflow-hidden order-first">
             <NeuralNetwork />
        </div>

      </div>

      {showResetAlert && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 text-center shadow-2xl">
            <Typography variant="h5" className="font-bold mb-2 text-brand-navy">
              Revisa tu correo
            </Typography>
            <Typography variant="body2" className="text-brand-indigo mb-4">
              Te enviamos un enlace para recuperar tu contraseña. Si no lo ves en tu bandeja de entrada, revisa tu carpeta de spam o correos no deseados.
            </Typography>
            <Button
              variant="contained"
              className="bg-brand-cyan text-brand-navy font-bold px-6 py-2 rounded-lg normal-case"
              onClick={() => setShowResetAlert(false)}
            >
              Entendido
            </Button>
          </div>
        </div>
      )}
      {showVerifyAlert && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 text-center shadow-2xl">
            <Typography variant="h5" className="font-bold mb-2 text-brand-navy">
              Verifica tu correo
            </Typography>
            <Typography variant="body2" className="text-brand-indigo mb-4">
              Te enviamos un correo de verificación. Abre el enlace que viene en ese correo para activar tu cuenta. Si no lo ves, revisa tu carpeta de spam.
            </Typography>
            <Button
              variant="contained"
              className="bg-brand-cyan text-brand-navy font-bold px-6 py-2 rounded-lg normal-case"
              onClick={() => setShowVerifyAlert(false)}
            >
              Entendido
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
