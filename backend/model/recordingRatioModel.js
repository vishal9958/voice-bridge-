const mongoose = require("mongoose");

const recordingRatioSchema = new mongoose.Schema({
  district: { type: String, required: true },
  districtTotalSec: { type: Number, required: true },
  districtTotalRecordedSec: { type: Number, required: true, default: 0 },

  pincodes: {
    type: Map,
    of: Number,
    required: true,
  },

  gender: {
    Male: { type: Number, required: true, default: 0 },
    Female: { type: Number, required: true, default: 0 },
  },

  socioeconomic: {
    Upper: { type: Number, required: true, default: 0 },
    Middle: { type: Number, required: true, default: 0 },
    Lower: { type: Number, required: true, default: 0 },
    "Lower Middle": { type: Number, required: true, default: 0 },
    "Upper Middle": { type: Number, required: true, default: 0 },
    "Upper Lower": { type: Number, required: true, default: 0 },
  },

  ageGroup: {
    "20-30": { type: Number, required: true, default: 0 },
    "31-40": { type: Number, required: true, default: 0 },
    "41-50": { type: Number, required: true, default: 0 },
    "51-60": { type: Number, required: true, default: 0 },
    "61-70": { type: Number, required: true, default: 0 },
  },
});

module.exports = mongoose.model(
  "RecordingRatio",
  recordingRatioSchema,
  "RecordingRatios"
);
