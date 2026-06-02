import mongoose from 'mongoose';

const playerRefSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true },
    initial: { type: String, default: '?' },
    profileImage: { type: String, default: null },
  },
  { _id: false }
);

const hintSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    round: { type: Number, required: true },
    hint: { type: String, required: true },
    submittedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const voteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    round: { type: Number, required: true },
    votedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const eliminatedSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    round: { type: Number, required: true },
    voteCount: { type: Number, default: 0 },
    confirmedImposter: { type: Boolean, default: null },
    confirmedAt: { type: Date, default: null },
  },
  { _id: false }
);

const imposterGameSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['lobby', 'word', 'hints', 'voting', 'elimination', 'ended'],
      default: 'lobby',
    },
    word: { type: String, default: null },
    imposterWord: { type: String, default: null },
    imposterUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    randomImposter: { type: Boolean, default: false },
    round: { type: Number, default: 1 },
    invitedUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    joinedUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    activePlayerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    hints: [hintSchema],
    votes: [voteSchema],
    eliminated: [eliminatedSchema],
    pendingEliminationUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    winner: {
      type: String,
      enum: ['players', 'imposter', null],
      default: null,
    },
  },
  { timestamps: true }
);

export const ImposterGame = mongoose.model('ImposterGame', imposterGameSchema);

export async function getActiveGame() {
  return ImposterGame.findOne({ status: { $ne: 'ended' } }).sort({ createdAt: -1 });
}
