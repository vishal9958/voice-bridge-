const FileDetail = require("../model/fileDetailsModel");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const mongoose = require("mongoose");
const { Storage } = require("@google-cloud/storage");
const path = require("path");
const fs = require("fs");
const moment = require("moment");
const axios = require("axios");
// const GetCurrentDateTime = require("../../utils/common.js");

// let momentdatetime = moment().format();
// let CurrentDateTime = momentdatetime.replace(/[^a-z\d]+/gi, "");

let gc =
  process.env.NODE_ENV === "production"
    ? new Storage({
        keyFilename: path.join(
          __dirname,
          "../audio-recording-portal-1e39ec3444d2.json"
        ),
        projectId: process.env.PROJECT_ID,
      })
    : new Storage({
        keyFilename: path.join(
          __dirname,
          "../audio-recording-portal-1e39ec3444d2.json"
        ),
        projectId: process.env.PROJECT_ID,
      });

//@desc     Read Audio file from GCP
//@route    GET /api/editor/
//@access   Private
//@usedBy   Audio Recording Portal
exports.getReadAudio = asyncHandler(async (req, res, next) => {
  //console.log("req", req.params);
  const id = mongoose.Types.ObjectId(req.params.id);
  const fileDetails = await FileDetail.findById(id);

  //console.log("fileDetails", fileDetails);
  const transcriberGCPBucket =
    process.env.NODE_ENV === "production"
      ? gc.bucket(process.env.PROD_STORAGE_BUCKET)
      : gc.bucket(process.env.DEV_STORAGE_BUCKET);

  const gcFileLocation =
    process.env.NODE_ENV === "production"
      ? fileDetails.JsonFileLocation.split(
          `${process.env.PROD_STORAGE_BUCKET}/`
        )
      : fileDetails.JsonFileLocation.split(
          `${process.env.DEV_STORAGE_BUCKET}/`
        );

  const gcFileName = gcFileLocation[1];
  //console.log("gcFileName", gcFileName);

  let buffer = "";
  let file = transcriberGCPBucket.file(gcFileName);
  file.exists().then(async function (data) {
    //console.log("data[0]..", data);
    //fileexists = data[0];
    if (data[0]) {
      file
        .createReadStream()
        .setEncoding("utf-8")
        .on("data", (data) => {
          buffer += data;
        })
        .on("end", () => {
          // console.log("buffer", buffer);
          if (!fileDetails) {
            return next(new ErrorResponse(`File could not be found`, [], 404));
          } else {
            //console.log("readjson fileDetails is ", fileDetails);

            //console.log("readjson buffer is ", buffer);

            res.status(200).json({
              success: true,
              data: fileDetails,
              buffer: buffer,
            });
          }
        })
        .on("error", function (err) {
          console.log("File does not exist");
        });
    } else {
      const fileUrl = fileDetails.fileLocation;
      if (!fileUrl)
        return next(new ErrorResponse(`File could not be found`, [], 404));

      try {
        const response = await axios.post(
          "https://prodinterintrasegapi-yzuukhdvga-as.a.run.app/api/segment",
          {
            file: fileUrl && fileUrl,
          }
        );

        const fileLocation = `SegmentationJsonFiles/${fileDetails.state}_${
          fileDetails.district
        }/${fileDetails.fileName.split(".")[0]}.json`;

        const jsonString = JSON.stringify(response.data.segments);
        const file = transcriberGCPBucket.file(fileLocation);
        await file.save(jsonString, {
          resumable: false,
          gzip: true,
          metadata: {
            contentType: "application/json;charset=utf-8",
          },
        });

        res.status(200).json({
          success: true,
          data: fileDetails,
          buffer: response.data.segments,
        });
      } catch (err) {
        console.log(err.message);
        return next(new ErrorResponse(`Something went wrong`, [], 500));
      }
    }
  });
});

//@desc     Save Google GG data into Json File GCP
//@route    PUT /api/editor
//@access   Private
//@usedBy   Audio Recording Portal
exports.saveGGJsonData = asyncHandler(async (req, res, next) => {
  let trsdataarray = [];

  // const { _id: id } = req.user;
  const { FileId } = req.body;
  //console.log("trsdataarray", req.body.segmentarray);
  req.body.segmentarray.map((data, index) => {
    //console.log("trsdataarray", data.segmentData);
    trsdataarray.push({
      id: data.id,
      startTime: data.startTime,
      segmentData: decodeURI(data.segmentData),
      endTime: data.endTime,
      speakerId: data.speakerId,
      segmentNo: data.segmentNo,
    });
  });

  const result = await FileDetail.findByIdAndUpdate(FileId, {
    SegmentationStatus: "InProgress",
  });

  const fileDetails = await FileDetail.findById(req.body.FileId);

  if (!fileDetails) {
    return next(new ErrorResponse(`File could not be found`, [], 404));
  } else {
    const transcriberGCPBucket =
      process.env.NODE_ENV === "production"
        ? gc.bucket(process.env.PROD_STORAGE_BUCKET)
        : gc.bucket(process.env.DEV_STORAGE_BUCKET);

    const gcFileLocation =
      process.env.NODE_ENV === "production"
        ? fileDetails.JsonFileLocation.split(
            `${process.env.PROD_STORAGE_BUCKET}/`
          )
        : fileDetails.JsonFileLocation.split(
            `${process.env.DEV_STORAGE_BUCKET}/`
          );

    const gcFileName = gcFileLocation[1];

    //console.log("gcFileName", gcFileName);

    let file = transcriberGCPBucket.file(gcFileName);
    file
      .createWriteStream({
        resumable: false,
        gzip: true,
        metadata: {
          cacheControl: "public, max-age=0",
          contentType: "application/json;charset=utf-8",
        },
      })
      .end(JSON.stringify(trsdataarray));
    //console.log("JSON.stringify(trsdataarray)", JSON.stringify(trsdataarray));
    //}
  }

  res.status(200).json({
    success: true,
    msg: `File saved Successfully`,
    //data: jobs,
  });

  // else {
  //   return next(
  //     new ErrorResponse(`Something went wrong. Please try again`, [], 500)
  //   );
  // }
});

//@desc     Update file status when Transcriber editor screen is submitted - Google
//@route    PUT /api/submitggeditorform
//@access   Private
//@usedBy   Audio Recording Portal
exports.submitGGForm = asyncHandler(async (req, res, next) => {
  //const { _id: uid } = req.user;
  const { FileId } = req.body;
  //console.log("segmentarray details", FileId, stage, proofreadComment);
  //let currentDateTime = await GetCurrentDateTime();
  //console.log("currentDateTime..", currentDateTime);
  //https://storage.cloud.google.com/transcriberprojects/TRPRVersions/editor_tags.txt
  let trsdataarray = [];

  //console.log("segmentarray details", req.body.segmentarray);
  req.body.segmentarray.map((data, index) => {
    trsdataarray.push({
      id: data.id,
      startTime: data.startTime,
      segmentData: decodeURI(data.segmentData),
      endTime: data.endTime,
      speakerId: data.speakerId,
      segmentNo: data.segmentNo,
    });
    //console.log("trsdataarray", data.segmentData);
  });
  //console.log("trsdataarray", trsdataarray);

  const result = await FileDetail.findByIdAndUpdate(FileId, {
    SegmentationStatus: "Completed",
    SegmentationDoneByID: req.user._id,
    SegmentationDoneByName: req.user.name,
    SegmentationcompletedOn: Date.now(),
  });

  if (result) {
    res.status(200).json({
      success: true,
      msg: `Segmentation Submitted Successfully`,
      //data: jobs,
    });
  }
});
