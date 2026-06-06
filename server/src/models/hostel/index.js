import mongoose from 'mongoose';

const { Schema } = mongoose;

function idTransform(_doc, ret) {
  ret.id = ret._id.toString();
  delete ret._id;
  delete ret.__v;
  return ret;
}

const collegeSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true, lowercase: true, trim: true },
    address: { type: String, default: null },
  },
  { timestamps: true, collection: 'hostel_colleges', toJSON: { transform: idTransform }, toObject: { transform: idTransform } },
);

const hostelSchema = new Schema(
  {
    collegeId: { type: Schema.Types.ObjectId, ref: 'HostelCollege', required: true, index: true },
    name: { type: String, required: true },
    building: { type: String, default: null },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    radiusMeters: { type: Number, default: 100 },
    allowedIps: { type: [String], default: [] },
    attendanceStart: { type: String, default: '21:00' },
    attendanceEnd: { type: String, default: '23:00' },
    timezone: { type: String, default: 'Asia/Kolkata' },
  },
  { timestamps: true, collection: 'hostel_hostels', toJSON: { transform: idTransform }, toObject: { transform: idTransform } },
);

const roomSchema = new Schema(
  {
    hostelId: { type: Schema.Types.ObjectId, ref: 'HostelBuilding', required: true, index: true },
    number: { type: String, required: true },
    floor: { type: Number, default: null },
    capacity: { type: Number, default: 2 },
  },
  { timestamps: true, collection: 'hostel_rooms', toJSON: { transform: idTransform }, toObject: { transform: idTransform } },
);
roomSchema.index({ hostelId: 1, number: 1 }, { unique: true });

const hostelUserSchema = new Schema(
  {
    collegeId: { type: Schema.Types.ObjectId, ref: 'HostelCollege', default: null, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    phone: { type: String, default: null },
    avatarUrl: { type: String, default: null },
    role: {
      type: String,
      enum: ['STUDENT', 'PARENT', 'WARDEN', 'SUPER_ADMIN'],
      default: 'STUDENT',
      index: true,
    },
    passwordHash: { type: String, default: null },
    googleId: { type: String, default: null, sparse: true, unique: true },
    mustChangePassword: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'hostel_users', toJSON: { transform: idTransform }, toObject: { transform: idTransform } },
);

const studentProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'HostelUser', required: true, unique: true },
    rollNumber: { type: String, required: true },
    hostelId: { type: Schema.Types.ObjectId, ref: 'HostelBuilding', default: null, index: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'HostelRoom', default: null },
    parentId: { type: Schema.Types.ObjectId, ref: 'HostelParentProfile', default: null, index: true },
  },
  { timestamps: true, collection: 'hostel_student_profiles', toJSON: { transform: idTransform }, toObject: { transform: idTransform } },
);

const parentProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'HostelUser', required: true, unique: true },
  },
  { timestamps: true, collection: 'hostel_parent_profiles', toJSON: { transform: idTransform }, toObject: { transform: idTransform } },
);

const wardenProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'HostelUser', required: true, unique: true },
    hostelId: { type: Schema.Types.ObjectId, ref: 'HostelBuilding', default: null, index: true },
  },
  { timestamps: true, collection: 'hostel_warden_profiles', toJSON: { transform: idTransform }, toObject: { transform: idTransform } },
);

const attendanceSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'HostelStudentProfile', required: true, index: true },
    date: { type: Date, required: true, index: true },
    markedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['PRESENT', 'ABSENT', 'ON_LEAVE', 'REJECTED'],
      required: true,
    },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    distanceM: { type: Number, default: null },
    publicIp: { type: String, default: null },
    faceScore: { type: Number, default: null },
    deviceId: { type: String, default: null },
    passedChecks: { type: [String], default: [] },
    failureReason: { type: String, default: null },
  },
  { timestamps: false, collection: 'hostel_attendance', toJSON: { transform: idTransform }, toObject: { transform: idTransform } },
);
attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

const leaveRequestSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'HostelStudentProfile', required: true, index: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['PENDING_PARENT', 'PENDING_WARDEN', 'APPROVED', 'REJECTED', 'CANCELLED'],
      default: 'PENDING_PARENT',
      index: true,
    },
  },
  { timestamps: true, collection: 'hostel_leave_requests', toJSON: { transform: idTransform }, toObject: { transform: idTransform } },
);

const leaveApprovalSchema = new Schema(
  {
    leaveRequestId: { type: Schema.Types.ObjectId, ref: 'HostelLeaveRequest', required: true, index: true },
    stage: { type: String, enum: ['PARENT', 'WARDEN'], required: true },
    decision: { type: String, enum: ['APPROVED', 'REJECTED'], required: true },
    comment: { type: String, default: null },
    decidedById: { type: Schema.Types.ObjectId, ref: 'HostelUser', required: true },
    decidedAt: { type: Date, default: Date.now },
  },
  { timestamps: false, collection: 'hostel_leave_approvals', toJSON: { transform: idTransform }, toObject: { transform: idTransform } },
);

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'HostelUser', required: true, index: true },
    type: {
      type: String,
      enum: [
        'MISSED_ATTENDANCE',
        'LEAVE_SUBMITTED',
        'LEAVE_APPROVED',
        'LEAVE_REJECTED',
        'EMERGENCY_BROADCAST',
        'ACCOUNT_INVITE',
        'GENERIC',
      ],
      required: true,
    },
    channel: { type: String, enum: ['EMAIL', 'SMS', 'WHATSAPP', 'PUSH'], default: 'PUSH' },
    status: { type: String, enum: ['QUEUED', 'SENT', 'FAILED', 'READ'], default: 'QUEUED', index: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: null },
    sentAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'hostel_notifications', toJSON: { transform: idTransform }, toObject: { transform: idTransform } },
);

const refreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'HostelUser', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    userAgent: { type: String, default: null },
    ip: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'hostel_refresh_tokens', toJSON: { transform: idTransform }, toObject: { transform: idTransform } },
);

const auditLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'HostelUser', default: null, index: true },
    action: { type: String, required: true, index: true },
    entity: { type: String, default: null },
    entityId: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: null },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'hostel_audit_logs', toJSON: { transform: idTransform }, toObject: { transform: idTransform } },
);

export const HostelCollege = mongoose.model('HostelCollege', collegeSchema);
export const HostelBuilding = mongoose.model('HostelBuilding', hostelSchema);
export const HostelRoom = mongoose.model('HostelRoom', roomSchema);
export const HostelUser = mongoose.model('HostelUser', hostelUserSchema);
export const HostelStudentProfile = mongoose.model('HostelStudentProfile', studentProfileSchema);
export const HostelParentProfile = mongoose.model('HostelParentProfile', parentProfileSchema);
export const HostelWardenProfile = mongoose.model('HostelWardenProfile', wardenProfileSchema);
export const HostelAttendance = mongoose.model('HostelAttendance', attendanceSchema);
export const HostelLeaveRequest = mongoose.model('HostelLeaveRequest', leaveRequestSchema);
export const HostelLeaveApproval = mongoose.model('HostelLeaveApproval', leaveApprovalSchema);
export const HostelNotification = mongoose.model('HostelNotification', notificationSchema);
export const HostelRefreshToken = mongoose.model('HostelRefreshToken', refreshTokenSchema);
export const HostelAuditLog = mongoose.model('HostelAuditLog', auditLogSchema);
