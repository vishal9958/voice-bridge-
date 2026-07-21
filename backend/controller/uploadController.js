const mongoose = require("mongoose");
const FileDetail = require("../model/fileDetailsModel");
const District = require("../model/districtModel");
const Image = require("../model/imagesModel");
const User = require("../model/userModel");
const Pincode = require("../model/pincodeModel");
const RecordingRatio = require("../model/recordingRatioModel");
const SpeakerPair = require("../model/speakerPairModel");
const getAgeGroup = require("../utils/getAgeGroup");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const { Storage } = require("@google-cloud/storage");
const path = require("path");
const fs = require("fs");
const moment = require("moment");
const PinLatLongMap = require("../model/pincodesLatLongMapModel");
const xlsx = require("xlsx");
const axios = require("axios");
const formData = require("form-data");
const { v4: uuidv4 } = require("uuid");

let gc =
  process.env.NODE_ENV === "production"
    ? new Storage({
        keyFilename: path.join(
          __dirname,
          "../audio-recording-portal-1e39ec3444d2.json",
        ),
        projectId: process.env.PROJECT_ID,
      })
    : new Storage({
        keyFilename: path.join(
          __dirname,
          "../audio-recording-portal-1e39ec3444d2.json",
        ),
        projectId: process.env.PROJECT_ID,
      });

const bucketName =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_STORAGE_BUCKET
    : process.env.DEV_STORAGE_BUCKET;

const baseUrl = `https://storage.googleapis.com/${bucketName}`;

function convertToSeconds(timeString) {
  let timeParts = timeString.split(":");
  return +timeParts[0] * 3600 + +timeParts[1] * 60 + +timeParts[2];
}

function convertSecondsToTime(seconds) {
  let date = new Date(1970, 0, 1);
  date.setSeconds(seconds);
  return date.toTimeString().slice(0, 8); // returns hh:mm:ss
}

//@desc     Upload Audio Files - Vendor
//@route    POST /api/uploadfiles/
//@access   Private
//@usedBy   Audio Recording App
exports.uploadFile = asyncHandler(async (req, res, next) => {
  let appVersionNumber = req.body.appVersionNumber;
  if (
    !appVersionNumber ||
    Number(appVersionNumber) < Number(process.env.APP_VERSION)
  ) {
    return next(
      new ErrorResponse(
        `Please update your app to the latest version from play store!`,
        [],
        400,
      ),
    );
  }

  // Custom security header check
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env.CUSTOM_API_KEY) {
    return next(new ErrorResponse("Access denied for this request", [], 401));
  }

  try {
    const file = req.file;

    const user = req.user;

    const distdtls = await District.find(
      { state: user.state, district: user.district },
      {
        truncdistname: 1,
        statertocode: 1,
        phase: 1,
        isactive: 1,
        _id: 0,
      },
    );

    //console.log("distdtls", distdtls[0].isactive);

    if (distdtls[0].isactive == false) {
      return next(
        new ErrorResponse(
          "We have stopped recording for this district",
          [],
          401,
        ),
      );
    }

    const { imagename, duration, pairId, promtText } = req.body;

    if (!file) {
      return next(new ErrorResponse("Please upload a file", [], 400));
    }

    if (!user) {
      return next(new ErrorResponse("User not found", [], 404));
    }

    if (!imagename) {
      return next(new ErrorResponse("Please provide an image name", [], 400));
    }

    if (!pairId) {
      return next(new ErrorResponse("pairId is required", [], 400));
    }

    if (!promtText) {
      return next(new ErrorResponse("prompt text is required", [], 400));
    }

    // Voice Verifycation check through python api
    const form = new formData();

    form.append("userId", req.user._id.toString());
    form.append("audio", file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    // TODO: Change Api endpoint
    const response = await axios.post(
      `${process.env.PYTHON_API_URL}/intra-audio-compare-v3`,
      form,
      {
        headers: form.getHeaders(),
      },
    );

    const { data } = response;

    if (data.isLessVolume) {
      return next(
        new ErrorResponse("Audio Volume is Low! Please Record Again", [], 400),
      );
    }

    if (data.isSmallSegment) {
      return next(
        new ErrorResponse(
          "You are taking too much pause between the words. Take pause after speaking a sentence.",
          [],
          400,
        ),
      );
    }

    if (data.isLargeSegment) {
      return next(
        new ErrorResponse(
          "You are speaking continuously. Please leave a gap between two sentences.",
          [],
          400,
        ),
      );
    }

    // if (!data.isSameSpeaker) {
    //   return next(
    //     new ErrorResponse("Audio does not match with the sample audio", [], 400)
    //   );
    // }

    const similarityScore = 1 - data.cosineDistance;
    const segments = data.segments;

    let speechDuration = 0;
    let checkManualSegment = false;
    // segments.forEach((segment) => {
    //   const { startTime, endTime, segmentData } = segment;

    //   const dur = endTime - startTime;
    //   if (segmentData !== "<SIL>") {
    //     speechDuration += dur;
    //     if (dur >= 10) {
    //       checkManualSegment = true;
    //     }
    //   }
    // });

    for (const segment of segments) {
      const { startTime, endTime, segmentData } = segment;
      const dur = endTime - startTime;

      if (dur >= 10) {
        return next(
          new ErrorResponse(
            "You are speaking continuously. Please leave a gap between the sentences.",
            [],
            400,
          ),
        );
      }

      if (segmentData !== "<SIL>" && dur >= 2) {
        speechDuration += dur;
      }
    }

    const hhmmss = convertSecondsToTime(duration);
    const speechDurationhhmmss = convertSecondsToTime(
      Math.floor(speechDuration),
    );

    // Check if the speechduration of user after adding current file speech duration exceeding 15 minutes
    // If yes, return error message
    const userSpeechDuration = convertToSeconds(user.speechDuration);
    if (userSpeechDuration + speechDuration > 900) {
      return next(
        new ErrorResponse(
          "You have exceeded the maximum recording time limit of 15 minutes.",
          [],
          400,
        ),
      );
    }

    if (speechDuration < 10) {
      return next(
        new ErrorResponse(
          "Speech duration should be minimum 10 seconds.",
          [],
          400,
        ),
      );
    }

    const bucket = gc.bucket(bucketName);

    let momentdatetime = moment().format();
    let currentDateTime = momentdatetime.replace(/[^a-z\d]+/gi, "");
    let currentDateTimeSplit = currentDateTime.split("T")[1];
    let utterenceId =
      req.user.mobile.slice(5) +
      currentDateTimeSplit +
      req.user.mobile.slice(0, 5);
    const UserDistrct = req.user.district.replace(/[^a-z\d]+/gi, "");
    const UserState = req.user.state.replace(/[^a-z\d]+/gi, "");
    const phase = distdtls[0].phase;
    const userspeakerid = req.user.speakerID;

    const lastDot = imagename.lastIndexOf(".");

    const imageName = imagename.substring(0, lastDot);

    let FileName =
      UserState +
      "_" +
      UserDistrct +
      "_" +
      userspeakerid +
      "_" +
      utterenceId +
      "_" +
      imageName +
      ".wav";

    const folderPath = "Audios/" + UserState + "_" + UserDistrct + "/";
    const gcFileName = folderPath + FileName;

    const transcriptionFilesfolderPath =
      "TranscriptionFiles/" + UserState + "_" + UserDistrct + "/";
    const transcriptionFilesgcFileName =
      transcriptionFilesfolderPath + FileName;

    let segmentationFilterPath = `SegmentationJsonFiles/${req.user.state}_${req.user.district}/`;
    let segmentationPath =
      segmentationFilterPath + FileName.replace(".wav", ".json");
    const jsonPath = `${baseUrl}/${segmentationPath}`;

    const audioPath = `${baseUrl}/${gcFileName}`;

    const transcriptionFilesaudioPath = `${baseUrl}/${transcriptionFilesgcFileName}`;

    const imageLocation = `${baseUrl}/Images/${UserState}_${UserDistrct}/${imagename}`;

    let supervisorDetails = await User.find(
      {
        state: req.user.state,
        district: req.user.district,
        name: req.user.coordinator,
        role: "Coordinator",
      },
      {
        supervisorName: 1,
        supervisorID: 1,
        _id: 0,
      },
    );

    let teamLeadDetails = await User.find(
      {
        state: req.user.state,
        district: req.user.district,
        _id: supervisorDetails[0].supervisorID,
        role: "Supervisor",
      },
      {
        teamleadName: 1,
        teamleadID: 1,
        _id: 0,
      },
    );

    let isFileExist = await FileDetail.exists({
      state: req.user.state,
      district: req.user.district,
      fileName: FileName,
      imageName: imagename,
    });

    if (isFileExist) {
      return next(
        new ErrorResponse("Filename already exist. Please try again!", [], 400),
      );
    }

    const isFileNameExist = await FileDetail.exists({
      state: req.user.state,
      district: req.user.district,
      imageName: req.body.imagename,
      userID: req.user._id,
    });

    if (isFileNameExist) {
      return next(
        new ErrorResponse(
          "Image name already exist. Please try again!",
          [],
          400,
        ),
      );
    }

    let speakerPair = await SpeakerPair.findById(pairId);

    if (!isFileExist && !isFileNameExist) {
      const tempBody = {
        fileName: FileName,
        fileLocation: audioPath,
        transcriptionFileLocation: transcriptionFilesaudioPath,
        fileDuration: hhmmss,
        fileDurationSecs: duration,
        rate: 200,
        imageName: imagename,
        imageLocation: imageLocation,
        folderPath: folderPath,
        userID: req.user._id,
        mobile: req.user.mobile,
        vendorName: req.user.name,
        age: req.user.age,
        gender: req.user.gender,
        qualification: req.user.qualification,
        state: req.user.state,
        district: req.user.district,
        language: req.user.language,
        pincode: req.user.pincode,
        stayingyears: req.user.stayingyears,
        socioeconomicstatus: req.user.socioeconomicstatus,
        coordinatorName: req.user.coordinator,
        supervisorName: supervisorDetails[0].supervisorName,
        teamleadName: teamLeadDetails[0].teamleadName,
        speakerID: req.user.speakerID,
        phonebrand: req.user.phonebrand,
        phonemodel: req.user.phonemodel,
        knownlanguages: req.user.knownlanguages,
        phase: phase,
        speechDuration: speechDurationhhmmss,
        speechDurationSec: Math.floor(speechDuration),
        JsonFileLocation: jsonPath,
        JsonFileName: FileName.replace(".wav", ".json"),
        SegmentationStatus: !checkManualSegment ? "Completed" : "Open",
        CheckManualSegment: checkManualSegment,
        voiceSimilarityScore: similarityScore,
        requester: speakerPair.requester,
        partner: speakerPair.partner,
        promptText: promptText,
      };

      const file = bucket.file(gcFileName);
      await file.save(req.file.buffer, {
        metadata: {
          contentType: req.file.mimetype,
        },
      });

      const segmentationFile = bucket.file(segmentationPath);
      await segmentationFile.save(JSON.stringify(segments), {
        metadata: {
          contentType: "application/json",
        },
      });
      const filedetails = await FileDetail.create(tempBody);

      if (filedetails) {
        const {
          gender,
          socioeconomicstatus,
          age,
          pincode,
          district,
          speechDurationSec,
        } = filedetails;

        const recordingRatio = await RecordingRatio.findOne({ district });
        const speechDuration = Math.floor(speechDurationSec);

        //console.log("recordingRatio", recordingRatio.districtTotalRecordedSec);

        if (recordingRatio) {
          // Update district total recording hours
          recordingRatio.districtTotalRecordedSec += speechDuration;

          // Update pincode data
          if (!recordingRatio.pincodes.has(pincode)) {
            recordingRatio.pincodes.set(pincode, 0); // Initialize if pincode doesn't exist
          }
          recordingRatio.pincodes.set(
            pincode,
            recordingRatio.pincodes.get(pincode) + speechDuration,
          );

          const totalPincodes = Array.from(
            recordingRatio.pincodes.keys(),
          ).length;
          if (
            recordingRatio.pincodes.get(pincode) >=
            recordingRatio.districtTotalSec / totalPincodes
          ) {
            // Deactivate pincode
            await Pincode.findOneAndUpdate(
              { district, pincode: parseInt(pincode) },
              { isactive: false },
            );
          }

          // Update gender data
          if (recordingRatio.gender[gender] !== undefined) {
            recordingRatio.gender[gender] += speechDuration;
          }

          // Update socioeconomic data
          if (recordingRatio.socioeconomic[socioeconomicstatus] !== undefined) {
            recordingRatio.socioeconomic[socioeconomicstatus] += speechDuration;
          }

          const ageGroup = getAgeGroup(age);
          // Update age group data
          if (recordingRatio.ageGroup[ageGroup] !== undefined) {
            recordingRatio.ageGroup[ageGroup] += speechDuration;
          }
        }

        await recordingRatio.save();

        const image = await Image.findOne({
          imgname: imagename,
          state: req.user.state,
          district: req.user.district,
        }).select("imageRecordingDurationSec imageRecordingDuration");

        if (image) {
          // Increment the recording duration
          const updatedRecordingDurationSec =
            image.imageRecordingDurationSec + Math.floor(speechDuration);
          const updatedRecordingDuration = convertSecondsToTime(
            updatedRecordingDurationSec,
          );

          await Image.findByIdAndUpdate(image._id, {
            imageRecordingDurationSec: updatedRecordingDurationSec,
            imageRecordingDuration: updatedRecordingDuration,
            isAllocated: true,
          });
        }

        let recordedHrs = await User.findById(req.user._id, {
          recordedHours: 1,
          pendingHours: 1,
          speechDuration: 1,
          pendingSpeechDuration: 1,
          _id: 0,
        });

        let userPrevRecordedSeconds = convertToSeconds(
          recordedHrs.recordedHours,
        );
        let userNewRecordedDuration = convertSecondsToTime(
          userPrevRecordedSeconds + Number(duration),
        );

        let userPrevSpeechSeconds = convertToSeconds(
          recordedHrs.speechDuration,
        );
        let userNewSpeechDuration = convertSecondsToTime(
          userPrevSpeechSeconds + Math.floor(speechDuration),
        );

        let userPrevPendingSeconds = convertToSeconds(recordedHrs.pendingHours);
        let userNewPendingSeconds = userPrevPendingSeconds - Number(duration);
        userNewPendingSeconds =
          userNewPendingSeconds < 0 ? 0 : userNewPendingSeconds;
        let userNewPendingDuration = convertSecondsToTime(
          userNewPendingSeconds,
        );

        let userPrevPendingSpeechSeconds = convertToSeconds(
          recordedHrs.pendingSpeechDuration,
        );
        let userNewPendingSpeechSeconds =
          userPrevPendingSpeechSeconds - Math.floor(speechDuration);
        userNewPendingSpeechSeconds =
          userNewPendingSpeechSeconds < 0 ? 0 : userNewPendingSpeechSeconds;
        let userNewPendingSpeechDuration = convertSecondsToTime(
          userNewPendingSpeechSeconds,
        );

        const updateUser = await User.findByIdAndUpdate(
          req.user._id,
          {
            recordedHours: userNewRecordedDuration,
            pendingHours: userNewPendingDuration,
            speechDuration: userNewSpeechDuration,
            pendingSpeechDuration: userNewPendingSpeechDuration,
          },
          {
            new: true, //returns the updated data as response data
            runValidators: true, //mongoose validation
          },
        );

        if (updateUser) {
          let coordinatorRecordedHrs = await User.findOne(
            {
              role: "Coordinator",
              state: req.user.state,
              district: req.user.district,
              name: req.user.coordinator,
            },
            {
              recordedHours: 1,
              speechDuration: 1,
              _id: 0,
            },
          );

          let coordPrevRecordedSeconds = convertToSeconds(
            coordinatorRecordedHrs.recordedHours,
          );
          let coordNewRecordedDuration = convertSecondsToTime(
            coordPrevRecordedSeconds + Number(duration),
          );

          let coordPrevSpeechSeconds = convertToSeconds(
            coordinatorRecordedHrs.speechDuration,
          );
          let coordNewSpeechDuration = convertSecondsToTime(
            coordPrevSpeechSeconds + Math.floor(speechDuration),
          );

          await User.findOneAndUpdate(
            {
              role: "Coordinator",
              state: req.user.state,
              district: req.user.district,
              name: req.user.coordinator,
            },
            {
              recordedHours: coordNewRecordedDuration,
              speechDuration: coordNewSpeechDuration,
            },
            {
              new: true, //returns the updated data as response data
              runValidators: true, //mongoose validation
            },
          );
        }
      }

      res.status(200).json({
        success: true,
        msg: `Upload success`,
      });
    } else {
      return next(
        new ErrorResponse("File already exist! Please try again!", [], 500),
      );
    }
  } catch (err) {
    console.log(err);
    return next(
      new ErrorResponse("Something went wrong! Please try again!", [err], 500),
    );
  }
});

