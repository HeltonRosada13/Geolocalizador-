'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, CreditCard, Navigation, Bell, Sparkles } from 'lucide-react';
import { MulticaixaLogo } from './multicaixa-logo';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose, userName }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden relative"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="p-8">
              <div className="flex justify-center mb-6">
                <MulticaixaLogo size="lg" />
              </div>

              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Olá, {userName}!
                </h2>
                <p className="text-gray-600">
                  Estamos honrados em recebê-lo no <span className="font-bold text-blue-900">Flipa ATM</span>.
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4 p-3 rounded-2xl hover:bg-blue-50 transition-colors">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Localizar ATMs em Tempo Real</h3>
                    <p className="text-xs text-gray-500">Encontre o caixa mais próximo de si com precisão cirúrgica.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-3 rounded-2xl hover:bg-green-50 transition-colors">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600 shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Verificar Disponibilidade</h3>
                    <p className="text-xs text-gray-500">Saiba se o ATM tem dinheiro antes mesmo de sair de casa.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-3 rounded-2xl hover:bg-orange-50 transition-colors">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 shrink-0">
                    <Navigation className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Direções Precisas</h3>
                    <p className="text-xs text-gray-500">Obtenha a melhor rota para chegar ao seu destino sem desvios.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-3 rounded-2xl hover:bg-purple-50 transition-colors">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Contribuir com a Comunidade</h3>
                    <p className="text-xs text-gray-500">Ajude outros utilizadores reportando o estado dos ATMs.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-3 rounded-2xl hover:bg-red-50 transition-colors">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600 shrink-0">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Alertas Exclusivos</h3>
                    <p className="text-xs text-gray-500">Receba notificações sobre novos ATMs e atualizações de rede.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-4 bg-blue-900 text-white rounded-2xl font-bold shadow-xl shadow-blue-200 hover:bg-blue-800 transition-all active:scale-[0.98]"
              >
                Começar Agora
              </button>
              
              <p className="text-center mt-4 text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                A sua experiência de luxo começa agora
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
