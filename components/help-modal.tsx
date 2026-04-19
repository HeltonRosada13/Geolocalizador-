'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, HelpCircle, MapPin, PlusCircle, Award, Settings, MessageCircle } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const sections = [
    {
      title: "Reservar um Momento (Como funciona)",
      icon: <MapPin className="w-5 h-5 text-[#004FAC]" />,
      steps: [
        "Vá a 'Menu' ou 'Lista' no ecrã principal",
        "Escolha o ATM pelo banco ou proximidade",
        "Consulte o estado (Dinheiro/Papel/Fora de Ar)",
        "Navegue diretamente até ao local com GPS"
      ]
    },
    {
      title: "Consultar e Pedir Informação",
      icon: <PlusCircle className="w-5 h-5 text-[#004FAC]" />,
      steps: [
        "Aceda ao 'Mapa' para ver todas as categorias",
        "Toque num ponto para ver detalhes e fotos",
        "Verifique a marca de tempo para dados recentes",
        "Use filtros para ver apenas quem tem dinheiro"
      ]
    },
    {
      title: "Programa de Fidelidade",
      icon: <Award className="w-5 h-5 text-[#004FAC]" />,
      steps: [
        "Após login, aceda ao seu 'Perfil'",
        "Acumule pontos automaticamente com reportes",
        "Troque consistência por reputação VIP",
        "Ajude a rede a crescer e ganhe prestígio"
      ]
    },
    {
      title: "Perfil e Preferências",
      icon: <Settings className="w-5 h-5 text-[#004FAC]" />,
      steps: [
        "Edite os seus dados e veja o histórico",
        "Marque ATMs favoritos para acesso rápido",
        "Ative notificações para alertas no bairro",
        "Mantenha-se ligado com pagamentos seguros"
      ]
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-blue-100"
          >
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-2xl">
                  <HelpCircle className="w-6 h-6 text-[#004FAC]" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-[#004FAC]">Como Funciona</h2>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 font-bold">Guia Rápido Flipa ATM</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-slate-300 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {sections.map((section, idx) => (
                  <div key={idx} className="space-y-4">
                    <div className="flex items-center gap-3">
                      {section.icon}
                      <h3 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">{section.title}</h3>
                    </div>
                    <ul className="space-y-3">
                      {section.steps.map((step, sIdx) => (
                        <li key={sIdx} className="flex gap-3 text-xs text-slate-500 leading-relaxed">
                          <span className="text-blue-200 font-black">•</span>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="pt-8 border-t border-slate-50 space-y-6">
                <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-50">
                  <h4 className="text-[#004FAC] font-black uppercase tracking-widest text-[10px] mb-3">Dicas Extras</h4>
                  <ul className="space-y-2 text-[10px] text-slate-400 font-medium">
                    <li>• Se o ATM estiver vazio, reporte imediatamente para ajudar outros</li>
                    <li>• Verifique a marca de tempo para saber quão recente é a informação</li>
                    <li>• ATMs em locais públicos tendem a esvaziar mais rápido no final do mês</li>
                  </ul>
                </div>

                <div className="flex flex-col items-center gap-4 text-center">
                  <p className="text-xs text-slate-400 font-medium">Precisa de suporte ou quer sugerir um ATM?</p>
                  <button className="flex items-center gap-3 bg-[#004FAC] text-white px-8 py-4 rounded-2xl font-bold text-xs hover:scale-105 transition-all shadow-lg shadow-blue-100">
                    <MessageCircle className="w-5 h-5" />
                    Contactar Suporte
                  </button>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">Flipa ATM — A maior rede colaborativa de Angola</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
