// models/ApiActivity.js
import mongoose from 'mongoose';

const ApiActivitySchema = new mongoose.Schema({
    organizationId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Organization',
        required: true 
    },
    apiKey: { type: String, required: true },
    endpoint: { type: String, required: true },
    method: { type: String, required: true },
    statusCode: { type: Number, required: true },
    responseTime: { type: Number },
    ipAddress: { type: String },
    userAgent: { type: String },
    requestBody: { type: Object },
    errorMessage: { type: String },
    timestamp: { type: Date, default: Date.now }
});

ApiActivitySchema.index({ organizationId: 1, timestamp: -1 });
ApiActivitySchema.index({ apiKey: 1, timestamp: -1 });

export default mongoose.model('ApiActivity', ApiActivitySchema);