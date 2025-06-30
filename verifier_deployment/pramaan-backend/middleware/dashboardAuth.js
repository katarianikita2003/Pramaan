// middleware/dashboardAuth.js
import jwt from 'jsonwebtoken';
import Organization from '../models/Organization.js';
import UserOrganization from '../models/UserOrganization.js';

export const authenticateDashboard = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userOrg = await UserOrganization.findOne({
            userId: decoded.userId,
            organizationId: decoded.organizationId
        }).populate('userId');

        if (!userOrg) {
            return res.status(403).json({ error: 'Access denied' });
        }

        req.user = userOrg.userId;
        req.organization = await Organization.findById(decoded.organizationId);
        req.userRole = userOrg.role;
        
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};