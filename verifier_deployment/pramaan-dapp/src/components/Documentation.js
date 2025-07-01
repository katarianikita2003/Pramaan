import React from 'react';

const Documentation = () => {
    return (
        <div className="documentation-container">
            <h1>Pramaan API Documentation</h1>
            
            <section>
                <h2>Getting Started</h2>
                <pre>
                    <code>{`npm install @pramaan/sdk

import PramaanSDK from '@pramaan/sdk';
const pramaan = new PramaanSDK('your-api-key');`}</code>
                </pre>
            </section>

            <section>
                <h2>API Endpoints</h2>
                <div className="endpoint">
                    <h3>POST /api/v1/users/register</h3>
                    <p>Register a new user under your organization</p>
                    <pre><code>{`{
  "email": "user@example.com",
  "name": "John Doe",
  "age": 25,
  "password": "securepassword"
}`}</code></pre>
                </div>
                {/* Add more endpoints */}
            </section>
        </div>
    );
};

export default Documentation;