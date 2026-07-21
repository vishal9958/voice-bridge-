const mongoose = require("mongoose");

const phoneBrandSchema = new mongoose.Schema({
  phonebrand: {
    type: mongoose.SchemaTypes.String,
    required: [true, "PhoneBrand is required"],
    trim: true,
    //maxlength: [100, "First Name cannot be more than 50 characters"],
  },
  
});
module.exports = mongoose.model("PhoneBrand", phoneBrandSchema, "PhoneBrands");