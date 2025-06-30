// setup-stripe-products.js
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function setupStripeProducts() {
    try {
        console.log('🚀 Setting up Stripe products and prices...\n');

        // Create the product
        const product = await stripe.products.create({
            name: 'Pramaan SAAS',
            description: 'Zero-Knowledge Proof Authentication Platform',
        });

        console.log('✅ Product created:', product.id);

        // Create prices for each plan
        const plans = [
            {
                nickname: 'Starter',
                unit_amount: 2900, // $29.00
                metadata: { plan: 'starter' }
            },
            {
                nickname: 'Professional',
                unit_amount: 9900, // $99.00
                metadata: { plan: 'professional' }
            },
            {
                nickname: 'Enterprise',
                unit_amount: 29900, // $299.00
                metadata: { plan: 'enterprise' }
            }
        ];

        const priceIds = {};

        for (const plan of plans) {
            const price = await stripe.prices.create({
                product: product.id,
                unit_amount: plan.unit_amount,
                currency: 'usd',
                recurring: {
                    interval: 'month'
                },
                nickname: plan.nickname,
                metadata: plan.metadata
            });

            priceIds[plan.metadata.plan] = price.id;
            console.log(`✅ ${plan.nickname} price created:`, price.id);
        }

        console.log('\n📝 Add these price IDs to your .env file:');
        console.log(`STRIPE_PRICE_STARTER=${priceIds.starter}`);
        console.log(`STRIPE_PRICE_PROFESSIONAL=${priceIds.professional}`);
        console.log(`STRIPE_PRICE_ENTERPRISE=${priceIds.enterprise}`);

        // Create webhook endpoint
        console.log('\n🔗 Setting up webhook endpoint...');
        console.log('Run this command to listen to webhooks locally:');
        console.log('stripe listen --forward-to localhost:5000/webhook/stripe');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

setupStripeProducts();