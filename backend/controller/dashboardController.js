const { lang } = require("moment");
const asyncHandler = require("../middleware/async");
const FileDetails = require("../model/fileDetailsModel");
const DashBoard = require("../model/dashboardModel");
// const RecordingRatio = require('../model/recordingRatioModel');
function isValidDate(dateString) {
  // Regular expression to match YYYY-MM-DD format
  const regex = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
  if (!regex.test(dateString)) {
    return false;
  }
  // Extract year, month, and day from the date string
  const [_, year, month, day] = dateString.match(regex);
  // Convert to numbers
  const yearNum = parseInt(year, 10);
  const monthNum = parseInt(month, 10);
  const dayNum = parseInt(day, 10);
  // Check for valid date using JavaScript's Date object
  const date = new Date(yearNum, monthNum - 1, dayNum);
  return (
    date.getFullYear() === yearNum &&
    date.getMonth() === monthNum - 1 &&
    date.getDate() === dayNum
  );
}

exports.districtSummary = asyncHandler(async (req, res, next) => {
  try {
    // Calculate the date range for the last 24 hours
    const twoHoursAgo = new Date();
    //const twoHoursAgo = new Date("2025-04-31");
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const summary = await FileDetails.aggregate([
      // Previous code commented out as requested
      /*
      {
        $match: {
          recordedOn: { $lt: twoHoursAgo },
          phase: 2,
        },
      },
      */

      // New code added to filter for specific state/districts
      {
        $match: {
          recordedOn: { $lt: twoHoursAgo },
          $or: [
            { state: "JammuAndKashmir", district: "Srinagar" },
            { state: "Ladakh", district: "Leh" },
          ],
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
          SegmentationStatus: 1,
          deliveryStatus: 1,
        },
      },
      // Step 3: Group the data
      {
        $group: {
          _id: {
            state: "$state",
            district: "$district",
          },
          totalAudioRecorded: { $sum: "$fileDurationSecs" },
          totalAudioValidated: {
            $sum: { $cond: ["$isQcAccepted", "$fileDurationSecs", 0] },
          },
          totalAudioSegmented: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$isQcAccepted", true] },
                    { $lte: ["$qcAcceptedOn", fiveDaysAgo] },
                    { $eq: ["$SegmentationStatus", "Completed"] },
                  ],
                },
                "$fileDurationSecs",
                0,
              ],
            },
          },
          totalAudioDelivered: {
            $sum: {
              $cond: [
                { $eq: ["$deliveryStatus", "Delivered"] },
                "$fileDurationSecs",
                0,
              ],
            },
          },
          totalSpeechDelivered: {
            $sum: {
              $cond: [
                { $eq: ["$deliveryStatus", "Delivered"] },
                "$speechDurationSec",
                0,
              ],
            },
          },
          // readyForDelivery: {
          //   $subtract: ["$totalAudioValidated", "$totalAudioDelivered"],
          // },
        },
      },
      // Step 4: Restructure Output
      {
        $project: {
          state: "$_id.state",
          district: "$_id.district",
          totalAudioRecorded: 1,
          totalAudioValidated: 1,
          totalAudioSegmented: 1,
          totalAudioDelivered: 1,
          totalSpeechDelivered: 1,
          //readyForDelivery: { $subtract: ["$totalAudioValidated", "$totalAudioDelivered"] },
          readyForDelivery: { $literal: 0 },
          _id: 0,
        },
      },
    ]);

    console.log("summary", summary);
    // Return the response
    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error(error); // Log the error for easier debugging
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

