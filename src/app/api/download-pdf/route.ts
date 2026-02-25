import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import puppeteer from 'puppeteer';
import { decodeUserIdentifier } from '@/lib/utils';

// Helper to fetch report data
async function fetchReport(id: string, userEmail: string | null) {
  if (userEmail) {
    const sessionRef = doc(db, 'interviews', id, 'sessions', userEmail);
    const sessionSnap = await getDoc(sessionRef);
    if (sessionSnap.exists() && sessionSnap.data().report) {
      return sessionSnap.data().report;
    }
  } else {
    const docRef = doc(db, 'interviews', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().report) {
      return docSnap.data().report;
    }
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userParam = searchParams.get('user');
    const encodedUser = searchParams.get('u');

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    let userEmail = userParam;
    if (encodedUser) {
        userEmail = decodeUserIdentifier(encodedUser);
    }

    const report = await fetchReport(id, userEmail);

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const html = getHtmlTemplate(report, userEmail || 'Organización');

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Set content and wait for Tailwind to load/render
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px'
      }
    });

    await browser.close();

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Reporte_AzkaIT_${userEmail || 'Executive'}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error('PDF Generation Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function getHtmlTemplate(report: any, userName: string) {
  const dateStr = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  
  // Helpers
  const renderScoreBar = (score: number) => {
    const percentage = (score / 5) * 100;
    return `
      <div class="w-full bg-azka-dark/20 rounded-full h-1.5 mt-2 overflow-hidden">
        <div class="bg-azka-teal h-full rounded-full" style="width: ${percentage}%"></div>
      </div>
    `;
  };

  const getPageLayout = (content: string, pageNum: number) => `
    <div style="width: 210mm; height: 297mm; position: relative; background-color: #00122b; overflow: hidden; page-break-after: always;">
        <!-- HEADER GRAPHICS -->
        <div class="absolute top-0 left-0 w-full h-4 bg-azka-accent z-20"></div>
        
        <!-- Top Right Decor -->
        <div class="absolute top-0 right-0 w-[500px] h-[300px] z-10 overflow-hidden pointer-events-none">
             <div class="absolute top-[-40px] right-[100px] w-12 h-96 bg-azka-teal transform rotate-45 rounded-full opacity-90"></div>
             <div class="absolute top-[-80px] right-[40px] w-12 h-96 bg-azka-dark transform rotate-45 rounded-full"></div>
             <div class="absolute top-[40px] right-[-40px] w-24 h-32 bg-azka-teal transform rotate-45 rounded-full opacity-80"></div>
        </div>

        <!-- HEADER CONTENT (Logo & Date) -->
        <div class="relative z-30 px-16 pt-12 pb-2 flex justify-between items-start">
            <div class="flex flex-col">
                <div class="flex items-center gap-3">
                    <svg width="32" height="32" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" class="rounded-full shadow-sm">
                      <defs>
                        <radialGradient id="g1" cx="50%" cy="30%" r="70%">
                          <stop offset="0%" stop-color="#00E4EF"/>
                          <stop offset="60%" stop-color="#152084"/>
                          <stop offset="100%" stop-color="#00122b"/>
                        </radialGradient>
                        <linearGradient id="wave1" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stop-color="#00E4EF"/>
                          <stop offset="100%" stop-color="#1B006A"/>
                        </linearGradient>
                        <linearGradient id="wave2" x1="1" y1="0" x2="0" y2="1">
                          <stop offset="0%" stop-color="#152084"/>
                          <stop offset="100%" stop-color="#00122b"/>
                        </linearGradient>
                      </defs>
                      <circle cx="64" cy="64" r="62" fill="url(#g1)"/>
                      <path d="M16,64 C40,40 72,36 112,56" fill="none" stroke="url(#wave1)" stroke-width="14" opacity="0.85"/>
                      <path d="M16,86 C44,68 78,72 112,92" fill="none" stroke="url(#wave2)" stroke-width="12" opacity="0.8"/>
                    </svg>
                    <h1 class="text-2xl font-bold tracking-tight text-white">AZKA IT</h1>
                </div>
                <p class="text-[8px] tracking-[0.3em] text-azka-teal uppercase mt-1 ml-1">Consultoría Estratégica</p>
            </div>
            <div class="text-right mt-1 pr-4">
                 <p class="text-[8px] font-bold text-azka-light uppercase tracking-wider mb-0.5">Fecha</p>
                 <p class="text-xs text-white font-medium">${dateStr}</p>
            </div>
        </div>

        <!-- CONTENT AREA -->
        <div class="px-16 py-4 relative z-30 flex flex-col justify-start h-[230mm] bg-white rounded-t-3xl rounded-b-3xl shadow-xl mt-4">
            ${content}
        </div>

        <!-- FOOTER GRAPHICS -->
        <div class="absolute bottom-0 left-0 w-full h-4 bg-azka-dark z-20"></div>
        <div class="absolute bottom-0 left-0 w-[400px] h-[200px] z-10 overflow-hidden pointer-events-none">
             <div class="absolute bottom-[-40px] left-[100px] w-10 h-80 bg-azka-teal transform rotate-45 rounded-full opacity-90"></div>
             <div class="absolute bottom-[-80px] left-[40px] w-10 h-80 bg-azka-dark transform rotate-45 rounded-full"></div>
             <div class="absolute bottom-[20px] left-[-30px] w-20 h-24 bg-azka-teal transform rotate-45 rounded-full opacity-80"></div>
        </div>

        <!-- FOOTER CONTENT -->
        <div class="absolute bottom-8 left-0 w-full text-center z-30">
            <div class="flex justify-center gap-8 text-[9px] text-white font-bold uppercase tracking-wider bg-azka-dark/80 py-1 backdrop-blur-sm inline-block px-4 rounded-full mx-auto">
                 <span class="flex items-center gap-2">
                    📞 +52 (55) 1234 5678
                 </span>
                 <span class="flex items-center gap-2">
                    🌐 www.azkait.com
                 </span>
                 <span class="flex items-center gap-2">
                    📍 Ciudad de México
                 </span>
            </div>
        </div>
        
        <!-- PAGE NUMBER -->
        <div class="absolute bottom-10 right-12 z-30 text-[9px] font-bold text-azka-teal">
            PÁGINA ${pageNum}
        </div>
    </div>
  `;

  // --- PAGE 1: COVER ---
  const coverContent = `
    <!-- RECIPIENT SECTION -->
    <div class="mb-16 mt-8">
        <p class="text-xs font-bold text-azka-light uppercase tracking-wider mb-2">Preparado Para:</p>
        <h2 class="text-3xl font-bold text-slate-800 uppercase tracking-tight mb-2">${userName}</h2>
        <div class="w-16 h-1 bg-azka-teal rounded-full mb-4"></div>
        <p class="text-sm text-slate-500 max-w-md leading-relaxed">
            Presentamos el reporte ejecutivo de diagnóstico de madurez digital e Inteligencia Artificial, diseñado para guiar su estrategia de transformación.
        </p>
    </div>

    <!-- EXECUTIVE SUMMARY CARD -->
    <div class="bg-slate-50 rounded-2xl p-8 border border-slate-100 shadow-sm relative mb-12">
        <div class="absolute top-0 left-8 w-12 h-1 bg-azka-dark rounded-b-lg"></div>
        <h3 class="text-sm font-bold text-azka-dark mb-6 uppercase tracking-widest flex items-center gap-2">
            Resumen Ejecutivo
        </h3>
        <div class="text-sm text-slate-600 leading-7 text-justify space-y-4 font-medium">
            ${report.executiveSummary ? formatText(report.executiveSummary) : '<p>El diagnóstico revela un posicionamiento interesante en el mercado...</p>'}
        </div>
    </div>

    <!-- METRICS ROW -->
    <div class="grid grid-cols-3 gap-8">
        <div class="text-center p-4">
            <span class="block text-5xl font-bold text-azka-teal mb-2">${report.overallScore}</span>
            <span class="text-xs font-bold text-azka-light uppercase tracking-widest">Nivel de Madurez</span>
        </div>
        <div class="col-span-2 flex items-center justify-around bg-white border border-azka-light rounded-xl p-4 shadow-sm">
             <div class="text-left">
                <span class="text-[10px] font-bold text-azka-light uppercase tracking-widest block mb-1">Fortaleza</span>
                <span class="text-lg font-bold text-azka-dark">${report.strongestArea}</span>
             </div>
             <div class="w-px h-10 bg-azka-light"></div>
             <div class="text-left">
                <span class="text-[10px] font-bold text-azka-light uppercase tracking-widest block mb-1">Oportunidad</span>
                <span class="text-lg font-bold text-azka-dark">${report.mainOpportunity}</span>
             </div>
        </div>
    </div>
  `;

  // --- PAGE 2: ANALYSIS ---
  const dimensions = Object.entries(report.dimensions).map(([key, val]: any) => ({
    name: mapDimensionName(key),
    ...val
  }));

  const chunkArray = (array: any[], size: number) => {
    const chunked = [];
    for (let i = 0; i < array.length; i += size) {
        chunked.push(array.slice(i, i + size));
    }
    return chunked;
  };

  const renderDimensionCard = (dim: any) => `
    <div class="break-inside-avoid">
        <div class="flex justify-between items-end mb-2">
            <div class="flex items-center gap-2">
                <h4 class="font-bold text-azka-dark text-base">${dim.name}</h4>
                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white text-azka-light border border-azka-light uppercase tracking-wider">
                    ${dim.level}
                </span>
            </div>
            <div class="w-24">
                <div class="flex justify-between text-[10px] font-bold text-azka-muted mb-0.5">
                    <span>Score</span>
                    <span class="text-azka-teal">${dim.score}/5</span>
                </div>
                ${renderScoreBar(dim.score)}
            </div>
        </div>
        
        <div class="bg-white rounded-xl p-4 border border-azka-light">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <p class="text-[9px] font-bold text-azka-light uppercase tracking-widest mb-1.5">Hallazgos</p>
                    <p class="text-[10px] text-azka-dark leading-relaxed text-justify">
                        ${dim.analysis || dim.Analysis || 'Análisis no disponible.'}
                    </p>
                </div>
                <div class="relative pl-4 border-l border-azka-light">
                     <div class="absolute top-0 left-[-2px] w-1 h-6 bg-azka-accent rounded-r-full"></div>
                     <p class="text-[9px] font-bold text-azka-light uppercase tracking-widest mb-1.5">Recomendación</p>
                     <p class="text-[10px] text-azka-dark leading-relaxed font-medium">
                        ${dim.recommendation || dim.Recommendation || 'Definir plan de acción.'}
                     </p>
                </div>
            </div>
        </div>
    </div>
  `;

  // --- PAGE 3: ROADMAP TRIPTYCH ---
  const triptychContent = `
    <div class="mb-8 border-b border-azka-light pb-4">
        <h3 class="text-xl font-bold text-azka-dark">Roadmap Estratégico</h3>
        <p class="text-xs text-azka-light mt-1">Visión General de Transformación (Horizonte Temporal)</p>
    </div>

    <div class="grid grid-cols-3 gap-4 h-[700px]">
        <!-- NOW -->
        <div class="bg-white rounded-2xl p-4 border border-azka-dark flex flex-col h-full">
            <div class="mb-6 pb-4 border-b border-azka-dark text-center">
                <h4 class="text-2xl font-bold text-azka-dark mb-1">Corto Plazo</h4>
                <span class="inline-block px-2 py-1 bg-white rounded text-[10px] font-bold text-azka-light border border-azka-light uppercase tracking-wider">0-6 meses</span>
            </div>
            <div class="space-y-4 overflow-y-auto">
                ${renderSimpleItems(report.roadmap.shortTerm, 'bg-azka-dark')}
            </div>
        </div>

        <!-- NEXT -->
        <div class="bg-white rounded-2xl p-4 border border-azka-deep flex flex-col h-full">
             <div class="mb-6 pb-4 border-b border-azka-deep text-center">
                <h4 class="text-2xl font-bold text-azka-light mb-1">Mediano Plazo</h4>
                <span class="inline-block px-2 py-1 bg-white rounded text-[10px] font-bold text-azka-light border border-azka-light uppercase tracking-wider">6-12 meses</span>
            </div>
            <div class="space-y-4 overflow-y-auto">
                ${renderSimpleItems(report.roadmap.mediumTerm, 'bg-azka-light')}
            </div>
        </div>

        <!-- FUTURE -->
        <div class="bg-white rounded-2xl p-4 border border-azka-teal flex flex-col h-full">
             <div class="mb-6 pb-4 border-b border-azka-teal text-center">
                <h4 class="text-2xl font-bold text-azka-teal mb-1">Largo Plazo</h4>
                <span class="inline-block px-2 py-1 bg-white rounded text-[10px] font-bold text-azka-light border border-azka-light uppercase tracking-wider">+12 meses</span>
            </div>
            <div class="space-y-4 overflow-y-auto">
                ${renderSimpleItems(report.roadmap.longTerm, 'bg-azka-teal')}
            </div>
        </div>
    </div>
  `;

  // --- PAGES 4-6: DETAILED ROADMAP ---
  const renderDetailedRoadmap = (items: any[], title: string, subtitle: string, colorClass: string) => `
    <div class="mb-4 flex items-end justify-between border-b border-azka-light pb-2">
        <div>
            <h3 class="text-3xl font-bold ${colorClass.replace('bg-', 'text-')} mb-0.5">${title}</h3>
            <p class="text-xs text-azka-muted font-medium">${subtitle}</p>
        </div>
        <div class="text-right">
             <span class="text-[10px] font-bold text-azka-light uppercase tracking-wider">Plan de Implementación</span>
        </div>
    </div>

    <div class="space-y-4">
        ${renderRoadmapItems(items)}
    </div>
  `;

  // BUILD PAGES
  let pages = [];
  let pageCounter = 1;

  // 1. Cover
  pages.push(getPageLayout(coverContent, pageCounter++));

  // 2. Analysis (Chunked)
  const dimensionChunks = chunkArray(dimensions, 3);
  dimensionChunks.forEach((chunk, index) => {
    const content = `
        <div class="mb-6 border-b border-azka-light pb-2">
            <h3 class="text-xl font-bold text-azka-dark">Análisis</h3>
            <p class="text-xs text-azka-light mt-1">Evaluación profunda de capacidades</p>
        </div>
        <div class="space-y-4">
            ${chunk.map((dim: any) => renderDimensionCard(dim)).join('')}
        </div>
    `;
    pages.push(getPageLayout(content, pageCounter++));
  });

  // 3. Triptych
  pages.push(getPageLayout(triptychContent, pageCounter++));

  // 4. Detailed Roadmaps
  if (report.roadmap.shortTerm) pages.push(getPageLayout(renderDetailedRoadmap(report.roadmap.shortTerm, 'Corto Plazo', '0-6 meses', 'bg-azka-dark'), pageCounter++));
  if (report.roadmap.mediumTerm) pages.push(getPageLayout(renderDetailedRoadmap(report.roadmap.mediumTerm, 'Mediano Plazo', '6-12 meses', 'bg-azka-light'), pageCounter++));
  if (report.roadmap.longTerm) pages.push(getPageLayout(renderDetailedRoadmap(report.roadmap.longTerm, 'Largo Plazo', '+12 meses', 'bg-azka-teal'), pageCounter++));

  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=Montserrat:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Poppins', sans-serif; -webkit-print-color-adjust: exact; }
        h1,h2,h3,h4,h5 { font-family: 'Montserrat', sans-serif; }
        .page-break { page-break-before: always; }
        .break-inside-avoid { break-inside: avoid; }
        .bg-azka-dark { background-color: #00122b; }
        .text-azka-dark { color: #00122b; }
        .bg-azka-light { background-color: #152084; }
        .text-azka-light { color: #152084; }
        .bg-azka-teal { background-color: #00E4EF; }
        .text-azka-teal { color: #00E4EF; }
        .bg-azka-deep { background-color: #1B006A; }
        .text-azka-deep { color: #1B006A; }
        .bg-azka-accent { background-color: #ef8100; }
        .text-azka-accent { color: #ef8100; }
        .text-azka-muted { color: #152084; }
        .border-azka-dark { border-color: #00122b; }
        .border-azka-light { border-color: #152084; }
        .border-azka-deep { border-color: #1B006A; }
        .border-azka-teal { border-color: #00E4EF; }
        .border-azka-accent { border-color: #ef8100; }
        /* Custom scrollbar hide */
        ::-webkit-scrollbar { display: none; }
    </style>
</head>
<body class="bg-white text-azka-dark">
    ${pages.join('')}
</body>
</html>
  `;
}

function mapDimensionName(key: string) {
    const map: Record<string, string> = {
        strategy: 'Estrategia',
        culture: 'Cultura',
        processes: 'Procesos',
        data: 'Datos',
        analytics: 'Analítica',
        technology: 'Tecnología',
        governance: 'Gobierno'
    };
    return map[key] || key;
}

function formatText(text: string) {
    if (!text) return '';
    return text.split('\n').map(p => `<p>${p}</p>`).join('');
}

function renderSimpleItems(items: any[], colorClass: string) {
    if (!items || items.length === 0) return '<p class="text-xs text-slate-400 italic text-center py-4">Sin iniciativas</p>';
    
    return items.map(item => {
        const title = item.title || item.Title;
        const impact = item.impact || item.Impact;
        const description = item.description || item.Description || item.desc;
        
        return `
        <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
            <div class="absolute top-0 left-0 w-1 h-full ${getImpactColor(impact)}"></div>
            <div class="pl-3">
                <div class="flex justify-between items-start mb-2">
                    <h5 class="font-bold text-slate-800 text-xs leading-tight w-3/4">${title}</h5>
                    <span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-50 text-slate-400 border border-slate-100">
                        ${impact}
                    </span>
                </div>
                ${description ? `
                <p class="text-[10px] text-slate-500 leading-snug line-clamp-3">
                    ${description}
                </p>
                ` : ''}
            </div>
        </div>
        `;
    }).join('');
}

function renderRoadmapItems(items: any[]) {
    if (!items || items.length === 0) return '<div class="p-8 bg-slate-50 rounded-xl text-center border border-slate-200 border-dashed"><p class="text-sm text-slate-400 italic">No hay iniciativas definidas para este periodo.</p></div>';
    
    return items.map(item => {
        const title = item.title || item.Title;
        const impact = item.impact || item.Impact;
        const description = item.description || item.Description || item.desc;
        const objective = item.objective || item.Objective;
        const steps = item.steps || item.Steps;

        return `
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden break-inside-avoid">
            <!-- Decorative Accent -->
            <div class="absolute top-0 left-0 w-1.5 h-full ${getImpactColor(impact)}"></div>
            
            <div class="pl-3">
                <div class="flex justify-between items-start mb-3">
                    <h5 class="font-bold text-slate-800 text-lg leading-tight pr-4 w-3/4">${title}</h5>
                    <div class="flex flex-col items-end">
                         <span class="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Impacto</span>
                         <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            ${impact}
                        </span>
                    </div>
                </div>
                
                <div class="mb-4">
                     <p class="text-xs text-slate-600 leading-relaxed font-medium">
                        ${description}
                    </p>
                </div>

                <div class="grid grid-cols-12 gap-4">
                    ${objective ? `
                    <div class="col-span-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div class="flex items-center gap-1.5 mb-1.5">
                            <div class="w-1 h-1 rounded-full bg-azka-dark"></div>
                            <p class="text-[9px] font-bold text-azka-dark uppercase tracking-widest">Objetivo</p>
                        </div>
                        <p class="text-[10px] text-slate-700 leading-relaxed text-justify">
                            ${objective}
                        </p>
                    </div>
                    ` : ''}

                    ${steps && steps.length > 0 ? `
                    <div class="col-span-8">
                        <div class="flex items-center gap-1.5 mb-2">
                            <div class="w-1 h-1 rounded-full bg-azka-teal"></div>
                            <p class="text-[9px] font-bold text-azka-teal uppercase tracking-widest">Ejecución</p>
                        </div>
                        <ul class="space-y-2">
                            ${steps.map((step: string, i: number) => `
                                <li class="flex items-start gap-2">
                                    <span class="flex-shrink-0 w-4 h-4 rounded-full bg-white border border-slate-200 text-slate-400 text-[9px] font-bold flex items-center justify-center shadow-sm mt-0.5">${i + 1}</span>
                                    <span class="text-[10px] text-slate-600 leading-snug">${step}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
        `;
    }).join('');
}

function getImpactColor(impact: string) {
    const i = impact?.toLowerCase() || '';
    if (i.includes('alta')) return 'bg-rose-500';
    if (i.includes('media')) return 'bg-sky-500';
    return 'bg-slate-300';
}
