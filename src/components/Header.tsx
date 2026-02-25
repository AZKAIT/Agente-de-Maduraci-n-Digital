'use client';

import React from 'react';
import { AppBar, Toolbar, IconButton, Typography, Box } from '@mui/material';
import Image from 'next/image';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  showBack?: boolean;
  backUrl?: string; // If not provided, router.back() or nothing?
  onBack?: () => void;
}

const Header: React.FC<HeaderProps> = ({ showBack = true, backUrl, onBack }) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backUrl) {
      router.push(backUrl);
    } else {
      router.back();
    }
  };

  return (
    <AppBar position="static" color="transparent" elevation={0} className="bg-transparent pt-4 px-4">
      <Toolbar className="min-h-16 pl-0">
        {showBack && (
            <IconButton 
                edge="start" 
                color="inherit" 
                aria-label="back" 
                onClick={handleBack}
                className="mr-2 text-slate-800"
            >
              <ArrowBackIcon className="text-3xl font-bold" />
            </IconButton>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} onClick={() => router.push('/dashboard')} className="cursor-pointer select-none">
          <Image src="/azkait-logo-wordmark.png" alt="Azkait" width={180} height={56} priority />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
