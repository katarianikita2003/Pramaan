// routes/billingRoutes.js
import express from 'express';
import { authenticateDashboard } from '../middleware/dashboardAuth.js';

const router = express.Router();

// Stripe webhook endpoint - must use raw body parser
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['stripe-signature'];

    try {
        // For now, just acknowledge receipt
        console.log('Stripe webhook received');
        res.json({ received: true });
        
        // When you have billingService ready, uncomment:
        // await billingService.handleWebhook(signature, req.body);
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(400).json({ error: 'Webhook error' });
    }
});

// Create checkout session
router.post('/dashboard/billing/create-checkout', authenticateDashboard, async (req, res) => {
    try {
        const { plan } = req.body;
        const organizationId = req.organization._id;

        if (!['starter', 'professional', 'enterprise'].includes(plan)) {
            return res.status(400).json({ error: 'Invalid plan' });
        }

        // For now, return a placeholder response
        res.json({ 
            success: false, 
            error: 'Billing service not configured yet. Please set up Stripe first.'
        });

        // When billingService is ready, use this:
        /*
        const session = await billingService.createCheckoutSession(
            organizationId,
            plan,
            `${process.env.FRONTEND_URL}/dashboard?upgrade=success`,
            `${process.env.FRONTEND_URL}/dashboard?upgrade=canceled`
        );

        res.json({ 
            success: true, 
            checkoutUrl: session.url 
        });
        */

    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

// Create billing portal session
router.post('/dashboard/billing/portal', authenticateDashboard, async (req, res) => {
    try {
        const organizationId = req.organization._id;

        // For now, return a placeholder response
        res.json({ 
            success: false, 
            error: 'Billing portal not configured yet'
        });

        // When billingService is ready, use this:
        /*
        const session = await billingService.createPortalSession(
            organizationId,
            `${process.env.FRONTEND_URL}/dashboard`
        );

        res.json({ 
            success: true, 
            portalUrl: session.url 
        });
        */

    } catch (error) {
        console.error('Portal error:', error);
        res.status(500).json({ error: 'Failed to create portal session' });
    }
});

// Get pricing information
router.get('/pricing', (req, res) => {
    res.json({
        plans: [
            {
                name: 'trial',
                displayName: 'Trial',
                price: 0,
                features: {
                    users: 10,
                    proofsPerMonth: 100,
                    support: 'Community',
                    apiKeys: 2
                }
            },
            {
                name: 'starter',
                displayName: 'Starter',
                price: 29,
                features: {
                    users: 100,
                    proofsPerMonth: 1000,
                    support: 'Email',
                    apiKeys: 5
                }
            },
            {
                name: 'professional',
                displayName: 'Professional',
                price: 99,
                features: {
                    users: 1000,
                    proofsPerMonth: 10000,
                    support: 'Priority',
                    apiKeys: 20
                }
            },
            {
                name: 'enterprise',
                displayName: 'Enterprise',
                price: 299,
                features: {
                    users: 'Unlimited',
                    proofsPerMonth: 'Unlimited',
                    support: '24/7 Phone',
                    apiKeys: 'Unlimited'
                }
            }
        ]
    });
});

export default router;