'use client';

import { useState, useEffect } from 'react';
import { Share, PlusSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { safeStorage } from '@/lib/safe-storage';

export function IosPwaPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Detect if device is iOS
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    // Detect if app is NOT in standalone mode (not added to home screen)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;

    if (isIos && !isStandalone) {
      const hasDismissed = safeStorage.getItem('ios_pwa_prompt_dismissed');
      if (!hasDismissed) {
        setShowPrompt(true);
      }
    }
  }, []);

  const dismissPrompt = () => {
    safeStorage.setItem('ios_pwa_prompt_dismissed', 'true');
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-20 left-4 right-4 z-50 bg-white rounded-2xl shadow-2xl p-5 border border-gray-100"
        >
          <button 
            onClick={dismissPrompt}
            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>

          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <PlusSquare size={28} />
            </div>
            
            <div>
              <h3 className="font-bold text-gray-900">Instalar no iPhone</h3>
              <p className="text-sm text-gray-500 mt-1">
                Para receber notificações em tempo real no iOS, precisas de adicionar o Flipa ATM ao teu ecrã principal.
              </p>
            </div>

            <div className="flex items-center justify-center space-x-2 text-sm font-medium text-gray-700 bg-gray-50 px-4 py-2 rounded-lg w-full">
              <span>Toca em</span>
              <Share size={18} className="text-blue-500" />
              <span>e depois em "Ecrã Principal"</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
