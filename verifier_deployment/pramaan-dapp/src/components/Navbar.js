import React from "react";
import { Link, useLocation } from "react-router-dom";
import "../styles/App.css";

const Navbar = ({ userEmail, onLogout }) => {
    const location = useLocation();

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <h2>🔐 Pramaan</h2>
            </div>

            <ul className="nav-links">
                <li className={location.pathname === "/" ? "active" : ""}>
                    <Link to="/">Home</Link>
                </li>
                <li className={location.pathname === "/register" ? "active" : ""}>
                    <Link to="/register">Register</Link>
                </li>
                <li className={location.pathname === "/authenticate" ? "active" : ""}>
                    <Link to="/authenticate">Authenticate</Link>
                </li>
                <li className={location.pathname === "/verify-proof" ? "active" : ""}>
                    <Link to="/verify-proof">Verify Proof</Link>
                </li>
                <li className={location.pathname === "/proof-history" ? "active" : ""}>
                    <Link to="/proof-history">Proof History</Link>
                </li>
                <li className={location.pathname === "/org-login" ? "active" : ""}>
                    <Link to="/org-login">For Organizations</Link>
                </li>
            </ul>

            <div className="auth-section">
                {userEmail ? (
                    <div className="user-dropdown">
                        <span className="user-email">{userEmail}</span>
                        <button onClick={onLogout} className="logout-btn">Logout</button>
                    </div>
                ) : (
                    <div className="auth-links">
                        <Link to="/login" className="login-btn">Login</Link>
                        <Link to="/signup" className="signup-btn">Sign Up</Link>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
