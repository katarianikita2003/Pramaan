// components/Dashboard/UpgradePlan.js
import React, { useState } from 'react';
import '../../styles/Dashboard.css';

const UpgradePlan = ({ currentPlan }) => {
    const [loading, setLoading] = useState(false);

    const plans = [
        {
            name: 'starter',
            displayName: 'Starter',
            price: 29,
            features: ['100 Users', '1,000 Proofs/month', 'Email Support', '5 API Keys']
        },
        {
            name: 'professional',
            displayName: 'Professional',
            price: 99,
            features: ['1,000 Users', '10,000 Proofs/month', 'Priority Support', '20 API Keys']
        },
        {
            name: 'enterprise',
            displayName: 'Enterprise',
            price: 299,
            features: ['Unlimited Users', 'Unlimited Proofs', '24/7 Phone Support', 'Unlimited API Keys']
        }
    ];

    const handleUpgrade = async (plan) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('saasToken');
            const response = await fetch('http://localhost:5000/dashboard/billing/create-checkout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ plan })
            });

            const data = await response.json();
            if (data.success) {
                // Redirect to Stripe Checkout
                window.location.href = data.checkoutUrl;
            }
        } catch (error) {
            console.error('Upgrade error:', error);
            alert('Failed to start upgrade process');
        } finally {
            setLoading(false);
        }
    };

    const manageBilling = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('saasToken');
            const response = await fetch('http://localhost:5000/dashboard/billing/portal', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (data.success) {
                // Redirect to Stripe Portal
                window.location.href = data.portalUrl;
            }
        } catch (error) {
            console.error('Portal error:', error);
            alert('Failed to open billing portal');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="upgrade-container">
            <h2>Choose Your Plan</h2>
            
            <div className="plans-grid">
                {plans.map(plan => (
                    <div key={plan.name} className={`plan-card ${currentPlan === plan.name ? 'current' : ''}`}>
                        <h3>{plan.displayName}</h3>
                        <div className="price">
                            <span className="currency">$</span>
                            <span className="amount">{plan.price}</span>
                            <span className="period">/month</span>
                        </div>
                        
                        <ul className="features">
                            {plan.features.map((feature, idx) => (
                                <li key={idx}>✓ {feature}</li>
                            ))}
                        </ul>
                        
                        {currentPlan === plan.name ? (
                            <button className="current-plan-btn" disabled>
                                Current Plan
                            </button>
                        ) : currentPlan === 'trial' || plans.findIndex(p => p.name === currentPlan) < plans.findIndex(p => p.name === plan.name) ? (
                            <button 
                                className="upgrade-btn"
                                onClick={() => handleUpgrade(plan.name)}
                                disabled={loading}
                            >
                                {loading ? 'Processing...' : 'Upgrade'}
                            </button>
                        ) : (
                            <button className="downgrade-btn" disabled>
                                Downgrade
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {currentPlan !== 'trial' && (
                <div className="billing-management">
                    <button 
                        className="manage-billing-btn"
                        onClick={manageBilling}
                        disabled={loading}
                    >
                        Manage Billing & Subscription
                    </button>
                </div>
            )}
        </div>
    );
};

export default UpgradePlan;