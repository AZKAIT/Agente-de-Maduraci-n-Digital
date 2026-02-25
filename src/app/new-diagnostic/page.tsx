'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  Typography, 
  Card,
  CardContent,
  Button
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BusinessIcon from '@mui/icons-material/Business';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Header from '@/components/Header';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';

export default function NewDiagnosticPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleSelectMicro = () => {
    router.push('/interview_micro');
  };

  const handleSelectEnterprise = () => {
    router.push('/enterprise-setup');
  };

  return (
    <div className="min-h-screen bg-[#f3e8ff] p-8">
        <Header showBack={true} backUrl="/dashboard" />
        <div className="max-w-5xl mx-auto mt-8">
            <div className="mb-8">
                {/* Removed manual back button as Header has it */}
                <Typography variant="h5" className="font-bold text-slate-800">
                    Configuración de Diagnóstico
                </Typography>
                <Typography variant="body1" className="text-slate-500">
                    Elige el tipo de evaluación que mejor se adapta a tus necesidades
                </Typography>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Micro Card */}
                <Card 
                    className="rounded-3xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border-none h-full flex flex-col"
                    onClick={handleSelectMicro}
                >
                    <CardContent className="p-8 flex flex-col h-full">
                        <div className="bg-sky-100 w-12 h-12 rounded-full flex items-center justify-center mb-6 text-sky-500">
                            <AccessTimeIcon />
                        </div>
                        <Typography variant="h6" className="font-bold mb-4 text-slate-800">
                            Micro
                        </Typography>
                        <Typography variant="body2" className="text-slate-500 mb-6 flex-grow">
                            Evaluación rápida y ágil para empresas que necesitan un diagnóstico inicial de su madurez en IA.
                        </Typography>
                        
                        <div className="space-y-2 mb-8">
                            <div className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-2 flex-shrink-0"></span>
                                <Typography variant="body2" className="text-slate-600">Enfoque: Agilidad y resultados inmediatos</Typography>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-2 flex-shrink-0"></span>
                                <Typography variant="body2" className="text-slate-600">Ideal para: Startups y PyMEs</Typography>
                            </div>
                             <div className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-2 flex-shrink-0"></span>
                                <Typography variant="body2" className="text-slate-600">Duración: ~5-10 minutos</Typography>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-2 flex-shrink-0"></span>
                                <Typography variant="body2" className="text-slate-600">Salida: Reporte ejecutivo con Quick Wins</Typography>
                            </div>
                        </div>

                        <div className="h-4 bg-sky-200 rounded-full w-full mt-auto"></div>
                    </CardContent>
                </Card>

                {/* Enterprise Card */}
                <Card 
                    className="rounded-3xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border-none h-full flex flex-col"
                    onClick={handleSelectEnterprise}
                >
                    <CardContent className="p-8 flex flex-col h-full">
                         <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mb-6 text-purple-500">
                            <BusinessIcon />
                        </div>
                        <Typography variant="h6" className="font-bold mb-4 text-slate-800">
                            Enterprise
                        </Typography>
                        <Typography variant="body2" className="text-slate-500 mb-6 flex-grow">
                            Evaluación profunda para organizaciones que requieren un análisis detallado y escalable.
                        </Typography>

                         <div className="space-y-2 mb-8">
                            <div className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0"></span>
                                <Typography variant="body2" className="text-slate-600">Enfoque: Profundidad, procesos y escalabilidad</Typography>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0"></span>
                                <Typography variant="body2" className="text-slate-600">Ideal para: Grandes corporativos y organizaciones maduras</Typography>
                            </div>
                             <div className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0"></span>
                                <Typography variant="body2" className="text-slate-600">Duración: ~20-30 minutos</Typography>
                            </div>
                             <div className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0"></span>
                                <Typography variant="body2" className="text-slate-600">Salida: Hoja de ruta detallada y análisis de brechas</Typography>
                            </div>
                        </div>

                        <div className="h-4 bg-purple-200 rounded-full w-full mt-auto"></div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}
