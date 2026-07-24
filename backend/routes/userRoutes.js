const express = require("express");
const {
  getStates,
  getManagerStates,
  getDistricts,
  getActiveDistricts,
  getLanguage,
  addNewUser,
  getAllUsers,
  getCoordinators,
  getSupervisorCoordinators,
  getStateWiseDistricts,
  updateDistrictRate,
  getCoordinatorList,
  getSupervisorList,
  getEndUserList,
  getQcUserList,
  getDistrictSupervisors,
  getTeamleadDistrictList,
  getDistrictTeamLeads,
  updateTeamleadDistrictList,
  getDistrictsForSupervisor,
  getDistrictsForTeamlead,
  getDistrictsForInter,
  getSupervisorCoordinatorList,
  getTeamLeadList,
  getRoleBaseDetails,
  getCoordinatorDetails,
  getTeamleadSupervisorList,
  getTeamleadSupervisors,
  getAllLangauges,
  getAllPhoneBrands,
  disableUser,
  getCoordinatorsForQC,
  getPincodeLatLongMaps,
  getTLSupervisorCoordinatorList,
  getCoordinatorsFoRecoveryQC,
  getCoordinatorsForSegmentation,
  getCoordinatorsForSegcompleted,
  getCountryDistricts,
  // getSocioEconomicEducation,
  // getSocioEconomicOccupation,
  // getSocioEconomicMonthlyIncome,
  updateUserInfo,
  getSelf,
  getTLSpeechHrsDetails,
  searchSpeaker,
  createPair,
  getMyPairs,
  deletePair
} = require("../controller/userController");

const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.route("/getstates").get(getStates);

router.route("/getalllanguages").get(getAllLangauges);

router.route("/getallphonebrands").get(getAllPhoneBrands);

router.route("/getmanagerstates").get(getManagerStates);

router.route("/getdistricts").get(getDistricts);

router.route("/getactivedistricts").get(getActiveDistricts);

router.route("/getlanguage").get(getLanguage);

router.route("/getcoordinators").get(getCoordinators);

router.route("/getcoordinatorsforqc").get(getCoordinatorsForQC);

router
  .route("/getcoordinatorsforsegmentation")
  .get(getCoordinatorsForSegmentation);

router
  .route("/getcoordinatorsforsegcompleted")
  .get(protect, authorize("QCPR"), getCoordinatorsForSegcompleted);

router
  .route("/getcoordinatorsforrecoveryqc")
  .get(protect, authorize("QualityChecker"), getCoordinatorsFoRecoveryQC);

router.route("/getlatlongmap").get(getPincodeLatLongMaps);

router
  .route("/getsupervisorcoordinators")
  .get(
    protect,
    authorize("Admin", "Supervisor", "TeamLead"),
    getSupervisorCoordinators,
  );

router
  .route("/getcoordinatorlist")
  .get(protect, authorize("Admin"), getCoordinatorList);

router
  .route("/getdistrictsupervisors")
  .get(protect, authorize("Admin"), getDistrictSupervisors);

router
  .route("/getsupervisorlist")
  .get(protect, authorize("Admin"), getSupervisorList);

router.route("/getqcuserlist").get(protect, authorize("Admin"), getQcUserList);

router
  .route("/getsupervisorcoordinatorlist")
  .get(protect, authorize("Supervisor"), getSupervisorCoordinatorList);

router
  .route("/getteamleadsupervisorlist")
  .get(protect, authorize("TeamLead"), getTeamleadSupervisorList);

router
  .route("/gettlsupervisorcoordinatorlist")
  .get(protect, authorize("TeamLead"), getTLSupervisorCoordinatorList);

router
  .route("/getteamleadsupervisors")
  .get(protect, authorize("TeamLead"), getTeamleadSupervisors);

router
  .route("/gettlspeechhrsdetails")
  .get(protect, authorize("TeamLead"), getTLSpeechHrsDetails);

router.route("/getstatewisedistricts").get(getStateWiseDistricts);

router
  .route("/getteamleaddistrictlist")
  .get(protect, authorize("Admin", "TeamLead"), getTeamleadDistrictList);

router
  .route("/getteamleads")
  .get(protect, authorize("Admin"), getDistrictTeamLeads);

router
  .route("/getdistrictsforsupervisor")
  .get(protect, authorize("Admin"), getDistrictsForSupervisor);

router
  .route("/getdistrictsforteamlead")
  .get(protect, authorize("Admin"), getDistrictsForTeamlead);

router
  .route("/getdistrictsforinter")
  .get(protect, authorize("Admin"), getDistrictsForInter);

router
  .route("/getteamleadlist")
  .get(protect, authorize("Admin"), getTeamLeadList);

router
  .route("/getenduserlist")
  .get(protect, authorize("Admin"), getEndUserList);

router.route("/addnewuser").post(protect, authorize("Admin"), addNewUser);

router.route("/getallusers").get(protect, authorize("Admin"), getAllUsers);

router
  .route("/getrolebasedetails")
  .get(
    protect,
    authorize(
      "Admin",
      "Manager",
      "TeamLead",
      "Supervisor",
      "QualityChecker",
      "Intra1",
      "Intra2",
      "Inter1",
      "Inter2",
      "QCPR",
    ),
    getRoleBaseDetails,
  );

router
  .route("/getcoordinatordetails")
  .get(
    protect,
    authorize("Admin", "Manager", "TeamLead"),
    getCoordinatorDetails,
  );

router
  .route("/updatedistrictrate")
  .put(protect, authorize("Admin"), updateDistrictRate);

router
  .route("/updateteamleaddistrictlist")
  .put(protect, authorize("Admin"), updateTeamleadDistrictList);

router.route("/disableuser").put(protect, authorize("Admin"), disableUser);

router
  .route("/getcountrydistricts")
  .get(protect, authorize("Vendor"), getCountryDistricts);

// router
//   .route("/getsocioeconomiceducation")
//   .get(protect, authorize("Vendor"), getSocioEconomicEducation);

// router
//   .route("/getsocioeconomicoccupation")
//   .get(protect, authorize("Vendor"), getSocioEconomicOccupation);

// router
//   .route("/getsocioeconomicmonthlyincome")
//   .get(protect, authorize("Vendor"), getSocioEconomicMonthlyIncome);

router
  .route("/updateuserinfo")
  .put(protect, authorize("Vendor"), updateUserInfo);

router.route("/getself").get(protect, authorize("Vendor"), getSelf);
router.route("/searchspeaker").get(protect, searchSpeaker);
router.route("/createpair").post(protect, authorize("Vendor"), createPair);
router.route("/getmypairs").get(protect, authorize("Vendor"), getMyPairs);
router
  .route("/deletepair/:pairId")
  .delete(protect, authorize("Vendor"), deletePair);

module.exports = router;
