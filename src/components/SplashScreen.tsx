import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { APP_CONFIG } from '../config/app.config';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Initialisation...');

  useEffect(() => {
    const steps = [
      { progress: 20, status: 'Chargement des configurations...' },
      { progress: 40, status: 'Connexion à la base de données...' },
      { progress: 60, status: 'Synchronisation des données...' },
      { progress: 80, status: 'Préparation de l\'interface...' },
      { progress: 100, status: 'Prêt !' },
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setProgress(steps[currentStep].progress);
        setStatus(steps[currentStep].status);
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(onComplete, 300);
      }
    }, APP_CONFIG.electron.splashDuration / steps.length);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#0284C7] via-[#0369A1] to-[#1e3a5f] flex items-center justify-center z-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center">
        {/* Animated Logo */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mb-8"
        >
          <div className="relative">
            {/* Outer Ring */}
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-white/20"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1.2, opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
              style={{ width: 140, height: 140, margin: -10 }}
            />
            
            {/* Logo Container */}
            <div className="w-[120px] h-[120px] bg-white rounded-3xl shadow-2xl flex items-center justify-center">
              <svg
                viewBox="0 0 64 64"
                className="w-16 h-16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Box Base */}
                <path
                  d="M8 20L32 8L56 20V44L32 56L8 44V20Z"
                  fill="#0284C7"
                  stroke="#0369A1"
                  strokeWidth="2"
                />
                {/* Box Top */}
                <path
                  d="M32 8L56 20L32 32L8 20L32 8Z"
                  fill="#38BDF8"
                />
                {/* Box Right Side */}
                <path
                  d="M32 32L56 20V44L32 56V32Z"
                  fill="#0284C7"
                />
                {/* Box Left Side */}
                <path
                  d="M32 32L8 20V44L32 56V32Z"
                  fill="#0369A1"
                />
                {/* Arrow Up */}
                <path
                  d="M32 16L40 24H36V36H28V24H24L32 16Z"
                  fill="white"
                />
              </svg>
            </div>
          </div>
        </motion.div>

        {/* App Name */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
            {APP_CONFIG.name}
          </h1>
          <p className="text-white/70 text-sm">
            {APP_CONFIG.description}
          </p>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          className="mb-4"
        >
          <div className="w-[280px] h-1.5 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </motion.div>

        {/* Status Text */}
        <motion.p
          key={status}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-white/80 text-sm"
        >
          {status}
        </motion.p>

        {/* Version */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-[-120px] text-white/50 text-xs"
        >
          Version {APP_CONFIG.version} - {APP_CONFIG.company.name}
        </motion.div>
      </div>
    </div>
  );
}
