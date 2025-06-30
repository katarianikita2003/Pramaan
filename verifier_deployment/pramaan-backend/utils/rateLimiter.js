// utils/rateLimiter.js - Simplified version without Redis for now
import rateLimit from 'express-rate-limit';

// Rate limiter configurations for different plans (in-memory)
// utils/rateLimiter.js - Update the rateLimiters object
export const rateLimiters = {
    trial: rateLimit({  // Add this new rate limiter for trial plan
        windowMs: 60 * 1000, // 1 minute
        max: 30, // 30 requests per minute for trial
        message: 'Rate limit exceeded for trial plan',
        standardHeaders: true,
        legacyHeaders: false,
    }),
    starter: rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 60, // 60 requests per minute
        message: 'Rate limit exceeded for starter plan',
        standardHeaders: true,
        legacyHeaders: false,
    }),
    professional: rateLimit({
        windowMs: 60 * 1000,
        max: 300, // 300 requests per minute
        message: 'Rate limit exceeded for professional plan',
        standardHeaders: true,
        legacyHeaders: false,
    }),
    enterprise: rateLimit({
        windowMs: 60 * 1000,
        max: 1000, // 1000 requests per minute
        message: 'Rate limit exceeded for enterprise plan',
        standardHeaders: true,
        legacyHeaders: false,
    })
};

// Mock Redis client for now
export const redisClient = {
    hIncrBy: async () => { },
    hGetAll: async () => ({}),
    expire: async () => { },
    on: () => { },
    connect: async () => { }
};

// Usage tracking (in-memory for now)
const usageStore = new Map();

export class UsageTracker {
    constructor() {
        this.usage = usageStore;
    }

    async trackApiCall(organizationId, endpoint) {
        const month = new Date().toISOString().slice(0, 7);
        const key = `${organizationId}:${month}`;

        if (!this.usage.has(key)) {
            this.usage.set(key, {});
        }

        const data = this.usage.get(key);
        data.total = (data.total || 0) + 1;
        data[endpoint] = (data[endpoint] || 0) + 1;
    }

    async getMonthlyUsage(organizationId, month = null) {
        if (!month) {
            month = new Date().toISOString().slice(0, 7);
        }

        const key = `${organizationId}:${month}`;
        return this.usage.get(key) || {};
    }
}