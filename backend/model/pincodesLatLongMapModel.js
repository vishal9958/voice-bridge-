const mongoose = require("mongoose");

const pincodeLatLongSchema = new mongoose.Schema({
  pincode: {
    type: mongoose.SchemaTypes.Number,
    required: true,
    trim: true,
  },
  latitude: {
    type: mongoose.SchemaTypes.Number,
    required: true,
    trim: true,
  },
  longitude: {
    type: mongoose.SchemaTypes.Number,
    required: true,
    trim: true,
  },
});

module.exports = mongoose.model(
  "PincodesLatLongMap",
  pincodeLatLongSchema,
  "PincodesLatLongMap"
);
