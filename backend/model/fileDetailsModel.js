const mongoose = require("mongoose");

const fileDetailsSchema = new mongoose.Schema({
  fileName: {
    type: mongoose.SchemaTypes.String,
    required: true,
    trim: true,
  },
  fileLocation: {
    type: mongoose.SchemaTypes.String,
    required: true,
    trim: true,
  },
  transcriptionFileLocation: {
    type: mongoose.SchemaTypes.String,
    required: true,
    trim: true,
  },
  fileDuration: {
    type: mongoose.SchemaTypes.String,
    required: true,
    default: "00:00:00",
  },
  fileDurationSecs: {
    type: mongoose.SchemaTypes.Number,
    trim: true,
    default: 0,
  },
  recordedOn: {
    type: mongoose.SchemaTypes.Date,
    required: true,
    default: Date.now,
  },
  status: {
    type: String, //Accepted CoordinatorRejected SupervisorRejected QcRejected AdminRejected Hold Duplicate Unique Duplicate2 Unique2 Rejected RecoveryRejected Processing SpeakerRatioRejected
    default: "Accepted",
    required: true,
  },
  // acceptedOn: {
  //   type: mongoose.SchemaTypes.Date,
  //   required: true,
  //   default: Date.now,
  // },
  rejectedByCoordinator: {
    type: mongoose.SchemaTypes.String,
  },
  coordinatorRejectedOn: {
    type: mongoose.SchemaTypes.Date,
    //default: Date.now,
  },
  coordinatorRejectionReason: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
  rejectedBySupervisor: {
    type: mongoose.SchemaTypes.String,
  },
  supervisorRejectedOn: {
    type: mongoose.SchemaTypes.Date,
    //default: Date.now,
  },
  supervisorRejectionReason: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
  isQcAccepted: {
    type: mongoose.SchemaTypes.Boolean,
    default: false,
  },
  acceptedByQcName: {
    type: mongoose.SchemaTypes.String,
  },
  acceptedByQcId: {
    type: mongoose.SchemaTypes.String,
  },
  qcAcceptedOn: {
    type: mongoose.SchemaTypes.Date,
  },
  rejectedByQcId: {
    type: mongoose.SchemaTypes.String,
  },
  rejectedByQcName: {
    type: mongoose.SchemaTypes.String,
  },
  qcRejectedOn: {
    type: mongoose.SchemaTypes.Date,
    //default: Date.now,
  },
  qcRejectionReason: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
  rejectedByAdminId: {
    type: mongoose.SchemaTypes.String,
  },
  rejectedByAdminName: {
    type: mongoose.SchemaTypes.String,
  },
  AdminRejectedOn: {
    type: mongoose.SchemaTypes.Date,
    //default: Date.now,
  },
  AdminRejectionReason: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
  intra1Speaker: {
    type: mongoose.SchemaTypes.String,
  },
  intra1SpeakerCheckedBy: {
    type: mongoose.SchemaTypes.String,
  },
  intra1CheckById: {
    type: mongoose.SchemaTypes.String,
  },
  intra1CheckByName: {
    type: mongoose.SchemaTypes.String,
  },
  intra1CheckedOn: {
    type: mongoose.SchemaTypes.Date,
  },
  intra1CheckStatus: {
    type: mongoose.SchemaTypes.String,
  },
  intra2CheckById: {
    type: mongoose.SchemaTypes.String,
  },
  intra2CheckByName: {
    type: mongoose.SchemaTypes.String,
  },
  intra2CheckedOn: {
    type: mongoose.SchemaTypes.Date,
  },
  intra2CheckStatus: {
    type: mongoose.SchemaTypes.String,
  },
  inter1CheckById: {
    type: mongoose.SchemaTypes.String,
  },
  inter1CheckByName: {
    type: mongoose.SchemaTypes.String,
  },
  inter1CheckStatus: {
    type: mongoose.SchemaTypes.String,
  },
  inter1CheckedOn: {
    type: mongoose.SchemaTypes.Date,
  },
  inter1DuplicateSpeaker: {
    type: mongoose.SchemaTypes.String,
  },
  inter2CheckById: {
    type: mongoose.SchemaTypes.String,
  },
  inter2CheckByName: {
    type: mongoose.SchemaTypes.String,
  },
  inter2CheckStatus: {
    type: mongoose.SchemaTypes.String,
  },
  inter2CheckedOn: {
    type: mongoose.SchemaTypes.Date,
  },
  inter2DuplicateSpeaker: {
    type: mongoose.SchemaTypes.String,
  },
  rate: {
    type: mongoose.SchemaTypes.Number,
  },
  isPaid: {
    type: mongoose.SchemaTypes.Boolean,
    default: false,
    required: true,
  },
  paidOn: {
    type: mongoose.SchemaTypes.Date,
  },
  imageName: {
    type: mongoose.SchemaTypes.String,
    required: true,
    trim: true,
  },
  imageLocation: {
    type: mongoose.SchemaTypes.String,
    required: true,
    trim: true,
  },
  folderPath: {
    type: mongoose.SchemaTypes.String,
  },
  frequency: {
    type: mongoose.SchemaTypes.Number,
    default: 16,
    required: true,
  },
  bitRate: {
    type: mongoose.SchemaTypes.Number,
    default: 16,
    required: true,
  },
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  speakerID: {
    type: mongoose.SchemaTypes.String,
    required: true,
  },
  mobile: {
    type: mongoose.SchemaTypes.Number,
    required: true,
  },
  vendorName: {
    type: mongoose.SchemaTypes.String,
    required: true,
  },
  age: {
    type: mongoose.SchemaTypes.Number,
    trim: true,
    required: true,
  },
  gender: {
    type: mongoose.SchemaTypes.String,
    trim: true,
    required: true,
  },
  qualification: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
  state: {
    type: mongoose.SchemaTypes.String,
    trim: true,
    required: true,
  },
  district: {
    type: mongoose.SchemaTypes.String,
    trim: true,
    required: true,
  },
  language: {
    type: mongoose.SchemaTypes.String,
    trim: true,
    required: true,
  },
  pincode: {
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
  coordinatorName: {
    type: mongoose.SchemaTypes.String,
    trim: true,
    required: true,
  },
  supervisorName: {
    type: mongoose.SchemaTypes.String,
    trim: true,
    required: true,
  },
  teamleadName: {
    type: mongoose.SchemaTypes.String,
    trim: true,
    required: true,
  },
  FileRecoveryProcessed: {
    type: mongoose.SchemaTypes.Boolean,
  },
  SegmentationStatus: {
    type: mongoose.SchemaTypes.String, //Open, InProgress, Completed
  },
  CheckManualSegment: {
    type: mongoose.SchemaTypes.Boolean,
  },
  SegmentationcompletedOn: {
    type: mongoose.SchemaTypes.Date,
  },
  SegmentationDoneByName: {
    type: mongoose.SchemaTypes.String,
  },
  SegmentationDoneByID: {
    type: mongoose.SchemaTypes.String,
  },
  // QcPrCompletedOn: {
  //   type: mongoose.SchemaTypes.Date,
  // },
  // QcPrDoneByName: {
  //   type: mongoose.SchemaTypes.String,
  // },
  JsonFileLocation: {
    type: mongoose.SchemaTypes.String,
    trim: true,
  },
  JsonFileName: {
    type: mongoose.SchemaTypes.String,
  },
  phase: {
    type: mongoose.SchemaTypes.Number,
  },
  reOpenedByQcPr: {
    type: mongoose.SchemaTypes.Boolean,
  },
  speechDuration: {
    type: mongoose.SchemaTypes.String,
    default: "00:00:00",
  },
  speechDurationSec: {
    type: mongoose.SchemaTypes.Number,
  },
  qcpr: {
    type: mongoose.SchemaTypes.Boolean, //true
  },
  voiceSimilarityScore: {
    type: mongoose.SchemaTypes.Number,
  },
  requester: {
    speakerID: { type: mongoose.SchemaTypes.String, required: true },
    name: { type: mongoose.SchemaTypes.String, required: true },
    mobile: { type: Number, required: true },
  },
  partner: {
    speakerID: { type: mongoose.SchemaTypes.String, required: true },
    name: { type: mongoose.SchemaTypes.String, required: true },
    mobile: { type: Number, required: true },
  },
  promtText: {
    type: mongoose.SchemaTypes.String,
    required: true,
  },
  serverSpeakerRatio: {
    type: mongoose.SchemaTypes.String,
  },
  speakerRatioRejectionReason: {
    type: mongoose.SchemaTypes.String,
  },
});

module.exports = mongoose.model("FileDetail", fileDetailsSchema, "FileDetails");
