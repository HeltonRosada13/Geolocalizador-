'use client';

import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, limit, addDoc, serverTimestamp, updateDoc, doc, getDoc, getDocs } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  MapPin, 
  ChevronRight, 
  Clock, 
  Navigation,
  LogOut,
  PlusCircle,
  AlertCircle,
  Sparkles,
  Lock,
  Bell,
  Award,
  Settings,
  X,
  HelpCircle
} from 'lucide-react';

import { ATM } from '@/lib/types';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { IosPwaPrompt } from '@/components/ios-pwa-prompt';
import { MulticaixaLogo } from '@/components/multicaixa-logo';
import { WelcomeModal } from '@/components/welcome-modal';
import { HelpModal } from '@/components/help-modal';
import { useNotifications } from '@/hooks/use-notifications';
import { safeStorage } from '@/lib/safe-storage';

const AdminPanel = dynamic(() => import('@/components/admin-panel'), { ssr: false });
const MapView = dynamic(() => import('@/components/map-view'), { ssr: false });

export default function FlipaATMApp() {
  const { user, loading: authLoading, isSigningIn, signInWithGoogle, signInAsGuest, logout } = useAuth();
  const [showAdmin, setShowAdmin] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showGuestNotice, setShowGuestNotice] = useState(false);

  const [atms, setAtms] = useState<ATM[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'todos' | 'disponivel' | 'sem_dinheiro'>('todos');
  const [userReputation, setUserReputation] = useState(0);
  const [activeTab, setActiveTab] = useState<'mapa' | 'lista' | 'ajuda' | 'perfil'>('lista');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [userHeading, setUserHeading] = useState<number | null>(null);
  const [selectedAtm, setSelectedAtm] = useState<ATM | null>(null);
  const [showRoute, setShowRoute] = useState(false);

  // Initialize notifications
  const { setShowPermissionPrompt } = useNotifications(atms, userLocation, user);

  // Geolocation and Heading
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('geolocation' in navigator) {
        const watchId = navigator.geolocation.watchPosition(
          (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
          (err) => console.warn("Geolocation error:", err),
          { enableHighAccuracy: true }
        );
        return () => navigator.geolocation.clearWatch(watchId);
      }

      const handleOrientation = (e: DeviceOrientationEvent) => {
        if (e.webkitCompassHeading) {
          setUserHeading(e.webkitCompassHeading);
        } else if (e.alpha !== null) {
          setUserHeading(360 - e.alpha);
        }
      };

      if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', handleOrientation, true);
        return () => window.removeEventListener('deviceorientation', handleOrientation);
      }
    }
  }, []);

  // Fetch ATMs
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'atms'), (snapshot) => {
      setAtms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ATM)));
    });
    return () => unsubscribe();
  }, []);

  // Fetch User Reputation
  useEffect(() => {
    if (user) {
      const fetchReputation = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserReputation(userDoc.data().reputation || 0);
          } else {
            // Initialize user doc if not exists
            await updateDoc(doc(db, 'users', user.uid), {
                reputation: 0,
                lastActiveAt: serverTimestamp()
            }).catch(() => {
                // Ignore if it fails during init
            });
          }
        } catch (error) {
          console.error("Error fetching reputation:", error);
        }
      };
      fetchReputation();
      
      const hasSeenWelcome = safeStorage.getItem(`welcome_seen_flipa_${user.uid}`);
      if (!hasSeenWelcome) {
        setShowWelcome(true);
      }

      if (user.isAnonymous) {
        setShowGuestNotice(true);
      }
    }
  }, [user]);

  const handleCloseWelcome = () => {
    if (user) {
      safeStorage.setItem(`welcome_seen_flipa_${user.uid}`, 'true');
    }
    setShowWelcome(false);
  };

  // Update User Activity
  useEffect(() => {
    if (user) {
      updateDoc(doc(db, 'users', user.uid), {
        lastActiveAt: serverTimestamp()
      }).catch(e => console.error("Update activity error:", e));
    }
  }, [user, activeTab]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <MulticaixaLogo size="lg" />
          <div className="text-center">
            <h2 className="text-[#004FAC] font-black uppercase text-xl">Flipa ATM</h2>
            <p className="text-[#004FAC]/40 text-[10px] uppercase mt-2 font-bold tracking-widest">A carregar...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFC] p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#004FAC]/5 blur-[100px] rounded-full" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white p-10 rounded-[2.5rem] shadow-2xl border border-blue-50 text-center relative z-10"
        >
          <div className="flex justify-center mb-10">
            <MulticaixaLogo size="lg" />
          </div>
          
          <h1 className="text-3xl font-black text-[#004FAC] mb-4">Achar dinheiro nunca foi tão fácil</h1>
          <p className="text-slate-500 mb-12 text-sm leading-relaxed">
            A maior rede colaborativa de ATMs em Angola. Veja em tempo real quem tem dinheiro e quem não tem.
          </p>

          <div className="flex flex-col items-center space-y-4">
            <button
              onClick={signInAsGuest}
              disabled={isSigningIn}
              className="w-full h-16 bg-[#004FAC] text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-[#003A80] transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isSigningIn ? 'Entrando...' : 'Entrar como Convidado'}
            </button>

            <button
              onClick={signInWithGoogle}
              disabled={isSigningIn}
              className="w-full h-16 flex items-center justify-center gap-3 bg-white border-2 border-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
            >
              <Image 
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                alt="Google" 
                width={20} 
                height={20} 
                className="w-5 h-5" 
                referrerPolicy="no-referrer"
              />
              {isSigningIn ? 'Aguarde...' : 'Entrar com Google'}
            </button>
          </div>

          <p className="text-[10px] text-slate-400 mt-8 uppercase tracking-widest font-bold">
            Flipa ATM • Rede Colaborativa Angolana
          </p>
        </motion.div>
      </div>
    );
  }

  const filteredAtms = atms.filter(atm => {
    const bName = atm.bankName || '';
    const lName = atm.locationName || '';
    const matchesSearch = bName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          lName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'todos' || 
                          (filter === 'disponivel' && atm.status === 'disponivel') ||
                          (filter === 'sem_dinheiro' && atm.status === 'sem_dinheiro');
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32 font-sans text-slate-900">
      <IosPwaPrompt />
      <AnimatePresence>
        {showGuestNotice && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="bg-[#004FAC] text-white px-6 py-3 text-xs font-bold flex items-center justify-between shadow-lg sticky top-0 z-50"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <p>Crie conta para ganhar reputação ao reportar ATMs!</p>
            </div>
            <button onClick={() => setShowGuestNotice(false)}>
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-30 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <MulticaixaLogo size="sm" />
          <h1 className="text-lg font-black tracking-tight text-[#004FAC]">Flipa ATM</h1>
        </div>
        <div className="flex items-center gap-4">
          {user?.email === 'heltonlisboa937@gmail.com' && (
            <button 
              onClick={() => setShowAdmin(true)}
              className="p-2 text-slate-400 hover:text-[#004FAC] transition-colors"
            >
              <Lock className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={() => setShowHelp(true)}
            className="p-2 text-slate-400 hover:text-[#004FAC] transition-colors"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-blue-50 p-0.5">
            <Image 
              src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
              alt="Profile" 
              width={36} 
              height={36} 
              className="w-full h-full object-cover rounded-full" 
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </header>

      <main className="p-6 max-w-lg mx-auto space-y-6">
        {activeTab === 'mapa' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Vista de Mapa</h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowRoute(!showRoute)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all ${
                    showRoute ? 'bg-[#004FAC] text-white' : 'bg-white text-slate-400 border border-slate-100'
                  }`}
                >
                  {showRoute ? 'Ocultar Rota' : 'Mostrar Rota'}
                </button>
              </div>
            </div>
            
            <MapView 
              atms={filteredAtms}
              userLocation={userLocation}
              userHeading={userHeading}
              selectedATM={selectedAtm}
              showRoute={showRoute}
              onSelectATM={(atm) => {
                setSelectedAtm(atm);
                setShowRoute(true);
              }}
            />

            {selectedAtm && (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-white p-4 rounded-3xl border border-blue-50 shadow-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <MulticaixaLogo size="sm" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{selectedAtm.bankName}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{selectedAtm.locationName}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedAtm(null)}
                  className="p-2 text-slate-300 hover:text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {(activeTab === 'lista' || activeTab === 'mapa') && (
          <>
            {/* Search and Filters */}
            <section className="space-y-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#004FAC] transition-colors" />
                <input 
                  type="text" 
                  placeholder="Buscar por banco ou bairro..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border-none h-14 pr-6 rounded-2xl shadow-sm focus:ring-2 focus:ring-[#004FAC] outline-none text-sm transition-all"
                  style={{ paddingLeft: '3rem' }}
                />
              </div>
              
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {[
                  { id: 'todos', label: 'Todos' },
                  { id: 'disponivel', label: 'Com Dinheiro' },
                  { id: 'sem_dinheiro', label: 'Sem Dinheiro' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id as any)}
                    className={`whitespace-nowrap px-6 py-3 rounded-xl text-xs font-bold transition-all ${
                      filter === f.id ? 'bg-[#004FAC] text-white shadow-lg shadow-blue-100' : 'bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </section>

            {/* ATM List */}
            {activeTab === 'lista' && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">ATMs na proximidade</h2>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{filteredAtms.length} Resultados</span>
                </div>

                <div className="space-y-3">
                  {filteredAtms.length > 0 ? (
                    filteredAtms.map(atm => (
                      <ATMCard 
                        key={atm.id} 
                        atm={atm} 
                        onNavigate={() => {
                          setSelectedAtm(atm);
                          setActiveTab('mapa');
                          setShowRoute(true);
                        }} 
                      />
                    ))
                  ) : (
                    <div className="bg-white p-12 rounded-[2.5rem] text-center space-y-4 border border-slate-50 shadow-sm">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                        <Search className="w-8 h-8 text-slate-200" />
                      </div>
                      <p className="text-slate-400 text-sm font-medium">Nenhum ATM encontrado.</p>
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}

        {activeTab === 'lista' && (
          /* Level Up Stats */
          <section className="bg-gradient-to-br from-[#004FAC] to-[#003A80] rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden text-white">
            <div className="relative z-10 flex items-center justify-between">
              <div className="space-y-2">
                <h3 className="text-sm font-black uppercase tracking-widest text-blue-200">A sua Reputação</h3>
                <p className="text-2xl font-black">{userReputation} XP</p>
              </div>
              <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl">
                <Award className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
            <div className="mt-6 w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-400 w-[60%] shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
            </div>
            <p className="mt-4 text-[10px] font-bold text-blue-100 uppercase tracking-widest">Continue reportando para subir de nível!</p>
          </section>
        )}

        {activeTab === 'ajuda' && (
          <div className="space-y-6">
            <h2 className="text-xl font-black text-[#004FAC]">Ajuda & Suporte</h2>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4">
              <p className="text-sm text-slate-600">A maior rede colaborativa de Luanda. Como podemos ajudar?</p>
              <button 
                onClick={() => setShowHelp(true)}
                className="w-full py-4 bg-slate-50 text-[#004FAC] rounded-2xl font-bold text-sm"
              >
                Ver Tutorial Completo
              </button>
            </div>
          </div>
        )}

        {activeTab === 'perfil' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 text-center space-y-4">
              <div className="w-24 h-24 rounded-full mx-auto border-4 border-blue-50 p-1">
                <Image 
                  src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                  alt="Profile" 
                  width={96} 
                  height={96} 
                  className="w-full h-full object-cover rounded-full" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">{user.displayName || 'Utilizador Flipa'}</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{user.email || 'Conta de Convidado'}</p>
              </div>
              <div className="pt-4 border-t border-slate-50">
                <button 
                  onClick={logout}
                  className="flex items-center justify-center gap-2 w-full py-4 text-red-500 font-bold text-sm hover:bg-red-50 rounded-2xl transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  Terminar Sessão
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-t border-slate-100 px-8 py-5 flex items-center justify-between z-40">
        <NavItem active={activeTab === 'mapa'} label="Mapa" icon={<MapPin className="w-6 h-6" />} onClick={() => setActiveTab('mapa')} />
        <NavItem active={activeTab === 'lista'} label="Lista" icon={<PlusCircle className="w-6 h-6" />} onClick={() => setActiveTab('lista')} />
        <div className="h-10 w-[1px] bg-slate-100" />
        <NavItem active={activeTab === 'ajuda'} label="Ajuda" icon={<HelpCircle className="w-6 h-6" />} onClick={() => setActiveTab('ajuda')} />
        <NavItem active={activeTab === 'perfil'} label="Perfil" icon={<Settings className="w-6 h-6" />} onClick={() => setActiveTab('perfil')} />
      </nav>

      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
      
      <WelcomeModal 
        isOpen={showWelcome} 
        onClose={handleCloseWelcome} 
        userName={user.displayName || 'Estimado Utilizador'} 
      />

      <HelpModal 
        isOpen={showHelp} 
        onClose={() => setShowHelp(false)} 
      />
    </div>
  );
}

function NavItem({ active, label, icon, onClick }: { active: boolean, label: string, icon: React.ReactNode, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1.5 transition-all ${active ? 'text-[#004FAC] scale-110' : 'text-slate-300'}`}>
      {icon}
      <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
      {active && <motion.div layoutId="nav-dot" className="w-1 h-1 bg-[#004FAC] rounded-full" />}
    </button>
  );
}

function ATMCard({ atm, onNavigate }: { atm: ATM, onNavigate?: () => void }) {
  const statusLabels = {
    disponivel: 'Tem Dinheiro',
    sem_dinheiro: 'Sem Dinheiro',
    sem_papel: 'Apenas Papel',
    fora_de_servico: 'Fora do Ar'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-50 flex items-center gap-5 group hover:shadow-xl hover:shadow-blue-900/5 transition-all"
    >
      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0 border border-slate-100">
        <MulticaixaLogo size="sm" />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-slate-900 text-sm truncate">{atm.bankName}</h3>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider truncate mb-2">{atm.locationName}</p>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${
              atm.status === 'disponivel' ? 'bg-green-500' : 
              atm.status === 'sem_dinheiro' ? 'bg-red-500' : 'bg-slate-300'
            }`} />
            <span className="text-[10px] font-bold text-slate-500">{statusLabels[atm.status]}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 rounded-lg">
            <Clock className="w-3 h-3 text-slate-300" />
            <span className="text-[9px] font-bold text-slate-400">Perto de si</span>
          </div>
        </div>
      </div>

      <button 
        onClick={onNavigate}
        className="w-10 h-10 rounded-2xl bg-blue-50 text-[#004FAC] flex items-center justify-center group-hover:bg-[#004FAC] group-hover:text-white transition-all scale-90 group-hover:scale-100 shadow-lg shadow-blue-900/5"
      >
        <Navigation className="w-5 h-5" />
      </button>
    </motion.div>
  );
}

