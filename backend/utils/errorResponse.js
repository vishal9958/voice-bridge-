class ErrorResponse extends Error {
  constructor(message, errorList, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.errorList = errorList;
    //this.message = message;
  }
}

module.exports = ErrorResponse;
