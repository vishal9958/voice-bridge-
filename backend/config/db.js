const mongoose = require("mongoose");

// DevAudioRecordingPhase3DB — ye wala DB hai jisme sare registered users hain
// Render pe env vars alag ho sakti hain, isliye yahan hardcode kar diya hai
const PHASE3_DB = "mongodb+srv://admmegdap:Megdap12345@audiorecordingportaldb.7d5xm.mongodb.net/DevAudioRecordingPhase3DB?retryWrites=true&w=majority";

const connectDB = async () => {
  try {
    // Always use Phase3 DB (where all users are registered)
    // Fallback to env var only if hardcoded URI fails
    const dbUri = PHASE3_DB || process.env.DCPDB_CONN || process.env.PRDDB_CONN;
    const conn = await mongoose.connect(dbUri);
    console.log(`MongoDB connected successfully: ${conn.connection.host} [DB: ${conn.connection.name}]`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    // Retry with env var as fallback
    try {
      const fallbackUri = process.env.DCPDB_CONN || process.env.PRDDB_CONN;
      if (fallbackUri) {
        const conn = await mongoose.connect(fallbackUri);
        console.log(`MongoDB connected (fallback): ${conn.connection.host} [DB: ${conn.connection.name}]`);
      }
    } catch (fallbackErr) {
      console.error(`MongoDB fallback connection also failed: ${fallbackErr.message}`);
    }
  }
};

module.exports = connectDB;
