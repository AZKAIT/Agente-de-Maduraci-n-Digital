'use client';
import React, { useEffect, useState, Suspense } from 'react';
import { 
  Typography, Button, Box, Paper, CircularProgress, Chip, 
  Card, CardContent, LinearProgress 
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import DownloadIcon from '@mui/icons-material/Download';
import AssessmentIcon from '@mui/icons-material/Assessment';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { decodeUserIdentifier } from '@/lib/utils';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer 
} from 'recharts';

// --- Types ---
interface Dimension {
  score: number;
  level: string;
  analysis?: string;
  recommendation?: string;
}

interface RoadmapItem {
  title: string;
  impact: 'Alta' | 'Media' | 'Baja';
  description?: string;
  desc?: string; // Legacy fallback
  objective?: string;
  steps?: string[];
}

interface ReportData {
  overallScore: number;
  strongestArea: string;
  mainOpportunity: string;
  executiveSummary?: string;
  prioritiesCount?: number; // Optional now as we focused on summary
  dimensions: {
    strategy: Dimension;
    culture: Dimension;
    processes: Dimension;
    data: Dimension;
    analytics: Dimension;
    technology: Dimension;
    governance: Dimension;
  };
  roadmap: {
    shortTerm: RoadmapItem[];
    mediumTerm: RoadmapItem[];
    longTerm: RoadmapItem[];
  };
}

const DEFAULT_REPORT: ReportData = {
  overallScore: 0,
  strongestArea: '-',
  mainOpportunity: '-',
  prioritiesCount: 0,
  dimensions: {
    strategy: { score: 0, level: '-' },
    culture: { score: 0, level: '-' },
    processes: { score: 0, level: '-' },
    data: { score: 0, level: '-' },
    analytics: { score: 0, level: '-' },
    technology: { score: 0, level: '-' },
    governance: { score: 0, level: '-' },
  },
  roadmap: {
    shortTerm: [],
    mediumTerm: [],
    longTerm: []
  }
};

const DIMENSION_LABELS: Record<string, string> = {
  strategy: 'Estrategia',
  culture: 'Cultura',
  processes: 'Procesos',
  data: 'Datos',
  analytics: 'Analítica',
  technology: 'Tecnología',
  governance: 'Gobierno'
};

