/**
 * notifications.ts
 * Bu dosya artık hooks/usePushNotifications.ts tarafından yönetilmektedir.
 * Expo Go uyumluluğu için tüm expo-notifications çağrıları lazy-load edilmiştir.
 * Doğrudan bu modülü import etmeyin — usePushNotifications hook'unu kullanın.
 */

export { sendLocalNotification, usePushNotifications, useAdminAppointmentNotifications } from '../hooks/usePushNotifications';
