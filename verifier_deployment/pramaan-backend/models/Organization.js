// models/Organization.js
import mongoose from 'mongoose';

const OrganizationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    domain: { type: String },
    plan: {
        type: String,
        enum: ['trial', 'starter', 'professional', 'enterprise'],
        default: 'trial'
    },
    apiKeys: [{
        key: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        lastUsed: { type: Date },
        isActive: { type: Boolean, default: true },
        permissions: {
            maxUsers: { type: Number, default: 100 },
            maxProofsPerMonth: { type: Number, default: 1000 },
            allowedEndpoints: [{
                type: String,
                enum: ['authenticate', 'verify', 'register', 'proof-history']
            }]
        }
    }],
    billing: {
        stripeCustomerId: String,
        subscriptionId: String,
        currentPeriodEnd: Date,
        status: {
            type: String,
            enum: ['active', 'past_due', 'canceled', 'trial'],
            default: 'trial'
        }
    },
    usage: {
        currentMonthProofs: { type: Number, default: 0 },
        currentMonthUsers: { type: Number, default: 0 },
        lastResetDate: { type: Date, default: Date.now }
    },
    settings: {
        webhookUrl: String,
        allowedOrigins: [String],
        ipWhitelist: [String]
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Update usage counters monthly
OrganizationSchema.methods.resetMonthlyUsage = function () {
    const now = new Date();
    const lastReset = new Date(this.usage.lastResetDate);

    if (now.getMonth() !== lastReset.getMonth() ||
        now.getFullYear() !== lastReset.getFullYear()) {
        this.usage.currentMonthProofs = 0;
        this.usage.currentMonthUsers = 0;
        this.usage.lastResetDate = now;
        return this.save();
    }
};

export default mongoose.model('Organization', OrganizationSchema);