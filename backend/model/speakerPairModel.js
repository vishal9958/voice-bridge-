const mongoose = require("mongoose");

const speakerPairSchema = new mongoose.Schema(
  {
    requester: {
      speakerID: { type: mongoose.SchemaTypes.String, required: true },
      name: { type: mongoose.SchemaTypes.String, required: true },
      mobile: { type: Number, required: true },
    },
    partner: {
      speakerID: { type: mongoose.SchemaTypes.String, required: true },
      name: { type: mongoose.SchemaTypes.String, required: true },
      mobile: { type: Number, required: true },
    },
    isActive: { type: mongoose.SchemaTypes.Boolean, default: true },
    hasSubmittedRecording: {
      type: mongoose.SchemaTypes.Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "speakerPair",
  speakerPairSchema,
  "speakerPairs",
);
