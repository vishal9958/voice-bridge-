const mongoose = require("mongoose");

const languageSchema = new mongoose.Schema({
  language: {
    type: mongoose.SchemaTypes.String,
    required: [true, "Language is required"],
    trim: true,
    //maxlength: [100, "First Name cannot be more than 50 characters"],
  },
  isLangApproved: {
    type: mongoose.SchemaTypes.Boolean,
  },
  isactive: {
    type: mongoose.SchemaTypes.Boolean,
  },
});
module.exports = mongoose.model("Language", languageSchema, "Languages");
