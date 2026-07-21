const User = require("../model/userModel");
const District = require("../model/districtModel");
const Image = require("../model/imagesModel");
const Languages = require("../model/languageModel");
const FileDetail = require("../model/fileDetailsModel");
const RecordingRatio = require("../model/recordingRatioModel");
const PincodesLatLongMap = require("../model/pincodesLatLongMapModel");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
//const sendEmail = require("../utils/sendEmail");
//const crypto = require("crypto");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
var springedge = require("springedge");
const { Storage } = require("@google-cloud/storage");
const fs = require("fs");
const path = require("path");
const formData = require("form-data");
const officegen = require("officegen");

const storage = new Storage({
  projectId: process.env.PROJECT_ID,
  keyFilename: path.join(
    __dirname,
    "../audio-recording-portal-1e39ec3444d2.json",
  ),
});

const bucketName =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_STORAGE_BUCKET
    : process.env.DEV_STORAGE_BUCKET;

//@desc     Register User
//@route    POST /api/login/
//@access   Public
//@usedBy   Audio Recording App
exports.login = asyncHandler(async (req, res, next) => {
  try {
    let getUser = await User.findOne({
      mobile: req.body.mobile,
      accesscode: req.body.accesscode,
      isactive: true,
    });

    // console.log("getUser", getUser);

    if (getUser && getUser.role == "Vendor") {
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
    }

    // const apiKey = req.headers["x-api-key"];
    // if (!apiKey || apiKey !== process.env.CUSTOM_API_KEY) {
    //   return next(new ErrorResponse("Access denied for this request", [], 401));
    // }

    const { mobile, accesscode } = req.body;
    //console.log("mobile, accesscode", mobile, accesscode);

    if (!mobile || !accesscode) {
      return next(
        new ErrorResponse(
          `Please provide an mobile number and accesscode`,
          [],
          400,
        ),
      );
    } else {
      let query = { mobile, isactive: true };

      let userInfo = await User.findOne(query).select("+accesscode");

      //console.log("userInfo", userInfo);

      if (!userInfo) {
        return next(new ErrorResponse(`Invalid User`, [], 401));
      }

      let isMatched = await User.findOne({ mobile, accesscode });

      if (!isMatched) {
        return next(new ErrorResponse(`Invalid Credentials`, [], 401));
      }

      // Voice Verification Check for Vendor
      const isVoiceVerified = userInfo.voiceVerified;
      if (userInfo.role === "Vendor" && !isVoiceVerified) {
        return next(
          new ErrorResponse(`Please verify your voice first!`, [], 400),
        );
      }

      //get token
      const token = userInfo.getAuth();

      //console.log("token", token);
      //const { _id, role, name, mobile, accesscode } = userInfo;

      const user = {
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
        // recordedHours: userInfo.recordedHours,
        // pendingHours: userInfo.pendingHours,
      };

      // console.log("token..", token);
      // console.log("user..", user);

      res.status(201).json({
        success: true,
        msg: `Log In`,
        token: token,
        user,
      });
    }
  } catch (err) {
    console.log("err", err);
    return next(new ErrorResponse(`Login failed!`, [], 500));
  }
});

