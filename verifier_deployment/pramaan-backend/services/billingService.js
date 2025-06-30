// services/billingService.js
import Stripe from 'stripe';
import Organization from '../models/Organization.js';

class BillingService {
    constructor() {
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        
        // Define your product prices (create these in Stripe Dashboard)
        this.prices = {
            trial: null, // Free
            starter: process.env.STRIPE_PRICE_STARTER || 'price_starter_monthly',
            professional: process.env.STRIPE_PRICE_PROFESSIONAL || 'price_professional_monthly',
            enterprise: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise_monthly'
        };

        // Plan features
        this.planFeatures = {
            trial: {
                maxUsers: 10,
                maxProofsPerMonth: 100,
                price: 0
            },
            starter: {
                maxUsers: 100,
                maxProofsPerMonth: 1000,
                price: 29 // $29/month
            },
            professional: {
                maxUsers: 1000,
                maxProofsPerMonth: 10000,
                price: 99 // $99/month
            },
            enterprise: {
                maxUsers: -1, // Unlimited
                maxProofsPerMonth: -1, // Unlimited
                price: 299 // $299/month
            }
        };
    }

    // Create a Stripe customer for an organization
    async createCustomer(organization) {
        try {
            const customer = await this.stripe.customers.create({
                email: organization.email,
                name: organization.name,
                metadata: {
                    organizationId: organization._id.toString()
                }
            });

            // Update organization with Stripe customer ID
            organization.billing.stripeCustomerId = customer.id;
            await organization.save();

            return customer;
        } catch (error) {
            console.error('Error creating Stripe customer:', error);
            throw error;
        }
    }

    // Create checkout session for subscription
    async createCheckoutSession(organizationId, plan, successUrl, cancelUrl) {
        try {
            const organization = await Organization.findById(organizationId);
            if (!organization) {
                throw new Error('Organization not found');
            }

            // Create customer if doesn't exist
            if (!organization.billing.stripeCustomerId) {
                await this.createCustomer(organization);
            }

            const session = await this.stripe.checkout.sessions.create({
                customer: organization.billing.stripeCustomerId,
                payment_method_types: ['card'],
                line_items: [{
                    price: this.prices[plan],
                    quantity: 1
                }],
                mode: 'subscription',
                success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: cancelUrl,
                metadata: {
                    organizationId: organizationId.toString(),
                    plan: plan
                }
            });

            return session;
        } catch (error) {
            console.error('Error creating checkout session:', error);
            throw error;
        }
    }

    // Create billing portal session
    async createPortalSession(organizationId, returnUrl) {
        try {
            const organization = await Organization.findById(organizationId);
            if (!organization || !organization.billing.stripeCustomerId) {
                throw new Error('No billing account found');
            }

            const session = await this.stripe.billingPortal.sessions.create({
                customer: organization.billing.stripeCustomerId,
                return_url: returnUrl
            });

            return session;
        } catch (error) {
            console.error('Error creating portal session:', error);
            throw error;
        }
    }

    // Handle webhook events
    async handleWebhook(signature, payload) {
        let event;

        try {
            event = this.stripe.webhooks.constructEvent(
                payload,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (error) {
            console.error('Webhook signature verification failed:', error);
            throw error;
        }

        // Handle the event
        switch (event.type) {
            case 'checkout.session.completed':
                await this.handleCheckoutComplete(event.data.object);
                break;

            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await this.handleSubscriptionUpdate(event.data.object);
                break;

            case 'customer.subscription.deleted':
                await this.handleSubscriptionCanceled(event.data.object);
                break;

            case 'invoice.payment_succeeded':
                await this.handlePaymentSucceeded(event.data.object);
                break;

            case 'invoice.payment_failed':
                await this.handlePaymentFailed(event.data.object);
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
    }

    // Handle successful checkout
    async handleCheckoutComplete(session) {
        const organizationId = session.metadata.organizationId;
        const plan = session.metadata.plan;

        const organization = await Organization.findById(organizationId);
        if (!organization) return;

        // Get subscription details
        const subscription = await this.stripe.subscriptions.retrieve(session.subscription);

        organization.plan = plan;
        organization.billing.subscriptionId = subscription.id;
        organization.billing.status = 'active';
        organization.billing.currentPeriodEnd = new Date(subscription.current_period_end * 1000);

        // Update API key permissions based on plan
        const features = this.planFeatures[plan];
        organization.apiKeys.forEach(key => {
            key.permissions.maxUsers = features.maxUsers;
            key.permissions.maxProofsPerMonth = features.maxProofsPerMonth;
        });

        await organization.save();
    }

    // Handle subscription updates
    async handleSubscriptionUpdate(subscription) {
        const customer = await this.stripe.customers.retrieve(subscription.customer);
        const organizationId = customer.metadata.organizationId;

        const organization = await Organization.findById(organizationId);
        if (!organization) return;

        organization.billing.status = subscription.status;
        organization.billing.currentPeriodEnd = new Date(subscription.current_period_end * 1000);

        // If subscription is active, update plan based on price
        if (subscription.status === 'active') {
            const priceId = subscription.items.data[0].price.id;
            const plan = Object.keys(this.prices).find(key => this.prices[key] === priceId);
            if (plan) {
                organization.plan = plan;
                
                // Update features
                const features = this.planFeatures[plan];
                organization.apiKeys.forEach(key => {
                    key.permissions.maxUsers = features.maxUsers;
                    key.permissions.maxProofsPerMonth = features.maxProofsPerMonth;
                });
            }
        }

        await organization.save();
    }

    // Handle subscription cancellation
    async handleSubscriptionCanceled(subscription) {
        const customer = await this.stripe.customers.retrieve(subscription.customer);
        const organizationId = customer.metadata.organizationId;

        const organization = await Organization.findById(organizationId);
        if (!organization) return;

        // Downgrade to trial
        organization.plan = 'trial';
        organization.billing.status = 'canceled';
        organization.billing.subscriptionId = null;

        // Reset to trial limits
        const features = this.planFeatures.trial;
        organization.apiKeys.forEach(key => {
            key.permissions.maxUsers = features.maxUsers;
            key.permissions.maxProofsPerMonth = features.maxProofsPerMonth;
        });

        await organization.save();
    }

    // Handle successful payment
    async handlePaymentSucceeded(invoice) {
        console.log(`Payment succeeded for invoice: ${invoice.id}`);
        // You can send a receipt email here
    }

    // Handle failed payment
    async handlePaymentFailed(invoice) {
        console.log(`Payment failed for invoice: ${invoice.id}`);
        // You can send a payment failure email here
    }

    // Get usage-based billing (for future implementation)
    async reportUsage(organizationId, quantity) {
        const organization = await Organization.findById(organizationId);
        if (!organization || !organization.billing.subscriptionId) return;

        // This is for metered billing if you want to charge per API call
        // You'd need to set up metered billing in Stripe
    }
}

export default new BillingService();