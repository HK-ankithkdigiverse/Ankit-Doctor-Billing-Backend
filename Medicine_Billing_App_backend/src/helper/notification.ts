export type NotificationPayload = {
  title: string;
  message: string;
  userId?: string;
  data?: Record<string, unknown>;
};

export const sendNotification = async (payload: NotificationPayload) => {
  return {
    success: true,
    delivered: false,
    payload,
    note: "Notification provider is not configured.",
  };
};
