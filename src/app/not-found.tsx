import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-brand-navy flex flex-col items-center justify-center p-4">
      <h2 className="text-4xl font-bold text-white mb-4">404 - Página no encontrada</h2>
      <p className="text-brand-cyan mb-8">No pudimos encontrar el recurso que estabas buscando.</p>
      <Link 
        href="/" 
        className="px-6 py-3 bg-brand-cyan hover:bg-[#0cd2db] text-brand-navy font-bold rounded-lg transition-colors"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
