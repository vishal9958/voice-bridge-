const mongoose = require("mongoose");

const districtSchema = new mongoose.Schema({
  district: {
    type: mongoose.SchemaTypes.String,
    required: [true, "District is required"],
    trim: true,
    //maxlength: [100, "First Name cannot be more than 50 characters"],
  },
  truncdistname: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
  state: {
    type: mongoose.SchemaTypes.String,
    required: [true, "State is required"],
    trim: true,
  },
  statertocode: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
  language: {
    type: mongoose.SchemaTypes.String,
    required: [true, "Language is required"],
    trim: true,
  },
  rate: {
    type: mongoose.SchemaTypes.Number,
    default: 200,
    required: true,
  },
  rateUpdatedOn: {
    type: mongoose.SchemaTypes.Date,
    default: Date.now,
    required: true,
  },
  isSupervisorAssigned: {
    type: mongoose.SchemaTypes.Boolean,
    default: false,
  },
  isTeamleadAssigned: {
    type: mongoose.SchemaTypes.Boolean,
    default: false,
  },
  isInter1Assigned: {
    type: mongoose.SchemaTypes.Boolean,
    default: false,
  },
  isInter2Assigned: {
    type: mongoose.SchemaTypes.Boolean,
    default: false,
  },
  isactive: {
    type: mongoose.SchemaTypes.Boolean,
    default: true,
  },
  phase: {
    type: mongoose.SchemaTypes.Number,
  },
  // company: {
  //   type: mongoose.SchemaTypes.String, //Megdap, Third-Party
  //   required: true,
  // },
});

module.exports = mongoose.model("District", districtSchema, "Districts");
