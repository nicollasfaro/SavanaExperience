/*
 * Web Push Subscription and Notification client service
 */

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('Service Worker registered successfully with scope:', registration.scope);
      return registration;
    } catch (err) {
      console.error('Service Worker registration failed:', err);
      return null;
    }
  }
  return null;
}

export async function subscribeToPushNotifications(userId: string): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      console.warn('Push notifications are not fully supported on this browser or origin constraints.');
      return false;
    }

    // 1. Request desktop permission
    const permission = await window.Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission was not granted:', permission);
      return false;
    }

    // 2. Check or register Service Worker
    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      registration = await registerServiceWorker();
    }
    
    if (!registration) {
      console.warn('Could not register SW to receive push notifications.');
      return false;
    }

    // 3. Obtain VAPID public key
    const response = await fetch('/api/push/public-key');
    if (!response.ok) {
      throw new Error('Failed to retrieve VAPID public key');
    }
    const { publicKey } = await response.json();

    if (!publicKey) {
      throw new Error('VAPID public key was returned empty');
    }

    // 4. Create PushManager subscription
    const convertedVapidKey = urlBase64ToUint8Array(publicKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });

    // 5. Send registration details back to server
    const subscribeResponse = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        subscription
      })
    });

    if (!subscribeResponse.ok) {
      throw new Error('Failed to save subscription object in backend database.');
    }

    console.log('Web Push successfully linked for student ID:', userId);
    return true;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return false;
  }
}

export async function isPushSubscribed(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return false;
  }
  if (window.Notification.permission !== 'granted') {
    return false;
  }
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return false;

  const subscription = await registration.pushManager.getSubscription();
  return !!subscription;
}

export async function sendLiveClassPushAlert(props: {
  courseId: string;
  courseTitle: string;
  moduleTitle: string;
  roomId?: string;
  studentIds: string[];
}) {
  try {
    const response = await fetch('/api/push/notify-live', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(props)
    });
    const data = await response.json();
    console.log('Live class background push alert dispatched successfully:', data);
  } catch (error) {
    console.warn('Failed to transmit Web Push broadcast alerts:', error);
  }
}