//@desc     Register Vendor User
//@route    POST /api/register/
//@access   Public
//@usedBy   Audio Recording App
exports.register = asyncHandler(async (req, res, next) => {
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

  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env.CUSTOM_API_KEY) {
    return next(new ErrorResponse("Access denied for this request", [], 401));
  }

  try {
    const ismobexists = await User.find({
      mobile: req.body.mobile,
      role: {
        $in: [
          "Admin",
          "Coordinator",
          "Vendor",
          "Supervisor",
          "TeamLead",
          "Manager",
          "QualityChecker",
          "Customer",
          "Intra1",
          "Intra2",
          "Inter1",
          "Inter2",
          "QCPR",
        ],
      },
    });
    // console.log("ismobexists", ismobexists);
    if (ismobexists.length > 0) {
      return next(new ErrorResponse(`Mobile Number already exists!`, [], 409));
    } else {
      // Age Group Check
      const recordingRatio = await RecordingRatio.findOne({
        district: req.body.district,
      });
      const age = parseInt(req.body.age);
      if (age < 20 || age > 70) {
        return next(
          new ErrorResponse(`Age should be between 20 and 70`, [], 400),
        );
      }
      if (recordingRatio && recordingRatio.ageGroup) {
        const userAgeGroup = Object.keys(recordingRatio.ageGroup).find(
          (group) => {
            const ageGroup = group.split("-");
            return age >= parseInt(ageGroup[0]) && age <= parseInt(ageGroup[1]);
          },
        );

        // if (userAgeGroup && recordingRatio.ageGroup[userAgeGroup]) {
        //   const totalAgeGroups = Object.keys(recordingRatio.ageGroup).length;

        //   const isAgeGroupCompleted =
        //     recordingRatio.ageGroup[userAgeGroup] >=
        //     recordingRatio.districtTotalSec / totalAgeGroups;
        //   if (isAgeGroupCompleted) {
        //     return next(
        //       new ErrorResponse(
        //         `Your entered age group recording is completed`,
        //         [],
        //         400
        //       )
        //     );
        //   }
        // }

        if (userAgeGroup && recordingRatio.ageGroup[userAgeGroup]) {
          const totalAgeGroups = Object.keys(recordingRatio.ageGroup).length;

          let isAgeGroupCompleted = false;

          if (userAgeGroup === "20-30") {
            isAgeGroupCompleted =
              recordingRatio.ageGroup[userAgeGroup] - 72000 >=
              recordingRatio.districtTotalSec / totalAgeGroups;
          }
          if (userAgeGroup === "31-40") {
            isAgeGroupCompleted =
              recordingRatio.ageGroup[userAgeGroup] - 72000 >=
              recordingRatio.districtTotalSec / totalAgeGroups;
          } else if (userAgeGroup === "51-60") {
            isAgeGroupCompleted =
              recordingRatio.ageGroup[userAgeGroup] + 72000 >=
              recordingRatio.districtTotalSec / totalAgeGroups;
          } else if (userAgeGroup === "61-70") {
            isAgeGroupCompleted =
              recordingRatio.ageGroup[userAgeGroup] + 72000 >=
              recordingRatio.districtTotalSec / totalAgeGroups;
          } else {
            isAgeGroupCompleted =
              recordingRatio.ageGroup[userAgeGroup] >=
              recordingRatio.districtTotalSec / totalAgeGroups;
          }
          if (isAgeGroupCompleted) {
            return next(
              new ErrorResponse(
                `Your entered age group recording is completed`,
                [],
                400,
              ),
            );
          }
        }
      }

      const dist = await District.find(
        { state: req.body.state, district: req.body.district },
        { phase: 1 }
      ).catch(() => []);

      const UserMobile = req.body.mobile ? req.body.mobile.slice(-5) : "12345";
      const UserName = (req.body.name || req.body.fullName || "User").replace(/[^a-z\d]+/gi, "").slice(0, 4);
      const uid = uuidv4();
      const accesscd = "123456";
      const speakerid = UserName + UserMobile + uid.split("-")[4].slice(0, 4);

      let isTermsAccepted = true;
      try {
        if (req.body.acceptTerms !== undefined) {
          isTermsAccepted = typeof req.body.acceptTerms === 'boolean' ? req.body.acceptTerms : JSON.parse(req.body.acceptTerms);
        }
      } catch (e) {
        isTermsAccepted = true;
      }

      const newuser = {
        name: req.body.name || req.body.fullName || "User",
        accesscode: accesscd,
        mobile: req.body.mobile,
        speakerID: speakerid,
        age: req.body.age || 25,
        gender: req.body.gender || "Male",
        qualification: req.body.qualification || "Graduate",
        latitude: req.body.latitude || 18,
        longitude: req.body.longitude || 73,
        state: req.body.state || "Maharashtra",
        district: req.body.district || "Pune",
        language: req.body.language || req.body.recordingLanguages?.[0] || "Hindi",
        pincode: req.body.pincode || "411001",
        phonebrand: (req.body.phonebrand || "Android").replace(/[^a-zA-Z0-9]/g, ""),
        phonemodel: (req.body.phonemodel || "Smartphone").replace(/[^a-zA-Z0-9]/g, ""),
        knownlanguages: Array.isArray(req.body.knownlanguages || req.body.knownLanguages)
          ? (req.body.knownlanguages || req.body.knownLanguages).join(",")
          : String(req.body.knownlanguages || req.body.knownLanguages || "Hindi"),
        recordedHours: "00:00:00",
        pendingHours: "00:18:00",
        isPaid: false,
        amountPaid: 0,
        rate: 200,
        coordinator: req.body.coordinator || "Coordinator",
        createdBy: req.body.name || "User",
        acceptTerms: isTermsAccepted,
        billingAddress: {
          name: req.body.name || "User",
          invName: req.body.name || "User",
          mobile: req.body.mobile,
          address1: req.body.address1 || "Street",
          address2: req.body.address2 || "City",
          district: req.body.district || "Pune",
          state: req.body.state || "Maharashtra",
          country: "India",
          pincode: req.body.pincode || "411001",
        },
        phase: (dist && dist.length > 0 && dist[0].phase) ? dist[0].phase : "Phase1",
        consentlanguage: req.body.consentlanguage || req.body.consentLanguage || "Hindi",
      };

      const user = await User.create(newuser);

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

      //console.log("user..", user);

      if (user) {
        const stateCode = await District.findOne(
          { state: user.state },
          {
            statertocode: 1,
            _id: 0,
          },
        );

        let filename =
          stateCode.statertocode +
          "_" +
          user.district +
          "_" +
          user.speakerID +
          ".docx";

        const folderPath =
          "Consentforms/" + user.state + "_" + user.district + "/";

        const gcFileName = folderPath + filename;
        console.log("gcFileName", gcFileName);

        const bucket = storage.bucket(bucketName);
        let file = bucket.file(gcFileName);

        const consentFormPath =
          process.env.NODE_ENV === "production"
            ? `https://storage.googleapis.com/${process.env.PROD_STORAGE_BUCKET}/` +
              gcFileName
            : `https://storage.googleapis.com/${process.env.DEV_STORAGE_BUCKET}/` +
              gcFileName;

        let updateConsentFormPath = await User.findOneAndUpdate(
          { mobile: user.mobile, speakerID: user.speakerID },
          {
            consentFormPath: consentFormPath,
          },
        );

        //console.log("stateCode", stateCode);
        let consentlanguage = user.consentlanguage;
        let registrationdate = user.createdOn.toISOString().split("T")[0];

        console.log("consentlanguage", consentlanguage);

        let docx = officegen("docx");

        docx.on("finalize", function (written) {
          console.log("Finish to create a Microsoft Word document.");
        });

        // Officegen calling this function to report errors:
        docx.on("error", function (err) {
          console.log(err);
        });

        let pObj = docx.createP({ align: "center" });

        pObj.addText("PARTICIPANT AGREEMENT for ASSIGNMENT AND CONSENT", {
          bold: true,
          underline: true,
        });

        pObj = docx.createP({ align: "center" });
        pObj.addText(
          `THIS PARTICIPANT AGREEMENT (“AGREEMENT”) IS MADE ON THIS ${registrationdate} (“EFFECTIVE DATE”), BY AND`,
          { bold: true, underline: true },
        );

        pObj = docx.createP({ align: "center" });
        pObj.addText("BETWEEN", { bold: true });

        pObj = docx.createP();
        pObj.addText(`${user.name} `, { bold: true });
        pObj.addText("an individual residing at");
        pObj.addText(` ${user.district} `, { bold: true });
        pObj.addText("(hereinafter referred to as the ");
        pObj.addText("“Assignor”, ", { bold: true });
        pObj.addText(
          "which expression shall, unless repugnant to the context or meaning thereof, be deemed to mean and include its successors and permitted assigns).",
        );

        pObj = docx.createP({ align: "center" });
        pObj.addText("AND", { bold: true });

        pObj = docx.createP();
        pObj.addText("Megdap Innovation Labs Pvt. Ltd., ", {
          bold: true,
        });
        pObj.addText(
          "a Company incorporated under the Companies Act, 2013 and having its registered office at [insert office address] (hereinafter referred to as the “Assignee”, which expression shall, unless repugnant to the context or meaning thereof, be deemed to mean and include its affiliates, successors and permitted assigns).",
        );

        pObj.addLineBreak();
        pObj.addLineBreak();

        pObj = docx.createP({ align: "left" });
        pObj.addText("WHEREAS:", { bold: true });

        pObj = docx.createListOfNumbers();
        pObj.addText("The Assignee has a system, i.e., Megdap Recorder, ");
        pObj.addText("(“Platform”) ", { bold: true });
        pObj.addText(
          "which allows its users to record voice samples in their own voice for use in a variety of technology products;",
        );

        pObj = docx.createListOfNumbers();
        pObj.addText(
          "The Assignee has entered into agreements with Google LLC and I-Hub for Robotics and Autonomous Systems Innovation Foundation to collect datasets which portray the multilingual speech diversity in India by collecting speech data across selected districts and to collaborate in development of a national digital public platform for languages with universal access. The Voice Recording (as defined hereinbelow) is collected with a view to open source the same through various platforms.",
        );

        pObj = docx.createListOfNumbers();
        pObj.addText(
          "The Assignee is desirous of acquiring all rights, title and interest in and to the voice samples provided on the Platform by the Assignor, including without limitation, all Intellectual Property Rights (as defined hereinbelow);",
        );

        pObj = docx.createListOfNumbers();
        pObj.addText(
          "By the virtue of discussion between the Parties, the Assignor has agreed to provide a set of audio recordings on Platform and assign all the rights, title and interest in and to the voice sample provided by the assignor, including without limitation, all Intellectual Property Rights contained therein and related thereto, in favour of the Assignee, subject to certain terms and conditions;",
        );

        pObj = docx.createListOfNumbers();
        pObj.addText(
          "Accordingly, the Assignor is executing this Agreement in favour of the Assignee, in the following manner:",
        );

        //docx.putPageBreak();

        pObj = docx.createP({ align: "center" });
        pObj.addText(
          "NOW, THEREFORE, IN CONSIDERATION OF THE REPRESENTATIONS, PROMISES AND MUTUAL COVENANTS AND AGREEMENTS SET FORTH HEREIN, THE PARTIES AGREE AS FOLLOWS:",
          { bold: true },
        );
        pObj = docx.createListOfNumbers();

        pObj.addText("DEFINITIONS:", { bold: true, underline: true });
        pObj = docx.createP();
        pObj.addText(
          "Capitalized terms used in this Agreement shall have the meaning assigned to them as set forth below.",
        );

        pObj = docx.createNestedOrderedList({
          level: 2,
        });
        pObj.addText(
          "“Applicable Law” shall mean any statute, law, regulation, ordinance, rule, judgement, order, decree, by-law, clearance, directive, guideline, policy, requirement, or any governmental restriction or any similar form of decision of, or determination by, or any interpretation or administration having the force of law of any of the foregoing, by any governmental authority having jurisdiction over the matter in question, whether in effect as of the date of this Agreement or thereafter;",
        );

        pObj = docx.createNestedOrderedList({
          level: 2,
        });
        pObj.addText("“Assigned Rights” ", { bold: true });
        pObj.addText(
          "shall have the meaning ascribed to it in Section 2 of this Agreement;",
        );

        pObj = docx.createNestedOrderedList({
          level: 2,
        });
        pObj.addText("“Intellectual Property Rights” ", { bold: true });
        pObj.addText(
          "shall mean rights to inventions (whether patentable or not), copyrights in the performances embodied in the audio recording provided by the Assignor, neighboring and related rights in relation to the Voice Recording. It includes moral rights, goodwill, personality rights, the right to sue for passing off or unfair competition, rights  to use and protect the confidentiality of confidential information (including know-how and trade secrets) and all other intellectual property rights, in each case whether registered or unregistered and including all applications and rights to apply for and be granted, renewals or extensions of, and rights to claim priority from, and all similar or equivalent rights or forms of protection which subsist or will subsist now or in the future in any part of the world in relation to the Voice Recording;",
        );

        pObj = docx.createNestedOrderedList({
          level: 2,
        });
        pObj.addText("“Voice Recording”  ", { bold: true });
        pObj.addText(
          "shall mean the principal recording of the participant’s voice as provided through the recording capability on the Platform.",
        );

        pObj = docx.createListOfNumbers();
        pObj.addText("ASSIGNMENT:", { bold: true, underline: true });
        pObj = docx.createNestedOrderedList({
          level: 2,
        });
        pObj.addText(
          "The Assignor hereby perpetually and irrevocably assigns, sells, conveys and transfers to the Assignee its entire rights, title and interest in and to the Voice Recording together with any and all Intellectual Property Rights contained therein and related thereto (the “Assigned Rights”).",
        );

        //docx.putPageBreak();

        pObj = docx.createNestedOrderedList({
          level: 2,
        });
        pObj.addText(
          "The Assignor hereby agrees and acknowledges that by virtue of this Agreement, the Assignee shall have unconditional, perpetual, exclusive, worldwide right to use, reproduce, publish, commercialize, exploit, develop, alter, embed, and modify the Voice Recording, in any manner whatsoever or the Assignee may authorize others to do any or all of the foregoing to the fullest extent necessary to realize the full potential of the Voice Recording without the further consent of any entity.     ",
        );

        pObj = docx.createNestedOrderedList({
          level: 2,
        });
        pObj.addText(
          "Further, the Assignor hereby transfers, assigns and delivers all Intellectual Property Rights which the Assignor enjoyed, including the right to use, the right to sell or license or transfer or further assign the Intellectual Property Rights to any third party, the right to publish in any manner or disclose the Voice Recording to any person or entity, the right to make any improvements, changes, or variations to or in the Voice Recording, after the Effective Date.  ",
        );

        pObj = docx.createNestedOrderedList({
          level: 2,
        });
        pObj.addText(
          "In the event that the Assignor has any rights subsisting in, relating to or used in connection with the Assigned Rights that cannot be assigned, licensed or sublicensed to the Assignee, the Assignor hereby irrevocably, unconditionally and without any further compensation waives the enforcement of all such rights, and all claims and causes of action of any kind with respect to any of the foregoing against the Assignee,  whether now known or hereafter to become known, and agrees to consent to and join in any action to enforce such rights and to procure a waiver of such rights from the holders of such rights, at the request of the Assignee.",
        );

        pObj = docx.createNestedOrderedList({
          level: 2,
        });
        pObj.addText(
          "The Assignor hereby agrees and acknowledges that no rights subsisting in and relating to the Assigned Rights shall be retained by the Assignor, nor shall there be any reversion of those rights to the Assignor in future.",
        );

        pObj = docx.createListOfNumbers();
        pObj.addText("DELIVERY OF POSSESSION:", {
          bold: true,
          underline: true,
        });
        pObj = docx.createP();
        pObj.addText(
          "The Assignor has fully delivered the possession of Voice Recording and all documentation in relation to the Assigned Rights, to the Assignee, upon execution of this Agreement, the receipt of which is hereby acknowledged by the Assignee.",
        );

        pObj = docx.createListOfNumbers();
        pObj.addText("CONSIDERATION:", {
          bold: true,
          underline: true,
        });

        pObj = docx.createNestedOrderedList({
          level: 2,
        });
        pObj.addText("The Assignee has paid INR 500 to the Assignor, vide ");
        pObj.addText("[cash or cash equivalent] (“the Consideration”) ", {
          bold: true,
        });
        pObj.addText(
          "in one stroke upon the execution of this Agreement and the Assignor hereby expressly admits, acknowledges and confirms the receipt of the same, and hence, no separate receipt is required.",
        );

        //docx.putPageBreak();

        pObj = docx.createNestedOrderedList({
          level: 2,
        });
        pObj.addText(
          "The Assignor acknowledges that the Consideration paid to the Assignor by the Assignee is full, final and adequate for it to undertake its respective obligations under this Agreement and to assign all the rights, title and interest in and to the Assigned Rights in favour of the Assignee. The Assignor agrees and acknowledges that the Assignor shall not be entitled to claim any further consideration in respect of the Assigned Rights from the Assignee.",
        );

        pObj = docx.createListOfNumbers();
        pObj.addText("TERM:", {
          bold: true,
          underline: true,
        });
        pObj = docx.createP();
        pObj.addText(
          "This Agreement shall be effective from the Effective Date and shall remain valid perpetually from the Effective Date of this Agreement.      ",
        );

        pObj = docx.createListOfNumbers();
        pObj.addText("REPRESENTATIONS AND WARRANTIES:", {
          bold: true,
          underline: true,
        });
        pObj = docx.createP();
        pObj.addText("The Assignor represents and warrants that:");

        pObj = docx.createNestedOrderedList({
          level: 2,
        });
        pObj.addText(
          "the Assignor has full power and authority to enter into this Agreement;",
        );
        pObj = docx.createNestedOrderedList({
          level: 2,
        });
        pObj.addText(
          "the Assignor is the sole and exclusive owner of the Assigned Rights and has full and unfettered rights and powers to assign, sell, convey and transfer the Assigned Rights in favour of the Assignee pursuant to, and as contemplated under this Agreement;",
        );
        pObj = docx.createNestedOrderedList({
          level: 2,
        });
        pObj.addText(
          "neither the Assigned Rights nor any part thereof, infringe, misappropriate or otherwise violate any Intellectual Property Rights of any third party;",
        );
        pObj = docx.createNestedOrderedList({
          level: 2,
        });
        pObj.addText(
          "Voice Recording are not tampered or damaged, in any manner whatsoever;",
        );
        pObj = docx.createNestedOrderedList({
          level: 2,
        });
        pObj.addText(
          "the Assigned Rights are free from any charge, lien or encumbrance of any sort;",
        );
        pObj = docx.createNestedOrderedList({
          level: 2,
        });
        pObj.addText(
          "the Assignor shall not by itself or through a third party, challenge the rights of the Assignee in or to the Assigned Rights or assist any third party in doing so;",
        );
        pObj = docx.createNestedOrderedList({
          level: 2,
        });
        pObj.addText(
          "the Assigned Rights are valid and subsisting, and there are and have been no claims, challenges, disputes or proceedings, pending or threatened, in relation to the ownership, validity or use of any of the Assigned Rights; ",
        );
        pObj = docx.createNestedOrderedList({
          level: 2,
        });
        pObj.addText(
          "the Assignor is not bound by any agreement, deeds, obligations or restrictions (and will not assume any obligation or restriction or enter into any agreement or deed) that would interfere with its obligations or the rights granted to the Assignee under this Agreement, and the execution, delivery and performance of this Agreement does not (i) conflict with, violate or breach any Applicable Law or regulations; (ii) require the consent, approval or authorization of any governmental or regulatory authority or any entity, or (iii) require the provision of any payment or other consideration to any third party.",
        );

        pObj = docx.createListOfNumbers();
        pObj.addText("INDEMNITY:", {
          bold: true,
          underline: true,
        });

        pObj = docx.createP();
        pObj.addText(
          "The Assignor shall indemnify, defend and hold harmless the Assignee, its affiliates, directors, employees, representatives from and against any and all losses, liabilities, damages, direct and indirect, resulting from or arising out of:",
        );

        pObj = docx.createNestedOrderedList({
          level: 2,
        });
        pObj.addText(
          "any misrepresentation or inaccuracy in, or breach of, any of the representations, warranties or obligations of the Assignor under this Agreement;     ",
        );

        pObj = docx.createNestedOrderedList({
          level: 2,
        });
        pObj.addText(
          "violation of any Applicable Law, rules, regulations etc.;",
        );

        pObj = docx.createNestedOrderedList({
          level: 2,
        });
        pObj.addText(
          "any claims from its employees, contractors or artists involved in the creation or publication of the Voice Recording;",
        );

        pObj = docx.createNestedOrderedList({
          level: 2,
        });
        pObj.addText(
          "any costs in relation to the Assigned Rights that relate to or arise in connection with the period prior to the Effective Date.",
        );

        pObj = docx.createListOfNumbers();
        pObj.addText("LIMITATION OF LIABILITY:", {
          bold: true,
          underline: true,
        });

        pObj = docx.createP();
        pObj.addText(
          "TO THE FULLEST EXTENT ALLOWED BY APPLICABLE LAW, IN NO EVENT SHALL THE ASSIGNEE BE LIABLE FOR ANY INDIRECT OR DIRECT, SPECIAL, INCIDENTAL, PUNITIVE OR CONSEQUENTIAL DAMAGES OF ANY KIND ARISING OUT OF OR IN CONNECTION WITH THIS AGREEMENT, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES AND NOTWITHSTANDING THE FAILURE OF ESSENTIAL PURPOSE OF ANY LIMITED REMEDY.",
        );

        pObj = docx.createListOfNumbers();
        pObj.addText("FUTHER ASSURANCES:", {
          bold: true,
          underline: true,
        });

        pObj = docx.createP();
        pObj.addText(
          "The Assignor shall itself, and cause any third parties to, execute all documents, fill and file necessary forms, applications, specifications, oaths, affidavits or petitions bear any costs and render such assistance to the Assignee as may be reasonably required for effecting this assignment unto the Assignee and to perfect the title of the Assignee in and to the Assigned Rights.",
        );

        pObj = docx.createListOfNumbers();
        pObj.addText("MISCELLANEOUS:", {
          bold: true,
          underline: true,
        });

        pObj = docx.createNestedOrderedList({
          level: 2,
        });
        pObj.addText("Governing Law and Jurisdiction:", {
          bold: true,
          underline: true,
        });

        pObj = docx.createP();
        pObj.addText(
          "This Agreement shall be governed by and construed in accordance with the laws of India. The Parties agree that any dispute or controversy arising out of or related to this Agreement shall be submitted to the exclusive jurisdiction of Courts at [•].",
        );

        // docx.putPageBreak();

        pObj = docx.createNestedOrderedList({
          level: 2,
        });
        pObj.addText("Notices:", {
          bold: true,
          underline: true,
        });

        pObj = docx.createP();
        pObj.addText(
          "All notices, demands or consents in relation to this Agreement shall be in writing. Notice shall be considered effective on the earlier of actual receipt or: (1) the day following transmission if sent by facsimile or email with pdf followed by written confirmation; (2) one day (two days for international addresses) after posting when sent via an express commercial courier; or (3) five days after posting when sent via post. Notice shall be sent to the address for each Party set forth on the first page of this Agreement, or at such other address as shall be given by either Party to the other in writing.",
        );

        pObj = docx.createNestedOrderedList({
          level: 2,
        });
        pObj.addText("Severability:", {
          bold: true,
          underline: true,
        });

        pObj = docx.createP();
        pObj.addText(
          "If for any reason a court of competent jurisdiction finds any provision of this Agreement invalid or unenforceable, that provision of the Agreement will be enforced to the maximum extent permissible and the other provisions of this Agreement shall remain in full force and effect.",
        );

        pObj = docx.createNestedOrderedList({
          level: 2,
        });
        pObj.addText("Amendment and Waiver:", {
          bold: true,
          underline: true,
        });

        pObj = docx.createP();
        pObj.addText(
          "No modification, amendment or waiver of any provision of this Agreement shall be effective, unless in writing and signed by the duly authorized representatives of the Parties. The failure by either Party to enforce any provision of this Agreement will not constitute a waiver of future enforcement of that or any other provision.",
        );

        pObj = docx.createNestedOrderedList({
          level: 2,
        });
        pObj.addText("Headings:", {
          bold: true,
          underline: true,
        });

        pObj = docx.createP();
        pObj.addText(
          "The section headings herein are intended for reference and shall not by themselves determine the construction or interpretation of this Agreement.",
        );

        pObj = docx.createNestedOrderedList({
          level: 2,
        });
        pObj.addText("Entire Undertaking:", {
          bold: true,
          underline: true,
        });

        pObj = docx.createP();
        pObj.addText(
          "This Agreement contains the entire understanding between the Assignor and the Assignee concerning the subject matter hereof. This Agreement shall supersede all the prior agreements and understandings between the Parties, whether oral or written, in respect of the Assigned Rights.",
        );

        pObj = docx.createNestedOrderedList({
          level: 2,
        });
        pObj.addText("Free will:", {
          bold: true,
          underline: true,
        });

        pObj = docx.createP();
        pObj.addText(
          "The Agreement and assignment is entered to by the participant, i.e.,Assignor out of free will without any restriction or coercion of any form.",
        );

        // docx.putPageBreak();

        pObj = docx.createListOfNumbers();
        pObj.addText("CONSENT STATEMENT", {
          bold: true,
          underline: true,
        });

        if (consentlanguage === "English") {
          pObj = docx.createP();
          pObj.addText(
            `I, ${user.name}, do hereby give consent for Megdap Innovation Labs Pvt. Ltd. to use my audio recording as recorded on the Platform (as defined in the Participant Agreement for Assignment and Consent dated [•] (“Agreement”)).`,
          );

          pObj = docx.createP();
          pObj.addText(
            "In addition, I waive any right to inspect or approve the finished audio recording. I agree that Megdap Innovation Labs Pvt. Ltd. may use it as it deems fit per the Agreement.",
          );

          pObj = docx.createP();
          pObj.addText(
            "I acknowledge that Google LLC is funding the collection of the audio recording defined as Voice Recording in the Agreement and any third party (including Google LLC and its affiliates) shall have the right to use such Voice Recording once it is open sourced and can be used for commercial purposes.",
          );

          pObj = docx.createP();
          pObj.addText(
            "I acknowledge that the Voice Recording can be open-sourced by Assignee or any other third party.",
          );

          pObj = docx.createP();
          pObj.addText(
            "I understand that this consent is perpetual, that I may not revoke it, and that it is binding.",
          );

          pObj = docx.createP();
          pObj.addText(
            "I understand that these audios may appear publicly and have no objection to the same.",
          );

          let out = file.createWriteStream({
            metadata: {
              contentType:
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            },
          });

          out.on("error", function (err) {
            console.log(err);
          });

          // Async call to generate the output file:
          docx.generate(out);
        } else if (consentlanguage === "Bengali") {
          pObj = docx.createP();
          pObj.addText(
            `আমি, ${user.name}, Megdap Innovation Labs Pvt Ltd -কে এতদ্বারা প্ল্যাটফর্মে রেকর্ড করা আমার অডিও রেকর্ডিং ব্যবহার করার জন্য আমার সম্মতি জানাচ্ছি ([•] তারিখের অ্যাসাইনমেন্ট এবং সম্মতির জন্য অংশগ্রহণকারীর চুক্তিতে ("চুক্তি")) যেভাবে উল্লেখ করা হয়েছে।`,
          );

          pObj = docx.createP();
          pObj.addText(
            "এছাড়াও, সম্পন্ন করা অডিও রেকর্ডিং পরিদর্শন অথবা অনুমোদন করার অধিকার আমি পরিত্যাগ করছি। আমি সম্মত হচ্ছি যে Megdap Innovation Labs Pvt. Ltd. চুক্তি অনুসারে এটি ব্যবহার করতে পারে।",
          );

          pObj = docx.createP();
          pObj.addText(
            "আমি জানি যে Google LLC অডিও রেকর্ডিং সংগ্রহের জন্য অর্থায়ন করছে। এই চুক্তিতে এই অডিও রেকর্ডিংকে ভয়েস রেকর্ডিং হিসাবে উল্লেখ করা হয়েছে। এই ভয়েস রেকর্ডিং উন্মুক্ত-উৎসের হয়ে গেলে যেকোনও তৃতীয় পক্ষ Google LLC এবং তার সহযোগীরা) এই ভয়েস রেকর্ডিং ব্যবহার করার অধিকার পাবে, এবং বাণিজ্যিক উদ্দেশ্যেও এই ভয়েস রেকর্ডিংয়ের ব্যবহার করা যেতে পারে।",
          );

          pObj = docx.createP();
          pObj.addText(
            "আমি জানি যে অ্যাসাইনি অথবা অন্য কোনও তৃতীয় পক্ষ এই ভয়েস রেকর্ডিং উন্মুক্ত-উৎস করতে পারে।",
          );

          pObj = docx.createP();
          pObj.addText(
            "আমি বুঝেছি যে এই সম্মতি চিরস্থায়ী হবে, আমি এটি প্রত্যাহার করতে পারব না এবং এটি বাধ্যতামূলক।",
          );

          pObj = docx.createP();
          pObj.addText(
            "আমি বুঝেছি যে এই অডিওগুলি সর্বজনীনভাবে পাওয়া যেতে পারে এবং এতে আমার কোনও আপত্তি নেই।",
          );

          let out = file.createWriteStream({
            metadata: {
              contentType:
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            },
          });

          out.on("error", function (err) {
            console.log(err);
          });

          // Async call to generate the output file:
          docx.generate(out);
        } else if (consentlanguage === "Haryanvi") {
          pObj = docx.createP();
          pObj.addText(
            `मैं, ${user.name}, प्लेटफ़ॉर्म पर रिकॉर्ड करी गई मेरी ऑडियो रिकॉर्डिंग गो उपयोग करण खातर Megdap Innovation Labs Pvt. Ltd. न सहमति देऊं सु (जियां कि असाइनमेंट और  सहमति खातर प्रतिभागी समझौते म परिभाषित करयो सै [•] ("अनुबंध (एग्रीमेंट)"))।`,
          );

          pObj = docx.createP();
          pObj.addText(
            "इंगै साथ ही, मेर कन तैयार ऑडियो रिकॉर्डिंग गो निरीक्षण और अनुमोदन करण गो कोई भी अधिकार ना रहसी। मैं सहमत हूं क Megdap Innovation Labs Pvt. Ltd. समझौते गै अनुसार जियां ठीक समझै बियां इंगो उपयोग कियो जा सकै सै।",
          );

          pObj = docx.createP();
          pObj.addText(
            "मैं स्वीकार करूं क  Google LLC अनुबंध म वॉयस रिकॉर्डिंग की तरियां परिभाषित ऑडियो रिकॉर्डिंग ग संग्रह खातर फंडिंग करै स और किसी भी तीसरै पक्ष (Google LLC और उसकै सहयोगियां सागै) न वॉयस रिकॉर्डिंग गो उपयोग करण गो अधिकार होसी, जद यो ओपन सोर्स हो और यो व्यावसायिक उद्देश्यां खातर उपयोग करयो जा सकै।",
          );

          pObj = docx.createP();
          pObj.addText(
            "मैं स्वीकार करूं क वॉयस रिकॉर्डिंग न असाइनी या  कोई तीसरो पक्ष  ओपन-सोर्स कर सकै सै ।",
          );

          pObj = docx.createP();
          pObj.addText(
            "मैं सहमत हूं क या सहमति सतत स, मैं इसनै रद्द ना कर सकूं और या मेरै खातर बाध्यकारी सै।",
          );

          pObj = docx.createP();
          pObj.addText(
            "मैं सहमत हूं क या ऑडियो सार्वजनिक करी जा सकै स और मनै इस प कोई आपत्ति ना सै।",
          );

          let out = file.createWriteStream({
            metadata: {
              contentType:
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            },
          });

          out.on("error", function (err) {
            console.log(err);
          });

          // Async call to generate the output file:
          docx.generate(out);
        } else if (consentlanguage === "Hindi") {
          console.log("into hindi block");
          pObj = docx.createP();
          pObj.addText(
            `मैं, ${user.name}, इस प्लेटफ़ॉर्म पर रिकॉर्ड की गई मेरी ऑडियो रिकॉर्डिंग का उपयोग करने के लिए Megdap Innovation Labs Pvt. Ltd. को सहमति प्रदान करता हूं  (जैसा कि असाइनमेंट और सहमति के लिए प्रतिभागी समझौते में परिभाषित किया गया है [•] ("अनुबंध (एग्रीमेंट)"))।`,
          );

          pObj = docx.createP();
          pObj.addText(
            "इसके साथ ही, मैं तैयार ऑडियो रिकॉर्डिंग का निरीक्षण करने या अनुमोदन करने का कोई भी अधिकार नहीं रखूंगा। मैं सहमत हूं कि Megdap Innovation Labs Pvt. Ltd. समझौते के अनुसार उचित समझे जाने पर इसका उपयोग कर सकता है।",
          );

          pObj = docx.createP();
          pObj.addText(
            "मैं स्वीकार करता हूं कि Google LLC अनुबंध वॉयस रिकॉर्डिंग के रूप में ऑडियो रिकॉर्डिंग के संग्रह के लिए फंडिंग कर रहा है और किसी भी तीसरे पक्ष (Google LLC और उसके सहयोगियों सहित) को ऐसी वॉयस रिकॉर्डिंग का उपयोग करने का अधिकार होगा, जब यह ओपन सोर्स हो और व्यावसायिक उद्देश्यों के लिए इसका उपयोग किया जा सके।",
          );

          pObj = docx.createP();
          pObj.addText(
            "मैं स्वीकार करता हूं कि वॉयस रिकॉर्डिंग को समनुदेशिती(असाइनी) या किसी अन्य तीसरे पक्ष द्वारा ओपन-सोर्स किया जा सकता है।",
          );

          pObj = docx.createP();
          pObj.addText(
            "मैं समझता हूं कि यह सहमति सतत है, मैं इसे रद्द नहीं कर सकता और यह बाध्यकारी है।",
          );

          pObj = docx.createP();
          pObj.addText(
            "मैं समझता हूं कि ये ऑडियो सार्वजनिक रूप से सामने आ सकते हैं और मुझे इस पर कोई आपत्ति नहीं है।",
          );

          let out = file.createWriteStream({
            metadata: {
              contentType:
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            },
          });

          out.on("error", function (err) {
            console.log(err);
          });

          // Async call to generate the output file:
          docx.generate(out);
        } else if (consentlanguage === "Malayalam") {
          pObj = docx.createP();
          pObj.addText(
            `ഞാൻ, ${user.name}, പ്ലാറ്റ്‌ഫോമിൽ റെക്കോർഡ് ചെയ്‌തിരിക്കുന്ന എൻ്റെ ഓഡിയോ റെക്കോർഡിംഗ് (അസൈൻമെൻ്റിനും സമ്മതത്തിനുമുള്ള [•] തീയതിയിലെ പങ്കാളിത്ത ഉടമ്പടിയിൽ നിർവചിച്ചിരിക്കുന്നത് പോലെ (“ഉടമ്പടി”)) ഉപയോഗിക്കുന്നതിന് Megdap Innovation Labs Pvt. Ltd. ന് ഇതിനാൽ സമ്മതം നൽകുന്നു.`,
          );

          pObj = docx.createP();
          pObj.addText(
            "കൂടാതെ, പൂർത്തിയായ ഓഡിയോ റെക്കോർഡിംഗ് പരിശോധിക്കുന്നതിനോ അംഗീകരിക്കുന്നതിനോ ഉള്ള അവകാശവും ഞാൻ ഒഴിവാക്കുന്നു. Megdap Innovation Labs Pvt. Ltd. ന് ഉടമ്പടി പ്രകാരം അനുയോജ്യമെന്ന് കരുതുന്നത് പോലെ അത് ഉപയോഗിക്കാമെന്ന് ഞാൻ സമ്മതിക്കുന്നു.",
          );

          pObj = docx.createP();
          pObj.addText(
            "ഉടമ്പടിയിൽ വോയ്‌സ് റെക്കോർഡിംഗ് എന്ന് നിർവചിച്ചിരിക്കുന്ന ഓഡിയോ റെക്കോർഡിംഗിൻ്റെ ശേഖരണത്തിന് Google LLC ധനസഹായം നൽകുന്നുണ്ടെന്ന് ഞാൻ സമ്മതിക്കുന്നു, ഏതെങ്കിലും മൂന്നാം കക്ഷിക്ക് (Google LLC യും അതിൻ്റെ അഫിലിയേറ്റുകളും ഉൾപ്പെടെ) അത്തരം വോയ്‌സ് റെക്കോർഡിംഗ് ഓപ്പൺ സോഴ്‌സ് ചെയ്തു കഴിഞ്ഞാൽ അത് വാണിജ്യ ആവശ്യങ്ങൾക്കായി ഉപയോഗിക്കാൻ കഴിയും.",
          );

          pObj = docx.createP();
          pObj.addText(
            "നിയുക്തരായവരോ മറ്റേതെങ്കിലും മൂന്നാം കക്ഷികളോ വോയ്‌സ് റെക്കോർഡിംഗ് ഓപ്പൺ സോഴ്‌സ് ചെയ്തേക്കാമെന്ന കാര്യവും ഞാൻ സമ്മതിക്കുന്നു.",
          );

          pObj = docx.createP();
          pObj.addText(
            "ഈ സമ്മതം ശാശ്വതമാണെന്നും അത് അസാധുവാക്കാനാകില്ലെന്നും അത് പാലിക്കാന്‍ നിർബന്ധിതമാണെന്നും ഞാൻ മനസ്സിലാക്കുന്നു.",
          );

          pObj = docx.createP();
          pObj.addText(
            "ഈ ഓഡിയോകൾ പൊതു ഇടങ്ങളില്‍ പ്രത്യക്ഷമായേക്കാമെന്ന് ഞാൻ മനസ്സിലാക്കുന്നു, അതിനോട് എനിക്ക് എതിർപ്പില്ലെന്നും വ്യക്തമാക്കുന്നു",
          );

          let out = file.createWriteStream({
            metadata: {
              contentType:
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            },
          });

          out.on("error", function (err) {
            console.log(err);
          });

          // Async call to generate the output file:
          docx.generate(out);
        } else if (consentlanguage === "Marathi") {
          pObj = docx.createP();
          pObj.addText(
            `मी, ${user.name}, Megdap Innovation Labs Pvt. Ltd. ला प्लॅटफॉर्मवर ([•] रोजी करण्यात आलेल्या असाइनमेंट आणि संमतीसाठी असलेल्या सहभागी करारामध्ये व्याख्या केल्यानुसार (“Agreement”- करार)) ध्वनिमुद्रित केल्यानुसार माझे ऑडिओ रेकॉर्डिंग वापरण्यासाठी संमती देत आहे.`,
          );

          pObj = docx.createP();
          pObj.addText(
            "या व्यतिरिक्त, पूर्ण झालेल्या ध्वनिमुद्रणाचे (रेकॉर्डिंग) परीक्षण किंवा मंजुरी देण्याचा हक्क मी सोडून देत आहे. Megdap Innovation Labs Pvt. Ltd., करारानुसार त्याचा योग्य वाटेल तसा वापर करू शकते, हे मला मान्य आहे. ",
          );

          pObj = docx.createP();
          pObj.addText(
            "मला मान्य आहे की, करारामध्ये व्हॉइस रेकॉर्डिंग (ध्वनिमुद्रण) म्हणून परिभाषित केलेल्या ऑडिओ रेकॉर्डिंगच्या संकलनासाठी Google LLC निधी देत आहे आणि हे ध्वनिमुद्रण एकदा ओपन सोर्स्ड (खुले संसाधन) झाले की, कोणत्याही तृतीय पक्षाला (Google LLC आणि त्यांच्याशी संलग्न असलेल्या कोणत्याही अस्थापनेसहीत) हे ध्वनिमुद्रण वापरण्याचा हक्क असेल आणि व्यावसायिक उद्दिष्टांसाठीही ते वापरता येऊ शकते.",
          );

          pObj = docx.createP();
          pObj.addText(
            "मुखत्याराकडून किंवा कोणत्याही अन्य तृतीय पक्षाकडून ध्वनिमुद्रण ओपन-सोर्स्ड (वापरण्यास खुले) केले जाऊ शकते, हे मला मान्य आहे.",
          );

          pObj = docx.createP();
          pObj.addText(
            "मला जाणीव आहे की, ही संमती कायमस्वरुपी (पर्पेच्युअल) आहे, मी ती रद्द करू शकत नाही आणि ती बंधनकारक आहे.",
          );

          pObj = docx.createP();
          pObj.addText(
            "मला जाणीव आहे की, हे ऑडिओ सार्वजनिक व्यासपीठावर असू शकतात आणि त्यावर माझा कोणताही आक्षेप नाही.",
          );

          // let readwritefilepath = path.join(
          //   __dirname,
          //   "../output/" +
          //     stateCode.statertocode +
          //     "_" +
          //     user.district +
          //     "_" +
          //     user.speakerID +
          //     ".docx"
          // );

          //let out = fs.createWriteStream(readwritefilepath);

          let out = file.createWriteStream({
            metadata: {
              contentType:
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            },
          });

          out.on("error", function (err) {
            console.log(err);
          });

          // Async call to generate the output file:
          docx.generate(out);

          // if (out && file) {
          //   // const bucket = storage.bucket(bucketName);
          //   setTimeout(() => {
          //     fs.createReadStream(readwritefilepath)
          //       .pipe(
          //         file.createWriteStream({
          //           metadata: {
          //             contentType:
          //               "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          //           },
          //         })
          //       )
          //       .on("error", function (err) {
          //         console.log("consent upload err", err);
          //       })
          //       .on("finish", function () {
          //         //The file upload is complete.
          //         fs.unlink(readwritefilepath, function (err) {
          //           if (err) throw err;
          //           console.log("File deleted!");
          //         });
          //       });
          //   }, 3000);
          // }
        } else if (consentlanguage === "Odia") {
          pObj = docx.createP();
          pObj.addText(
            `ମୁଁ, ${user.name}, ଏତଦ୍ୱାରା (ନ୍ୟସ୍ତ କାର୍ଯ୍ୟ ଏବଂ ସମ୍ମତି ପାଇଁ ଅଂଶଗ୍ରହଣକାରୀ ଚୁକ୍ତିନାମା ଦିନାଙ୍କିତ [•]ରେ ବର୍ଣ୍ଣନା କରାଯିବା ପ୍ରକାରେ ("ଚୁକ୍ତିନାମା")) ପ୍ଲାଟଫର୍ମରେ ରେକର୍ଡ କରାଯାଇଥିବା ମୋର ଅଡିଓ ରେକର୍ଡିଂ ବ୍ୟବହାର କରିବାକୁ Megdap Innovation Labs Pvt. Ltd.  ପାଇଁ ସମ୍ମତି ଦେଉଛି ।`,
          );

          pObj = docx.createP();
          pObj.addText(
            "ଏହା ସହିତ, ମୁଁ ସମାପ୍ତ ହୋଇଥିବା ଅଡିଓ ରେକର୍ଡିଂ ଯାଞ୍ଚ କରିବା କିମ୍ବା ଅନୁମୋଦନ କରିବାର ଅଧିକାର ତ୍ୟାଗ କରୁଛି । ମୁଁ ରାଜି ଯେ Megdap Innovation Labs Pvt. Ltd. ଚୁକ୍ତିନାମା ଅନୁଯାୟୀ ଉପଯୁକ୍ତ ପ୍ରକାରେ ଏହାକୁ ବ୍ୟବହାର କରିପାରିବ ।",
          );

          pObj = docx.createP();
          pObj.addText(
            "ମୁଁ ସ୍ୱୀକାର କରୁଛି ଯେ ଚୁକ୍ତିନାମାରେ ଭଏସ୍ ରେକର୍ଡିଂ ଭାବରେ ବ୍ୟାଖ୍ୟା କରାଯାଇଥିବା ଅଡିଓ ରେକର୍ଡିଂ ସଂଗ୍ରହ ପାଇଁ Google LLC ପାଣ୍ଠି ପ୍ରଦାନ କରୁଛି ଏବଂ ଏହି ଭଏସ୍ ରେକର୍ଡିଂ ମୁକ୍ତ ଉତ୍ସ ହେବା ପରେ କୌଣସି ତୃତୀୟ ପକ୍ଷ (Google LLC ଏବଂ ଏହାର ସହଯୋଗୀଙ୍କ ସମେତ)ର ବ୍ୟବହାର ଅଧିକାର ରହିବ ଏବଂ ଏହାକୁ ବ୍ୟାବସାୟିକ ଉଦ୍ଦେଶ୍ୟରେ ବ୍ୟବହାର କରାଯାଇପାରିବ ।",
          );

          pObj = docx.createP();
          pObj.addText(
            "ମୁଁ ସ୍ୱୀକାର କରୁଛି ଯେ ଭଏସ୍ ରେକର୍ଡିଂ ଆସାଇନି (ଗ୍ରହୀତା) କିମ୍ବା ଅନ୍ୟ କୌଣସି ତୃତୀୟ ପକ୍ଷ ଦ୍ୱାରା ମୁକ୍ତ-ଉତ୍ସ ହୋଇପାରିବ ।",
          );

          pObj = docx.createP();
          pObj.addText(
            "ମୁଁ ବୁଝିଛି ଯେ ଏହି ସମ୍ମତି ଚିରସ୍ଥାୟୀ ଅଟେ, ମୁଁ ଏହାକୁ ପ୍ରତ୍ୟାହାର କରିପାରିବି ନାହିଁ, ଏବଂ ଏହା ବାଧ୍ୟତାମୂଳକ ଅଟେ ।",
          );

          pObj = docx.createP();
          pObj.addText(
            "ମୁଁ ବୁଝିଛି ଯେ ଏହି ଅଡିଓଗୁଡିକ ସାର୍ବଜନୀନ ଭାବରେ ଦେଖାଯାଇପାରେ ଏବଂ ଏଥିରେ ମୋର କୌଣସି ଆପତ୍ତି ରହିବ ନାହିଁ ।",
          );

          let out = file.createWriteStream({
            metadata: {
              contentType:
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            },
          });

          out.on("error", function (err) {
            console.log(err);
          });

          // Async call to generate the output file:
          docx.generate(out);
        } else if (consentlanguage === "Punjabi") {
          pObj = docx.createP();
          pObj.addText(
            `ਮੈਂ, ${user.name}, ਪਲੇਟਫਾਰਮ 'ਤੇ ਰਿਕਾਰਡ ਕੀਤੇ ਅਨੁਸਾਰ ਮੇਰੀ ਆਡੀਓ ਰਿਕਾਰਡਿੰਗ ਦੀ ਵਰਤੋਂ ਕਰਨ ਲਈ Megdap Innovation Labs Pvt. Ltd. ਨੂੰ ਸਹਿਮਤੀ ਦਿੰਦਾ ਹਾਂ (ਜਿਵੇਂ ਕਿ ਮਿਤੀ [•] (“ਇਕਰਾਰਨਾਮਾ”)) ਨੂੰ ਅਸਾਈਨਮੈਂਟ ਅਤੇ ਸਹਿਮਤੀ ਲਈ ਭਾਗੀਦਾਰ ਸਮਝੌਤੇ ਵਿੱਚ ਪਰਿਭਾਸ਼ਿਤ ਕੀਤਾ ਗਿਆ ਹੈ। `,
          );

          pObj = docx.createP();
          pObj.addText(
            "ਇਸ ਤੋਂ ਇਲਾਵਾ, ਮੈਂ ਮੁਕੰਮਲ ਆਡੀਓ ਰਿਕਾਰਡਿੰਗ ਨੂੰ ਦੇਖਣ ਜਾਂ ਮਨਜ਼ੂਰੀ ਦੇਣ ਦੀ ਕਿਸੇ ਵੀ ਜ਼ਿੰਮੇਵਾਰੀ ਤੋਂ ਆਪਣੇ ਆਪ ਨੂੰ ਛੱਡ ਦਿੰਦਾ ਹਾਂ। ਮੈਂ Megdap Innovation Labs Pvt. Ltd. ਇਕਰਾਰਨਾਮੇ ਦੇ ਅਨੁਸਾਰ ਇਸਦੀ ਵਰਤੋਂ ਕਰਨ ਲਈ ਸਹਿਮਤੀ ਦਿੰਦਾ ਹਾਂ ਕਿਉਂਕਿ ਇਹ ਢੁਕਵਾਂ ਲੱਗਦਾ ਹੈ।",
          );

          pObj = docx.createP();
          pObj.addText(
            "ਮੈਂ ਸਵੀਕਾਰ ਕਰਦਾ/ਕਰਦੀ ਹਾਂ ਕਿ Google LLC ਵੌਇਸ ਰਿਕਾਰਡਿੰਗ ਦੇ ਤੌਰ 'ਤੇ ਇਕਰਾਰਨਾਮੇ ਵਿੱਚ ਦਰਸਾਏ ਗਏ ਆਡੀਓ ਰਿਕਾਰਡਿੰਗ ਦੇ ਸੰਗ੍ਰਹਿ ਲਈ ਫੰਡ ਮੁਹੱਈਆ ਕਰਵਾ ਰਿਹਾ ਹੈ ਅਤੇ ਇਹ ਕਿ ਇੱਕ ਵਾਰ ਵੌਇਸ ਰਿਕਾਰਡਿੰਗ ਓਪਨ ਸੋਰਸ ਹੋ ਜਾਂਦੀ ਹੈ ਅਤੇ ਵਪਾਰਕ ਉਦੇਸ਼ਾਂ ਲਈ ਵਰਤੋਂ ਯੋਗ ਹੁੰਦੀ ਹੈ ਤੀਜੀ ਧਿਰ (Google LLC ਅਤੇ ਕੋਈ ਵੀ ਇਸ ਦੇ ਸਹਿਯੋਗੀ ਸਮੇਤ) ਇਸਦੀ ਵਰਤੋਂ ਕਰਨ ਦੇ ਹੱਕਦਾਰ ਹੋਣਗੇ।",
          );

          pObj = docx.createP();
          pObj.addText(
            "ਮੈਂ ਸਵੀਕਾਰ ਕਰਦਾ/ਕਰਦੀ ਹਾਂ ਕਿ ਜ਼ਿੰਮੇਦਾਰ ਜਾਂ ਕੋਈ ਹੋਰ ਤੀਜੀ ਧਿਰ ਓਪਨ ਸੋਰਸ ਲਈ ਵੌਇਸ ਰਿਕਾਰਡਿੰਗ ਉਪਲਬਧ ਕਰਵਾ ਸਕਦੀ ਹੈ।",
          );

          pObj = docx.createP();
          pObj.addText(
            "ਮੈਂ ਜਾਣਦਾ ਹਾਂ ਕਿ ਇਹ ਸਹਿਮਤੀ ਕਾਨੂੰਨੀ ਤੌਰ 'ਤੇ ਬੰਧਨਯੋਗ, ਨਾ ਬਦਲਣਯੋਗ, ਅਤੇ ਸਦੀਵੀ ਹੈ।",
          );

          pObj = docx.createP();
          pObj.addText(
            "ਮੈਨੂੰ ਪਤਾ ਹੈ ਕਿ ਇਹ ਰਿਕਾਰਡਿੰਗ ਲੋਕਾਂ ਲਈ ਉਪਲਬਧ ਕਰਵਾਈ ਜਾ ਸਕਦੀ ਹੈ ਅਤੇ ਮੈਨੂੰ ਇਸ 'ਤੇ ਕੋਈ ਇਤਰਾਜ਼ ਨਹੀਂ ਹੈ।",
          );

          let out = file.createWriteStream({
            metadata: {
              contentType:
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            },
          });

          out.on("error", function (err) {
            console.log(err);
          });

          // Async call to generate the output file:
          docx.generate(out);
        } else if (consentlanguage === "Telugu") {
          pObj = docx.createP();
          pObj.addText(
            `నేను, ${user.name}, (అసైన్‌మెంట్‌ కోసం పాల్గొన్నవారి ఒప్పందం మరియు సమ్మతించిన తేదీన నిర్వచించిన విధంగా) [•] (“ఒప్పందం”) ప్లాట్‌ఫామ్‌పైన రికార్డ్‌ చేసిన నా ఆడియో రికార్డింగ్‌ను Megdap Innovation Labs Pvt. Ltd. ఉపయోగించడానికి ఇందుమూలంగా సమ్మతి అందిస్తున్నాను. `,
          );

          pObj = docx.createP();
          pObj.addText(
            "అదనంగా,  పూర్తి అయిన ఆడియో రికార్డింగ్‌ను తనిఖీ లేదా ఆమోదించే ఎలాంటి హక్కునైనా నేను రద్దు చేస్తున్నాను. ఒప్పందం ప్రకారం Megdap Innovation Labs Pvt. Ltd. దానికి తగినట్లుగా భావించే విధంగా దానిని వాడుకోవడానికి నేను అంగీకరిస్తున్నాను.",
          );

          pObj = docx.createP();
          pObj.addText(
            "ఒప్పందంలో నిర్వచించిన విధంగా వాయిస్‌ రికార్డింగ్‌ అనబడే ఆడియో రికార్డింగ్‌ సేకరణకు గుగూల్‌ ఎల్‌ఎల్‌సి నిధులు సమకూర్చిందని నేను గుర్తిస్తున్నాను మరియు (గుగుల్‌ ఎల్‌ఎల్‌సి మరియు దీని అనుబంధ సంస్థలతో సహా) ఏవైనా తృతీయ పక్షాలు అలాంటి వాయిస్‌ రికార్డింగ్‌ ఒకసారి అది బహిరంగ వనరుగా మారిన తరువాత దీనిని వాణిజ్య ప్రయోజనాల కోసం ఉపయోగించవచ్చు.",
          );

          pObj = docx.createP();
          pObj.addText(
            "అసైనీ లేదా ఏదైనా ఇతర తృతీయ పక్షం ద్వారా వాయిస్‌ రికార్డింగ్‌ బహిరంగ వనరుగా మారవచ్చని నేను గుర్తిస్తున్నాను.",
          );

          pObj = docx.createP();
          pObj.addText(
            "ఈ సమ్మతి శాశ్వతమని, దీనిని తిరిగి తిరగదోడలేనని, మరియు ఇది కట్టుబడి ఉంటుందని నేను అర్థం చేసుకున్నాను.",
          );

          pObj = docx.createP();
          pObj.addText(
            "ఈ ఆడియోలు బహిరంగంగా కూడా కనిపించవచ్చని నేను అర్థం చేసుకున్నాను మరియు ఇదే దానికి ఎలాంటి అభ్యంతరం లేదని తెలియపరుస్తున్నాను.",
          );

          let out = file.createWriteStream({
            metadata: {
              contentType:
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            },
          });

          out.on("error", function (err) {
            console.log(err);
          });

          // Async call to generate the output file:
          docx.generate(out);
        }

        res.status(200).json({
          success: true,
          data: user,
          msg: "User created successfully!",
        });
      }
    }
  } catch (err) {
    console.log("err..", err);
    return next(new ErrorResponse(`User creation failed!`, [], 500));
  }
});

