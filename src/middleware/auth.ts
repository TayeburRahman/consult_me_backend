import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "@utils/jwt";
import { User } from "src/schema";

interface AccessTokenPayload {
  id: string;
  email: string;
  role: string;
  purpose: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AccessTokenPayload;
}

const authorize = (allowedRoles: Array<"user" | "admin">) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    try {
      const decoded = verifyAccessToken(token);
      if (!decoded) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      if (!allowedRoles.includes(decoded.role as "user" | "admin")) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const user = await User.findById(decoded.id);

      if (!user || user.account_status === "Banned") {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      req.user = decoded;
    } catch (error) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    next();
  };
};

export default authorize;
