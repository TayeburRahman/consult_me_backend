import { OTP } from "src/schema";
import { sendEmail } from "./emailService";

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTP = async (
  email: string,
  type: "signup" | "login" | "forgot_password"
) => {
  const otp = generateOtp();
  await OTP.create({ otp: `${email}:${otp}`, type });
  const subject = "OTP for verification";
  const text = `Your OTP is ${otp}`;
  await sendEmail({ to: email, subject, text });
  return otp;
};

const verifyOTP = async (email: string, otp: string) => {
  const otpDoc = await OTP.findOne({ otp: `${email}:${otp}` });
  if (!otpDoc) {
    throw new Error("Invalid OTP");
  }
  await OTP.deleteOne({ _id: otpDoc._id });
  return otpDoc;
};

export { sendOTP, verifyOTP };