//@desc     Get gender list
//@route    GET/api/genderlist/
//@access   Public
//@usedBy   Audio Recording App
exports.getGenderList = asyncHandler(async (req, res, next) => {
  try {
    const { district } = req.query;

    const recordingRatio = await RecordingRatio.findOne({ district });

    if (!recordingRatio) {
      return next(new ErrorResponse(`District not found`, [], 404));
    }

    const totalGenders = Object.keys(recordingRatio.gender).length;
    const genders = [];

    Object.keys(recordingRatio.gender).forEach((g) => {
      if (
        recordingRatio.gender[g] <
        recordingRatio.districtTotalSec / totalGenders
      ) {
        genders.push({
          gender: g,
          isactive: true,
        });
      } else {
        genders.push({
          gender: g,
          isactive: false,
        });
      }
    });

    res.status(200).json({
      success: true,
      msg: "Genders fetched successfully",
      data: genders,
    });
  } catch (err) {
    console.log("Error in getGenderList", err);
    return next(new ErrorResponse(`Something went wrong!`, [], 500));
  }
});

//@desc     Get Socioenoconomic Status list
//@route    GET/api/seslist/
//@access   Public
//@usedBy   Audio Recording App
exports.getSocioEconomicStatusList = asyncHandler(async (req, res, next) => {
  try {
    const { district } = req.query;

    const recordingRatio = await RecordingRatio.findOne({ district });

    if (!recordingRatio) {
      return next(new ErrorResponse(`District not found`, [], 404));
    }

    const totalSES = Object.keys(recordingRatio.socioeconomic).length;
    const ses = [];

    Object.keys(recordingRatio.socioeconomic).forEach((s) => {
      if (
        recordingRatio.socioeconomic[s] <
        recordingRatio.districtTotalSec / totalSES
      ) {
        ses.push({
          ses: s,
          isactive: true,
        });
      } else {
        ses.push({
          ses: s,
          isactive: false,
        });
      }
    });

    res.status(200).json({
      success: true,
      msg: "Socio Economic Status fetched successfully",
      data: ses,
    });
  } catch (err) {
    console.log("Error in getSocioEconomicStatusList", err);
    return next(new ErrorResponse(`Something went wrong!`, [], 500));
  }
});

