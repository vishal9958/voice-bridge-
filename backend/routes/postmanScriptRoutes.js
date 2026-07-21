const express = require("express");
const {
  //generateTranscriberID,
  //generateFilewiseDistPin,
  //getCustomerUserDetails,
  // updateMoveRejectedFiles,
  //updateCopyRejectedFilesSpecificFolder
  updateFlagForNoisySpeaker,
  // updateMissingSpeakerId,
  updateFlagForGreaterThan25sec,
  updateFlagForInterRejectedSpeakers,
  enableBulkPincodes,
  UpdatePincodesUF,
  updateFlagForNotMatchingWithSample,
} = require("../controller/postmanScriptController");

const { protect, authorize } = require("../middleware/auth");
const router = express.Router();

// router
//   .route("/moverejectedfiles")
//   .put(protect, authorize("Admin"), updateMoveRejectedFiles);

// router.route("/generatetranscriberid").get(generateTranscriberID);

// router.route("/generatefilewisedistpin").get(generateFilewiseDistPin);

// router
//   .route("/copyrejectedfilesspecificfolder")
//   .put(updateCopyRejectedFilesSpecificFolder);

router.route("/updateflagfornoisyspeaker").put(updateFlagForNoisySpeaker);
router
  .route("/updateflagforgreaterthan25sec")
  .put(updateFlagForGreaterThan25sec);

router
  .route("/updateflagforinterrejectedspeakers")
  .put(updateFlagForInterRejectedSpeakers);

router.route("/enablebulkpincodes").put(enableBulkPincodes);

router.route("/updatepincodesusersfiledetails").put(UpdatePincodesUF);

router
  .route("/updateflagfornotmatchingwithsample")
  .put(updateFlagForNotMatchingWithSample);

// router.route("/updatemissingspeakerid").put(updateMissingSpeakerId);

module.exports = router;
