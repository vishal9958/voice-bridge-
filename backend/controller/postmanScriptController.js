const mongoose = require("mongoose");
const FileDetail = require("../model/fileDetailsModel");
const District = require("../model/districtModel");
const Image = require("../model/imagesModel");
const User = require("../model/userModel");
const Pincode = require("../model/pincodeModel");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const { Storage } = require("@google-cloud/storage");
const path = require("path");
const fs = require("fs");
const moment = require("moment");
const PinLatLongMap = require("../model/pincodesLatLongMapModel");
const xlsx = require("xlsx");

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

//@desc     Generate Transcriber ID from pincode and district to excel - one time api
//@route    GET /api/generatetranscriberid/
//@access   Private
//@usedBy   Audio Recording App
// exports.generateTranscriberID = asyncHandler(async (req, res, next) => {
//   try {
//     const pincodes = await Pincode.find();
//     console.log("pincodes", pincodes.length);
//     let transdtls = [];
//     let id = 10000;
//     let edus = ["12th pass", "Graduate", "Postgraduate"];
//     let sociecostats = ["Middle", "Lower Middle", "Upper Lower", "Lower"];
//     pincodes.map(async (pin, index) => {
//       const distlist = await District.findOne(
//         { district: pin.district },
//         { language: 1, _id: 0 }
//       ).then((result) => {
//         // if(index<3)
//         // {
//         console.log("index", index);
//         //console.log("result",result);
//         //console.log("distlist",distlist);
//         //let gends=["Male","Female"];

//         if (result) {
//           let obj = {
//             TranscriberID: id,
//             District: pin.district,
//             Pincode: pin.pincode,
//             Age: Math.floor(Math.random() * 26) + 25,
//             Gender: Math.floor(Math.random() * 2) == 1 ? "Female" : "Male",
//             Education: edus[Math.floor(Math.random() * edus.length)],
//             Socioeconomicstatus:
//               sociecostats[Math.floor(Math.random() * sociecostats.length)],
//             Experience_years: 0,
//             Languages_Read: result.language,
//             Languages_Write: result.language,
//             Languages_Speak: result.language,
//             //gends[Math.floor(Math.random() Languages_Speak* gends.length)]
//           };

//           if (obj) {
//             //console.log("obj",obj);
//             transdtls.push(obj);
//             //console.log("transdtls",transdtls);
//             id++;
//             //if(transdtls.length==pincodes.length)
//             if (transdtls.length == pincodes.length) {
//               //console.log("transdtls",transdtls);
//               const workSheet = xlsx.utils.json_to_sheet(transdtls);
//               const workBook = xlsx.utils.book_new();
//               xlsx.utils.book_append_sheet(
//                 workBook,
//                 workSheet,
//                 "Transcribers List"
//               );

//               // Generate buffer
//               xlsx.write(workBook, { bookType: "xlsx", type: "buffer" });

//               // Binary String
//               xlsx.write(workBook, { bookType: "xlsx", type: "binary" });

//               xlsx.writeFile(workBook, "transcriberlist.xlsx");
//             }
//             //console.log("index",index)
//             // if(index==2)
//             //   {
//             //     console.log("transdtls",transdtls);
//             //     res.status(200).json({
//             //                         success: true,
//             //                         msg: `IDs generated successfully`,
//             //                         //data: userDetails,
//             //     })
//             //   }
//           }
//         }

//         // }
//       });
//     });
//   } catch (err) {}
// });

//@desc     Generate filewise pincode and district to excel - one time api
//@route    GET /api/generatefilewisedistpin/
//@access   Private
//@usedBy   Audio Recording App
// exports.generateFilewiseDistPin = asyncHandler(async (req, res, next) => {
//   try {
//     const workbook = xlsx.readFile(
//       "D:\\AudioRecordingApp\\AudioRecordingPortal\\CallRecorderAPI\\segments_selected_for_final_transcription.xlsx"
//     );
//     const sheetnames = workbook.SheetNames[0];
//     const data = xlsx.utils.sheet_to_csv(workbook.Sheets[sheetnames], {
//       RS: ";",
//     }); //.sheet_to_json(workbook.Sheets[sheetnames]);
//     let arraydata = data.split(";");

