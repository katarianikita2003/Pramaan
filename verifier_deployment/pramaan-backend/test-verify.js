const API_URL = 'http://localhost:5000';

async function testVerification() {
    const apiKey = 'pramaan_test_f2aff22fa113f60b3f19f0c2a1e5263f75a66cc3ead728fc7d673cb5f8409b78';
    const userId = '68622347434b8eebf11927b2';
    
    // First authenticate to get a proof
    const authRes = await fetch(`${API_URL}/api/v1/authenticate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
        },
        body: JSON.stringify({
            userId: userId
        })
    });
    
    const authData = await authRes.json();
    console.log('Auth response:', authData);
    
    if (authData.success) {
        // Now verify the proof
        const verifyRes = await fetch(`${API_URL}/api/v1/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey
            },
            body: JSON.stringify({
                proof: authData.data.proof,
                userId: userId
            })
        });
        
        const verifyData = await verifyRes.json();
        console.log('Verification response:', verifyData);
    }
}

testVerification();