//@desc     File Details - Vendor
//@route    POST /api/getfiledetails/
//@access   Private
//@usedBy   Audio Recording App
exports.getFileDetails = asyncHandler(async (req, res, next) => {
  try {
    const fileDetails = await FileDetail.find(
      { userID: req.user._id },
      {
        fileName: 1,
        fileDuration: 1,
        fileLocation: 1,
        status: 1,
        recordedOn: 1,
        isQcAccepted: 1,
        qcRejectionReason: 1,
        supervisorRejectionReason: 1,
        coordinatorRejectionReason: 1,
        speechDuration: 1,
        speechDurationSec: 1,
      },
    );

    const RecordedHrsDetails = await User.findById(req.user._id, {
      pendingHours: 1,
      recordedHours: 1,
      recordingCompleted: 1,
      speechDuration: 1,
      pendingSpeechDuration: 1,
      _id: 0,
    });

    // const PincodeRecordedHrs = await FileDetail.aggregate([
    //   {
    //     $group: {
    //       _id: null,
    //       //totalValue: { $sum: "$fileDurationSecs" },
    //       enabledValue: {
    //         $sum: {
    //           $cond: [
    //             // Condition to test
    //             { $eq: ["$pincode", req.user.pincode] },
    //             // True
    //             "$fileDurationSecs",
    //             // False
    //             0,
    //           ],
    //         },
    //       },
    //     },
    //   },
    // ]);

    // //console.log("PincodeRecordedHrs", PincodeRecordedHrs[0].enabledValue);

    // const TargetDurationSeconds = 432000; // 120 hrs per district

    // const PincodeCount = await Pincode.countDocuments({
    //   state: req.user.state,
    //   district: req.user.district,
    // });

    // //console.log("PincodeCount", PincodeCount);

    // const LimitPerPincode = Math.round(TargetDurationSeconds / PincodeCount);

    //console.log("LimitPerPincode", LimitPerPincode);

    res.status(200).json({
      success: true,
      msg: `filedetails loaded successfully`,
      data: {
        fileDetails,
        pendingHrs: RecordedHrsDetails.pendingHours,
        recordedHrs: RecordedHrsDetails.recordedHours,
        recordingCompleted: RecordedHrsDetails.recordingCompleted,
        speechDuration: RecordedHrsDetails.speechDuration,
        pendingSpeechDuration: RecordedHrsDetails.pendingSpeechDuration,
        // pincodeHrs: PincodeRecordedHrs[0].enabledValue,
        // limitPerPincode: LimitPerPincode,
      },
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Coordinator wise User list - Coordinator
//@route    GET /api/getusers/
//@access   Private
//@usedBy   Audio Recording App
// exports.getCoordinatorUsers = asyncHandler(async (req, res, next) => {
//   try {
//     const Users = await User.find({
//       coordinator: req.user.name,
//       isactive: true,
//       createdOn: { $gte: new Date("2023-05-01") },
//     });

//     //console.log("Users", Users.length);

//     if (Users.length > 0) {
//       let finalUserList = [];
//       Users.map(async (row, index) => {
//         //console.log("row", row);
//         const FileListCount = await FileDetail.countDocuments({
//           // district: req.user.district,
//           speakerID: row.speakerID,
//           mobile: row.mobile,
//           status: "Accepted",
//         });

//         let userSpeechDuration = await FileDetail.find(
//           {
//             userID: row._id,
//             status: "Accepted",
//           },
//           {
//             speechDuration: 1,
//             _id: 0,
//           }
//         );

//         let userAcceptedSpeechDuration = await FileDetail.find(
//           {
//             userID: row._id,
//             status: "Accepted",
//             isQcAccepted: true,
//           },
//           {
//             speechDuration: 1,
//             _id: 0,
//           }
//         );

//         //console.log("userSpeechDuration", userSpeechDuration);

//         function durationToSeconds(duration) {
//           const [hours, minutes, seconds] = duration.split(":").map(Number);
//           return hours * 3600 + minutes * 60 + seconds;
//         }

//         // Function to convert seconds back to "hh:mm:ss"
//         function secondsToDuration(totalSeconds) {
//           const hours = Math.floor(totalSeconds / 3600);
//           const minutes = Math.floor((totalSeconds % 3600) / 60);
//           const seconds = totalSeconds % 60;
//           return [hours, minutes, seconds]
//             .map((unit) => String(unit).padStart(2, "0"))
//             .join(":");
//         }

//         // Calculate total duration in seconds
//         const totalSeconds = userSpeechDuration.reduce((sum, record) => {
//           return sum + durationToSeconds(record.speechDuration);
//         }, 0);

//         // Convert total seconds to "hh:mm:ss"
//         const totalDuration = secondsToDuration(totalSeconds);

//         // Calculate user accepted speech duration in seconds
//         const totaluserAcceptedSeconds = userAcceptedSpeechDuration.reduce(
//           (sum, record) => {
//             return sum + durationToSeconds(record.speechDuration);
//           },
//           0
//         );

//         // Convert user accepted speech seconds to "hh:mm:ss"
//         const totaluserAcceptedDuration = secondsToDuration(
//           totaluserAcceptedSeconds
//         );

//         // if (FileListCount) {
//         setTimeout(() => {
//           let obj = {
//             _id: row._id,
//             age: row.age,
//             gender: row.gender,
//             mobile: row.mobile,
//             accesscode: row.accesscode,
//             latitude: row.latitude,
//             longitude: row.longitude,
//             name: row.name,
//             recordedHours: row.recordedHours,
//             speechDuration: totalDuration,
//             userAcceptedSpeechDuration: totaluserAcceptedDuration,
//             speakerID: row.speakerID,
//             recordingCompleted: row.recordingCompleted,
//             fileCount: FileListCount,
//           };

//           finalUserList.push(obj);
//         }, 1000);

//         // }

//         //console.log("finalUserList", finalUserList.length);
//         // console.log(
//         //   "index == UserList.length - 1",
//         //   index,
//         //   UserList.length - 1
//         // );
//         if (index == Users.length - 1) {
//           setTimeout(() => {
//             res.status(200).json({
//               success: true,
//               msg: `finalUserList`,
//               data: finalUserList,
//             });
//           }, 2000);
//         }
//       });
//     } else {
//       return next(new ErrorResponse("No User Found", [], 404));
//     }

//     //console.log("Users", Users);
//     // res.status(200).json({
//     //   success: true,
//     //   msg: `User List`,
//     //   data: Users,
//     // });
//   } catch (err) {
//     return next(new ErrorResponse("Internal server error", [err], 500));
//   }
// });
exports.getCoordinatorUsers = asyncHandler(async (req, res, next) => {
  try {
    const Users = await User.find({
      coordinator: req.user.name,
      isactive: true,
      createdOn: { $gte: new Date("2023-05-01") },
    });

    if (Users.length === 0) {
      return next(new ErrorResponse("No User Found", [], 404));
    }

    // Helper functions
    const durationToSeconds = (duration) => {
      const [hours, minutes, seconds] = duration.split(":").map(Number);
      return hours * 3600 + minutes * 60 + seconds;
    };

    const secondsToDuration = (totalSeconds) => {
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return [hours, minutes, seconds]
        .map((unit) => String(unit).padStart(2, "0"))
        .join(":");
    };

    // Process all users concurrently
    const finalUserList = await Promise.all(
      Users.map(async (row) => {
        const [
          fileCount,
          userSpeechDuration,
          userAcceptedSpeechDuration,
          checkQC,
        ] = await Promise.all([
          FileDetail.countDocuments({
            speakerID: row.speakerID,
            mobile: row.mobile,
            status: "Accepted",
          }),
          FileDetail.find({ userID: row._id }, { speechDuration: 1, _id: 0 }),
          FileDetail.find(
            {
              userID: row._id,
              status: "Accepted",
              isQcAccepted: true,
            },
            { speechDuration: 1, _id: 0 },
          ),
          User.findById(row._id, {
            isQcSignedOff: 1,
            _id: 0,
          }),
        ]);

        const totalSeconds = userSpeechDuration.reduce(
          (sum, record) => sum + durationToSeconds(record.speechDuration),
          0,
        );

        const totaluserAcceptedSeconds = userAcceptedSpeechDuration.reduce(
          (sum, record) => sum + durationToSeconds(record.speechDuration),
          0,
        );

        return {
          _id: row._id,
          age: row.age,
          gender: row.gender,
          mobile: row.mobile,
          accesscode: row.accesscode,
          latitude: row.latitude,
          longitude: row.longitude,
          name: row.name,
          recordedHours: row.recordedHours,
          speechDuration: secondsToDuration(totalSeconds),
          userAcceptedSpeechDuration: secondsToDuration(
            totaluserAcceptedSeconds,
          ),
          speakerID: row.speakerID,
          recordingCompleted: row.recordingCompleted,
          fileCount: fileCount,
          checkQC: checkQC.isQcSignedOff,
        };
      }),
    );

    res.status(200).json({
      success: true,
      msg: "finalUserList",
      data: finalUserList,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     District wise User list - Customer, Admin
//@route    GET /api/getdistrictwiseusers/
//@access   Private
//@usedBy   Audio Recording App
exports.getDistrictwiseUsers = asyncHandler(async (req, res, next) => {
  //console.log("req.query", req.query);
  try {
    const Users = await User.find({
      role: "Vendor",
      state: req.query.state,
      district: req.query.district,
      isactive: true,
    });

    //console.log("Users", Users);
    res.status(200).json({
      success: true,
      msg: `User List`,
      data: Users,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     District wise User list - Supervisor
//@route    GET /api/getcoordinatorwiseusers/
//@access   Private
//@usedBy   Audio Recording App
exports.getCoordinatorwiseUsers = asyncHandler(async (req, res, next) => {
  console.log("req.query", req.query);
  try {
    const Users = await User.find({
      role: "Vendor",
      state: req.query.state,
      district: req.query.district,
      isactive: true,
      coordinator: req.query.coordinator,
    });

    //console.log("userSpeechDuration", userSpeechDuration);

    if (Users.length > 0) {
      let UserArray = [];
      let userObj = {};
      let rowCount = 0;
      Users.map(async (row) => {
        let qcPendingCount = await FileDetail.countDocuments({
          $and: [
            { userID: row._id },
            { isQcAccepted: { $nin: [true] } },
            { status: "Accepted" },
          ],
        });

        let userSpeechDuration = await FileDetail.find(
          {
            userID: row._id,
            status: "Accepted",
          },
          {
            speechDuration: 1,
            _id: 0,
          },
        );

        //console.log("userSpeechDuration", userSpeechDuration);

        function durationToSeconds(duration) {
          const [hours, minutes, seconds] = duration.split(":").map(Number);
          return hours * 3600 + minutes * 60 + seconds;
        }

        // Function to convert seconds back to "hh:mm:ss"
        function secondsToDuration(totalSeconds) {
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = totalSeconds % 60;
          return [hours, minutes, seconds]
            .map((unit) => String(unit).padStart(2, "0"))
            .join(":");
        }

        // Calculate total duration in seconds
        const totalSeconds = userSpeechDuration.reduce((sum, record) => {
          return sum + durationToSeconds(record.speechDuration);
        }, 0);

        // Convert total seconds to "hh:mm:ss"
        const totalDuration = secondsToDuration(totalSeconds);

        //console.log("Total Speech Duration:", totalDuration);

        userObj = {
          speakerID: row.speakerID,
          latitude: row.latitude,
          longitude: row.longitude,
          name: row.name,
          recordedHours: row.recordedHours,
          qcPendingCount: qcPendingCount,
          mobile: row.mobile,
          age: row.age,
          gender: row.gender,
          speechDuration: totalDuration,
        };

        UserArray.push(userObj);
        rowCount++;
        // console.log("rowCount, length", rowCount, Users.length);
        if (rowCount == Users.length) {
          //console.log("UserArray inside", UserArray);
          res.status(200).json({
            success: true,
            msg: `User List`,
            data: UserArray,
          });
        }
      });
    } else {
      return next(new ErrorResponse("No User Found", [], 404));
    }
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Get Coordinator wise Inter Accepted User list - QualityChecker
//@route    GET /api/getinteracceptedusers/
//@access   Private
//@usedBy   Audio Recording App
// exports.getInterAcceptedUsers = asyncHandler(async (req, res, next) => {
//   //console.log("req.query", req.query);
//   try {
//     const Users = await User.find({
//       role: "Vendor",
//       state: req.query.state,
//       district: req.query.district,
//       isactive: true,
//       coordinator: req.query.coordinator,
//       isInterAccepted: true,
//       createdOn: { $gte: new Date("2024-02-20") },
//     });

//     //console.log("Users", Users);
//     if (Users.length > 0) {
//       let UserArray = [];
//       let userObj = {};
//       let rowCount = 0;
//       Users.map(async (row) => {
//         let qcPendingCount = await FileDetail.countDocuments({
//           $and: [
//             { userID: row._id },
//             { isQcAccepted: { $nin: [true] } },
//             { status: "Accepted" },
//             { inter1CheckStatus: "Accepted" },
//           ],
//         });

//         let qcAcceptedCount = await FileDetail.countDocuments({
//           $and: [
//             { userID: row._id },
//             { isQcAccepted: true },
//             { status: "Accepted" },
//             { inter1CheckStatus: "Accepted" },
//           ],
//         });

//         // let distLanguages = await District.find(
//         //   { district: row.district },
//         //   {
//         //     language: 1,
//         //     _id: 0,
//         //   }
//         // );

//         userObj = {
//           speakerID: row.speakerID,
//           name: row.name,
//           recordedHours: row.recordedHours,
//           qcPendingCount: qcPendingCount,
//           qcAcceptedCount: qcAcceptedCount,
//           isQcSignedOff: row.isQcSignedOff,
//           mobile: row.mobile,
//           age: row.age,
//           gender: row.gender,
//           language: row.language,
//           createdOn: row.createdOn,
//           _id: row._id,
//           //distLanguages: distLanguages[0].language.split(","),
//           distLanguages: row.language,
//           autoSignOff: row.autoSignOff,
//           sampleAudioPath: row.sampleAudioPath,
//         };

//         UserArray.push(userObj);
//         rowCount++;
//         // console.log("rowCount, length", rowCount, Users.length);
//         if (rowCount == Users.length) {
//           // console.log("UserArray inside", UserArray);
//           res.status(200).json({
//             success: true,
//             msg: `User List`,
//             data: UserArray,
//           });
//         }
//       });
//     } else {
//       return next(new ErrorResponse("No User Found", [], 404));
//     }
//   } catch (err) {
//     return next(new ErrorResponse("Internal server error", [err], 500));
//   }
// });
exports.getInterAcceptedUsers = asyncHandler(async (req, res, next) => {
  try {
    const users = await User.find({
      role: "Vendor",
      state: req.query.state,
      district: req.query.district,
      isactive: true,
      coordinator: req.query.coordinator,
      isInterAccepted: true,
      createdOn: { $gte: new Date("2024-02-20") },
    }).select(
      "speakerID name recordedHours isQcSignedOff mobile age gender language createdOn teamleadName teamleadID autoSignOff sampleAudioPath",
    );

    if (users.length === 0) {
      return next(new ErrorResponse("No User Found", [], 404));
    }

    const userArray = await Promise.all(
      users.map(async (user) => {
        const [qcPendingCount, qcAcceptedCount] = await Promise.all([
          FileDetail.countDocuments({
            userID: user._id,
            isQcAccepted: { $nin: [true] },
            status: "Accepted",
            inter1CheckStatus: "Accepted",
          }),
          FileDetail.countDocuments({
            userID: user._id,
            isQcAccepted: true,
            status: "Accepted",
            inter1CheckStatus: "Accepted",
          }),
        ]);

        return {
          ...user.toObject(),
          qcPendingCount,
          qcAcceptedCount,
          distLanguages: user.language,
        };
      }),
    );

    res.status(200).json({
      success: true,
      msg: "User List",
      data: userArray,
    });
  } catch (err) {
    console.error("Error in getInterAcceptedUsers:", err);
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Get Coordinator wise Segmentation User list - QualityChecker
//@route    GET /api/getsegmentationusers/
//@access   Private
//@usedBy   Audio Recording App
exports.getSegmentationUsers = asyncHandler(async (req, res, next) => {
  //console.log("req.query", req.query);
  try {
    const Users = await User.find({
      role: "Vendor",
      state: req.query.state,
      district: req.query.district,
      isactive: true,
      coordinator: req.query.coordinator,
      isQcSignedOff: true,
    });

    //console.log("Users", Users);
    if (Users.length > 0) {
      let UserArray = [];
      let userObj = {};
      let rowCount = 0;
      Users.map(async (row) => {
        let segmentationPendingCount = await FileDetail.countDocuments({
          $and: [
            { userID: row._id },
            { isQcAccepted: true },
            { status: "Accepted" },
            { inter1CheckStatus: "Accepted" },
            { SegmentationStatus: { $nin: ["Completed"] } },
          ],
        });

        userObj = {
          speakerID: row.speakerID,
          name: row.name,
          //recordedHours: row.recordedHours,
          segmentationPendingCount: segmentationPendingCount,
          mobile: row.mobile,
          age: row.age,
          gender: row.gender,
          _id: row._id,
          isSegmentationSignedOff: row.isSegmentationSignedOff,
        };

        UserArray.push(userObj);
        rowCount++;
        // console.log("rowCount, length", rowCount, Users.length);
        if (rowCount == Users.length) {
          // console.log("UserArray inside", UserArray);
          res.status(200).json({
            success: true,
            msg: `User List`,
            data: UserArray,
          });
        }
      });
    } else {
      return next(new ErrorResponse("No User Found", [], 404));
    }
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Get Coordinator wise Segmentation Completed User list - QualityChecker
//@route    GET /api/getsegcompletedusers/
//@access   Private
//@usedBy   Audio Recording App
exports.getSegCompletedUsers = asyncHandler(async (req, res, next) => {
  //console.log("req.query", req.query);
  try {
    const Users = await FileDetail.distinct("userID", {
      state: req.query.state,
      district: req.query.district,
      coordinatorName: req.query.coordinator,
      //SegmentationStatus: { $in: ["Completed", "InProgress"] },
      SegmentationStatus: "Completed",
      isQcAccepted: true,
      status: "Accepted",
    });

    // const Users = await User.find({
    //   state: req.query.state,
    //   district: req.query.district,
    //   coordinator:req.query.coordinator,
    //   isQcSignedOff: true
    // })

    //console.log("Users", Users);
    if (Users.length > 0) {
      let UserArray = [];
      let userObj = {};
      let rowCount = 0;
      Users.map(async (row) => {
        //console.log("row", row);
        let user = await User.findById(row, {
          speakerID: 1,
          name: 1,
          mobile: 1,
          isQcPrSignedOff: 1,
          isSegmentationSignedOff: 1,
          isQcSignedOff: 1,
          _id: 1,
        });
        //console.log("user", user);

        let segmentationPendingCount = await FileDetail.countDocuments({
          $and: [
            { userID: row },
            { isQcAccepted: true },
            { status: "Accepted" },
            { inter1CheckStatus: "Accepted" },
            { SegmentationStatus: { $in: ["Open", "InProgress"] } },
          ],
        });

        //console.log("row", row);

        userObj = {
          speakerID: user.speakerID,
          name: user.name,
          segmentationPendingCount: segmentationPendingCount,
          mobile: user.mobile,
          _id: user._id,
          isQcPrSignedOff: user.isQcPrSignedOff,
          isSegmentationSignedOff: user.isSegmentationSignedOff,
          isQcSignedOff: user.isQcSignedOff,
        };

        UserArray.push(userObj);
        rowCount++;
        // console.log("rowCount, length", rowCount, Users.length);
        if (rowCount == Users.length) {
          // console.log("UserArray inside", UserArray);
          res.status(200).json({
            success: true,
            msg: `User List`,
            data: UserArray,
          });
        }
      });
    } else {
      return next(new ErrorResponse("No User Found", [], 404));
    }
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     District wise User list - Intra1
//@route    GET /api/getcoordinatorwiseusersforintra/
//@access   Private
//@usedBy   Audio Recording App
exports.getCoordinatorwiseUsersForIntra = asyncHandler(
  async (req, res, next) => {
    //console.log("req.query", req.query);
    try {
      const Users = await User.find({
        role: "Vendor",
        state: req.query.state,
        district: req.query.district,
        isactive: true,
        coordinator: req.query.coordinator,
      });

      //console.log("Users", Users);
      if (Users.length > 0) {
        let UserArray = [];
        let userObj = {};
        let rowCount = 0;
        Users.map(async (row) => {
          let intraTotalCount = await FileDetail.countDocuments({
            $and: [
              { userID: row._id },
              //{ isQcAccepted: true },
              { status: { $in: ["Accepted", "QcRejected"] } },
            ],
          });

          // console.log("intraTotalCount", intraTotalCount);

          let intraCompletedCount = await FileDetail.countDocuments({
            $and: [
              { userID: row._id },
              {
                $or: [
                  { intra1CheckStatus: { $in: ["Accepted", "Hold"] } },
                  { status: "QcRejected" },
                ],
              },
            ],
          });

          let intra1CheckBy = await FileDetail.findOne(
            {
              userID: row._id,
              intra1CheckStatus: { $in: ["Accepted", "Hold"] },
            },
            {
              intra1CheckByName: 1,
              // intra1Speaker: 1,
            },
          ).limit(1);

          let speakerCheckedBy = await FileDetail.findOne(
            {
              userID: row._id,
              isQcAccepted: true,
              intra1Speaker: { $exists: true },
            },
            {
              intra1SpeakerCheckedBy: 1,
            },
          ).limit(1);

          //console.log("speakerCheckedBy", speakerCheckedBy);

          userObj = {
            speakerID: row.speakerID,
            latitude: row.latitude,
            longitude: row.longitude,
            name: row.name,
            recordedHours: row.recordedHours,
            intraTotalCount: intraTotalCount,
            intraCompletedCount: intraCompletedCount,
            mobile: row.mobile,
            age: row.age,
            gender: row.gender,
            speakerCheckedBy: speakerCheckedBy
              ? speakerCheckedBy.intra1SpeakerCheckedBy
              : "",
            checkedBy: intra1CheckBy ? intra1CheckBy.intra1CheckByName : "",
            role: "Intra1",
          };

          UserArray.push(userObj);
          rowCount++;
          // console.log("rowCount, length", rowCount, Users.length);
          if (rowCount == Users.length) {
            // console.log("UserArray inside", UserArray);
            res.status(200).json({
              success: true,
              msg: `User List`,
              data: UserArray,
            });
          }
        });
      } else {
        return next(new ErrorResponse("No User Found", [], 404));
      }
    } catch (err) {
      return next(new ErrorResponse("Internal server error", [err], 500));
    }
  },
);

//@desc     District wise User list - Intra2
//@route    GET /api/getcoordinatorwiseusersforintra2/
//@access   Private
//@usedBy   Audio Recording App
exports.getCoordinatorwiseUsersForIntraTwo = asyncHandler(
  async (req, res, next) => {
    //console.log("req.query", req.query);
    try {
      const Users = await User.find({
        role: "Vendor",
        state: req.query.state,
        district: req.query.district,
        isactive: true,
        coordinator: req.query.coordinator,
      });

      //console.log("Users", Users);
      let UserArray = [];
      let userObj = {};
      let rowCount = 0;
      Users.map(async (row) => {
        let intraTotalCount = await FileDetail.countDocuments({
          $and: [{ userID: row._id }, { intra1CheckStatus: "Accepted" }],
        });

        // let intra1SpeakerCount = await FileDetail.countDocuments({
        //   $and: [
        //     { userID: row._id },
        //     { intra1Speaker: ["Speaker1", "Speaker2", "Speaker3"] },
        //     { intra1CheckStatus: "Accepted" },
        //   ],
        // });

        let intraCompletedCount = await FileDetail.countDocuments({
          $and: [
            { userID: row._id },
            { intra2CheckStatus: { $in: ["Accepted", "Hold"] } },
          ],
        });

        let intra2CheckBy = await FileDetail.findOne(
          { userID: row._id, intra2CheckStatus: { $in: ["Accepted", "Hold"] } },
          {
            intra2CheckByName: 1,
          },
        ).limit(1);

        userObj = {
          speakerID: row.speakerID,
          latitude: row.latitude,
          longitude: row.longitude,
          name: row.name,
          recordedHours: row.recordedHours,
          intraTotalCount: intraTotalCount,
          //intra1SpeakerCount: intra1SpeakerCount,
          intraCompletedCount: intraCompletedCount,
          mobile: row.mobile,
          age: row.age,
          gender: row.gender,
          checkedBy: intra2CheckBy ? intra2CheckBy.intra2CheckByName : "",
          role: "Intra2",
        };

        UserArray.push(userObj);
        rowCount++;

        // console.log("rowCount, length", rowCount, Users.length);
        if (rowCount == Users.length) {
          // console.log("UserArray inside", UserArray);
          res.status(200).json({
            success: true,
            msg: `User List`,
            data: UserArray,
          });
        }
      });
    } catch (err) {
      return next(new ErrorResponse("Internal server error", [err], 500));
    }
  },
);

//@desc     District wise User list - Admin
//@route    GET /api/getcoordinatorusers/
//@access   Private
//@usedBy   Audio Recording App
// exports.getCoordinatorUsersForAllQC = asyncHandler(async (req, res, next) => {
//   console.log("req.query", req.query);
//   try {
//     const Users = await User.find({
//       role: "Vendor",
//       state: req.query.state,
//       district: req.query.district,
//       isactive: true,
//       coordinator: req.query.coordinator,
//     });

//     //console.log("Users", Users);
//     let UserArray = [];
//     let userObj = {};
//     let rowCount = 0;
//     Users.map(async (row) => {
//       let qcPendingCount = await FileDetail.countDocuments({
//         $and: [
//           { userID: row._id },
//           { isQcAccepted: { $nin: [true] } },
//           { status: "Accepted" },
//         ],
//       });

//       userObj = {
//         speakerID: row.speakerID,
//         latitude: row.latitude,
//         longitude: row.longitude,
//         name: row.name,
//         recordedHours: row.recordedHours,
//         qcPendingCount: qcPendingCount,
//         mobile: row.mobile,
//         age: row.age,
//         gender: row.gender,
//       };

//       UserArray.push(userObj);
//       rowCount++;
//       // console.log("rowCount, length", rowCount, Users.length);
//       if (rowCount == Users.length) {
//         // console.log("UserArray inside", UserArray);
//         res.status(200).json({
//           success: true,
//           msg: `User List`,
//           data: UserArray,
//         });
//       }
//     });
//   } catch (err) {
//     return next(new ErrorResponse("Internal server error", [err], 500));
//   }
// });

//@desc     District wise User list - QualityChecker
//@route    GET /api/getusersampleaudio/
//@access   Private
//@usedBy   Audio Recording App
exports.getUsersSampleAudio = asyncHandler(async (req, res, next) => {
  //console.log("req.query", req.query.coordinator);
  try {
    const Users = await User.find({
      role: "Vendor",
      state: req.query.state,
      district: req.query.district,
      //isactive: true,
      recordedHours: { $gt: "00:00:00" },
      coordinator: req.query.coordinator,
    });

    //console.log("Users", Users);
    if (Users.length > 0) {
      let UserArray = [];
      let userObj = {};
      let rowCount = 0;
      Users.map(async (row) => {
        let usersample = await FileDetail.find(
          { userID: row._id },
          {
            fileName: 1,
            fileLocation: 1,
          },
        ).limit(1);

        //console.log("usersample", usersample, row._id);
        rowCount++;

        if (usersample.length > 0) {
          userObj = {
            speakerID: row.speakerID,
            latitude: row.latitude,
            longitude: row.longitude,
            name: row.name,
            recordedHours: row.recordedHours,
            fileName: usersample[0].fileName,
            mobile: row.mobile,
            fileLocation: usersample[0].fileLocation,
          };

          UserArray.push(userObj);
          // console.log("rowCount, length", rowCount, Users.length);
          if (rowCount == Users.length) {
            //console.log("UserArray inside", UserArray);
            res.status(200).json({
              success: true,
              msg: `User List`,
              data: UserArray,
            });
          }
        }
      });
    } else {
      return next(new ErrorResponse("No User Found", [], 404));
    }
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     District wise User list - Inter1
//@route    GET /api/getinterusersampleaudio/
//@access   Private
//@usedBy   Audio Recording App
exports.getInterUsersSampleAudio = asyncHandler(async (req, res, next) => {
  //console.log("req.query", req.query.coordinator);
  try {
    const Users = await User.find({
      role: "Vendor",
      state: req.query.state,
      district: req.query.district,
      //isactive: true,
      recordedHours: { $gt: "00:00:00" },
      coordinator: req.query.coordinator,
    });

    //console.log("Users", Users);
    let UserArray = [];
    let userObj = {};
    let rowCount = 0;
    Users.map(async (row) => {
      let usersample = await FileDetail.find(
        {
          userID: row._id,
          intra2CheckStatus: "Accepted",
          fileDurationSecs: { $gt: 10, $lt: 25 },
        },
        {
          fileName: 1,
          fileLocation: 1,
          userID: 1,
          gender: 1,
          intra2CheckStatus: 1,
          inter1CheckStatus: 1,
          inter1CheckByName: 1,
        },
      ).limit(1);

      //console.log("usersample", usersample, row._id);
      rowCount++;

      if (usersample.length > 0) {
        userObj = {
          speakerID: row.speakerID,
          latitude: row.latitude,
          longitude: row.longitude,
          name: row.name,
          recordedHours: row.recordedHours,
          fileName: usersample[0].fileName,
          mobile: row.mobile,
          fileLocation: usersample[0].fileLocation,
          userID: usersample[0].userID,
          gender: usersample[0].gender,
          intra2CheckStatus: usersample[0].intra2CheckStatus,
          inter1CheckStatus: usersample[0].inter1CheckStatus
            ? usersample[0].inter1CheckStatus
            : "",
          role: "Inter1",
          interCheckByName: usersample[0].inter1CheckByName
            ? usersample[0].inter1CheckByName
            : "",
        };

        UserArray.push(userObj);
      }

      if (rowCount == Users.length) {
        //console.log("UserArray inside", UserArray);
        res.status(200).json({
          success: true,
          msg: `User List`,
          data: UserArray,
        });
      }
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     District wise User list - Inter2
//@route    GET /api/getinter2usersampleaudio/
//@access   Private
//@usedBy   Audio Recording App
exports.getInter2UsersSampleAudio = asyncHandler(async (req, res, next) => {
  //console.log("req.query", req.query);
  try {
    const Users = await User.find({
      role: "Vendor",
      state: req.query.state,
      district: req.query.district,
      //isactive: true,
      recordedHours: { $gt: "00:00:00" },
      coordinator: req.query.coordinator,
    });

    //console.log("Users", Users);

    let UserArray = [];
    let userObj = {};
    let rowCount = 0;
    Users.map(async (row) => {
      let usersample = await FileDetail.find(
        {
          $and: [
            { userID: row._id },
            { inter1CheckStatus: "Unique" },
            { fileDurationSecs: { $gt: 10, $lt: 25 } },
          ],
        },
        {
          fileName: 1,
          fileLocation: 1,
          userID: 1,
          gender: 1,
          inter1CheckStatus: 1,
          inter2CheckStatus: 1,
          inter2CheckByName: 1,
        },
      ).limit(1);

      rowCount++;

      if (usersample.length > 0) {
        userObj = {
          speakerID: row.speakerID,
          latitude: row.latitude,
          longitude: row.longitude,
          name: row.name,
          recordedHours: row.recordedHours,
          fileName: usersample[0].fileName,
          mobile: row.mobile,
          fileLocation: usersample[0].fileLocation,
          userID: usersample[0].userID,
          gender: usersample[0].gender,
          inter1CheckStatus: usersample[0].inter1CheckStatus,
          inter2CheckStatus: usersample[0].inter2CheckStatus
            ? usersample[0].inter2CheckStatus
            : "",
          role: "Inter2",
          interCheckByName: usersample[0].inter2CheckByName
            ? usersample[0].inter2CheckByName
            : "",
        };

        UserArray.push(userObj);
        //console.log("UserArray", UserArray);
      }

      //console.log("Inside rowCount, length", rowCount, Users.length);
      if (rowCount == Users.length) {
        //console.log("UserArray inside", UserArray);
        res.status(200).json({
          success: true,
          msg: `User List`,
          data: UserArray,
        });
      }
    });

    // console.log("usersample", usersample);
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Get User Details - Coordinator, Admin
//@route    GET /api/getuserdetails/
//@access   Private
//@usedBy   Audio Recording App
exports.getUserDetails = asyncHandler(async (req, res, next) => {
  try {
    //console.log("req.query", req.query);
    const userDetails = await FileDetail.find({
      mobile: req.query.mobile,
      speakerID: req.query.speakerID,
    });

    const userReferenceFile = await User.find(
      { mobile: req.query.mobile, speakerID: req.query.speakerID },
      {
        sampleAudioPath: 1,
        teamleadName: 1,
        _id: 0,
      },
    );

    //console.log("userDetails", userDetails.length);
    res.status(200).json({
      success: true,
      msg: `User Details`,
      data: { userDetails, userReferenceFile: userReferenceFile[0] },
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Get Inter Accepted File Details - QC
//@route    GET /api/getinteracceptedfiles/
//@access   Private
//@usedBy   Audio Recording App
exports.getInterAcceptedFiles = asyncHandler(async (req, res, next) => {
  try {
    //console.log("req.query", req.query);
    const userDetails = await FileDetail.find({
      mobile: req.query.mobile,
      speakerID: req.query.speakerID,
      inter1CheckStatus: "Accepted",
      status: "Accepted",
      //isQcAccepted: false,
      isQcAccepted: { $nin: [true] },
      //FileRecoveryProcessed: { $exists: false },
    });

    const user = await User.find(
      { mobile: req.query.mobile, speakerID: req.query.speakerID },
      {
        sampleAudioPath: 1,
        name: 1,
        age: 1,
        gender: 1,
        mobile: 1,
        speakerID: 1,
        language: 1,
        teamleadName: 1,
        _id: 1,
      },
    );

    // console.log("userDetails", userDetails.length);
    res.status(200).json({
      success: true,
      msg: `User Details`,
      data: { userDetails, user },
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Get Inter Accepted File Details - QC
//@route    GET /api/getqcacceptedfiles/
//@access   Private
//@usedBy   Audio Recording App
exports.getQcAcceptedFiles = asyncHandler(async (req, res, next) => {
  try {
    //console.log("req.query", req.query);
    const userDetails = await FileDetail.find({
      mobile: req.query.mobile,
      speakerID: req.query.speakerID,
      inter1CheckStatus: "Accepted",
      status: "Accepted",
      isQcAccepted: true,
      SegmentationStatus: { $nin: ["Completed"] },
    });

    // console.log("userDetails", userDetails.length);
    res.status(200).json({
      success: true,
      msg: `User Details`,
      data: userDetails,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Get Segment Completed File Details - QC
//@route    GET /api/getsegcompletedfiles/
//@access   Private
//@usedBy   Audio Recording App
exports.getSegCompletedFiles = asyncHandler(async (req, res, next) => {
  try {
    //console.log("req.query", req.query);
    const userDetails = await FileDetail.find({
      mobile: req.query.mobile,
      speakerID: req.query.speakerID,
      // inter1CheckStatus: "Accepted",
      status: "Accepted",
      isQcAccepted: true,
      SegmentationStatus: { $in: ["Completed", "InProgress"] },
    });

    // console.log("userDetails", userDetails.length);
    res.status(200).json({
      success: true,
      msg: `User Details`,
      data: userDetails,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

// //@desc     Get CustomerUser Details - Customer
// //@route    GET /api/getcustomeruserdetails/
// //@access   Private
// //@usedBy   Audio Recording App
// exports.getCustomerUserDetails = asyncHandler(async (req, res, next) => {
//   try {
//     //console.log("mobile", req.query.mobile);
//     const userDetails = await FileDetail.find({
//       mobile: req.query.mobile,
//     });

//     // console.log("userDetails", userDetails);
//     res.status(200).json({
//       success: true,
//       msg: `User Details`,
//       data: userDetails,
//     });
//   } catch (err) {
//     return next(new ErrorResponse("Internal server error", [err], 500));
//   }
// });

//@desc     Reject File - Coordinator/Supervisor/QualityChecker/Intra1
//@route    PUT /api/rejectfile/
//@access   Private
//@usedBy   Audio Recording App
exports.updateRejectFile = asyncHandler(async (req, res, next) => {
  try {
    //console.log("req.body.id", req.body);
    //console.log("req.user", req.user);
    let ids = mongoose.Types.ObjectId(req.body.id);

    let qcCheckExist = await FileDetail.exists({
      _id: ids,
      $or: [
        { acceptedByQcId: { $exists: true } },
        { rejectedByQcId: { $exists: true } },
      ],
    });

    if (qcCheckExist) {
      return next(
        new ErrorResponse(
          "This file has already been QC'd (Accepted or Rejected). Please try a different SpeakerID.",
          [],
          401,
        ),
      );
    }
    //console.log("ids", ids);
    let query = {};

    if (req.body.role == "Coordinator") {
      query = {
        rejectedByCoordinator: req.user.name,
        coordinatorRejectedOn: Date.now(),
        coordinatorRejectionReason: req.body.reason,
        status: "CoordinatorRejected",
      };
    } else if (req.body.role == "Supervisor") {
      query = {
        rejectedBySupervisor: req.user.name,
        supervisorRejectedOn: Date.now(),
        supervisorRejectionReason: req.body.reason,
        status: "SupervisorRejected",
      };
    } else if (req.body.role == "QualityChecker") {
      query = {
        rejectedByQcId: req.user._id,
        rejectedByQcName: req.user.name,
        qcRejectedOn: Date.now(),
        qcRejectionReason: req.body.reason,
        status: "QcRejected",
        isQcAccepted: false,
      };
    }

    //console.log("query", query);
    const updatefile = await FileDetail.findByIdAndUpdate(ids, query);
    const duration = req.body.fileDuration;

    if (updatefile) {
      // console.log("Inside updatefile");
      const {
        gender,
        socioeconomicstatus,
        age,
        pincode,
        district,
        speechDurationSec,
      } = updatefile;

      const recordingRatio = await RecordingRatio.findOne({ district });
      const speechDuration = Math.floor(speechDurationSec);

      if (recordingRatio) {
        // Update district total recording hours
        recordingRatio.districtTotalRecordedSec -= speechDuration;

        if (recordingRatio.districtTotalRecordedSec < 0) {
          recordingRatio.districtTotalRecordedSec = 0;
        }

        // Update pincode data
        // if (!recordingRatio.pincodes.has(pincode)) {
        //   recordingRatio.pincodes.set(pincode, 0); // Initialize if pincode doesn't exist
        // }
        recordingRatio.pincodes.set(
          pincode,
          recordingRatio.pincodes.get(pincode) - speechDuration,
        );

        if (recordingRatio.pincodes.get(pincode) < 0) {
          recordingRatio.pincodes.set(pincode, 0);
        }

        const totalPincodes = recordingRatio.pincodes.size;

        // activate pincode
        if (
          recordingRatio.pincodes.get(pincode) <
          recordingRatio.districtTotalRecordedSec / totalPincodes
        ) {
          // Activate pincode
          await Pincode.findOneAndUpdate(
            { district, pincode: parseInt(pincode) },
            { isactive: true },
          );
        }

        // Update gender data
        if (recordingRatio.gender[gender] !== undefined) {
          recordingRatio.gender[gender] -= speechDuration;

          if (recordingRatio.gender[gender] < 0) {
            recordingRatio.gender[gender] = 0;
          }
        }

        // Update socioeconomic data
        if (recordingRatio.socioeconomic[socioeconomicstatus] !== undefined) {
          recordingRatio.socioeconomic[socioeconomicstatus] -= speechDuration;

          if (recordingRatio.socioeconomic[socioeconomicstatus] < 0) {
            recordingRatio.socioeconomic[socioeconomicstatus] = 0;
          }
        }

        const ageGroup = getAgeGroup(age);
        // Update age group data
        if (recordingRatio.ageGroup[ageGroup] !== undefined) {
          recordingRatio.ageGroup[ageGroup] -= speechDuration;

          if (recordingRatio.ageGroup[ageGroup] < 0) {
            recordingRatio.ageGroup[ageGroup] = 0;
          }
        }
      }

      await recordingRatio.save();

      const imageName = updatefile.imageName;
      //const district = updatefile.district;

      const imageDetails = await Image.findOne({
        imgname: imageName,
        district: district,
      });

      if (imageDetails) {
        const oldImageRecordingDurationSec =
          imageDetails.imageRecordingDurationSec;

        let newImageRecordingDurationSec =
          oldImageRecordingDurationSec - updatefile.speechDurationSec;

        if (newImageRecordingDurationSec < 0) {
          newImageRecordingDurationSec = 0;
        }

        const newImageRecordingDuration = new Date(
          newImageRecordingDurationSec * 1000,
        )
          .toISOString()
          .slice(11, 19);

        await Image.findByIdAndUpdate(imageDetails._id, {
          imageRecordingDurationSec: newImageRecordingDurationSec,
          imageRecordingDuration: newImageRecordingDuration,
        });
      }

      let recordedHrs = await User.findById(req.body.userID, {
        recordedHours: 1,
        pendingHours: 1,
        speechDuration: 1,
        pendingSpeechDuration: 1,
        _id: 0,
      });
      //console.log("recordedHrs", req.body.userID, recordedHrs);
      let oldRecordedHrs = recordedHrs.recordedHours.split(":");
      let seconds =
        +oldRecordedHrs[0] * 60 * 60 +
        +oldRecordedHrs[1] * 60 +
        +oldRecordedHrs[2];
      let newRecordedHrs = duration.split(":");
      let seconds2 =
        +newRecordedHrs[0] * 60 * 60 +
        +newRecordedHrs[1] * 60 +
        +newRecordedHrs[2];

      let date = new Date(1970, 0, 1);

      let diff1 = seconds - seconds2;
      if (diff1 < 0) {
        diff1 = 0;
      }
      date.setSeconds(diff1);

      let subtract = date
        .toTimeString()
        .replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
      // console.log("subtract", subtract);

      let oldPendingHrs = recordedHrs.pendingHours.split(":");
      let seconds3 =
        +oldPendingHrs[0] * 60 * 60 +
        +oldPendingHrs[1] * 60 +
        +oldPendingHrs[2];

      let date1 = new Date(1970, 0, 1);
      date1.setSeconds(seconds3 + seconds2);

      // console.log(
      //   "date1, seconds3, oldPendingHrs",
      //   date1,
      //   seconds3,
      //   oldPendingHrs
      // );
      let sum = date1.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
      //console.log("sum", sum);

      let oldSpeechHrs = recordedHrs.speechDuration.split(":");
      let speechseconds =
        +oldSpeechHrs[0] * 60 * 60 + +oldSpeechHrs[1] * 60 + +oldSpeechHrs[2];
      let newSpeechHrs = updatefile.speechDuration.split(":");
      let speechseconds2 =
        +newSpeechHrs[0] * 60 * 60 + +newSpeechHrs[1] * 60 + +newSpeechHrs[2];

      let speechdate = new Date(1970, 0, 1);

      let speechdiff1 = speechseconds - speechseconds2;
      if (speechdiff1 < 0) {
        speechdiff1 = 0;
      }
      speechdate.setSeconds(speechdiff1);

      let speechsubtract = speechdate
        .toTimeString()
        .replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
      // console.log("subtract", subtract);

      //console.log("speechsubtract", speechsubtract);

      let oldspeechPendingHrs = recordedHrs.pendingSpeechDuration.split(":");
      let speechseconds3 =
        +oldspeechPendingHrs[0] * 60 * 60 +
        +oldspeechPendingHrs[1] * 60 +
        +oldspeechPendingHrs[2];

      let speechdate1 = new Date(1970, 0, 1);
      speechdate1.setSeconds(speechseconds3 + speechseconds2);

      let speechsum = speechdate1
        .toTimeString()
        .replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");

      //console.log("speechsum", speechsum);

      const updateUser = await User.findByIdAndUpdate(
        req.body.userID,
        {
          recordedHours: subtract,
          pendingHours: sum,
          speechDuration: speechsubtract,
          pendingSpeechDuration: speechsum,
        },
        {
          new: true, //returns the updated data as response data
          runValidators: true, //mongoose validation
        },
      );
      //console.log("updateUser", updateUser);

      if (updateUser) {
        let coordinatorname = "";
        if (
          req.body.role == "Supervisor" ||
          req.body.role == "QualityChecker"
        ) {
          let coordname = await User.findById(req.body.userID, {
            coordinator: 1,
            _id: 0,
          });
          coordinatorname = coordname.coordinator;
          // console.log("Inside sup cordname", coordinatorname);
        } else if (req.body.role == "Coordinator") {
          coordinatorname = req.user.name;
          // console.log("Inside cord cordname", coordinatorname);
        }
        //console.log("coordinatorname", coordinatorname);
        let coordinatorRecordedHrs = await User.find(
          {
            role: "Coordinator",
            state: req.user.state,
            district: req.user.district,
            name: coordinatorname,
          },
          {
            recordedHours: 1,
            _id: 0,
          },
        );

        // console.log(
        //   "coordinatorRecordedHrs",
        //   coordinatorRecordedHrs[0].recordedHours
        // );
        let oldCordRecordedHrs =
          coordinatorRecordedHrs[0].recordedHours.split(":");
        let Cordseconds =
          +oldCordRecordedHrs[0] * 60 * 60 +
          +oldCordRecordedHrs[1] * 60 +
          +oldCordRecordedHrs[2];
        let newCordRecordedHrs = duration.split(":");
        let Cordseconds2 =
          +newCordRecordedHrs[0] * 60 * 60 +
          +newCordRecordedHrs[1] * 60 +
          +newCordRecordedHrs[2];

        let date = new Date(1970, 0, 1);
        //date.setSeconds(Cordseconds - Cordseconds2);

        let CoordinatorDiff = Cordseconds - Cordseconds2;
        if (CoordinatorDiff < 0) {
          CoordinatorDiff = 0;
        }
        date.setSeconds(CoordinatorDiff);

        let CordMinus = date
          .toTimeString()
          .replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
        // console.log("CordMinus", CordMinus);

        const CordupdateUser = await User.findOneAndUpdate(
          {
            role: "Coordinator",
            state: req.user.state,
            district: req.user.district,
            name: coordinatorname,
          },
          { recordedHours: CordMinus },
          {
            new: true, //returns the updated data as response data
            runValidators: true, //mongoose validation
          },
        );
        // console.log("CordupdateUser", CordupdateUser);
        // Move rejected files to GCP Rejected Folder
        const rejectedfileLocation = await FileDetail.findById(ids, {
          fileLocation: 1,
          speakerID: 1,
          state: 1,
          district: 1,
          _id: 0,
        });
        // console.log("rejectedfileLocation", rejectedfileLocation);

        const gcTempFiles =
          process.env.NODE_ENV === "production"
            ? gc.bucket(process.env.PROD_STORAGE_BUCKET)
            : gc.bucket(process.env.DEV_STORAGE_BUCKET);

        let oldPath =
          process.env.NODE_ENV === "production"
            ? rejectedfileLocation.fileLocation.split(
                `${process.env.PROD_STORAGE_BUCKET}/`,
              )[1]
            : rejectedfileLocation.fileLocation.split(
                `${process.env.DEV_STORAGE_BUCKET}/`,
              )[1];

        // https://storage.googleapis.com/staging-image-audio-recording/Audios/Uttarpradesh_JyotibaPhuleNagar/UP_JyotibaP_09050764_1205500530_Tajmahal.wav

        let newPath = oldPath.replace("Rejected", "");
        newPath = newPath.replace("Audios/", "RejectedAudios/");

        // let speakerFilePath = oldPath.replace(
        //   `Audios/${
        //     rejectedfileLocation.state + "_" + rejectedfileLocation.district
        //   }/`,
        //   `Speakerwisefiles/${rejectedfileLocation.speakerID}/`
        // );

        // console.log("newPath", newPath);
        // console.log("speakerFilePath", speakerFilePath);

        const [files] =
          process.env.NODE_ENV === "production"
            ? await gc.bucket(process.env.PROD_STORAGE_BUCKET).getFiles({
                //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                prefix: oldPath,
              })
            : await gc.bucket(process.env.DEV_STORAGE_BUCKET).getFiles({
                //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                prefix: oldPath,
              });

        //console.log("files", files);

        if (files.length > 0) {
          await gcTempFiles.file(oldPath).move(newPath);
        }

        // const [speakerfiles] =
        //   process.env.NODE_ENV === "production"
        //     ? await gc.bucket(process.env.PROD_STORAGE_BUCKET).getFiles({
        //         //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
        //         prefix: speakerFilePath,
        //       })
        //     : await gc.bucket(process.env.DEV_STORAGE_BUCKET).getFiles({
        //         //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
        //         prefix: speakerFilePath,
        //       });

        // if (speakerfiles.length > 0) {
        //   await gcTempFiles.file(speakerFilePath).delete();
        // }

        const GCPath =
          process.env.NODE_ENV === "production"
            ? `https://storage.googleapis.com/${process.env.PROD_STORAGE_BUCKET}/`
            : `https://storage.googleapis.com/${process.env.DEV_STORAGE_BUCKET}/`;

        let newFileLocation = GCPath + newPath;
        // console.log("newFileLocation", newFileLocation);

        const updateLocation = await FileDetail.findByIdAndUpdate(ids, {
          fileLocation: newFileLocation,
        });

        // console.log("updateLocation", updateLocation);
      }

      const userID = updatefile.userID;

      let qcPendingCount = await FileDetail.countDocuments({
        $and: [
          { userID: userID },
          { isQcAccepted: { $nin: [true] } },
          { status: "Accepted" },
          { inter1CheckStatus: "Accepted" },
        ],
      });

      //console.log("qcPendingCount1", qcPendingCount);

      let qcAcceptedCount = await FileDetail.countDocuments({
        $and: [
          { userID: userID },
          { isQcAccepted: true },
          { status: "Accepted" },
          { inter1CheckStatus: "Accepted" },
        ],
      });

      let qcCount = {
        qcAcceptedCount: qcAcceptedCount,
        qcPendingCount: qcPendingCount,
      };

      //console.log("qcAcceptedCount", qcAcceptedCount);

      if (qcPendingCount == 0 && qcAcceptedCount >= 10) {
        console.log("auto signOff");
        // console.log("userID", userID);
        const updateuser = await User.findByIdAndUpdate(userID, {
          autoSignOff: true,
          isQcSignedOff: true,
          qcSignOffDoneOn: Date.now(),
        });

        //console.log("updateuser", updateuser);
        if (updateuser) {
          // console.log("userid", updateuser._id);
          const userId = updateuser._id;
          const FileLocations = await FileDetail.find(
            {
              userID: userId,
              status: "Accepted",
              isQcAccepted: true,
              SegmentationStatus: "Completed",
            },
            {
              fileLocation: 1,
              JsonFileLocation: 1,
              state: 1,
              district: 1,
              _id: 1,
            },
          );
          //console.log("FileLocations", FileLocations);

          if (FileLocations.length > 0) {
            FileLocations.map(async (fileloc) => {
              //console.log("fileloc", fileloc.fileLocation);
              const gcTempFiles =
                process.env.NODE_ENV === "production"
                  ? gc.bucket(process.env.PROD_STORAGE_BUCKET)
                  : gc.bucket(process.env.DEV_STORAGE_BUCKET);

              let oldPath =
                process.env.NODE_ENV === "production"
                  ? fileloc.fileLocation.split(
                      `${process.env.PROD_STORAGE_BUCKET}/`,
                    )[1]
                  : fileloc.fileLocation.split(
                      `${process.env.DEV_STORAGE_BUCKET}/`,
                    )[1];

              let oldJsonPath =
                process.env.NODE_ENV === "production"
                  ? fileloc.JsonFileLocation.split(
                      `${process.env.PROD_STORAGE_BUCKET}/`,
                    )[1]
                  : fileloc.JsonFileLocation.split(
                      `${process.env.DEV_STORAGE_BUCKET}/`,
                    )[1];

              //console.log("oldPath", oldPath);
              //console.log("oldJsonPath", oldJsonPath);

              // https://storage.googleapis.com/staging-image-audio-recording/Audios/Uttarpradesh_JyotibaPhuleNagar/UP_JyotibaP_09050764_1205500530_Tajmahal.wav
              let state = fileloc.state.replace(/[^a-z\d]+/gi, "");
              let district = fileloc.district.replace(/[^a-z\d]+/gi, "");

              let curdate = new Date().toISOString().split("T");
              // console.log("curdate", curdate);
              let newPath = oldPath.replace("Rejected", "");
              newPath = newPath.replace(
                `Audios/${state + "_" + district}/`,
                `SengmentedFiles/${curdate[0]}/`,
              );

              //console.log("newPath", newPath);
              //console.log("newJsonPath", newJsonPath);

              if (newPath) {
                const [files] =
                  process.env.NODE_ENV === "production"
                    ? await gc
                        .bucket(process.env.PROD_STORAGE_BUCKET)
                        .getFiles({
                          //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                          prefix: oldPath,
                        })
                    : await gc.bucket(process.env.DEV_STORAGE_BUCKET).getFiles({
                        //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                        prefix: oldPath,
                      });

                if (files.length > 0) {
                  await gcTempFiles.file(oldPath).copy(newPath);
                }
              }

              let newJsonPath = oldJsonPath.replace("Rejected", "");
              newJsonPath = newJsonPath.replace(
                `SegmentationJsonFiles/${state + "_" + district}/`,
                `SengmentedFiles/${curdate[0]}/`,
              );

              if (newJsonPath) {
                const [jsonFiles] =
                  process.env.NODE_ENV === "production"
                    ? await gc
                        .bucket(process.env.PROD_STORAGE_BUCKET)
                        .getFiles({
                          //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                          prefix: oldJsonPath,
                        })
                    : await gc.bucket(process.env.DEV_STORAGE_BUCKET).getFiles({
                        //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                        prefix: oldJsonPath,
                      });

                if (jsonFiles.length > 0) {
                  await gcTempFiles.file(oldJsonPath).copy(newJsonPath);
                }
              }
            });
          }
        }
      }

      res.status(200).json({
        success: true,
        msg: `File Rejected Successfully`,
        data: qcCount,
      });
    }

    //console.log("updatefile", updatefile);
  } catch (err) {
    console.log("err", err);
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

// //@desc     Recover rejected file path and moved to rejected folder- Admin
// //@route    PUT /api/moverejectedfiles/
// //@access   Private
// //@usedBy   Audio Recording App
exports.updateMoveRejectedFiles = asyncHandler(async (req, res, next) => {
  try {
    const gcTempFiles =
      process.env.NODE_ENV === "production"
        ? gc.bucket(process.env.PROD_STORAGE_BUCKET)
        : gc.bucket(process.env.DEV_STORAGE_BUCKET);

    let oldPath =
      process.env.NODE_ENV === "production"
        ? "RejectedRejectedRejectedRejectedRejectedRejectedRejectedAudios"
        : "RejectedRejectedRejectedRejectedRejectedRejectedRejectedAudios";

    //console.log("oldPath", oldPath);

    // https://storage.googleapis.com/staging-image-audio-recording/Audios/Uttarpradesh_JyotibaPhuleNagar/UP_JyotibaP_09050764_1205500530_Tajmahal.wav

    const [files] =
      process.env.NODE_ENV === "production"
        ? await gc.bucket(process.env.PROD_STORAGE_BUCKET).getFiles({
            //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
            prefix: oldPath,
          })
        : await gc.bucket(process.env.DEV_STORAGE_BUCKET).getFiles({
            //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
            prefix: oldPath,
          });

    // console.log("files", files.length);
    let counter = 0;
    files.forEach(async (file) => {
      //console.log("filename", file.name);
      let state_district = file.name.split("/")[1];
      let fileName = file.name.split("/")[2];

      //console.log("state_district, fileName", state_district, fileName);
      //RejectedRejectedRejectedAudios
      let newPath = oldPath.replace(
        "RejectedRejectedRejectedRejectedRejectedRejectedRejectedAudios",
        "RejectedAudios",
      );
      newPath = newPath + "/" + state_district + "/" + fileName;
      // console.log("newPath", newPath);

      let fullOldPath = oldPath + "/" + state_district + "/" + fileName;
      // console.log("fullOldPath", fullOldPath);

      await gcTempFiles.file(fullOldPath).move(newPath);

      const GCPath =
        process.env.NODE_ENV === "production"
          ? `https://storage.googleapis.com/${process.env.PROD_STORAGE_BUCKET}/`
          : `https://storage.googleapis.com/${process.env.DEV_STORAGE_BUCKET}/`;

      let newFileLocation = GCPath + newPath;
      //console.log("newFileLocation", newFileLocation);

      const updateLocation = await FileDetail.findOneAndUpdate(
        { fileName: fileName, isQcAccepted: false },
        {
          fileLocation: newFileLocation,
        },
      );

      counter++;
      console.log("counter == files.length", counter, files.length);
      if (counter == files.length) {
        res.status(200).json({
          success: true,
          msg: `File Moved Successfully`,
          //data: userDetails,
        });
      }
    });
  } catch (err) {
    console.log("err", err);
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Bulk Reject File - Admin
//@route    PUT /api/rejectbulkfiles/
//@access   Private
//@usedBy   Audio Recording App
exports.updateRejectBulkFiles = asyncHandler(async (req, res, next) => {
  try {
    // let fileIds = [];
    // fileIds.push(req.body);
    let counter = 0;
    //console.log("req.body", req.body);

    // let ids = mongoose.Types.ObjectId(row._id);
    let ids = req.body.id;
    //console.log("ids", ids);
    let query = {};

    if (req.body.role == "Admin") {
      query = {
        rejectedByAdminId: req.user._id,
        rejectedByAdminName: req.user.name,
        AdminRejectedOn: Date.now(),
        AdminRejectionReason: req.body.AdminRejectionReason,
        status: "AdminRejected",
        isQcAccepted: false,
      };
    }

    //console.log("query", query);
    const updatefile = await FileDetail.findByIdAndUpdate(ids, query);
    const duration = req.body.fileDuration;

    if (updatefile) {
      console.log("Inside updatefile");
      const {
        gender,
        socioeconomicstatus,
        age,
        pincode,
        district,
        speechDurationSec,
      } = updatefile;

      const recordingRatio = await RecordingRatio.findOne({ district });
      const speechDuration = Math.floor(speechDurationSec);

      if (recordingRatio) {
        // Update district total recording hours
        recordingRatio.districtTotalRecordedSec -= speechDuration;

        if (recordingRatio.districtTotalRecordedSec < 0) {
          recordingRatio.districtTotalRecordedSec = 0;
        }

        // Update pincode data
        // if (!recordingRatio.pincodes.has(pincode)) {
        //   recordingRatio.pincodes.set(pincode, 0); // Initialize if pincode doesn't exist
        // }
        recordingRatio.pincodes.set(
          pincode,
          recordingRatio.pincodes.get(pincode) - speechDuration,
        );

        if (recordingRatio.pincodes.get(pincode) < 0) {
          recordingRatio.pincodes.set(pincode, 0);
        }

        const totalPincodes = recordingRatio.pincodes.size;

        // activate pincode
        if (
          recordingRatio.pincodes.get(pincode) <
          recordingRatio.districtTotalRecordedSec / totalPincodes
        ) {
          // Activate pincode
          await Pincode.findOneAndUpdate(
            { district, pincode: parseInt(pincode) },
            { isactive: true },
          );
        }

        // Update gender data
        if (recordingRatio.gender[gender] !== undefined) {
          recordingRatio.gender[gender] -= speechDuration;

          if (recordingRatio.gender[gender] < 0) {
            recordingRatio.gender[gender] = 0;
          }
        }

        // Update socioeconomic data
        if (recordingRatio.socioeconomic[socioeconomicstatus] !== undefined) {
          recordingRatio.socioeconomic[socioeconomicstatus] -= speechDuration;

          if (recordingRatio.socioeconomic[socioeconomicstatus] < 0) {
            recordingRatio.socioeconomic[socioeconomicstatus] = 0;
          }
        }

        const ageGroup = getAgeGroup(age);
        // Update age group data
        if (recordingRatio.ageGroup[ageGroup] !== undefined) {
          recordingRatio.ageGroup[ageGroup] -= speechDuration;

          if (recordingRatio.ageGroup[ageGroup] < 0) {
            recordingRatio.ageGroup[ageGroup] = 0;
          }
        }
      }

      await recordingRatio.save();

      const imageName = updatefile.imageName;
      //const district = updatefile.district;

      const imageDetails = await Image.findOne({
        imgname: imageName,
        district: district,
      });

      if (imageDetails) {
        const oldImageRecordingDurationSec =
          imageDetails.imageRecordingDurationSec;

        let newImageRecordingDurationSec =
          oldImageRecordingDurationSec - updatefile.speechDurationSec;

        if (newImageRecordingDurationSec < 0) {
          newImageRecordingDurationSec = 0;
        }

        const newImageRecordingDuration = new Date(
          newImageRecordingDurationSec * 1000,
        )
          .toISOString()
          .slice(11, 19);

        await Image.findByIdAndUpdate(imageDetails._id, {
          imageRecordingDurationSec: newImageRecordingDurationSec,
          imageRecordingDuration: newImageRecordingDuration,
        });
      }

      let recordedHrs = await User.findById(req.body.userID, {
        recordedHours: 1,
        pendingHours: 1,
        _id: 0,
      });
      //console.log("recordedHrs", row.userID, recordedHrs);
      let oldRecordedHrs = recordedHrs.recordedHours.split(":");
      let seconds =
        +oldRecordedHrs[0] * 60 * 60 +
        +oldRecordedHrs[1] * 60 +
        +oldRecordedHrs[2];
      let newRecordedHrs = duration.split(":");
      let seconds2 =
        +newRecordedHrs[0] * 60 * 60 +
        +newRecordedHrs[1] * 60 +
        +newRecordedHrs[2];

      let date = new Date(1970, 0, 1);
      //date.setSeconds(seconds - seconds2);

      let AdminRejectdiff = seconds - seconds2;
      if (AdminRejectdiff < 0) {
        AdminRejectdiff = 0;
      }

      date.setSeconds(AdminRejectdiff);

      let subtract = date
        .toTimeString()
        .replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
      //console.log("subtract", subtract);

      let oldPendingHrs = recordedHrs.pendingHours.split(":");
      let seconds3 =
        +oldPendingHrs[0] * 60 * 60 +
        +oldPendingHrs[1] * 60 +
        +oldPendingHrs[2];

      let date1 = new Date(1970, 0, 1);
      date1.setSeconds(seconds3 + seconds2);

      // console.log(
      //   "date1, seconds3, oldPendingHrs",
      //   date1,
      //   seconds3,
      //   oldPendingHrs
      // );
      let sum = date1.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
      //console.log("sum", sum);

      const updateUser = await User.findByIdAndUpdate(
        req.body.userID,
        { recordedHours: subtract, pendingHours: sum },
        {
          new: true, //returns the updated data as response data
          runValidators: true, //mongoose validation
        },
      );
      //console.log("updateUser", updateUser);

      if (updateUser) {
        let coordinatorname = "";
        if (req.body.role == "Admin") {
          let coordname = await User.findById(req.body.userID, {
            coordinator: 1,
            _id: 0,
          });
          coordinatorname = coordname.coordinator;
          //console.log("Inside sup cordname", coordinatorname);
        }
        //console.log("coordinatorname", coordinatorname);
        let coordinatorRecordedHrs = await User.find(
          {
            role: "Coordinator",
            state: req.body.state,
            district: req.body.district,
            name: coordinatorname,
          },
          {
            recordedHours: 1,
            _id: 0,
          },
        );

        // console.log(
        //   "coordinatorRecordedHrs",
        //   coordinatorRecordedHrs[0].recordedHours
        // );
        let oldCordRecordedHrs =
          coordinatorRecordedHrs[0].recordedHours.split(":");
        let Cordseconds =
          +oldCordRecordedHrs[0] * 60 * 60 +
          +oldCordRecordedHrs[1] * 60 +
          +oldCordRecordedHrs[2];
        let newCordRecordedHrs = duration.split(":");
        let Cordseconds2 =
          +newCordRecordedHrs[0] * 60 * 60 +
          +newCordRecordedHrs[1] * 60 +
          +newCordRecordedHrs[2];

        let date = new Date(1970, 0, 1);
        //date.setSeconds(Cordseconds - Cordseconds2);

        let AdminCordRejectdiff = Cordseconds - Cordseconds2;
        if (AdminCordRejectdiff < 0) {
          AdminCordRejectdiff = 0;
        }

        date.setSeconds(AdminCordRejectdiff);

        let CordMinus = date
          .toTimeString()
          .replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
        //console.log("CordMinus", CordMinus);

        const CordupdateUser = await User.findOneAndUpdate(
          {
            role: "Coordinator",
            state: req.body.state,
            district: req.body.district,
            name: coordinatorname,
          },
          { recordedHours: CordMinus },
          {
            new: true, //returns the updated data as response data
            runValidators: true, //mongoose validation
          },
        );
        //console.log("CordupdateUser", CordupdateUser);
        // Move rejected files to GCP Rejected Folder
        const rejectedfileLocation = await FileDetail.findById(ids, {
          fileLocation: 1,
          _id: 0,
        });
        //console.log("rejectedfileLocation", rejectedfileLocation);

        const gcTempFiles =
          process.env.NODE_ENV === "production"
            ? gc.bucket(process.env.PROD_STORAGE_BUCKET)
            : gc.bucket(process.env.DEV_STORAGE_BUCKET);

        let oldPath =
          process.env.NODE_ENV === "production"
            ? rejectedfileLocation.fileLocation.split(
                `${process.env.PROD_STORAGE_BUCKET}/`,
              )[1]
            : rejectedfileLocation.fileLocation.split(
                `${process.env.DEV_STORAGE_BUCKET}/`,
              )[1];

        // https://storage.googleapis.com/staging-image-audio-recording/Audios/Uttarpradesh_JyotibaPhuleNagar/UP_JyotibaP_09050764_1205500530_Tajmahal.wav
        let newPath = oldPath.replace("Rejected", "");
        newPath = newPath.replace("Audios/", "RejectedAudios/");

        //console.log("newPath", newPath);

        const [files] =
          process.env.NODE_ENV === "production"
            ? await gc.bucket(process.env.PROD_STORAGE_BUCKET).getFiles({
                //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                prefix: oldPath,
              })
            : await gc.bucket(process.env.DEV_STORAGE_BUCKET).getFiles({
                //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                prefix: oldPath,
              });

        //console.log("files", files);

        if (files.length > 0) {
          await gcTempFiles.file(oldPath).move(newPath);
        }

        const GCPath =
          process.env.NODE_ENV === "production"
            ? `https://storage.googleapis.com/${process.env.PROD_STORAGE_BUCKET}/`
            : `https://storage.googleapis.com/${process.env.DEV_STORAGE_BUCKET}/`;

        let newFileLocation = GCPath + newPath;
        //console.log("newFileLocation", newFileLocation);

        const updateLocation = await FileDetail.findByIdAndUpdate(ids, {
          fileLocation: newFileLocation,
        });

        //console.log("updateLocation", updateLocation);
      }
    }

    //console.log("updatefile", updatefile);
    counter++;

    res.status(200).json({
      success: true,
      msg: `File Rejected Successfully`,
      //data: userDetails,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     RollBack Files - Admin
//@route    PUT /api/rollbackfiles/
//@access   Private
//@usedBy   Audio Recording App
exports.updateRollBackFiles = asyncHandler(async (req, res, next) => {
  try {
    let ids = req.body.id;
    // console.log("req.body", req.body);
    let query = {};
    let query1 = {};

    if (req.body.role == "Admin") {
      query = {
        isQcAccepted: false,
        status: "Accepted",
      };
    }

    //console.log("query", query);
    const duration = req.body.fileDuration;
    const updatefile = await FileDetail.findByIdAndUpdate(ids, {
      $set: query,
    });

    if (updatefile) {
      if (req.body.status == "Accepted") {
        const acceptedfileLocation = await FileDetail.findById(ids, {
          fileLocation: 1,
          qcAcceptedOn: 1,
          state: 1,
          district: 1,
          _id: 0,
        });
        // console.log("rejectedfileLocation", rejectedfileLocation);

        const gcTempFiles =
          process.env.NODE_ENV === "production"
            ? gc.bucket(process.env.PROD_STORAGE_BUCKET)
            : gc.bucket(process.env.DEV_STORAGE_BUCKET);

        let oldPath =
          process.env.NODE_ENV === "production"
            ? acceptedfileLocation.fileLocation.split(
                `${process.env.PROD_STORAGE_BUCKET}/`,
              )[1]
            : acceptedfileLocation.fileLocation.split(
                `${process.env.DEV_STORAGE_BUCKET}/`,
              )[1];

        // https://storage.googleapis.com/staging-image-audio-recording/Audios/Uttarpradesh_JyotibaPhuleNagar/UP_JyotibaP_09050764_1205500530_Tajmahal.wav

        // let newPath = oldPath.replace("Rejected", "");
        // newPath = oldPath.replace("Audios/", "QCFiles/");

        let nPath = acceptedfileLocation.qcAcceptedOn.toISOString().split("T");
        // nPath = nPath.split("T");
        console.log(nPath);

        let newPath = oldPath.replace(
          `Audios/${
            acceptedfileLocation.state + "_" + acceptedfileLocation.district
          }/`,
          `QCFiles/${nPath[0]}/`,
        );

        const [files] =
          process.env.NODE_ENV === "production"
            ? await gc.bucket(process.env.PROD_STORAGE_BUCKET).getFiles({
                //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                prefix: newPath,
              })
            : await gc.bucket(process.env.DEV_STORAGE_BUCKET).getFiles({
                //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                prefix: newPath,
              });

        //console.log("files", files);

        if (files.length > 0) {
          await gcTempFiles.file(newPath).delete();

          if (req.body.role == "Admin") {
            query1 = {
              acceptedByQcId: "",
              acceptedByQcName: "",
              qcAcceptedOn: "",
            };
          }

          //console.log("query", query);

          const updatefile = await FileDetail.findByIdAndUpdate(ids, {
            $unset: query1,
          });
        }
      } else if (req.body.status == "QcRejected") {
        const rejectedfileLocation = await FileDetail.findById(ids, {
          fileLocation: 1,
          qcAcceptedOn: 1,
          state: 1,
          district: 1,
          _id: 0,
        });
        // console.log("rejectedfileLocation", rejectedfileLocation);
        // https://storage.googleapis.com/staging-image-audio-recording/RejectedAudios/Maharashtra_Pune/MH_Pune_Test09878_0557390000_Gandhi.wav

        const gcTempFiles =
          process.env.NODE_ENV === "production"
            ? gc.bucket(process.env.PROD_STORAGE_BUCKET)
            : gc.bucket(process.env.DEV_STORAGE_BUCKET);

        let oldPath =
          process.env.NODE_ENV === "production"
            ? rejectedfileLocation.fileLocation.split(
                `${process.env.PROD_STORAGE_BUCKET}/`,
              )[1]
            : rejectedfileLocation.fileLocation.split(
                `${process.env.DEV_STORAGE_BUCKET}/`,
              )[1];

        // https://storage.googleapis.com/staging-image-audio-recording/Audios/Uttarpradesh_JyotibaPhuleNagar/UP_JyotibaP_09050764_1205500530_Tajmahal.wav

        let newPath = oldPath.replace("RejectedAudios", "Audios");

        // console.log("newPath", newPath);

        const [files] =
          process.env.NODE_ENV === "production"
            ? await gc.bucket(process.env.PROD_STORAGE_BUCKET).getFiles({
                //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                prefix: oldPath,
              })
            : await gc.bucket(process.env.DEV_STORAGE_BUCKET).getFiles({
                //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                prefix: oldPath,
              });

        // console.log("files", files);

        if (files.length > 0) {
          await gcTempFiles.file(oldPath).move(newPath);

          const GCPath =
            process.env.NODE_ENV === "production"
              ? `https://storage.googleapis.com/${process.env.PROD_STORAGE_BUCKET}/`
              : `https://storage.googleapis.com/${process.env.DEV_STORAGE_BUCKET}/`;

          let newFileLocation = GCPath + newPath;
          // console.log("newFileLocation", newFileLocation);

          const updateLocation = await FileDetail.findByIdAndUpdate(ids, {
            fileLocation: newFileLocation,
          });

          if (req.body.role == "Admin") {
            query1 = {
              qcRejectedOn: "",
              qcRejectionReason: "",
              rejectedByQcId: "",
              rejectedByQcName: "",
            };
          }

          //console.log("query", query);

          const updatefile = await FileDetail.findByIdAndUpdate(ids, {
            $unset: query1,
          });

          let recordedHrs = await User.findById(req.body.userID, {
            recordedHours: 1,
            pendingHours: 1,
            _id: 0,
          });
          //console.log("recordedHrs", row.userID, recordedHrs);
          let oldRecordedHrs = recordedHrs.recordedHours.split(":");
          let seconds =
            +oldRecordedHrs[0] * 60 * 60 +
            +oldRecordedHrs[1] * 60 +
            +oldRecordedHrs[2];
          let newRecordedHrs = duration.split(":");
          let seconds2 =
            +newRecordedHrs[0] * 60 * 60 +
            +newRecordedHrs[1] * 60 +
            +newRecordedHrs[2];

          let date = new Date(1970, 0, 1);
          date.setSeconds(seconds - seconds2);

          let subtract = date
            .toTimeString()
            .replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
          //console.log("subtract", subtract);

          let oldPendingHrs = recordedHrs.pendingHours.split(":");
          let seconds3 =
            +oldPendingHrs[0] * 60 * 60 +
            +oldPendingHrs[1] * 60 +
            +oldPendingHrs[2];

          let date1 = new Date(1970, 0, 1);
          date1.setSeconds(seconds3 + seconds2);

          // console.log(
          //   "date1, seconds3, oldPendingHrs",
          //   date1,
          //   seconds3,
          //   oldPendingHrs
          // );
          let sum = date1
            .toTimeString()
            .replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
          //console.log("sum", sum);

          const updateUser = await User.findByIdAndUpdate(
            req.body.userID,
            { recordedHours: subtract, pendingHours: sum },
            {
              new: true, //returns the updated data as response data
              runValidators: true, //mongoose validation
            },
          );
          //console.log("updateUser", updateUser);

          if (updateUser) {
            let coordinatorname = "";
            if (req.body.role == "Admin") {
              let coordname = await User.findById(req.body.userID, {
                coordinator: 1,
                _id: 0,
              });
              coordinatorname = coordname.coordinator;
              //console.log("Inside sup cordname", coordinatorname);
            }
            //console.log("coordinatorname", coordinatorname);
            let coordinatorRecordedHrs = await User.find(
              {
                role: "Coordinator",
                state: req.body.state,
                district: req.body.district,
                name: coordinatorname,
              },
              {
                recordedHours: 1,
                _id: 0,
              },
            );

            // console.log(
            //   "coordinatorRecordedHrs",
            //   coordinatorRecordedHrs[0].recordedHours
            // );
            let oldCordRecordedHrs =
              coordinatorRecordedHrs[0].recordedHours.split(":");
            let Cordseconds =
              +oldCordRecordedHrs[0] * 60 * 60 +
              +oldCordRecordedHrs[1] * 60 +
              +oldCordRecordedHrs[2];
            let newCordRecordedHrs = duration.split(":");
            let Cordseconds2 =
              +newCordRecordedHrs[0] * 60 * 60 +
              +newCordRecordedHrs[1] * 60 +
              +newCordRecordedHrs[2];

            let date = new Date(1970, 0, 1);
            date.setSeconds(Cordseconds - Cordseconds2);

            let CordMinus = date
              .toTimeString()
              .replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
            //console.log("CordMinus", CordMinus);

            const CordupdateUser = await User.findOneAndUpdate(
              {
                role: "Coordinator",
                state: req.body.state,
                district: req.body.district,
                name: coordinatorname,
              },
              { recordedHours: CordMinus },
              {
                new: true, //returns the updated data as response data
                runValidators: true, //mongoose validation
              },
            );
            //console.log("CordupdateUser", CordupdateUser);
          }
        }
      }
    }

    //const duration = req.body.fileDuration;

    res.status(200).json({
      success: true,
      msg: `File Rollback Successfully`,
      //data: userDetails,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Accept File - QualityChecker
//@route    PUT /api/qcacceptfile/
//@access   Private
//@usedBy   Audio Recording App
exports.updateQcAcceptFile = asyncHandler(async (req, res, next) => {
  try {
    //console.log("req.body", req.body);
    // console.log("req.user", req.user);
    let ids = mongoose.Types.ObjectId(req.body.id);

    let qcCheckExist = await FileDetail.exists({
      _id: ids,
      $or: [
        { acceptedByQcId: { $exists: true } },
        { rejectedByQcId: { $exists: true } },
      ],
    });

    if (qcCheckExist) {
      return next(
        new ErrorResponse(
          "This file has already been QC'd (Accepted or Rejected). Please try a different SpeakerID.",
          [],
          401,
        ),
      );
    }

    let folderPath = `SegmentationJsonFiles/${req.body.state}_${req.body.district}/`;
    let gcFileName = folderPath + req.body.fileName.replace(".wav", ".json");

    const jsonPath =
      process.env.NODE_ENV === "production"
        ? `https://storage.googleapis.com/${process.env.PROD_STORAGE_BUCKET}/${gcFileName}`
        : `https://storage.googleapis.com/${process.env.DEV_STORAGE_BUCKET}/${gcFileName}`;

    //console.log("jsonPath", jsonPath);

    let checkSegmentationStatus = await FileDetail.findById(ids, {
      SegmentationStatus: 1,
      _id: 0,
    });

    //console.log("checkSegmentationStatus", checkSegmentationStatus);

    let query = {
      acceptedByQcId: req.user._id,
      acceptedByQcName: req.user.name,
      isQcAccepted: true,
      qcAcceptedOn: Date.now(),
      SegmentationStatus:
        checkSegmentationStatus.SegmentationStatus == "Completed"
          ? "Completed"
          : "Open",
      JsonFileLocation: jsonPath,
      JsonFileName: req.body.fileName.replace(".wav", ".json"),
      //SegmentationfolderPath: folderPath,
    };

    //console.log("query", query);
    const updatefile = await FileDetail.findByIdAndUpdate(ids, query);

    if (updatefile) {
      const {
        // gender,
        // socioeconomicstatus,
        // age,
        // pincode,
        // district,
        // speechDurationSec,
        userID,
      } = updatefile;

      let qcPendingCount = await FileDetail.countDocuments({
        $and: [
          { userID: userID },
          { isQcAccepted: { $nin: [true] } },
          { status: "Accepted" },
          { inter1CheckStatus: "Accepted" },
        ],
      });

      // console.log("qcPendingCount1", qcPendingCount);

      let qcAcceptedCount = await FileDetail.countDocuments({
        $and: [
          { userID: userID },
          { isQcAccepted: true },
          { status: "Accepted" },
          { inter1CheckStatus: "Accepted" },
        ],
      });

      // console.log("qcAcceptedCount", qcAcceptedCount);

      let qcCount = {
        qcAcceptedCount: qcAcceptedCount,
        qcPendingCount: qcPendingCount,
      };

      if (qcPendingCount == 0 && qcAcceptedCount >= 10) {
        // console.log("userID", userID);
        const updateuser = await User.findByIdAndUpdate(userID, {
          autoSignOff: true,
          isQcSignedOff: true,
          qcSignOffDoneOn: Date.now(),
        });

        //console.log("updateuser", updateuser);
        if (updateuser) {
          // console.log("userid", updateuser._id);
          const userId = updateuser._id;
          const FileLocations = await FileDetail.find(
            {
              userID: userId,
              status: "Accepted",
              isQcAccepted: true,
              SegmentationStatus: "Completed",
            },
            {
              fileLocation: 1,
              JsonFileLocation: 1,
              state: 1,
              district: 1,
              _id: 1,
            },
          );
          //console.log("FileLocations", FileLocations);

          if (FileLocations.length > 0) {
            FileLocations.map(async (fileloc) => {
              //console.log("fileloc", fileloc.fileLocation);
              const gcTempFiles =
                process.env.NODE_ENV === "production"
                  ? gc.bucket(process.env.PROD_STORAGE_BUCKET)
                  : gc.bucket(process.env.DEV_STORAGE_BUCKET);

              let oldPath =
                process.env.NODE_ENV === "production"
                  ? fileloc.fileLocation.split(
                      `${process.env.PROD_STORAGE_BUCKET}/`,
                    )[1]
                  : fileloc.fileLocation.split(
                      `${process.env.DEV_STORAGE_BUCKET}/`,
                    )[1];

              let oldJsonPath =
                process.env.NODE_ENV === "production"
                  ? fileloc.JsonFileLocation.split(
                      `${process.env.PROD_STORAGE_BUCKET}/`,
                    )[1]
                  : fileloc.JsonFileLocation.split(
                      `${process.env.DEV_STORAGE_BUCKET}/`,
                    )[1];

              //console.log("oldPath", oldPath);
              //console.log("oldJsonPath", oldJsonPath);

              // https://storage.googleapis.com/staging-image-audio-recording/Audios/Uttarpradesh_JyotibaPhuleNagar/UP_JyotibaP_09050764_1205500530_Tajmahal.wav
              let state = fileloc.state.replace(/[^a-z\d]+/gi, "");
              let district = fileloc.district.replace(/[^a-z\d]+/gi, "");

              let curdate = new Date().toISOString().split("T");
              // console.log("curdate", curdate);
              let newPath = oldPath.replace("Rejected", "");
              newPath = newPath.replace(
                `Audios/${state + "_" + district}/`,
                `SengmentedFiles/${curdate[0]}/`,
              );

              //console.log("newPath", newPath);
              //console.log("newJsonPath", newJsonPath);

              if (newPath) {
                const [files] =
                  process.env.NODE_ENV === "production"
                    ? await gc
                        .bucket(process.env.PROD_STORAGE_BUCKET)
                        .getFiles({
                          //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                          prefix: oldPath,
                        })
                    : await gc.bucket(process.env.DEV_STORAGE_BUCKET).getFiles({
                        //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                        prefix: oldPath,
                      });

                if (files.length > 0) {
                  await gcTempFiles.file(oldPath).copy(newPath);
                }
              }

              let newJsonPath = oldJsonPath.replace("Rejected", "");
              newJsonPath = newJsonPath.replace(
                `SegmentationJsonFiles/${state + "_" + district}/`,
                `SengmentedFiles/${curdate[0]}/`,
              );

              if (newJsonPath) {
                const [jsonFiles] =
                  process.env.NODE_ENV === "production"
                    ? await gc
                        .bucket(process.env.PROD_STORAGE_BUCKET)
                        .getFiles({
                          //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                          prefix: oldJsonPath,
                        })
                    : await gc.bucket(process.env.DEV_STORAGE_BUCKET).getFiles({
                        //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                        prefix: oldJsonPath,
                      });

                if (jsonFiles.length > 0) {
                  await gcTempFiles.file(oldJsonPath).copy(newJsonPath);
                }
              }
            });
          }
          // const FileLocations = await FileDetail.find(
          //   { userID: userId, status: "Accepted", isQcAccepted: true },
          //   {
          //     fileLocation: 1,
          //     state: 1,
          //     district: 1,
          //     speakerID: 1,
          //     _id: 1,
          //   }
          // );

          // if (FileLocations.length > 0) {
          //   FileLocations.map(async (fileloc) => {
          //     //console.log("fileloc", fileloc.fileLocation);
          //     const gcTempFiles =
          //       process.env.NODE_ENV === "production"
          //         ? gc.bucket(process.env.PROD_STORAGE_BUCKET)
          //         : gc.bucket(process.env.DEV_STORAGE_BUCKET);

          //     let oldPath =
          //       process.env.NODE_ENV === "production"
          //         ? fileloc.fileLocation.split(`${process.env.PROD_STORAGE_BUCKET}/`)[1]
          //         : fileloc.fileLocation.split(
          //             `${process.env.DEV_STORAGE_BUCKET}/`
          //           )[1];

          //     // https://storage.googleapis.com/staging-image-audio-recording/Audios/Uttarpradesh_JyotibaPhuleNagar/UP_JyotibaP_09050764_1205500530_Tajmahal.wav
          //     let state = fileloc.state.replace(/[^a-z\d]+/gi, "");
          //     let district = fileloc.district.replace(/[^a-z\d]+/gi, "");
          //     let speakerID = fileloc.speakerID;

          //     let curdate = new Date().toISOString().split("T");
          //     // console.log("curdate", curdate);
          //     let newPath = oldPath.replace("Rejected", "");
          //     newPath = newPath.replace(
          //       `Audios/${state + "_" + district}/`,
          //       `QCFiles/${curdate[0]}/${speakerID}/`
          //     );

          //     // console.log("newPath", newPath);

          //     const [files] =
          //       process.env.NODE_ENV === "production"
          //         ? await gc.bucket(process.env.PROD_STORAGE_BUCKET).getFiles({
          //             //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
          //             prefix: oldPath,
          //           })
          //         : await gc.bucket(process.env.DEV_STORAGE_BUCKET).getFiles({
          //             //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
          //             prefix: oldPath,
          //           });

          //     //console.log("files", files.length);

          //     if (files.length > 0) {
          //       await gcTempFiles.file(oldPath).copy(newPath);
          //     }
          //   });
          // }
        }
      } else {
      }

      res.status(200).json({
        success: true,
        msg: `Files Accepted Successfully`,
        data: qcCount,
      });
    }
  } catch (err) {
    console.log("err", err);
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Update Speaker - Intra1
//@route    PUT /api/updateintraspeaker/
//@access   Private
//@usedBy   Audio Recording App
exports.updateIntraSpeaker = asyncHandler(async (req, res, next) => {
  try {
    // console.log("req.body", req.body);
    // console.log("req.user", req.user);
    let ids = mongoose.Types.ObjectId(req.body.id);
    //console.log("ids", ids);
    let query = {};

    if (req.body.role == "Intra1") {
      query = {
        intra1Speaker: req.body.intra1Speaker,
        intra1SpeakerCheckedBy: req.user.name,
      };
      //console.log("query", query);
      if (
        req.body.intra1Speaker != null ||
        req.body.intra1Speaker != undefined
      ) {
        const updatefile = await FileDetail.findByIdAndUpdate(ids, query);
      }

      //console.log("updatefile", updatefile);
    }

    res.status(200).json({
      success: true,
      msg: `Speaker updated Successfully`,
      //data: userDetails,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Accept/Hold File - Intra1, Intra2
//@route    PUT /api/intraacceptrejectfile/
//@access   Private
//@usedBy   Audio Recording App
exports.updateIntraAcceptRejectFile = asyncHandler(async (req, res, next) => {
  try {
    // console.log("req.body", req.body);
    // console.log("req.user", req.user);
    let ids = mongoose.Types.ObjectId(req.body.id);
    //console.log("ids", ids);
    let query = {};

    if (req.body.role == "Intra1") {
      query = {
        intra1CheckById: req.user._id,
        intra1CheckByName: req.user.name,
        intra1CheckStatus: req.body.intra1CheckStatus,
        //intra1Speaker: req.body.intra1Speaker,
        intra1CheckedOn: Date.now(),
      };
      //console.log("query", query);
      const updatefile = await FileDetail.findByIdAndUpdate(ids, query);
      //console.log("updatefile", updatefile);
    } else if (req.body.role == "Intra2") {
      query = {
        intra2CheckById: req.user._id,
        intra2CheckByName: req.user.name,
        intra2CheckStatus: req.body.intra2CheckStatus,
        intra2CheckedOn: Date.now(),
      };
      console.log("query", query);
      const updatefile = await FileDetail.findByIdAndUpdate(ids, query);
      console.log("updatefile", updatefile);
    }

    res.status(200).json({
      success: true,
      msg: `File Submitted/Accepted Successfully`,
      //data: userDetails,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Accept/Duplicate File - Inter1, Inter2
//@route    PUT /api/interuniqueduplicatefile/
//@access   Private
//@usedBy   Audio Recording App
exports.updateInterUniqueDuplicateFile = asyncHandler(
  async (req, res, next) => {
    try {
      // console.log("req.body", req.body);
      // console.log("req.user", req.user);
      let userid = mongoose.Types.ObjectId(req.body.userID);
      //console.log("userid", userid);
      let query = {};

      if (req.body.role == "Inter1") {
        query = {
          inter1CheckById: req.user._id,
          inter1CheckByName: req.user.name,
          inter1CheckStatus: req.body.inter1CheckStatus,
          inter1CheckedOn: Date.now(),
          // inter1DuplicateSpeaker: req.body.inter1DuplicateSpeaker
          //   ? req.body.inter1DuplicateSpeaker
          //   : "",
        };

        //console.log("query", query);
        const updatefile = await FileDetail.updateMany(
          {
            userID: userid,
            status: "Accepted",
            isQcAccepted: true,
            fileDurationSecs: { $gt: 10, $lt: 25 },
          },
          { $set: query },
        );
        //console.log("updatefile", updatefile);
      } else if (req.body.role == "Inter2") {
        //console.log("Inside Inter2");
        query = {
          inter2CheckById: req.user._id,
          inter2CheckByName: req.user.name,
          inter2CheckStatus: req.body.inter2CheckStatus,
          inter2CheckedOn: Date.now(),
          // inter2DuplicateSpeaker: req.body.inter2DuplicateSpeaker
          //   ? req.body.inter2DuplicateSpeaker
          //   : "",
        };
        //console.log("query", query);
        const updatefile = await FileDetail.updateMany(
          {
            userID: userid,
            status: "Accepted",
            isQcAccepted: true,
            fileDurationSecs: { $gt: 10, $lt: 25 },
          },
          { $set: query },
        );
        //console.log("updatefile", updatefile);
      }

      res.status(200).json({
        success: true,
        msg: `File updated Successfully`,
        //data: userDetails,
      });
    } catch (err) {
      return next(new ErrorResponse("Internal server error", [err], 500));
    }
  },
);

//@desc     Get All Files - Admin
//@route    GET /api/getallfiles/
//@access   Private
//@usedBy   Audio Recording App
exports.getAllFiles = asyncHandler(async (req, res, next) => {
  try {
    const { state, district, coordinator } = req.query;
    //console.log("state, district, coordinator", state, district, coordinator);

    const fileList = await FileDetail.find(
      {
        state,
        district,
        coordinatorName: coordinator,
        recordedOn: { $gte: new Date("2023-05-01") },
      },
      {
        fileName: 1,
        fileDuration: 1,
        speechDuration: 1,
        status: 1,
        isPaid: 1,
        rate: 1,
        fileLocation: 1,
        vendorName: 1,
        imageName: 1,
        recordedOn: 1,
        state: 1,
        district: 1,
        coordinatorName: 1,
        userID: 1,
        pincode: 1,
        age: 1,
        gender: 1,
        language: 1,
        qualification: 1,
        stayingyears: 1,
        socioeconomicstatus: 1,
        speakerID: 1,
        imageLocation: 1,
        isQcAccepted: 1,
        acceptedByQcName: 1,
        rejectedByQcName: 1,
        qcRejectionReason: 1,
        supervisorRejectionReason: 1,
        coordinatorRejectionReason: 1,
        phonebrand: 1,
        knownlanguages: 1,
        intra1CheckStatus: 1,
        inter1CheckStatus: 1,
      },
    );
    //console.log("fileList length", fileList.length);
    res.status(200).json({
      success: true,
      msg: `File List`,
      data: fileList,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Get State wise Files - Admin
//@route    GET /api/getstatefilelist/
//@access   Private
//@usedBy   Audio Recording App
exports.getStateFileList = asyncHandler(async (req, res, next) => {
  try {
    const { state } = req.query;

    console.log("state,", state);

    const fileList = await FileDetail.find(
      {
        state,
      },
      {
        fileName: 1,
        fileDuration: 1,
        status: 1,
        isPaid: 1,
        rate: 1,
        fileLocation: 1,
        vendorName: 1,
        imageName: 1,
        recordedOn: 1,
        state: 1,
        district: 1,
        coordinatorName: 1,
        userID: 1,
        pincode: 1,
        age: 1,
        gender: 1,
        language: 1,
        qualification: 1,
        stayingyears: 1,
        socioeconomicstatus: 1,
        speakerID: 1,
        isQcAccepted: 1,
        acceptedByQcName: 1,
        rejectedByQcName: 1,
      },
    );

    //console.log("fileList", fileList.length);
    res.status(200).json({
      success: true,
      msg: `File List`,
      data: fileList,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Get Districtwise Files - Customer
//@route    GET /api/getdistrictwisefiles/
//@access   Private
//@usedBy   Audio Recording App
exports.getDistrictwiseFiles = asyncHandler(async (req, res, next) => {
  try {
    const { state, district } = req.query;

    console.log("state, district, coordinator", state, district);

    const fileList = await FileDetail.find(
      {
        state,
        district,
        status: "Accepted",
      },
      {
        fileName: 1,
        fileDuration: 1,
        //status: 1,
        //isPaid: 1,
        //rate: 1,
        silenceRemovedLocation: 1,
        //vendorName: 1,
        imageName: 1,
        recordedOn: 1,
        state: 1,
        district: 1,
      },
    );

    //console.log("fileList", fileList);
    res.status(200).json({
      success: true,
      msg: `File List`,
      data: fileList,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Get All image Files - Admin
//@route    GET /api/getallimagefiles/
//@access   Public
//@usedBy   Audio Recording App
exports.getAllImageFiles = asyncHandler(async (req, res, next) => {
  try {
    const { state, district } = req.query;

    console.log("state, district", state, district);

    const imagefileList = await Image.find(
      {
        state,
        district,
        isavailable: true,
      },
      {
        imgname: 1,
        imgLocation: 1,
        uploadedOn: 1,
        _id: 0,
      },
    );

    console.log("fileList", imagefileList);
    res.status(200).json({
      success: true,
      msg: `Image File List`,
      data: imagefileList,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Upload Image Files - Admin
//@route    Post /api/uploadimagefile/
//@access   Private
//@usedBy   Audio Recording App Admin
exports.uploadImageFiles = asyncHandler(async (req, res, next) => {
  try {
    let { imgname, imgLocation, state, district, isavailable, fileType } =
      req.body;

    console.log("req.body", req.body);

    //console.log("fileType", fileType);
    const UserDistrct = district.replace(/[^a-z\d]+/gi, "");
    const UserState = state.replace(/[^a-z\d]+/gi, "");

    const distdtls = await District.find(
      { state: UserState, district: UserDistrct },
      {
        phase: 2,
        _id: 0,
      },
    );

    const phase = distdtls[0].phase;
    //File is uploading to the GC backet

    const gcTempFiles =
      process.env.NODE_ENV === "production"
        ? gc.bucket(process.env.PROD_STORAGE_BUCKET)
        : gc.bucket(process.env.DEV_STORAGE_BUCKET);

    const folderPath = "Images/" + UserState + "_" + UserDistrct + "/";
    const gcFileName = folderPath + imgname;

    const tempBody = {
      imgname,
      imgLocation,
      state,
      district,
      isavailable,
      phase,
    };

    console.log("tempBody", tempBody);
    const imagedetails = await Image.create(tempBody);
    console.log("imagedetails", imagedetails);

    async function configureBucketCors() {
      await gcTempFiles.setCorsConfiguration([
        {
          maxAgeSeconds: 3600,
          method: ["PUT", "GET", "HEAD", "DELETE", "POST", "OPTIONS"],
          origin: ["*"],
          responseHeader: [
            "Content-Type",
            "Access-Control-Allow-Origin",
            "x-goog-resumable",
          ],
        },
      ]);
    }

    configureBucketCors().catch(console.error);

    await new Promise((resolve, reject) => {
      // gcTempFiles
      //   .file(gcFileName)
      //   .createWriteStream({})
      //   .on("finish", () => {
      //     resolve();
      //   })
      //   .end();

      async function generateV4UploadSignedUrl() {
        const options = {
          version: "v4",
          action: "write",
          expires: Date.now() + 15 * 60 * 1000, // 15 minutes
          contentType: "application/octet-stream",
          "Access-Control-Allow-Origin": "*",
        };

        // Get a v4 signed URL for uploading file
        const [url] = await gcTempFiles.file(gcFileName).getSignedUrl(options);

        console.log("Generated PUT signed URL:", url);

        res.status(200).json({
          success: true,
          msg: `Upload success`,
          data: { url },
        });
      }
      generateV4UploadSignedUrl().catch(console.error);
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Get Random Image Path - Vendor
//@route    GET /api/getrandomimagepath/
//@access   Public
//@usedBy   Audio Recording App
exports.getRandomImagePath = asyncHandler(async (req, res, next) => {
  try {
    const { state, district } = req.query;
    const uid = mongoose.Types.ObjectId(req.user._id);
    //console.log("uid", uid);
    //console.log("state, district", state, district);
    const imgpath = [];
    const userImgPath = await FileDetail.find(
      { userID: uid },
      {
        imageLocation: 1,
        _id: 0,
      },
    );
    //console.log("userImgPath", userImgPath);

    let userImageLocationArray = [];
    userImgPath.map((row) => {
      userImageLocationArray.push(row.imageLocation);
    });

    //console.log("userImageLocationArray", userImageLocationArray);

    let imagePathList = await Image.find(
      {
        state,
        district,
        isavailable: true,
        isAllocated: false,
        imageRecordingDurationSec: { $lt: 420 },
      },
      {
        //imgname: 1,
        imgLocation: 1,
        promptText: 1,
        //uploadedOn: 1,
        _id: 0,
      },
    );
    //console.log("imagePathList", imagePathList);

    if (imagePathList.length == 0) {
      const updateallocstat = await Image.updateMany(
        {
          state,
          district,
          isavailable: true,
          isAllocated: true,
        },
        {
          isAllocated: false,
        },
      );

      imagePathList = await Image.find(
        {
          state,
          district,
          isavailable: true,
          isAllocated: false,
          imageRecordingDurationSec: { $lt: 420 },
        },
        {
          //imgname: 1,
          imgLocation: 1,
          promptText: 1,
          //uploadedOn: 1,
          _id: 0,
        },
      );
    }

    for (let i = 0; i < imagePathList.length; i++) {
      //console.log("imagePathList", imagePathList);
      let randomPath =
        imagePathList[Math.floor(Math.random() * imagePathList.length)];
      // console.log("randomPath index", userImgPath.indexOf(randomPath));
      if (userImageLocationArray.indexOf(randomPath.imgLocation) === -1) {
        // console.log("inside imgpath");
        imgpath.push(randomPath);
        break;
      }
    }

    //console.log("imgpath", imgpath);
    res.status(200).json({
      success: true,
      msg: `Image File Path`,
      data: imgpath,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Get getinterpairdetails - QC
//@route    POST /api/getinterpairdetails/
//@access   Public
//@usedBy   Audio Recording App
exports.getInterPairDetails = asyncHandler(async (req, res, next) => {
  try {
    // console.log("req.body", req.body);
    const data = req.body.fileList;
    let fileArray = [];
    let counter = 0;
    data.map(async (row, index) => {
      let fileObj = {};

      const file1url = await FileDetail.find(
        {
          fileName: row.File1 + ".wav",
        },
        {
          fileLocation: 1,
          _id: 0,
        },
      );

      // console.log("file1url", file1url);

      const file2url = await FileDetail.find(
        {
          fileName: row.File2 + ".wav",
        },
        {
          fileLocation: 1,
          _id: 0,
        },
      );

      fileObj = {
        SrNo: row.SrNo,
        File1: row.File1,
        File1url: file1url[0].fileLocation,
        File2: row.File2,
        File2url: file2url[0].fileLocation,
        CosineSimilarity: row.CosineSimilarity,
      };

      counter = counter + 1;
      //console.log("counter, length", counter, data.length);

      fileArray.push(fileObj);
      // console.log("fileArray inside", fileArray);
      if (counter == data.length) {
        res.status(200).json({
          success: true,
          //msg: `Image File List`,
          data: fileArray,
        });
      }
    });

    //console.log("fileArray", fileArray);

    // res.status(200).json({
    //   success: true,
    //   //msg: `Image File List`,
    //   data: fileObj,
    // });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Signing Off Speaker - Coordinator
//@route    PUT /api/updatespeakersignoff/
//@access   Private
//@usedBy   Audio Recording App
exports.signingOffSpeaker = asyncHandler(async (req, res, next) => {
  try {
    //console.log("req.body", req.body);
    //let ids = mongoose.Types.ObjectId(req.body._id);
    let { mobile, speakerID, userID } = req.body;
    //console.log("mobile, speakerID", mobile, speakerID, userID);
    const updateuser = await User.findByIdAndUpdate(userID, {
      recordingCompleted: true,
      isInterAccepted: true,
      signOffDoneOn: Date.now(),
    });

    //console.log("updateuser", updateuser);
    if (updateuser) {
      //console.log("inside true");
      const FileLocations = await FileDetail.find(
        { userID, status: "Accepted" },
        {
          fileLocation: 1,
          state: 1,
          district: 1,
          _id: 1,
        },
      );
      // console.log("FileLocations", FileLocations);

      if (FileLocations.length > 0) {
        FileLocations.map(async (fileloc) => {
          const updateFileDetails = await FileDetail.findByIdAndUpdate(
            fileloc._id,
            {
              intra1CheckById: req.user._id,
              intra1CheckByName: req.user.name,
              intra1CheckStatus: "Accepted",
              intra1CheckedOn: Date.now(),
              inter1CheckById: req.user._id,
              inter1CheckByName: req.user.name,
              inter1CheckStatus: "Accepted",
              inter1CheckedOn: Date.now(),
            },
          );
          //console.log("fileloc", fileloc.fileLocation);
          // const gcTempFiles =
          //   process.env.NODE_ENV === "production"
          //     ? gc.bucket(process.env.PROD_STORAGE_BUCKET)
          //     : gc.bucket(process.env.DEV_STORAGE_BUCKET);

          // let oldPath =
          //   process.env.NODE_ENV === "production"
          //     ? fileloc.fileLocation.split(`${process.env.PROD_STORAGE_BUCKET}/`)[1]
          //     : fileloc.fileLocation.split(`${process.env.DEV_STORAGE_BUCKET}/`)[1];

          // // https://storage.googleapis.com/staging-image-audio-recording/Audios/Uttarpradesh_JyotibaPhuleNagar/UP_JyotibaP_09050764_1205500530_Tajmahal.wav
          // let state = fileloc.state.replace(/[^a-z\d]+/gi, "");
          // let district = fileloc.district.replace(/[^a-z\d]+/gi, "");

          // // let newPath = oldPath.replace(
          // //   `Audios/${state + "_" + district}/`,
          // //   `Speakerwisefiles/${speakerID}/`
          // // );

          // let curdate = new Date().toISOString().split("T");
          // // console.log("curdate", curdate);
          // let newPath = oldPath.replace("Rejected", "");
          // newPath = newPath.replace(
          //   `Audios/${state + "_" + district}/`,
          //   `Speakerwisefiles/${curdate[0]}/${speakerID}/`
          // );

          // // console.log("newPath", newPath);

          // const [files] =
          //   process.env.NODE_ENV === "production"
          //     ? await gc.bucket(process.env.PROD_STORAGE_BUCKET).getFiles({
          //         //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
          //         prefix: oldPath,
          //       })
          //     : await gc.bucket(process.env.DEV_STORAGE_BUCKET).getFiles({
          //         //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
          //         prefix: oldPath,
          //       });

          // // console.log("files", files);

          // if (files.length > 0) {
          //   await gcTempFiles.file(oldPath).copy(newPath);
          // }
        });
      }
    }

    res.status(200).json({
      success: true,
      msg: `Speaker Signedoff Successfully`,
      //data: userDetails,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     QC Signing Off Speaker - Quality Checker
//@route    PUT /api/updateqcspeakersignoff/
//@access   Private
//@usedBy   Audio Recording App
exports.qcSigningOffSpeaker = asyncHandler(async (req, res, next) => {
  try {
    //console.log("req.body", req.body);
    //let ids = mongoose.Types.ObjectId(req.body._id);
    let { mobile, speakerID, userID } = req.body;
    //console.log("mobile, speakerID", mobile, speakerID, userID);
    const updateuser = await User.findByIdAndUpdate(userID, {
      isQcSignedOff: true,
      qcSignOffDoneOn: Date.now(),
    });

    //console.log("updateuser", updateuser);
    if (updateuser) {
      //console.log("inside true");
      const FileLocations = await FileDetail.find(
        { userID, status: "Accepted", isQcAccepted: true },
        {
          fileLocation: 1,
          state: 1,
          district: 1,
          _id: 1,
        },
      );
      // console.log("FileLocations", FileLocations);

      if (FileLocations.length > 0) {
        FileLocations.map(async (fileloc) => {
          //console.log("fileloc", fileloc.fileLocation);
          const gcTempFiles =
            process.env.NODE_ENV === "production"
              ? gc.bucket(process.env.PROD_STORAGE_BUCKET)
              : gc.bucket(process.env.DEV_STORAGE_BUCKET);

          let oldPath =
            process.env.NODE_ENV === "production"
              ? fileloc.fileLocation.split(
                  `${process.env.PROD_STORAGE_BUCKET}/`,
                )[1]
              : fileloc.fileLocation.split(
                  `${process.env.DEV_STORAGE_BUCKET}/`,
                )[1];

          // https://storage.googleapis.com/staging-image-audio-recording/Audios/Uttarpradesh_JyotibaPhuleNagar/UP_JyotibaP_09050764_1205500530_Tajmahal.wav
          let state = fileloc.state.replace(/[^a-z\d]+/gi, "");
          let district = fileloc.district.replace(/[^a-z\d]+/gi, "");

          let curdate = new Date().toISOString().split("T");
          // console.log("curdate", curdate);
          let newPath = oldPath.replace("Rejected", "");
          newPath = newPath.replace(
            `Audios/${state + "_" + district}/`,
            `QCFiles/${curdate[0]}/${speakerID}/`,
          );

          // console.log("newPath", newPath);

          const [files] =
            process.env.NODE_ENV === "production"
              ? await gc.bucket(process.env.PROD_STORAGE_BUCKET).getFiles({
                  //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                  prefix: oldPath,
                })
              : await gc.bucket(process.env.DEV_STORAGE_BUCKET).getFiles({
                  //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                  prefix: oldPath,
                });

          // console.log("files", files);

          if (files.length > 0) {
            await gcTempFiles.file(oldPath).copy(newPath);
          }
        });
      }
    }

    res.status(200).json({
      success: true,
      msg: `Speaker Signedoff Successfully`,
      //data: userDetails,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Segmentation Signing Off Speaker - Quality Checker
//@route    PUT /api/updatesengmentationspeakersignoff/
//@access   Private
//@usedBy   Audio Recording App
exports.segmentationSigningOffSpeaker = asyncHandler(async (req, res, next) => {
  try {
    //console.log("req.body", req.body);
    //let ids = mongoose.Types.ObjectId(req.body._id);
    let { mobile, speakerID, userID } = req.body;
    //console.log("mobile, speakerID", mobile, speakerID, userID);
    const updateuser = await User.findByIdAndUpdate(userID, {
      isSegmentationSignedOff: true,
      segmentationSignOffDoneOn: Date.now(),
    });

    //Code for to move the files in final bucket
    // if (updateuser) {
    //   //console.log("inside true");
    //   const FileLocations = await FileDetail.find(
    //     {
    //       userID,
    //       status: "Accepted",
    //       isQcAccepted: true,
    //       SegmentationStatus: "Completed",
    //     },
    //     {
    //       fileLocation: 1,
    //       JsonFileLocation: 1,
    //       state: 1,
    //       district: 1,
    //       _id: 1,
    //     }
    //   );
    //   // console.log("FileLocations", FileLocations);

    //   if (FileLocations.length > 0) {
    //     FileLocations.map(async (fileloc) => {
    //       //console.log("fileloc", fileloc.fileLocation);
    //       const gcTempFiles =
    //         process.env.NODE_ENV === "production"
    //           ? gc.bucket(process.env.PROD_STORAGE_BUCKET)
    //           : gc.bucket(process.env.DEV_STORAGE_BUCKET);

    //       let oldPath =
    //         process.env.NODE_ENV === "production"
    //           ? fileloc.fileLocation.split(`${process.env.PROD_STORAGE_BUCKET}/`)[1]
    //           : fileloc.fileLocation.split(`${process.env.DEV_STORAGE_BUCKET}/`)[1];

    //       let oldJsonPath =
    //         process.env.NODE_ENV === "production"
    //           ? fileloc.JsonFileLocation.split(`${process.env.PROD_STORAGE_BUCKET}/`)[1]
    //           : fileloc.JsonFileLocation.split(
    //               `${process.env.DEV_STORAGE_BUCKET}/`
    //             )[1];

    //       //console.log("oldPath", oldPath);
    //       //console.log("oldJsonPath", oldJsonPath);

    //       // https://storage.googleapis.com/staging-image-audio-recording/Audios/Uttarpradesh_JyotibaPhuleNagar/UP_JyotibaP_09050764_1205500530_Tajmahal.wav
    //       let state = fileloc.state.replace(/[^a-z\d]+/gi, "");
    //       let district = fileloc.district.replace(/[^a-z\d]+/gi, "");

    //       let curdate = new Date().toISOString().split("T");
    //       // console.log("curdate", curdate);
    //       let newPath = oldPath.replace(
    //         `Audios/${state + "_" + district}/`,
    //         `SengmentedFiles/${curdate[0]}/`
    //       );

    //       let newJsonPath = oldJsonPath.replace(
    //         `SegmentationJsonFiles/${state + "_" + district}/`,
    //         `SengmentedFiles/${curdate[0]}/`
    //       );

    //       //console.log("newPath", newPath);
    //       //console.log("newJsonPath", newJsonPath);

    //       const [files] =
    //         process.env.NODE_ENV === "production"
    //           ? await gc.bucket(process.env.PROD_STORAGE_BUCKET).getFiles({
    //               //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
    //               prefix: oldPath,
    //             })
    //           : await gc.bucket(process.env.DEV_STORAGE_BUCKET).getFiles({
    //               //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
    //               prefix: oldPath,
    //             });

    //       const [jsonFiles] =
    //         process.env.NODE_ENV === "production"
    //           ? await gc.bucket(process.env.PROD_STORAGE_BUCKET).getFiles({
    //               //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
    //               prefix: oldJsonPath,
    //             })
    //           : await gc.bucket(process.env.DEV_STORAGE_BUCKET).getFiles({
    //               //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
    //               prefix: oldJsonPath,
    //             });

    //       // console.log("files", files);

    //       if (files.length > 0) {
    //         await gcTempFiles.file(oldPath).copy(newPath);
    //       }

    //       if (jsonFiles.length > 0) {
    //         await gcTempFiles.file(oldJsonPath).copy(newJsonPath);
    //       }
    //     });
    //   }
    // }

    res.status(200).json({
      success: true,
      msg: `Speaker Signedoff Successfully`,
      //data: userDetails,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     QCPR Signing Off Speaker - QCPR
//@route    PUT /api/updateqcprspeakersignoff/
//@access   Private
//@usedBy   Audio Recording App
exports.qcprSigningOffSpeaker = asyncHandler(async (req, res, next) => {
  try {
    //console.log("req.body", req.body);
    //let ids = mongoose.Types.ObjectId(req.body._id);
    let { mobile, speakerID, userID } = req.body;
    //console.log("mobile, speakerID", mobile, speakerID, userID);
    const updateuser = await User.findByIdAndUpdate(userID, {
      isQcPrSignedOff: true,
      QcPrSignOffDoneOn: Date.now(),
    });

    //Code for to move the files in final bucket
    if (updateuser) {
      //console.log("inside true");
      let updateQCPR = await FileDetail.updateMany(
        {
          userID,
          status: "Accepted",
          isQcAccepted: true,
          SegmentationStatus: "Completed",
        },
        {
          qcpr: true,
        },
        {
          new: true, //returns the updated data as response data
          runValidators: true, //mongoose validation
        },
      );

      const FileLocations = await FileDetail.find(
        {
          userID,
          status: "Accepted",
          isQcAccepted: true,
          SegmentationStatus: "Completed",
        },
        {
          fileLocation: 1,
          JsonFileLocation: 1,
          state: 1,
          district: 1,
          _id: 1,
        },
      );
      //console.log("FileLocations", FileLocations);

      if (FileLocations.length > 0) {
        FileLocations.map(async (fileloc) => {
          //console.log("fileloc", fileloc.fileLocation);
          const gcTempFiles =
            process.env.NODE_ENV === "production"
              ? gc.bucket(process.env.PROD_STORAGE_BUCKET)
              : gc.bucket(process.env.DEV_STORAGE_BUCKET);

          let oldPath =
            process.env.NODE_ENV === "production"
              ? fileloc.fileLocation.split(
                  `${process.env.PROD_STORAGE_BUCKET}/`,
                )[1]
              : fileloc.fileLocation.split(
                  `${process.env.DEV_STORAGE_BUCKET}/`,
                )[1];

          let oldJsonPath =
            process.env.NODE_ENV === "production"
              ? fileloc.JsonFileLocation.split(
                  `${process.env.PROD_STORAGE_BUCKET}/`,
                )[1]
              : fileloc.JsonFileLocation.split(
                  `${process.env.DEV_STORAGE_BUCKET}/`,
                )[1];

          //console.log("oldPath", oldPath);
          //console.log("oldJsonPath", oldJsonPath);

          // https://storage.googleapis.com/staging-image-audio-recording/Audios/Uttarpradesh_JyotibaPhuleNagar/UP_JyotibaP_09050764_1205500530_Tajmahal.wav
          let state = fileloc.state.replace(/[^a-z\d]+/gi, "");
          let district = fileloc.district.replace(/[^a-z\d]+/gi, "");

          let curdate = new Date().toISOString().split("T");
          // console.log("curdate", curdate);
          let newPath = oldPath.replace("Rejected", "");
          newPath = newPath.replace(
            `Audios/${state + "_" + district}/`,
            `SengmentedFiles/${curdate[0]}/`,
          );

          //console.log("newPath", newPath);
          //console.log("newJsonPath", newJsonPath);

          if (newPath) {
            const [files] =
              process.env.NODE_ENV === "production"
                ? await gc.bucket(process.env.PROD_STORAGE_BUCKET).getFiles({
                    //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                    prefix: oldPath,
                  })
                : await gc.bucket(process.env.DEV_STORAGE_BUCKET).getFiles({
                    //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                    prefix: oldPath,
                  });

            if (files.length > 0) {
              await gcTempFiles.file(oldPath).copy(newPath);
            }
          }

          let newJsonPath = oldJsonPath.replace("Rejected", "");
          newJsonPath = newJsonPath.replace(
            `SegmentationJsonFiles/${state + "_" + district}/`,
            `SengmentedFiles/${curdate[0]}/`,
          );

          if (newJsonPath) {
            const [jsonFiles] =
              process.env.NODE_ENV === "production"
                ? await gc.bucket(process.env.PROD_STORAGE_BUCKET).getFiles({
                    //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                    prefix: oldJsonPath,
                  })
                : await gc.bucket(process.env.DEV_STORAGE_BUCKET).getFiles({
                    //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                    prefix: oldJsonPath,
                  });

            if (jsonFiles.length > 0) {
              await gcTempFiles.file(oldJsonPath).copy(newJsonPath);
            }
          }
        });
      }
    }

    res.status(200).json({
      success: true,
      msg: `QCPR Signedoff Successfully`,
      //data: userDetails,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Reopen FIle - QCPR
//@route    PUT /api/reopenfile/
//@access   Private
//@usedBy   Audio Recording App
exports.reOpenFile = asyncHandler(async (req, res, next) => {
  try {
    //console.log("req.body", req.body);
    //let ids = mongoose.Types.ObjectId(req.body._id);
    let { mobile, speakerID, fid, userID } = req.body;
    //console.log("mobile, speakerID", mobile, speakerID, userID);
    const updatefile = await FileDetail.findByIdAndUpdate(fid, {
      SegmentationStatus: "InProgress",
      reOpenedByQcPr: true,
    });

    const updateuser = await User.findByIdAndUpdate(userID, {
      isSegmentationSignedOff: false,
    });

    res.status(200).json({
      success: true,
      msg: `File Reopen Successfully`,
      //data: userDetails,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     UpdateDownloadStatus - Admin
//@route    PUT /api/updatedownloadstatus/
//@access   Private
//@usedBy   Audio Recording App
exports.updateDownloadStatus = asyncHandler(async (req, res, next) => {
  try {
    //console.log("req.body", req.body);
    //let ids = mongoose.Types.ObjectId(req.body._id);
    let { mobile, speakerID, userID } = req.body;
    //console.log("mobile, speakerID", mobile, speakerID, userID);
    const updateuser = await User.findByIdAndUpdate(userID, {
      downloadCompleted: true,
    });

    //console.log("updateuser", updateuser);

    res.status(200).json({
      success: true,
      msg: `Download status updated successfully`,
      //data: userDetails,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Generate Lattitude and Longitude list for every pincodes using API
//@route    GET /api/generatepincodelatlonglist/
//@access   Private
//@usedBy   Audio Recording App
exports.generatePincodeLatLongList = asyncHandler(async (req, res, next) => {
  try {
    console.log("Inside generatePincodeLatLongList");
    let cnt = 0;
    //let pincode="";
    async function getPincodeLatLangs() {
      // 'X-RapidAPI-Key': '1fe071cd56msh5b4d1511769f18ap1559f5jsncc960934f289',
      // 'X-RapidAPI-Host': 'india-pincode-with-latitude-and-longitude.p.rapidapi.com'
      const options = {
        method: "GET",
        url: `https://india-pincode-with-latitude-and-longitude.p.rapidapi.com/api/v1/pincode/403708`,
        headers: {
          "X-RapidAPI-Key":
            "1fe071cd56msh5b4d1511769f18ap1559f5jsncc960934f289",
          "X-RapidAPI-Host":
            "india-pincode-with-latitude-and-longitude.p.rapidapi.com",
        },
      };

      try {
        const response = await axios.request(options);
        //console.log(response.data);

        if (response.data.length > 0) {
          let newarray = [];
          response.data.map((row, index1) => {
            //console.log("index1",index1);
            let nobj = {
              pincode: row.pincode,
              latitude: Math.trunc(row.lat),
              longitude: Math.trunc(row.lng),
            };
            newarray.push(nobj);
            if (response.data.length - 1 == index1) {
              let jsonObject = newarray.map(JSON.stringify);
              let uniqueSet = new Set(jsonObject);
              let uniqueArray = Array.from(uniqueSet).map(JSON.parse);
              console.log("uniqueArray", uniqueArray);
              if (uniqueArray.length > 0) {
                uniqueArray.map(async (pinc, index) => {
                  let pinobj = {
                    pincode: pinc.pincode,
                    latitude: pinc.latitude,
                    longitude: pinc.longitude,
                  };
                  const insertpin = await PinLatLongMap.create(pinobj);
                  cnt++;
                  if (uniqueArray.length - 1 == index) {
                    res.status(200).json({
                      success: true,
                      msg: `Pincodes Added successfully`,
                      //data: userDetails,
                    });
                  }
                });
              }
            }
          });
        }
      } catch (error) {
        console.error(error);
      }
    }
    getPincodeLatLangs();
    console.log("Insert cnt", cnt);
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Get Rejected Audio Speakers for recovery - LanguageMismatch - QC
//@route    GET /api/getrejectedlangmismatchrecoveryusers/
//@access   Private
//@usedBy   Audio Recording App
exports.getRejectedLanguageMismatchRecoveryUsers = asyncHandler(
  async (req, res, next) => {
    try {
      //console.log("req.query", req.query);
      const UserList = await FileDetail.find(
        {
          district: req.user.district,
          status: {
            $in: [
              "CoordinatorRejected",
              "SupervisorRejected",
              "QcRejected",
              "AdminRejected",
            ],
          },
          $or: [
            { coordinatorRejectionReason: "Language Mismatch" },
            { supervisorRejectionReason: "Language Mismatch" },
            { qcRejectionReason: "Language Mismatch" },
            { AdminRejectionReason: "Language Mismatch" },
          ],
        },
        {
          mobile: 1,
          speakerID: 1,

          //status: 1,
        },
      ).distinct("speakerID");

      //console.log("UserList", UserList);

      res.status(200).json({
        success: true,
        msg: `UserList`,
        data: UserList,
      });

      // if (UserList.length > 0) {
      //   let finalUserList = [];
      //   UserList.map(async (row, index) => {
      //     // console.log("row", row);
      //     const FileListCount = await FileDetail.countDocuments({
      //       district: req.user.district,
      //       speakerID: row,
      //       status: {
      //         $in: [
      //           "CoordinatorRejected",
      //           "SupervisorRejected",
      //           "QcRejected",
      //           "AdminRejected",
      //         ],
      //       },
      //       $or: [
      //         { coordinatorRejectionReason: "Language Mismatch" },
      //         { supervisorRejectionReason: "Language Mismatch" },
      //         { qcRejectionReason: "Language Mismatch" },
      //         { AdminRejectionReason: "Language Mismatch" },
      //       ],
      //     });

      //     if (FileListCount > 9) {
      //       let obj = {
      //         // mobile: row.mobile,
      //         speakerID: row,
      //         pendingCount: FileListCount,
      //       };

      //       finalUserList.push(obj);
      //     }

      //     console.log("finalUserList", finalUserList);
      //     console.log(
      //       "index == UserList.length - 1",
      //       index,
      //       UserList.length - 1
      //     );
      //     if (index == UserList.length - 1) {
      //       setTimeout(() => {
      //         res.status(200).json({
      //           success: true,
      //           msg: `finalUserList`,
      //           data: finalUserList,
      //         });
      //       }, 2000);
      //     }
      //   });
      // }
    } catch (err) {
      console.log("err", err);
      return next(new ErrorResponse("Internal server error", [err], 500));
    }
  },
);

//@desc     Get Rejected Audio Files for recovery - LanguageMismatch - QC
//@route    GET /api/getrejectedLangMismatchfiles/
//@access   Private
//@usedBy   Audio Recording App
exports.getRejectedLangMismatchFiles = asyncHandler(async (req, res, next) => {
  try {
    //console.log("params", req.query);
    const FileList = await FileDetail.find(
      {
        district: req.user.district,
        speakerID: req.query.speakerID,
        status: {
          $in: [
            "CoordinatorRejected",
            "SupervisorRejected",
            "QcRejected",
            "AdminRejected",
          ],
        },
        $or: [
          { coordinatorRejectionReason: "Language Mismatch" },
          { supervisorRejectionReason: "Language Mismatch" },
          { qcRejectionReason: "Language Mismatch" },
          { AdminRejectionReason: "Language Mismatch" },
        ],
      },
      {
        coordinatorRejectionReason: 1,
        supervisorRejectionReason: 1,
        qcRejectionReason: 1,
        AdminRejectionReason: 1,
        fileName: 1,
        imageName: 1,
        fileLocation: 1,
        imageLocation: 1,
        language: 1,
        _id: 1,
        fileDuration: 1,
        speakerID: 1,
        mobile: 1,
        //status: 1,
      },
    );

    let distLanguages = await District.find(
      { district: req.user.district },
      {
        language: 1,
        _id: 0,
      },
    );

    if (FileList.length > 0) {
      let fileArray = [];
      FileList.map((row, index) => {
        let obj = {
          coordinatorRejectionReason: row.coordinatorRejectionReason,
          supervisorRejectionReason: row.supervisorRejectionReason,
          qcRejectionReason: row.qcRejectionReason,
          AdminRejectionReason: row.AdminRejectionReason,
          fileName: row.fileName,
          imageName: row.imageName,
          fileLocation: row.fileLocation,
          imageLocation: row.imageLocation,
          language: row.language,
          _id: row._id,
          fileDuration: row.fileDuration,
          speakerID: row.speakerID,
          mobile: row.mobile,
          distLanguages: distLanguages[0].language.split(","),
        };
        fileArray.push(obj);

        if (index == FileList.length - 1) {
          // console.log("fileArray", fileArray);
          setTimeout(() => {
            res.status(200).json({
              success: true,
              msg: `FileList`,
              data: fileArray,
            });
          }, 2000);
        }
      });
    }

    //console.log("distLanguages", distLanguages);
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Recover Rejected Accept File Language Mismatch - QualityChecker
//@route    PUT /api/qclanguagemismatchacceptfile/
//@access   Private
//@usedBy   Audio Recording App
exports.updateQcLangMismatchAcceptFile = asyncHandler(
  async (req, res, next) => {
    try {
      //console.log("req.body", req.body);
      // console.log("req.user", req.user);
      let ids = mongoose.Types.ObjectId(req.body.id);
      //console.log("ids", ids);
      let setquery = {
        status: "Accepted",
        acceptedByQcId: req.user._id,
        acceptedByQcName: req.user.name,
        language: req.body.language,
        isQcAccepted: true,
        FileRecoveryProcessed: true,
        qcAcceptedOn: Date.now(),
      };

      //console.log("setquery", setquery);

      let setUserQuery = {
        language: req.body.language,
        knownlanguages: req.body.language,
      };

      //console.log("query", query);
      const updatefile = await FileDetail.findByIdAndUpdate(ids, setquery);

      if (updatefile) {
        const updateuser = await User.findOneAndUpdate(
          {
            speakerID: req.body.speakerID,
            district: req.user.district,
          },
          setUserQuery,
        );

        if (updateuser) {
          //console.log("inside true");
          const FileLocations = await FileDetail.findById(ids, {
            fileLocation: 1,
            state: 1,
            district: 1,
            _id: 0,
          });

          //console.log("FileLocations", FileLocations);

          if (FileLocations) {
            const gcTempFiles =
              process.env.NODE_ENV === "production"
                ? gc.bucket(process.env.PROD_STORAGE_BUCKET)
                : gc.bucket(process.env.DEV_STORAGE_BUCKET);

            let oldPath =
              process.env.NODE_ENV === "production"
                ? FileLocations.fileLocation.split(
                    `${process.env.PROD_STORAGE_BUCKET}/`,
                  )[1]
                : FileLocations.fileLocation.split(
                    `${process.env.DEV_STORAGE_BUCKET}/`,
                  )[1];

            let replaceString = oldPath.split("/")[0];
            //console.log("replaceString", replaceString);

            let state = FileLocations.state.replace(/[^a-z\d]+/gi, "");
            let district = FileLocations.district.replace(/[^a-z\d]+/gi, "");

            // let newPath = oldPath.replace(
            //   `Audios/${state + "_" + district}/`,
            //   `Speakerwisefiles/${speakerID}/`
            // );

            //let curdate = new Date().toISOString().split("T");
            // console.log("curdate", curdate);

            let newPath = oldPath.replace(
              `${replaceString + "/" + state + "_" + district}/`,
              `Audios/${state + "_" + district}/`,
            );

            // let newPath = oldPath.replace(
            //   `${replaceString + "/" + state + "_" + district}/`,
            //   `RejectedRecoveredfiles/${curdate[0]}/${req.body.speakerID}/`
            // );

            //console.log("newPath", newPath);

            const [files] =
              process.env.NODE_ENV === "production"
                ? await gc.bucket(process.env.PROD_STORAGE_BUCKET).getFiles({
                    //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                    prefix: oldPath,
                  })
                : await gc.bucket(process.env.DEV_STORAGE_BUCKET).getFiles({
                    //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                    prefix: oldPath,
                  });

            // console.log("files", files);

            if (files.length > 0) {
              await gcTempFiles.file(oldPath).move(newPath);

              const GCPath =
                process.env.NODE_ENV === "production"
                  ? `https://storage.googleapis.com/${process.env.PROD_STORAGE_BUCKET}/`
                  : `https://storage.googleapis.com/${process.env.DEV_STORAGE_BUCKET}/`;

              let newFileLocation = GCPath + newPath;
              //console.log("newFileLocation", newFileLocation);

              const updateLocation = await FileDetail.findByIdAndUpdate(ids, {
                fileLocation: newFileLocation,
              });

              if (updateLocation) {
                res.status(200).json({
                  success: true,
                  msg: `File Accepted Successfully`,
                  //data: userDetails,
                });
              }
            }
          }
        }
      }
    } catch (err) {
      return next(new ErrorResponse("Internal server error", [err], 500));
    }
  },
);

//@desc Recover Rejected Reject File LanguageMismatch/GenderMismatch/>< 25 sec/BackgroundNoise - QualityChecker
//@route    PUT /api/qcrecoveryrejectfile/
//@access   Private
//@usedBy   Audio Recording App
exports.updateQcRecoveryRejectFile = asyncHandler(async (req, res, next) => {
  try {
    //console.log("req.body.id", req.body);
    //console.log("req.user", req.user);
    let ids = mongoose.Types.ObjectId(req.body.id);
    //console.log("ids", ids);
    let query = {
      rejectedByQcId: req.user._id,
      rejectedByQcName: req.user.name,
      qcRejectedOn: Date.now(),
      status: "RecoveryRejected",
      isQcAccepted: false,
      FileRecoveryProcessed: true,
    };

    //console.log("query", query);
    const updatefile = await FileDetail.findByIdAndUpdate(ids, query);

    if (updatefile) {
      res.status(200).json({
        success: true,
        msg: `File Rejected Successfully`,
        //data: userDetails,
      });
    }
  } catch (err) {
    console.log("err", err);
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Get Rejected Audio Speakers for recovery - GenderMismatch - QC
//@route    GET /api/getrejectedgendermismatchrecoveryusers/
//@access   Private
//@usedBy   Audio Recording App
exports.getRejectedGenderMismatchRecoveryUsers = asyncHandler(
  async (req, res, next) => {
    try {
      //console.log("req.query", req.query);
      const UserList = await FileDetail.find(
        {
          district: req.user.district,
          status: {
            $in: [
              "CoordinatorRejected",
              "SupervisorRejected",
              "QcRejected",
              "AdminRejected",
            ],
          },
          $or: [
            { coordinatorRejectionReason: "Gender mismatch" },
            { supervisorRejectionReason: "Gender mismatch" },
            { qcRejectionReason: "Gender mismatch" },
            { AdminRejectionReason: "Gender mismatch" },
          ],
        },
        {
          mobile: 1,
          speakerID: 1,

          //status: 1,
        },
      ).distinct("speakerID");

      //console.log("UserList", UserList);

      res.status(200).json({
        success: true,
        msg: `UserList`,
        data: UserList,
      });

      // if (UserList.length > 0) {
      //   let finalUserList = [];
      //   UserList.map(async (row, index) => {
      //     // console.log("row", row);
      //     const FileListCount = await FileDetail.countDocuments({
      //       district: req.user.district,
      //       speakerID: row,
      //       status: {
      //         $in: [
      //           "CoordinatorRejected",
      //           "SupervisorRejected",
      //           "QcRejected",
      //           "AdminRejected",
      //         ],
      //       },
      //       $or: [
      //         { coordinatorRejectionReason: "Language Mismatch" },
      //         { supervisorRejectionReason: "Language Mismatch" },
      //         { qcRejectionReason: "Language Mismatch" },
      //         { AdminRejectionReason: "Language Mismatch" },
      //       ],
      //     });

      //     let obj = {
      //       // mobile: row.mobile,
      //       speakerID: row,
      //       pendingCount: FileListCount,
      //     };

      //     finalUserList.push(obj);

      //     //console.log("finalUserList", finalUserList);
      //     //console.log("index == UserList.length", index, UserList.length - 1);

      //     if (index == UserList.length - 1) {
      //       setTimeout(() => {
      //         res.status(200).json({
      //           success: true,
      //           msg: `finalUserList`,
      //           data: finalUserList,
      //         });
      //       }, 2000);
      //     }
      //   });
      // }
    } catch (err) {
      console.log("err", err);
      return next(new ErrorResponse("Internal server error", [err], 500));
    }
  },
);

//@desc     Get Rejected Audio Files for recovery - GenderMismatch - QC
//@route    GET /api/getrejectedGenderMismatchfiles/
//@access   Private
//@usedBy   Audio Recording App
exports.getRejectedGenderMismatchFiles = asyncHandler(
  async (req, res, next) => {
    try {
      //console.log("params", req.query);
      const FileList = await FileDetail.find(
        {
          district: req.user.district,
          speakerID: req.query.speakerID,
          status: {
            $in: [
              "CoordinatorRejected",
              "SupervisorRejected",
              "QcRejected",
              "AdminRejected",
            ],
          },
          $or: [
            { coordinatorRejectionReason: "Gender mismatch" },
            { supervisorRejectionReason: "Gender mismatch" },
            { qcRejectionReason: "Gender mismatch" },
            { AdminRejectionReason: "Gender mismatch" },
          ],
        },
        {
          coordinatorRejectionReason: 1,
          supervisorRejectionReason: 1,
          qcRejectionReason: 1,
          AdminRejectionReason: 1,
          fileName: 1,
          imageName: 1,
          fileLocation: 1,
          imageLocation: 1,
          _id: 1,
          fileDuration: 1,
          speakerID: 1,
          mobile: 1,
          gender: 1,
          //status: 1,
        },
      );

      res.status(200).json({
        success: true,
        msg: `FileList`,
        data: FileList,
      });

      //console.log("distLanguages", distLanguages);
    } catch (err) {
      return next(new ErrorResponse("Internal server error", [err], 500));
    }
  },
);

//@desc     Recover Rejected Accept File Gender Mismatch - QualityChecker
//@route    PUT /api/qcgendermismatchacceptfile/
//@access   Private
//@usedBy   Audio Recording App
exports.updateQcGenderMismatchAcceptFile = asyncHandler(
  async (req, res, next) => {
    try {
      //console.log("req.body", req.body);
      // console.log("req.user", req.user);
      let ids = mongoose.Types.ObjectId(req.body.id);
      //console.log("ids", ids);
      let setquery = {
        status: "Accepted",
        acceptedByQcId: req.user._id,
        acceptedByQcName: req.user.name,
        gender: req.body.gender,
        isQcAccepted: true,
        FileRecoveryProcessed: true,
        qcAcceptedOn: Date.now(),
      };

      //console.log("setquery", setquery);

      let setUserQuery = {
        gender: req.body.gender,
      };

      //console.log("query", query);
      const updatefile = await FileDetail.findByIdAndUpdate(ids, setquery);

      if (updatefile) {
        const updateuser = await User.findOneAndUpdate(
          {
            speakerID: req.body.speakerID,
            district: req.user.district,
          },
          setUserQuery,
        );

        if (updateuser) {
          //console.log("inside true");
          const FileLocations = await FileDetail.findById(ids, {
            fileLocation: 1,
            state: 1,
            district: 1,
            _id: 0,
          });

          //console.log("FileLocations", FileLocations);

          if (FileLocations) {
            const gcTempFiles =
              process.env.NODE_ENV === "production"
                ? gc.bucket(process.env.PROD_STORAGE_BUCKET)
                : gc.bucket(process.env.DEV_STORAGE_BUCKET);

            let oldPath =
              process.env.NODE_ENV === "production"
                ? FileLocations.fileLocation.split(
                    `${process.env.PROD_STORAGE_BUCKET}/`,
                  )[1]
                : FileLocations.fileLocation.split(
                    `${process.env.DEV_STORAGE_BUCKET}/`,
                  )[1];

            let replaceString = oldPath.split("/")[0];
            //console.log("replaceString", replaceString);

            let state = FileLocations.state.replace(/[^a-z\d]+/gi, "");
            let district = FileLocations.district.replace(/[^a-z\d]+/gi, "");

            // let newPath = oldPath.replace(
            //   `Audios/${state + "_" + district}/`,
            //   `Speakerwisefiles/${speakerID}/`
            // );

            //let curdate = new Date().toISOString().split("T");
            // console.log("curdate", curdate);
            let newPath = oldPath.replace(
              `${replaceString + "/" + state + "_" + district}/`,
              `Audios/${state + "_" + district}/`,
            );

            //console.log("newPath", newPath);

            const [files] =
              process.env.NODE_ENV === "production"
                ? await gc.bucket(process.env.PROD_STORAGE_BUCKET).getFiles({
                    //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                    prefix: oldPath,
                  })
                : await gc.bucket(process.env.DEV_STORAGE_BUCKET).getFiles({
                    //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                    prefix: oldPath,
                  });

            // console.log("files", files);

            if (files.length > 0) {
              await gcTempFiles.file(oldPath).move(newPath);

              const GCPath =
                process.env.NODE_ENV === "production"
                  ? `https://storage.googleapis.com/${process.env.PROD_STORAGE_BUCKET}/`
                  : `https://storage.googleapis.com/${process.env.DEV_STORAGE_BUCKET}/`;

              let newFileLocation = GCPath + newPath;
              // console.log("newFileLocation", newFileLocation);

              const updateLocation = await FileDetail.findByIdAndUpdate(ids, {
                fileLocation: newFileLocation,
              });

              if (updateLocation) {
                res.status(200).json({
                  success: true,
                  msg: `File Accepted Successfully`,
                  //data: userDetails,
                });
              }
            }
          }
        }
      }
    } catch (err) {
      return next(new ErrorResponse("Internal server error", [err], 500));
    }
  },
);

//@desc     Get Rejected Audio Speakers for recovery - NoisySpeakers - QC
//@route    GET /api/getrejectednoisyrecoveryspeakers/
//@access   Private
//@usedBy   Audio Recording App
exports.getRejectedNoisyRecoverySpeakers = asyncHandler(
  async (req, res, next) => {
    try {
      let UserList = await User.find(
        { district: req.user.district, NoisyUserFlag: true },
        {
          speakerID: 1,
          name: 1,
        },
      );

      // if (UserList.length > 0) {
      //   let finalUserList = [];
      //   UserList.map(async (row, index) => {
      //     //console.log("row", row);
      //     const FileListCount = await FileDetail.countDocuments({
      //       district: req.user.district,
      //       speakerID: row.speakerID,
      //       status: {
      //         $in: [
      //           "CoordinatorRejected",
      //           "SupervisorRejected",
      //           "QcRejected",
      //           "AdminRejected",
      //         ],
      //       },
      //     });

      //     if (FileListCount > 9) {
      //       let obj = {
      //         // mobile: row.mobile,
      //         speakerID: row.speakerID,
      //         pendingCount: FileListCount,
      //       };

      //       finalUserList.push(obj);
      //     }

      //     // console.log("finalUserList", finalUserList);
      //     // console.log(
      //     //   "index == UserList.length - 1",
      //     //   index,
      //     //   UserList.length - 1
      //     // );
      //     if (index == UserList.length - 1) {
      //       setTimeout(() => {
      //         res.status(200).json({
      //           success: true,
      //           msg: `finalUserList`,
      //           data: finalUserList,
      //         });
      //       }, 2000);
      //     }
      //   });
      // }

      res.status(200).json({
        success: true,
        msg: `UserList`,
        data: UserList,
      });
    } catch (err) {
      console.log("err", err);
      return next(new ErrorResponse("Internal server error", [err], 500));
    }
  },
);

//@desc     Get Rejected Audio Files for recovery - getrejectednoisyfiles - QC
//@route    GET /api/getrejectednoisyfiles/
//@access   Private
//@usedBy   Audio Recording App
exports.getRejectedNoisyFiles = asyncHandler(async (req, res, next) => {
  try {
    //console.log("params", req.query);
    const FileList = await FileDetail.find(
      {
        district: req.user.district,
        speakerID: req.query.speakerID,
        status: {
          $in: [
            "CoordinatorRejected",
            "SupervisorRejected",
            "QcRejected",
            "AdminRejected",
          ],
        },
        // $or: [
        //   { coordinatorRejectionReason: "Gender mismatch" },
        //   { supervisorRejectionReason: "Gender mismatch" },
        //   { qcRejectionReason: "Gender mismatch" },
        //   { AdminRejectionReason: "Gender mismatch" },
        // ],
      },
      {
        // coordinatorRejectionReason: 1,
        // supervisorRejectionReason: 1,
        // qcRejectionReason: 1,
        // AdminRejectionReason: 1,
        fileName: 1,
        imageName: 1,
        fileLocation: 1,
        imageLocation: 1,
        _id: 1,
        fileDuration: 1,
        speakerID: 1,
        mobile: 1,
        gender: 1,
        //status: 1,
      },
    );

    console.log("FileList", FileList.length);

    res.status(200).json({
      success: true,
      msg: `FileList`,
      data: FileList,
    });

    //console.log("distLanguages", distLanguages);
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Recover Rejected Accept File noisy files - QualityChecker
//@route    PUT /api/qcacceptnoisyfile/
//@access   Private
//@usedBy   Audio Recording App
exports.updateQcNoisyAcceptFile = asyncHandler(async (req, res, next) => {
  try {
    //console.log("req.body", req.body);
    // console.log("req.user", req.user);
    let ids = mongoose.Types.ObjectId(req.body.id);
    //console.log("ids", ids);
    let setquery = {
      status: "Accepted",
      acceptedByQcId: req.user._id,
      acceptedByQcName: req.user.name,
      isQcAccepted: true,
      FileRecoveryProcessed: true,
      qcAcceptedOn: Date.now(),
    };

    //console.log("setquery", setquery);

    //console.log("query", query);
    const updatefile = await FileDetail.findByIdAndUpdate(ids, setquery);

    if (updatefile) {
      //console.log("inside updatefile");
      const FileLocations = await FileDetail.findById(ids, {
        fileLocation: 1,
        state: 1,
        district: 1,
        _id: 0,
      });

      //console.log("FileLocations", FileLocations);

      if (FileLocations) {
        const gcTempFiles =
          process.env.NODE_ENV === "production"
            ? gc.bucket(process.env.PROD_STORAGE_BUCKET)
            : gc.bucket(process.env.DEV_STORAGE_BUCKET);

        let oldPath =
          process.env.NODE_ENV === "production"
            ? FileLocations.fileLocation.split(
                `${process.env.PROD_STORAGE_BUCKET}/`,
              )[1]
            : FileLocations.fileLocation.split(
                `${process.env.DEV_STORAGE_BUCKET}/`,
              )[1];

        let replaceString = oldPath.split("/")[0];
        //console.log("replaceString", replaceString);

        let state = FileLocations.state.replace(/[^a-z\d]+/gi, "");
        let district = FileLocations.district.replace(/[^a-z\d]+/gi, "");

        // let newPath = oldPath.replace(
        //   `Audios/${state + "_" + district}/`,
        //   `Speakerwisefiles/${speakerID}/`
        // );

        let curdate = new Date().toISOString().split("T");
        // console.log("curdate", curdate);
        let newPath = oldPath.replace(
          `${replaceString + "/" + state + "_" + district}/`,
          `RejectedRecoveredfiles/${curdate[0]}/${req.body.speakerID}/`,
        );

        //console.log("newPath", newPath);

        const [files] =
          process.env.NODE_ENV === "production"
            ? await gc.bucket(process.env.PROD_STORAGE_BUCKET).getFiles({
                //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                prefix: oldPath,
              })
            : await gc.bucket(process.env.DEV_STORAGE_BUCKET).getFiles({
                //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                prefix: oldPath,
              });

        // console.log("files", files);

        if (files.length > 0) {
          await gcTempFiles.file(oldPath).move(newPath);

          const GCPath =
            process.env.NODE_ENV === "production"
              ? `https://storage.googleapis.com/${process.env.PROD_STORAGE_BUCKET}/`
              : `https://storage.googleapis.com/${process.env.DEV_STORAGE_BUCKET}/`;

          let newFileLocation = GCPath + newPath;
          // console.log("newFileLocation", newFileLocation);

          const updateLocation = await FileDetail.findByIdAndUpdate(ids, {
            fileLocation: newFileLocation,
          });

          if (updateLocation) {
            res.status(200).json({
              success: true,
              msg: `File Accepted Successfully`,
              //data: userDetails,
            });
          }
        }
      }
    }
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Get Rejected Audio Speakers for recovery - Greaterthan 25 sec - QC
//@route    GET /api/getrejectedgt25secspeaker/
//@access   Private
//@usedBy   Audio Recording App
exports.getRejectedGt25SecSpeakers = asyncHandler(async (req, res, next) => {
  try {
    let UserList = await User.find(
      { district: req.user.district, GTTwentyFiveSec: true },
      {
        speakerID: 1,
        name: 1,
      },
    );

    res.status(200).json({
      success: true,
      msg: `UserList`,
      data: UserList,
    });
  } catch (err) {
    console.log("err", err);
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Get Rejected Audio Files for recovery - Greaterthan 25 sec - QC
//@route    GET /api/getrejectedgt25secfiles/
//@access   Private
//@usedBy   Audio Recording App
exports.getRejectedGt25secFiles = asyncHandler(async (req, res, next) => {
  try {
    //console.log("params", req.query);
    const FileList = await FileDetail.find(
      {
        district: req.user.district,
        speakerID: req.query.speakerID,
        status: {
          $in: [
            "CoordinatorRejected",
            "SupervisorRejected",
            "QcRejected",
            "AdminRejected",
          ],
        },
        // $or: [
        //   { coordinatorRejectionReason: "Gender mismatch" },
        //   { supervisorRejectionReason: "Gender mismatch" },
        //   { qcRejectionReason: "Gender mismatch" },
        //   { AdminRejectionReason: "Gender mismatch" },
        // ],
      },
      {
        // coordinatorRejectionReason: 1,
        // supervisorRejectionReason: 1,
        // qcRejectionReason: 1,
        // AdminRejectionReason: 1,
        fileName: 1,
        imageName: 1,
        fileLocation: 1,
        imageLocation: 1,
        _id: 1,
        fileDuration: 1,
        speakerID: 1,
        mobile: 1,
        gender: 1,
        //status: 1,
      },
    );

    //console.log("FileList", FileList.length);

    res.status(200).json({
      success: true,
      msg: `FileList`,
      data: FileList,
    });

    //console.log("distLanguages", distLanguages);
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Recover Rejected Accept File Greater than 25 sec files - QualityChecker
//@route    PUT /api/qcacceptgt25secfile/
//@access   Private
//@usedBy   Audio Recording App
exports.updateQcGt25SecAcceptFile = asyncHandler(async (req, res, next) => {
  try {
    //console.log("req.body", req.body);
    // console.log("req.user", req.user);
    let ids = mongoose.Types.ObjectId(req.body.id);
    //console.log("ids", ids);
    let setquery = {
      status: "Accepted",
      acceptedByQcId: req.user._id,
      acceptedByQcName: req.user.name,
      isQcAccepted: true,
      FileRecoveryProcessed: true,
      qcAcceptedOn: Date.now(),
    };

    //console.log("setquery", setquery);

    //console.log("query", query);
    const updatefile = await FileDetail.findByIdAndUpdate(ids, setquery);

    if (updatefile) {
      //console.log("inside updatefile");
      const FileLocations = await FileDetail.findById(ids, {
        fileLocation: 1,
        state: 1,
        district: 1,
        _id: 0,
      });

      //console.log("FileLocations", FileLocations);

      if (FileLocations) {
        const gcTempFiles =
          process.env.NODE_ENV === "production"
            ? gc.bucket(process.env.PROD_STORAGE_BUCKET)
            : gc.bucket(process.env.DEV_STORAGE_BUCKET);

        let oldPath =
          process.env.NODE_ENV === "production"
            ? FileLocations.fileLocation.split(
                `${process.env.PROD_STORAGE_BUCKET}/`,
              )[1]
            : FileLocations.fileLocation.split(
                `${process.env.DEV_STORAGE_BUCKET}/`,
              )[1];

        let replaceString = oldPath.split("/")[0];
        //console.log("replaceString", replaceString);

        let state = FileLocations.state.replace(/[^a-z\d]+/gi, "");
        let district = FileLocations.district.replace(/[^a-z\d]+/gi, "");

        // let newPath = oldPath.replace(
        //   `Audios/${state + "_" + district}/`,
        //   `Speakerwisefiles/${speakerID}/`
        // );

        let curdate = new Date().toISOString().split("T");
        // console.log("curdate", curdate);
        let newPath = oldPath.replace(
          `${replaceString + "/" + state + "_" + district}/`,
          `RejectedRecoveredfiles/${curdate[0]}/${req.body.speakerID}/`,
        );

        //console.log("newPath", newPath);

        const [files] =
          process.env.NODE_ENV === "production"
            ? await gc.bucket(process.env.PROD_STORAGE_BUCKET).getFiles({
                //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                prefix: oldPath,
              })
            : await gc.bucket(process.env.DEV_STORAGE_BUCKET).getFiles({
                //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                prefix: oldPath,
              });

        // console.log("files", files);

        if (files.length > 0) {
          await gcTempFiles.file(oldPath).move(newPath);

          const GCPath =
            process.env.NODE_ENV === "production"
              ? `https://storage.googleapis.com/${process.env.PROD_STORAGE_BUCKET}/`
              : `https://storage.googleapis.com/${process.env.DEV_STORAGE_BUCKET}/`;

          let newFileLocation = GCPath + newPath;
          // console.log("newFileLocation", newFileLocation);

          const updateLocation = await FileDetail.findByIdAndUpdate(ids, {
            fileLocation: newFileLocation,
          });

          if (updateLocation) {
            res.status(200).json({
              success: true,
              msg: `File Accepted Successfully`,
              //data: userDetails,
            });
          }
        }
      }
    }
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Get Rejected Audio Speakers for recovery - Not Matching With Sample - QC
//@route    GET /api/getrejectednomatchsamplespeaker/
//@access   Private
//@usedBy   Audio Recording App
exports.getRejectedNoMatchSampleSpeakers = asyncHandler(
  async (req, res, next) => {
    try {
      let UserList = await User.find(
        { district: req.user.district, NotMatchingWithSample: true },
        {
          speakerID: 1,
          name: 1,
          language: 1,
          gender: 1,
          sampleAudioPath: 1,
        },
      );

      res.status(200).json({
        success: true,
        msg: `UserList`,
        data: UserList,
      });
    } catch (err) {
      console.log("err", err);
      return next(new ErrorResponse("Internal server error", [err], 500));
    }
  },
);

//@desc     Get Rejected Audio Files for recovery - Not Matching With Sample - QC
//@route    GET /api/getrejectednomatchsamplefiles/
//@access   Private
//@usedBy   Audio Recording App
exports.getRejectednomatchsampleFiles = asyncHandler(async (req, res, next) => {
  try {
    //console.log("params", req.query);
    const FileList = await FileDetail.find(
      {
        district: req.user.district,
        speakerID: req.query.speakerID,
        status: {
          $in: [
            "CoordinatorRejected",
            "SupervisorRejected",
            "QcRejected",
            "AdminRejected",
          ],
        },
      },
      {
        fileName: 1,
        imageName: 1,
        fileLocation: 1,
        imageLocation: 1,
        _id: 1,
        fileDuration: 1,
        speakerID: 1,
        mobile: 1,
        gender: 1,
        //status: 1,
      },
    );

    //console.log("FileList", FileList.length);

    res.status(200).json({
      success: true,
      msg: `FileList`,
      data: FileList,
    });

    //console.log("distLanguages", distLanguages);
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Recover Rejected Accept File Not Matching With Sample files - QualityChecker
//@route    PUT /api/qcacceptnotmatchsamplefile/
//@access   Private
//@usedBy   Audio Recording App
exports.updateQcNotMatchsampleAcceptFile = asyncHandler(
  async (req, res, next) => {
    try {
      //console.log("req.body", req.body);
      // console.log("req.user", req.user);
      let ids = mongoose.Types.ObjectId(req.body.id);
      //console.log("ids", ids);
      let setquery = {
        status: "Accepted",
        acceptedByQcId: req.user._id,
        acceptedByQcName: req.user.name,
        isQcAccepted: true,
        FileRecoveryProcessed: true,
        qcAcceptedOn: Date.now(),
      };

      //console.log("setquery", setquery);

      //console.log("query", query);
      const updatefile = await FileDetail.findByIdAndUpdate(ids, setquery);

      if (updatefile) {
        //console.log("inside updatefile");
        const FileLocations = await FileDetail.findById(ids, {
          fileLocation: 1,
          state: 1,
          district: 1,
          _id: 0,
        });

        //console.log("FileLocations", FileLocations);

        if (FileLocations) {
          const gcTempFiles =
            process.env.NODE_ENV === "production"
              ? gc.bucket(process.env.PROD_STORAGE_BUCKET)
              : gc.bucket(process.env.DEV_STORAGE_BUCKET);

          let oldPath =
            process.env.NODE_ENV === "production"
              ? FileLocations.fileLocation.split(
                  `${process.env.PROD_STORAGE_BUCKET}/`,
                )[1]
              : FileLocations.fileLocation.split(
                  `${process.env.DEV_STORAGE_BUCKET}/`,
                )[1];

          let replaceString = oldPath.split("/")[0];
          //console.log("replaceString", replaceString);

          let state = FileLocations.state.replace(/[^a-z\d]+/gi, "");
          let district = FileLocations.district.replace(/[^a-z\d]+/gi, "");

          // let newPath = oldPath.replace(
          //   `Audios/${state + "_" + district}/`,
          //   `Speakerwisefiles/${speakerID}/`
          // );

          let curdate = new Date().toISOString().split("T");
          // console.log("curdate", curdate);
          let newPath = oldPath.replace(
            `${replaceString + "/" + state + "_" + district}/`,
            `RejectedRecoveredfiles/${curdate[0]}/${req.body.speakerID}/`,
          );

          //console.log("newPath", newPath);

          const [files] =
            process.env.NODE_ENV === "production"
              ? await gc.bucket(process.env.PROD_STORAGE_BUCKET).getFiles({
                  //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                  prefix: oldPath,
                })
              : await gc.bucket(process.env.DEV_STORAGE_BUCKET).getFiles({
                  //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                  prefix: oldPath,
                });

          // console.log("files", files);

          if (files.length > 0) {
            await gcTempFiles.file(oldPath).move(newPath);

            const GCPath =
              process.env.NODE_ENV === "production"
                ? `https://storage.googleapis.com/${process.env.PROD_STORAGE_BUCKET}/`
                : `https://storage.googleapis.com/${process.env.DEV_STORAGE_BUCKET}/`;

            let newFileLocation = GCPath + newPath;
            //console.log("newFileLocation", newFileLocation);

            const updateLocation = await FileDetail.findByIdAndUpdate(ids, {
              fileLocation: newFileLocation,
            });

            if (updateLocation) {
              res.status(200).json({
                success: true,
                msg: `File Accepted Successfully`,
                //data: userDetails,
              });
            }
          }
        }
      }
    } catch (err) {
      return next(new ErrorResponse("Internal server error", [err], 500));
    }
  },
);

//@desc     Get Rejected Audio Speakers for recovery - InterRejected - QC
//@route    GET /api/getinterrejectedspeaker/
//@access   Private
//@usedBy   Audio Recording App
exports.getInterRejectedSpeakers = asyncHandler(async (req, res, next) => {
  try {
    let UserList = await User.find(
      { district: req.user.district, interRejectedFlag: true },
      {
        speakerID: 1,
        name: 1,
      },
    );

    res.status(200).json({
      success: true,
      msg: `UserList`,
      data: UserList,
    });
  } catch (err) {
    console.log("err", err);
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Get Rejected Audio Files for recovery - InterRejected Files - QC
//@route    GET /api/getinterrejectedfiles/
//@access   Private
//@usedBy   Audio Recording App
exports.getInterRejectedFiles = asyncHandler(async (req, res, next) => {
  try {
    //console.log("params", req.query);
    const FileList = await FileDetail.find(
      {
        district: req.user.district,
        speakerID: req.query.speakerID,
        inter1CheckStatus: "Rejected",
        status: "Accepted",
        //inter1CheckedOn:{$gte: new Date("2023-06-07")}
      },
      {
        // coordinatorRejectionReason: 1,
        // supervisorRejectionReason: 1,
        // qcRejectionReason: 1,
        // AdminRejectionReason: 1,
        fileName: 1,
        imageName: 1,
        fileLocation: 1,
        imageLocation: 1,
        _id: 1,
        fileDuration: 1,
        speakerID: 1,
        mobile: 1,
        gender: 1,
        //status: 1,
      },
    );

    //console.log("FileList", FileList.length);

    res.status(200).json({
      success: true,
      msg: `FileList`,
      data: FileList,
    });

    //console.log("distLanguages", distLanguages);
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Recover Rejected Accept File interrejected files - QualityChecker
//@route    PUT /api/qcacceptinterrejectedfile/
//@access   Private
//@usedBy   Audio Recording App
exports.updateQcInterRejectedAcceptFile = asyncHandler(
  async (req, res, next) => {
    try {
      //console.log("req.body", req.body);
      // console.log("req.user", req.user);
      let ids = mongoose.Types.ObjectId(req.body.id);
      //console.log("ids", ids);
      let setquery = {
        status: "Accepted",
        acceptedByQcId: req.user._id,
        acceptedByQcName: req.user.name,
        isQcAccepted: true,
        FileRecoveryProcessed: true,
        qcAcceptedOn: Date.now(),
        inter1CheckById: req.user._id,
        inter1CheckByName: req.user.name,
        inter1CheckStatus: "Accepted",
        inter1CheckedOn: Date.now(),
      };

      //console.log("setquery", setquery);

      //console.log("query", query);
      const updatefile = await FileDetail.findByIdAndUpdate(ids, setquery);

      if (updatefile) {
        //console.log("inside updatefile");
        const FileLocations = await FileDetail.findById(ids, {
          fileLocation: 1,
          state: 1,
          district: 1,
          _id: 0,
        });

        //console.log("FileLocations", FileLocations);

        if (FileLocations) {
          const gcTempFiles =
            process.env.NODE_ENV === "production"
              ? gc.bucket(process.env.PROD_STORAGE_BUCKET)
              : gc.bucket(process.env.DEV_STORAGE_BUCKET);

          let oldPath =
            process.env.NODE_ENV === "production"
              ? FileLocations.fileLocation.split(
                  `${process.env.PROD_STORAGE_BUCKET}/`,
                )[1]
              : FileLocations.fileLocation.split(
                  `${process.env.DEV_STORAGE_BUCKET}/`,
                )[1];

          //console.log("oldPath", oldPath);
          //https://storage.googleapis.com/image-audio-recording/Audios/WestBengal_Kolkata/WB_Kolkata_Pakh26204_1232290000_KTBBU_320553.wav

          let replaceString = oldPath.split("/")[0];
          //console.log("replaceString", replaceString);

          let state = FileLocations.state.replace(/[^a-z\d]+/gi, "");
          let district = FileLocations.district.replace(/[^a-z\d]+/gi, "");

          // let newPath = oldPath.replace(
          //   `Audios/${state + "_" + district}/`,
          //   `Speakerwisefiles/${speakerID}/`
          // );

          let curdate = new Date().toISOString().split("T");
          // console.log("curdate", curdate);
          let newPath = oldPath.replace(
            `${replaceString + "/" + state + "_" + district}/`,
            `RejectedRecoveredfiles/${curdate[0]}/${req.body.speakerID}/`,
          );

          //console.log("newPath", newPath);

          const [files] =
            process.env.NODE_ENV === "production"
              ? await gc.bucket(process.env.PROD_STORAGE_BUCKET).getFiles({
                  //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                  prefix: oldPath,
                })
              : await gc.bucket(process.env.DEV_STORAGE_BUCKET).getFiles({
                  //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
                  prefix: oldPath,
                });

          // console.log("files", files);

          if (files.length > 0) {
            await gcTempFiles.file(oldPath).move(newPath);

            const GCPath =
              process.env.NODE_ENV === "production"
                ? `https://storage.googleapis.com/${process.env.PROD_STORAGE_BUCKET}/`
                : `https://storage.googleapis.com/${process.env.DEV_STORAGE_BUCKET}/`;

            let newFileLocation = GCPath + newPath;
            // console.log("newFileLocation", newFileLocation);

            const updateLocation = await FileDetail.findByIdAndUpdate(ids, {
              fileLocation: newFileLocation,
            });

            if (updateLocation) {
              res.status(200).json({
                success: true,
                msg: `File Accepted Successfully`,
                //data: userDetails,
              });
            }
          }
        }
      }
    } catch (err) {
      return next(new ErrorResponse("Internal server error", [err], 500));
    }
  },
);

/************************************************************************************/
//Need to delete below API after work completed
//@desc     Get Coordinator name List for QC
//@route    GET /api/getoldcoordinatorsforqc/
//@access   Public
//@usedBy   Audio Recording App
exports.getOldCoordinatorsForQC = asyncHandler(async (req, res, next) => {
  try {
    // console.log("req.query", req.query.state, req.query.district)

    const coordinatorList = await FileDetail.distinct("coordinatorName", {
      state: req.query.state,
      district: req.query.district,
      // role: "Coordinator",
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

//Need to delete below API after work completed
//@desc     Get Coordinator wise Inter Accepted User list - QualityChecker
//@route    GET /api/getoldinteracceptedusers/
//@access   Private
//@usedBy   Audio Recording App
exports.getOldInterAcceptedUsers = asyncHandler(async (req, res, next) => {
  console.log("req.query", req.query);
  try {
    const Users = await User.find({
      role: "Vendor",
      state: req.query.state,
      district: req.query.district,
      isactive: true,
      coordinator: req.query.coordinator,
      isInterAccepted: true,
      createdOn: { $lt: new Date("2024-02-20") },
    });

    //console.log("Users", Users);
    let UserArray = [];
    let userObj = {};
    let rowCount = 0;
    Users.map(async (row) => {
      let qcPendingCount = await FileDetail.countDocuments({
        $and: [
          { userID: row._id },
          { isQcAccepted: { $nin: [true] } },
          { status: "Accepted" },
          { inter1CheckStatus: "Accepted" },
        ],
      });

      userObj = {
        speakerID: row.speakerID,
        latitude: row.latitude,
        longitude: row.longitude,
        name: row.name,
        recordedHours: row.recordedHours,
        qcPendingCount: qcPendingCount,
        mobile: row.mobile,
        age: row.age,
        gender: row.gender,
      };

      UserArray.push(userObj);
      rowCount++;
      // console.log("rowCount, length", rowCount, Users.length);
      if (rowCount == Users.length) {
        // console.log("UserArray inside", UserArray);
        res.status(200).json({
          success: true,
          msg: `User List`,
          data: UserArray,
        });
      }
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Get Inter Accepted File Details - QC
//@route    GET /api/getoldinteracceptedfiles/
//@access   Private
//@usedBy   Audio Recording App
exports.getOldInterAcceptedFiles = asyncHandler(async (req, res, next) => {
  try {
    //console.log("req.query", req.query);
    const userDetails = await FileDetail.find({
      mobile: req.query.mobile,
      speakerID: req.query.speakerID,
      inter1CheckStatus: "Accepted",
      status: "Accepted",
      //isQcAccepted: false,
      isQcAccepted: { $nin: [true] },
      //FileRecoveryProcessed: { $exists: false },
    });

    // console.log("userDetails", userDetails.length);
    res.status(200).json({
      success: true,
      msg: `User Details`,
      data: userDetails,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Accept File - QualityChecker
//@route    PUT /api/qcoldacceptfile/
//@access   Private
//@usedBy   Audio Recording App
exports.updateQcOldAcceptFile = asyncHandler(async (req, res, next) => {
  try {
    console.log("req.body", req.body);
    // console.log("req.user", req.user);
    let ids = mongoose.Types.ObjectId(req.body.id);
    //console.log("ids", ids);
    let query = {
      acceptedByQcId: req.user._id,
      acceptedByQcName: req.user.name,
      isQcAccepted: true,
      qcAcceptedOn: Date.now(),
      // intra1Speaker: req.body.intra1Speaker,
      // intra1SpeakerCheckedBy: req.user.name,
    };

    // if (req.body.qcaccepted) {
    //   query = {
    //     intra1Speaker: req.body.intra1Speaker,
    //     intra1SpeakerCheckedBy: req.user.name,
    //   };
    // } else {
    //   query = {
    //     acceptedByQcId: req.user._id,
    //     acceptedByQcName: req.user.name,
    //     isQcAccepted: true,
    //     qcAcceptedOn: Date.now(),
    //     intra1Speaker: req.body.intra1Speaker,
    //     intra1SpeakerCheckedBy: req.user.name,
    //   };
    // }

    //console.log("query", query);
    const updatefile = await FileDetail.findByIdAndUpdate(ids, query);

    if (updatefile) {
      // console.log("inside false");
      const QCedFileLocation = await FileDetail.findById(ids, {
        fileLocation: 1,
        state: 1,
        district: 1,
        _id: 0,
      });
      //console.log("QCedFileLocation", QCedFileLocation);

      const gcTempFiles =
        process.env.NODE_ENV === "production"
          ? gc.bucket(process.env.PROD_STORAGE_BUCKET)
          : gc.bucket(process.env.DEV_STORAGE_BUCKET);

      let oldPath =
        process.env.NODE_ENV === "production"
          ? QCedFileLocation.fileLocation.split(
              `${process.env.PROD_STORAGE_BUCKET}/`,
            )[1]
          : QCedFileLocation.fileLocation.split(
              `${process.env.DEV_STORAGE_BUCKET}/`,
            )[1];

      // https://storage.googleapis.com/staging-image-audio-recording/Audios/Uttarpradesh_JyotibaPhuleNagar/UP_JyotibaP_09050764_1205500530_Tajmahal.wav
      let state = QCedFileLocation.state.replace(/[^a-z\d]+/gi, "");
      let district = QCedFileLocation.district.replace(/[^a-z\d]+/gi, "");
      let nPath = new Date().toISOString().split("T");
      // nPath = nPath.split("T");
      console.log(nPath);

      let newPath = oldPath.replace("Rejected", "");
      newPath = newPath.replace(
        `Audios/${state + "_" + district}/`,
        `QCFiles/${nPath[0]}/`,
      );

      //console.log("newPath", newPath);

      const [files] =
        process.env.NODE_ENV === "production"
          ? await gc.bucket(process.env.PROD_STORAGE_BUCKET).getFiles({
              //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
              prefix: oldPath,
            })
          : await gc.bucket(process.env.DEV_STORAGE_BUCKET).getFiles({
              //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
              prefix: oldPath,
            });

      //console.log("files", files);

      if (files.length > 0) {
        await gcTempFiles.file(oldPath).copy(newPath);
      }
    }

    console.log("updatefile", updatefile);
    res.status(200).json({
      success: true,
      msg: `File Accepted Successfully`,
      //data: userDetails,
    });
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     Generate random image for voice verification - Vendor
//@route    GET/api/getvoiceverifyimage/
//@access   Private
//@usedBy   Audio Recording App
exports.generateVoiceVerifyRandomImage = asyncHandler(
  async (req, res, next) => {
    try {
      const bucketName = process.env.PROD_STORAGE_BUCKET;
      const bucket = gc.bucket(bucketName);

      const imagesFolderPath = "GodavariVoiceVerificationImages";

      const [imageFiles] = await bucket.getFiles({ prefix: imagesFolderPath });

      if (imageFiles.length === 0) {
        return next(new ErrorResponse("No images found", [], 404));
      }

      const randomImage =
        imageFiles[Math.floor(Math.random() * imageFiles.length)];

      const randomImageName = randomImage.name;

      const imageUrl = `https://storage.googleapis.com/${bucketName}/${randomImageName}`;

      res.status(200).json({
        success: true,
        msg: `Random image generated successfully`,
        url: imageUrl,
      });
    } catch (err) {
      console.log(err);
      return next(
        new ErrorResponse(
          "Something went wrong! Please try again!",
          [err],
          500,
        ),
      );
    }
  },
);

//@desc     Update Gender or Language of User - QualityChecker
//@route    PUT /api/qclanguagegenderupdateuser/
//@access   Private
//@usedBy   Audio Recording App
exports.updateQcLangGenderUser = asyncHandler(async (req, res, next) => {
  try {
    console.log("req.body", req.body);
    // console.log("req.user", req.user);
    let ids = mongoose.Types.ObjectId(req.body.id);
    //console.log("ids", ids);
    let setquery = {
      language: req.body.language,
      gender: req.body.gender,
    };

    //console.log("setquery", setquery);

    let setUserQuery = {
      language: req.body.language,
      gender: req.body.gender,
      knownlanguages: req.body.language,
    };

    //console.log("query", query);
    const updatefile = await FileDetail.updateMany(
      { mobile: req.body.mobile, speakerID: req.body.speakerID },
      setquery,
    );

    if (updatefile) {
      const updateuser = await User.findByIdAndUpdate(ids, setUserQuery);

      if (updateuser) {
        res.status(200).json({
          success: true,
          msg: `User Updated Successfully`,
          //data: userDetails,
        });
      }
    }
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc     get Qc Report - QualityChecker
//@route    get /api/qcreport/
//@access   Private
//@usedBy   Audio Recording App
exports.getQcReport = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, status } = req.query;

  if (!startDate || !endDate) {
    return next(
      new ErrorResponse("Please provide startDate and endDate", [], 400),
    );
  }

  let query = {
    phase: 2,
    recordedOn: {
      $gte: new Date(startDate),
      $lt: new Date(endDate),
    },
  };

  if (status === "Accepted") {
    query.isQcAccepted = true;
  } else if (status === "Rejected") {
    query.isQcAccepted = false;
    query.qcRejectedOn = { $exists: true, $ne: null };
  }

  const results = await FileDetail.find(query).select(
    "acceptedByQcName fileDuration speakerID district qcAcceptedOn qcRejectedOn state rejectedByQcName fileName coordinatorName qcRejectionReason",
  );

  const formattedResults = results.map((item) => {
    const itemObj = item.toObject();
    return {
      ...itemObj,
      decisionDate: item.qcAcceptedOn || item.qcRejectedOn,
    };
  });

  res.status(200).json({
    success: true,
    data: formattedResults,
  });
});
