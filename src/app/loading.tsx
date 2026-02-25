'use client';

import Image from 'next/image';
import { Typography } from '@mui/material';

export default function Loading() {
  return (
    <div className="azka-loader-bg min-h-screen flex items-center justify-center px-4 font-brand-primary">
      <div className="relative w-full max-w-md h-80 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col items-center justify-center">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="azka-loader-orbit" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="azka-loader-core flex items-center justify-center">
            <Image
              src="/azkait-logo-wordmark.png"
              alt="Azkait"
              width={180}
              height={40}
              priority
            />
          </div>

          <div className="flex flex-col items-center gap-1">
            <Typography variant="subtitle1" className="text-brand-cyan font-semibold tracking-wide">
              Preparando tu diagnóstico de IA
            </Typography>
            <Typography variant="body2" className="text-slate-200/80">
              Analizando datos, dimensiones y oportunidades de transformación
            </Typography>
          </div>

          <div className="mt-4 flex items-end gap-1.5 h-8">
            <div className="azka-loader-bar azka-loader-bar-1" />
            <div className="azka-loader-bar azka-loader-bar-2" />
            <div className="azka-loader-bar azka-loader-bar-3" />
            <div className="azka-loader-bar azka-loader-bar-4" />
            <div className="azka-loader-bar azka-loader-bar-5" />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 azka-loader-grid" />
      </div>
    </div>
  );
}
