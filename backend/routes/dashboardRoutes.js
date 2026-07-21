const express = require("express");


const router = express.Router();

const { districtSummary,ageDistribution,genderDistribution, socioEconomicDistribution, languageDistribution, weeklyRecording, hightLevelSummary,updateLastDeliveryDate,updateNextDeliveryDate, updateRejectedDuration } = require("../controller/dashboardController");

router.route("/districtsummary").get(districtSummary);

router.route("/agedistruibution").get(ageDistribution);

router.route("/genderdistrubution").get(genderDistribution);

router.route("/socioeconomicdistrubution").get(socioEconomicDistribution)

router.route("/languagedistribution").get(languageDistribution)

router.route('/weeklyRecording').get(weeklyRecording)

router.route('/highlevelsummary').get(hightLevelSummary)

router.route('/updatenextdeliverydate').put(updateNextDeliveryDate)

router.route('/updatelastdeliverydate').put(updateLastDeliveryDate)

router.route('/updaterejectedduration').put(updateRejectedDuration)



module.exports = router;
