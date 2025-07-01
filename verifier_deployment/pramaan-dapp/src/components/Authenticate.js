import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/App.css";

const Authenticate = () => {
    const [proof, setProof] = useState(null);
    const [provingKey, setProvingKey] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [zkStatus, setZkStatus] = useState("");
    const [isRealProof, setIsRealProof] = useState(false);
    const navigate = useNavigate();

    const handleAuthenticate = async () => {
        const email = localStorage.getItem("userEmail");
        
        if (!email) {
            setError("Please login first!");
            setTimeout(() => navigate("/login"), 2000);
            return;
        }

        setIsLoading(true);
        setError("");
        setSuccess("");

        try {
            const response = await fetch("http://localhost:5000/api/authenticate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Authentication failed");
            }

            setProof(data.proof);
            setProvingKey(data.provingKey);
            setZkStatus(data.zkStatus || "");
            setIsRealProof(data.isRealProof || false);
            setSuccess("✅ Proof generated successfully!");
        } catch (error) {
            setError(`Authentication failed: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const downloadProof = () => {
        if (!proof) return;

        const proofData = JSON.stringify(proof, null, 2);
        const blob = new Blob([proofData], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `proof-${new Date().getTime()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const copyToClipboard = (text, type) => {
        navigator.clipboard.writeText(text).then(() => {
            setSuccess(`✅ ${type} copied to clipboard!`);
            setTimeout(() => setSuccess(""), 3000);
        }).catch(() => {
            setError("Failed to copy to clipboard");
        });
    };

    return (
        <div className="authenticate-container glass-card">
            <h2>🔐 Authentication</h2>
            
            {!proof ? (
                <>
                    <p className="auth-info">
                        Generate a Zero-Knowledge Proof to authenticate without revealing your sensitive data.
                    </p>
                    
                    {zkStatus && (
                        <div className={`zk-status ${isRealProof ? 'real' : 'simulated'}`}>
                            <span className="status-icon">{isRealProof ? '🟢' : '🟡'}</span>
                            {zkStatus}
                        </div>
                    )}
                    
                    {error && <div className="error">{error}</div>}
                    
                    <button 
                        className="authenticate-btn"
                        onClick={handleAuthenticate}
                        disabled={isLoading}
                    >
                        {isLoading ? <span className="loading"></span> : "Generate Proof"}
                    </button>
                </>
            ) : (
                <div className="proof-generated">
                    {success && <div className="success">{success}</div>}
                    
                    <div className="proof-section">
                        <h3>🎯 Proof Generated Successfully!</h3>
                        
                        <div className="proof-type-badge">
                            {isRealProof ? (
                                <span className="badge real-proof">
                                    🔐 Real ZK Proof (ZoKrates)
                                </span>
                            ) : (
                                <span className="badge simulated-proof">
                                    ⚠️ Simulated Proof (Demo Mode)
                                </span>
                            )}
                        </div>
                        
                        <p className="proof-info">
                            Your Zero-Knowledge Proof has been generated. You can download it or copy the details below.
                        </p>
                        
                        <div className="proof-actions">
                            <button onClick={downloadProof} className="download-btn">
                                📥 Download Proof
                            </button>
                            <button onClick={() => navigate("/verify-proof")} className="verify-navigate-btn">
                                🔍 Go to Verify
                            </button>
                        </div>
                        
                        <div className="proof-details">
                            <div className="detail-section">
                                <h4>Proving Key</h4>
                                <div className="detail-value">
                                    <code>{provingKey}</code>
                                    <button 
                                        onClick={() => copyToClipboard(provingKey, "Proving Key")}
                                        className="copy-btn"
                                    >
                                        📋
                                    </button>
                                </div>
                            </div>
                            
                            <div className="detail-section">
                                <h4>Proof Preview</h4>
                                <div className="proof-preview-auth">
                                    <pre>{JSON.stringify(proof, null, 2).substring(0, 200)}...</pre>
                                </div>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => {
                                setProof(null);
                                setProvingKey(null);
                                setSuccess("");
                                setZkStatus("");
                                setIsRealProof(false);
                            }}
                            className="generate-new-btn"
                        >
                            Generate New Proof
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Authenticate;