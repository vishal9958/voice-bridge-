const dns = require('dns');
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const mongoose = require('mongoose');
const User = require('../model/userModel');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../config/config.env') });

async function test() {
  await mongoose.connect(process.env.DCPDB_CONN);
  console.log('Connected to DB');
  const count = await User.countDocuments();
  console.log('Total users count:', count);
  
  const vendors = await User.find({ role: 'Vendor' }).limit(10);
  console.log('Sample vendors:');
  vendors.forEach(v => {
    console.log(`- ID: ${v._id}, speakerID: ${v.speakerID}, name: ${v.name}, role: ${v.role}, isactive: ${v.isactive}`);
  });
  
  await mongoose.disconnect();
}

test().catch(console.error);
