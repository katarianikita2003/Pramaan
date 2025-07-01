import React from "react";
import { useNavigate } from "react-router-dom";

const Home = () => {
    const navigate = useNavigate();

    return (
        <div className="home-container">
            <h1>🔐 Pramaan - Zero Knowledge Proof Based Authentication</h1>
            <p>
                Ensuring secure authentication without revealing sensitive data. 
                Protect your identity & privacy with ZKP technology.
            </p>

            <div className="home-buttons">
                <button className="register-btn" onClick={() => navigate("/register")}>
                    Register
                </button>
                <button className="authenticate-btn" onClick={() => navigate("/authenticate")}>
                    Authenticate
                </button>
            </div>

            <div className="home-info">
                <h2>How It Works?</h2>
                <p>
                    1️⃣ Register with your Employee/Biometric ID.  <br/>
                    2️⃣ Generate a proof using Zero-Knowledge Proof (ZKP).  <br/>
                    3️⃣ Authenticate by verifying your proof without revealing sensitive data.  <br/>
                    4️⃣ View past authentication records in Proof History.  <br/>
                </p>
            </div>
        </div>
    );
};

export default Home;
