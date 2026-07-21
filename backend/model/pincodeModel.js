const mongoose = require("mongoose");

const pincodeSchema = new mongoose.Schema({
  pincode: {
    type: mongoose.SchemaTypes.Number,
    required: true,
    trim: true,
  },
  state: {
    type: mongoose.SchemaTypes.String,
    required: true,
    trim: true,
  },
  district: {
    type: mongoose.SchemaTypes.String,
    required: true,
    trim: true,
  },
  createdOn: {
    type: mongoose.SchemaTypes.Date,
    required: true,
    default: Date.now,
  },
  isactive: {
    type: mongoose.SchemaTypes.Boolean,
    default: true,
  },
  phase: {
    type: mongoose.SchemaTypes.Number,
  },
});

module.exports = mongoose.model("Pincode", pincodeSchema, "Pincodes");
