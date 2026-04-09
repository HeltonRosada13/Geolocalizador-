'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  MapPin, 
  CreditCard, 
  FileText, 
  ChevronRight, 
  ThumbsUp, 
  ThumbsDown, 
  Clock, 
  Navigation,
  User as UserIcon,
  LogOut,
  PlusCircle,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { MulticaixaLogo } from '@/components/multicaixa-logo';
import { WelcomeModal } from '@/components/welcome-modal';
import { useNotifications } from '@/hooks/use-notifications';
import { Settings } from 'lucide-react';

const MapView = dynamic(() => import('@/components/map-view'), { 
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-gray-100 animate-pulse rounded-3xl flex items-center justify-center text-gray-400">Carregando Mapa...</div>
});

const AdminPanel = dynamic(() => import('@/components/admin-panel'), { ssr: false });
const AIAssistant = dynamic(() => import('@/components/ai-assistant'), { ssr: false });

// --- Types ---
export interface ATM {
  id: string;
  bankName: string;
  locationName: string;
  address?: string;
  latitude: number;
  longitude: number;
  status: 'disponivel' | 'sem_dinheiro' | 'sem_papel' | 'fora_de_servico';
  lastReportedAt: any;
  notes?: string;
}

interface Report {
  id: string;
  atmId: string;
  userUid: string;
  userName: string;
  status: 'disponivel' | 'sem_dinheiro' | 'sem_papel' | 'fora_de_servico';
  timestamp: any;
  notes?: string;
}

// --- Components ---

const StatusBadge = ({ status }: { status: ATM['status'] }) => {
  const configs = {
    disponivel: { 
      dot: 'bg-green-500 shadow-green-200' 
    },
    sem_dinheiro: { 
      dot: 'bg-gray-500 shadow-gray-200' 
    },
    sem_papel: { 
      dot: 'bg-orange-500 shadow-orange-200' 
    },
    fora_de_servico: { 
      dot: 'bg-gray-500 shadow-gray-200' 
    },
  };

  const config = configs[status];

  return (
    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white shadow-sm border border-gray-100">
      <span className={`w-2.5 h-2.5 rounded-full shadow-lg animate-pulse ${config.dot}`} />
    </div>
  );
};

