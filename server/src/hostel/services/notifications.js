import {
  HostelNotification,
  HostelWardenProfile,
  HostelStudentProfile,
} from '../../models/hostel/index.js';

export const notificationsService = {
  async createMany(items) {
    if (items.length === 0) return 0;
    const docs = items.map((n) => ({
      userId: n.userId,
      type: n.type,
      channel: 'PUSH',
      status: 'SENT',
      title: n.title,
      body: n.body,
      metadata: n.metadata,
      sentAt: new Date(),
    }));
    const result = await HostelNotification.insertMany(docs);
    return result.length;
  },

  async listMine(userId) {
    return HostelNotification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(100);
  },

  async unreadCount(userId) {
    return HostelNotification.countDocuments({ userId, readAt: null });
  },

  async markRead(userId, id) {
    await HostelNotification.updateOne(
      { _id: id, userId },
      { readAt: new Date(), status: 'READ' },
    );
    return { ok: true };
  },

  async markAllRead(userId) {
    await HostelNotification.updateMany(
      { userId, readAt: null },
      { readAt: new Date(), status: 'READ' },
    );
    return { ok: true };
  },

  async wardenLog(wardenUserId) {
    const warden = await HostelWardenProfile.findOne({ userId: wardenUserId });
    if (!warden?.hostelId) return [];

    const students = await HostelStudentProfile.find({ hostelId: warden.hostelId })
      .populate('userId')
      .populate({ path: 'parentId', populate: { path: 'userId' } });

    const recipientIds = new Set();
    const labelByUserId = new Map();
    for (const s of students) {
      recipientIds.add(s.userId._id.toString());
      labelByUserId.set(s.userId._id.toString(), `${s.userId.name} (student)`);
      if (s.parentId?.userId) {
        recipientIds.add(s.parentId.userId._id.toString());
        labelByUserId.set(
          s.parentId.userId._id.toString(),
          `${s.parentId.userId.name} (parent of ${s.userId.name})`,
        );
      }
    }
    if (recipientIds.size === 0) return [];

    const notifications = await HostelNotification.find({
      type: 'MISSED_ATTENDANCE',
      userId: { $in: [...recipientIds] },
    })
      .sort({ createdAt: -1 })
      .limit(200);

    return notifications.map((n) => ({
      id: n.id,
      recipient: labelByUserId.get(n.userId.toString()) ?? 'Unknown',
      title: n.title,
      body: n.body,
      status: n.status,
      sentAt: n.sentAt ?? n.createdAt,
    }));
  },
};
