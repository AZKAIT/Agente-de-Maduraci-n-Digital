'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Typography, IconButton, Button, Box, Collapse, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CloseIcon from '@mui/icons-material/Close';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { encodeUserIdentifier } from '@/lib/utils';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface InterviewCardProps {
  interviewId?: string | null;
  invitedUserEmail?: string | null;
}

const InterviewCard: React.FC<InterviewCardProps> = ({ interviewId: propInterviewId, invitedUserEmail }) => {
  const router = useRouter();
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [showChat, setShowChat] = useState(false);
  
  // Use prop ID if available, otherwise generate new session ID
  const [sessionId, setSessionId] = useState(() => propInterviewId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [role, setRole] = useState<string>('');
  const [hasStarted, setHasStarted] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const hasInitialized = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  useEffect(() => {
    return () => {
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current.currentTime = 0;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (err) {
          console.error('Error stopping media recorder on unmount', err);
        }
      }
    };
  }, []);

  const updateProgress = async (isCompleted: boolean = false) => {
     if (!sessionId) return;
     
     // Calculate new progress
     // Heuristic: 20 turns = 100%. 
     // Current progress = (chatHistory.length / 2) * 5. (Each exchange is 2 messages)
     // If isCompleted is true, force 100%.
     let currentProgress = isCompleted ? 100 : Math.min(Math.round((chatHistory.length / 2) * 5), 95);

     try {
         if (propInterviewId && (invitedUserEmail || user?.email)) {
             // Enterprise: Update parent doc array + subcollection
             const email = invitedUserEmail || user?.email;
             const parentRef = doc(db, 'interviews', propInterviewId);
             
             // 1. Update subcollection session
             if (email) {
                await setDoc(doc(db, 'interviews', propInterviewId, 'sessions', email), {
                    progress: currentProgress,
                    status: isCompleted ? 'completed' : 'active',
                    lastActive: serverTimestamp()
                }, { merge: true });
             }

             // 2. Update parent doc 'interviewees' array and 'progress'
             const parentSnap = await getDoc(parentRef);
             if (parentSnap.exists()) {
                 const data = parentSnap.data();
                 const interviewees = data.interviewees || [];
                 const updatedInterviewees = interviewees.map((i: any) => {
                     if (i.email === email) {
                         return { ...i, status: isCompleted ? 'completed' : 'active', progress: currentProgress };
                     }
                     return i;
                 });
                 
                 // Calculate overall project progress
                 // Average of all interviewees' progress
                 // If an interviewee hasn't started, their progress is 0.
                 const totalProgress = updatedInterviewees.reduce((acc: number, curr: any) => acc + (curr.progress || 0), 0);
                 const avgProgress = totalProgress / updatedInterviewees.length;

                 await updateDoc(parentRef, {
                     interviewees: updatedInterviewees,
                     progress: avgProgress,
                     status: avgProgress === 100 ? 'completed' : 'active'
                 });
             }

         } else {
             // Micro: Update main doc directly
             await updateDoc(doc(db, 'interviews', sessionId), {
                 progress: currentProgress,
                 status: isCompleted ? 'completed' : 'active'
             });
         }
     } catch (err) {
         console.error("Error updating progress:", err);
     }
  };

  const finishInterview = async () => {
    setConfirmDialogOpen(true);
  };

  const handleConfirmFinish = async () => {
      setConfirmDialogOpen(false);
      await updateProgress(true);
      setSuccessDialogOpen(true);
  };

  const handleCloseSuccess = () => {
      setSuccessDialogOpen(false);
      // Redirect logic
      if (user) {
          // Logged in user -> Dashboard (if they own it or are just a user) or Report
          // User request: "haz que cuando termine la encuesta directamente los mande al dashbor de proyecto"
          // Interpreting this as sending them to the dashboard where they can see their projects.
          router.push('/dashboard');
      } else {
          // Guest -> Register (which eventually leads to dashboard)
          router.push(`/?mode=register&u=${encodeUserIdentifier(invitedUserEmail || '')}`);
      }
  };

  // Fetch role if this is an enterprise interview
  useEffect(() => {
    const fetchRole = async () => {
      if (propInterviewId && (invitedUserEmail || user?.email)) {
        try {
          const docRef = doc(db, 'interviews', propInterviewId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.type === 'enterprise' && data.interviewees) {
              const emailToFind = (invitedUserEmail || user?.email || '').toLowerCase();
              const interviewee = data.interviewees.find((i: any) => (i.email || '').toLowerCase() === emailToFind);
              if (interviewee) {
                console.log("Role found:", interviewee.role);
                setRole(interviewee.role);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching role:", error);
        }
      }
    };
    
    fetchRole();
  }, [propInterviewId, invitedUserEmail, user]);

  useEffect(() => {
    // Only create session doc if it's a NEW session (not existing enterprise one) 
    // OR if we want to track active status for enterprise too.
    // For Enterprise, the parent doc exists. We might want to create a sub-session doc.
    if (user) {
        if (propInterviewId) {
            // Enterprise Logic: Update/Create session doc in subcollection
             const email = invitedUserEmail || user.email;
             if (email) {
                 setDoc(doc(db, 'interviews', propInterviewId, 'sessions', email), {
                    userId: user.uid,
                    userEmail: email,
                    status: 'active', // Mark as active when they open the card
                    lastActive: serverTimestamp()
                 }, { merge: true }).catch(err => console.error("Error updating enterprise session:", err));
             }
        } else {
            // Micro Logic
            setDoc(doc(db, 'interviews', sessionId), {
                userId: user.uid,
                userEmail: user.email,
                createdAt: serverTimestamp(),
                status: 'active'
            }, { merge: true }).catch(err => console.error("Error creating session doc:", err));
        }
    }
  }, [user, sessionId, propInterviewId, invitedUserEmail]);

  useEffect(() => {
    // Wait for user to start
    // If the interview was already started in a previous session (e.g. refresh), maybe we should auto-recover chat?
    // But for audio policy, we still need a click.
    // So "Comenzar" is good.
  }, []);

  const handleStart = () => {
    setHasStarted(true);
    setShowChat(true);
    // Iniciar conversación automáticamente al hacer click
    handleChat("Hola, estoy listo para el diagnóstico. Por favor inicia según el protocolo.");
  };

  const saveToFirestore = async (msgRole: 'user' | 'model', text: string) => {
    if (!sessionId) return;
    try {
      let collectionRef;
      if (propInterviewId && (invitedUserEmail || user?.email)) {
         // Enterprise: Store in subcollection for this user
         const email = invitedUserEmail || user?.email || 'unknown';
         // Sanitize email for path (replace dots?) Firestore allows dots in IDs usually, but let's be safe? 
         // Actually Firestore IDs can contain dots.
         collectionRef = collection(db, 'interviews', propInterviewId, 'sessions', email, 'messages');
      } else {
         // Micro/Standard
         collectionRef = collection(db, 'interviews', sessionId, 'messages');
      }

      await addDoc(collectionRef, {
        role: msgRole,
        text,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error guardando en Firestore:', error);
    }
  };


  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleTranscription(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accediendo al micrófono:', error);
      alert('No se pudo acceder al micrófono. Por favor verifica los permisos.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const handleTranscription = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        // Iniciar conversación con la IA usando el texto transcrito
        await handleChat(data.transcription);
      } else {
        console.error('Error transcripción:', data.error);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error enviando audio:', error);
      setIsProcessing(false);
    }
  };

  const handleChat = async (userMessage: string) => {
    try {
      // 1. Actualizar historial local y guardar en Firestore (Usuario)
      const newHistory = [...chatHistory, { role: 'user' as const, text: userMessage }];
      setChatHistory(newHistory);
      saveToFirestore('user', userMessage);

      // 2. Llamar a la API con el historial completo
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          history: chatHistory,
          interviewId: propInterviewId,
          role: role,
          userEmail: invitedUserEmail || user?.email
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        const aiText = data.response;
        
        // 3. Actualizar historial local y guardar en Firestore (IA)
        setChatHistory(prev => [...prev, { role: 'model', text: aiText }]);
        saveToFirestore('model', aiText);

        // 4. Update Progress
        await updateProgress(false);

        await handleSpeak(aiText);
      } else {
        console.error('Error IA:', data.error);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error en chat:', error);
      setIsProcessing(false);
    }
  };

  const handleSpeak = async (text: string) => {
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#/g, '')
      .replace(/`/g, '')
      .replace(/_/g, '');

    try {
      const response = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText }),
      });

      const data = await response.json();

      if (data.success) {
        if (ttsAudioRef.current) {
          ttsAudioRef.current.pause();
          ttsAudioRef.current.currentTime = 0;
        }

        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
        ttsAudioRef.current = audio;
        setIsSpeaking(true);
        setIsProcessing(false);

        audio.onended = () => {
          setIsSpeaking(false);
        };

        await audio.play();
      } else {
        console.error('Error TTS:', data.error);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error reproduciendo audio:', error);
      setIsSpeaking(false);
      setIsProcessing(false);
    }
  };

  const visibleHistory = chatHistory.filter(msg => msg.text !== "Hola, estoy listo para el diagnóstico. Por favor inicia según el protocolo.");

  return (
    <div className="flex flex-col md:flex-row justify-center items-start gap-4 w-full p-4 transition-all duration-500">
      
      {/* Side Chat Panel */}
      <Collapse in={showChat} orientation="horizontal" timeout={300} unmountOnExit>
          <div className="bg-sky-500 rounded-3xl p-6 w-full md:w-80 h-[500px] shadow-2xl flex flex-col text-white relative border border-white/10">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/10">
                    <Typography variant="h6" className="font-bold flex items-center gap-2">
                        <ChatBubbleOutlineIcon fontSize="small" />
                        Historial
                    </Typography>
                    <IconButton 
                        size="small" 
                        onClick={() => setShowChat(false)}
                        className="text-white/70 hover:text-white"
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </div>

                <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                    {visibleHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-white/50 text-center p-4">
                            <Typography variant="body2">
                                Aquí verás la transcripción de tu conversación en tiempo real.
                            </Typography>
                        </div>
                    ) : (
                        visibleHistory.map((msg, index) => (
                            <div 
                                key={index} 
                                className={`p-3 rounded-2xl text-sm max-w-[90%] shadow-sm ${
                                    msg.role === 'user' 
                                        ? 'bg-brand-indigo self-end text-white rounded-br-none border border-brand-indigo' 
                                        : 'bg-white text-brand-navy self-start rounded-bl-none shadow-md'
                                }`}
                            >
                                <Typography variant="caption" className={`block mb-1 font-bold ${msg.role === 'user' ? 'text-brand-cyan' : 'text-brand-indigo'}`}>
                                    {msg.role === 'user' ? 'Tú' : 'IA'}
                                </Typography>
                                <Typography variant="body2" className="leading-relaxed whitespace-pre-wrap">
                                    {msg.text}
                                </Typography>
                            </div>
                        ))
                    )}
                    <div ref={chatEndRef} />
                </div>
          </div>
      </Collapse>

      <div className="bg-brand-indigo rounded-3xl p-8 w-full md:w-80 lg:w-96 h-[500px] shadow-2xl flex flex-col items-center text-white relative overflow-hidden shrink-0 border border-white/10">
        
        {/* Chat Toggle Button - Moved to Left */}
        {hasStarted && (
            <div className="absolute top-4 left-4 z-10">
                <IconButton 
                    onClick={() => setShowChat(!showChat)}
                    className={`text-white/80 hover:text-white hover:bg-white/10 ${showChat ? 'bg-white/20' : ''}`}
                >
                    <ChatBubbleOutlineIcon />
                </IconButton>
            </div>
        )}

        {!hasStarted ? (
            <div className="absolute inset-0 z-50 bg-brand-indigo/95 flex flex-col items-center justify-center p-6 text-center">
                <Typography variant="h5" className="font-bold mb-4">
                    ¿Listo para comenzar?
                </Typography>
                <Typography variant="body1" className="mb-8 opacity-90">
                    Haga clic para iniciar la entrevista y activar el audio.
                </Typography>
                <Button 
                    variant="contained" 
                    size="large"
                    onClick={handleStart}
                    className="bg-white text-brand-indigo font-bold hover:bg-[#f5faff] rounded-full px-8 py-3"
                >
                    Comenzar Entrevista
                </Button>
            </div>
        ) : null}

        <Typography variant="h5" className="font-semibold mb-2">
          Entrevista en curso
        </Typography>

        <Typography variant="body2" className="text-sky-100 mb-4 text-center">
          {isRecording ? 'Escuchando...' : isSpeaking ? 'Hablando...' : 'Presiona el micrófono para hablar'}
        </Typography>

        {/* Audio Wave Visualization Placeholder */}
        <div className={`h-24 w-full flex justify-center items-center gap-1 mb-8 bg-sky-400/30 rounded-xl backdrop-blur-sm transition-opacity duration-300 ${isRecording || isSpeaking ? 'opacity-100' : 'opacity-50'}`}>
            {[...Array(20)].map((_, i) => (
                <div 
                    key={i} 
                    className={`w-1 bg-white rounded-full ${isRecording || isSpeaking ? 'animate-pulse' : ''}`}
                    style={{ 
                        height: (isRecording || isSpeaking) ? `${Math.random() * 40 + 20}%` : '4px',
                        animationDelay: `${i * 0.05}s`,
                        transition: 'height 0.2s ease'
                    }}
                />
            ))}
            <AutoAwesomeIcon className="absolute top-2 right-2 text-white/50" />
        </div>

        {/* Controls */}
        <div className="flex gap-4 mb-6">
            <IconButton 
                className={`p-4 transition-all duration-300 ${isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-sky-600 hover:bg-sky-700'}`}
                size="large"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing || isSpeaking}
            >
                {isRecording ? <StopIcon fontSize="inherit" className="text-white" /> : <MicIcon fontSize="inherit" className="text-white" />}
            </IconButton>
        </div>

        <Button 
            variant="text" 
            startIcon={<CheckCircleOutlineIcon />}
            onClick={finishInterview}
            className="text-white/70 hover:text-white normal-case"
        >
            Terminar Entrevista
        </Button>
      </div>

      {/* Custom Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        PaperProps={{
          className: "rounded-3xl p-4 bg-white shadow-2xl",
          sx: { minWidth: '320px', borderRadius: '24px' }
        }}
      >
        <DialogTitle className="text-center font-bold text-slate-800 border-b border-slate-100 pb-4">
          <Typography variant="h6" component="div" sx={{ fontFamily: 'var(--font-baloo-2)', fontWeight: 'bold' }}>
             ¿Finalizar Entrevista?
          </Typography>
        </DialogTitle>
        <DialogContent className="py-6 text-center">
          <Typography variant="body1" className="text-slate-600">
            Esto marcará tu sesión como completada y generará tu reporte.
          </Typography>
        </DialogContent>
        <DialogActions className="flex justify-center gap-4 pb-4">
          <Button 
            onClick={() => setConfirmDialogOpen(false)} 
            className="text-slate-500 hover:bg-slate-50 rounded-full px-6 normal-case font-bold"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmFinish} 
            variant="contained"
            className="bg-[#00d4b6] hover:bg-[#00bfa3] text-white rounded-full px-6 shadow-none normal-case font-bold"
            sx={{ backgroundColor: '#00d4b6', '&:hover': { backgroundColor: '#00bfa3' } }}
          >
            Finalizar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Dialog */}
      <Dialog
        open={successDialogOpen}
        onClose={handleCloseSuccess}
        PaperProps={{
            className: "rounded-3xl p-4 bg-white shadow-2xl",
            sx: { minWidth: '320px', borderRadius: '24px' }
        }}
      >
        <DialogContent className="py-8 text-center flex flex-col items-center">
            <div className="bg-green-100 p-4 rounded-full mb-4">
                <CheckCircleOutlineIcon className="text-green-500 text-5xl" />
            </div>
            <Typography variant="h5" className="font-bold text-slate-800 mb-2">
                ¡Entrevista Guardada!
            </Typography>
            <Typography variant="body1" className="text-slate-500 mb-6">
                Gracias por tu tiempo. Estamos procesando tus respuestas.
            </Typography>
            <Button 
                onClick={handleCloseSuccess} 
                variant="contained"
                className="bg-[#00d4b6] hover:bg-[#00bfa3] text-white rounded-full px-8 py-3 shadow-none normal-case font-bold text-lg w-full"
                sx={{ backgroundColor: '#00d4b6', '&:hover': { backgroundColor: '#00bfa3' } }}
            >
                Continuar
            </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InterviewCard;
