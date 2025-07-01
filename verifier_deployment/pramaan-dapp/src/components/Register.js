import React, { useState, useEffect } from "react";
import "../styles/App.css";

const Register = () => {
    const [userId, setUserId] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [userDID, setUserDID] = useState(null);

    useEffect(() => {
        // Check if user already has a DID
        checkRegistrationStatus();
    }, []);

    const checkRegistrationStatus = async () => {
        const email = localStorage.getItem("userEmail");
        if (!email) return;

        try {
            const response = await fetch("http://localhost:5000/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.did) {
                    setUserDID(data.did);
                    setMessage("You are already registered!");
                }
            }
        } catch (error) {
            console.error("Error checking registration:", error);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        
        if (!userId.trim()) {
            setError("Employee/Biometric ID is required");
            return;
        }

        setError("");
        setIsLoading(true);

        const email = localStorage.getItem("userEmail");
        if (!email) {
            setError("Please login first");
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch("http://localhost:5000/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, userId }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Registration failed");
                return;
            }

            setMessage(data.message);
            setUserDID(data.did);
            setUserId("");
        } catch (error) {
            setError("Network error. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="register-container glass-card">
            <h2>🔐 Register</h2>
            
            {userDID ? (
                <div className="success-section">
                    <p className="success">✅ You are registered!</p>
                    <div className="did-display">
                        <label>Your DID:</label>
                        <div className="did-value">{userDID}</div>
                    </div>
                    <p className="info-text">
                        You can now use the Authenticate feature to generate Zero-Knowledge Proofs.
                    </p>
                </div>
            ) : (
                <form onSubmit={handleRegister}>
                    <p className="register-info">
                        Register your Employee ID or Biometric ID to create a unique DID (Decentralized Identifier).
                    </p>
                    
                    <input
                        type="text"
                        placeholder="Enter Employee/Biometric ID"
                        value={userId}
                        onChange={(e) => {
                            setUserId(e.target.value);
                            setError("");
                        }}
                        className="register-input"
                        disabled={isLoading}
                    />
                    
                    {error && <div className="error">{error}</div>}
                    {message && !userDID && <div className="success">{message}</div>}
                    
                    <button type="submit" className="register-btn" disabled={isLoading}>
                        {isLoading ? <span className="loading"></span> : "Register"}
                    </button>
                </form>
            )}
        </div>
    );
};

export default Register;

// import React, { useState } from "react";

// const Register = () => {
//     const [userId, setUserId] = useState("");
//     const [successMessage, setSuccessMessage] = useState("");
//     const [errorMessage, setErrorMessage] = useState("");

//     const handleRegister = async () => {
//         setSuccessMessage("");
//         setErrorMessage("");

//         if (!userId) {
//             setErrorMessage("⚠️ Please enter a valid Employee/Biometric ID.");
//             return;
//         }

//         try {
//             const response = await fetch("http://localhost:5000/api/register", {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({ userId }),
//             });

//             const data = await response.json();

//             if (response.ok) {
//                 setSuccessMessage("✅ Successfully Registered!");
//                 setUserId(""); // Clear input field
//             } else {
//                 setErrorMessage(`⚠️ ${data.error || "Registration failed."}`);
//             }
//         } catch (error) {
//             console.error("Registration Error:", error);
//             setErrorMessage("⚠️ Server error. Please try again.");
//         }
//     };

//     return (
//         <div className="register-container">
//             <h2>Register</h2>
//             <input
//                 type="text"
//                 placeholder="Enter Employee/Biometric ID"
//                 value={userId}
//                 onChange={(e) => setUserId(e.target.value)}
//                 required
//             />
//             <button className="register-btn" onClick={handleRegister}>Register</button>

//             {successMessage && <p className="success-message">{successMessage}</p>}
//             {errorMessage && <p className="error-message">{errorMessage}</p>}
//         </div>
//     );
// };

// export default Register;