//     console.log("arraydata..", arraydata[0]);
//     let transdtls = [];
//     arraydata.map(async (row, index) => {
//       //filecount++;
//       // if(index<3)
//       // {
//       let rowval = row.split(",");
//       console.log("rowval", rowval[1]);
//       let query = {
//         fileName: rowval[1],
//       };
//       let filelist = await FileDetail.find(query, {
//         district: 1,
//         pincode: 1,
//         _id: 0,
//       }).then((result) => {
//         //console.log("index",index);
//         //console.log("result",result);
//         //console.log("distlist",distlist);
//         //let gends=["Male","Female"];
//         if (result[0].district) {
//           //console.log("result",result);
//           let obj = {
//             // ImageName:rowval[0],
//             FileName: rowval[1],
//             District: result[0].district,
//             Pincode: result[0].pincode,
//             // SegmentNo:rowval[2],
//             // StartTime:rowval[3],
//             // EndTime:rowval[4],
//             // SegmentData:rowval[5],
//           };

//           if (obj) {
//             //console.log("obj",obj);
//             transdtls.push(obj);
//             //console.log("transdtls",transdtls);
//             //if(transdtls.length==arraydata.length)
//             if (arraydata.length - 1 == index) {
//               //console.log("transdtls",transdtls);
//               const workSheet = xlsx.utils.json_to_sheet(transdtls);
//               const workBook = xlsx.utils.book_new();
//               xlsx.utils.book_append_sheet(workBook, workSheet, "File List");

//               // Generate buffer
//               xlsx.write(workBook, { bookType: "xlsx", type: "buffer" });

//               // Binary String
//               xlsx.write(workBook, { bookType: "xlsx", type: "binary" });

//               xlsx.writeFile(workBook, "FileList.xlsx");
//               console.log("File created successfully");
//             }
//             //console.log("index",index)
//             // if(index==2)
//             //   {
//             //     console.log("transdtls",transdtls);
//             //     res.status(200).json({
//             //                         success: true,
//             //                         msg: `IDs generated successfully`,
//             //                         //data: userDetails,
//             //     })
//             //   }
//           }
//         } else {
//           console.log("Error --File not found", result[0]);
//         }
//       });
//       //}
//     });
//   } catch (err) {}
// });

//@desc     Copy rejected files in specific folder (One time API)- Admin
//@route    PUT /api/copyrejectedfilesspecificfolder/
//@access   Private
//@usedBy   Audio Recording App
// exports.updateCopyRejectedFilesSpecificFolder = asyncHandler(
//   async (req, res, next) => {
//     try {
//       const workbook = xlsx.readFile(
//         "C:\\Users\\vijay\\OneDrive\\Desktop\\Call recorder App\\CallRecorderAPI\\Noisy_File_Samples.xlsx"
//       );
//       const sheetnames = workbook.SheetNames[0];
//       const data = xlsx.utils.sheet_to_csv(workbook.Sheets[sheetnames], {
//         RS: ";",
//       }); //.sheet_to_json(workbook.Sheets[sheetnames]);
//       let arraydata = data.split(";");

//       console.log("arraydata..", arraydata[0]);
//       arraydata.map(async (row, index) => {
//         //console.log("row", row);
//         if (row) {
//           let fileLocation = await FileDetail.find(
//             { fileName: row },
//             {
//               fileLocation: 1,
//               _id: 0,
//             }
//           );
//           //console.log("fileLocation", fileLocation[0].fileLocation);
//           //https://storage.googleapis.com/image-audio-recording/RejectedAudios/Uttarpradesh_Budaun/UP_Budaun_Maya58471_1705400000_UPBUOTHER_311896.wav

//           const gcTempFiles =
//             process.env.NODE_ENV === "production"
//               ? gc.bucket(process.env.PROD_STORAGE_BUCKET)
//               : gc.bucket(process.env.DEV_STORAGE_BUCKET);

//           let oldPath =
//             process.env.NODE_ENV === "production"
//               ? fileLocation[0].fileLocation.split(`${process.env.PROD_STORAGE_BUCKET}/`)[1]
//               : fileLocation[0].fileLocation.split(
//                   `${process.env.DEV_STORAGE_BUCKET}/`
//                 )[1];

//           console.log("oldPath", oldPath);

//           let newPath = oldPath.replace("RejectedAudios/", "NoisyFileSamples/");

//           console.log("newPath", newPath);

//           // https://storage.googleapis.com/staging-image-audio-recording/Audios/Uttarpradesh_JyotibaPhuleNagar/UP_JyotibaP_09050764_1205500530_Tajmahal.wav