//@desc     Resend OTP
//@route    GET /api/resendotp/
//@access   Public
//@usedBy   Audio Recording App
exports.resendOTP = asyncHandler(async (req, res, next) => {
  try {
    const { mobile, accesscode } = req.query;

    //console.log("mobile, accesscode", mobile, accesscode);

    var params = {
      apikey: process.env.SPRINGEDGE_APIKEY, // API Key
      sender: "MEGDAP", // Sender Name
      to: [mobile], //Moblie Number
      message: `Dear Customer, Your Login Access Code is - ${accesscode}. Please don't share it with anyone. Regards, Megdap Innovation Labs Pvt Ltd`,
      format: "json",
    };

    springedge.messages.send(params, 5000, function (err, response) {
      if (err) {
        return console.log(err);
      }
      //console.log(response);
    });

    res.status(200).json({
      success: true,
      //data: user,
      msg: "OTP sent successfully!",
    });
  } catch (err) {
    console.log("err..", err);
    return next(
      new ErrorResponse(`Something went wrong, Please try again`, [], 500),
    );
  }
});

//@desc    Inter Check
//@route    GET /api/verifyVoice/
//@access   Public
//@usedBy   Audio Recording App
exports.verifyVoice = asyncHandler(async (req, res, next) => {
  let userInfo = null;
  try {
    const { mobile, accesscode } = req.body;
    const audio = req.file;

    //console.log("mobile, accesscode", mobile, accesscode, audio);

    if (!mobile || !accesscode || !audio) {
      return next(
        new ErrorResponse(
          `Please provide mobile number, accesscode and audio file!`,
          [],
          400,
        ),
      );
    }

    const query = { mobile, isactive: true };
    userInfo = await User.findOne(query).select("+accesscode");

    if (!userInfo) {
      return next(new ErrorResponse(`Invalid Credentials`, [], 401));
    }

    const isAccessCodeMatch = userInfo.accesscode === accesscode;

    if (!isAccessCodeMatch) {
      return next(new ErrorResponse(`Invalid Credentials`, [], 401));
    }

    const isVoiceVerified = userInfo.voiceVerified;
    if (isVoiceVerified) {
      return next(new ErrorResponse(`Voice already verified`, [], 400));
    }

    //Is Verification Under Process
    if (userInfo.isVoiceVerificationUnderProcess) {
      return next(
        new ErrorResponse(`Voice verification is under process!`, [], 400),
      );
    }

    if (userInfo.cosineSimilarity && userInfo.cosineSimilarity <= 0.3) {
      return next(
        new ErrorResponse(
          `Your previous voice verification was failed, You can not verify voice again!`,
          [],
          400,
        ),
      );
    }

    // Updating the user document
    const isVoiceVerUnderProcessTrue = await User.findByIdAndUpdate(
      userInfo._id,
      {
        isVoiceVerificationUnderProcess: true,
      },
    );

    //const folderPath = `RefrenceAudioFiles/${userInfo.state}_${userInfo.district}`;
    const folderPath = `RefrenceAudioFiles/${userInfo.state}_${userInfo.district}/${userInfo.gender}`;

    const fileName = `${userInfo.mobile}_${userInfo.speakerID}.wav`;
    const audioBufferString = audio.buffer.toString("base64");

    //console.log("folderPath, fileName", folderPath, fileName);

    // Voice Verification if district folder is empty

    const bucketName =
      process.env.NODE_ENV === "production"
        ? process.env.PROD_STORAGE_BUCKET
        : process.env.DEV_STORAGE_BUCKET;

    const bucket = storage.bucket(bucketName);

    const form = new formData();
    form.append("userId", userInfo._id.toString());
    form.append("audio", audio.buffer, {
      filename: audio.originalname,
      contentType: audio.mimetype,
    });
    // Voice Verification throught python api
    const response = await axios.post(
      `${process.env.PYTHON_API_URL}/inter-audio-compare-v3`,
      form,
      {
        headers: {
          ...form.getHeaders(),
        },
      },
    );

    if (response.data.isLessVolume) {
      return next(
        new ErrorResponse(`Audio Volume is too low! Record again`, [], 400),
      );
    }

    // Saving the Refrence File of speaker after verification is successfull
    const file = bucket.file(`${folderPath}/${fileName}`);
    await file.save(audio.buffer, {
      metadata: {
        contentType: "audio/wav",
      },
    });

    const sampleAudioPath = `https://storage.googleapis.com/${bucketName}/${folderPath}/${fileName}`;
    userInfo = await User.findByIdAndUpdate(
      userInfo._id,
      {
        sampleAudioPath,
      },
      { new: true },
    );

    if (response.data.isNoisy === "True") {
      userInfo = await User.findByIdAndUpdate(
        userInfo._id,
        {
          isNoisy: true,
          cosineDistance: response.data.cosineDistance,
        },
        { new: true },
      );
      return next(
        new ErrorResponse(`Audio is not clear! Record a clear audio`, [], 400),
      );
    }

    if (response.data.isSmallSegment) {
      return next(new ErrorResponse(`Please Speak for atleast 5sec`, [], 400));
    }

    //console.log("response", response.data);

    if (response.data.speakerFound) {
      userInfo = await User.findByIdAndUpdate(
        userInfo._id,
        {
          simillarspeakerFound: true,
          cosineDistanceSpeakerFound: response.data.cosineDistance,
          blobName: response.data.blob_name,
        },
        { new: true },
      );
      return next(new ErrorResponse(`Similar Voice Detected`, [], 400));
    }

    // Updating the user document
    if (true) {
      //const sampleAudioPath = `https://storage.googleapis.com/${bucketName}/${folderPath}/${fileName}`;
      userInfo = await User.findByIdAndUpdate(
        userInfo._id,
        {
          voiceVerified: true,
          //sampleAudioPath,
        },
        { new: true },
      );

      console.log(userInfo);

      //get token
      const token = userInfo.getAuth();

      const user = {
        id: userInfo._id,
        role: userInfo.role,
        mobile: userInfo.mobile,
        name: userInfo.name,
        accesscode: userInfo.accesscode,
        district: userInfo.district,
        coordinator: userInfo.coordinator,
        state: userInfo.state,
        managerStates: userInfo.managerStates,
        teamleadDistricts: userInfo.teamLeadDistricts,
        interDistricts: userInfo.InterDistricts,
        sampleAudioPath: userInfo.sampleAudioPath,
        latitude: userInfo.latitude,
        longitude: userInfo.longitude,
        additionalInfoCheck: userInfo.additionalInfoCheck
          ? userInfo.additionalInfoCheck
          : userInfo.recordedHours > "00:00:00"
            ? true
            : false,
      };

      return res.status(200).json({
        success: true,
        msg: `Voice Verification Successful`,
        token: token,
        user,
      });
    }
  } catch (error) {
    console.log(error);
    return next(new ErrorResponse(`Unable to Verify Voice!`, [], 500));
  } finally {
    // Updating the user document
    if (userInfo) {
      await User.findByIdAndUpdate(userInfo._id, {
        isVoiceVerificationUnderProcess: false,
      });
    }
  }
});

