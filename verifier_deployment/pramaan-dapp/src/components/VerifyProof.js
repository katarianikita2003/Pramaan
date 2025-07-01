import React, { useState } from "react";
import "../styles/App.css";

const VerifyProof = () => {
    const [proof, setProof] = useState(null);
    const [status, setStatus] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [fileName, setFileName] = useState("");
    const [verificationDetails, setVerificationDetails] = useState(null);

    // Handles proof.json file upload
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.json')) {
            setError("Please upload a .json file");
            return;
        }

        setFileName(file.name);
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const jsonProof = JSON.parse(e.target.result);

                // Validate if proof contains required fields
                if (!jsonProof.proof || !jsonProof.inputs) {
                    throw new Error("Invalid proof file: Missing required fields (proof, inputs)");
                }

                // Additional validation
                if (!jsonProof.proof.a || !jsonProof.proof.b || !jsonProof.proof.c) {
                    throw new Error("Invalid proof structure: Missing proof components (a, b, c)");
                }

                setProof(jsonProof);
                setError("");
                setStatus("");
                setVerificationDetails(null);
            } catch (error) {
                setError("Invalid JSON file: " + error.message);
                setProof(null);
                setFileName("");
            }
        };

        reader.onerror = () => {
            setError("Error reading file");
            setFileName("");
        };

        reader.readAsText(file);
    };

    // Handles Proof Verification
    const handleVerify = async () => {
        const email = localStorage.getItem("userEmail");

        if (!email) {
            setError("User not logged in! Please login first.");
            return;
        }

        if (!proof) {
            setError("Please upload a valid proof.json file.");
            return;
        }

        setIsLoading(true);
        setError("");
        setStatus("");
        setVerificationDetails(null);

        try {
            console.log('Sending verification request...');
            
            const response = await fetch("http://localhost:5000/api/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ proof, email }),
            });

            const data = await response.json();
            console.log('Verification response:', data);

            if (!response.ok) {
                throw new Error(data.error || "Verification Failed");
            }

            // Set detailed verification results
            setVerificationDetails({
                isRealProof: data.isRealProof,
                zkStatus: data.zkStatus,
                proofAge: data.proofAge
            });

            setStatus(data.success ? "success" : "failure");
            
        } catch (error) {
            console.error("Verification error:", error);
            setStatus("failure");
            setError(`Verification Failed: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Reset file upload
    const handleChangeFile = () => {
        setProof(null);
        setFileName("");
        setStatus("");
        setError("");
        setVerificationDetails(null);
        // Reset file input
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = "";
    };

    return (
        <div className="verify-proof-container glass-card">
            <h2>🔍 Verify Proof</h2>
            
            <p className="verify-info">
                Upload a proof.json file to verify your Zero-Knowledge Proof authentication.
            </p>

            <div className="file-upload-section">
                {!fileName ? (
                    <label className="file-upload-label">
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleFileUpload}
                            className="file-input"
                        />
                        <span className="upload-icon">📁</span>
                        <span>Click to upload proof.json</span>
                    </label>
                ) : (
                    <div className="file-info">
                        <span className="file-icon">📄</span>
                        <span className="file-name">{fileName}</span>
                        <button onClick={handleChangeFile} className="change-file-btn">
                            Change File
                        </button>
                    </div>
                )}
            </div>

            {proof && <div className="success">Proof loaded successfully</div>}
            {error && <div className="error">{error}</div>}
            
            {status === "success" && (
                <div className="verification-success">
                    <h3>✅ Authentication Success!</h3>
                    {verificationDetails && (
                        <div className="verification-details">
                            <p className="detail-item">
                                <strong>Proof Type:</strong> 
                                <span className={verificationDetails.isRealProof ? "real-proof" : "simulated-proof"}>
                                    {verificationDetails.isRealProof ? "Real ZK Proof" : "Simulated Proof"}
                                </span>
                            </p>
                            <p className="detail-item">
                                <strong>Status:</strong> {verificationDetails.zkStatus}
                            </p>
                            {verificationDetails.proofAge && (
                                <p className="detail-item">
                                    <strong>Proof Age:</strong> 
                                    <span className={verificationDetails.proofAge === "fresh" ? "fresh" : "expired"}>
                                        {verificationDetails.proofAge === "fresh" ? "Fresh (< 5 min)" : "Expired (> 5 min)"}
                                    </span>
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}
            
            {status === "failure" && (
                <div className="verification-failure">
                    <h3>❌ Authentication Failed!</h3>
                    <p>The proof is invalid or does not match your credentials.</p>
                    <p className="help-text">
                        Make sure you're using a proof generated with your current account.
                    </p>
                </div>
            )}

            <button 
                className="verify-btn" 
                onClick={handleVerify}
                disabled={isLoading || !proof}
            >
                {isLoading ? <span className="loading"></span> : "Verify"}
            </button>
        </div>
    );
};

export default VerifyProof;

// import React, { useState } from "react";
// import "../styles/App.css";

// const VerifyProof = () => {
//     const [proof, setProof] = useState(null);
//     const [status, setStatus] = useState("");
//     const [error, setError] = useState("");
//     const [isLoading, setIsLoading] = useState(false);
//     const [fileName, setFileName] = useState("");

//     // Handles proof.json file upload
//     const handleFileUpload = (event) => {
//         const file = event.target.files[0];
//         if (!file) return;

//         if (!file.name.endsWith('.json')) {
//             setError("Please upload a .json file");
//             return;
//         }

//         setFileName(file.name);
//         const reader = new FileReader();

//         reader.onload = (e) => {
//             try {
//                 const jsonProof = JSON.parse(e.target.result);

//                 // Validate if proof contains required fields
//                 if (!jsonProof.proof || !jsonProof.inputs) {
//                     throw new Error("Invalid proof file: Missing required fields");
//                 }

//                 setProof(jsonProof);
//                 setError("");
//                 setStatus("");
//             } catch (error) {
//                 setError("Invalid JSON file: " + error.message);
//                 setProof(null);
//                 setFileName("");
//             }
//         };

//         reader.onerror = () => {
//             setError("Error reading file");
//             setFileName("");
//         };

//         reader.readAsText(file);
//     };

//     // Handles Proof Verification
//     const handleVerify = async () => {
//         const email = localStorage.getItem("userEmail");

//         if (!email) {
//             setError("User not logged in! Please login first.");
//             return;
//         }

//         if (!proof) {
//             setError("Please upload a valid proof.json file.");
//             return;
//         }

//         setIsLoading(true);
//         setError("");
//         setStatus("");

//         try {
//             const response = await fetch("http://localhost:5000/api/verify", {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({ proof, email }),
//             });

//             const data = await response.json();

//             if (!response.ok) {
//                 throw new Error(data.error || "Verification Failed");
//             }

//             setStatus(data.success ? "✅ Authentication Success!" : "❌ Authentication Failed!");
//         } catch (error) {
//             setError(`Verification Failed: ${error.message}`);
//             setStatus("");
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     const handleReset = () => {
//         setProof(null);
//         setStatus("");
//         setError("");
//         setFileName("");
//         // Reset file input
//         const fileInput = document.getElementById('file-input');
//         if (fileInput) fileInput.value = '';
//     };

//     return (
//         <div className="verify-proof-container glass-card">
//             <h2>🔍 Verify Proof</h2>
            
//             <p className="verify-info">
//                 Upload a proof.json file to verify your Zero-Knowledge Proof authentication.
//             </p>

//             <div className="file-upload-section">
//                 <input
//                     type="file"
//                     id="file-input"
//                     accept=".json"
//                     onChange={handleFileUpload}
//                     className="file-input"
//                     disabled={isLoading}
//                 />
//                 <label htmlFor="file-input" className="file-upload-label">
//                     {fileName ? (
//                         <span className="file-selected">
//                             📄 {fileName}
//                         </span>
//                     ) : (
//                         <span className="file-prompt">
//                             📁 Choose proof.json file
//                         </span>
//                     )}
//                 </label>
//             </div>

//             {proof && (
//                 <div className="proof-preview">
//                     <p className="preview-title">Proof loaded successfully</p>
//                     <button onClick={handleReset} className="reset-btn">
//                         Change File
//                     </button>
//                 </div>
//             )}

//             {error && <div className="error">{error}</div>}
//             {status && <div className={status.includes("Success") ? "success" : "error"}>{status}</div>}

//             <button 
//                 className="verify-btn" 
//                 onClick={handleVerify}
//                 disabled={isLoading || !proof}
//             >
//                 {isLoading ? <span className="loading"></span> : "Verify"}
//             </button>
//         </div>
//     );
// };

// export default VerifyProof;

// // import React, { useState } from "react";

// // const VerifyProof = () => {
// //     const [proof, setProof] = useState(null);
// //     const [status, setStatus] = useState("");
// //     const [error, setError] = useState("");

// //     // Handles proof.json file upload
// //     const handleFileUpload = (event) => {
// //         const file = event.target.files[0];
// //         const reader = new FileReader();

// //         reader.onload = (e) => {
// //             try {
// //                 const jsonProof = JSON.parse(e.target.result);

// //                 // Validate if proof contains "inputs"
// //                 if (!jsonProof.inputs || !Array.isArray(jsonProof.inputs) || jsonProof.inputs.length === 0) {
// //                     throw new Error("Invalid proof file: Missing inputs");
// //                 }

// //                 setProof(jsonProof);
// //                 setError("");
// //             } catch (error) {
// //                 setError("❌ Invalid JSON file: " + error.message);
// //                 setProof(null);
// //             }
// //         };
// //         reader.readAsText(file);
// //     };

// //     // Handles Proof Verification on the backend
// //     const handleVerify = async () => {
// //         const email = localStorage.getItem("userEmail");

// //         if (!email) {
// //             setError("❌ User not logged in! Please login first.");
// //             return;
// //         }

// //         if (!proof) {
// //             setError("❌ Please upload a valid proof.json file.");
// //             return;
// //         }

// //         try {
// //             console.log(`📤 Sending verification request for User: ${email}`);

// //             const response = await fetch("http://localhost:5000/api/verify", {
// //                 method: "POST",
// //                 headers: { "Content-Type": "application/json" },
// //                 body: JSON.stringify({ proof, email }),
// //             });

// //             if (!response.ok) {
// //                 const errorData = await response.json();
// //                 throw new Error(errorData.error || "Verification Failed");
// //             }

// //             const data = await response.json();
// //             setStatus(data.success ? "✅ Authentication Success!" : "❌ Authentication Failed!");
// //             setError("");
// //         } catch (error) {
// //             console.error("❌ Error during verification:", error);
// //             setStatus("");
// //             setError(`❌ Verification Failed: ${error.message}`);
// //         }
// //     };

// //     return (
// //         <div className="verify-proof-container">
// //             <h2>Verify Proof</h2>
// //             <input type="file" accept=".json" onChange={handleFileUpload} />
// //             <button className="verify-btn" onClick={handleVerify}>Verify</button>
// //             {error && <p className="error-message">{error}</p>}
// //             {status && <p className="verification-status">{status}</p>}
// //         </div>
// //     );
// // };

// // export default VerifyProof;
