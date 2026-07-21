const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema({
  // imgindex: {
  //   type: mongoose.SchemaTypes.Number,
  //   required: [true, "Image index is required"],
  //   trim: true,
  //   //maxlength: [100, "First Name cannot be more than 50 characters"],
  // },
  imgname: {
    type: mongoose.SchemaTypes.String,
    required: [true, "Image name is required"],
    trim: true,
    //maxlength: [100, "First Name cannot be more than 50 characters"],
  },
  imgLocation: {
    type: mongoose.SchemaTypes.String,
    required: [true, "Path is required"],
    trim: true,
    //maxlength: [100, "First Name cannot be more than 50 characters"],
  },
  state: {
    type: mongoose.SchemaTypes.String,
    required: [true, "State is required"],
    trim: true,
  },
  district: {
    type: mongoose.SchemaTypes.String,
    required: [true, "District is required"],
    trim: true,
    //maxlength: [100, "First Name cannot be more than 50 characters"],
  },
  isavailable: {
    type: mongoose.SchemaTypes.Boolean,
    //required: [true, "Language is required"],
    trim: true,
    default: true,
    //maxlength: [100, "First Name cannot be more than 50 characters"],
  },
  isAllocated: {
    type: mongoose.SchemaTypes.Boolean,
    //required: [true, "Language is required"],
    trim: true,
    default: false,
    //maxlength: [100, "First Name cannot be more than 50 characters"],
  },
  uploadedOn: {
    type: mongoose.SchemaTypes.Date,
    //required: [true, "Language is required"],
    trim: true,
    default: Date.now,
    //maxlength: [100, "First Name cannot be more than 50 characters"],
  },
  imageRecordingDurationSec: {
    type: mongoose.SchemaTypes.Number,
    default: 0,
  },
  imageRecordingDuration: {
    type: mongoose.SchemaTypes.String,
    default: "00:00:00",
  },
  phase: {
    type: mongoose.SchemaTypes.Number,
  },
  promptText: {
    type: mongoose.SchemaTypes.String,
  },
});

module.exports = mongoose.model("Image", imageSchema, "Images");
