import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/App.css';

const OrganizationLogin = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [isSignup, setIsSignup] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        const endpoint = isSignup ? '/api/v1/organizations/signup' : '/dashboard/login';
        
        try {
            const response = await fetch(`http://localhost:5000${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (isSignup && data.success) {
                alert(`🎉 Organization created!\n\n⚠️ IMPORTANT: Save your API Key:\n${data.data.apiKey}\n\nThis key won't be shown again!`);
                setIsSignup(false);
            } else if (!isSignup && data.token) {
                localStorage.setItem('saasToken', data.token);
                navigate('/dashboard');
            } else {
                setError(data.error || 'Something went wrong');
            }
        } catch (error) {
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <h2>{isSignup ? '🚀 Create Organization' : '🏢 Organization Login'}</h2>
            {error && <p className="error">{error}</p>}
            <form onSubmit={handleSubmit}>
                {isSignup && (
                    <>
                        <input
                            type="text"
                            placeholder="Organization Name"
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            required
                        />
                        <input
                            type="text"
                            placeholder="Domain (optional)"
                            onChange={(e) => setFormData({...formData, domain: e.target.value})}
                        />
                    </>
                )}
                <input
                    type="email"
                    placeholder="Email"
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                />
                <button type="submit" disabled={loading}>
                    {loading ? 'Loading...' : (isSignup ? 'Create Organization' : 'Login')}
                </button>
            </form>
            <p>
                {isSignup ? 'Already have an organization?' : "Don't have an organization?"}{' '}
                <button 
                    className="link-btn"
                    onClick={() => setIsSignup(!isSignup)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary-color)',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                    }}
                >
                    {isSignup ? 'Login' : 'Create one'}
                </button>
            </p>
        </div>
    );
};

export default OrganizationLogin;