//@desc     Add new Language Vendor
//@route    POST /api/addnewparticipantlanguage/
//@access   Private
//@usedBy   Audio Recording App
exports.addNewLanguage = asyncHandler(async (req, res, next) => {
  try {
    const isLanguage = await Languages.find({
      language: { $regex: req.body.language, $options: "i" },
    });

    //console.log("isLanguage", isLanguage);

    if (isLanguage.length > 0) {
      return next(new ErrorResponse(`Language already exists!`, [], 409));
    } else {
      let NewLang =
        req.body.language.charAt(0).toUpperCase() +
        req.body.language.slice(1).toLowerCase();

      const newlanguage = {
        language: NewLang,
        isLangApproved: false,
        isactive: true,
      };

      //console.log("newlanguage..", newlanguage);
      const lang = await Languages.create(newlanguage);

      res.status(200).json({
        success: true,
        data: lang,
        msg: "Language added successfully!",
      });
    }
  } catch (err) {
    console.log("err..", err);
    return next(new ErrorResponse(`Language creation failed!`, [], 500));
  }
});

//@desc     Get approval/Pending Language list
//@route    GET/api/getapprovallanglist/
//@access   Public
//@usedBy   Audio Recording App
exports.getApprovalLanguageList = asyncHandler(async (req, res, next) => {
  try {
    // console.log("req.body is ", req.body);
    const languages = await Languages.find(
      { isLangApproved: false },
      {
        language: 1,
      },
    );

    res.status(200).json({
      success: true,
      data: languages,
      msg: "Pending Languages.",
    });
  } catch (err) {
    return next(new ErrorResponse(`Something went wrong!`, [], 500));
  }
});

