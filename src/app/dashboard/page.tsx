'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Button, 
  Typography, 
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Tabs,
  Tab,
  Box
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import Header from '@/components/Header';
import { encodeUserIdentifier } from '@/lib/utils';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [interviewsState, setInterviewsState] = useState<{ owned: any[], invited: any[], combined: any[] }>({ owned: [], invited: [], combined: [] });
  const [tabValue, setTabValue] = useState(0);
  const [fetching, setFetching] = useState(true);

  const currentInterviews = tabValue === 0 ? interviewsState.owned : interviewsState.invited;

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      const q1 = query(
        collection(db, 'interviews'),
        where('userId', '==', user.uid)
      );

      const q2 = query(
        collection(db, 'interviews'),
        where('intervieweeEmails', 'array-contains', user.email?.toLowerCase())
      );

      const unsubscribe1 = onSnapshot(q1, (snapshot) => {
        const myInterviews = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Merge with existing invited interviews (stored in state or fetched separately)
        // To keep it simple, we'll use a local variable to hold both results if we could, 
        // but with two async listeners it's trickier.
        // Let's use a state object { owned: [], invited: [] } to manage updates cleanly.
        setInterviewsState(prev => {
            const newState = { ...prev, owned: myInterviews };
            const combined = [...newState.owned, ...newState.invited];
            combined.sort((a: any, b: any) => {
                const dateA = a.createdAt?.seconds ? a.createdAt.seconds : 0;
                const dateB = b.createdAt?.seconds ? b.createdAt.seconds : 0;
                return dateB - dateA;
            });
            return { ...newState, combined };
        });
        setFetching(false);
      });

      const unsubscribe2 = onSnapshot(q2, (snapshot) => {
        const invitedInterviews = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            isInvited: true // Flag to distinguish in UI if needed
        }));

        setInterviewsState(prev => {
            const newState = { ...prev, invited: invitedInterviews };
            const combined = [...newState.owned, ...newState.invited];
             combined.sort((a: any, b: any) => {
                const dateA = a.createdAt?.seconds ? a.createdAt.seconds : 0;
                const dateB = b.createdAt?.seconds ? b.createdAt.seconds : 0;
                return dateB - dateA;
            });
            return { ...newState, combined };
        });
      });

      return () => {
        unsubscribe1();
        unsubscribe2();
      };
    } else if (!loading) {
        // If not loading and no user, we handled redirect, but set fetching false to avoid stuck spinner if redirect takes a moment
        setFetching(false);
    }
  }, [user, loading, router]);

  const handleNewDiagnostic = () => {
    router.push('/new-diagnostic');
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    // Handle both Firestore Timestamp and regular Date objects if needed, though Firestore returns Timestamp
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading || fetching) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
        <Header showBack={true} backUrl="/" />
        <div className="max-w-5xl mx-auto mt-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <Typography variant="h5" className="font-bold text-slate-800">
                        Dashboard de Proyectos
                    </Typography>
                    <Typography variant="body1" className="text-slate-500">
                        Gestiona y monitorea tus diagnósticos de IA
                    </Typography>
                </div>
                <Button 
                    variant="contained" 
                    startIcon={<AddIcon />}
                    onClick={handleNewDiagnostic}
                    className="bg-brand-cyan hover:bg-[#0cd2db] text-white font-bold rounded-full px-6 py-2 normal-case shadow-none"
                    sx={{ backgroundColor: '#00E4EF', '&:hover': { backgroundColor: '#0cd2db' } }}
                >
                    Nuevo Diagnóstico
                </Button>
            </div>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={tabValue} onChange={handleTabChange} aria-label="dashboard tabs" textColor="primary" indicatorColor="primary">
                    <Tab label="Mis Proyectos" sx={{ textTransform: 'none', fontWeight: 'bold', fontSize: '1rem' }} />
                    <Tab label="Invitaciones" sx={{ textTransform: 'none', fontWeight: 'bold', fontSize: '1rem' }} />
                </Tabs>
            </Box>

            <TableContainer component={Paper} className="rounded-3xl shadow-sm overflow-hidden">
                <Table>
                    <TableHead className="bg-slate-50">
                        <TableRow>
                            <TableCell className="font-bold text-slate-500 pl-8 py-4">Estado</TableCell>
                            <TableCell className="font-bold text-slate-500 py-4">Fecha</TableCell>
                            <TableCell align="right" className="font-bold text-slate-500 pr-8 py-4">Acción</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {currentInterviews.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} align="center" className="py-8 text-slate-500">
                                    {tabValue === 0 
                                        ? "No has creado diagnósticos aún. ¡Comienza uno nuevo!" 
                                        : "No tienes invitaciones pendientes."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            currentInterviews.map((interview) => {
                                // Determine specific status for this user if in Invited tab
                                let isCompleted = interview.status === 'completed';
                                let progress = interview.progress || 0;
                                
                                if (tabValue === 1 && interview.type === 'enterprise' && interview.interviewees) {
                                     const myData = interview.interviewees.find((i: any) => (i.email || '').toLowerCase() === (user?.email || '').toLowerCase());
                                     if (myData) {
                                         isCompleted = myData.status === 'completed';
                                         progress = myData.progress || 0;
                                     }
                                }

                                return (
                                <TableRow key={interview.id} hover>
                                    <TableCell className="pl-8 py-4">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex justify-between items-center w-64">
                                                <Typography variant="body2" className="text-slate-600 font-medium">
                                                    {isCompleted ? 'Completado' : 'En Progreso'}
                                                </Typography>
                                                <Typography variant="body2" className="text-slate-400">
                                                    {Math.round(progress)}%
                                                </Typography>
                                            </div>
                                            <div className="w-64 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-[#00d4b6] rounded-full transition-all duration-500" 
                                                    style={{ width: `${progress}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-slate-600 font-medium">
                                        {formatDate(interview.createdAt)}
                                    </TableCell>
                                    <TableCell align="right" className="pr-8">
                                        {tabValue === 0 ? (
                                            // Action for Owned Interviews
                                            interview.type === 'enterprise' ? (
                                                <Button
                                                    endIcon={<ArrowForwardIcon />}
                                                    className="text-[#00d4b6] font-bold normal-case hover:bg-transparent"
                                                    onClick={() => router.push(`/report/${interview.id}`)}
                                                >
                                                    Ver Avance
                                                </Button>
                                            ) : (
                                                <Button
                                                    endIcon={<ArrowForwardIcon />}
                                                    className="text-[#00d4b6] font-bold normal-case hover:bg-transparent"
                                                    onClick={() => router.push(interview.status === 'completed' ? `/report/${interview.id}` : `/interview_micro?id=${interview.id}`)}
                                                >
                                                    {interview.status === 'completed' ? 'Ver Reporte' : 'Continuar'}
                                                </Button>
                                            )
                                        ) : (
                                            // Action for Invited Interviews
                                            <Button
                                                endIcon={<ArrowForwardIcon />}
                                                className="text-[#00d4b6] font-bold normal-case hover:bg-transparent"
                                                onClick={() => {
                                                    if (isCompleted) {
                                                        router.push(`/report/${interview.id}?u=${encodeUserIdentifier(user?.email || '')}`);
                                                    } else {
                                                        router.push(`/interview_micro?id=${interview.id}`);
                                                    }
                                                }}
                                            >
                                                {isCompleted ? 'Ver Reporte' : 'Continuar'}
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )})
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </div>
    </div>
  );
}
