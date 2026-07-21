const { duration } = require("moment");
const mongoose = require("mongoose");

const dashboardSchema = new mongoose.Schema({
  type: {
    type: mongoose.SchemaTypes.String,
    required: [true, "Type is Required"],
    trim: true,
  },
  date: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
  duration: {
    type: mongoose.SchemaTypes.Number,
  },
});

module.exports = mongoose.model(
  "Dashboard",
  dashboardSchema,
  "Dashboard"
);
