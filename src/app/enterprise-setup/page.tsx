'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Typography, 
  Card,
  CardContent,
  Button,
  TextField,
  IconButton,
  Box,
  Link as MuiLink,
  CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import Header from '@/components/Header';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface Interviewee {
  name: string;
  role: string;
  email: string;
}

export default function EnterpriseSetupPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [interviewees, setInterviewees] = useState<Interviewee[]>([
    { name: '', role: '', email: '' }
  ]);

  React.useEffect(() => {
    if (!authLoading && !user) {
        router.push('/');
    }
  }, [user, authLoading, router]);

  const handleInputChange = (index: number, field: keyof Interviewee, value: string) => {
    const newInterviewees = [...interviewees];
    newInterviewees[index][field] = value;
    setInterviewees(newInterviewees);
  };

  const handleAddRow = () => {
    setInterviewees([...interviewees, { name: '', role: '', email: '' }]);
  };

  const handleRemoveRow = (index: number) => {
    const newInterviewees = interviewees.filter((_, i) => i !== index);
    setInterviewees(newInterviewees);
  };

  const handleSendInvites = async () => {
    if (!user) return;
    
    // Filter out empty rows
    const validInterviewees = interviewees.filter(i => i.name && i.email);
    
    if (validInterviewees.length === 0) {
      alert('Por favor agrega al menos un entrevistado válido.');
      return;
    }

    setLoading(true);

    try {
      // 1. Create Enterprise Diagnostic Session in Firestore
      const docRef = await addDoc(collection(db, 'interviews'), {
        userId: user.uid,
        type: 'enterprise',
        status: 'pending',
        createdAt: serverTimestamp(),
        interviewees: validInterviewees,
        intervieweeEmails: validInterviewees.map(i => i.email.toLowerCase().trim()) // Helper field for querying, normalized
      });

      // 2. Send Emails via API
      const response = await fetch('/api/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewId: docRef.id,
          interviewees: validInterviewees,
          companyName: user.email // Or fetch company name from user profile
        })
      });

      if (!response.ok) {
        throw new Error('Error enviando invitaciones');
      }

      alert('Invitaciones enviadas correctamente.');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error:', error);
      alert('Hubo un error al procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3e8ff] p-8 font-sans">
      <Header showBack={true} backUrl="/new-diagnostic" />
      
      <div className="max-w-5xl mx-auto mt-8">
        <div className="mb-6">
          <Typography variant="h5" className="font-bold text-slate-800">
            Configuracion de Diagnostico
          </Typography>
          <Typography variant="body1" className="text-slate-500">
            Elige el tipo de evaluacion que mejor se adapta a tus necesidades
          </Typography>
        </div>

        <Card className="rounded-[2.5rem] shadow-sm border-none bg-white p-8 md:p-12 min-h-[500px]">
          <CardContent className="p-0">
            {/* Header Section inside Card */}
            <div className="mb-8">
              <Typography variant="h6" className="font-bold text-slate-900 text-xl">
                Configuracion: Enterprise
              </Typography>
              <MuiLink 
                component="button"
                variant="body2" 
                onClick={() => router.push('/new-diagnostic')}
                className="text-[#00d4b6] no-underline hover:underline font-medium"
              >
                Cambiar tipo de evaluacion
              </MuiLink>
            </div>

            {/* Interviewees Section */}
            <div className="mb-6">
              <Typography variant="h6" className="font-bold text-slate-900 mb-4">
                Entrevistados
              </Typography>

              <div className="border border-slate-300 rounded-3xl p-6">
                {/* Table Header-ish */}
                <div className="grid grid-cols-12 gap-4 mb-2 px-2">
                    <div className="col-span-3">
                        <Typography variant="body2" className="font-bold text-slate-900">Nombre</Typography>
                    </div>
                    <div className="col-span-4">
                        <Typography variant="body2" className="font-bold text-slate-900">Rol</Typography>
                    </div>
                    <div className="col-span-4">
                         <Typography variant="body2" className="font-bold text-slate-900">Email</Typography>
                    </div>
                    <div className="col-span-1"></div>
                </div>

                {interviewees.map((interviewee, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 mb-4 items-center">
                    <div className="col-span-3">
                      <TextField
                        fullWidth
                        placeholder="Nombre"
                        variant="outlined"
                        size="small"
                        value={interviewee.name}
                        onChange={(e) => handleInputChange(index, 'name', e.target.value)}
                        sx={{ 
                          '& .MuiOutlinedInput-root': { 
                            borderRadius: '8px',
                            backgroundColor: '#e2e8f0',
                            border: 'none'
                          },
                          '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                        }}
                      />
                    </div>
                    <div className="col-span-4">
                      <TextField
                        fullWidth
                        placeholder="Rol"
                        variant="outlined"
                        size="small"
                        value={interviewee.role}
                        onChange={(e) => handleInputChange(index, 'role', e.target.value)}
                        sx={{ 
                          '& .MuiOutlinedInput-root': { 
                            borderRadius: '8px',
                            backgroundColor: '#e2e8f0',
                            border: 'none'
                          },
                          '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                        }}
                      />
                    </div>
                    <div className="col-span-4">
                      <TextField
                        fullWidth
                        placeholder="Email"
                        variant="outlined"
                        size="small"
                        value={interviewee.email}
                        onChange={(e) => handleInputChange(index, 'email', e.target.value)}
                         sx={{ 
                          '& .MuiOutlinedInput-root': { 
                            borderRadius: '8px',
                            backgroundColor: '#e2e8f0',
                            border: 'none'
                          },
                          '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                        }}
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      {interviewees.length > 1 && (
                        <IconButton onClick={() => handleRemoveRow(index)} color="error" size="small">
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </div>
                  </div>
                ))}

                <Button 
                    startIcon={<AddIcon />} 
                    onClick={handleAddRow}
                    className="text-slate-500 normal-case font-medium hover:bg-transparent px-2"
                >
                    Agregar otro entrevistado
                </Button>
              </div>
            </div>

            <div className="flex justify-end mt-8">
                <Button
                    variant="contained"
                    onClick={handleSendInvites}
                    disabled={loading}
                    endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                    className="bg-brand-cyan hover:bg-[#0cd2db] text-white font-bold rounded-full px-8 py-3 normal-case shadow-none text-lg"
                    sx={{ backgroundColor: '#00E4EF', '&:hover': { backgroundColor: '#0cd2db' } }}
                >
                    {loading ? 'Enviando...' : 'Enviar Invitaciones'}
                </Button>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
