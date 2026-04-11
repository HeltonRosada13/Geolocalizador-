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
  
  const notificationTitle = payload.notification.title || 'Alerta Flipa ATM';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
