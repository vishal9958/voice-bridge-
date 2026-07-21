const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const dbUri = process.env.NODE_ENV === "production" ? process.env.PRDDB_CONN : process.env.DCPDB_CONN;
    const conn = await mongoose.connect(dbUri);
    console.log(`MongoDB connected successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
  }
};

module.exports = connectDB;
