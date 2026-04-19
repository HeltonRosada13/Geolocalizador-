'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Award, Star, Search, MapPin } from 'lucide-react';
import Image from 'next/image';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose, userName }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "Bem-vindo ao Flipa ATM",
      text: "Descubra a facilidade de encontrar ATMs com dinheiro em Luanda, num ambiente colaborativo e seguro.\nA nossa rede exclusiva ajuda-o a poupar tempo e combustível.",
      icon: <Star className="w-12 h-12 text-[#004FAC]" />,
      image: "https://picsum.photos/seed/luanda-atm/1920/1080?blur=10",
      buttonText: "Continuar"
    },
    {
      title: "Explore o Mapa em Tempo Real",
      text: "Navegue pelas localizações premium em Luanda. Veja quem tem dinheiro, quem tem apenas papel ou quem está fora de serviço.\nInformação fresca, direto da comunidade para si.",
      icon: <Search className="w-12 h-12 text-[#004FAC]" />,
      image: "https://picsum.photos/seed/map-navigation/1920/1080?blur=10",
      buttonText: "Continuar"
    },
    {
      title: "Reserve Tempo, Reporte Estado",
      text: "Ao chegar a um Multicaixa, reporte o que encontrou. Ajude outros utilizadores e receba confirmação imediata da comunidade.\nO seu tempo é precioso, nós ajudamos a geri-lo.",
      icon: <MapPin className="w-12 h-12 text-[#004FAC]" />,
      image: "https://picsum.photos/seed/city-night/1920/1080?blur=10",
      buttonText: "Continuar"
    },
    {
      title: "Torne-se Parte do Nosso Círculo",
      text: "Crie o seu perfil e comece a acumular pontos de reputação com cada reporte verificado.\nDesbloqueie conquistas e torne-se uma voz de confiança na rede Flipa ATM.",
      icon: <Award className="w-12 h-12 text-[#004FAC]" />,
      image: "https://picsum.photos/seed/community-luanda/1920/1080?blur=10",
      buttonText: "Começar Agora"
    }
  ];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onClose();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/90 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white sm:rounded-3xl shadow-2xl max-w-lg w-full h-full sm:h-auto overflow-hidden relative flex flex-col border border-blue-100"
          >
            {/* Background Texture/Image */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <Image 
                src={slides[currentSlide].image} 
                alt="background" 
                fill 
                className="object-cover blur-3xl"
                referrerPolicy="no-referrer"
              />
            </div>

            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors z-20"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 relative z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="w-full flex flex-col items-center text-center"
                >
                  <div className="mb-8 p-6 bg-blue-50 rounded-full border border-blue-100 shadow-lg shadow-blue-900/5">
                    {slides[currentSlide].icon}
                  </div>

                  <h2 className="text-3xl font-black text-[#004FAC] mb-6 tracking-tight leading-tight">
                    {slides[currentSlide].title}
                  </h2>
                  
                  <p className="text-slate-500 text-base leading-relaxed mb-12 px-4">
                    {slides[currentSlide].text}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Progress Dots */}
              <div className="flex gap-2 mb-10">
                {slides.map((_, idx) => (
                  <div 
                    key={idx}
                    className={`h-1.5 transition-all duration-300 rounded-full ${
                      idx === currentSlide ? 'w-8 bg-[#004FAC]' : 'w-2 bg-slate-200'
                    }`}
                  />
                ))}
              </div>

              <div className="w-full flex flex-col gap-4">
                <button
                  onClick={nextSlide}
                  className="w-full py-5 bg-[#004FAC] text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-900/10 hover:bg-[#003A80] transition-all active:scale-[0.98] uppercase tracking-widest"
                >
                  {slides[currentSlide].buttonText}
                </button>
                
                {currentSlide === slides.length - 1 && (
                  <button
                    onClick={onClose}
                    className="text-slate-400 text-xs uppercase tracking-widest font-bold hover:text-slate-600 transition-colors"
                  >
                    Entrar como convidado
                  </button>
                )}
              </div>
            </div>

            {/* Navigation Arrows (Desktop) */}
            <div className="hidden sm:block">
              {currentSlide > 0 && (
                <button 
                  onClick={prevSlide}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-[#004FAC] transition-colors"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
              )}
              {currentSlide < slides.length - 1 && (
                <button 
                  onClick={nextSlide}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-[#004FAC] transition-colors"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

