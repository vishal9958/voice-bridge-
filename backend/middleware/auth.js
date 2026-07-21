const jwt = require("jsonwebtoken");
const asyncHandler = require("./async");
const ErrorResponse = require("../utils/errorResponse");
const User = require("../model/userModel");

//Protect routes
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  // console.log("Header with auth is ", req.headers.authorization);

  // console.log("Header is ", req.headers);

  // console.log("Params is ", req.params);

  // console.log("Query is ", req.query);

  //Get the token from the header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  //Check if no token
  if (!token) {
    return next(
      new ErrorResponse(`Not Authorized to access the routes`, [], 401)
    );
  }

  //Verify Token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    //console.log(decoded);

    req.user = await User.findById(decoded.id);

    //console.log("User is ", req.user);

    next();
  } catch (err) {
    return next(
      new ErrorResponse(`Not Authorized to access the routes`, [], 401)
    );
  }
});

//Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // console.log("User role from req ", req.user.role);
    // console.log("User role is ", roles);
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role ${req.user.role} is not authorized to access this route`,
          [],
          403
        )
      );
    }
    next();
  };
};
