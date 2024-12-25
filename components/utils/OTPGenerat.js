import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID; 
const authToken = process.env.TWILIO_AUTH_TOKEN; 
const phoneNumber = process.env.TWILID_PHONE_NUMBER; 
const client = new twilio(accountSid, authToken);


const OTPGenerat = {
    send: async (mobileNumber) => {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const message = `Your OTP is ${otp}`;
      try {
        const response = await client.messages.create({
            body: message,
            from: phoneNumber,
            to: mobileNumber
        });
        return { success: true, otp };
      } catch (error) {
        return { success: false, error };
      }
    },
  };
export default OTPGenerat;