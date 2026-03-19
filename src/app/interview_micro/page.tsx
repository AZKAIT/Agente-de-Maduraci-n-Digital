'use client';

import React, { useEffect, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import InterviewCard from '@/components/InterviewCard';
import InterviewSidebar from '@/components/InterviewSidebar';
import { Typography, Box, CircularProgress, IconButton } from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { decodeUserIdentifier } from '@/lib/utils';
import { useInterviewTour } from '@/hooks/useInterviewTour';

function InterviewContent() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const sp = useSearchParams();
  const interviewId = sp ? sp.get('id') : null;
  
  const encodedUserParam = sp ? sp.get('u') : null;
  const rawUserParam = sp ? sp.get('user') : null;
  const invitedUserEmail = encodedUserParam ? decodeUserIdentifier(encodedUserParam) : rawUserParam;
  
  const [currentUserInfo, setCurrentUserInfo] = useState<{name: string, role: string} | null>(null);
  const [interviewType, setInterviewType] = useState<string | null>(null);

  useInterviewTour(!loading && !!user);

  const handleResetTour = () => {
    localStorage.removeItem('azkait_interview_tour_completed');
    window.location.reload();
  };

  useEffect(() => {
    // Security Check: 
    // If not logged in AND not an invited user (missing params), redirect to login.
    // If invited (has params), we allow access without login.
    if (!loading && !user && (!interviewId || !invitedUserEmail)) {
      router.push('/');
    }
  }, [user, loading, router, interviewId, invitedUserEmail]);

  // Fetch current user info from the interview definition if available
  useEffect(() => {
    const fetchInfo = async () => {
        if (interviewId && (invitedUserEmail || user?.email)) {
            try {
                const docSnap = await getDoc(doc(db, 'interviews', interviewId));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setInterviewType(data.type || 'micro');
                    const email = invitedUserEmail || user?.email;
                    const person = data.interviewees?.find((p: any) => p.email === email);
                    if (person) {
                        setCurrentUserInfo({ name: person.name, role: person.role });
                    }
                }
            } catch (err) {
                console.error("Error fetching user info:", err);
            }
        }
    };
    fetchInfo();
  }, [interviewId, invitedUserEmail, user]);

  if (loading) {
    return (
      <Box className="min-h-screen flex items-center justify-center bg-white">
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-brand-primary">
      <Header showBack={true} backUrl="/dashboard" />
      
      <main className="flex-1 flex flex-col p-4 sm:p-8 max-w-7xl mx-auto w-full">
        {/* Header Section */}
        <Box className="w-full mb-8 flex flex-col sm:flex-row justify-between items-center sm:items-start text-center sm:text-left gap-4">
          <div>
            <Typography variant="h4" className="font-bold text-slate-800 mb-2">
              {currentUserInfo ? `Hola, ${currentUserInfo.name}` : `Hola, ${invitedUserEmail ? invitedUserEmail.split('@')[0] : (userData?.companyName || user.email?.split('@')[0])}`}
            </Typography>
            <Typography variant="h6" className="text-slate-500 font-medium">
              {currentUserInfo ? `Rol: ${currentUserInfo.role}` : (userData?.companyName ? `Empresa: ${userData.companyName}` : 'Panel de Entrevista')}
            </Typography>
          </div>
          <IconButton 
            onClick={handleResetTour}
            title="Repetir guía de usuario"
            sx={{ color: '#94a3b8', '&:hover': { color: '#64748b', backgroundColor: 'rgba(0,0,0,0.04)' } }}
          >
            <SchoolIcon />
          </IconButton>
        </Box>

        <div className="flex flex-col xl:flex-row gap-4 items-start justify-center w-full transition-all duration-500">
             {/* Left Column: Interview Card (Includes Chat & Main) */}
             <div className="flex-shrink-0" id="tour-interview-card">
                <InterviewCard interviewId={interviewId} invitedUserEmail={invitedUserEmail} />
             </div>

             {/* Right Column: Sidebar (Only for Enterprise) */}
             {interviewType === 'enterprise' && interviewId && (
                 <div className="w-full md:w-80 flex-shrink-0 flex justify-center xl:block p-4 xl:pl-0" id="tour-interview-sidebar">
                     <InterviewSidebar 
                        interviewId={interviewId} 
                        currentEmail={invitedUserEmail || user.email} 
                     />
                 </div>
             )}
        </div>
      </main>
    </div>
  );
}

export default function InterviewPage() {
  return (
    <Suspense fallback={<CircularProgress />}>
      <InterviewContent />
    </Suspense>
  );
}
