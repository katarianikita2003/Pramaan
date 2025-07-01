class PramaanSDK {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = 'http://localhost:5000/api/v1';
    }

    async registerUser(userData) {
        const response = await fetch(`${this.baseURL}/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': this.apiKey
            },
            body: JSON.stringify(userData)
        });
        return response.json();
    }

    async authenticate(emailOrUserId) {
        const response = await fetch(`${this.baseURL}/authenticate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': this.apiKey
            },
            body: JSON.stringify({ email: emailOrUserId })
        });
        return response.json();
    }

    async verify(proof, userId) {
        const response = await fetch(`${this.baseURL}/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': this.apiKey
            },
            body: JSON.stringify({ proof, userId })
        });
        return response.json();
    }
}

export default PramaanSDK;