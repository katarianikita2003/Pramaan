import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/App.css";

const Login = ({ onLogin }) => {
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError("");
    };

    const validateForm = () => {
        const { email, password } = formData;
        if (!email || !password) {
            setError("Email and password are required.");
            return false;
        }
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            setError("Enter a valid email address.");
            return false;
        }
        return true;
    };

    const handleLogin = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsLoading(true);
        try {
            const response = await fetch("http://localhost:5000/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await response.json();
            
            if (!response.ok) {
                setError(data.error || "Login failed");
                return;
            }

            localStorage.setItem("userEmail", formData.email);
            onLogin(formData.email);
            setSuccessMessage("Login successful! Redirecting...");
            setTimeout(() => navigate("/"), 2000);
        } catch (err) {
            setError("Network error. Please check your connection and try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container glass-card">
            <h2>Login to Your Account</h2>
            {error && <div className="error">{error}</div>}
            {successMessage && <div className="success">{successMessage}</div>}
            <form onSubmit={handleLogin}>
                <input 
                    type="email" 
                    name="email" 
                    placeholder="Email" 
                    value={formData.email}
                    onChange={handleChange} 
                    required 
                />
                <input 
                    type="password" 
                    name="password" 
                    placeholder="Password" 
                    value={formData.password}
                    onChange={handleChange} 
                    required 
                />
                <button type="submit" disabled={isLoading}>
                    {isLoading ? <span className="loading"></span> : "Login"}
                </button>
            </form>
            <p>
                Don't have an account? <a href="/signup">Sign Up</a>
            </p>
        </div>
    );
};

export default Login;

// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import "../styles/App.css";

// const Login = ({ onLogin }) => {
//     const [formData, setFormData] = useState({ email: "", password: "" });
//     const [error, setError] = useState("");
//     const [successMessage, setSuccessMessage] = useState("");
//     const navigate = useNavigate();

//     const handleChange = (e) => {
//         setFormData({ ...formData, [e.target.name]: e.target.value });
//         setError(""); // Clear error when user types
//     };

//     const validateForm = () => {
//         const { email, password } = formData;
//         if (!email || !password) {
//             setError("⚠️ Email and password are required.");
//             return false;
//         }
//         const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
//         if (!emailRegex.test(email)) {
//             setError("⚠️ Enter a valid email address.");
//             return false;
//         }
//         return true;
//     };

//     const handleLogin = async () => {
//         console.log("📥 Login Attempt:", formData); 

//         if (!validateForm()) return;

//         try {
//             const response = await fetch("http://localhost:5000/api/login", {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify(formData),
//             });

//             const data = await response.json();
//             console.log("📤 Login Response:", data);
//             if (!response.ok) {
//                 setError(`⚠️ ${data.error}`);
//                 return;
//             }

//             onLogin(formData.email);
//             setSuccessMessage("✅ Login successful! Redirecting...");
//             setTimeout(() => navigate("/"), 2000);
//         } catch (err) {
//             setError("⚠️ Login failed. Try again.");
//         }
//     };

//     return (
//         <div className="auth-container">
//             <h2>🔑 Login to Your Account</h2>
//             {error && <p className="error">{error}</p>}
//             {successMessage && <p className="success">{successMessage}</p>}
//             <input type="email" name="email" placeholder="✉️ Email" onChange={handleChange} required />
//             <input type="password" name="password" placeholder="🔒 Password" onChange={handleChange} required />
//             <button onClick={handleLogin}>Login</button>
//             <p>Don't have an account? <a href="/signup">Sign Up</a></p>
//         </div>
//     );
// };

// export default Login;
