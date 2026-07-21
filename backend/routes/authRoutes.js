const express = require("express");
const multer = require("multer");
const {
  register,
  login,
  resendOTP,
  verifyVoice,
  addNewLanguage,
  getApprovalLanguageList,
  updateAprroveLanguage,
  getGenderList,
  getSocioEconomicStatusList,
  getAllRatios,
} = require("../controller/authController");

const { protect, authorize } = require("../middleware/auth");

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.route("/register").post(register);

router.route("/login").post(login);

router
  .route("/resendotp")
  .get(protect, authorize("Coordinator", "Supervisor"), resendOTP);

router.route("/verifyVoice").post(upload.single("audio"), verifyVoice);

router.route("/addnewparticipantlanguage").post(addNewLanguage);

router
  .route("/getapprovallanglist")
  .get(protect, authorize("Admin"), getApprovalLanguageList);

router
  .route("/updateandapprovelang")
  .put(protect, authorize("Admin"), updateAprroveLanguage);

router.route("/genderlist").get(getGenderList);

router.route("/seslist").get(getSocioEconomicStatusList);

router.route("/getallratios").get(protect, authorize("Admin"), getAllRatios);

module.exports = router;
