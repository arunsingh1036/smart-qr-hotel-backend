const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  // Get token from request headers (Authorization: Bearer <token>)
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access Denied! No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verify the token using secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user details to the request object so next routes can use it
    req.user = decoded; 
    next(); // Allow the request to proceed to the actual route
  } catch (error) {
    res.status(403).json({ message: "Invalid or expired token!" });
  }
};

module.exports = verifyToken;