importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAnQgjsAyPxlgv07lNloEHfGlF6Wus6Gfw",
  authDomain: "gen-lang-client-0890004441.firebaseapp.com",
  projectId: "gen-lang-client-0890004441",
  storageBucket: "gen-lang-client-0890004441.firebasestorage.app",
  messagingSenderId: "306137685013",
  appId: "1:306137685013:web:648c7382e6cc75d768c21c"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Mensagem recebida em segundo plano:', payload);
  
  const notificationTitle = payload.notification?.title || payload.data?.title || 'Alerta Flipa ATM';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'Há uma nova atualização nos ATMs.',
    icon: '/icon.svg',
    badge: '/icon.svg',
    data: payload.data || { url: '/' },
    tag: 'flipa-atm-alert',
    renotify: true,
    requireInteraction: true, // Keep notification visible until user interacts
    vibrate: [200, 100, 200]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const action = event.action;
  const atmId = event.notification.data?.atmId;
  const urlToOpen = event.notification.data?.url || '/';

  if (action === 'confirm_yes' || action === 'confirm_no') {
    const status = action === 'confirm_yes' ? 'disponivel' : 'sem_dinheiro';
    
    event.waitUntil(
      fetch('/api/atms/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          atmId,
          status,
          userUid: 'notification_action'
        })
      }).then(response => {
        if (response.ok) {
          console.log('[SW] Status atualizado com sucesso via notificação');
          // Optionally show a confirmation notification
          return self.registration.showNotification('Obrigado! 🙏', {
            body: `Confirmaste que o ATM ${status === 'disponivel' ? 'tem' : 'não tem'} dinheiro. A comunidade agradece!`,
            icon: '/icon.svg',
            tag: 'flipa-thanks',
            timeout: 3000
          });
        }
      }).catch(err => {
        console.error('[SW] Falha ao atualizar status:', err);
      })
    );
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
