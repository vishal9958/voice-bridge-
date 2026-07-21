const express = require("express");
const {
  //uploadFiles,
  uploadFile,
  getFileDetails,
  getCoordinatorUsers,
  getUserDetails,
  updateRejectFile,
  getAllFiles,
  getAllImageFiles,
  uploadImageFiles,
  getRandomImagePath,
  getDistrictwiseFiles,
  getDistrictwiseUsers,
  getStateFileList,
  updateQcAcceptFile,
  getCoordinatorwiseUsers,
  getUsersSampleAudio,
  getInterUsersSampleAudio,
  getInter2UsersSampleAudio,
  updateRejectBulkFiles,
  getCoordinatorwiseUsersForIntra,
  getCoordinatorwiseUsersForIntraTwo,
  updateIntraAcceptRejectFile,
  updateInterUniqueDuplicateFile,
  updateIntraSpeaker,
  updateRollBackFiles,
  getInterPairDetails,
  signingOffSpeaker,
  updateDownloadStatus,
  getInterAcceptedUsers,
  getInterAcceptedFiles,
  generatePincodeLatLongList,
  getRejectedLangMismatchFiles,
  getRejectedLanguageMismatchRecoveryUsers,
  updateQcLangMismatchAcceptFile,
  updateQcRecoveryRejectFile,
  getRejectedGenderMismatchRecoveryUsers,
  getRejectedGenderMismatchFiles,
  updateQcGenderMismatchAcceptFile,
  getRejectedNoisyRecoverySpeakers,
  getRejectedNoisyFiles,
  updateQcNoisyAcceptFile,
  getRejectedGt25SecSpeakers,
  getRejectedGt25secFiles,
  updateQcGt25SecAcceptFile,
  getRejectedNoMatchSampleSpeakers,
  getRejectednomatchsampleFiles,
  updateQcNotMatchsampleAcceptFile,
  getInterRejectedSpeakers,
  getInterRejectedFiles,
  updateQcInterRejectedAcceptFile,
  qcSigningOffSpeaker,
  getSegmentationUsers,
  getQcAcceptedFiles,
  segmentationSigningOffSpeaker,
  getSegCompletedUsers,
  getSegCompletedFiles,
  reOpenFile,
  qcprSigningOffSpeaker,
  updateQcLangGenderUser,
  getQcReport,
  //generateTranscriberID,
  //generateFilewiseDistPin,
  //getCustomerUserDetails,
  updateMoveRejectedFiles,
  //updateCopyRejectedFilesSpecificFolder,
  getOldCoordinatorsForQC, //Need to delete API after work completed
  getOldInterAcceptedUsers, //Need to delete API after work completed
  getOldInterAcceptedFiles, //Need to delete API after work completed
  updateQcOldAcceptFile, //Need to delete API after work completed
  generateVoiceVerifyRandomImage,
} = require("../controller/uploadController");

const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

const { protect, authorize } = require("../middleware/auth");
const router = express.Router();

router
  .route("/uploadfiles")
  .post(protect, authorize("Vendor"), upload.single("audio"), uploadFile);

router
  .route("/getfiledetails")
  .get(protect, authorize("Vendor"), getFileDetails);

router
  .route("/getusers")
  .get(protect, authorize("Coordinator"), getCoordinatorUsers);

router
  .route("/getdistrictwiseusers")
  .get(protect, authorize("Customer", "Admin"), getDistrictwiseUsers);

router
  .route("/getcoordinatorwiseusers")
  .get(protect, authorize("Supervisor"), getCoordinatorwiseUsers);

router
  .route("/getinteracceptedusers")
  .get(protect, authorize("QualityChecker"), getInterAcceptedUsers);

router
  .route("/getsegmentationusers")
  .get(protect, authorize("QualityChecker"), getSegmentationUsers);

router
  .route("/getsegcompletedusers")
  .get(protect, authorize("QCPR"), getSegCompletedUsers);

router
  .route("/getinteracceptedfiles")
  .get(protect, authorize("QualityChecker"), getInterAcceptedFiles);

