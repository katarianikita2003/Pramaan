// models/UserOrganization.js
import mongoose from 'mongoose';

const UserOrganizationSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true 
    },
    organizationId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Organization',
        required: true 
    },
    role: { 
        type: String, 
        enum: ['owner', 'admin', 'member'],
        default: 'member'
    },
    addedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User'
    },
    createdAt: { type: Date, default: Date.now }
});

UserOrganizationSchema.index({ userId: 1, organizationId: 1 }, { unique: true });

export default mongoose.model('UserOrganization', UserOrganizationSchema);