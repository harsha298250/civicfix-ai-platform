import { apiClient } from './apiClient.js';

/**
 * Formats an ISO date string into a clean, human-readable relative timestamp.
 */
export function formatRelativeTime(dateInput) {
  if (!dateInput) return 'Recently';
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return 'Recently';
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 45) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return 'Recently';
  }
}

/**
 * Normalizes backend Notification entity / DTO into uniform frontend presentation structure.
 */
export function mapBackendNotificationToFrontend(raw) {
  if (!raw) return null;
  const createdAt = raw.createdAt || raw.created_at || new Date().toISOString();
  const read = Boolean(
    raw.read !== undefined ? raw.read : (raw.isRead !== undefined ? raw.isRead : raw.is_read)
  );
  const complaintId = raw.complaintId || raw.complaint_id || null;
  const targetUrl = raw.targetUrl || raw.target_url || null;
  const link = targetUrl || (complaintId ? `/citizen/complaints/${complaintId}` : null);
  const time = formatRelativeTime(createdAt);

  return {
    id: raw.id,
    referenceId: raw.referenceId || raw.reference_id || null,
    title: raw.title || 'System Notification',
    message: raw.message || '',
    type: raw.notificationType || raw.type || 'INFO',
    notificationType: raw.notificationType || raw.type || 'INFO',
    severity: String(raw.severity || 'INFO').toLowerCase(),
    targetUrl,
    link,
    read,
    is_read: read,
    readAt: raw.readAt || raw.read_at || null,
    createdAt,
    complaintId,
    actorName: raw.actorName || raw.actor_name || null,
    time,
    relativeTime: time
  };
}

/**
 * Notification Service Module (Phase 5, Stage 5)
 */
export const notificationService = {
  /**
   * Fetches paginated notifications for the authenticated user from the backend.
   * 
   * @param {Object} params - { page, size, unreadOnly }
   * @returns {Promise<Object>} { content, page, size, totalElements, totalPages, last }
   */
  getNotifications: async (params = {}) => {
    const response = await apiClient.notifications.list(params);
    const data = response?.data || response;

    if (Array.isArray(data)) {
      const content = data.map(mapBackendNotificationToFrontend);
      return {
        content,
        items: content,
        page: 0,
        size: content.length,
        totalElements: content.length,
        totalPages: 1,
        last: true
      };
    }

    const rawContent = data?.content || [];
    const content = rawContent.map(mapBackendNotificationToFrontend);
    return {
      content,
      items: content,
      page: data?.page || 0,
      size: data?.size || rawContent.length,
      totalElements: data?.totalElements !== undefined ? data.totalElements : rawContent.length,
      totalPages: data?.totalPages !== undefined ? data.totalPages : 1,
      last: Boolean(data?.last ?? true)
    };
  },

  /**
   * Fetches the current unread badge count for the authenticated user.
   * 
   * @returns {Promise<number>} Unread count
   */
  getUnreadCount: async () => {
    const response = await apiClient.notifications.getUnreadCount();
    const data = response?.data || response;
    if (typeof data?.unreadCount === 'number') return data.unreadCount;
    if (typeof data?.count === 'number') return data.count;
    if (typeof data === 'number') return data;
    return 0;
  },

  /**
   * Marks a single notification as read.
   * 
   * @param {string} id - Notification UUID
   * @returns {Promise<Object>} Updated notification object
   */
  markAsRead: async (id) => {
    if (!id || (typeof id === 'string' && id.trim() === '')) {
      const err = new Error('Notification ID is required.');
      err.status = 400;
      throw err;
    }
    const response = await apiClient.notifications.markAsRead(id);
    const data = response?.data || response;
    return mapBackendNotificationToFrontend(data);
  },

  /**
   * Marks all unread notifications for the authenticated user as read.
   * 
   * @returns {Promise<Object>} { updatedCount }
   */
  markAllAsRead: async () => {
    const response = await apiClient.notifications.markAllAsRead();
    const data = response?.data || response;
    return {
      updatedCount: typeof data?.updatedCount === 'number' ? data.updatedCount : 0
    };
  }
};

export const getNotifications = notificationService.getNotifications;
export const getUnreadCount = notificationService.getUnreadCount;
export const markAsRead = notificationService.markAsRead;
export const markAllAsRead = notificationService.markAllAsRead;

export default notificationService;