router
  .route("/getqcacceptedfiles")
  .get(protect, authorize("QualityChecker"), getQcAcceptedFiles);

router
  .route("/getsegcompletedfiles")
  .get(protect, authorize("QCPR"), getSegCompletedFiles);

router
  .route("/getcoordinatorwiseusersforintra")
  .get(protect, authorize("Intra1", "Admin"), getCoordinatorwiseUsersForIntra);

router
  .route("/getcoordinatorwiseusersforintra2")
  .get(
    protect,
    authorize("Intra2", "Admin"),
    getCoordinatorwiseUsersForIntraTwo
  );

router
  .route("/getusersampleaudio")
  .get(protect, authorize("QualityChecker"), getUsersSampleAudio);

router
  .route("/getinterusersampleaudio")
  .get(protect, authorize("Inter1", "Admin"), getInterUsersSampleAudio);

router
  .route("/getinter2usersampleaudio")
  .get(protect, authorize("Inter2", "Admin"), getInter2UsersSampleAudio);

router
  .route("/getuserdetails")
  .get(
    protect,
    authorize(
      "Coordinator",
      "QualityChecker",
      "Customer",
      "Supervisor",
      "Admin",
      "Intra1",
      "Intra2",
      "Inter1",
      "Inter2"
    ),
    getUserDetails
  );

// router
//   .route("/getcustomeruserdetails")
//   .get(protect, authorize("Customer"), getCustomerUserDetails);

router
  .route("/rejectfile")
  .put(
    protect,
    authorize("Coordinator", "Supervisor", "QualityChecker", "Intra1"),
    updateRejectFile
  ); // Coordinator/Supervisor/Qc

router
  .route("/moverejectedfiles")
  .put(protect, authorize("Admin"), updateMoveRejectedFiles);

router
  .route("/rejectbulkfiles")
  .put(protect, authorize("Admin"), updateRejectBulkFiles); // Admin

router
  .route("/rollbackfiles")
  .put(protect, authorize("Admin"), updateRollBackFiles); // Admin

router
  .route("/qcacceptfile")
  .put(protect, authorize("QualityChecker", "Intra1"), updateQcAcceptFile); //Qc

router
  .route("/intraacceptrejectfile")
  .put(protect, authorize("Intra1", "Intra2"), updateIntraAcceptRejectFile); //Intra1, Intra2

router
  .route("/interuniqueduplicatefile")
  .put(protect, authorize("Inter1", "Inter2"), updateInterUniqueDuplicateFile); //Inter1, Inter2

router
  .route("/updateintraspeaker")
  .put(protect, authorize("Intra1"), updateIntraSpeaker);

router
  .route("/getallfiles")
  .get(
    protect,
    authorize(
      "Admin",
      "Coordinator",
      "Supervisor",
      "Manager",
      "TeamLead",
      "QualityChecker"
    ),
    getAllFiles
  ); //Admin

router
  .route("/getstatefilelist")
  .get(protect, authorize("Admin"), getStateFileList); //Admin

router
  .route("/getdistrictwisefiles")
  .get(protect, authorize("Customer"), getDistrictwiseFiles); //Customer

router
  .route("/uploadimagefile")
  .post(protect, authorize("Admin"), uploadImageFiles); //Admin

router
  .route("/getallimagefiles")
  .get(protect, authorize("Admin"), getAllImageFiles); //Admin

router
  .route("/getrandomimagepath")
  .get(protect, authorize("Vendor"), getRandomImagePath); //Vendor

router
  .route("/getinterpairdetails")
  .post(protect, authorize("QualityChecker"), getInterPairDetails); //QC

router
  .route("/updatespeakersignoff")
  .put(protect, authorize("Coordinator"), signingOffSpeaker);

router
  .route("/updateqcspeakersignoff")
  .put(protect, authorize("QualityChecker"), qcSigningOffSpeaker); //QC

router
  .route("/updatesengmentationspeakersignoff")
  .put(protect, authorize("QualityChecker"), segmentationSigningOffSpeaker); //QC

router
  .route("/updateqcprspeakersignoff")
  .put(protect, authorize("QCPR"), qcprSigningOffSpeaker); //QCPR

