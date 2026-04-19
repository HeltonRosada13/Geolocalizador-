'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, updateDoc, getDocs, where, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { MulticaixaLogo } from './multicaixa-logo';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  BarChart3, 
  Database, 
  Users, 
  Activity,
  X,
  Save,
  TrendingUp,
  AlertCircle,
  Search
} from 'lucide-react';
import { ATM } from '@/lib/types';

interface AdminPanelProps {
  onClose: () => void;
}

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const [atms, setAtms] = useState<ATM[]>([]);
  const [usersCount, setUsersCount] = useState(0);
  const [activeUsersCount, setActiveUsersCount] = useState(0);
  const [topSearches, setTopSearches] = useState<{query: string, count: number}[]>([]);
  const [topUsageAreas, setTopUsageAreas] = useState<{area: string, count: number}[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingAtm, setEditingAtm] = useState<ATM | null>(null);
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [atmToDelete, setAtmToDelete] = useState<ATM | null>(null);
  const [statusMessage, setStatusMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    bankName: '',
    locationName: '',
    address: '',
    latitude: -8.8383,
    longitude: 13.2344,
    status: 'disponivel' as ATM['status']
  });

  useEffect(() => {
    // Fetch ATMs
    const unsubscribeAtms = onSnapshot(collection(db, 'atms'), (snapshot) => {
      setAtms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ATM)));
    });

    // Fetch Stats
    const fetchStats = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        setUsersCount(usersSnap.size);
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();

    // Fetch Active Users (last 24h)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const unsubscribeActiveUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const active = snapshot.docs.filter(doc => {
        const data = doc.data();
        if (!data.lastActiveAt) return false;
        const lastActive = data.lastActiveAt.toDate ? data.lastActiveAt.toDate() : new Date(data.lastActiveAt);
        return lastActive > twentyFourHoursAgo;
      });
      setActiveUsersCount(active.length);
    });

    // Fetch Search Analytics
    const unsubscribeSearches = onSnapshot(collection(db, 'analytics_searches'), (snapshot) => {
      const counts: {[key: string]: number} = {};
      snapshot.docs.forEach(doc => {
        const query = doc.data().query;
        counts[query] = (counts[query] || 0) + 1;
      });
      const sorted = Object.entries(counts)
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setTopSearches(sorted);
    });

    // Fetch Usage Analytics
    const unsubscribeUsage = onSnapshot(collection(db, 'analytics_usage'), (snapshot) => {
      const counts: {[key: string]: number} = {};
      snapshot.docs.forEach(doc => {
        const area = doc.data().locationName;
        counts[area] = (counts[area] || 0) + 1;
      });
      const sorted = Object.entries(counts)
        .map(([area, count]) => ({ area, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setTopUsageAreas(sorted);
    });

    return () => {
      unsubscribeAtms();
      unsubscribeActiveUsers();
      unsubscribeSearches();
      unsubscribeUsage();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSave = {
        ...formData,
        lastReportedAt: new Date()
      };

      if (editingAtm) {
        await updateDoc(doc(db, 'atms', editingAtm.id), dataToSave);
        console.log("ATM updated successfully:", editingAtm.id);
      } else {
        const docRef = await addDoc(collection(db, 'atms'), dataToSave);
        console.log("ATM added successfully with ID:", docRef.id);
      }
      
      setIsAdding(false);
      setEditingAtm(null);
      setFormData({ bankName: '', locationName: '', address: '', latitude: -8.8383, longitude: 13.2344, status: 'disponivel' });
      
      setStatusMessage({
        text: editingAtm ? 'ATM atualizado com sucesso!' : 'Novo ATM adicionado com sucesso!',
        type: 'success'
      });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      console.error("Error saving ATM:", error);
      handleFirestoreError(error, OperationType.WRITE, 'atms');
      setStatusMessage({ text: 'Erro ao guardar as alterações.', type: 'error' });
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleDelete = async () => {
    if (!atmToDelete) return;
    
    try {
      const id = atmToDelete.id;
      const batch = writeBatch(db);
      
      // 1. Delete the ATM document
      batch.delete(doc(db, 'atms', id));
      
      // 2. Commit the batch
      await batch.commit();
      
      console.log("ATM deleted successfully:", id);
      setAtmToDelete(null);
      setStatusMessage({ text: 'ATM eliminado com sucesso!', type: 'success' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      console.error("Error deleting ATM and reports:", error);
      handleFirestoreError(error, OperationType.DELETE, `atms/${atmToDelete.id}`);
      setStatusMessage({ text: 'Erro ao eliminar o ATM.', type: 'error' });
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: ATM['status']) => {
    try {
      await updateDoc(doc(db, 'atms', id), {
        status: newStatus,
        lastReportedAt: new Date()
      });
      setEditingStatusId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'atms');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-white overflow-y-auto"
    >
      {/* Admin Header */}
      <div className="bg-blue-900 text-white p-4 sticky top-0 z-10 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <MulticaixaLogo size="sm" />
          <div>
            <h2 className="text-lg font-bold">Painel de Administração</h2>
            <p className="text-[10px] text-blue-200">Gestão de Infraestrutura Flipa ATM</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-blue-800 rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
            <div className="flex items-center gap-3 mb-2">
              <CreditCardIcon className="w-5 h-5 text-blue-600" />
              <span className="text-xs font-bold text-blue-800 uppercase">Total ATMs</span>
            </div>
            <p className="text-3xl font-black text-blue-900">{atms.length}</p>
          </div>
          <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-purple-600" />
              <span className="text-xs font-bold text-purple-800 uppercase">Utilizadores</span>
            </div>
            <p className="text-3xl font-black text-purple-900">{usersCount}</p>
          </div>
          <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              <span className="text-xs font-bold text-orange-800 uppercase">Utilizadores Ativos</span>
            </div>
            <p className="text-3xl font-black text-orange-900">{activeUsersCount}</p>
          </div>
        </div>

        {/* AI Analytics Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider">
              <Search className="w-4 h-4 text-blue-600" />
              Onde procuram mais dinheiro?
            </h3>
            <div className="space-y-3">
              {topSearches.length > 0 ? topSearches.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm font-bold text-gray-700 capitalize">{s.query}</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black">{s.count} Buscas</span>
                </div>
              )) : (
                <p className="text-xs text-gray-400 text-center py-4">Sem dados de busca ainda.</p>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider">
              <Activity className="w-4 h-4 text-green-600" />
              Áreas de maior utilização
            </h3>
            <div className="space-y-3">
              {topUsageAreas.length > 0 ? topUsageAreas.map((u, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm font-bold text-gray-700">{u.area}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500" 
                        style={{ width: `${(u.count / (topUsageAreas[0]?.count || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-black text-green-700">{u.count} Cliques</span>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-gray-400 text-center py-4">Sem dados de utilização ainda.</p>
              )}
            </div>
          </div>
        </section>

        {/* ATM Management */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              Gestão de ATMs
            </h3>
            <button 
              onClick={() => { setIsAdding(true); setEditingAtm(null); }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all"
            >
              <Plus className="w-4 h-4" />
              Novo ATM
            </button>
          </div>

          <div className="bg-white border border-gray-100 rounded-3xl shadow-sm">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead className="bg-gray-50 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                <tr>
                  <th className="p-4 rounded-tl-3xl">Banco / Local</th>
                  <th className="p-4">Coordenadas</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-right rounded-tr-3xl">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {atms.map((atm, index) => (
                  <tr key={atm.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className={`p-4 ${index === atms.length - 1 ? 'rounded-bl-3xl' : ''}`}>
                      <div className="font-bold text-gray-900">{atm.bankName}</div>
                      <div className="text-xs text-gray-500">{atm.locationName}</div>
                    </td>
                    <td className="p-4 font-mono text-[10px] text-gray-400">
                      {atm.latitude.toFixed(4)}, {atm.longitude.toFixed(4)}
                    </td>
                    <td className="p-4 relative">
                      <button 
                        onClick={() => setEditingStatusId(editingStatusId === atm.id ? null : atm.id)}
                        className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-50 border border-gray-100 hover:border-blue-200 transition-all active:scale-90"
                      >
                        <div className={`w-2 h-2 rounded-full shadow-sm ${
                          atm.status === 'disponivel' ? 'bg-green-500 shadow-green-200' : 
                          atm.status === 'sem_papel' ? 'bg-orange-500 shadow-orange-200' :
                          'bg-gray-500 shadow-gray-200'
                        }`} />
                      </button>

                      {editingStatusId === atm.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-20" 
                            onClick={() => setEditingStatusId(null)} 
                          />
                          <div className="absolute right-0 mt-2 w-40 bg-white rounded-2xl shadow-2xl border border-gray-100 z-30 overflow-hidden py-2 animate-in fade-in zoom-in duration-200">
                            <div className="px-3 py-1 mb-1 text-[8px] font-black text-gray-400 uppercase tracking-widest">Alterar Estado</div>
                            <button 
                              onClick={() => handleUpdateStatus(atm.id, 'disponivel')}
                              className="w-full px-3 py-2 text-[10px] font-bold text-left hover:bg-green-50 text-green-700 flex items-center gap-3 transition-colors"
                            >
                              <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm shadow-green-200" />
                              Tem Dinheiro
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(atm.id, 'sem_papel')}
                              className="w-full px-3 py-2 text-[10px] font-bold text-left hover:bg-orange-50 text-orange-700 flex items-center gap-3 transition-colors"
                            >
                              <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm shadow-orange-200" />
                              Apenas Papel
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(atm.id, 'sem_dinheiro')}
                              className="w-full px-3 py-2 text-[10px] font-bold text-left hover:bg-gray-50 text-gray-700 flex items-center gap-3 transition-colors"
                            >
                              <div className="w-2.5 h-2.5 rounded-full bg-gray-500 shadow-sm shadow-gray-200" />
                              Sem Dinheiro
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                    <td className={`p-4 text-right space-x-2 ${index === atms.length - 1 ? 'rounded-br-3xl' : ''}`}>
                      <button 
                        onClick={() => {
                          setEditingAtm(atm);
                          setFormData({
                            bankName: atm.bankName,
                            locationName: atm.locationName,
                            address: atm.address || '',
                            latitude: atm.latitude,
                            longitude: atm.longitude,
                            status: atm.status
                          });
                          setIsAdding(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setAtmToDelete(atm)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Status Message Toast */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              statusMessage.type === 'success' ? 'bg-green-600 border-green-500 text-white' : 'bg-red-600 border-red-500 text-white'
            }`}
          >
            {statusMessage.type === 'success' ? <TrendingUp className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-bold text-sm">{statusMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {atmToDelete && (
          <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center space-y-6"
            >
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-10 h-10 text-red-600" />
              </div>
              
              <div className="space-y-2">
                <h4 className="text-xl font-black text-gray-900">Eliminar ATM?</h4>
                <p className="text-sm text-gray-500">
                  Tens a certeza que desejas eliminar o <span className="font-bold text-gray-900">{atmToDelete.bankName}</span> em <span className="font-bold text-gray-900">{atmToDelete.locationName}</span>?
                  <br />
                  <span className="text-red-600 font-bold mt-2 block italic text-xs">Esta ação é irreversível e apagará todo o histórico.</span>
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleDelete}
                  className="w-full py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-100 hover:bg-red-700 transition-all active:scale-95"
                >
                  Sim, Eliminar Agora
                </button>
                <button
                  onClick={() => setAtmToDelete(null)}
                  className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl font-bold hover:bg-gray-100 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h4 className="font-bold text-gray-900">{editingAtm ? 'Editar ATM' : 'Adicionar Novo ATM'}</h4>
              <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Banco</label>
                  <input 
                    required
                    value={formData.bankName}
                    onChange={e => setFormData({...formData, bankName: e.target.value})}
                    placeholder="Ex: BAI"
                    className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Local</label>
                  <input 
                    required
                    value={formData.locationName}
                    onChange={e => setFormData({...formData, locationName: e.target.value})}
                    placeholder="Ex: Kinaxixi"
                    className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Endereço</label>
                <input 
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  placeholder="Rua, Bairro..."
                  className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Latitude</label>
                  <input 
                    type="number" step="any" required
                    value={formData.latitude}
                    onChange={e => setFormData({...formData, latitude: parseFloat(e.target.value)})}
                    className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Longitude</label>
                  <input 
                    type="number" step="any" required
                    value={formData.longitude}
                    onChange={e => setFormData({...formData, longitude: parseFloat(e.target.value)})}
                    className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Estado Inicial</label>
                <select 
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as ATM['status']})}
                  className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="disponivel">Tem Dinheiro</option>
                  <option value="sem_papel">Apenas Papel</option>
                  <option value="sem_dinheiro">Sem Dinheiro</option>
                  <option value="fora_de_servico">Fora de Serviço (Sem Dinheiro)</option>
                </select>
              </div>
              <button 
                type="submit"
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
              >
                <Save className="w-5 h-5" />
                {editingAtm ? 'Guardar Alterações' : 'Criar ATM'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <rect width="20" height="14" x="2" y="5" rx="2" strokeWidth="2" />
      <path d="M2 10h20" strokeWidth="2" />
    </svg>
  );
}
