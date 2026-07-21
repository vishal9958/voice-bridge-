const express = require("express");
const {
  getReadAudio,
  submitGGForm,
  saveGGJsonData,
} = require("../controller/editorController");

const { protect, authorize } = require("../middleware/auth");
const router = express.Router();

router
  .route("/readAudio/:id")
  .get(protect, authorize("QualityChecker", "QCPR"), getReadAudio);

router
  .route("/saveggjsondata")
  .put(protect, authorize("QualityChecker"), saveGGJsonData);

router
  .route("/submitggeditorform")
  .put(protect, authorize("QualityChecker"), submitGGForm);

module.exports = router;
