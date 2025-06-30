// test-api.js
const API_URL = 'http://localhost:5000';

async function testSaasAPI() {
    try {
        // 1. Create an organization
        console.log('1. Creating organization...');
        const signupRes = await fetch(`${API_URL}/api/v1/organizations/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Company',
                email: `admin${Date.now()}@testcompany.com`, // Unique email
                password: 'testpass123',
                domain: 'testcompany.com',
                testMode: true
            })
        });
        
        const signupData = await signupRes.json();
        console.log('Response:', signupData);
        
        if (signupData.success && signupData.data.apiKey) {
            const apiKey = signupData.data.apiKey;
            console.log('✅ Organization created!');
            console.log('📋 API Key:', apiKey);
            console.log('🔑 Organization ID:', signupData.data.organizationId);
            
            // 2. Test registering a user
            console.log('\n2. Registering a user...');
            console.log('Using API Key:', apiKey);
            
            const registerRes = await fetch(`${API_URL}/api/v1/users/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey
                },
                body: JSON.stringify({
                    email: 'user1@testcompany.com',
                    name: 'Test User',
                    age: 25,
                    password: 'userpass123'
                })
            });
            
            console.log('Register status:', registerRes.status);
            console.log('Register headers:', registerRes.headers);
            
            const registerData = await registerRes.json();
            console.log('Register response:', registerData);
            
            if (registerData.success) {
                console.log('✅ User registered successfully!');
                console.log('User ID:', registerData.data.userId);
                console.log('DID:', registerData.data.did);
                
                // 3. Test authentication
                console.log('\n3. Testing authentication...');
                const authRes = await fetch(`${API_URL}/api/v1/authenticate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': apiKey
                    },
                    body: JSON.stringify({
                        email: 'user1@testcompany.com'
                    })
                });
                
                const authData = await authRes.json();
                console.log('Auth response:', authData);
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testSaasAPI();