router.route("/qcreport").get(protect, authorize("Admin"), getQcReport); //Admin

router
  .route("/updatedownloadstatus")
  .put(protect, authorize("Admin"), updateDownloadStatus);

router
  .route("/getrejectedLangMismatchfiles")
  .get(protect, authorize("QualityChecker"), getRejectedLangMismatchFiles);

router
  .route("/getrejectedGenderMismatchfiles")
  .get(protect, authorize("QualityChecker"), getRejectedGenderMismatchFiles);

router
  .route("/getrejectedlangmismatchrecoveryusers")
  .get(
    protect,
    authorize("QualityChecker"),
    getRejectedLanguageMismatchRecoveryUsers
  );

router
  .route("/getrejectedgendermismatchrecoveryusers")
  .get(
    protect,
    authorize("QualityChecker"),
    getRejectedGenderMismatchRecoveryUsers
  );

router
  .route("/getrejectednoisyrecoveryspeakers")
  .get(protect, authorize("QualityChecker"), getRejectedNoisyRecoverySpeakers);

router
  .route("/getrejectedgt25secspeaker")
  .get(protect, authorize("QualityChecker"), getRejectedGt25SecSpeakers);

router
  .route("/getrejectednoisyfiles")
  .get(protect, authorize("QualityChecker"), getRejectedNoisyFiles);

router
  .route("/getrejectedgt25secfiles")
  .get(protect, authorize("QualityChecker"), getRejectedGt25secFiles);

router
  .route("/getrejectednomatchsamplespeaker")
  .get(protect, authorize("QualityChecker"), getRejectedNoMatchSampleSpeakers);

router
  .route("/getrejectednomatchsamplefiles")
  .get(protect, authorize("QualityChecker"), getRejectednomatchsampleFiles);

router
  .route("/qcacceptnotmatchsamplefile")
  .put(protect, authorize("QualityChecker"), updateQcNotMatchsampleAcceptFile);

router
  .route("/getinterrejectedfiles")
  .get(protect, authorize("QualityChecker"), getInterRejectedFiles);

router
  .route("/getinterrejectedspeaker")
  .get(protect, authorize("QualityChecker"), getInterRejectedSpeakers);

router
  .route("/qclanguagemismatchacceptfile")
  .put(protect, authorize("QualityChecker"), updateQcLangMismatchAcceptFile);

router
  .route("/qcgendermismatchacceptfile")
  .put(protect, authorize("QualityChecker"), updateQcGenderMismatchAcceptFile);

router
  .route("/qcacceptnoisyfile")
  .put(protect, authorize("QualityChecker"), updateQcNoisyAcceptFile);

router
  .route("/qcacceptgt25secfile")
  .put(protect, authorize("QualityChecker"), updateQcGt25SecAcceptFile);

router
  .route("/qcacceptinterrejectedfile")
  .put(protect, authorize("QualityChecker"), updateQcInterRejectedAcceptFile);

router
  .route("/qcrecoveryrejectfile")
  .put(protect, authorize("QualityChecker"), updateQcRecoveryRejectFile);

router.route("/generatepincodelatlonglist").get(generatePincodeLatLongList);

router.route("/reopenfile").put(protect, authorize("QCPR"), reOpenFile);

router.route("/getvoiceverifyimage").get(generateVoiceVerifyRandomImage);

/************************************************************************* */
//Need to delete below API after work completed
router
  .route("/getoldcoordinatorsforqc")
  .get(protect, authorize("QualityChecker"), getOldCoordinatorsForQC);

router
  .route("/getoldinteracceptedusers")
  .get(protect, authorize("QualityChecker"), getOldInterAcceptedUsers);

router
  .route("/getoldinteracceptedfiles")
  .get(protect, authorize("QualityChecker"), getOldInterAcceptedFiles);

router
  .route("/qcoldacceptfile")
  .put(protect, authorize("QualityChecker"), updateQcOldAcceptFile);

router
  .route("/qclanguagegenderupdateuser")
  .put(protect, authorize("QualityChecker"), updateQcLangGenderUser);

module.exports = router;
