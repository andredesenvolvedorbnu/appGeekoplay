import { NotificationsClient } from '@/components/notifications-client';
import { PushNotificationSettings } from '@/components/push-notification-settings';

export default function Page(){
  return <div className="mx-auto max-w-4xl px-3 pb-10 sm:px-4"><PushNotificationSettings/><NotificationsClient/></div>;
}
