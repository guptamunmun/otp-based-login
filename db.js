let mongoose=require("mongoose")
// Define the User schema
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    otp: String,
    otpExpiry: Date,
    consecutiveFailedAttempts: { type: Number, default: 0 }
   
},{timestamps:true});

  
  module.exports= mongoose.model('User', userSchema);