//           const [files] =
//             process.env.NODE_ENV === "production"
//               ? await gc.bucket(process.env.PROD_STORAGE_BUCKET).getFiles({
//                   //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
//                   prefix: oldPath,
//                 })
//               : await gc.bucket(process.env.DEV_STORAGE_BUCKET).getFiles({
//                   //prefix: "TempFiles/vijay_megdap_com/vijay20210630T1440390531",
//                   prefix: oldPath,
//                 });

//           if (files.length > 0) {
//             await gcTempFiles.file(oldPath).copy(newPath);
//           }
//         }
//       });
//     } catch (err) {
//       console.log("err", err);
//       return next(new ErrorResponse("Internal server error", [err], 500));
//     }
//   }
// );

// @desc     Update missing SpeakerID in user collection (One time API)- Admin
// @route    PUT /api/updatemissingspeakerid/
// @access   Private
// @usedBy   Audio Recording App
// exports.updateMissingSpeakerId = asyncHandler(async (req, res, next) => {
//   try {
//     const workbook = xlsx.readFile(
//       "C:\\Users\\vijay\\OneDrive\\Desktop\\Call recorder App\\CallRecorderAPI\\missingspeakers.xlsx"
//     );
//     const sheetnames = workbook.SheetNames[0];
//     const data = xlsx.utils.sheet_to_csv(workbook.Sheets[sheetnames], {
//       RS: ";",
//     }); //.sheet_to_json(workbook.Sheets[sheetnames]);
//     let arraydata = data.split(";");

//     console.log("arraydata..", arraydata[0]);
//     arraydata.map(async (row, index) => {
//       // console.log("row", row);
//       if (row) {
//         let filedtls = await FileDetail.find(
//           {
//             speakerID: row.split(",")[0].trim(),
//             district: row.split(",")[1].trim(),
//           },
//           {
//             mobile: 1,
//             speakerID: 1,
//           }
//         ).limit(1);

//         //console.log("filedtls", filedtls);

//         if (filedtls.length > 0) {
//           console.log(
//             "mobile, district",
//             filedtls[0].mobile,
//             row.split(",")[1].trim()
//           );
//           const updateuser = await User.findOneAndUpdate(
//             {
//               mobile: filedtls[0].mobile,
//               district: row.split(",")[1].trim(),
//             },
//             {
//               NoisyUserFlag: true,
//               speakerID: filedtls[0].speakerID,
//             }
//           );

//           console.log("index == arraydata.length", index, arraydata.length - 1);
//           if (index == arraydata.length - 1) {
//             res.status(200).json({
//               success: true,
//               msg: `speakerID updated successfully`,
//               //data: userDetails,
//             });
//           }
//         }
//       }
//     });
//   } catch (err) {
//     console.log("err", err);
//     return next(new ErrorResponse("Internal server error", [err], 500));
//   }
// });

