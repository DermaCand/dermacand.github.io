/* DermaCand — Service Worker de Firebase Cloud Messaging (notificaciones push).
   Maneja las notificaciones cuando la app está en segundo plano o cerrada.
   Debe servirse desde la raíz del dominio de GitHub Pages
   (https://<tu-usuario>.github.io/firebase-messaging-sw.js). */
importScripts('https://www.gstatic.com/firebasejs/12.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.14.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAtr5e9l_eZZznmR8g1cQVfiQ2Au8kJA-8",
  authDomain: "dermacand2026.firebaseapp.com",
  projectId: "dermacand2026",
  storageBucket: "dermacand2026.firebasestorage.app",
  messagingSenderId: "142933205897",
  appId: "1:142933205897:web:1d69738e610768b397f758"
});

const messaging = firebase.messaging();

// Mensaje recibido con la app en segundo plano: mostrar la notificación.
messaging.onBackgroundMessage(function (payload) {
  const n = payload.notification || payload.data || {};
  const title = n.title || 'DermaCand';
  const options = {
    body: n.body || '',
    icon: './icono-192.png',
    badge: './icono-192.png',
    data: { url: (payload.fcmOptions && payload.fcmOptions.link) || (payload.data && payload.data.url) || './' }
  };
  self.registration.showNotification(title, options);
});

// Al pulsar la notificación: abrir/enfocar la app.
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});
