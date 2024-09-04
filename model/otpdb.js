const mongoose = require('mongoose');

// Define the schema for OTP
const otpSchema = new mongoose.Schema({
    email: {
        type:String,
        required: true,
    },
    otp: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Create the OTP model
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 });
const OTP = mongoose.model('OTP', otpSchema);

module.exports = OTP;