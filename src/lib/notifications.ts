export async function sendNotification(title: string, options?: NotificationOptions) {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
        try {
            // Priority: Service Worker (Required for Android/PWA)
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    await registration.showNotification(title, options);
                    return;
                }
            }
        } catch (err) {
            console.warn('SW notification failed, trying fallback', err);
        }

        // Fallback: Standard Constructor (Desktop)
        try {
            new Notification(title, options);
        } catch (err) {
            console.error('Notification API error:', err);
        }
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
}