//@desc     Update language
//@route    PUT /api/updateandapprovelang/
//@access   Private
//@usedBy   Audio Recording App
exports.updateAprroveLanguage = asyncHandler(async (req, res, next) => {
  try {
    //console.log("req.body", req.body);
    let { id, oldlang, newlang, reason } = req.body;

    if (reason == "optionA") {
      if (oldlang == newlang) {
        const updatelang = await Languages.findByIdAndUpdate(id, {
          isLangApproved: true,
        });
        if (updatelang) {
          res.status(200).json({
            success: true,
            msg: `Language aprroved Successfully`,
            //data: userDetails,
          });
        }
      }
    } else if (reason == "optionB") {
      const updatelang = await Languages.findByIdAndUpdate(id, {
        isLangApproved: true,
        language: newlang,
      });

      if (updatelang) {
        const updateuser = await User.updateMany(
          {
            language: oldlang,
            role: "Vendor",
          },
          { $set: { language: newlang, knownlanguages: newlang } },
        );

        const updatefiles = await FileDetail.updateMany(
          {
            language: oldlang,
          },
          { $set: { language: newlang } },
        );

        res.status(200).json({
          success: true,
          msg: `Language aprroved and updated Successfully`,
          //data: userDetails,
        });
      }
    } else if (reason == "optionC") {
      const isLanguage = await Languages.find({
        language: { $regex: newlang, $options: "i" },
      });

      if (isLanguage.length > 0) {
        const updatelang = await Languages.findByIdAndDelete(id);

        if (updatelang) {
          const updateuser = await User.updateMany(
            {
              language: oldlang,
              role: "Vendor",
            },
            { $set: { language: newlang, knownlanguages: newlang } },
          );

          const updatefiles = await FileDetail.updateMany(
            {
              language: oldlang,
            },
            { $set: { language: newlang } },
          );

          res.status(200).json({
            success: true,
            msg: `Language aprroved and updated Successfully`,
            //data: userDetails,
          });
        }
      }
    } else {
      res.status(200).json({
        success: true,
        msg: `Something went wrong`,
        //data: userDetails,
      });
    }
  } catch (err) {
    return next(new ErrorResponse("Internal server error", [err], 500));
  }
});

//@desc Ratios List
//@route GET /api/getallratios
//@access Private Admin
//@usedBy Audio Recording App
exports.getAllRatios = asyncHandler(async (req, res, next) => {
  try {
    const ratios = await RecordingRatio.find();
    res.status(200).json({ success: true, data: ratios });
  } catch (err) {
    return next(new ErrorResponse(`Error in fetching ratios`, [], 500));
  }
});
