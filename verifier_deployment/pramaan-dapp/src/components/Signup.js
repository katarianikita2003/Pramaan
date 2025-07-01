import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/App.css";

const Signup = () => {
    const [formData, setFormData] = useState({
        name: "",
        age: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError("");
    };

    const validateForm = () => {
        const { name, age, email, password, confirmPassword } = formData;
        if (!name || !age || !email || !password || !confirmPassword) {
            setError("All fields are required.");
            return false;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters long.");
            return false;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return false;
        }
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            setError("Enter a valid email address.");
            return false;
        }
        if (parseInt(age) < 18 || parseInt(age) > 120) {
            setError("Age must be between 18 and 120.");
            return false;
        }
        return true;
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;

        setIsLoading(true);
        try {
            const response = await fetch("http://localhost:5000/api/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await response.json();
            
            if (!response.ok) {
                setError(data.error || "Signup failed");
                return;
            }

            setSuccessMessage("Signup successful! Redirecting to login...");
            setTimeout(() => navigate("/login"), 2000);
        } catch (err) {
            setError("Network error. Please check your connection and try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container glass-card">
            <h2>Create Your Account</h2>
            {error && <div className="error">{error}</div>}
            {successMessage && <div className="success">{successMessage}</div>}
            <form onSubmit={handleSignup}>
                <input 
                    type="text" 
                    name="name" 
                    placeholder="Full Name" 
                    value={formData.name}
                    onChange={handleChange} 
                    required 
                />
                <input 
                    type="number" 
                    name="age" 
                    placeholder="Age" 
                    value={formData.age}
                    onChange={handleChange} 
                    required 
                />
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
                <input 
                    type="password" 
                    name="confirmPassword" 
                    placeholder="Confirm Password" 
                    value={formData.confirmPassword}
                    onChange={handleChange} 
                    required 
                />
                <button type="submit" disabled={isLoading}>
                    {isLoading ? <span className="loading"></span> : "Sign Up"}
                </button>
            </form>
            <p>
                Already have an account? <a href="/login">Login</a>
            </p>
        </div>
    );
};

export default Signup;

// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import "../styles/App.css";

// const Signup = () => {
//     const [formData, setFormData] = useState({
//         name: "",
//         age: "",
//         email: "",
//         password: "",
//         confirmPassword: "",
//     });
//     const [error, setError] = useState("");
//     const [successMessage, setSuccessMessage] = useState("");
//     const navigate = useNavigate();

//     const handleChange = (e) => {
//         setFormData({ ...formData, [e.target.name]: e.target.value });
//         setError(""); // Clear error when user types
//     };

//     const validateForm = () => {
//         const { name, age, email, password, confirmPassword } = formData;
//         if (!name || !age || !email || !password || !confirmPassword) {
//             setError("⚠️ All fields are required.");
//             return false;
//         }
//         if (password !== confirmPassword) {
//             setError("⚠️ Passwords do not match.");
//             return false;
//         }
//         const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
//         if (!emailRegex.test(email)) {
//             setError("⚠️ Enter a valid email address.");
//             return false;
//         }
//         return true;
//     };

//     const handleSignup = async () => {
//         console.log("Signup Data:", formData); 

//         if (!validateForm()) return;

//         try {
//             const response = await fetch("http://localhost:5000/api/signup", {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify(formData),
//             });

//             const data = await response.json();
//             console.log("📤 Signup Response:", data);
            
//             if (!response.ok) {
//                 setError(`⚠️ ${data.error}`);
//                 return;
//             }

//             setSuccessMessage("✅ Signup successful! Redirecting to login...");
//             setTimeout(() => navigate("/login"), 2000);
//         } catch (err) {
//             setError("⚠️ Error during signup. Try again.");
//         }
//     };

//     return (
//         <div className="auth-container">
//             <h2>🔐 Create Your Account</h2>
//             {error && <p className="error">{error}</p>}
//             {successMessage && <p className="success">{successMessage}</p>}
//             <input type="text" name="name" placeholder="👤 Full Name" onChange={handleChange} required />
//             <input type="number" name="age" placeholder="📅 Age" onChange={handleChange} required />
//             <input type="email" name="email" placeholder="✉️ Email" onChange={handleChange} required />
//             <input type="password" name="password" placeholder="🔑 Password" onChange={handleChange} required />
//             <input type="password" name="confirmPassword" placeholder="🔑 Confirm Password" onChange={handleChange} required />
//             <button onClick={handleSignup}>Sign Up</button>
//             <p>Already have an account? <a href="/login">Login</a></p>
//         </div>
//     );
// };

// export default Signup;