// @desc     Update Noisy flag for Speaker in User collection. Rejected noisy files (One time API)- Admin
// @route    PUT /api/updateflagfornoisyspeaker/
// @access   Private
// @usedBy   Audio Recording App
exports.updateFlagForNoisySpeaker = asyncHandler(async (req, res, next) => {
  try {
    const workbook = xlsx.readFile(
      "C:\\Users\\vijay\\OneDrive\\Desktop\\Call recorder App\\CallRecorderAPI\\NoisySpeakers.xlsx"
    );
    const sheetnames = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_csv(workbook.Sheets[sheetnames], {
      RS: ";",
    }); //.sheet_to_json(workbook.Sheets[sheetnames]);
    let arraydata = data.split(";");

    console.log("arraydata..", arraydata[0]);
    arraydata.map(async (row, index) => {
      // console.log("row", row);
      if (row) {
        // let speakerid = row.split(",")[0].replace("#", "0");
        const updateuser = await User.findOneAndUpdate(
          {
            speakerID: row.split(",")[0].trim(),
            district: row.split(",")[1].trim(),
          },
          {
            NoisyUserFlag: true,
          }
        );
        console.log("index == arraydata.length", index, arraydata.length - 1);
        if (index == arraydata.length - 1) {
          res.status(200).json({
            success: true,
            msg: `Flag updated successfully`,
            //data: userDetails,
          });
        }
      }
    });
  } catch (err) {
    console.log("err", err);
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

// @desc     Update greaterthan25sec for Speaker in User collection. Rejected greaterthan25sec files (One time API)- Admin
// @route    PUT /api/updateflagforgreaterthan25sec/
// @access   Private
// @usedBy   Audio Recording App
exports.updateFlagForGreaterThan25sec = asyncHandler(async (req, res, next) => {
  try {
    const workbook = xlsx.readFile(
      "C:\\Users\\vijay\\OneDrive\\Desktop\\Call recorder App\\CallRecorderAPI\\gt25sec.xlsx"
    );
    const sheetnames = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_csv(workbook.Sheets[sheetnames], {
      RS: ";",
    }); //.sheet_to_json(workbook.Sheets[sheetnames]);
    let arraydata = data.split(";");

    console.log("arraydata..", arraydata[0]);
    arraydata.map(async (row, index) => {
      // console.log("row", row);
      if (row) {
        // let speakerid = row.split(",")[0].replace("#", "0");
        const updateuser = await User.findOneAndUpdate(
          {
            speakerID: row.split(",")[0].trim(),
            district: row.split(",")[1].trim(),
          },
          {
            GTTwentyFiveSec: true,
          }
        );
        console.log("index == arraydata.length", index, arraydata.length - 1);
        if (index == arraydata.length - 1) {
          res.status(200).json({
            success: true,
            msg: `Flag updated successfully`,
            //data: userDetails,
          });
        }
      }
    });
  } catch (err) {
    console.log("err", err);
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

// @desc     Update interRejected for Speaker in User collection. Rejected interRejected files (One time API)- Admin
// @route    PUT /api/updateflagforinterrejectedspeakers/
// @access   Private
// @usedBy   Audio Recording App
exports.updateFlagForInterRejectedSpeakers = asyncHandler(
  async (req, res, next) => {
    try {
      const workbook = xlsx.readFile(
        "C:\\Users\\vijay\\OneDrive\\Desktop\\Call recorder App\\CallRecorderAPI\\InterRejectedRecovery.xlsx"
      );
      const sheetnames = workbook.SheetNames[0];
      const data = xlsx.utils.sheet_to_csv(workbook.Sheets[sheetnames], {
        RS: ";",
      }); //.sheet_to_json(workbook.Sheets[sheetnames]);
      let arraydata = data.split(";");

      //console.log("arraydata..", arraydata[0]);
      arraydata.map(async (row, index) => {
        //console.log("row", row);
        if (row) {
          // let speakerid = row.split(",")[0].replace("#", "0");
          const updateuser = await User.findOneAndUpdate(
            {
              speakerID: row.split(",")[0].trim(),
              district: row.split(",")[1].trim(),
            },
            {
              interRejectedFlag: true,
            }
          );

          //console.log("index == arraydata.length", index, arraydata.length - 1);
          if (index == arraydata.length - 1) {
            res.status(200).json({
              success: true,
              msg: `Flag updated successfully`,
              //data: userDetails,
            });
          }
        }
      });
    } catch (err) {
      console.log("err", err);
      return next(new ErrorResponse("Internal server error", [err], 500));
    }
  }
);

//@desc     Enable bulk pincodes
//@route    GET /api/enablebulkpincodes/
//@access   Private
//@usedBy   Audio Recording App
exports.enableBulkPincodes = asyncHandler(async (req, res, next) => {
  try {
    const workbook = xlsx.readFile(
      "C:\\Users\\vijay\\OneDrive\\Desktop\\Call recorder App\\CallRecorderAPI\\pincodes.xlsx"
    );
    const sheetnames = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_csv(workbook.Sheets[sheetnames], {
      RS: ";",
    }); //.sheet_to_json(workbook.Sheets[sheetnames]);

    let arraydata = data.split(";");

    console.log("arraydata..", arraydata);
    let transdtls = [];
    arraydata.map(async (row, index) => {
      //filecount++;
      // if(index<3)
      // {
      //let rowval=row.split(",");
      //console.log("rowval",row)
      if (row) {
        let query = {
          pincode: row,
        };

        let pincode = await Pincode.findOneAndUpdate(
          query,
          { isactive: true },
          {
            new: true, //returns the updated data as response data
            runValidators: true, //mongoose validation
          }
        );
        console.log("Pincode updated ", index, row);
      }

      if (index == arraydata.length - 1) {
        res.status(200).json({
          success: true,
          msg: `Pincodes enabled successfully`,
          //data: userDetails,
        });
      }
    });
  } catch (err) {}
});

// @desc     Update "Not matching with Sample" for Speaker in User collection. Rejected "Not matching with Sample" files (One time API)- Admin
// @route    PUT /api/updateflagfornotmatchingwithsample/
// @access   Private
// @usedBy   Audio Recording App
exports.updateFlagForNotMatchingWithSample = asyncHandler(
  async (req, res, next) => {
    try {
      const workbook = xlsx.readFile(
        "D:\\secondphase implementation\\CallRecorderAPI\\Not_Matching_With_Sample_Recovery_Data1_Updated.xlsx"
      );
      const sheetnames = workbook.SheetNames[0];
      const data = xlsx.utils.sheet_to_csv(workbook.Sheets[sheetnames], {
        RS: ";",
      }); //.sheet_to_json(workbook.Sheets[sheetnames]);
      let arraydata = data.split(";");

      console.log("arraydata..", arraydata[0]);
      arraydata.map(async (row, index) => {
        // console.log("row", row);
        if (row) {
          // let speakerid = row.split(",")[0].replace("#", "0");
          const updateuser = await User.findOneAndUpdate(
            {
              speakerID: row.split(",")[0].trim(),
              mobile: row.split(",")[1].trim(),
            },
            {
              NotMatchingWithSample: true,
            }
          );
          console.log("index == arraydata.length", index, arraydata.length - 1);
          if (index == arraydata.length - 1) {
            res.status(200).json({
              success: true,
              msg: `Flag updated successfully`,
              //data: userDetails,
            });
          }
        }
      });
    } catch (err) {
      console.log("err", err);
      return next(new ErrorResponse("Internal server error", [err], 500));
    }
  }
);

//@desc     update pincode in Users and Filedetails - One time api
//@route    GET /api/updatepincodesusersfiledetails/
//@access   Private
//@usedBy   Audio Recording App

// exports.UpdatePincodesUF = asyncHandler(async (req, res, next) => {
//   try {
//     const workbook = xlsx.readFile(
//       "C:\\Users\\vijay\\OneDrive\\Desktop\\Call recorder App\\CallRecorderAPI\\updatepincodeUF.xlsx"
//     );
//     const sheetnames = workbook.SheetNames[0];
//     const data = xlsx.utils.sheet_to_csv(workbook.Sheets[sheetnames], {
//       RS: ";",
//     }); //.sheet_to_json(workbook.Sheets[sheetnames]);
//     let arraydata = data.split(";");

//     console.log("arraydata..", arraydata[0]);
//     arraydata.map(async (row, index) => {
//       console.log("row", row);
//     });
//   } catch (err) {
//     console.log("err", err);
//     return next(new ErrorResponse("Internal server error", [err], 500));
//   }
// });

exports.UpdatePincodesUF = asyncHandler(async (req, res, next) => {
  console.log("Inside");
  try {
    const workbook = xlsx.readFile(
      "C:\\Users\\vijay\\OneDrive\\Desktop\\Call recorder App\\CallRecorderAPI\\updatepincodeUF.xlsx"
    );
    const sheetnames = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_csv(workbook.Sheets[sheetnames], {
      RS: ";",
    }); //.sheet_to_json(workbook.Sheets[sheetnames]);

    console.log("data", data);
    let arraydata = data.split(";");

    console.log("arraydata..", arraydata);
    let transdtls = [];
    arraydata.map(async (row, index) => {
      //filecount++;
      // if(index<3)
      // {
      let rowval = row.split(",");
      //console.log("rowval",row)
      if (row) {
        let pincodedata = await Pincode.find(
          { district: rowval[1], isactive: true },
          { _id: 0, pincode: 1 }
        ).limit(1);

        //console.log("pincodedata", pincodedata);

        if (pincodedata[0].pincode) {
          let Userdata = await User.findByIdAndUpdate(
            rowval[0],
            { pincode: pincodedata[0].pincode },
            {
              new: true, //returns the updated data as response data
              runValidators: true, //mongoose validation
            }
          ).then(async () => {
            let FileDetailsData = await FileDetail.updateMany(
              { userID: mongoose.Types.ObjectId(rowval[0]) },
              { pincode: pincodedata[0].pincode },
              {
                new: true, //returns the updated data as response data
                runValidators: true, //mongoose validation
              }
            );
          });
        }
      }

      if (index == arraydata.length - 1) {
        res.status(200).json({
          success: true,
          msg: `Pincodes Updated successfully`,
          //data: userDetails,
        });
      }
    });
  } catch (err) {}
});
