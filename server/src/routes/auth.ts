import { Router, Request, Response, CookieOptions } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { validate as validateEmail } from "@purpleschool/deep-email-validator";
import User from "../models/User";
import { authenticate, AuthRequest } from "../middleware/auth";

const isProduction = process.env.NODE_ENV === "production";

const ACCESS_TOKEN_EXPIRY = "15m"; // 15 minutes
const REFRESH_TOKEN_EXPIRY = "7d"; // 7 days
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const REFRESH_TOKEN_NAME = "refresh_token";
const DEFAULT_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
};

const router = Router();

function signAccessToken(userId: string, email: string) {
  return jwt.sign({ id: userId, email }, process.env.JWT_SECRET as string, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

function signRefreshToken(userId: string, email: string) {
  return jwt.sign({ id: userId, email }, process.env.JWT_SECRET as string, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_TOKEN_NAME, token, {
    ...DEFAULT_COOKIE_OPTIONS,
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_TOKEN_NAME, DEFAULT_COOKIE_OPTIONS);
}

function parseRefreshToken(req: Request): string | null {
  const cookieHeader = req.headers.cookie ?? "";
  for (const part of cookieHeader.split(";")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx < 0) continue;
    const key = part.slice(0, eqIdx).trim();
    if (key === REFRESH_TOKEN_NAME) return part.slice(eqIdx + 1).trim();
  }
  return null;
}

router.post("/register", async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password || !phone) {
    res.status(400).json({
      error: "name, email, phone, and password are required",
      message: "Please provide your name, email, phone number, and password.",
    });
    return;
  }

  try {
    const trimmedName = String(name).trim();
    const trimmedEmail = String(email).trim();

    if (trimmedName.length < 4) {
      res.status(400).json({
        error: "Name too short",
        message: "Please enter your full name.",
      });
      return;
    }

    const emailValidation = await validateEmail({
      email: trimmedEmail,
      validateRegex: true,
      validateMx: isProduction,
      validateTypo: false,
      validateDisposable: isProduction,
      validateSMTP: isProduction,
    });

    if (!emailValidation.valid) {
      res.status(400).json({
        error: "Invalid email",
        message: "Please provide a valid, non-disposable email address.",
        reason: emailValidation.reason,
      });
      return;
    }

    const pwd = String(password);
    const hasMinLength = pwd.length >= 8;
    const hasUppercase = /[A-Z]/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);

    if (!hasMinLength || !hasUppercase || !hasSpecial) {
      res.status(400).json({
        error: "Weak password",
        message:
          "Password must be at least 8 characters, include one uppercase letter and one special character.",
      });
      return;
    }

    const trimmedPhone = String(phone).trim();
    if (!/^\+?\d{7,15}$/.test(trimmedPhone)) {
      res.status(400).json({
        error: "Invalid phone number",
        message: "Please enter a valid phone number (e.g. +2348100000000).",
      });
      return;
    }

    const existing = await User.findOne({ email: trimmedEmail });
    if (existing) {
      res.status(409).json({
        error: "Email already registered",
        message:
          "An account with this email already exists. Try signing in instead.",
      });
      return;
    }

    const passwordHash = await bcrypt.hash(pwd, 10);
    const user = await User.create({
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      passwordHash,
    });

    const accessToken = signAccessToken(String(user._id), user.email);
    const refreshToken = signRefreshToken(String(user._id), user.email);
    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      token: accessToken,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone },
    });
  } catch (err) {
    console.error("[auth/register]", err);
    res.status(500).json({
      error: "Registration failed",
      message:
        "Something went wrong while creating your account. Please try again.",
    });
  }
});

router.post("/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const accessToken = signAccessToken(String(user._id), user.email);
    const refreshToken = signRefreshToken(String(user._id), user.email);
    setRefreshCookie(res, refreshToken);

    res.json({
      token: accessToken,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone },
    });
  } catch (err) {
    console.error("[auth/login]", err);
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/refresh", async (req: Request, res: Response): Promise<void> => {
  const refreshToken = parseRefreshToken(req);
  if (!refreshToken) {
    res.status(401).json({ error: "No refresh token" });
    return;
  }

  try {
    const payload = jwt.verify(
      refreshToken,
      process.env.JWT_SECRET as string,
    ) as {
      id: string;
      email: string;
    };
    const user = await User.findById(payload.id).select("name email");
    if (!user) {
      clearRefreshCookie(res);
      res.status(401).json({ error: "User not found" });
      return;
    }

    const accessToken = signAccessToken(payload.id, payload.email);
    // Rotate the refresh token on every use
    const newRefreshToken = signRefreshToken(payload.id, payload.email);
    setRefreshCookie(res, newRefreshToken);

    res.json({
      token: accessToken,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch {
    clearRefreshCookie(res);
    res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

router.post("/logout", (_req: Request, res: Response): void => {
  clearRefreshCookie(res);
  res.json({ message: "Logged out" });
});

/**
 * GET /auth/me
 * Returns the authenticated user's profile including bank/payout details.
 */
router.get(
  "/me",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = await User.findById(req.user!.id).select(
        "name email phone bankAccountNumber bankCode",
      );
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json({ user });
    } catch (err) {
      console.error("[auth/me]", err);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  },
);

/**
 * PATCH /auth/me
 * Updates the authenticated user's bank/payout details.
 */
router.patch(
  "/me",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { bankAccountNumber, bankCode } = req.body;

    if (!bankAccountNumber || !bankCode) {
      res
        .status(400)
        .json({ error: "bankAccountNumber and bankCode are required" });
      return;
    }

    const acctNum = String(bankAccountNumber).trim();
    if (!/^\d{10}$/.test(acctNum)) {
      res
        .status(400)
        .json({ error: "Bank account number must be exactly 10 digits (NUBAN)" });
      return;
    }

    const code = String(bankCode).trim();
    if (!/^\d{3,6}$/.test(code)) {
      res.status(400).json({ error: "Invalid bank code" });
      return;
    }

    try {
      const user = await User.findByIdAndUpdate(
        req.user!.id,
        { bankAccountNumber: acctNum, bankCode: code },
        { new: true },
      ).select("name email phone bankAccountNumber bankCode");

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json({ user });
    } catch (err) {
      console.error("[auth/me:patch]", err);
      res.status(500).json({ error: "Failed to update profile" });
    }
  },
);

export default router;
