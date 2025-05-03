import { config } from "dotenv";
import { sign, verify } from "jsonwebtoken";

config();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "";

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
  throw new Error("JWT secrets are not set");
}

const generatePasswordResetToken = (email: string) => {
  return sign({ email, purpose: "passwordReset" }, ACCESS_TOKEN_SECRET, {
    expiresIn: "1h",
  });
};

interface PasswordResetPayload {
  email: string;
  purpose: string;
}

const verifyPasswordResetToken = (token: string) => {
  const decoded = verify(token, ACCESS_TOKEN_SECRET) as PasswordResetPayload;
  if (decoded.purpose !== "passwordReset") {
    throw new Error("Invalid token");
  }
  return decoded;
};

const generateAccessToken = (id: string, email: string, role: string) => {
  return sign(
    { id, email, role, purpose: "accessToken" },
    ACCESS_TOKEN_SECRET,
    {
      expiresIn: "1y",
    }
  );
};

const generateRefreshToken = (
  email: string,
  role: string,
  remember_me: boolean
) => {
  return sign(
    { email, role, purpose: "refreshToken", remember_me },
    REFRESH_TOKEN_SECRET,
    {
      expiresIn: remember_me ? "30d" : "1d",
    }
  );
};

interface RefreshTokenPayload {
  email: string;
  role: string;
  purpose: string;
  remember_me: boolean;
}

const verifyRefreshToken = (token: string) => {
  const decoded = verify(token, REFRESH_TOKEN_SECRET) as RefreshTokenPayload;
  if (decoded.purpose !== "refreshToken") {
    throw new Error("Invalid token");
  }
  return decoded;
};

export interface AccessTokenPayload {
  id: string;
  email: string;
  role: string;
  purpose: string;
}

const verifyAccessToken = (token: string) => {
  const decoded = verify(token, ACCESS_TOKEN_SECRET) as AccessTokenPayload;
  if (decoded.purpose !== "accessToken") {
    throw new Error("Invalid token");
  }
  return {
    id: decoded.id,
    email: decoded.email,
    role: decoded.role,
    purpose: decoded.purpose,
  };
};

export {
  generatePasswordResetToken,
  verifyPasswordResetToken,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  verifyAccessToken,
};
