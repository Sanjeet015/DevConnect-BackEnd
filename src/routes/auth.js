const express = require("express");
const {validateSignup} = require("../utils/validation")
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { userAuth } = require("../middleware/auth");
const authRouter = express.Router();
const { OAuth2Client } = require("google-auth-library");
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const isProd = process.env.NODE_ENV === "production";
const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "None" : "Lax",
};

authRouter.post("/signup", async (req, res) => {
  try {
    validateSignup(req);
    const {firstName,lastName,emailId,password,gender} = req.body;
    
    const passwordHash = await bcrypt.hash(password,10);
    const user = new User({
      firstName,
      lastName,
      emailId,
      password:passwordHash,
      gender,
    })
    const savedUser = await user.save();
    
    const accessToken = await savedUser.getAccessToken();
    const refreshToken = await savedUser.getRefreshToken();
    
    res.cookie("token", accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000 
    });
    res.cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000 
    });

    res.json({message:"Signup successfull",data:savedUser});
  } catch (err) {
    res.status(400).send("Error: "+err.message);
  }
})

authRouter.post("/login", async (req,res)=>{
  try {
    const {emailId,password} = req.body;
    if (!emailId || !password) {
      return res.status(400).send("Email and password are required");
    }
    const user = await User.findOne({emailId:emailId});

    if(!user){
      return res.status(400).send("Invalid credentials");
    }

    const isPasswordValid = await user.validatePassword(password);

    if(isPasswordValid){
      const accessToken = await user.getAccessToken();
      const refreshToken = await user.getRefreshToken();
      
      res.cookie("token", accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000 
      });
      res.cookie("refreshToken", refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000 
      });

      res.json({message:"Login successfull",data:user});
    }else{
      res.status(400).send("Invalid credentials");
    }
  } catch (err) {
    res.status(400).send("Error: "+err.message);
  }
})

authRouter.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token not found" });
    }

    const secretKey = process.env.JWT_SECRET || process.env.SECRET_KEY;
    const refreshSecret = process.env.REFRESH_TOKEN_SECRET || secretKey;
    const decoded = jwt.verify(refreshToken, refreshSecret);
    const user = await User.findById(decoded._id);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const newAccessToken = await user.getAccessToken();
    const newRefreshToken = await user.getRefreshToken();

    res.cookie("token", newAccessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000
    });
    res.cookie("refreshToken", newRefreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ message: "Token refreshed successfully" });
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired refresh token: " + err.message });
  }
});

authRouter.post("/logout",async(req,res)=>{
  try {
    const { refreshToken } = req.cookies;
    if (refreshToken) {
      try {
        const secretKey = process.env.JWT_SECRET || process.env.SECRET_KEY;
        const decoded = jwt.verify(refreshToken, secretKey);
        const user = await User.findById(decoded._id);
        if (user) {
          user.refreshToken = undefined;
          await user.save();
        }
      } catch (err) {
        
      }
    }

    res.clearCookie("token", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);
    res.send("Logged out successfully");
  } catch (err) {
    res.status(400).send("ERROR: "+err.message);
  }
})

authRouter.post("/google-login", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).send("Google token is required");
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, given_name, family_name, picture } = payload;

    if (!email) {
      return res.status(400).send("Email not provided by Google account");
    }

    // Try finding user by googleId, or by email
    let user = await User.findOne({
      $or: [
        { googleId: googleId },
        { emailId: email.toLowerCase() }
      ]
    });

    if (!user) {
      // Create user
      user = new User({
        firstName: given_name || "Google User",
        lastName: family_name || "",
        emailId: email.toLowerCase(),
        googleId: googleId,
        photoUrl: picture || undefined,
      });
      await user.save();
    } else {
      // If user exists but googleId is not linked, link it now
      if (!user.googleId) {
        user.googleId = googleId;
        if (!user.photoUrl || user.photoUrl.includes("placeholder")) {
          user.photoUrl = picture || user.photoUrl;
        }
        await user.save();
      }
    }

    // Generate tokens and cookies
    const accessToken = await user.getAccessToken();
    const refreshToken = await user.getRefreshToken();

    res.cookie("token", accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000
    });
    res.cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ message: "Login successful via Google", data: user });
  } catch (err) {
    res.status(400).send("Google Login Error: " + err.message);
  }
});

module.exports = authRouter;