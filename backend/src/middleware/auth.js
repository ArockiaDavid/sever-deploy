const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ 
        message: 'No authorization token provided',
        details: { type: 'missing_token' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify and decode token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'software-center-jwt-secret-key-2024', {
        algorithms: ['HS256']
      });
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          message: 'Token expired',
          details: { 
            type: 'token_expired',
            expiredAt: jwtError.expiredAt
          }
        });
      }
      
      return res.status(401).json({ 
        message: 'Invalid token',
        details: { 
          type: 'invalid_token',
          error: jwtError.message
        }
      });
    }
    
    // Verify token payload
    if (!decoded.userId || !decoded.email || !decoded.role || !decoded.name) {
      return res.status(401).json({ 
        message: 'Invalid token format',
        details: { 
          type: 'invalid_token_payload',
          required: ['userId', 'email', 'role', 'name'],
          received: Object.keys(decoded)
        }
      });
    }

    // Find user and verify existence
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ 
        message: 'User not found',
        details: { 
          type: 'user_not_found',
          userId: decoded.userId
        }
      });
    }

    // Verify user data matches token data
    if (decoded.email !== user.email || decoded.role !== user.role || decoded.name !== user.name) {
      return res.status(401).json({ 
        message: 'Token data mismatch',
        details: { 
          type: 'token_mismatch',
          fields: {
            email: decoded.email !== user.email,
            role: decoded.role !== user.role,
            name: decoded.name !== user.name
          }
        }
      });
    }

    // Add user and token to request
    req.user = {
      ...user.toObject(),
      id: user._id.toString(), // Ensure ID is available as both _id and id
      userId: decoded.userId // Add userId from token for backward compatibility
    };
    req.token = token;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid token',
        details: { type: 'invalid_token', error: error.message }
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired',
        details: { type: 'token_expired' }
      });
    }
    res.status(401).json({ 
      message: 'Authentication failed',
      details: { type: 'auth_failed', error: error.message }
    });
  }
};

module.exports = auth;
