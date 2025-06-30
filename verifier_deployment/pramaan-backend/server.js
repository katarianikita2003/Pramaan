import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { generateProof, generateKeys, verifyProof } from './zokratesUtils.js';

// Configure environment variables
dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// **📌 Connect to MongoDB**
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

if (process.env.NODE_ENV !== "production") {
    console.log("🔗 Connecting to MongoDB at:", process.env.MONGO_URI);
}

// **📌 User Schema & Model**
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    age: { type: Number, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    did: { type: String, unique: true },
    latestProof: { type: Object },
    latestVerificationKey: { type: String },
    proofHistory: [{
        date: { type: Date, default: Date.now },
        status: { type: String, enum: ["Success", "Failure"] }
    }]
});

const User = mongoose.model("User", UserSchema);

// **📌 Route: Signup (User Registration)**
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

// **📌 Route: Login**
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

// **📌 Route: Register (Employee/Biometric ID)**
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
        
        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const { provingKey, verificationKey } = generateKeys();
        const proof = generateProof(user.email, provingKey);

        user.latestProof = proof;
        user.latestVerificationKey = verificationKey;
        await user.save();

        res.json({ proof, provingKey });
    } catch (error) {
        console.error("❌ Authentication Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// **📌 Route: Verify Proof**
app.post("/api/verify", async (req, res) => {
    try {
        const { proof, email } = req.body;

        if (!email) return res.status(400).json({ error: "Email is required!" });

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        if (!user.latestProof) {
            return res.status(400).json({ error: "No proof available for verification!" });
        }

        // Ensure proof matches the latest generated proof
        if (JSON.stringify(proof) !== JSON.stringify(user.latestProof)) {
            return res.status(400).json({ error: "Proof does not match latest generated proof!" });
        }

        const verificationKey = user.latestVerificationKey;
        const isVerified = await verifyProof(proof, verificationKey);

        const verificationStatus = isVerified ? "Success" : "Failure";

        user.proofHistory.push({ status: verificationStatus });
        await user.save();

        res.json({ success: isVerified });
    } catch (error) {
        console.error("❌ Verification Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// **📌 Route: Fetch Proof History (User Specific)**
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

// **📌 Default Route**
app.get("/", (req, res) => {
    res.send("✅ Pramaan Backend is Running with MongoDB!");
});

// **Start Server**
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));