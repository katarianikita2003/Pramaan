import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Home from "./components/Home";
import Register from "./components/Register";
import Authenticate from "./components/Authenticate";
import VerifyProof from "./components/VerifyProof";
import ProofHistory from "./components/ProofHistory";
import Navbar from "./components/Navbar";
import Login from "./components/Login";
import Signup from "./components/Signup";
import "./styles/App.css";
import "./styles/Admin.css";
import OrganizationLogin from './components/Dashboard/OrganizationLogin';
import OrganizationDashboard from './components/Dashboard/OrganizationDashboard';

const ADMIN_EMAIL = "12214064@nitkkr.ac.in"; // Admin email

const App = () => {
    const [userEmail, setUserEmail] = useState(localStorage.getItem("userEmail") || "");
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        if (userEmail === ADMIN_EMAIL) {
            setIsAdmin(true);
        } else {
            setIsAdmin(false);
        }
    }, [userEmail]);

    const handleLogin = (email) => {
        localStorage.setItem("userEmail", email);
        setUserEmail(email);
    };

    const handleLogout = () => {
        localStorage.removeItem("userEmail");
        setUserEmail("");
        setIsAdmin(false);
    };

    return (
        <Router>
            <Navbar userEmail={userEmail} onLogout={handleLogout} isAdmin={isAdmin} />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/register" element={userEmail ? <Register /> : <Navigate to="/login" />} />
                <Route path="/authenticate" element={userEmail ? <Authenticate /> : <Navigate to="/login" />} />
                <Route path="/proof-history" element={userEmail ? <ProofHistory email={userEmail} /> : <Navigate to="/login" />} />
                <Route path="/verify-proof" element={userEmail ? <VerifyProof /> : <Navigate to="/login" />} />
                <Route path="/login" element={<Login onLogin={handleLogin} />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/org-login" element={<OrganizationLogin />} />
                <Route path="/dashboard" element={<OrganizationDashboard />} />
                {/* Redirect unknown routes to home */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
};

export default App;
