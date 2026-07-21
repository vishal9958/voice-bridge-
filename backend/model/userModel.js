const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema({
  name: {
    type: mongoose.SchemaTypes.String,
    required: [true, "First Name is required"],
    trim: true,
    maxlength: [50, "First Name cannot be more than 50 characters"],
  },
  accesscode: {
    type: mongoose.SchemaTypes.String,
    required: true,
    trim: true,
  },
  mobile: {
    type: mongoose.SchemaTypes.String,
    unique: [true, "Mobile Number already exists"],
    required: [true, "Mobile Number is required"],
    trim: true,
  },
  role: {
    type: String,
    enum: [
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
    required: true,
    trim: true,
    default: "Vendor",
  },
  isactive: {
    type: mongoose.SchemaTypes.Boolean,
    default: true,
  },
  speakerID: {
    type: mongoose.SchemaTypes.String,
    //required: true,
  },
  age: {
    type: mongoose.SchemaTypes.Number,
    trim: true,
  },
  gender: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
  qualification: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
  stayingyears: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
  socioeconomicstatus: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
  // education: {
  //   type: mongoose.SchemaTypes.String,
  //   trim: true,
  // },
  // occupation: {
  //   type: mongoose.SchemaTypes.String,
  //   trim: true,
  // },
  // monthlyincome: {
  //   type: mongoose.SchemaTypes.String,
  //   trim: true,
  // },
  // totalsurveyscore: {
  //   type: mongoose.SchemaTypes.Number,
  // },
  additionalInfoCheck: {
    type: mongoose.SchemaTypes.Boolean,
    default: false,
  },
  latitude: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
  longitude: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
  state: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
  district: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
  language: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
  pincode: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
  phonebrand: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
  phonemodel: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
  knownlanguages: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
  rate: {
    type: mongoose.SchemaTypes.Number,
    trim: true,
  },
  isPaid: {
    type: mongoose.SchemaTypes.Boolean,
    trim: true,
  },
  amountPaid: {
    type: mongoose.SchemaTypes.Number,
    trim: true,
  },
  balanceamount: {
    type: mongoose.SchemaTypes.Number,
    trim: true,
  },
  paidOn: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
  recordedHours: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
  pendingHours: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
  createdBy: {
    type: mongoose.SchemaTypes.String,
    required: true,
  },
  createdOn: {
    type: mongoose.SchemaTypes.Date,
    required: true,
    default: Date.now,
  },
  coordinator: {
    type: mongoose.SchemaTypes.String,
  },
  acceptTerms: {
    type: mongoose.SchemaTypes.Boolean,
  },
  supervisorName: {
    type: mongoose.SchemaTypes.String,
    trim: true,
    maxlength: [50, "Supervisor Name cannot be more than 50 characters"],
  },
  supervisorID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    // type: mongoose.SchemaTypes.String,
    // trim: true,
  },
  teamleadName: {
    type: mongoose.SchemaTypes.String,
    trim: true,
    maxlength: [50, "Teamlead Name cannot be more than 50 characters"],
  },
  teamleadID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    // type: mongoose.SchemaTypes.String,
    // trim: true,
  },
  email: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
  recordingCompleted: {
    type: mongoose.SchemaTypes.Boolean,
    default: false,
  },
  downloadCompleted: {
    type: mongoose.SchemaTypes.Boolean,
    default: false,
  },
  supervisorDistricts: [
    {
      district: {
        type: mongoose.SchemaTypes.String,
        trim: true,
      },
      state: {
        type: mongoose.SchemaTypes.String,
        trim: true,
      },
    },
  ],
  teamLeadDistricts: [
    {
      district: {
        type: mongoose.SchemaTypes.String,
        trim: true,
      },
      state: {
        type: mongoose.SchemaTypes.String,
        trim: true,
      },
    },
  ],
  managerStates: [
    {
      state: {
        type: mongoose.SchemaTypes.String,
        trim: true,
      },
    },
  ],
  InterDistricts: [
    {
      district: {
        type: mongoose.SchemaTypes.String,
        trim: true,
      },
    },
  ],
  qcLanguages: [
    {
      language: {
        type: mongoose.SchemaTypes.String,
        trim: true,
      },
      district: {
        type: mongoose.SchemaTypes.String,
        trim: true,
      },
      state: {
        type: mongoose.SchemaTypes.String,
        trim: true,
      },
    },
  ],
  billingAddress: {
    name: {
      type: mongoose.SchemaTypes.String,
      trim: true,
    },
    invName: {
      type: mongoose.SchemaTypes.String,
      trim: true,
    },
    mobile: {
      type: mongoose.SchemaTypes.String,
      trim: true,
    },
    address1: {
      type: mongoose.SchemaTypes.String,
      trim: true,
    },
    address2: {
      type: mongoose.SchemaTypes.String,
      trim: true,
    },
    country: {
      type: mongoose.SchemaTypes.String,
      trim: true,
    },
    state: {
      type: mongoose.SchemaTypes.String,
      trim: true,
    },
    district: {
      type: mongoose.SchemaTypes.String,
      trim: true,
    },
    pincode: {
      type: mongoose.SchemaTypes.String,
      trim: true,
    },
  },
  isInterAccepted: {
    type: mongoose.SchemaTypes.Boolean,
    //default: true,
  },
  NoisyUserFlag: {
    type: mongoose.SchemaTypes.Boolean,
  },
  GTTwentyFiveSec: {
    type: mongoose.SchemaTypes.Boolean,
  },
  interRejectedFlag: {
    type: mongoose.SchemaTypes.Boolean,
  },
  NotMatchingWithSample: {
    type: mongoose.SchemaTypes.Boolean,
  },
  signOffDoneOn: {
    //Coordinator signOff
    type: mongoose.SchemaTypes.Date,
  },
  isQcSignedOff: {
    //QC SignOff
    type: mongoose.SchemaTypes.Boolean,
  },
  qcSignOffDoneOn: {
    type: mongoose.SchemaTypes.Date,
  },
  isSegmentationSignedOff: {
    //Segmentation SignOff
    type: mongoose.SchemaTypes.Boolean,
  },
  segmentationSignOffDoneOn: {
    type: mongoose.SchemaTypes.Date,
  },
  isQcPrSignedOff: {
    //QcPr SignOff
    type: mongoose.SchemaTypes.Boolean,
  },
  QcPrSignOffDoneOn: {
    type: mongoose.SchemaTypes.Date,
  },
  phase: {
    type: mongoose.SchemaTypes.Number,
  },
  voiceVerified: {
    type: mongoose.SchemaTypes.Boolean,
  },
  sampleAudioPath: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
  isVoiceVerificationUnderProcess: {
    type: mongoose.SchemaTypes.Boolean,
    default: false,
  },
  consentFormPath: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
  consentlanguage: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
  speechDuration: {
    type: mongoose.SchemaTypes.String,
    trim: true,
    default: "00:00:00",
  },
  pendingSpeechDuration: {
    type: mongoose.SchemaTypes.String,
    trim: true,
    default: "00:15:00",
  },
  autoSignOff: {
    type: mongoose.SchemaTypes.Boolean,
  },
  cosineDistance: {
    type: mongoose.SchemaTypes.Number,
  },
  isNoisy: {
    type: mongoose.SchemaTypes.Boolean,
  },
  simillarspeakerFound: {
    type: mongoose.SchemaTypes.Boolean,
  },
  cosineDistanceSpeakerFound: {
    type: mongoose.SchemaTypes.Number,
  },
  blobName: {
    type: mongoose.SchemaTypes.String,
  },
  cosineSimilarity: {
    type: mongoose.SchemaTypes.Number,
  },
});

//   //Sign JWT and return
userSchema.methods.getAuth = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

module.exports = mongoose.model("User", userSchema, "Users");