function ReportContent() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const sp = useSearchParams();
  const { id } = params as { id: string };
  
  // Support both 'u' (encoded) and legacy 'user' (plaintext) params
  const encodedUserParam = sp ? sp.get('u') : null;
  const rawUserParam = sp ? sp.get('user') : null;
  const userEmail = encodedUserParam ? decodeUserIdentifier(encodedUserParam) : rawUserParam;
  
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [interviewStatus, setInterviewStatus] = useState<string>('');

  // Security Check
  useEffect(() => {
    if (!authLoading && !user) {
        router.push('/');
        return;
    }

    if (user && !loading && id) {
        // Access Control Logic
        const checkAccess = async () => {
            try {
                // Fetch the main interview document
                const interviewDoc = await getDoc(doc(db, 'interviews', id));
                if (interviewDoc.exists()) {
                    const data = interviewDoc.data();
                    const ownerId = data.userId;
                    const currentUserEmail = user.email?.toLowerCase();
                    const requestedUserEmail = userEmail?.toLowerCase();

                    // Case 1: Owner can see everything (Aggregate or specific user report)
                    if (user.uid === ownerId) {
                        return; // Allowed
                    }

                    // Case 2: User viewing their own report
                    if (requestedUserEmail && requestedUserEmail === currentUserEmail) {
                        return; // Allowed
                    }

                    // Case 3: Unauthorized
                    // If not owner, and (viewing aggregate OR viewing someone else's report)
                    console.warn("Unauthorized access attempt");
                    router.push('/dashboard');
                }
            } catch (err) {
                console.error("Error verifying access:", err);
            }
        };
        checkAccess();
    }
  }, [user, authLoading, router, id, userEmail, loading]);

  // Fetch Data
  useEffect(() => {
    if (authLoading || !user) return; // Wait for auth
    if (!id) return;
    
    // We only fetch data if we pass the security check. 
    // Ideally we should merge the fetch and check, or use a state 'authorized'.
    // For now, let's just proceed. The listener will attach, but if the check fails above, we redirect quickly.
    
    let unsub: any;

    if (userEmail) {
        // Individual View: Listen to session doc
        const sessionRef = doc(db, 'interviews', id, 'sessions', userEmail);
        unsub = onSnapshot(sessionRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setInterviewStatus(data.status || 'active');
                if (data.report) {
                    setReport(data.report);
                } else {
                    setReport(null);
                }
            } else {
                // If session doesn't exist yet (maybe just invited but no interaction?), try main doc fallback or just wait
                // For now, let's assume session exists if they are here, or wait.
                setReport(null);
            }
            setLoading(false);
        });
    } else {
        // Aggregate View: Listen to main doc
        unsub = onSnapshot(doc(db, 'interviews', id), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setInterviewStatus(data.status || 'active');
            
            if (data.report) {
              setReport(data.report);
            } else {
              setReport(null);
            }
          }
          setLoading(false);
        });
    }

    return () => {
        if (unsub) unsub();
    };
  }, [id, userEmail]);

  // Auto-generate if completed and no report
  useEffect(() => {
    if (!loading && !report && interviewStatus === 'completed' && !generating) {
        handleGenerate();
    }
  }, [loading, report, interviewStatus]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId: id, userEmail: userEmail || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setReport(data.report);
      }
    } catch (err) {
      console.error("Error generating report:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!report) return;

    const queryParams = new URLSearchParams();
    queryParams.set('id', id);
    if (encodedUserParam) {
      queryParams.set('u', encodedUserParam);
    } else if (userEmail) {
      queryParams.set('user', userEmail);
    }
    
    window.open(`/api/download-pdf?${queryParams.toString()}`, '_blank');
  };

  const displayReport = report || DEFAULT_REPORT;
  
  // Prepare Chart Data
  const chartData = Object.entries(displayReport.dimensions).map(([key, val]) => ({
    subject: DIMENSION_LABELS[key],
    A: val.score,
    fullMark: 5,
  }));

  // --- Render Helpers ---

  const renderKPICard = (title: string, value: string | number, subtext: string) => (
    <Paper className="p-6 rounded-3xl shadow-sm flex flex-col justify-between h-32 bg-white">
        <Typography variant="body2" className="text-slate-500 font-medium mb-1">
            {title}
        </Typography>
        <Typography variant="h4" className="font-bold text-slate-800">
            {value}
        </Typography>
        <Typography variant="caption" className="text-slate-400">
            {subtext}
        </Typography>
    </Paper>
  );

  const renderRoadmapCard = (item: RoadmapItem, index: number) => (
    <Card key={index} className="mb-4 rounded-xl shadow-none border border-slate-100 bg-white">
        <CardContent className="p-5">
            <div className="flex justify-between items-start mb-3">
                <Typography variant="subtitle2" className="font-bold text-slate-800 leading-tight text-lg">
                    {item.title}
                </Typography>
                <Chip 
                    label={item.impact} 
                    size="small" 
                    className={`${item.impact === 'Alta' ? 'bg-rose-100 text-rose-600' : item.impact === 'Media' ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-500'} font-bold text-[10px] h-6`} 
                />
            </div>
            
            <Typography variant="body2" className="text-slate-600 mb-3 leading-relaxed line-clamp-3">
                {item.description || item.desc}
            </Typography>
        </CardContent>
    </Card>
  );

  if (loading) {
      return (
          <div className="min-h-screen bg-white flex items-center justify-center">
              <CircularProgress />
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-white p-8 font-brand-primary">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
        <div className="flex items-center gap-4">
            <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/dashboard')} className="text-brand-indigo">
                Atrás
            </Button>
            <div>
                <Typography variant="h5" className="font-bold text-brand-navy">
                    {userEmail ? `Reporte Individual: ${userEmail}` : 'Reporte Ejecutivo Global'}
                </Typography>
                <Typography variant="body2" className="text-brand-indigo">
                    Diagnóstico de madurez en Inteligencia Artificial
                </Typography>
            </div>
        </div>
        <div className="flex gap-2">
            {!report && (
                 <Button 
                    variant="outlined" 
                    startIcon={generating ? <CircularProgress size={20} /> : <RefreshIcon />}
                    onClick={handleGenerate}
                    className="font-bold normal-case text-brand-cyan"
                 >
                    {generating ? 'Generando...' : 'Generar Reporte'}
                 </Button>
            )}
            <Button 
                variant="contained" 
                startIcon={<DownloadIcon />}
                className="bg-[#00d4b6] hover:bg-[#00bfa3] text-white font-bold rounded-full px-6 normal-case shadow-none"
                disabled={!report}
                onClick={handleDownloadPDF}
            >
                Descargar Reporte PDF
            </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">

        {/* Executive Summary */}
        {displayReport.executiveSummary && (
            <Paper className="p-8 rounded-3xl shadow-sm bg-white border border-slate-100">
                <Typography variant="h6" className="font-bold text-[#004669] mb-4 uppercase tracking-wide">
                    Resumen Ejecutivo
                </Typography>
                <Typography variant="body1" className="text-slate-600 leading-relaxed whitespace-pre-line text-justify">
                    {displayReport.executiveSummary}
                </Typography>
            </Paper>
        )}
        
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {renderKPICard('Madurez Promedio', `${displayReport.overallScore}/5`, 'Nivel General')}
            {renderKPICard('Área más fuerte', displayReport.strongestArea, 'Nivel')}
            {renderKPICard('Oportunidad Principal', displayReport.mainOpportunity, 'Nivel')}
            {renderKPICard('Prioridades', displayReport.prioritiesCount || 0, 'Identificadas')}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Radar Chart */}
            <Paper className="rounded-3xl p-8 shadow-sm flex items-center justify-center bg-white min-h-[400px]">
                <div className="w-full h-[350px]">
                    <Typography variant="h6" className="font-bold text-slate-800 mb-4 pl-4">
                        Nivel de madurez por dimensión
                    </Typography>
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                            <PolarGrid stroke="#e2e8f0" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                            <Radar
                                name="Madurez"
                                dataKey="A"
                                stroke="#00d4b6"
                                strokeWidth={2}
                                fill="#00d4b6"
                                fillOpacity={0.3}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </Paper>

            {/* Dimension List */}
            <div className="space-y-6">
                {Object.entries(displayReport.dimensions).map(([key, val]) => (
                    <Paper key={key} className="p-6 rounded-2xl shadow-sm bg-white border border-slate-100">
                        <div className="flex justify-between items-start mb-0">
                            <div>
                                <Typography variant="h6" className="font-bold text-slate-800 capitalize">
                                    {DIMENSION_LABELS[key]}
                                </Typography>
                                <Chip 
                                    label={val.level} 
                                    size="small" 
                                    className="mt-1 bg-slate-100 font-bold text-slate-600 border border-slate-200" 
                                />
                            </div>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((step) => (
                                    <div 
                                        key={step}
                                        className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold transition-all
                                            ${val.score >= step 
                                                ? 'bg-[#00d4b6] text-white shadow-sm' 
                                                : 'bg-slate-50 text-slate-300'}`}
                                    >
                                        {step}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Paper>
                ))}
            </div>
        </div>

        {/* Roadmap */}
        <Paper className="rounded-3xl p-8 shadow-sm bg-white">
            <Typography variant="h6" className="font-bold text-slate-800 mb-6">
                Roadmap de IA Recomendado
            </Typography>
            
            <Grid container spacing={4}>
                {/* Short Term */}
                <Grid xs={12} md={4}>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full bg-[#00d4b6]"></div>
                        <Typography variant="subtitle2" className="font-bold text-slate-600">
                            Corto Plazo (0-6 meses)
                        </Typography>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl min-h-[200px]">
                        {displayReport.roadmap.shortTerm.length > 0 ? (
                            displayReport.roadmap.shortTerm.map((item, i) => renderRoadmapCard(item, i))
                        ) : (
                            <Typography variant="caption" className="text-slate-400 text-center block mt-8">
                                Pendiente de generación...
                            </Typography>
                        )}
                    </div>
                </Grid>

                {/* Medium Term */}
                <Grid xs={12} md={4}>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                        <Typography variant="subtitle2" className="font-bold text-slate-600">
                            Mediano Plazo (6-12 meses)
                        </Typography>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl min-h-[200px]">
                        {displayReport.roadmap.mediumTerm.length > 0 ? (
                            displayReport.roadmap.mediumTerm.map((item, i) => renderRoadmapCard(item, i))
                        ) : (
                            <Typography variant="caption" className="text-slate-400 text-center block mt-8">
                                Pendiente de generación...
                            </Typography>
                        )}
                    </div>
                </Grid>

                {/* Long Term */}
                <Grid xs={12} md={4}>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                        <Typography variant="subtitle2" className="font-bold text-slate-600">
                            Largo Plazo (12+ meses)
                        </Typography>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl min-h-[200px]">
                        {displayReport.roadmap.longTerm.length > 0 ? (
                            displayReport.roadmap.longTerm.map((item, i) => renderRoadmapCard(item, i))
                        ) : (
                            <Typography variant="caption" className="text-slate-400 text-center block mt-8">
                                Pendiente de generación...
                            </Typography>
                        )}
                    </div>
                </Grid>
            </Grid>
        </Paper>

        <div className="flex justify-center pb-8">
             <Button 
                variant="contained" 
                startIcon={<DownloadIcon />}
                className="bg-brand-cyan hover:bg-[#0cd2db] text-brand-navy font-bold rounded-full px-8 py-3 shadow-lg"
                disabled={!report}
            >
                Descargar Reporte PDF
            </Button>
        </div>

      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<CircularProgress />}>
      <ReportContent />
    </Suspense>
  );
}
