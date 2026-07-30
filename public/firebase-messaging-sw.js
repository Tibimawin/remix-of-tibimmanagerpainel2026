// Firebase Cloud Messaging Service Worker
// SW_VERSION: bump este valor sempre que alterar este arquivo.
// O registro no app usa ?v=SW_VERSION, forçando o navegador a baixar a nova versão.
const SW_VERSION = '1.0.1';
console.log('[firebase-messaging-sw.js] versão', SW_VERSION);

// Ativa imediatamente a nova versão, sem ficar presa em "waiting"
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js');

importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js');

// Configuração do Firebase (mesma do projeto tibimmanagerpainelvercel)
firebase.initializeApp({
  apiKey: "AIzaSyBN7cODHg978T4S2jPvrBsr5sqwZhGidtU",
  authDomain: "tibimmanagerpainelvercel.firebaseapp.com",
  projectId: "tibimmanagerpainelvercel",
  storageBucket: "tibimmanagerpainelvercel.firebasestorage.app",
  messagingSenderId: "915232934037",
  appId: "1:915232934037:web:e9386fab78107ba226339c"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensagem em background recebida:', payload);
  
  const notificationTitle = payload.notification?.title || 'Nova Notificação';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: payload.notification?.icon || '/favicon.ico',
    badge: '/favicon.ico',
    tag: payload.data?.tag || 'notification',
    data: payload.data,
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notificação clicada:', event);
  
  event.notification.close();
  
  // Abrir ou focar a janela do app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Se já existe uma janela aberta, focar nela
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Caso contrário, abrir nova janela
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});
