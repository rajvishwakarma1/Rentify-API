const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { logger } = require('../utils/logger');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[+]?\d{7,15}$/; // simple international format

const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: { validator: (v) => emailRegex.test(v), message: 'Invalid email' },
    },
    phone: { type: String, trim: true, validate: { validator: (v) => !v || phoneRegex.test(v), message: 'Invalid phone' } },
    passwordHash: { type: String, required: true },
    emailVerified: { type: Boolean, default: false },
    avatar: { type: String },
    bio: { type: String, maxlength: 1000 },
    preferences: {
      language: { type: String, default: 'en' },
      currency: { type: String, default: 'USD' },
      notifications: { type: Boolean, default: true },
    },
    role: { type: String, enum: ['user', 'host', 'admin'], default: 'user' },
    status: { type: String, enum: ['active', 'suspended', 'deleted'], default: 'active' },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ lastName: 1, firstName: 1 });
UserSchema.index({ role: 1, status: 1 });

// Virtuals
UserSchema.virtual('fullName').get(function fullName() {
  return [this.firstName, this.lastName].filter(Boolean).join(' ');
});

// Methods
UserSchema.methods.comparePassword = async function comparePassword(plain) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plain, this.passwordHash);
};

UserSchema.methods.setPassword = async function setPassword(plain) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(plain, salt);
};

UserSchema.methods.updateProfile = async function updateProfile(update) {
  const allowed = ['firstName', 'lastName', 'phone', 'avatar', 'bio', 'preferences'];
  for (const key of allowed) {
    if (update[key] !== undefined) this[key] = update[key];
  }
  return this.save();
};

// Statics
UserSchema.statics.findByEmail = function findByEmail(email) {
  return this.findOne({ email: String(email).toLowerCase().trim() });
};

UserSchema.statics.authenticate = async function authenticate(email, password) {
  const user = await this.findByEmail(email);
  if (!user) return null;
  const match = await user.comparePassword(password);
  return match ? user : null;
};

UserSchema.post('save', (doc) => {
  logger.debug('User saved', { id: doc._id, email: doc.email });
});

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
