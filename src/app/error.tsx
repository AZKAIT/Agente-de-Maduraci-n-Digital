'use client';

import { useEffect } from 'react';
import { Button, Box, Typography } from '@mui/material';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Box 
      className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4"
    >
      <Typography variant="h4" className="text-red-500 mb-4 font-bold">
        ¡Algo salió mal!
      </Typography>
      <Typography className="text-slate-300 mb-6 text-center">
        Ha ocurrido un error inesperado al cargar este segmento.
      </Typography>
      <Button 
        variant="contained" 
        onClick={() => reset()}
        sx={{ backgroundColor: '#004669', '&:hover': { backgroundColor: '#017FBA' } }}
      >
        Intentar de nuevo
      </Button>
    </Box>
  );
}
