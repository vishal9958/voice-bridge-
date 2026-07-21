const mongoose = require("mongoose");

const socioEconomicSchema = new mongoose.Schema({
  surveytype: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
  surveyfield: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
  surveyscore: {
    type: mongoose.SchemaTypes.Number,
  },
  surveyvalue: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
});

module.exports = mongoose.model(
  "socioEconimicSurvey",
  socioEconomicSchema,
  "SocioEconomicSurvey"
);
