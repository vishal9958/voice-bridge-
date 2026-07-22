const mongoose = require("mongoose");
const User = require("../model/userModel");
const District = require("../model/districtModel");
const Image = require("../model/imagesModel");
const Pincode = require("../model/pincodeModel");
const Languages = require("../model/languageModel");
const PhoneBrands = require("../model/phoneBrandsModel");
const SpeakerPair = require("../model/speakerPairModel");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
var springedge = require("springedge");
const FileDetail = require("../model/fileDetailsModel");
const PincodesLatLongMap = require("../model/pincodesLatLongMapModel");
//const socioEconimicSurvey = require("../model/SocioEconomicStatusModel");
const countryDistrict = require("../model/countryDistrictModel");
const xlsx = require("xlsx");

//@desc     Get State List
//@route    GET /api/getstates/
//@access   Public
//@usedBy   Audio Recording App
exports.getStates = asyncHandler(async (req, res, next) => {
  try {
    // console.log("req.body is ", req.body);
    const states = await District.distinct("state", { phase: 2 });
    // console.log("states..", states);
    // res.json({
    //           msg:"User created successfully!",
    //           data:states
    //         });
    res.status(200).json({
      success: true,
      data: states,
      msg: "State List!",
    });
  } catch (err) {
    return next(new ErrorResponse(`User creation failed!`, [], 500));
  }
});

//@desc     Get All Language List
//@route    GET /api/getalllanguages/
//@access   Public
//@usedBy   Audio Recording App
exports.getAllLangauges = asyncHandler(async (req, res, next) => {
  try {
    const languages = await Languages.distinct("language");

    res.status(200).json({
      success: true,
      data: languages,
      msg: "All Languages List!",
    });
  } catch (err) {
    return next(new ErrorResponse(`Getting All Languages failed!`, [], 500));
  }
});

//@desc     Get All Phone Brands
//@route    GET /api/getallphonebrands/
//@access   Public
//@usedBy   Audio Recording App
exports.getAllPhoneBrands = asyncHandler(async (req, res, next) => {
  try {
    const phonebrands = await PhoneBrands.distinct("phonebrand");
    //console.log("phonebrands", phonebrands);
    res.status(200).json({
      success: true,
      data: phonebrands,
      msg: "All Phone Brand List!",
    });
  } catch (err) {
    return next(new ErrorResponse(`Getting All Phone brands failed!`, [], 500));
  }
});

//@desc     Get Manager State List
//@route    GET /api/getmanagerstates/
//@access   Private
//@usedBy   Audio Recording App
exports.getManagerStates = asyncHandler(async (req, res, next) => {
  try {
    // console.log("req.body is ", req.body);
    const states = await User.find({});
    // console.log("states..", states);
    // res.json({
    //           msg:"User created successfully!",
    //           data:states
    //         });
    res.status(200).json({
      success: true,
      data: states,
      msg: "State List!",
    });
  } catch (err) {
    return next(new ErrorResponse(`User creation failed!`, [], 500));
  }
});

//@desc     Get District List
//@route    GET /api/getdistricts/
//@access   Public
//@usedBy   Audio Recording App
exports.getDistricts = asyncHandler(async (req, res, next) => {
  try {
    // console.log("req.query is ", req.query);
    const districts = await District.distinct("district", {
      state: req.query.state,
      phase: 2,
    });
    //console.log("districts.. ", districts);
    res.status(200).json({
      success: true,
      data: districts,
      msg: "District List!",
    });
  } catch (err) {
    return next(new ErrorResponse(`Internal server error!`, [], 500));
  }
});

//@desc     Get District List for Register
//@route    GET /api/getactivedistricts/
//@access   Public
//@usedBy   Audio Recording App
exports.getActiveDistricts = asyncHandler(async (req, res, next) => {
  try {
    // console.log("req.query is ", req.query);

    const districts = await District.find(
      {
        state: req.query.state,
        phase: 2,
      },
      {
        district: 1,
        isactive: 1,
        _id: 0,
      },
    );
    //console.log("districts.. ", districts);
    res.status(200).json({
      success: true,
      data: districts,
      msg: "District List!",
    });
  } catch (err) {
    return next(new ErrorResponse(`Internal server error!`, [], 500));
  }
});

//@desc     Get State wise District List
//@route    GET /api/getstatewisedistricts/
//@access   Public
//@usedBy   Audio Recording App
exports.getStateWiseDistricts = asyncHandler(async (req, res, next) => {
  try {
    // console.log("req.query is ", req.query);
    const districts = await District.find({ state: req.query.state });

    //console.log("districts.. ", districts);
    res.status(200).json({
      success: true,
      data: districts,
      msg: "District List!",
    });
  } catch (err) {
    return next(new ErrorResponse(`User creation failed!`, [], 500));
  }
});

//@desc     Get District for Supervisor
//@route    GET /api/getdistrictsforsupervisor/
//@access   Public
//@usedBy   Audio Recording App
exports.getDistrictsForSupervisor = asyncHandler(async (req, res, next) => {
  try {
    // console.log("req.query is ", req.query);
    const districts = await District.find(
      {
        state: req.query.state,
      },
      {
        district: 1,
        // isSupervisorAssigned: 1,
      },
    );
    //console.log("districts.. ", districts);
    res.status(200).json({
      success: true,
      data: districts,
      msg: "District List!",
    });
  } catch (err) {
    return next(new ErrorResponse(`User creation failed!`, [], 500));
  }
});

//@desc     Get District for TeamLead
//@route    GET /api/getdistrictsforteamlead/
//@access   Public
//@usedBy   Audio Recording App
exports.getDistrictsForTeamlead = asyncHandler(async (req, res, next) => {
  try {
    // console.log("req.query is ", req.query);
    const districts = await District.find(
      {
        state: req.query.state,
      },
      {
        district: 1,
        isTeamleadAssigned: 1,
      },
    );
    //console.log("districts.. ", districts);
    res.status(200).json({
      success: true,
      data: districts,
      msg: "District List!",
    });
  } catch (err) {
    return next(new ErrorResponse(`User creation failed!`, [], 500));
  }
});

//@desc     Get District for Inter1, Inter2
//@route    GET /api/getdistrictsforinter/
//@access   Public
//@usedBy   Audio Recording App
exports.getDistrictsForInter = asyncHandler(async (req, res, next) => {
  try {
    console.log("req.query is ", req.query);
    let districts = [];
    if (req.query.role == "Inter1") {
      districts = await District.find(
        {
          state: req.query.state,
        },
        {
          district: 1,
          isInter1Assigned: 1,
        },
      );
    } else if (req.query.role == "Inter2") {
      districts = await District.find(
        {
          state: req.query.state,
        },
        {
          district: 1,
          isInter2Assigned: 1,
        },
      );
    }

    console.log("districts.. ", districts);
    res.status(200).json({
      success: true,
      data: districts,
      msg: "District List!",
    });
  } catch (err) {
    return next(new ErrorResponse(`User creation failed!`, [], 500));
  }
});

//@desc     Get District Language
//@route    GET/api/getlanguage/
//@access   Public
//@usedBy   Audio Recording App
exports.getLanguage = asyncHandler(async (req, res, next) => {
  try {
    // console.log("req.body is ", req.body);
    const language = await Languages.find({ isactive: true });

    // console.log("language", language.length);

    // const language = await District.find(
    //   {
    //     state: req.query.state,
    //     district: req.query.district,
    //   },
    //   {
    //     language: 1,
    //     _id: 0,
    //   }
    // );

    //console.log("language.. ", language);

    const pincodes = await Pincode.find(
      {
        state: req.query.state,
        district: req.query.district,
        // isactive: true,
      },
      {
        pincode: 1,
        isactive: 1,
        _id: 0,
      },
    );

    res.status(200).json({
      success: true,
      data: { language, pincodes },
      msg: "User Language and Pincodes!",
    });
  } catch (err) {
    return next(new ErrorResponse(`User creation failed!`, [], 500));
  }
});

