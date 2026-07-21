const mongoose = require("mongoose");

const countryDistrictSchema = new mongoose.Schema({
  district: {
    type: mongoose.SchemaTypes.String,
    required: [true, "District is required"],
    trim: true,
    //maxlength: [100, "First Name cannot be more than 50 characters"],
  },
});

module.exports = mongoose.model(
  "countryDistrict",
  countryDistrictSchema,
  "CountryDistricts"
);
