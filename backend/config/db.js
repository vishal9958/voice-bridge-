const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const dbUri = process.env.DCPDB_CONN || process.env.PRDDB_CONN;
    const conn = await mongoose.connect(dbUri);
    console.log(`MongoDB connected successfully: ${conn.connection.host} [DB: ${conn.connection.name}]`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
  }
};

module.exports = connectDB;
