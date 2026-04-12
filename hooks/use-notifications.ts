'use client';

import { useEffect, useRef, useState } from 'react';
import { ATM } from '@/app/page';
import { getMessagingInstance, db } from '@/lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export function useNotifications(atms: ATM[], userLocation: [number, number] | null, user: any) {
  const prevAtmsRef = useRef<ATM[]>([]);
  const notifiedAtmsRef = useRef<Set<string>>(new Set());
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  // Register Service Worker and check permission
  useEffect(() => {
    const setupMessaging = async () => {
      if (typeof window === 'undefined') return;

      // Register Firebase Service Worker
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          console.log('FCM Service Worker registered:', registration.scope);
        } catch (error) {
          console.error('FCM Service Worker registration failed:', error);
        }
      }

      const messaging = await getMessagingInstance();
      if (!messaging) return;

      // Handle foreground messages
      onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);
        if (payload.notification) {
          sendNotification(payload.notification.title || 'Alerta Flipa', payload.notification.body || '');
        }
      });
    };

    setupMessaging();

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
      try {
        const permission = await Notification.requestPermission();
        localStorage.setItem('flipa_notifications_asked', 'true');
        setShowPermissionPrompt(false);
        
        if (permission === 'granted') {
          const messaging = await getMessagingInstance();
          if (messaging && user) {
            const token = await getToken(messaging, {
              vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
            });
            
            if (token) {
              setFcmToken(token);
              // Store token in Firestore for background pushes
              await setDoc(doc(db, 'fcm_tokens', user.uid), {
                token,
                userUid: user.uid,
                updatedAt: serverTimestamp()
              });
            }
          }
          sendNotification('Notificações Ativadas! ✅', 'Agora receberá atualizações em tempo real sobre os ATMs de Luanda.');
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
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
            icon: '/icon.svg',
            badge: '/icon.svg',
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
          new Notification(title, { body, icon: '/icon.svg' });
        }
      } else {
        new Notification(title, { body, icon: '/icon.svg' });
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

          // Trigger background push for other users via API
          if (user) {
            fetch('/api/push', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: `${statusEmoji} Atualização: ${atm.bankName}`,
                body: `O caixa no ${atm.locationName} ${statusNames[atm.status]}.`,
                excludeUser: user.uid
              })
            }).catch(e => console.error('Push trigger failed:', e));
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
