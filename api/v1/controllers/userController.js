// import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { User } from "../../../models/User.js";

// register a new user controller
export const createUser = async (req, res) => {
  const { email, password, confirmPassword } = req.body;
  if (!email || !password || !confirmPassword) {
    return res.status(400).json({
      error: true,
      message: "All fields are required",
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        error: true,
        message: "Email already in use.",
      });
    }

    const user = new User({ email, password});
    await user.save();
    return res.status(201).json({
      error: false,
      message: "User register succussfully",
    });
  } catch (err) {
    return res.status(500).json({
      error: true,
      message: "Server error",
      details: err.message,
    });
  }
};

// login a user - jwt signed token controller
export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({
      error: true,
      message: "Email and password are required.",
    });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        error: true,
        message: "Invalid credentials - user not found!",
      });
    }
     // 👇 ใส่ log ตรงนี้เพื่อ debug
     console.log("Password from form:", password);
     console.log("Password in DB:", user.password);

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Match:", isMatch);
    if (!isMatch) {
      return res.status(401).json({
        error: true,
        message: "Invalid credentials - user not match",
      });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    return res.status(200).json({
      error: false,
      token,
      message: "Login Successfully",
    });
  } catch (err) {
    return res.status(500).json({
      error: true,
      message: "Server error",
      details: err.message,
    });
  }
};

// Logout controller
export const logoutUser = (req, res) => {
  res.status(200).json({ message: "Logged out successfully" });
};

// get users
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort("-createdOn");
    res.status(200).json({
      error: false,
      users,
      message: "All users retrieved successfully",
    });
  } catch (err) {
    res.status(500).json({
      error: true,
      message: "Failed to fetch users",
      details: err.message,
    });
  }
};

// delete a user
export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    await User.findByIdAndDelete(id);
    res.status(204).json({ message: "delete a user successfully" }).end();
  } catch (err) {
    res.status(500).json({
      error: true,
      message: "Failed to delete a user",
      details: err.message,
    });
  }
};

// forgot password 
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({
      error: true,
      message: "Email is required",
    });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({
        error: true,
        message: "If the email exists, a reset link has been sent."
      });
    }


    // Create reset token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hr
    await user.save();

    // Send email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.EMAIL_USER,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
      },
    });


    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Password Reset Request",
      html: `<p>You requested a password reset</p>
             <p>Click this <a href="${resetUrl}">link</a> to reset your password</p>`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      error: false,
      message: "Password reset email sent",
    });
  } catch (err) {
    console.error("❌ Error sending email:", err.message);
    console.error("🔴 Full Error:", err);
    console.error("🟠 Error Code:", err.code);
    console.error("🟡 Error Response Data:", err.response?.data);
    res.status(500).json({
      error: true,
      message: "Error sending email",
      details: err.message,
    });
  }
};

// Reset Password 
export const resetPassword = async (req, res) => {};