export default function FlipaATM() {
  const { user, loading: authLoading, signInWithGoogle, logout } = useAuth();
  const [atms, setAtms] = useState<ATM[]>([]);
  const [selectedATM, setSelectedATM] = useState<ATM | null>(null);
  const [view, setView] = useState<'home' | 'details' | 'report'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'list'>('list');
  const [showAdmin, setShowAdmin] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [aiInsight, setAiInsight] = useState<string>('A carregar análise inteligente...');

  // Notifications
  useNotifications(atms, userLocation);

  // AI Insight Generation
  useEffect(() => {
    if (user) {
      const hasSeenWelcome = localStorage.getItem(`welcome_seen_${user.uid}`);
      if (!hasSeenWelcome) {
        setShowWelcome(true);
      }
    }
  }, [user]);

  const handleCloseWelcome = () => {
    if (user) {
      localStorage.setItem(`welcome_seen_${user.uid}`, 'true');
    }
    setShowWelcome(false);
  };

  useEffect(() => {
    if (selectedATM && view === 'details') {
      // Log usage when viewing details
      if (user) {
        addDoc(collection(db, 'analytics_usage'), {
          userUid: user.uid,
          atmId: selectedATM.id,
          bankName: selectedATM.bankName,
          locationName: selectedATM.locationName,
          timestamp: serverTimestamp(),
          type: 'view_details'
        }).catch(e => console.error("Analytics error:", e));
      }
      
      const generateInsight = async (atm: ATM) => {
        setAiInsight('A analisar dados em tempo real...');
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
          const prompt = `
            Analisa o estado atual deste ATM em Luanda e gera um "Flipa AI Insight" curto (máximo 2 frases).
            
            ATM: ${atm.bankName} - ${atm.locationName}
            Estado Atual: ${atm.status === 'disponivel' ? 'Tem Dinheiro' : atm.status === 'sem_papel' ? 'Apenas Papel' : 'Sem Dinheiro'}
            Última atualização: ${atm.lastReportedAt ? formatDistanceToNow(atm.lastReportedAt.toDate ? atm.lastReportedAt.toDate() : new Date(atm.lastReportedAt), { locale: pt }) : 'desconhecida'}
            
            Instruções:
            1. Se estiver 'Tem Dinheiro', incentiva o levantamento agora e menciona a probabilidade de filas ou esgotamento baseado no horário (estamos em Luanda).
            2. Se estiver 'Apenas Papel' ou 'Sem Dinheiro', sugere paciência ou procurar outro próximo, com um tom empático e premium.
            3. Usa um tom sofisticado e útil.
            4. Não uses aspas na resposta.
          `;

          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
          });

          setAiInsight(response.text || "Mantenha-se atento aos relatos da comunidade para a melhor experiência.");
        } catch (error) {
          console.error("AI Insight Error:", error);
          if (atm.status === 'disponivel') {
            setAiInsight("Este ATM apresenta boa estabilidade. Recomendamos realizar a sua operação agora para evitar a azáfama do final do dia.");
          } else {
            setAiInsight("A nossa rede indica instabilidade neste ponto. Por favor, verifique as alternativas próximas no mapa.");
          }
        }
      };
      generateInsight(selectedATM);
    }
  }, [selectedATM, view, user]);

  // Search Analytics
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length > 2 && user) {
        addDoc(collection(db, 'analytics_searches'), {
          query: searchQuery.trim().toLowerCase(),
          userUid: user.uid,
          timestamp: serverTimestamp()
        }).catch(e => console.error("Search analytics error:", e));
      }
    }, 2000);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, user]);

  // Update User Activity
  useEffect(() => {
    if (user) {
      updateDoc(doc(db, 'users', user.uid), {
        lastActiveAt: serverTimestamp()
      }).catch(e => console.error("User activity error:", e));
    }
  }, [user, view, activeTab]);

  // Geolocation
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  // Fetch ATMs
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'atms'), orderBy('bankName', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const atmList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ATM));
      setAtms(atmList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'atms');
    });

    return () => unsubscribe();
  }, [user]);

  const handleReport = async (status: ATM['status']) => {
    if (!selectedATM || !user) return;
    setIsReporting(true);

    try {
      // 1. Add report
      await addDoc(collection(db, 'reports'), {
        atmId: selectedATM.id,
        userUid: user.uid,
        userName: user.displayName || 'Utilizador Anónimo',
        status,
        timestamp: serverTimestamp(),
      });

      // 2. Update ATM status
      await updateDoc(doc(db, 'atms', selectedATM.id), {
        status,
        lastReportedAt: serverTimestamp(),
      });

      setSelectedATM(prev => prev ? { ...prev, status, lastReportedAt: new Date() } : null);
      setView('details');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'reports');
    } finally {
      setIsReporting(false);
    }
  };

  const filteredATMs = atms.filter(atm => 
    atm.bankName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    atm.locationName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8F9FB]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8F9FB] p-6">
        <MulticaixaLogo size="lg" className="mb-8" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Flipa ATM</h1>
        <p className="text-gray-500 text-center mb-12 max-w-xs">
          A sua experiência premium para localizar ATMs em Luanda.
        </p>
        <button
          onClick={signInWithGoogle}
          className="w-full max-w-xs flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 px-6 py-4 rounded-2xl font-semibold shadow-sm hover:bg-gray-50 transition-all active:scale-95"
        >
          <Image 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="Google" 
            width={20} 
            height={20} 
            className="w-5 h-5" 
            referrerPolicy="no-referrer"
          />
          Entrar com Google
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] pb-24 font-sans text-gray-900">
      {/* Header */}
      <header className="bg-white px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm border-b border-gray-100">
        <div className="flex items-center gap-3">
          <MulticaixaLogo size="sm" />
          <h1 className="text-lg font-bold tracking-tight text-blue-900">FLIPA ATM</h1>
        </div>
        <div className="flex items-center gap-3">
          {user.email === 'heltonlisboa937@gmail.com' && (
            <button 
              onClick={() => setShowAdmin(true)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Administração"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
          <button onClick={logout} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-blue-50">
            <Image 
              src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
              alt="Profile" 
              width={32} 
              height={32} 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </header>

      <main className="p-6 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Onde quer levantar?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border-none rounded-xl py-3 pl-12 pr-4 shadow-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none text-sm text-gray-700 placeholder:text-gray-400"
                />
              </div>

              {/* Quick Filters */}
              <div className="grid grid-cols-3 gap-2">
                <button className="flex flex-col items-center justify-center gap-1.5 p-2 bg-green-50 rounded-xl border border-green-100 group hover:bg-green-100 transition-all">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-green-100 group-hover:scale-110 transition-transform overflow-hidden">
                    <MulticaixaLogo size="sm" className="scale-75" />
                  </div>
                  <span className="text-[8px] font-bold text-green-800 text-center leading-tight">COM DINHEIRO</span>
                </button>
                <button className="flex flex-col items-center justify-center gap-1.5 p-2 bg-blue-50 rounded-xl border border-blue-100 group hover:bg-blue-100 transition-all">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-100 group-hover:scale-110 transition-transform">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-[8px] font-bold text-blue-800 text-center leading-tight">COM PAPEL</span>
                </button>
                <button className="flex flex-col items-center justify-center gap-1.5 p-2 bg-gray-50 rounded-xl border border-gray-100 group hover:bg-gray-100 transition-all">
                  <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center text-white shadow-lg shadow-gray-100 group-hover:scale-110 transition-transform">
                    <Navigation className="w-4 h-4" />
                  </div>
                  <span className="text-[8px] font-bold text-gray-800 text-center leading-tight">TODOS PRÓXIMOS</span>
                </button>
              </div>

              {/* ATM List */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">ATMs Próximos</h2>
                  <button className="text-xs font-bold text-blue-600 uppercase">Ver Todos</button>
                </div>
                <div className="space-y-4">
                  {filteredATMs.length > 0 ? (
                    filteredATMs.map((atm) => (
                      <motion.div
                        key={atm.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { setSelectedATM(atm); setView('details'); }}
                        className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex items-center gap-4 cursor-pointer"
                      >
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-blue-900 font-bold text-[10px]">
                          {atm.bankName.substring(0, 3).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm text-gray-900 truncate">{atm.bankName} {atm.locationName}</h3>
                          <p className="text-[10px] text-gray-400 truncate">{atm.address || 'Localização central'}</p>
                        </div>
                        <StatusBadge status={atm.status} />
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>Nenhum ATM encontrado.</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Map Preview or Real Map */}
              {activeTab === 'list' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Mapa Interativo</h2>
                    <button 
                      onClick={() => setActiveTab('map')}
                      className="text-xs font-bold text-blue-600 uppercase flex items-center gap-1"
                    >
                      Expandir <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="relative group">
                    <MapView 
                      height="h-64"
                      atms={filteredATMs} 
                      onSelectATM={(atm) => { setSelectedATM(atm); setView('details'); }}
                      userLocation={userLocation}
                    />
                    <div className="absolute top-4 right-4 z-[400]">
                      <div className="bg-white/90 backdrop-blur p-2 rounded-xl shadow-lg border border-blue-100">
                        <MapPin className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Mapa de ATMs</h2>
                    <button 
                      onClick={() => setActiveTab('list')}
                      className="text-xs font-bold text-blue-600 uppercase"
                    >
                      Voltar para Lista
                    </button>
                  </div>
                  <MapView 
                    atms={filteredATMs} 
                    onSelectATM={(atm) => { setSelectedATM(atm); setView('details'); }}
                    userLocation={userLocation}
                  />
                </div>
              )}

              {/* Seed Button (Temporary for testing) */}
              {user.email === 'heltonlisboa937@gmail.com' && atms.length === 0 && (
                <button 
                  onClick={async () => {
                    const { seedATMs } = await import('@/seed');
                    await seedATMs();
                  }}
                  className="w-full p-4 bg-yellow-100 text-yellow-800 rounded-2xl font-bold text-xs uppercase tracking-widest"
                >
                  Carregar Dados Iniciais (Seed)
                </button>
              )}
            </motion.div>
          )}

          {view === 'details' && selectedATM && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <button 
                onClick={() => setView('home')}
                className="flex items-center gap-2 text-gray-500 text-sm font-medium hover:text-blue-600 transition-colors"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                Voltar
              </button>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-50 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedATM.bankName} - {selectedATM.locationName}</h2>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {selectedATM.address || 'Luanda, Angola'}
                    </p>
                  </div>
                  <div className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-[9px] font-bold">ONLINE</div>
                </div>

                <div 
                  style={{ width: '264px', height: '208px', paddingTop: '15px', paddingLeft: '29px', paddingRight: '23px', paddingBottom: '11px', marginBottom: '14px' }}
                  className={`rounded-2xl flex flex-col items-center justify-center border-2 transition-all duration-500 shadow-lg mx-auto ${
                  selectedATM.status === 'disponivel' ? 'bg-green-50/50 border-green-200 shadow-green-100/50' :
                  selectedATM.status === 'sem_papel' ? 'bg-orange-50/50 border-orange-200 shadow-orange-100/50' :
                  'bg-gray-50/50 border-gray-200 shadow-gray-100/50'
                }`}>
                  <div 
                    style={{ width: '80px', height: '80px' }}
                    className={`rounded-full flex items-center justify-center shadow-2xl animate-pulse ${
                    selectedATM.status === 'disponivel' ? 'bg-green-500' :
                    selectedATM.status === 'sem_papel' ? 'bg-orange-500' :
                    'bg-gray-500'
                  }`} />
                  
                  <div 
                    style={{ height: '28px', marginTop: '20px' }}
                    className={`flex items-center justify-center gap-2 text-[10px] font-medium leading-[14px] ${
                    selectedATM.status === 'disponivel' ? 'text-green-600/70' :
                    selectedATM.status === 'sem_papel' ? 'text-orange-600/70' :
                    'text-gray-600/70'
                  }`}>
                    <Clock className="w-4 h-4" />
                    Atualizado {selectedATM.lastReportedAt ? formatDistanceToNow(selectedATM.lastReportedAt.toDate ? selectedATM.lastReportedAt.toDate() : new Date(selectedATM.lastReportedAt), { addSuffix: true, locale: pt }) : 'recentemente'}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-50 space-y-3">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Flipa AI Insights</span>
                  </div>
                  <p className="text-[11px] text-gray-600 italic leading-relaxed">
                    {aiInsight}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-xl flex items-center gap-2">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm overflow-hidden">
                      <MulticaixaLogo size="sm" className="scale-50" />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">Notas</span>
                      <p className="text-xs font-bold text-gray-700">2000, 5000</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl flex items-center gap-2">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">Espera</span>
                      <p className="text-xs font-bold text-gray-700">~10 min</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Community Help Section */}
              <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-xl shadow-blue-900/5 space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 opacity-50" />
                
                <div className="space-y-2 relative z-10">
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">Ajude a comunidade!</h3>
                  <p className="text-xs text-gray-500 leading-relaxed font-medium">
                    A sua informação é preciosa. Ajude milhares de pessoas a pouparem tempo e combustível em Luanda.
                  </p>
                </div>

                <div className="space-y-3 relative z-10 flex flex-col items-center">
                  <button 
                    disabled={isReporting}
                    onClick={() => handleReport('disponivel')}
                    style={{ height: '57px', width: '254px' }}
                    className="bg-green-600 text-white p-4 rounded-2xl font-black flex items-center justify-between hover:bg-green-700 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-green-200 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                        <ThumbsUp className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <span className="block text-[9px] opacity-70 uppercase tracking-widest">Confirmar</span>
                        <span className="text-base">Tem Dinheiro 👍</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 opacity-50" />
                  </button>
                  <button 
                    disabled={isReporting}
                    onClick={() => handleReport('sem_dinheiro')}
                    style={{ height: '61px', width: '252px' }}
                    className="bg-gray-600 text-white p-4 rounded-2xl font-black flex items-center justify-between hover:bg-gray-700 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-gray-200 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                        <ThumbsDown className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <span className="block text-[9px] opacity-70 uppercase tracking-widest">Confirmar</span>
                        <span className="text-base">Sem Dinheiro 👎</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 opacity-50" />
                  </button>
                </div>
              </div>

              {/* Map Location */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50 space-y-4">
                <div className="flex items-center gap-2 font-bold text-gray-900">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Localização exata
                </div>
                <div className="relative group">
                  <MapView 
                    height="h-64"
                    atms={[selectedATM]} 
                    onSelectATM={() => {}}
                    userLocation={[selectedATM.latitude, selectedATM.longitude]}
                  />
                  <div className="absolute top-4 right-4 z-[400]">
                    <button 
                      onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition((pos) => {
                            setUserLocation([pos.coords.latitude, pos.coords.longitude]);
                          });
                        }
                      }}
                      className="bg-white/90 backdrop-blur p-2 rounded-xl shadow-lg border border-blue-100 text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <Navigation className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'report' && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">Relatar Estado</h2>
                <p className="text-gray-500 text-sm">Selecione um ATM próximo para informar a comunidade.</p>
              </div>

              <div className="space-y-4">
                {atms.length > 0 ? (
                  atms.map((atm) => (
                    <div 
                      key={atm.id}
                      className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-gray-900">{atm.bankName} - {atm.locationName}</h3>
                          <p className="text-xs text-gray-400">{atm.address || 'Luanda'}</p>
                        </div>
                        <StatusBadge status={atm.status} />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          disabled={isReporting}
                          onClick={async () => { setSelectedATM(atm); await handleReport('disponivel'); }}
                          className="bg-green-50 text-green-700 p-4 rounded-2xl flex items-center justify-center hover:bg-green-100 transition-all active:scale-95 disabled:opacity-50 border border-green-100"
                        >
                          <div className="w-4 h-4 rounded-full bg-green-500 shadow-sm shadow-green-200" />
                        </button>
                        <button 
                          disabled={isReporting}
                          onClick={async () => { setSelectedATM(atm); await handleReport('sem_dinheiro'); }}
                          className="bg-gray-50 text-gray-700 p-4 rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-all active:scale-95 disabled:opacity-50 border border-gray-100"
                        >
                          <div className="w-4 h-4 rounded-full bg-gray-500 shadow-sm shadow-gray-200" />
                        </button>
                        <button 
                          disabled={isReporting}
                          onClick={async () => { setSelectedATM(atm); await handleReport('sem_papel'); }}
                          className="bg-orange-50 text-orange-700 p-4 rounded-2xl flex items-center justify-center hover:bg-orange-100 transition-all active:scale-95 disabled:opacity-50 border border-orange-100"
                        >
                          <div className="w-4 h-4 rounded-full bg-orange-500 shadow-sm shadow-orange-200" />
                        </button>
                        <button 
                          disabled={isReporting}
                          onClick={async () => { setSelectedATM(atm); await handleReport('fora_de_servico'); }}
                          className="bg-gray-50 text-gray-700 p-4 rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-all active:scale-95 disabled:opacity-50 border border-gray-100"
                        >
                          <div className="w-4 h-4 rounded-full bg-gray-500 shadow-sm shadow-gray-200" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Nenhum ATM disponível para relatar.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-100 px-8 py-4 flex items-center justify-between z-40">
        <button 
          onClick={() => { setView('home'); setActiveTab('map'); }}
          className={`flex flex-col items-center gap-1 transition-colors ${view === 'home' && activeTab === 'map' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <div className={`p-2 rounded-xl ${view === 'home' && activeTab === 'map' ? 'bg-blue-50' : ''}`}>
            <MapPin className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest">Mapa</span>
        </button>
        <button 
          onClick={() => { setView('home'); setActiveTab('list'); }}
          className={`flex flex-col items-center gap-1 transition-colors ${view === 'home' && activeTab === 'list' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <div className={`p-2 rounded-xl ${view === 'home' && activeTab === 'list' ? 'bg-blue-50' : ''}`}>
            <PlusCircle className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest">Lista</span>
        </button>
        <button 
          onClick={() => setView('report')}
          className={`flex flex-col items-center gap-1 transition-colors ${view === 'report' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <div className={`p-2 rounded-xl ${view === 'report' ? 'bg-blue-50' : ''}`}>
            <AlertCircle className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest">Relatar</span>
        </button>
      </nav>

      <AIAssistant atms={atms} onSelectATM={(atm) => { setSelectedATM(atm); setView('details'); }} />

      {/* Admin Panel Overlay */}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}

      <WelcomeModal 
        isOpen={showWelcome} 
        onClose={handleCloseWelcome} 
        userName={user.displayName || 'Utilizador'} 
      />
    </div>
  );
}
