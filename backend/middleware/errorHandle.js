const ErrorResponse = require("../utils/errorResponse");

const errorHandler = (err, req, res, next) => {
  let error = { ...err };

  error.message = err.message;

  //Log to console for development
  console.log("err", err);

  //Object ID error
  if (err.name === "CastError") {
    const message = `Resource not Found!!!`;
    error = new ErrorResponse(message, [], 404);
  }

  //Mongoose duplicate key
  if (err.code === 11000) {
    const message = `already exists.`;
    const errArray = err.keyValue;
    error = new ErrorResponse(message, errArray, 404);
  }

  //Mongoose validation error
  if (err.name === "ValidationError") {
    var exception = [];
    const message = "Validation Errors";
    const abc = Object.values(err.errors).map((val) =>
      exception.push({ [val.path]: val.message })
    );
    error = new ErrorResponse(message, exception, 404);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || "Server Error",
    errorList: error.errorList || [],
  });
};

module.exports = errorHandler;
