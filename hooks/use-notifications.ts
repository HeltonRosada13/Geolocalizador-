'use client';

import { useEffect, useRef } from 'react';
import { ATM } from '@/app/page';

export function useNotifications(atms: ATM[], userLocation: [number, number] | null) {
  const prevAtmsRef = useRef<ATM[]>([]);
  const notifiedAtmsRef = useRef<Set<string>>(new Set()); // To avoid spamming proximity alerts

  // Request permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Helper to calculate distance in meters
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const sendNotification = (title: string, body: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico', // Fallback icon
      });
    } else {
      // Fallback for environments where Notification API is blocked (like some iframes)
      console.log(`[APP NOTIFICATION] ${title}: ${body}`);
    }
  };

  // 1. Monitor Refills
  useEffect(() => {
    if (prevAtmsRef.current.length > 0) {
      atms.forEach(atm => {
        const prevAtm = prevAtmsRef.current.find(a => a.id === atm.id);
        if (prevAtm && prevAtm.status !== 'disponivel' && atm.status === 'disponivel') {
          sendNotification(
            'ATM Abastecido! 💰',
            `O ATM ${atm.bankName} no ${atm.locationName} já tem dinheiro disponível.`
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
      
      // If within 100 meters and haven't notified for this ATM in this session
      if (distance < 100 && !notifiedAtmsRef.current.has(atm.id)) {
        sendNotification(
          'ATM Próximo! 📍',
          `Estás ao lado do ${atm.bankName} (${atm.locationName}). Aproveita para relatar se tem dinheiro!`
        );
        notifiedAtmsRef.current.add(atm.id);
      } 
      // Reset notification if user moves away (optional, to allow re-notifying later)
      else if (distance > 500 && notifiedAtmsRef.current.has(atm.id)) {
        notifiedAtmsRef.current.delete(atm.id);
      }
    });
  }, [userLocation, atms]);

  return { sendNotification };
}
