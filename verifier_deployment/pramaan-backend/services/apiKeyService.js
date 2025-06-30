// services/apiKeyService.js
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

class ApiKeyService {
    // Generate a secure API key
    static generateApiKey() {
        // Format: pramaan_live_<random_string>
        const prefix = 'pramaan_live_';
        const randomBytes = crypto.randomBytes(32).toString('hex');
        return `${prefix}${randomBytes}`;
    }

    // Generate a test API key for development
    static generateTestApiKey() {
        const prefix = 'pramaan_test_';
        const randomBytes = crypto.randomBytes(32).toString('hex');
        return `${prefix}${randomBytes}`;
    }

    // Hash API key for storage (store only hash in DB)
    static hashApiKey(apiKey) {
        return crypto
            .createHash('sha256')
            .update(apiKey)
            .digest('hex');
    }

    // Validate API key format
    static isValidApiKeyFormat(apiKey) {
        const pattern = /^pramaan_(live|test)_[a-f0-9]{64}$/;
        return pattern.test(apiKey);
    }

    // Extract key type (live/test)
    static getKeyType(apiKey) {
        if (apiKey.startsWith('pramaan_live_')) return 'live';
        if (apiKey.startsWith('pramaan_test_')) return 'test';
        return null;
    }

    // Generate JWT for API authentication
    static generateJWT(organizationId, apiKeyId) {
        const payload = {
            organizationId,
            apiKeyId,
            type: 'api_access'
        };

        return jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: '24h'
        });
    }

    // Verify JWT
    static verifyJWT(token) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }
}

export default ApiKeyService;