//@desc     Coordinator name List
//@route    GET /api/getcoordinators/
//@access   Public
//@usedBy   Audio Recording App
exports.getCoordinators = asyncHandler(async (req, res, next) => {
  try {
    // console.log("req.query", req.query.state, req.query.district);
    const coordinatorList = await User.find(
      {
        state: req.query.state,
        district: req.query.district,
        role: "Coordinator",
        isactive: true,
      },
      {
        name: 1,
        _id: 0,
      },
    );
    //console.log("coordinatorList", coordinatorList);

    coordinatorList.sort((a, b) => {
      const aStartsWithMegdap = a.name.startsWith("Megdap") ? 0 : 1;
      const bStartsWithMegdap = b.name.startsWith("Megdap") ? 0 : 1;
      return (
        aStartsWithMegdap - bStartsWithMegdap || a.name.localeCompare(b.name)
      );
    });

    res.status(200).json({
      success: true,
      msg: `Coordinator List`,
      data: coordinatorList,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Get Coordinator name List for QC
//@route    GET /api/getcoordinatorsforqc/
//@access   Public
//@usedBy   Audio Recording App
exports.getCoordinatorsForQC = asyncHandler(async (req, res, next) => {
  try {
    // console.log("req.query", req.query.state, req.query.district)

    // const coordinatorList = await User.distinct("name", {
    //   state: req.query.state,
    //   district: req.query.district,
    //   role: "Coordinator",
    //   recordedHours: { $gt: "00:00:00" },
    // });

    const coordinatorList = await FileDetail.distinct("coordinatorName", {
      state: req.query.state,
      district: req.query.district,
      //role: "Coordinator",
      isQcAccepted: false,
      inter1CheckStatus: "Accepted",
    });

    //console.log("coordinatorList", coordinatorList);

    res.status(200).json({
      success: true,
      msg: `Coordinator List`,
      data: coordinatorList,
    });
  } catch (err) {
    console.log("err", err);
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Get Coordinator name List for QC
//@route    GET /api/getcoordinatorsforsegmentation/
//@access   Public
//@usedBy   Audio Recording App
exports.getCoordinatorsForSegmentation = asyncHandler(
  async (req, res, next) => {
    try {
      // console.log("req.query", req.query.state, req.query.district)

      const coordinatorList = await FileDetail.distinct("coordinatorName", {
        state: req.query.state,
        district: req.query.district,
        // role: "Coordinator",
        isQcAccepted: true,
        inter1CheckStatus: "Accepted",
        //SegmentationStatus: { $in: ["Open", "InProgress", "Completed"] },
      });

      //console.log("coordinatorList", coordinatorList);

      res.status(200).json({
        success: true,
        msg: `Coordinator List`,
        data: coordinatorList,
      });
    } catch (err) {
      console.log("err", err);
      return next(new ErrorResponse("Internal server error", [err], 500));
    }
  },
);

//@desc     Get Coordinator name List for QC
//@route    GET /api/getcoordinatorsforsegcompleted/
//@access   Public
//@usedBy   Audio Recording App
exports.getCoordinatorsForSegcompleted = asyncHandler(
  async (req, res, next) => {
    try {
      // console.log("req.query", req.query.state, req.query.district)

      const coordinatorList = await FileDetail.distinct("coordinatorName", {
        state: req.query.state,
        district: req.query.district,
        // role: "Coordinator",
        isQcAccepted: true,
        inter1CheckStatus: "Accepted",
        SegmentationStatus: { $in: ["Completed"] },
      });

      //console.log("coordinatorList", coordinatorList);

      res.status(200).json({
        success: true,
        msg: `Coordinator List`,
        data: coordinatorList,
      });
    } catch (err) {
      console.log("err", err);
      return next(new ErrorResponse("Internal server error", [err], 500));
    }
  },
);

//@desc     Get Coordinator name List for QC
//@route    GET /api/getcoordinatorsforrecoveryqc/
//@access   Public
//@usedBy   Audio Recording App
exports.getCoordinatorsFoRecoveryQC = asyncHandler(async (req, res, next) => {
  try {
    // console.log("req.query", req.query.state, req.query.district)

    const coordinatorList = await FileDetail.distinct("coordinatorName", {
      state: req.query.state,
      district: req.query.district,
      status: {
        $in: [
          "CoordinatorRejected",
          "SupervisorRejected",
          "QcRejected",
          "AdminRejected",
        ],
      },
    });

    //console.log("coordinatorList", coordinatorList);

    res.status(200).json({
      success: true,
      msg: `Coordinator List`,
      data: coordinatorList,
    });
  } catch (err) {
    console.log("err", err);
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

// //@desc     Teamlead Supervisor name List for dropdown
// //@route    GET /api/getteamleadsupervisors/
// //@access   Public
// //@usedBy   Audio Recording App
exports.getTeamleadSupervisors = asyncHandler(async (req, res, next) => {
  try {
    console.log("req.user", req.user);

    const TLSupervisorList = await User.find(
      {
        state: req.query.state,
        district: req.query.district,
        role: "Supervisor",
        teamleadID: req.user._id,
      },
      {
        name: 1,
        _id: 1,
      },
    );
    console.log("TLSupervisorList", TLSupervisorList);
    const SupervisorList = await User.find(
      {
        state: req.query.state,
        district: req.query.district,
        role: "Supervisor",
      },
      {
        name: 1,
        _id: 1,
      },
    );
    console.log("SupervisorList", SupervisorList);
    if (TLSupervisorList.length > 0) {
      res.status(200).json({
        success: true,
        msg: `TLSupervisor List`,
        data: TLSupervisorList,
      });
    } else {
      res.status(200).json({
        success: true,
        msg: `Supervisor List`,
        data: SupervisorList,
      });
    }

    //console.log("coordinatorList", coordinatorList);
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Coordinator name List
//@route    GET /api/getsupervisorcoordinators/
//@access   Public
//@usedBy   Audio Recording App
exports.getSupervisorCoordinators = asyncHandler(async (req, res, next) => {
  try {
    // console.log("req.query", req.query.state, req.query.district);
    const coordinatorList = await User.find(
      {
        state: req.query.state,
        district: req.query.district,
        role: "Coordinator",
        supervisorID: mongoose.Types.ObjectId(req.query.supervisorID),
      },
      {
        name: 1,
        _id: 0,
      },
    );
    console.log("coordinatorList", coordinatorList);

    res.status(200).json({
      success: true,
      msg: `Coordinator List`,
      data: coordinatorList,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Coordinator List
//@route    GET /api/getcoordinatorlist/
//@access   Private
//@usedBy   Audio Recording App
exports.getCoordinatorList = asyncHandler(async (req, res, next) => {
  try {
    // console.log("req.query", req.query.state, req.query.district);
    const coordinatorList = await User.find(
      { role: "Coordinator", phase: 2, isactive: true },
      {
        name: 1,
        accesscode: 1,
        mobile: 1,
        state: 1,
        district: 1,
        createdOn: 1,
        _id: 1,
      },
    );
    //console.log("coordinatorList", coordinatorList);

    res.status(200).json({
      success: true,
      msg: `Coordinator List`,
      data: coordinatorList,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     EndUser List
//@route    GET /api/getenduserlist/
//@access   Private
//@usedBy   Audio Recording App
exports.getEndUserList = asyncHandler(async (req, res, next) => {
  try {
    // console.log("req.query", req.query.state, req.query.district);
    const endUserList = await User.find(
      { role: "Vendor", phase: 2, isactive: true },
      {
        name: 1,
        accesscode: 1,
        mobile: 1,
        state: 1,
        district: 1,
        createdOn: 1,
        socioeconomicstatus: 1,
        language: 1,
        recordedHours: 1,
        _id: 1,
        coordinator: 1,
        sampleAudioPath: 1,
        teamleadName: 1,
        teamleadID: 1,
      },
    );

    res.status(200).json({
      success: true,
      msg: `EndUser List`,
      data: endUserList,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     EndUser List
//@route    GET /api/getqcuserlist/
//@access   Private
//@usedBy   Audio Recording App
exports.getQcUserList = asyncHandler(async (req, res, next) => {
  try {
    // console.log("req.query", req.query.state, req.query.district);
    const qcUserList = await User.find(
      { role: "QualityChecker", phase: 2, isactive: true },
      {
        name: 1,
        accesscode: 1,
        mobile: 1,
        state: 1,
        district: 1,
        createdOn: 1,
        _id: 1,
      },
    );
    // console.log("endUserList", endUserList);

    res.status(200).json({
      success: true,
      msg: `QcUser List`,
      data: qcUserList,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Supervisors List
//@route    GET /api/getsupervisorlist/
//@access   Private
//@usedBy   Audio Recording App
exports.getSupervisorList = asyncHandler(async (req, res, next) => {
  try {
    // console.log("req.query", req.query.state, req.query.district);
    const supervisors = await User.find(
      { role: "Supervisor", phase: 2, isactive: true },
      {
        name: 1,
        accesscode: 1,
        mobile: 1,
        state: 1,
        district: 1,
        email: 1,
        createdOn: 1,
        _id: 1,
      },
    );

    // let supervisorsList = [];
    // supervisors.forEach((value) => {
    //   let body;
    //   let states = "";
    //   let districts = "";
    //   value.supervisorDistricts.map((row) => {
    //     if (!states.includes(row.state)) {
    //       states = states + row.state + ",";
    //     }
    //     if (!districts.includes(row.district)) {
    //       districts = districts + row.district + ",";
    //     }
    //   });
    //   console.log("states, districts", states, districts);
    //   body = {
    //     name: value.name,
    //     mobile: value.mobile,
    //     accesscode: value.accesscode,
    //     email: value.email,
    //     states: states.replace(/,\s*$/, ""),
    //     districts: districts.replace(/,\s*$/, ""),
    //     id: value._id,
    //   };

    //   supervisorsList.push(body);
    // });
    // console.log("supervisorsList", supervisorsList);

    res.status(200).json({
      success: true,
      msg: `Supervisor List`,
      data: supervisors,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     District Supervisors List
//@route    GET /api/getdistrictsupervisors/
//@access   Private
//@usedBy   Audio Recording App
exports.getDistrictSupervisors = asyncHandler(async (req, res, next) => {
  try {
    // console.log("req.query", req.query.state, req.query.district);
    const supervisors = await User.find(
      {
        role: "Supervisor",
        isactive: true,
        state: req.query.state,
        district: req.query.district,
      },
      {
        name: 1,
      },
    );
    console.log("supervisors", supervisors);

    res.status(200).json({
      success: true,
      msg: `Supervisor List`,
      data: supervisors,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Supervisor-Coordinator List
//@route    GET /api/getsupervisorcoordinatorlist/
//@access   Private
//@usedBy   Audio Recording App
exports.getSupervisorCoordinatorList = asyncHandler(async (req, res, next) => {
  try {
    console.log("req.query", req.user._id);
    const coordinatorList = await User.find(
      {
        role: "Coordinator",
        isactive: true,
        phase: 2,
        supervisorID: req.user._id,
      },
      {
        name: 1,
        accesscode: 1,
        mobile: 1,
        state: 1,
        district: 1,
        _id: 0,
      },
    );
    console.log("coordinatorList", coordinatorList);

    res.status(200).json({
      success: true,
      msg: `Coordinator List`,
      data: coordinatorList,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Teamlead District List
//@route    GET /api/getteamleaddistrictlist/
//@access   Private
//@usedBy   Audio Recording App
exports.getTeamleadDistrictList = asyncHandler(async (req, res, next) => {
  try {
    const districtList = await User.findById(req.query.id, {
      teamLeadDistricts: 1,
      _id: 0,
    });
    // console.log("districtList", districtList.teamLeadDistricts);

    res.status(200).json({
      success: true,
      msg: `District List`,
      data: districtList.teamLeadDistricts,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Update Teamlead District List
//@route    PUT /api/updateteamleaddistrictlist/
//@access   Private
//@usedBy   Audio Recording App
exports.updateTeamleadDistrictList = asyncHandler(async (req, res, next) => {
  try {
    //console.log("req.body", req.body);
    //let ids = mongoose.Types.ObjectId(req.body._id);
    let ids = req.body._id;
    //console.log("ids", ids);
    const updateuser = await User.findByIdAndUpdate(ids, {
      teamLeadDistricts: req.body.teamLeadDistricts,
    });

    const updatedist = await District.findOneAndUpdate(
      { state: req.body.state, district: req.body.district },
      {
        isTeamleadAssigned: true,
      },
    );

    // console.log("updateuser", updateuser);
    // console.log("updatedist", updatedist);
    res.status(200).json({
      success: true,
      msg: `District assigned Successfully`,
      //data: userDetails,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     TeanLead List
//@route    GET /api/getteamleadlist/
//@access   Private
//@usedBy   Audio Recording App
exports.getTeamLeadList = asyncHandler(async (req, res, next) => {
  try {
    // console.log("req.query", req.query.state, req.query.district);
    const teamLeads = await User.find(
      { role: "TeamLead", isactive: true },
      {
        name: 1,
        accesscode: 1,
        mobile: 1,
        teamLeadDistricts: 1,
        email: 1,
        _id: 1,
      },
    );

    let teamleadList = [];
    teamLeads.forEach((value) => {
      let body;
      let states = "";
      let districts = "";
      value.teamLeadDistricts.map((row) => {
        if (!states.includes(row.state)) {
          states = states + row.state + ",";
        }
        if (!districts.includes(row.district)) {
          districts = districts + row.district + ",";
        }
      });
      //console.log("states, districts", states, districts);
      body = {
        name: value.name,
        mobile: value.mobile,
        accesscode: value.accesscode,
        email: value.email,
        states: states.replace(/,\s*$/, ""),
        districts: districts.replace(/,\s*$/, ""),
        id: value._id,
      };

      teamleadList.push(body);
    });
    //console.log("teamleadList", teamleadList);

    res.status(200).json({
      success: true,
      msg: `Teamlead List`,
      data: teamleadList,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     TeamLead List for selected state and district
//@route    GET /api/getteamleads/
//@access   Private
//@usedBy   Audio Recording App
exports.getDistrictTeamLeads = asyncHandler(async (req, res, next) => {
  try {
    // console.log("req.query", req.query.state, req.query.district);
    const query = {
      role: "TeamLead",
      isactive: true,
      teamLeadDistricts: {
        $elemMatch: { state: req.query.state, district: req.query.district },
      },
    };

    const teamLeads = await User.find(query, {
      name: 1,
      _id: 1,
    });

    console.log("teamLeads", teamLeads);

    res.status(200).json({
      success: true,
      msg: `Teamlead List`,
      data: teamLeads,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Add new User Admin/Coordinator/Supervisor/QualityChecker
//@route    POST /api/addnewuser/
//@access   Private
//@usedBy   Audio Recording App
exports.addNewUser = asyncHandler(async (req, res, next) => {
  try {
    //console.log("req.body.name", req.body.name);
    const isusernameexist = await User.find({
      name: req.body.name,
      role: {
        $in: [
          "Admin",
          "Coordinator",
          "Supervisor",
          "QualityChecker",
          "Manager",
          "TeamLead",
          "Customer",
          "Intra1",
          "Intra2",
          "Inter1",
          "Inter2",
        ],
      },
    });

    const ismobexists = await User.find({
      mobile: req.body.mobile,
      role: {
        $in: [
          "Admin",
          "Coordinator",
          "Vendor",
          "Supervisor",
          "QualityChecker",
          "Manager",
          "TeamLead",
          "Customer",
          "Intra1",
          "Intra2",
          "Inter1",
          "Inter2",
        ],
      },
    });

    //console.log("isusernameexist..", isusernameexist);
    if (ismobexists.length > 0) {
      return next(new ErrorResponse(`Mobile Number already exists!`, [], 409));
    } else if (isusernameexist.length > 0) {
      return next(
        new ErrorResponse(
          `Name already exist, please use a different name!`,
          [],
          409,
        ),
      );
    } else {
      const dist = await District.find(
        { state: req.body.state, district: req.body.district },
        {
          phase: 1,
        },
      );

      const uid = uuidv4();
      const accesscd = uid.split("-")[4].slice(-6);
      console.log("accesscd, uid", accesscd, uid);
      //console.log("body..",req.body);
      //console.log("user..", req.user);
      let user = [];
      if (req.body.role == "Admin") {
        const newuser = {
          name: req.body.name,
          accesscode: "44688",
          mobile: req.body.mobile,
          role: req.body.role,
          state: req.body.state,
          district: req.body.district,
          createdBy: req.user.name,
        };

        // console.log("new user..", newuser);
        user = await User.create(newuser);
        //console.log("user..", user);
      } else if (req.body.role == "Coordinator") {
        let supervisorid = mongoose.Types.ObjectId(req.body.supervisorID);
        let supervisordtls = await User.findById(supervisorid, {
          name: 1,
        });
        console.log("supervisordtls", supervisordtls);
        if (supervisordtls.length == 0) {
          return next(
            new ErrorResponse(
              `Selected Supervisor doesn't exist! Please add supervisor.`,
              [],
              409,
            ),
          );
        }
        const newuser = {
          name: req.body.name,
          accesscode: accesscd,
          mobile: req.body.mobile,
          role: req.body.role,
          state: req.body.state,
          district: req.body.district,
          createdBy: req.user.name,
          supervisorName: supervisordtls.name,
          supervisorID: supervisorid,
          recordedHours: "00:00:00",
          phase: dist[0].phase,
        };

        // console.log("new user..", newuser);
        user = await User.create(newuser);
        //console.log("user..", user);
      } else if (req.body.role == "Supervisor") {
        const newuser = {
          name: req.body.name,
          accesscode: accesscd,
          mobile: req.body.mobile,
          state: req.body.state,
          district: req.body.district,
          role: "Supervisor",
          teamleadID: req.body.teamleadID,
          teamleadName: req.body.teamleadName,
          createdBy: req.user.name,
          email: req.body.email,
          phase: dist[0].phase,
        };

        // console.log("new user..", newuser);
        user = await User.create(newuser);

        // const updatedist = await District.findOneAndUpdate(
        //   {
        //     state: req.body.state,
        //     district: req.body.district,
        //   },
        //   {
        //     isSupervisorAssigned: true,
        //   }
        // );

        //console.log("user..", user);
      } else if (req.body.role == "QualityChecker") {
        const newuser = {
          name: req.body.name,
          accesscode: accesscd,
          mobile: req.body.mobile,
          state: req.body.state,
          district: req.body.district,
          role: "QualityChecker",
          createdBy: req.user.name,
          email: req.body.email,
          phase: dist[0].phase,
        };

        // console.log("new user..", newuser);
        user = await User.create(newuser);
        //console.log("user..", user);
      } else if (req.body.role == "TeamLead") {
        const newuser = {
          name: req.body.name,
          accesscode: accesscd,
          mobile: req.body.mobile,
          role: req.body.role,
          teamLeadDistricts: req.body.teamLeadDistricts,
          createdBy: req.user.name,
          email: req.body.email,
          phase: dist[0].phase,
        };

        // console.log("new user..", newuser);
        user = await User.create(newuser);
        if (req.body.teamLeadDistricts.length > 0) {
          console.log(
            "state, district",
            req.body.teamLeadDistricts[0].state,
            req.body.teamLeadDistricts[0].district,
          );
          const updatedist = await District.findOneAndUpdate(
            {
              state: req.body.teamLeadDistricts[0].state,
              district: req.body.teamLeadDistricts[0].district,
            },
            {
              isTeamleadAssigned: true,
            },
          );
        }

        //console.log("user..", user);
      } else if (req.body.role == "Manager") {
        const newuser = {
          name: req.body.name,
          accesscode: accesscd,
          mobile: req.body.mobile,
          role: req.body.role,
          managerStates: req.body.managerStates,
          createdBy: req.user.name,
          email: req.body.email,
          phase: dist[0].phase,
        };

        // console.log("new user..", newuser);
        user = await User.create(newuser);
        //console.log("user..", user);
      } else if (req.body.role == "Customer") {
        const newuser = {
          name: req.body.name,
          accesscode: "12345678",
          mobile: req.body.mobile,
          role: req.body.role,
          state: req.body.state,
          district: req.body.district,
          createdBy: req.user.name,
          phase: dist[0].phase,
        };

        // console.log("new user..", newuser);
        user = await User.create(newuser);
        //console.log("user..", user);
      } else if (req.body.role == "Intra1") {
        const newuser = {
          name: req.body.name,
          accesscode: accesscd,
          mobile: req.body.mobile,
          state: req.body.state,
          district: req.body.district,
          role: "Intra1",
          createdBy: req.user.name,
          phase: dist[0].phase,
          //email: req.body.email,
        };

        console.log("new user..", newuser);
        user = await User.create(newuser);
      } else if (req.body.role == "Intra2") {
        const newuser = {
          name: req.body.name,
          accesscode: accesscd,
          mobile: req.body.mobile,
          state: req.body.state,
          district: req.body.district,
          role: "Intra2",
          createdBy: req.user.name,
          phase: dist[0].phase,
          //email: req.body.email,
        };

        console.log("new user..", newuser);
        user = await User.create(newuser);
      } else if (req.body.role == "Inter1") {
        const newuser = {
          name: req.body.name,
          accesscode: accesscd,
          mobile: req.body.mobile,
          state: req.body.state,
          InterDistricts: req.body.InterDistricts,
          role: "Inter1",
          createdBy: req.user.name,
          phase: dist[0].phase,
          //email: req.body.email,
        };

        console.log("new user..", newuser);
        user = await User.create(newuser);

        if (req.body.InterDistricts.length > 0) {
          // console.log(
          //   "state, district",
          //   req.body.state,
          //   req.body.InterDistricts
          // );
          req.body.InterDistricts.map(async (dist) => {
            console.log("dist", dist);
            const updatedist = await District.findOneAndUpdate(
              {
                state: req.body.state,
                district: dist.district,
              },
              {
                isInter1Assigned: true,
              },
            );
          });
        }
      } else if (req.body.role == "Inter2") {
        const newuser = {
          name: req.body.name,
          accesscode: accesscd,
          mobile: req.body.mobile,
          state: req.body.state,
          InterDistricts: req.body.InterDistricts,
          role: "Inter2",
          createdBy: req.user.name,
          phase: dist[0].phase,
          //email: req.body.email,
        };

        //console.log("new user..", newuser);
        user = await User.create(newuser);

        if (req.body.InterDistricts.length > 0) {
          console.log(
            "state, district",
            req.body.state,
            req.body.InterDistricts,
          );
          req.body.InterDistricts.map(async (dist) => {
            const updatedist = await District.findOneAndUpdate(
              {
                state: req.body.state,
                district: dist.district,
              },
              {
                isInter2Assigned: true,
              },
            );
          });
        }
      } else {
        res.status(200).json({
          success: false,
          //data: user,
          msg: "Invalid Role!",
        });
      }

      if (req.body.role != "Admin") {
        var params = {
          apikey: process.env.SPRINGEDGE_APIKEY, // API Key
          sender: "MEGDAP", // Sender Name
          to: [req.body.mobile], //Moblie Number
          message: `Dear Customer, Your account at Megdap has been successfully created! your Access Code for Login is ${accesscd}. Regards, Megdap Innovation Labs Pvt Ltd`,
          format: "json",
        };

        springedge.messages.send(params, 5000, function (err, response) {
          if (err) {
            return console.log(err);
          }
          console.log(response);
        });
      }

      res.status(200).json({
        success: true,
        data: user,
        msg: "User created successfully!",
      });
    }
  } catch (err) {
    console.log("err..", err);
    return next(new ErrorResponse(`User creation failed!`, [], 500));
  }
});

//@desc     All User Admin/Coordinator/Supervisor/QualityChecker/Manager/Teamlead
//@route    GET /api/getallusers/
//@access   Private
//@usedBy   Audio Recording App
exports.getAllUsers = asyncHandler(async (req, res, next) => {
  try {
    //console.log("Inside getallusers");
    const users = await User.find({
      isactive: true,
      phase: 2,
      role: {
        $in: [
          "Admin",
          "Coordinator",
          "Supervisor",
          "QualityChecker",
          "Manager",
          "TeamLead",
          "Customer",
          "Intra1",
          "Intra2",
          "Inter1",
          "Inter2",
        ],
      },
    });
    //console.log("users", users);
    res.status(200).json({
      success: true,
      data: users,
      msg: "All Users!",
    });

    //console.log("isusernameexist..", isusernameexist);
  } catch (err) {
    console.log("err..", err);
    return next(new ErrorResponse(`User creation failed!`, [], 500));
  }
});

//@desc     Update Rate for Districts
//@route    PUT /api/updatedistrictrate/
//@access   Private
//@usedBy   Audio Recording App
exports.updateDistrictRate = asyncHandler(async (req, res, next) => {
  try {
    console.log("req.body", req.body);
    const updaterate = await District.updateOne(
      { state: req.body.state, district: req.body.district },
      {
        rate: req.body.rate,
        rateUpdatedOn: Date.now(),
      },
    );

    console.log("updaterate", updaterate);
    res.status(200).json({
      success: true,
      msg: `Rate Updated Successfully`,
      //data: userDetails,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     RoleBase Details
//@route    GET /api/getrolebasedetails/
//@access   Private
//@usedBy   Audio Recording App
exports.getRoleBaseDetails = asyncHandler(async (req, res, next) => {
  try {
    //console.log("Inside getallusers", req.query);
    let supervisor = await User.find(
      {
        role: "Coordinator",
        state: req.query.state,
        district: req.query.district,
        name: req.query.coordinator,
      },
      {
        supervisorName: 1,
      },
    );
    //console.log("supervisor", supervisor);

    let teamlead = await User.find(
      {
        role: "Supervisor",
        name: supervisor[0].supervisorName,
      },
      {
        teamleadName: 1,
      },
    );
    //console.log("teamlead", teamlead);

    let manager = await User.find(
      {
        role: "Manager",
        "managerStates.state": req.query.state,
      },
      {
        name: 1,
      },
    );
    //console.log("manager", manager);
    // const users = await User.find({
    //   isactive: true,
    //   role: {
    //     $in: [
    //       "Admin",
    //       "Coordinator",
    //       "Supervisor",
    //       "QualityChecker",
    //       "Manager",
    //       "TeamLead",
    //     ],
    //   },
    // });
    //console.log("users", users);
    res.status(200).json({
      success: true,
      data: { supervisor, teamlead, manager },
      msg: "All Users!",
    });

    //console.log("isusernameexist..", isusernameexist);
  } catch (err) {
    console.log("err..", err);
    return next(new ErrorResponse(`User creation failed!`, [], 500));
  }
});

//@desc     RoleBase Details
//@route    GET /api/getcoordinatordetails/
//@access   Private
//@usedBy   Audio Recording App
exports.getCoordinatorDetails = asyncHandler(async (req, res, next) => {
  try {
    // console.log("req.query", req.query.state, req.query.district);
    const coordinatorList = await User.find(
      {
        role: "Coordinator",
        isactive: true,
        state: req.query.state,
        district: req.query.district,
      },
      {
        name: 1,
        accesscode: 1,
        mobile: 1,
        state: 1,
        district: 1,
        recordedHours: 1,
        _id: 0,
      },
    );
    //console.log("coordinatorList", coordinatorList);

    res.status(200).json({
      success: true,
      msg: `Coordinator List`,
      data: coordinatorList,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Teamlead-supervisor List for table
//@route    GET /api/getteamleadsupervisorlist/
//@access   Private
//@usedBy   Audio Recording App
exports.getTeamleadSupervisorList = asyncHandler(async (req, res, next) => {
  try {
    //console.log("req.user", req.user);
    // const districtList = await User.findById(req.user._id, {
    //   teamLeadDistricts: 1,
    //   _id: 0,
    // });

    // let supervisorList = [];
    // districtList.teamLeadDistricts.map(async (row, index) => {
    //   console.log("inside outer map");
    //   let supervisor = await User.find(
    //     { role: "Supervisor", state: row.state, district: row.district },
    //     {
    //       name: 1,
    //       mobile: 1,
    //       accesscode: 1,
    //       email: 1,
    //       state: 1,
    //       district: 1,
    //     }
    //   );
    //   console.log("supervisor", supervisor);
    //   if (supervisor.length > 0) {
    //     let userObj = {
    //       name: supervisor[0].name,
    //       mobile: supervisor[0].mobile,
    //       accesscode: supervisor[0].accesscode,
    //       email: supervisor[0].email,
    //       state: supervisor[0].state,
    //       district: supervisor[0].district,
    //     };

    //     supervisorList = [...supervisorList, userObj];
    //   }
    //   // console.log(
    //   //   "index, districtList.teamLeadDistricts.length",
    //   //   index,
    //   //   districtList.teamLeadDistricts.length
    //   // );
    //   if (index == districtList.teamLeadDistricts.length - 1) {
    //     getsupervisorlist(supervisorList);
    //   }
    // });

    // function getsupervisorlist(supervisorList) {
    //   console.log("supervisorList", supervisorList);
    //   res.status(200).json({
    //     success: true,
    //     msg: `District List`,
    //     data: supervisorList,
    //   });
    // }

    //console.log("req.user._id", req.user._id);
    const superVisorList = await User.find({
      role: "Supervisor",
      // createdOn: { $gt: new ISODate("2023-05-01T00:00:00.797+00:00") },
      teamleadID: req.user._id,
    });

    //console.log("superVisorList", superVisorList.length);
    res.status(200).json({
      success: true,
      msg: `superVisor List`,
      data: superVisorList,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Teamlead-supervisor-coordianator List for table
//@route    GET /api/gettlsupervisorcoordinatorlist/
//@access   Private
//@usedBy   Audio Recording App
// exports.getTLSupervisorCoordinatorList = asyncHandler(
//   async (req, res, next) => {
//     try {
//       const superVisorList = await User.find({
//         role: "Supervisor",
//         teamleadID: req.user._id,
//       });

//       const allCoordinatorsPromises = superVisorList.map(async (sup) => {
//         const coordinators = await User.find(
//           { supervisorName: sup.name },
//           {
//             name: 1,
//             mobile: 1,
//             speechDuration: 1,
//             accesscode: 1,
//             state: 1,
//             district: 1,
//           }
//         );

//         let CoordinatorSummary = await FileDetail.aggregate([
//           {
//             $match: {
//               coordinatorName: coordinators.name,
//             },
//           },
//           {
//             $project: {
//               speechDuration: 1,
//               isQcAccepted: 1,
//               status: 1,
//               coordinatorName: 1,
//             },
//           },
//           {
//             $group: {
//               _id: {
//                 coordinatorName: "$coordinatorName",
//               },
//               totalAcceptedSpeechHrs: {
//                 $sum: {
//                   $cond: [
//                     {
//                       $and: [
//                         { $eq: ["$isQcAccepted", true] },
//                         { $eq: ["$Status", "Accepted"] },
//                       ],
//                     },
//                     "$speechDuration",
//                     0,
//                   ],
//                 },
//               },
//             },
//           },
//           {
//             $project: {
//               coordinatorName: "$id_coordinatorName",
//               name: 1,
//               mobile: 1,
//               speechDuration: 1,
//               //accesscode: 1,
//               state: 1,
//               district: 1,
//               totalAcceptedSpeechHrs: 1,
//             },
//           },
//         ]);

//         return CoordinatorSummary;
//       });

//       console.log("CoordinatorSummary", CoordinatorSummary);

//       const allCoordinatorsNested = await Promise.all(allCoordinatorsPromises);
//       const finalCoordList = allCoordinatorsNested.flat();

//       res.status(200).json({
//         success: true,
//         msg: "finalCoordList List",
//         data: finalCoordList,
//       });
//     } catch (err) {
//       return next(new ErrorResponse("Internal server error", [err], 500));
//     }

//     //try {
//     //   await User.find({
//     //     role: "Supervisor",
//     //     // createdOn: { $gt: new ISODate("2023-05-01T00:00:00.797+00:00") },
//     //     teamleadID: req.user._id,
//     //     //teamleadID: "635b4fd63772d2000ebdf389",
//     //   }).then((superVisorList) => {
//     //     let finalCoordList = [];
//     //     superVisorList.map(async (sup, index) => {
//     //       await User.find(
//     //         { supervisorName: sup.name },
//     //         {
//     //           name: 1,
//     //           mobile: 1,
//     //           //recordedHours: 1,
//     //           speechDuration: 1,
//     //           accesscode: 1,
//     //           state: 1,
//     //           district: 1,
//     //         }
//     //       ).then(async (CoordiantorList) => {
//     //         CoordiantorList.map(async (row) => {
//     //           finalCoordList.push(row);
//     //           //console.log("finalCoordList inside", finalCoordList.length);
//     //         });

//     //         if (superVisorList.length - 1 == index) {
//     //           setTimeout(() => {
//     //             //console.log("finalCoordList outside", finalCoordList.length);
//     //             res.status(200).json({
//     //               success: true,
//     //               msg: `finalCoordList List`,
//     //               data: finalCoordList,
//     //             });
//     //           }, 5000);
//     //         }
//     //       });
//     //     });
//     //   });
//     // } catch (err) {
//     //   return next(new ErrorResponse("Internal server error", [err], 500));
//     // }
//   }
// );
exports.getTLSupervisorCoordinatorList = asyncHandler(
  async (req, res, next) => {
    try {
      const toHHMMSS = (totalSeconds) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);

        return [
          hours.toString().padStart(2, "0"),
          minutes.toString().padStart(2, "0"),
          seconds.toString().padStart(2, "0"),
        ].join(":");
      };

      const superVisorList = await User.find({
        role: "Supervisor",
        teamleadID: req.user._id,
      });

      const allCoordinatorsPromises = superVisorList.map(async (sup) => {
        const coordinators = await User.find(
          { supervisorName: sup.name },
          {
            name: 1,
            mobile: 1,
            speechDuration: 1,
            accesscode: 1,
            state: 1,
            district: 1,
          },
        );

        const coordinatorSummaries = await Promise.all(
          coordinators.map(async (coordinator) => {
            const summary = await FileDetail.aggregate([
              {
                $match: {
                  coordinatorName: coordinator.name,
                },
              },
              {
                $group: {
                  _id: "$coordinatorName",
                  totalspeechDuration: {
                    $sum: "$speechDurationSec",
                  },
                  totalAcceptedSpeechHrs: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $eq: ["$isQcAccepted", true] },
                            { $eq: ["$status", "Accepted"] },
                          ],
                        },
                        "$speechDurationSec",
                        0,
                      ],
                    },
                  },
                  totalRejectedSpeechHrs: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $eq: ["$isQcAccepted", false] },
                            {
                              $in: [
                                "$status",
                                [
                                  "QcRejected",
                                  "CoordinatorRejected",
                                  "SupervisorRejected",
                                  "AdminRejected",
                                ],
                              ],
                            },
                          ],
                        },
                        "$speechDurationSec",
                        0,
                      ],
                    },
                  },
                },
              },
            ]);

            const acceptedData = summary[0] || {
              totalspeechDuration: 0,
              totalAcceptedSpeechHrs: 0,
              totalRejectedSpeechHrs: 0,
            };
            //console.log("acceptedData", acceptedData);
            return {
              name: coordinator.name,
              mobile: coordinator.mobile,
              speechDuration: coordinator.speechDuration,
              accesscode: coordinator.accesscode,
              state: coordinator.state,
              district: coordinator.district,
              totalspeechDuration: toHHMMSS(acceptedData.totalspeechDuration),
              totalAcceptedSpeechHrs: toHHMMSS(
                acceptedData.totalAcceptedSpeechHrs,
              ),
              totalRejectedSpeechHrs: toHHMMSS(
                acceptedData.totalRejectedSpeechHrs,
              ),
            };
          }),
        );

        return coordinatorSummaries;
      });

      const allCoordinatorsNested = await Promise.all(allCoordinatorsPromises);
      const finalCoordList = allCoordinatorsNested.flat();

      res.status(200).json({
        success: true,
        msg: "finalCoordList List",
        data: finalCoordList,
      });
    } catch (err) {
      return next(
        new ErrorResponse("Internal server error", [err.message || err], 500),
      );
    }
  },
);

//@desc     Teamlead-Speech HRS Details
//@route    GET /api/gettlspeechhrsdetails/
//@access   Private
//@usedBy   Audio Recording App
exports.getTLSpeechHrsDetails = asyncHandler(async (req, res, next) => {
  try {
    const toHHMMSS = (totalSeconds) => {
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = Math.floor(totalSeconds % 60);

      return [
        hours.toString().padStart(2, "0"),
        minutes.toString().padStart(2, "0"),
        seconds.toString().padStart(2, "0"),
      ].join(":");
    };

    const summary = await FileDetail.aggregate([
      // Step 1: Match and Filter Early
      {
        $match: {
          teamleadName: req.user.name,
        },
      },
      // Step 2: Project Only Required Fields
      {
        $project: {
          state: 1,
          district: 1,
          fileDurationSecs: 1,
          speechDurationSec: 1,
          isQcAccepted: 1,
          qcAcceptedOn: 1,
          status: 1,
        },
      },
      // Step 3: Group the data
      {
        $group: {
          _id: {
            state: "$state",
            district: "$district",
          },
          // totalAudioRecorded: { $sum: "$fileDurationSecs" },
          totalSpeechDuration: { $sum: "$speechDurationSec" },
          totalAcceptedSpeechHrs: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$isQcAccepted", true] },
                    { $eq: ["$status", "Accepted"] },
                  ],
                },
                "$speechDurationSec",
                0,
              ],
            },
          },
          totalRejectedSpeechHrs: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$isQcAccepted", false] },
                    {
                      $in: [
                        "$status",
                        [
                          "QcRejected",
                          "CoordinatorRejected",
                          "SupervisorRejected",
                          "AdminRejected",
                        ],
                      ],
                    },
                  ],
                },
                "$speechDurationSec",
                0,
              ],
            },
          },
        },
      },
      // Step 4: Restructure Output
      {
        $project: {
          state: "$_id.state",
          district: "$_id.district",
          // totalAudioRecorded: 1,
          totalSpeechDuration: 1,
          totalAcceptedSpeechHrs: 1,
          totalRejectedSpeechHrs: 1,
          _id: 0,
        },
      },
      // 5. Compute additional derived fields
      {
        $addFields: {
          qcCompletedHrs: {
            $add: ["$totalAcceptedSpeechHrs", "$totalRejectedSpeechHrs"],
          },
          qcPendingSpeechHrs: {
            $subtract: [
              "$totalSpeechDuration",
              {
                $add: ["$totalAcceptedSpeechHrs", "$totalRejectedSpeechHrs"],
              },
            ],
          },
        },
      },
    ]);

    // Restrcture Output
    const responseData = summary.map(
      ({
        state,
        district,
        // totalAudioRecorded,
        totalSpeechDuration,
        totalAcceptedSpeechHrs,
        totalRejectedSpeechHrs,
        qcCompletedHrs,
        qcPendingSpeechHrs,
      }) => ({
        state,
        district,
        // totalAudioRecordedHMS: toHHMMSS(totalAudioRecorded),
        totalSpeechDurationHMS: toHHMMSS(totalSpeechDuration),
        totalAcceptedSpeechHrsHMS: toHHMMSS(totalAcceptedSpeechHrs),
        totalRejectedSpeechHrsHMS: toHHMMSS(totalRejectedSpeechHrs),
        qcCompletedHrsHMS: toHHMMSS(qcCompletedHrs),
        qcPendingSpeechHrsHMS: toHHMMSS(qcPendingSpeechHrs),
      }),
    );

    res.status(200).json({
      success: true,
      msg: `Teamlead speech hrs summary`,
      data: responseData,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Disable User
//@route    PUT /api/disableuser/
//@access   Private
//@usedBy   Audio Recording App
exports.disableUser = asyncHandler(async (req, res, next) => {
  try {
    //console.log("req.body", req.body);
    let ids = req.body._id;
    const updateuser = await User.findByIdAndUpdate(ids, { isactive: false });

    //console.log("updateuser", updateuser);

    res.status(200).json({
      success: true,
      msg: `User Deactivated Successfully`,
      //data: userDetails,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     LatLongMap list for Pincodes
//@route    GET /api/getlatlongmap/
//@access   Private
//@usedBy   Audio Recording App
exports.getPincodeLatLongMaps = asyncHandler(async (req, res, next) => {
  try {
    //console.log("req.query", req.query.district);
    const pincodeList = await Pincode.find(
      { district: req.query.district },
      {
        pincode: 1,
        _id: 0,
      },
    );

    //console.log("pincodeList", pincodeList);
    if (pincodeList) {
      let latLongArray = [];
      pincodeList.map(async (pin, index) => {
        const LatLongList = await PincodesLatLongMap.find(
          {
            pincode: pin.pincode,
          },
          {
            latitude: 1,
            longitude: 1,
          },
        );
        //console.log("LatLongList", pin, LatLongList.length);

        if (LatLongList.length > 0) {
          LatLongList.map((latlong) => {
            let obj = {
              latitude: latlong.latitude,
              longitude: latlong.longitude,
            };
            latLongArray.push(obj);
          });
          //console.log("latLongArray outside", latLongArray);
        }
        if (index == pincodeList.length - 1) {
          setTimeout(() => {
            // console.log("File created successfully");
            //console.log("latLongArray outside", latLongArray.length);
            res.status(200).json({
              success: true,
              msg: `LatLong List`,
              data: latLongArray,
            });
          }, 4000);
        }
      });
    }
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Country Districts
//@route    GET  /api/getcountrydistricts/
//@access   Public
//@usedBy   Audio Recording App
exports.getCountryDistricts = asyncHandler(async (req, res, next) => {
  try {
    const districts = await countryDistrict.find().sort({ district: 1 });
    res.status(200).json({
      success: true,
      data: districts,
      msg: "Country Districts",
    });
  } catch (error) {
    console.log(error.message);
    return next(new ErrorResponse(`Unable to get Education List!`, [], 500));
  }
});

//@desc     Socio Economics Education
//@route    GET  /api/getsocioeconomiceducation/
//@access   Public
//@usedBy   Audio Recording App
// exports.getSocioEconomicEducation = asyncHandler(async (req, res, next) => {
//   try {
//     const education = await socioEconimicSurvey
//       .find({ surveytype: "education" })
//       .select("surveyfield surveyscore surveyvalue")
//       .sort({ surveyscore: -1 });

//     res.status(200).json({
//       success: true,
//       data: education,
//       msg: "Education List",
//     });
//   } catch (error) {
//     console.log(error.message);
//     return next(new ErrorResponse(`Unable to get Education List!`, [], 500));
//   }
// });

//@desc     SocioEconomics Occupation
//@route    GET  /api/getsocioeconomicoccupation/
//@access   Public
//@usedBy   Audio Recording App
// exports.getSocioEconomicOccupation = asyncHandler(async (req, res, next) => {
//   try {
//     const Occupation = await socioEconimicSurvey
//       .find({ surveytype: "occupation" })
//       .select("surveyfield surveyscore surveyvalue")
//       .sort({ surveyscore: -1 });

//     res.status(200).json({
//       success: true,
//       data: Occupation,
//       msg: "Occupation List",
//     });
//   } catch (error) {
//     console.log(error.message);
//     return next(new ErrorResponse(`Unable to get Occupation List!`, [], 500));
//   }
// });

//@desc     SocioEconomics MonthlyIncome
//@route    GET  /api/getsocioeconomicmonthlyincome/
//@access   Public
//@usedBy   Audio Recording App
// exports.getSocioEconomicMonthlyIncome = asyncHandler(async (req, res, next) => {
//   try {
//     const monthlyincome = await socioEconimicSurvey
//       .find({ surveytype: "monthlyIncome" })
//       .select("surveyfield surveyscore surveyvalue")
//       .sort({ surveyscore: -1 });

//     res.status(200).json({
//       success: true,
//       data: monthlyincome,
//       msg: "monthlyincome List",
//     });
//   } catch (error) {
//     console.log(error.message);
//     return next(
//       new ErrorResponse(`Unable to get monthlyincome List!`, [], 500)
//     );
//   }
// });

//@desc     Update Socio economic survey/status, score and stayingyears
//@route    PUT /api/updateuserinfo/
//@access   Private
//@usedBy   Audio Recording App
exports.updateUserInfo = asyncHandler(async (req, res, next) => {
  try {
    //console.log("req.body", req.body);

    let age = req.user.age;
    let totalOfStayingYears = req.body.staying_years.reduce(
      (total, currentvalue) => (total = total + Number(currentvalue.years)),
      0,
    );
    let socioeconomicStatus = req.body.socioeconomicstatus;
    //console.log("totalOfStayingYears", totalOfStayingYears);
    if (totalOfStayingYears != age) {
      return next(
        new ErrorResponse(
          `Staying years should should be equal to ${age}.`,
          400,
        ),
      );
    } else {
      let stayingyearsstring = req.body.staying_years
        .map((data) => data.district + "(" + data.years + ")")
        .join(",");

      // let educationscore = req.body.education.split("_")[1];
      // let occupationscore = req.body.occupation.split("_")[1];
      // let monthlyincomescore = req.body.monthly_income.split("_")[1];

      // let CalculateTotal =
      //   Number(educationscore) +
      //   Number(occupationscore) +
      //   Number(monthlyincomescore);

      //console.log("CalculateTotal", CalculateTotal);

      // let socioeconomicstatus = "";
      // if (CalculateTotal >= 26 && CalculateTotal <= 29) {
      //   socioeconomicstatus = "Upper";
      // } else if (CalculateTotal >= 16 && CalculateTotal <= 25) {
      //   socioeconomicstatus = "Upper middle";
      // } else if (CalculateTotal >= 11 && CalculateTotal <= 15) {
      //   socioeconomicstatus = "Lower middle";
      // } else if (CalculateTotal >= 5 && CalculateTotal <= 10) {
      //   socioeconomicstatus = "Upper lower";
      // } else if (CalculateTotal >= 1 && CalculateTotal <= 4) {
      //   socioeconomicstatus = "Lower";
      // }

      //console.log("socioeconomicstatus", socioeconomicstatus);

      await User.updateOne(
        { mobile: req.user.mobile, speakerID: req.user.speakerID },
        {
          // education: req.body.education,
          // occupation: req.body.occupation,
          // monthlyincome: req.body.monthly_income,
          // totalsurveyscore: CalculateTotal,
          stayingyears: stayingyearsstring,
          socioeconomicstatus: socioeconomicStatus,
          additionalInfoCheck: true,
        },
      );

      //console.log("updaterate", updaterate);
      res.status(200).json({
        success: true,
        msg: `User Info Updated Successfully`,
        //data: userDetails,
      });
    }
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Get Self
//@route    GET /api/getself/
//@access   Private
//@usedBy   Audio Recording App
exports.getSelf = asyncHandler(async (req, res, next) => {
  try {
    //console.log("req.user", req.user);
    const userInfo = req.user;
    console.log(userInfo.name, "GetSelf");
    if (!userInfo) {
      return next(new ErrorResponse("User not found", [], 404));
    }

    const userObj = {
      id: userInfo._id,
      role: userInfo.role,
      mobile: userInfo.mobile,
      name: userInfo.name,
      accesscode: userInfo.accesscode,
      imagePathList: userInfo.imagePathList,
      district: userInfo.district,
      coordinator: userInfo.coordinator,
      state: userInfo.state,
      supervisorName: userInfo.supervisorName,
      managerStates: userInfo.managerStates,
      teamleadDistricts: userInfo.teamLeadDistricts,
      teamleadName: userInfo.teamleadName,
      InterDistricts: userInfo.InterDistricts,
      recordingCompleted: userInfo.recordingCompleted,
      sampleAudioPath: userInfo.sampleAudioPath,
      latitude: userInfo.latitude,
      longitude: userInfo.longitude,
      additionalInfoCheck: userInfo.additionalInfoCheck
        ? userInfo.additionalInfoCheck
        : userInfo.recordedHours > "00:00:00"
          ? true
          : false,
      recordedHours: userInfo.recordedHours,
      pendingHours: userInfo.pendingHours,
      speakerID: userInfo.speakerID,
    };

    res.status(200).json({
      success: true,
      msg: `User Info`,
      user: userObj,
    });
  } catch (err) {
    console.log("Error getting user info", err);
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Searchspeaker
//@route    GET /api/searchspeaker/
//@access   Private
//@usedBy   Audio Recording App
exports.searchSpeaker = asyncHandler(async (req, res, next) => {
  try {
    const { speakerID } = req.query;

    if (!speakerID) {
      // Return all active vendors (speakers) excluding the requesting user
      const speakers = await User.find({
        isactive: true,
        role: "Vendor",
        _id: { $ne: req.user._id }
      });
      return res.status(200).json({
        success: true,
        msg: "Speakers list fetched",
        data: speakers,
      });
    }

    if (speakerID === req.user.speakerID) {
      return res.status(400).json({
        success: false,
        msg: `${speakerID} equals the requesting user's own SpeakerID (cannot pair with self)`,
        data: null,
      });
    }

    const speaker = await User.findOne({
      isactive: true,
      role: "Vendor",
      speakerID: speakerID,
    });

    if (!speaker) {
      return res.status(404).json({
        success: false,
        msg: "Speaker not found",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      msg: "Speaker found",
      data: speaker,
    });
  } catch (err) {
    console.error("searchSpeaker error:", err);
    return next(new ErrorResponse("Speaker search failed", [], 500));
  }
});

//@desc     Searchspeaker
//@route    POST /api/createpair/
//@access   Private
//@usedBy   Audio Recording App
// exports.createPair = asyncHandler(async (req, res, next) => {
//   try {
//     const { partnerSpeakerID } = req.body;

//     if (!partnerSpeakerID) {
//       return res.status(400).json({
//         success: false,
//         msg: "partnerSpeakerID is required",
//         data: null,
//       });
//     }

//     if (partnerSpeakerID === req.user.speakerID) {
//       return res.status(400).json({
//         success: false,
//         msg: `${partnerSpeakerID} equals the requesting user's own SpeakerID (cannot pair with self)`,
//         data: null,
//       });
//     }

//     const partnerSpeaker = await User.findOne({
//       isactive: true,
//       //phase: 3,
//       role: "Vendor",
//       speakerID: partnerSpeakerID,
//     });

//     if (!partnerSpeaker) {
//       return res.status(404).json({
//         success: false,
//         msg: "partnerSpeakerId does not exist",
//         data: null,
//       });
//     }

//     const pairing = await SpeakerPair.findOne({
//       $or: [
//         {
//           "requester.speakerID": req.user.speakerID,
//           "partner.speakerID": partnerSpeaker.speakerID,
//         },
//         {
//           "requester.speakerID": partnerSpeaker.speakerID,
//           "partner.speakerID": req.user.speakerID,
//         },
//       ],
//     });

//     if (pairing) {
//       return res.status(200).json({
//         success: true,
//         exists: true,
//         //msg: "Pair created",
//         data: {
//           pairId: pairing._id,
//           partner: {
//             speakerId: pairing.partner.speakerID,
//             name: pairing.partner.name,
//             mobile: pairing.partner.mobile,
//           },
//           isActive: pairing.isActive,
//           hasSubmittedRecording: pairing.hasSubmittedRecording,
//           createdAt: pairing.createdAt,
//         },
//       });
//     }

//     const requesterCount = await SpeakerPair.find({
//       $or: [
//         {
//           "requester.speakerID": req.user.speakerID,
//         },
//         {
//           "partner.speakerID": req.user.speakerID,
//         },
//       ],
//       isActive: true,
//       hasSubmittedRecording: true,
//     }).count();

//     if (requesterCount == 4) {
//       return res.status(404).json({
//         success: false,
//         msg: "You have reached the maximum of 4 pairs",
//         data: null,
//       });
//     }

//     const partnerCount = await SpeakerPair.find({
//       $or: [
//         {
//           "requester.speakerID": partnerSpeakerID,
//         },
//         {
//           "partner.speakerID": partnerSpeakerID,
//         },
//       ],
//       isActive: true,
//       hasSubmittedRecording: true,
//     }).count();

//     if (partnerCount == 4) {
//       return res.status(404).json({
//         success: false,
//         msg: "Partner has reached the maximum of 4 pairs",
//         data: null,
//       });
//     }

//     const speakerPair = {
//       requester: {
//         speakerID: req.user.speakerID,
//         name: req.user.name,
//         mobile: req.user.mobile,
//       },
//       partner: {
//         speakerID: partnerSpeaker.speakerID,
//         name: partnerSpeaker.name,
//         mobile: partnerSpeaker.mobile,
//       },
//     };

//     const createSpeakerPair = await SpeakerPair.create(speakerPair);

//     return res.status(200).json({
//       success: true,
//       msg: "Pair created",
//       data: {
//         pairId: createSpeakerPair._id,
//         partner: {
//           speakerId: createSpeakerPair.partner.speakerID,
//           name: createSpeakerPair.partner.name,
//           mobile: createSpeakerPair.partner.mobile,
//         },
//         isActive: createSpeakerPair.isActive,
//         hasSubmittedRecording: createSpeakerPair.hasSubmittedRecording,
//         createdAt: createSpeakerPair.createdAt,
//       },
//     });
//   } catch (err) {
//     console.error("searchSpeaker error:", err);
//     return next(new ErrorResponse("Speaker search failed", [], 500));
//   }
// });

exports.createPair = asyncHandler(async (req, res, next) => {
  try {
    const { partnerSpeakerID } = req.body;

    if (!partnerSpeakerID) {
      return res.status(400).json({
        success: false,
        msg: "partnerSpeakerID is required",
        data: null,
      });
    }

    if (partnerSpeakerID === req.user.speakerID) {
      return res.status(400).json({
        success: false,
        msg: `${partnerSpeakerID} equals the requesting user's own SpeakerID (cannot pair with self)`,
        data: null,
      });
    }

    const partnerSpeaker = await User.findOne({
      isactive: true,
      // phase: 3, // intentionally not phase-gated for pairing — confirm this is correct
      role: "Vendor",
      speakerID: partnerSpeakerID,
    });

    if (!partnerSpeaker) {
      return res.status(404).json({
        success: false,
        msg: "partnerSpeakerId does not exist",
        data: null,
      });
    }

    const existingPair = await SpeakerPair.findOne({
      $or: [
        {
          "requester.speakerID": req.user.speakerID,
          "partner.speakerID": partnerSpeaker.speakerID,
        },
        {
          "requester.speakerID": partnerSpeaker.speakerID,
          "partner.speakerID": req.user.speakerID,
        },
      ],
    });

    if (existingPair) {
      // Figure out which side is "me" so we return the OTHER person, not always .partner
      const otherSide =
        existingPair.requester.speakerID === req.user.speakerID
          ? existingPair.partner
          : existingPair.requester;

      return res.status(200).json({
        success: true,
        exists: true,
        data: {
          pairId: existingPair._id,
          partner: {
            speakerId: otherSide.speakerID,
            name: otherSide.name,
            mobile: otherSide.mobile,
          },
          isActive: existingPair.isActive,
          hasSubmittedRecording: existingPair.hasSubmittedRecording,
          createdAt: existingPair.createdAt,
        },
      });
    }

    const requesterCount = await SpeakerPair.countDocuments({
      $or: [
        { "requester.speakerID": req.user.speakerID },
        { "partner.speakerID": req.user.speakerID },
      ],
      isActive: true,
      hasSubmittedRecording: true,
    });

    if (requesterCount >= 4) {
      return res.status(409).json({
        success: false,
        msg: "You have reached the maximum of 4 pairs",
        data: null,
      });
    }

    const partnerCount = await SpeakerPair.countDocuments({
      $or: [
        { "requester.speakerID": partnerSpeakerID },
        { "partner.speakerID": partnerSpeakerID },
      ],
      isActive: true,
      hasSubmittedRecording: true,
    });

    if (partnerCount >= 4) {
      return res.status(409).json({
        success: false,
        msg: "Partner has reached the maximum of 4 pairs",
        data: null,
      });
    }

    const newPair = await SpeakerPair.create({
      requester: {
        speakerID: req.user.speakerID,
        name: req.user.name,
        mobile: req.user.mobile,
      },
      partner: {
        speakerID: partnerSpeaker.speakerID,
        name: partnerSpeaker.name,
        mobile: partnerSpeaker.mobile,
      },
    });

    return res.status(200).json({
      success: true,
      msg: "Pair created",
      data: {
        pairId: newPair._id,
        partner: {
          speakerId: newPair.partner.speakerID,
          name: newPair.partner.name,
          mobile: newPair.partner.mobile,
        },
        isActive: newPair.isActive,
        hasSubmittedRecording: newPair.hasSubmittedRecording,
        createdAt: newPair.createdAt,
      },
    });
  } catch (err) {
    console.error("createPair error:", err);
    return next(new ErrorResponse("Pair creation failed", [], 500));
  }
});

//@desc     Getmypairs
//@route    GET /api/getmypairs/
//@access   Private
//@usedBy   Audio Recording App
// exports.getMyPairs = asyncHandler(async (req, res, next) => {
//   try {
//     const mySpeakerPairs = await SpeakerPair.find({
//       $or: [
//         { "requester.speakerID": req.user.speakerID },
//         { "partner.speakerID": req.user.speakerID },
//       ],
//       isActive: true,
//       //hasSubmittedRecording: true,
//     });

//     return res.status(200).json({
//       success: true,
//       msg: "OK",
//       data: mySpeakerPairs,
//     });
//   } catch (err) {
//     console.error("createPair error:", err);
//     return next(new ErrorResponse("Pair creation failed", [], 500));
//   }
// });

//@desc     Getmypairs
//@route    GET /api/getmypairs/
//@access   Private
//@usedBy   Audio Recording App
exports.getMyPairs = asyncHandler(async (req, res, next) => {
  try {
    const mySpeakerPairs = await SpeakerPair.find({
      $or: [
        { "requester.speakerID": req.user.speakerID },
        { "partner.speakerID": req.user.speakerID },
      ],
      isActive: true,
      // hasSubmittedRecording: true, // intentionally showing unsubmitted pairs too — confirm this is correct
    });

    const normalizedPairs = mySpeakerPairs.map((pair) => {
      const isRequester = pair.requester.speakerID === req.user.speakerID;
      const otherSide = isRequester ? pair.partner : pair.requester;

      return {
        pairId: pair._id,
        partner: {
          speakerId: otherSide.speakerID,
          name: otherSide.name,
          mobile: otherSide.mobile,
        },
        isActive: pair.isActive,
        hasSubmittedRecording: pair.hasSubmittedRecording,
        createdAt: pair.createdAt,
      };
    });

    return res.status(200).json({
      success: true,
      msg: "OK",
      data: normalizedPairs,
    });
  } catch (err) {
    console.error("getMyPairs error:", err);
    return next(new ErrorResponse("Failed to fetch pairs", [], 500));
  }
});
