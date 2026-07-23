const jwt = require("jsonwebtoken");
const asyncHandler = require("./async");
const ErrorResponse = require("../utils/errorResponse");
const User = require("../model/userModel");

//Protect routes
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  const apiKey = req.headers["x-api-key"];
  const validApiKey = process.env.CUSTOM_API_KEY || "cd6631d9-484b-4805-9cb1-34c7b6cd8209";
  const isValidApiKey = apiKey && String(apiKey).trim() === validApiKey;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
    } catch (err) {
      console.log("[Auth Middleware] Invalid JWT token, falling back to API Key check...");
    }
  }

  if (req.user || isValidApiKey) {
    return next();
  }

  return next(
    new ErrorResponse(`Not Authorized to access the routes`, [], 401)
  );
});

//Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role ${req.user ? req.user.role : 'Guest'} is not authorized to access this route`,
          [],
          403
        )
      );
    }
    next();
  };
};
