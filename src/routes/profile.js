const express = require("express");
const {userAuth} = require("../middleware/auth")
const User = require("../models/user");
const { validateEditProfileData } = require("../utils/validation");
const bcrypt = require("bcrypt")
const validator = require("validator");


const profileRouter = express.Router();


profileRouter.get("/profile/view",userAuth,async (req,res)=>{
  try {
    const user = req.user;
    res.send(user);
  } catch (err) {
    res.status(400).send("Error: "+err.message);
  }
})

profileRouter.patch("/profile/update",userAuth,async (req,res)=>{
  try {
    if(!validateEditProfileData(req)){
      throw new Error("Invalid edit request");
    }

    const loggedInUser = req.user;

    const {age} = req.body;
    
    if(age !== undefined && (age > 100 || age < 14)){
      throw new Error("Age should be in the range of 14 to 100");
    }

    
    const trimFields = ["firstName", "lastName", "about", "gender", "photoUrl"];
    trimFields.forEach(key => {
      if (req.body[key] && typeof req.body[key] === "string") {
        req.body[key] = req.body[key].trim();
      }
    });

    Object.keys(req.body).forEach(key=>loggedInUser[key]=req.body[key]);

    await loggedInUser.save();
    res.json({message:"Your profile updated successfully",data:loggedInUser});
  } catch (err) {
    res.status(400).json({message:"ERROR: "+err.message});
  }
})

const { upload, uploadToCloudinary } = require("../utils/cloudinary");

profileRouter.post("/profile/upload", userAuth, upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const secureUrl = await uploadToCloudinary(req.file.buffer);
    res.json({
      message: "Image uploaded successfully",
      photoUrl: secureUrl
    });
  } catch (err) {
    res.status(400).json({ message: "Upload failed: " + err.message });
  }
});

profileRouter.patch("/profile/password",userAuth,async(req,res)=>{
  try {
    const {currentPassword,newPassword} = req.body;

    const loggedInUser = req.user;

    const isPasswordValid = await bcrypt.compare(currentPassword,loggedInUser.password);

    if(!isPasswordValid){
      throw new Error("Current password is incorrect");
    }

    const isNewPasswordValid = validator.isStrongPassword(newPassword);

    if(!isNewPasswordValid) {
      throw new Error("Please enter a strong password");
    }

    const hashedPassword = await bcrypt.hash(newPassword,10);

    loggedInUser.password = hashedPassword;
    
    loggedInUser.refreshToken = undefined;

    await loggedInUser.save();

    res.send("Password updated successfully");

  } catch (err) {
    res.status(400).send("ERROR: "+err.message);
  }
})

module.exports = profileRouter;