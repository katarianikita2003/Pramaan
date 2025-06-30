// middleware/apiAuth.js
import Organization from '../models/Organization.js';
import ApiActivity from '../models/ApiActivity.js';
import ApiKeyService from '../services/apiKeyService.js';
import { rateLimiters, UsageTracker } from '../utils/rateLimiter.js';
import crypto from 'crypto';
import { redisClient } from '../utils/rateLimiter.js';

const usageTracker = new UsageTracker(redisClient);

export const authenticateApiKey = async (req, res, next) => {
    const startTime = Date.now();
    console.log('🔍 Auth middleware called');
    console.log('Headers:', req.headers);

    try {
        // Extract API key from header
        const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
        console.log('🔑 Extracted API key:', apiKey);

        if (!apiKey) {
            return logAndRespond(req, res, 401, 'API key is required', startTime);
        }

        // Validate API key format
        if (!ApiKeyService.isValidApiKeyFormat(apiKey)) {
            return logAndRespond(req, res, 401, 'Invalid API key format', startTime);
        }

        // Hash the API key to search in database
        const hashedKey = ApiKeyService.hashApiKey(apiKey);

        // Find organization with this API key
        // Find organization with this API key
        const organization = await Organization.findOne({
            'apiKeys': {
                $elemMatch: {
                    key: hashedKey,
                    isActive: true
                }
            }
        });

        if (!organization) {
            return logAndRespond(req, res, 401, 'Invalid or inactive API key', startTime);
        }

        // Find the specific API key details
        const apiKeyDetails = organization.apiKeys.find(k => k.key === hashedKey && k.isActive);

        if (!apiKeyDetails) {
            return logAndRespond(req, res, 401, 'API key not found or inactive', startTime);
        }

        // Check if subscription is active
        if (organization.billing.status !== 'active' && organization.billing.status !== 'trial') {
            return logAndRespond(req, res, 403, 'Subscription is not active', startTime, organization._id, apiKey);
        }

        // Check endpoint permissions
        const endpoint = req.path.split('/').pop();
        if (apiKeyDetails.permissions.allowedEndpoints.length > 0 &&
            !apiKeyDetails.permissions.allowedEndpoints.includes(endpoint)) {
            return logAndRespond(req, res, 403, `Endpoint '${endpoint}' not allowed for this API key`, startTime, organization._id, apiKey);
        }

        // Reset monthly usage if needed
        await organization.resetMonthlyUsage();

        // Check usage limits
        if (organization.usage.currentMonthProofs >= apiKeyDetails.permissions.maxProofsPerMonth) {
            return logAndRespond(req, res, 429, 'Monthly proof limit exceeded', startTime, organization._id, apiKey);
        }

        // Check IP whitelist if configured
        if (organization.settings.ipWhitelist && organization.settings.ipWhitelist.length > 0) {
            const clientIp = req.ip || req.connection.remoteAddress;
            if (!organization.settings.ipWhitelist.includes(clientIp)) {
                return logAndRespond(req, res, 403, 'IP address not whitelisted', startTime, organization._id, apiKey);
            }
        }

        // Check CORS origins if configured
        if (organization.settings.allowedOrigins && organization.settings.allowedOrigins.length > 0) {
            const origin = req.headers.origin;
            if (origin && !organization.settings.allowedOrigins.includes(origin)) {
                return logAndRespond(req, res, 403, 'Origin not allowed', startTime, organization._id, apiKey);
            }
        }

        // Update last used timestamp
        apiKeyDetails.lastUsed = new Date();
        await organization.save();

        // Track usage in Redis
        await usageTracker.trackApiCall(organization._id, endpoint);

        // Attach organization to request
        req.organization = organization;
        req.apiKeyId = apiKeyDetails._id;
        req.apiKeyType = ApiKeyService.getKeyType(apiKey);

        // Apply rate limiting based on plan
        const rateLimiter = rateLimiters[organization.plan];
        rateLimiter(req, res, next);

    } catch (error) {
        console.error('API Authentication Error:', error);
        return logAndRespond(req, res, 500, 'Authentication error', startTime);
    }
};

// Helper function to log API activity and send response
// Helper function to log API activity and send response
async function logAndRespond(req, res, statusCode, message, startTime, organizationId = null, apiKey = null) {
    const responseTime = Date.now() - startTime;

    // Log activity if we have organization ID
    if (organizationId) {
        try {
            await ApiActivity.create({
                organizationId,
                apiKey: apiKey ? ApiKeyService.hashApiKey(apiKey) : 'unknown',
                endpoint: req.path,
                method: req.method,
                statusCode,
                responseTime,
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.headers['user-agent'],
                requestBody: req.body,
                errorMessage: statusCode >= 400 ? message : null
            });
        } catch (error) {
            console.error('Failed to log API activity:', error);
        }
    }

    return res.status(statusCode).json({
        error: message,
        timestamp: new Date().toISOString()
    });
}

// Middleware to increment usage counters
export const incrementUsageCounter = async (req, res, next) => {
    // This runs after successful API calls
    res.on('finish', async () => {
        if (res.statusCode >= 200 && res.statusCode < 300 && req.organization) {
            try {
                // Increment proof counter
                await Organization.findByIdAndUpdate(
                    req.organization._id,
                    { $inc: { 'usage.currentMonthProofs': 1 } }
                );
            } catch (error) {
                console.error('Failed to increment usage counter:', error);
            }
        }
    });
    next();
};

// Middleware for webhook notifications
export const webhookNotifier = async (req, res, next) => {
    // Send webhook after response
    res.on('finish', async () => {
        if (req.organization && req.organization.settings.webhookUrl && res.statusCode === 200) {
            try {
                const webhookData = {
                    event: 'api_call',
                    organizationId: req.organization._id,
                    endpoint: req.path,
                    timestamp: new Date().toISOString(),
                    data: res.locals.webhookData || {}
                };

                // Send webhook asynchronously
                fetch(req.organization.settings.webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Pramaan-Signature': generateWebhookSignature(webhookData)
                    },
                    body: JSON.stringify(webhookData)
                }).catch(err => console.error('Webhook failed:', err));
            } catch (error) {
                console.error('Webhook error:', error);
            }
        }
    });
    next();
};

function generateWebhookSignature(data) {
    return crypto
        .createHmac('sha256', process.env.WEBHOOK_SECRET)
        .update(JSON.stringify(data))
        .digest('hex');
}