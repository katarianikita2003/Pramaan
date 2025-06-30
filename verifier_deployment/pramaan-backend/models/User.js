import mongoose from 'mongoose';

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

export default mongoose.model('User', UserSchema);