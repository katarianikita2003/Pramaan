import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { generateProof, generateKeys, verifyProof, getZoKratesStatus } from './zokratesUtils.js';
import User from './models/User.js';
import saasRoutes from './routes/saasRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import billingRoutes from './routes/billingRoutes.js';

// Configure environment variables
dotenv.config();

const app = express();

// CORS must come first
app.use(cors());

// IMPORTANT: Set up body parsing BEFORE routes
// Regular JSON body parser for most routes
app.use(express.json());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));
    
if (process.env.NODE_ENV !== "production") {
    console.log("🔗 Connecting to MongoDB at:", process.env.MONGO_URI);
}

// API Routes - these need body parser
app.use(saasRoutes);
app.use(dashboardRoutes);

// Billing routes - special handling for Stripe webhook
app.use(billingRoutes);

// Original API Routes
// Route: Signup (User Registration)
app.post("/api/signup", async (req, res) => {
    try {
        const { name, age, email, password, confirmPassword } = req.body;

        if (!name || !age || !email || !password || !confirmPassword) {
            return res.status(400).json({ error: "All fields are required!" });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ error: "Passwords do not match!" });
        }

        console.log("📥 Signup Data:", { name, age, email });

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log("⚠️ Email already registered:", email);
            return res.status(400).json({ error: "Email already registered! Please log in." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Generate DID for the user
        const hashedEmail = crypto.createHash("sha256").update(email).digest("hex");
        const did = `did:pramaan:${hashedEmail.slice(0, 16)}`;

        const newUser = new User({
            name,
            age,
            email,
            password: hashedPassword,
            did
        });

        await newUser.save();

        console.log("✅ Signup successful for:", email);
        res.json({ message: "✅ Signup successful! Please login." });
    } catch (error) {
        console.error("❌ Signup Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Route: Login
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required!" });
        }

        console.log("🔍 Login attempt for:", email);

        const user = await User.findOne({ email });

        if (!user) {
            console.log("❌ User not found for email:", email);
            return res.status(401).json({ error: "Invalid email or password." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log("❌ Password mismatch for email:", email);
            return res.status(401).json({ error: "Invalid email or password." });
        }

        console.log("✅ Login successful for email:", email);
        res.json({ 
            message: "✅ Login successful!", 
            user: {
                name: user.name,
                email: user.email,
                did: user.did
            }
        });
    } catch (error) {
        console.error("❌ Login Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Route: Register (Employee/Biometric ID)
app.post("/api/register", async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: "User not found. Please sign up first." });
        }

        // User already has DID from signup
        res.json({ 
            message: "✅ Already registered!", 
            did: user.did 
        });
    } catch (error) {
        console.error("❌ Registration Error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// **📌 Route: Authenticate User & Generate Proof**
app.post("/api/authenticate", async (req, res) => {
    try {
        const { email } = req.body;
        
        console.log('🔐 Authentication request for:', email);
        
        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }

        const user = await User.findOne({ email });

        if (!user) {
            console.log('❌ User not found:', email);
            return res.status(404).json({ error: "User not found" });
        }

        console.log('✅ User found:', user.email);
        console.log('🔐 Generating ZK proof...');

        try {
            // Check ZoKrates status
            const zkStatus = getZoKratesStatus();
            console.log('ZoKrates status:', zkStatus);

            const { provingKey, verificationKey } = await generateKeys();
            console.log('✅ Keys generated');
            
            // Use user's email and DID for proof generation
            const proof = await generateProof(user.email, provingKey, user.did);
            console.log('✅ Proof generated');

            // Store the proof and keys for verification
            user.latestProof = proof;
            user.latestVerificationKey = verificationKey;
            await user.save();
            console.log('✅ Proof saved to user');

            res.json({ 
                proof, 
                provingKey,
                zkStatus: zkStatus.message,
                isRealProof: zkStatus.ready
            });
        } catch (zkError) {
            console.error('❌ ZK Proof generation error:', zkError);
            throw zkError;
        }
    } catch (error) {
        console.error("❌ Authentication Error:", error);
        console.error("Stack trace:", error.stack);
        res.status(500).json({ 
            error: "Internal Server Error",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// **📌 Route: Verify Proof**
app.post("/api/verify", async (req, res) => {
    try {
        const { proof, email } = req.body;

        if (!email) {
            return res.status(400).json({ error: "Email is required!" });
        }

        if (!proof) {
            return res.status(400).json({ error: "Proof is required!" });
        }

        console.log('🔍 Verification request from:', email);

        const user = await User.findOne({ email });
        if (!user) {
            console.log('❌ User not found:', email);
            return res.status(404).json({ error: "User not found" });
        }

        if (!user.latestProof) {
            console.log('❌ No proof stored for user:', email);
            return res.status(400).json({ error: "No proof available for verification!" });
        }

        console.log('🔍 Verifying ZK proof...');

        // Check ZoKrates status
        const zkStatus = getZoKratesStatus();
        console.log('ZoKrates status:', zkStatus);

        // Deep comparison of proof structure
        const isProofStructureValid = (
            proof.proof &&
            proof.proof.a && Array.isArray(proof.proof.a) && proof.proof.a.length === 2 &&
            proof.proof.b && Array.isArray(proof.proof.b) && proof.proof.b.length === 2 &&
            proof.proof.c && Array.isArray(proof.proof.c) && proof.proof.c.length === 2 &&
            proof.inputs && Array.isArray(proof.inputs)
        );

        if (!isProofStructureValid) {
            console.log('❌ Invalid proof structure');
            return res.status(400).json({ 
                error: "Invalid proof format",
                success: false 
            });
        }

        // Compare proof with stored proof
        const storedProofString = JSON.stringify(user.latestProof);
        const providedProofString = JSON.stringify(proof);
        
        // For development: log proof comparison
        console.log('Stored proof hash:', crypto.createHash('sha256').update(storedProofString).digest('hex').substring(0, 16));
        console.log('Provided proof hash:', crypto.createHash('sha256').update(providedProofString).digest('hex').substring(0, 16));

        // Verify using ZoKrates if available
        let isVerified = false;
        
        if (zkStatus.ready) {
            try {
                // Use actual ZoKrates verification
                isVerified = await verifyProof(proof, user.latestVerificationKey);
                console.log('✅ ZoKrates verification result:', isVerified);
            } catch (error) {
                console.error('❌ ZoKrates verification error:', error);
                // Fall back to proof comparison
                isVerified = storedProofString === providedProofString;
            }
        } else {
            // When ZoKrates is not ready, do strict proof comparison
            isVerified = storedProofString === providedProofString;
            console.log('⚠️ Using proof comparison (ZoKrates not ready)');
        }

        // Additional validation: Check if proof was generated recently (within 5 minutes)
        const proofAge = user.proofHistory.length > 0 ? 
            Date.now() - new Date(user.proofHistory[user.proofHistory.length - 1].date).getTime() : 
            Infinity;
        
        const isProofFresh = proofAge < 5 * 60 * 1000; // 5 minutes
        
        if (!isProofFresh && isVerified) {
            console.log('⚠️ Proof is valid but expired (older than 5 minutes)');
        }

        const verificationStatus = isVerified ? "Success" : "Failure";

        // Log verification attempt
        user.proofHistory.push({ 
            status: verificationStatus,
            isRealProof: zkStatus.ready,
            date: new Date()
        });
        
        // Limit proof history to last 50 entries
        if (user.proofHistory.length > 50) {
            user.proofHistory = user.proofHistory.slice(-50);
        }
        
        await user.save();

        console.log(`✅ Verification complete: ${verificationStatus}`);

        res.json({ 
            success: isVerified,
            zkStatus: zkStatus.message,
            isRealProof: zkStatus.ready,
            message: isVerified ? 
                "✅ Authentication successful! Proof is valid." : 
                "❌ Authentication failed! Invalid proof.",
            proofAge: isProofFresh ? "fresh" : "expired"
        });
        
    } catch (error) {
        console.error("❌ Verification Error:", error);
        console.error("Stack trace:", error.stack);
        res.status(500).json({ 
            error: "Internal Server Error",
            success: false
        });
    }
});

// Route: Authenticate User & Generate Proof
// app.post("/api/authenticate", async (req, res) => {
//     try {
//         const { email } = req.body;
        
//         if (!email) {
//             return res.status(400).json({ error: "Email is required" });
//         }

//         const user = await User.findOne({ email });

//         if (!user) {
//             return res.status(404).json({ error: "User not found" });
//         }

//         const { provingKey, verificationKey } = generateKeys();
//         const proof = generateProof(user.email, provingKey);

//         user.latestProof = proof;
//         user.latestVerificationKey = verificationKey;
//         await user.save();

//         res.json({ proof, provingKey });
//     } catch (error) {
//         console.error("❌ Authentication Error:", error);
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// });

// Route: Verify Proof
// app.post("/api/verify", async (req, res) => {
//     try {
//         const { proof, email } = req.body;

//         if (!email) return res.status(400).json({ error: "Email is required!" });

//         const user = await User.findOne({ email });
//         if (!user) {
//             return res.status(404).json({ error: "User not found" });
//         }

//         if (!user.latestProof) {
//             return res.status(400).json({ error: "No proof available for verification!" });
//         }

//         // Ensure proof matches the latest generated proof
//         if (JSON.stringify(proof) !== JSON.stringify(user.latestProof)) {
//             return res.status(400).json({ error: "Proof does not match latest generated proof!" });
//         }

//         const verificationKey = user.latestVerificationKey;
//         const isVerified = await verifyProof(proof, verificationKey);

//         const verificationStatus = isVerified ? "Success" : "Failure";

//         user.proofHistory.push({ status: verificationStatus });
//         await user.save();

//         res.json({ success: isVerified });
//     } catch (error) {
//         console.error("❌ Verification Error:", error);
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// });

// Route: Fetch Proof History (User Specific)
app.get("/api/proof-history/:email", async (req, res) => {
    try {
        const { email } = req.params;
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ error: "User not found" });

        res.json(user.proofHistory);
    } catch (error) {
        console.error("❌ Proof History Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Default Route
app.get("/", (req, res) => {
    res.send("✅ Pramaan Backend is Running with MongoDB!");
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));