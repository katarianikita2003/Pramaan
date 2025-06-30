// Add these imports at the very top of routes/saasRoutes.js
import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import UserOrganization from '../models/UserOrganization.js';
import ApiKeyService from '../services/apiKeyService.js';
import { authenticateApiKey, incrementUsageCounter, webhookNotifier } from '../middleware/apiAuth.js';
import { generateProof, generateKeys, verifyProof } from '../zokratesUtils.js';

const router = express.Router();

// Public endpoints for SAAS clients

// 1. Register a new user under an organization
router.post('/api/v1/users/register',
    authenticateApiKey,
    incrementUsageCounter,
    webhookNotifier,
    async (req, res) => {
        try {
            const { email, name, age, password } = req.body;
            const organization = req.organization;

            // Check user limit
            const userCount = await UserOrganization.countDocuments({
                organizationId: organization._id
            });

            const apiKey = organization.apiKeys.find(k => k._id.equals(req.apiKeyId));
            if (userCount >= apiKey.permissions.maxUsers) {
                return res.status(403).json({
                    error: 'User limit reached for organization'
                });
            }

            // Check if user already exists
            let user = await User.findOne({ email });

            if (!user) {
                // Create new user with organization prefix in DID
                const hashedEmail = crypto.createHash("sha256").update(email).digest("hex");
                const did = `did:pramaan:${organization._id.toString().slice(-8)}:${hashedEmail.slice(0, 16)}`;

                user = new User({
                    name,
                    age,
                    email,
                    password: await bcrypt.hash(password, 10),
                    did
                });

                await user.save();
            }

            // Link user to organization
            await UserOrganization.findOneAndUpdate(
                { userId: user._id, organizationId: organization._id },
                {
                    userId: user._id,
                    organizationId: organization._id,
                    role: 'member'
                },
                { upsert: true }
            );

            // Update organization user count
            await Organization.findByIdAndUpdate(
                organization._id,
                { 'usage.currentMonthUsers': userCount + 1 }
            );

            // Set webhook data
            res.locals.webhookData = {
                action: 'user_registered',
                userId: user._id,
                email: user.email
            };

            res.json({
                success: true,
                data: {
                    userId: user._id,
                    did: user.did,
                    email: user.email
                }
            });

        } catch (error) {
            console.error('User registration error:', error);
            res.status(500).json({ error: 'Registration failed' });
        }
    }
);

// 2. Authenticate user and generate ZKP
router.post('/api/v1/authenticate',
    authenticateApiKey,
    incrementUsageCounter,
    webhookNotifier,
    async (req, res) => {
        try {
            const { email, userId } = req.body;
            const organization = req.organization;

            // Find user by email or userId
            let query = {};
            if (email) query.email = email;
            if (userId) query._id = userId;

            const user = await User.findOne(query);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Verify user belongs to organization
            const userOrg = await UserOrganization.findOne({
                userId: user._id,
                organizationId: organization._id
            });

            if (!userOrg) {
                return res.status(403).json({
                    error: 'User not associated with organization'
                });
            }

            // Generate ZKP
            const { provingKey, verificationKey } = generateKeys();
            const proof = generateProof(user.email, provingKey);

            // Store proof for verification
            user.latestProof = proof;
            user.latestVerificationKey = verificationKey;
            await user.save();

            // Set webhook data
            res.locals.webhookData = {
                action: 'proof_generated',
                userId: user._id,
                proofId: proof.id
            };

            res.json({
                success: true,
                data: {
                    proof,
                    provingKey,
                    userId: user._id,
                    expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
                }
            });

        } catch (error) {
            console.error('Authentication error:', error);
            res.status(500).json({ error: 'Authentication failed' });
        }
    }
);

// 3. Verify ZKP
router.post('/api/v1/verify',
    authenticateApiKey,
    incrementUsageCounter,
    webhookNotifier,
    async (req, res) => {
        try {
            const { proof, userId } = req.body;
            const organization = req.organization;

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Verify user belongs to organization
            const userOrg = await UserOrganization.findOne({
                userId: user._id,
                organizationId: organization._id
            });

            if (!userOrg) {
                return res.status(403).json({
                    error: 'User not associated with organization'
                });
            }

            // Verify proof
            const isValid = await verifyProof(proof, user.latestVerificationKey);

            // Log verification
            user.proofHistory.push({
                status: isValid ? 'Success' : 'Failure'
            });
            await user.save();

            // Set webhook data
            res.locals.webhookData = {
                action: 'proof_verified',
                userId: user._id,
                valid: isValid
            };

            res.json({
                success: true,
                data: {
                    valid: isValid,
                    userId: user._id,
                    timestamp: new Date()
                }
            });

        } catch (error) {
            console.error('Verification error:', error);
            res.status(500).json({ error: 'Verification failed' });
        }
    }
);

// 4. Get user proof history
router.get('/api/v1/users/:userId/proof-history',
    authenticateApiKey,
    async (req, res) => {
        try {
            const { userId } = req.params;
            const organization = req.organization;

            // Verify user belongs to organization
            const userOrg = await UserOrganization.findOne({
                userId,
                organizationId: organization._id
            });

            if (!userOrg) {
                return res.status(403).json({
                    error: 'User not associated with organization'
                });
            }

            const user = await User.findById(userId).select('proofHistory');
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json({
                success: true,
                data: {
                    userId,
                    history: user.proofHistory
                }
            });

        } catch (error) {
            console.error('History fetch error:', error);
            res.status(500).json({ error: 'Failed to fetch history' });
        }
    }
);

// Management endpoints (require different auth)

// Create organization and first API key
// In routes/saasRoutes.js, find the signup route and update the catch block:
router.post('/api/v1/organizations/signup', async (req, res) => {
    try {
        console.log('📥 Signup request body:', req.body); // Add this for debugging

        const { name, email, password, domain } = req.body;

        // Create organization
        const organization = new Organization({
            name,
            email,
            domain,
            plan: 'trial',
            billing: {
                status: 'trial',
                currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days trial
            }
        });

        // Generate first API key
        const apiKey = req.body.testMode ?
            ApiKeyService.generateTestApiKey() :
            ApiKeyService.generateApiKey();

        const hashedKey = ApiKeyService.hashApiKey(apiKey);

        organization.apiKeys.push({
            key: hashedKey,
            name: 'Default Key',
            permissions: {
                maxUsers: 100,
                maxProofsPerMonth: 1000,
                allowedEndpoints: ['authenticate', 'verify', 'register', 'proof-history']
            }
        });

        await organization.save();

        // Create admin user
        // In the signup route, update the admin user creation:
        const adminUser = new User({
            name: 'Admin',
            email,
            password: await bcrypt.hash(password, 10),
            did: `did:pramaan:admin:${organization._id}`,
            age: 30 // Add this since your User schema requires age
        });

        await adminUser.save();

        // Link admin to organization
        await UserOrganization.create({
            userId: adminUser._id,
            organizationId: organization._id,
            role: 'owner'
        });

        res.json({
            success: true,
            data: {
                organizationId: organization._id,
                apiKey: apiKey, // Only shown once!
                message: 'Save this API key securely. It won\'t be shown again.'
            }
        });

    } catch (error) {
        console.error('❌ Organization signup error:', error); // Better error logging
        console.error('Error stack:', error.stack); // Add stack trace
        res.status(500).json({
            error: 'Signup failed',
            details: error.message // Add error details in response
        });
    }
});

export default router;