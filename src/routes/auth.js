const express = require("express");
const {validateSignup} = require("../utils/validation")
const bcrypt = require("bcrypt");
const User = require("../models/user");
const { userAuth } = require("../middleware/auth");
const authRouter = express.Router();

authRouter.post("/signup", async (req, res) => {

  // console.log(req.body);
  try {
    validateSignup(req);
    const {firstName,lastName,emailId,password} = req.body;
    
    const passwordHash = await bcrypt.hash(password,10);
    const user = new User({
      firstName,
      lastName,
      emailId,
      password:passwordHash,
    })
    await user.save();
    res.send("User added successfully..!");
  } catch (err) {
    res.status(400).send("Error: "+err.message);
  }
})

authRouter.post("/login", async (req,res)=>{
  try {
    const {emailId,password} = req.body;
    if (!emailId || !password) {
      res.status(400).send("Email and password are required");
    }
    const user = await User.findOne({emailId:emailId});

    if(!user){
      throw new Error("Email address is not valid");
    }

    const isPasswordValid = await user.validatePassword(password);

    if(isPasswordValid){

      const token = await user.getJWT();
      res.cookie("token",token,{
        expires:new Date(Date.now()+8*360000),
      });
      res.send("Login successfull");
    }else{
      res.status(400).send("Please enter correct password");
    }
  } catch (err) {
    res.status(400).send("Error: "+err.message);
  }
})

authRouter.post("/logout",async(req,res)=>{
  try {
    res.cookie("token",null,{
      expires:new Date(Date.now())
    });
    res.send("Logged out successfully");
  } catch (err) {
    res.status(400).send("ERROR: "+err.message);
  }
})

module.exports = authRouter;