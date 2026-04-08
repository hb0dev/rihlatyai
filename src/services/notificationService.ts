import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';

export interface NotificationData {
  title: string;
  body: string;
  id?: number;
  data?: Record<string, any>;
}

// Track sent notifications to avoid duplicates
const sentNotifications = new Map<string, number>();
const NOTIFICATION_COOLDOWN = 1800000; // 30 minutes in milliseconds

class NotificationService {
  private isInitialized = false;
  private permissionGranted = false;

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return this.permissionGranted;
    }

    try {
      // Request permission
      const permission = await LocalNotifications.requestPermissions();
      console.log('Notification permission status:', permission.display);
      
      this.permissionGranted = permission.display === 'granted';
      this.isInitialized = true;
      
      if (this.permissionGranted) {
        // Listen for notification actions
        LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
          console.log('Notification action:', notification);
        });
      }
      
      return this.permissionGranted;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      this.isInitialized = true;
      this.permissionGranted = false;
      return false;
    }
  }

  // Check if we can send a notification (avoid spam)
  private canSendNotification(key: string): boolean {
    const lastSent = sentNotifications.get(key);
    if (!lastSent) return true;
    
    return Date.now() - lastSent > NOTIFICATION_COOLDOWN;
  }

  // Mark notification as sent
  private markNotificationSent(key: string): void {
    sentNotifications.set(key, Date.now());
  }

  // Generate unique notification ID
  private generateId(): number {
    return Math.floor(Math.random() * 100000) + Date.now();
  }

  // Send immediate notification
  async sendNotification(notification: NotificationData, uniqueKey?: string): Promise<boolean> {
    // Initialize if not done yet
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Check if permission was granted
    if (!this.permissionGranted) {
      console.log('Notification permission not granted, requesting again...');
      await this.initialize();
      if (!this.permissionGranted) {
        console.log('Still no permission, cannot send notification');
        return false;
      }
    }

    // Check cooldown if unique key provided
    if (uniqueKey && !this.canSendNotification(uniqueKey)) {
      console.log(`Notification "${uniqueKey}" skipped (cooldown)`);
      return false;
    }

    try {
      const notificationId = notification.id || this.generateId();
      console.log('Scheduling notification with ID:', notificationId);
      
      const options: ScheduleOptions = {
        notifications: [
          {
            id: notificationId,
            title: notification.title,
            body: notification.body,
            extra: notification.data,
            sound: 'default',
            attachments: undefined,
            actionTypeId: ''
          }
        ]
      };

      await LocalNotifications.schedule(options);
      
      if (uniqueKey) {
        this.markNotificationSent(uniqueKey);
      }
      
      console.log('Notification scheduled successfully:', notification.title);
      return true;
    } catch (error) {
      console.error('Failed to send notification:', error);
      return false;
    }
  }

  // Cancel all notifications
  async cancelAll(): Promise<void> {
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel(pending);
      }
    } catch (error) {
      console.error('Failed to cancel notifications:', error);
    }
  }
  clearHistory(): void {
    sentNotifications.clear();
  }
  }
export const notificationService = new NotificationService();

