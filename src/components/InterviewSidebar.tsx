'use client';

import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Avatar,
  Paper,
  Chip
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, collection } from 'firebase/firestore';

interface Interviewee {
  name: string;
  role: string;
  email: string;
}

interface SessionStatus {
  status: 'pending' | 'active' | 'completed';
  lastActive: any;
  progress?: number;
}

interface InterviewSidebarProps {
  interviewId: string;
  currentEmail?: string | null;
}

export default function InterviewSidebar({ interviewId, currentEmail }: InterviewSidebarProps) {
  const [interviewees, setInterviewees] = useState<Interviewee[]>([]);
  const [statuses, setStatuses] = useState<Record<string, SessionStatus>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!interviewId) return;

    // 1. Subscribe to parent document to get the list of planned interviewees
    const unsubParent = onSnapshot(doc(db, 'interviews', interviewId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.interviewees) {
          setInterviewees(data.interviewees);
        }
      }
      setLoading(false);
    });

    // 2. Subscribe to sessions subcollection to get real-time status updates
    const unsubSessions = onSnapshot(collection(db, 'interviews', interviewId, 'sessions'), (snapshot) => {
      const newStatuses: Record<string, SessionStatus> = {};
      snapshot.docs.forEach(doc => {
        // The doc ID is the email
        const data = doc.data();
        newStatuses[doc.id] = {
          status: data.status as 'pending' | 'active' | 'completed',
          lastActive: data.lastActive,
          progress: data.progress || 0
        };
      });
      setStatuses(newStatuses);
    });

    return () => {
      unsubParent();
      unsubSessions();
    };
  }, [interviewId]);

  const getStatusConfig = (email: string) => {
    // Check both local statuses (real-time) and initial interviewees list data
    // Prioritize local status update if available, otherwise fallback to interviewee data
    const session = statuses[email];
    
    // Find the person in the interviewees array to check their stored status/progress
    const personData = interviewees.find(p => p.email === email);
    
    // Determine effective status
    let status = session?.status || (personData as any)?.status || 'pending';
    let progress = session?.progress || (personData as any)?.progress || 0;

    switch (status) {
      case 'completed':
        return {
          status: 'completed',
          color: '#00d4b6', // Teal
          icon: <CheckCircleIcon sx={{ color: '#fff', fontSize: 20 }} />,
          label: 'Completada',
          bg: 'bg-[#00d4b6]',
          progress: 100
        };
      case 'active':
        return {
          status: 'active',
          color: '#38bdf8', // Sky blue
          icon: <RadioButtonCheckedIcon sx={{ color: '#fff', fontSize: 20 }} className="animate-pulse" />,
          label: `En curso (${progress}%)`,
          bg: 'bg-sky-400',
          progress: progress
        };
      default:
        return {
          status: 'pending',
          color: '#94a3b8', // Slate 400
          icon: <RadioButtonUncheckedIcon sx={{ color: '#fff', fontSize: 20 }} />,
          label: 'Pendiente',
          bg: 'bg-slate-400',
          progress: 0
        };
    }
  };

  if (loading) {
    return null;
  }

  return (
    <Paper 
        className="w-full md:w-80 h-fit rounded-3xl p-6 bg-brand-indigo text-white shadow-xl"
        elevation={0}
        sx={{ backgroundColor: '#152084' }}
    >
      <Typography variant="h6" className="font-bold mb-6 text-white">
        Participantes
      </Typography>

      <List className="flex flex-col gap-3">
        {interviewees.map((person, index) => {
          const config = getStatusConfig(person.email);
          const isMe = currentEmail === person.email;

          return (
            <div 
                key={index}
                className={`
                    relative overflow-hidden rounded-2xl p-3 pr-4 transition-all duration-300
                    ${isMe ? 'bg-white/20 border border-white/30' : 'bg-white/10 border border-white/10'}
                `}
            >
                <div className="flex items-center gap-3">
                    <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center shadow-sm
                        ${config.bg}
                    `}>
                        {config.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                                <Typography variant="body2" className="font-bold text-white truncate">
                                    {person.name}
                                </Typography>
                                <Typography variant="caption" className="text-sky-100 block truncate">
                                    {person.role}
                                </Typography>
                                {config.status !== 'pending' && config.status !== 'completed' && (
                                    <div className="w-full h-1 bg-white/20 rounded-full mt-2 overflow-hidden">
                                        <div 
                                            className="h-full bg-white transition-all duration-500" 
                                            style={{ width: `${config.progress}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                </div>
                
                <div className="absolute top-3 right-3">
                     <Typography variant="caption" className="text-white/80 font-medium text-[10px] uppercase tracking-wider">
                        {config.label}
                    </Typography>
                </div>
            </div>
          );
        })}
      </List>
    </Paper>
  );
}
