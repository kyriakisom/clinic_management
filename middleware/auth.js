// middleware/auth.js

// Middleware to ensure the user is authenticated
const ensureAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  res.status(401).json({ message: 'Please log in to view this resource' });
};

// Middleware to forward authenticated users to a different page
const forwardAuthenticated = (req, res, next) => {
  if (!req.session.userId) {
    return next();
  }
  res.status(403).json({ message: 'You are already logged in' });
};

// Optional: You can also define an alias if needed
const isAuthenticated = ensureAuthenticated; // alias for the same function

// Export the middleware functions
module.exports = {
  ensureAuthenticated,
  forwardAuthenticated,
  isAuthenticated // export alias if needed
};
