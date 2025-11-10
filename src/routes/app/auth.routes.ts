import { Router } from "express";
import {
  forgot_password,
  login,
  refresh_token,
  resend,
  reset_password,
  signup,
  signupWithAuth,
  swishAccounts,
  verify_otp,
} from "@controllers/auth";
import authorize from "@middleware/auth";

const router = Router();

router.post("/signup", signup);
router.post("/verify-otp", verify_otp);
router.post("/resend", resend);
router.post("/login", login);
router.post("/auth_login", signupWithAuth);
router.post("/forgot-password", forgot_password);
router.post("/reset-password", reset_password);
router.post("/refresh-token", refresh_token);
router.patch("/swish_accounts", authorize(["user", "consultant"]), swishAccounts);


export default router;
