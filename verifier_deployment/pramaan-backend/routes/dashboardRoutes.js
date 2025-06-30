// routes/dashboardRoutes.js
import express from 'express';
import jwt from 'jsonwebtoken';
import Organization from '../models/Organization.js';
import ApiActivity from '../models/ApiActivity.js';
import UserOrganization from '../models/UserOrganization.js';
import ApiKeyService from '../services/apiKeyService.js';
import { UsageTracker } from '../utils/rateLimiter.js';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { redisClient } from '../utils/rateLimiter.js';

const router = express.Router();
const usageTracker = new UsageTracker(redisClient);

// Middleware to authenticate dashboard users
const authenticateDashboard = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userOrg = await UserOrganization.findOne({
            userId: decoded.userId,
            organizationId: decoded.organizationId
        }).populate('userId');

        if (!userOrg) {
            return res.status(403).json({ error: 'Access denied' });
        }

        req.user = userOrg.userId;
        req.organization = await Organization.findById(decoded.organizationId);
        req.userRole = userOrg.role;
        
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Dashboard login
router.post('/dashboard/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const userOrg = await UserOrganization.findOne({ userId: user._id });
        if (!userOrg) {
            return res.status(403).json({ error: 'No organization found' });
        }

        const token = jwt.sign({
            userId: user._id,
            organizationId: userOrg.organizationId,
            role: userOrg.role
        }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: userOrg.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get organization details
router.get('/dashboard/organization', authenticateDashboard, async (req, res) => {
    try {
        const organization = req.organization;
        
        // Get current month usage from Redis
        const redisUsage = await usageTracker.getMonthlyUsage(organization._id);
        
        res.json({
            id: organization._id,
            name: organization.name,
            plan: organization.plan,
            billing: organization.billing,
            usage: {
                ...organization.usage,
                currentMonthProofs: parseInt(redisUsage.total || 0)
            },
            settings: organization.settings,
            apiKeys: organization.apiKeys.map(key => ({
                id: key._id,
                name: key.name,
                lastUsed: key.lastUsed,
                isActive: key.isActive,
                permissions: key.permissions,
                createdAt: key.createdAt
            }))
        });
    } catch (error) {
        console.error('Organization fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch organization' });
    }
});

// Create new API key
router.post('/dashboard/api-keys', authenticateDashboard, async (req, res) => {
    try {
        if (req.userRole !== 'owner' && req.userRole !== 'admin') {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const { name, permissions, testMode } = req.body;
        const organization = req.organization;

        const apiKey = testMode ? 
            ApiKeyService.generateTestApiKey() : 
            ApiKeyService.generateApiKey();
        
        const hashedKey = ApiKeyService.hashApiKey(apiKey);

        organization.apiKeys.push({
            key: hashedKey,
            name: name || 'New API Key',
            permissions: permissions || {
                maxUsers: 100,
                maxProofsPerMonth: 1000,
                allowedEndpoints: ['authenticate', 'verify', 'register', 'proof-history']
            }
        });

        await organization.save();

        res.json({
            success: true,
            apiKey: apiKey, // Only shown once!
            message: 'Save this API key securely. It won\'t be shown again.'
        });

    } catch (error) {
        console.error('API key creation error:', error);
        res.status(500).json({ error: 'Failed to create API key' });
    }
});

// Revoke API key
router.delete('/dashboard/api-keys/:keyId', authenticateDashboard, async (req, res) => {
    try {
        if (req.userRole !== 'owner' && req.userRole !== 'admin') {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const { keyId } = req.params;
        const organization = req.organization;

        const apiKey = organization.apiKeys.id(keyId);
        if (!apiKey) {
            return res.status(404).json({ error: 'API key not found' });
        }

        apiKey.isActive = false;
        await organization.save();

        res.json({ success: true, message: 'API key revoked' });

    } catch (error) {
        console.error('API key revocation error:', error);
        res.status(500).json({ error: 'Failed to revoke API key' });
    }
});

// Get API activity logs
router.get('/dashboard/activity', authenticateDashboard, async (req, res) => {
    try {
        const { page = 1, limit = 50, startDate, endDate } = req.query;
        
        const query = { organizationId: req.organization._id };
        
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        const activities = await ApiActivity
            .find(query)
            .sort({ timestamp: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await ApiActivity.countDocuments(query);

        res.json({
            activities,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Activity fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch activity' });
    }
});

// Get usage analytics
router.get('/dashboard/analytics', authenticateDashboard, async (req, res) => {
    try {
        const { period = 'month' } = req.query;
        const organization = req.organization;

        // Get usage data from Redis for multiple months
        const months = [];
        const now = new Date();
        
        for (let i = 0; i < 6; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const month = date.toISOString().slice(0, 7);
            const usage = await usageTracker.getMonthlyUsage(organization._id, month);
            
            months.push({
                month,
                total: parseInt(usage.total || 0),
                authenticate: parseInt(usage.authenticate || 0),
                verify: parseInt(usage.verify || 0),
                register: parseInt(usage.register || 0)
            });
        }

        // Get success/failure rates
        const successCount = await ApiActivity.countDocuments({
            organizationId: organization._id,
            statusCode: { $gte: 200, $lt: 300 }
        });

        const totalCount = await ApiActivity.countDocuments({
            organizationId: organization._id
        });

        const successRate = totalCount > 0 ? (successCount / totalCount * 100).toFixed(2) : 0;

        // Get average response time
        const avgResponseTime = await ApiActivity.aggregate([
            { $match: { organizationId: organization._id } },
            { $group: { _id: null, avgTime: { $avg: '$responseTime' } } }
        ]);

        res.json({
            usage: months,
            metrics: {
                successRate: parseFloat(successRate),
                avgResponseTime: avgResponseTime[0]?.avgTime || 0,
                totalRequests: totalCount,
                activeUsers: organization.usage.currentMonthUsers
            }
        });

    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// Update organization settings
router.patch('/dashboard/settings', authenticateDashboard, async (req, res) => {
    try {
        if (req.userRole !== 'owner') {
            return res.status(403).json({ error: 'Only owners can update settings' });
        }

        const { webhookUrl, allowedOrigins, ipWhitelist } = req.body;
        const organization = req.organization;

        if (webhookUrl !== undefined) organization.settings.webhookUrl = webhookUrl;
        if (allowedOrigins !== undefined) organization.settings.allowedOrigins = allowedOrigins;
        if (ipWhitelist !== undefined) organization.settings.ipWhitelist = ipWhitelist;

        await organization.save();

        res.json({
            success: true,
            settings: organization.settings
        });

    } catch (error) {
        console.error('Settings update error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

export default router;