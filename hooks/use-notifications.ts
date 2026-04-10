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

  const sendNotification = async (title: string, body: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          registration.showNotification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            vibrate: [200, 100, 200],
            tag: 'flipa-atm-update',
            renotify: true
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
            disponivel: 'com Dinheiro 💰',
            sem_dinheiro: 'sem Dinheiro ❌',
            sem_papel: 'apenas com Papel 📄',
            fora_de_servico: 'fora de serviço ⚠️'
          };

          sendNotification(
            'ATM Atualizado! 🔄',
            `O ATM ${atm.bankName} (${atm.locationName}) está agora ${statusNames[atm.status]}.`
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
      
      if (distance < 30 && !notifiedAtmsRef.current.has(atm.id)) {
        sendNotification(
          `ATM Próximo: ${atm.bankName} 📍`,
          `Estás mesmo ao lado do ${atm.locationName}. Ajuda a relatar se este ATM tem dinheiro ou não!`
        );
        
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(e => console.log('Audio play blocked'));
        } catch (e) {}

        notifiedAtmsRef.current.add(atm.id);
      } else if (distance > 100 && notifiedAtmsRef.current.has(atm.id)) {
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