exports.ageDistribution = asyncHandler(async (req, res, next) => {
  try {
    const twoHoursAgo = new Date(
      new Date().setHours(new Date().getHours() - 2)
    );

    // const twoHoursAgo = new Date(
    //   new Date("2025-04-31").setHours(new Date().getHours() - 2)
    // );

    const ageDistribution = await FileDetails.aggregate([
      // Previous code commented out as requested
      /*
      {
        $match: {
          recordedOn: {
            $lt: twoHoursAgo,
          },
          phase: 2,
        },
      },
      */
      // New code added to filter for specific state/districts
      {
        $match: {
          recordedOn: { $lt: twoHoursAgo },
          $or: [
            { state: "JammuAndKashmir", district: "Srinagar" },
            { state: "Ladakh", district: "Leh" },
          ],
        },
      },
      // Add a new field to categorize age into ranges using $project
      {
        $project: {
          state: 1,
          district: 1,
          fileDurationSecs: 1,
          age: 1,
          // Bucket age into defined ranges
          ageGroup: {
            $switch: {
              branches: [
                {
                  case: {
                    $and: [{ $gte: ["$age", 20] }, { $lte: ["$age", 30] }],
                  },
                  then: "20-30",
                }, // Ages 20 to 30
                {
                  case: {
                    $and: [{ $gte: ["$age", 31] }, { $lte: ["$age", 40] }],
                  },
                  then: "31-40",
                }, // Ages 31 to 40
                {
                  case: {
                    $and: [{ $gte: ["$age", 41] }, { $lte: ["$age", 50] }],
                  },
                  then: "41-50",
                }, // Ages 41 to 50
                {
                  case: {
                    $and: [{ $gte: ["$age", 51] }, { $lte: ["$age", 60] }],
                  },
                  then: "51-60",
                }, // Ages 51 to 60
                {
                  case: {
                    $and: [{ $gte: ["$age", 61] }, { $lte: ["$age", 70] }],
                  },
                  then: "61-70",
                }, // Ages 61 to 70
                { case: { $gte: ["$age", 71] }, then: "71+" },
              ],
            },
          },
        },
      },
      // Group by state and district, and sum fileDurationSec for each ageGroup
      {
        $group: {
          _id: {
            state: "$state",
            district: "$district",
            ageGroup: "$ageGroup",
          },
          totalFileDurationSec: { $sum: "$fileDurationSecs" }, // Sum of fileDurationSec for each group
        },
      },
      // Restructure the output so that ageGroup is a nested object with age ranges as keys
      {
        $group: {
          _id: {
            state: "$_id.state",
            district: "$_id.district",
          },
          ageGroup: {
            $push: {
              k: "$_id.ageGroup",
              v: "$totalFileDurationSec",
            },
          },
        },
      },
      // Convert the array of key-value pairs into an object
      {
        $project: {
          district: "$_id.district",
          state: "$_id.state",
          ageGroup: {
            $arrayToObject: "$ageGroup",
          },
          _id: 0,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: ageDistribution,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

exports.genderDistribution = asyncHandler(async (req, res, next) => {
  try {
    const twoHoursAgo = new Date(
      new Date().setHours(new Date().getHours() - 2)
    );

    // const twoHoursAgo = new Date(
    //   new Date("2025-04-31").setHours(new Date().getHours() - 2)
    // );

    const genderDistribution = await FileDetails.aggregate([
      // Previous code commented out as requested
      /*
      {
        $match: {
          recordedOn: {
            $lt: twoHoursAgo,
          },
          phase: 2,
        },
      },
      */

      // New code added to filter for specific state/districts
      {
        $match: {
          recordedOn: { $lt: twoHoursAgo },
          $or: [
            { state: "JammuAndKashmir", district: "Srinagar" },
            { state: "Ladakh", district: "Leh" },
          ],
        },
      },
      // Group by state, district, and gender, and sum fileDurationSec for each gender
      {
        $group: {
          _id: {
            state: "$state",
            district: "$district",
            gender: "$gender",
          },
          totalFileDurationSec: { $sum: "$fileDurationSecs" }, // Sum of fileDurationSecs for each group
        },
      },
      // Restructure the data to include gender as a nested object
      {
        $group: {
          _id: {
            state: "$_id.state",
            district: "$_id.district",
          },
          gender: {
            $push: {
              k: "$_id.gender", // Gender (male or female)
              v: "$totalFileDurationSec", // File duration for that gender
            },
          },
        },
      },
      // Convert the array of key-value pairs into an object with gender keys
      {
        $project: {
          district: "$_id.district",
          state: "$_id.state",
          gender: {
            $arrayToObject: "$gender", // Converts the array of [key, value] pairs into an object
          },
          _id: 0,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: genderDistribution,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

exports.languageDistribution = asyncHandler(async (req, res, next) => {
  try {
    const twoHoursAgo = new Date(
      new Date().setHours(new Date().getHours() - 2)
    );

    // const twoHoursAgo = new Date(
    //   new Date("2025-04-31").setHours(new Date().getHours() - 2)
    // );

    const languageDistribution = await FileDetails.aggregate([
      // Previous code commented out as requested
      /*
      {
        $match: {
          recordedOn: {
            $lt: twoHoursAgo,
          },
          phase: 2,
        },
      },
      */
      // New code added to filter for specific state/districts
      {
        $match: {
          recordedOn: { $lt: twoHoursAgo },
          $or: [
            { state: "JammuAndKashmir", district: "Srinagar" },
            { state: "Ladakh", district: "Leh" },
          ],
        },
      },
      // Group by state, district, and language, and sum fileDurationSec for each language
      {
        $group: {
          _id: {
            state: "$state",
            district: "$district",
            language: "$language",
          },
          totalFileDurationSec: { $sum: "$fileDurationSecs" }, // Sum of fileDurationSecs for each group
        },
      },
      // Restructure the data to include language as a nested object
      {
        $group: {
          _id: {
            state: "$_id.state",
            district: "$_id.district",
          },
          language: {
            $push: {
              k: "$_id.language", // Language
              v: "$totalFileDurationSec", // File duration for that language
            },
          },
        },
      },
      // Convert the array of key-value pairs into an object with language keys
      {
        $project: {
          district: "$_id.district",
          state: "$_id.state",
          language: {
            $arrayToObject: "$language", // Converts the array of [key, value] pairs into an object
          },
          _id: 0,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: languageDistribution,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

exports.socioEconomicDistribution = asyncHandler(async (req, res, next) => {
  try {
    const twoHoursAgo = new Date(
      new Date().setHours(new Date().getHours() - 2)
    );

    // const twoHoursAgo = new Date(
    //   new Date("2025-04-31").setHours(new Date().getHours() - 2)
    // );

    const socioEconomicDistribution = await FileDetails.aggregate([
      // Previous code commented out as requested
      /*
      {
        $match: {
          recordedOn: {
            $lt: twoHoursAgo,
          },
          phase: 2,
        },
      },
      */
      // New code added to filter for specific state/districts
      {
        $match: {
          recordedOn: { $lt: twoHoursAgo },
          $or: [
            { state: "JammuAndKashmir", district: "Srinagar" },
            { state: "Ladakh", district: "Leh" },
          ],
        },
      },
      // Group by state, district, and socioeconomicstatus, and sum fileDurationSec for each socioeconomicstatus
      {
        $group: {
          _id: {
            state: "$state",
            district: "$district",
            socioeconomicstatus: "$socioeconomicstatus",
          },
          totalFileDurationSec: { $sum: "$fileDurationSecs" }, // Sum of fileDurationSecs for each group
        },
      },
      // Restructure the data to include socioeconomicstatus as a nested object
      {
        $group: {
          _id: {
            state: "$_id.state",
            district: "$_id.district",
          },
          socioeconomicstatus: {
            $push: {
              k: { $ifNull: ["$_id.socioeconomicstatus", "Unknown"] }, // Socio-economic status
              v: "$totalFileDurationSec", // File duration for that socio-economic status
            },
          },
        },
      },
      // Convert the array of key-value pairs into an object with socio-economic status keys
      {
        $project: {
          district: "$_id.district",
          state: "$_id.state",
          socioeconomicstatus: {
            $arrayToObject: "$socioeconomicstatus", // Converts the array of [key, value] pairs into an object
          },
          _id: 0,
        },
      },
    ]);

    // from socioeconomicstatus, replace all keys space with _
    const updatedSocioEconomicDistribution = socioEconomicDistribution.map(
      (item) => {
        const newSocioEconomicStatus = {};
        Object.keys(item.socioeconomicstatus).forEach((key) => {
          newSocioEconomicStatus[key.replace(/\s/g, "_")] =
            item.socioeconomicstatus[key];
        });
        return {
          state: item.state,
          district: item.district,
          socioeconomicstatus: newSocioEconomicStatus,
        };
      }
    );

    res.status(200).json({
      success: true,
      data: updatedSocioEconomicDistribution,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

exports.weeklyRecording = asyncHandler(async (req, res, next) => {
  try {
    const { year, month } = req.query;

    // check if year and month are number or not
    if (isNaN(Number(year)) || isNaN(Number(month))) {
      return res.status(400).json({
        success: false,
        message: "Invalid year or month",
      });
    }

    // convert year and month to number
    const yearNumber = Number(year);
    const monthNumber = Number(month);

    // check if month is between 1 and 12
    if (monthNumber < 1 || monthNumber > 12) {
      return res.status(400).json({
        success: false,
        message: "Invalid month",
      });
    }

    const startDate = new Date(yearNumber, monthNumber - 1, 1); // First day of the month
    const endDate = new Date(yearNumber, monthNumber, 0, 23, 59, 59, 999); // Last day of the month

    const result = await FileDetails.aggregate([
      {
        $match: {
          recordedOn: { $gte: startDate, $lte: endDate },
          phase: 2,
        },
      },
      {
        $project: {
          week: {
            $floor: {
              $divide: [
                { $subtract: ["$recordedOn", startDate] },
                1000 * 60 * 60 * 24 * 7,
              ],
            },
          },
          fileDurationSecs: 1,
        },
      },
      {
        $group: {
          _id: "$week", // Group by calculated week number
          totalDuration: { $sum: "$fileDurationSecs" },
        },
      },
      {
        $sort: { _id: 1 },
      },
      {
        $project: {
          _id: 0,
          week: { $add: ["$_id", 1] }, // Convert zero-based weeks to 1-based
          totalDuration: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

exports.updateNextDeliveryDate = asyncHandler(async (req, res, next) => {
  try {
    const { date } = req.body;
    // console.log("Received Headers:", req.headers);
    console.log("Received Body Type:", typeof req.body);
    console.log("date", date);
    if (!isValidDate(date)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Date Format",
      });
    }
    await DashBoard.updateOne(
      { type: "next_expected_delivery_date" },
      { date: date }
    );
    res.status(200).json({
      success: true,
      message: "Next Delivery Date Updated Successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

exports.updateLastDeliveryDate = asyncHandler(async (req, res, next) => {
  try {
    const { date } = req.body;
    // check if date is valid and in DD-MM-YYYY format
    if (!isValidDate(date)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Date Format",
      });
    }

    await DashBoard.updateOne(
      { type: "last_batch_delivery_date" },
      { date: date }
    );
    res.status(200).json({
      success: true,
      message: "Last Delivery Date Updated Successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

exports.updateRejectedDuration = asyncHandler(async (req, res, next) => {
  try {
    const { duration } = req.body;
    // check if duration is number or not
    if (isNaN(Number(duration))) {
      return res.status(400).json({
        success: false,
        message: "Invalid Duration",
      });
    }

    await DashBoard.updateOne(
      { type: "total_rejected_duration" },
      { duration: Number(duration) }
    );
    res.status(200).json({
      success: true,
      message: "Rejected Duration Updated Successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

exports.hightLevelSummary = asyncHandler(async (req, res, next) => {
  try {
    const twoHoursAgo = new Date();
    //const twoHoursAgo = new Date("2025-04-31");
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const allTimeSummary = await FileDetails.aggregate([
      {
        $match: {
          recordedOn: { $lt: twoHoursAgo }, // No time limit for total collection
          phase: 2,
        },
      },
      {
        $group: {
          _id: null,
          totalAudioCollected: { $sum: "$fileDurationSecs" }, // All-time data
          totalAudioDelivered: {
            $sum: {
              $cond: [
                { $eq: ["$deliveryStatus", "Delivered"] },
                "$fileDurationSecs",
                0,
              ],
            },
          },
          totalSpeechDelivered: {
            $sum: {
              $cond: [
                { $eq: ["$deliveryStatus", "Delivered"] },
                "$speechDurationSec",
                0,
              ],
            },
          },
        },
      },
    ]);

    const lastMonthSummary = await FileDetails.aggregate([
      {
        $match: {
          recordedOn: { $gte: oneMonthAgo, $lt: twoHoursAgo }, // Last 1 month data
          phase: 2,
        },
      },
      {
        $group: {
          _id: null,
          totalAudioCollectedLastMonth: { $sum: "$fileDurationSecs" },
        },
      },
      {
        $addFields: {
          avgCollectionSpeedPerWeek: {
            $divide: ["$totalAudioCollectedLastMonth", 4],
          },
        },
      },
    ]);

    const dashboardData = await DashBoard.find();
    const lastDeliveryDate =
      dashboardData.find((item) => item.type === "last_batch_delivery_date")
        .date || "";
    const nextExpectedDeliveryDate = dashboardData.find(
      (item) => item.type === "next_expected_delivery_date"
    ).date;
    const totalRejectedDuration =
      dashboardData.find((item) => item.type === "total_rejected_duration")
        .duration || 0;

    const finalSummary = {
      totalAudioCollected: allTimeSummary[0].totalAudioCollected || 0,
      totalAudioDelivered: allTimeSummary[0].totalAudioDelivered || 0,
      totalSpeechDelivered: allTimeSummary[0].totalSpeechDelivered || 0,
      avgCollectionSpeedPerWeek:
        lastMonthSummary[0].avgCollectionSpeedPerWeek || 0,
      totalRejectedDuration,
      lastDeliveryDate,
      nextExpectedDeliveryDate,
    };

    res.status(200).json({
      success: true,
      data: finalSummary,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});
