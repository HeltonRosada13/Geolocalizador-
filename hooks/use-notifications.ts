'use client';

import { useEffect, useRef, useState } from 'react';
import { ATM } from '@/app/page';

export function useNotifications(atms: ATM[], userLocation: [number, number] | null) {
  const prevAtmsRef = useRef<ATM[]>([]);
  const notifiedAtmsRef = useRef<Set<string>>(new Set());
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  // Register Service Worker and check permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        console.log('Service Worker registered with scope:', registration.scope);
      }).catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        const hasAsked = localStorage.getItem('flipa_notifications_asked');
        if (!hasAsked) {
          // Use a small delay to avoid synchronous state update in effect
          const timer = setTimeout(() => {
            setShowPermissionPrompt(true);
          }, 1000);
          return () => clearTimeout(timer);
        }
      }
    }
  }, []);

  const requestPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      localStorage.setItem('flipa_notifications_asked', 'true');
      setShowPermissionPrompt(false);
      
      if (permission === 'granted') {
        sendNotification('Notificações Ativadas! ✅', 'Agora receberá atualizações em tempo real sobre os ATMs de Luanda.');
      }
    }
  };

  const sendNotification = async (title: string, body: string, tag?: string, url?: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          registration.showNotification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            vibrate: [200, 100, 200],
            tag: tag || 'flipa-general',
            renotify: true,
            data: {
              url: url || window.location.origin
            },
            actions: [
              { action: 'open', title: 'Ver Detalhes 🔍' },
              { action: 'close', title: 'Ignorar' }
            ]
          });
        } catch (e) {
          new Notification(title, { body, icon: '/favicon.ico' });
        }
      } else {
        new Notification(title, { body, icon: '/favicon.ico' });
      }
    }
    console.log(`[NOTIFICATION] ${title}: ${body}`);
  };

  // Helper to calculate distance in meters
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // 1. Monitor ANY Status Changes (Broadcast to all users)
  useEffect(() => {
    if (prevAtmsRef.current.length > 0) {
      atms.forEach(atm => {
        const prevAtm = prevAtmsRef.current.find(a => a.id === atm.id);
        if (prevAtm && prevAtm.status !== atm.status) {
          const statusNames = {
            disponivel: 'já tem DINHEIRO disponível 💰',
            sem_dinheiro: 'ficou SEM DINHEIRO ❌',
            sem_papel: 'está APENAS COM PAPEL 📄',
            fora_de_servico: 'entrou em MANUTENÇÃO ⚠️'
          };

          const statusEmoji = atm.status === 'disponivel' ? '✅' : '📢';

          if (atm.status === 'disponivel') {
            try {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3');
              audio.play().catch(e => console.log('Audio play blocked'));
            } catch (e) {}
          }

          sendNotification(
            `${statusEmoji} Atualização: ${atm.bankName}`,
            `O caixa no ${atm.locationName} ${statusNames[atm.status]}. Verifique antes de se deslocar!`,
            `status-${atm.id}`,
            window.location.origin
          );
        }
      });
    }
    prevAtmsRef.current = atms;
  }, [atms]);

  // 2. Proximity Alerts
  useEffect(() => {
    if (!userLocation || atms.length === 0) return;

    atms.forEach(atm => {
      const distance = getDistance(userLocation[0], userLocation[1], atm.latitude, atm.longitude);
      
      if (distance < 50 && !notifiedAtmsRef.current.has(atm.id)) {
        const distText = distance < 10 ? 'mesmo ao lado' : `a apenas ${Math.round(distance)} metros`;
        
        sendNotification(
          `ATM Muito Próximo! 📍`,
          `Estás ${distText} do ${atm.bankName} (${atm.locationName}). Ajuda a comunidade relatando o estado atual!`,
          `proximity-${atm.id}`,
          window.location.origin
        );
        
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(e => console.log('Audio play blocked'));
        } catch (e) {}

        notifiedAtmsRef.current.add(atm.id);
      } else if (distance > 150 && notifiedAtmsRef.current.has(atm.id)) {
        notifiedAtmsRef.current.delete(atm.id);
      }
    });
  }, [userLocation, atms]);

  return { 
    sendNotification, 
    showPermissionPrompt, 
    requestPermission,
    setShowPermissionPrompt 
  };
}
