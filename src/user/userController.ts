import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import userModel from "./userModel";
import bcrypt from "bcrypt";
import { sign } from "jsonwebtoken";
import { config } from "../config/config";
import { User } from "./userTypes";

/**
 * Create a new user
 */
const createUser = async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password } = req.body;

  // Input validation
  if (!name || !email || !password) {
    return next(createHttpError(400, "All fields are required"));
  }

  try {
    // Check if user already exists
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return next(createHttpError(400, "User already exists with this email"));
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser: User = await userModel.create({
      name,
      email,
      password: hashedPassword,
    });

    // Generate JWT token
    const token = sign({ sub: newUser._id }, config.jwtSecret as string, {
      expiresIn: "7d",
    });

    res.status(201).json({
      accessToken: token,
    });
  } catch (err) {
    console.error("Error in createUser:", err);
    if (err instanceof Error) {
      return next(
        createHttpError(500, `Error while registering user: ${err.message}`)
      );
    }
    return next(createHttpError(500, "Error while registering user"));
  }
};

/**
 * Login user
 */
const loginUser = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  // Input validation
  if (!email || !password) {
    return next(createHttpError(400, "Email and password are required"));
  }

  try {
    // Find user by email
    const user: User | null = await userModel.findOne({ email });
    if (!user) {
      return next(createHttpError(404, "User not found"));
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return next(createHttpError(400, "Invalid credentials"));
    }

    // Generate JWT token
    const token = sign({ sub: user._id }, config.jwtSecret as string, {
      expiresIn: "7d",
    });

    res.status(200).json({
      accessToken: token,
    });
  } catch (err) {
    console.error("Error in loginUser:", err);
    if (err instanceof Error) {
      return next(
        createHttpError(500, `Error while logging in user: ${err.message}`)
      );
    }
    return next(createHttpError(500, "Error while logging in user"));
  }
};

export { createUser, loginUser };
