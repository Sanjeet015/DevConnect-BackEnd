const express = require("express");
const {userAuth} = require("../middleware/auth")
const User = require("../models/user")


const profileRouter = express.Router();


profileRouter.get("/profile",userAuth,async (req,res)=>{
  try {
    const user = req.user;
    res.send(user);
  } catch (err) {
    res.status(500).send("Error: "+err.message);
  }
})

profileRouter.get("/user",async (req,res)=>{
  const userEmail = req.body.emailId;

  try {
    const user = await User.findOne({emailId:userEmail});
    if(!user === 0){
      res.status(404).send("User not found");
    }else{
      res.send(user);
    }
  } catch (err) {
    res.status(400).send("Something went wrong");
  }
})


profileRouter.get("/feed",async (req,res)=>{
  try {
    const users = await User.find({});
    if(users.length === 0){
      res.status(404).send("Empty feed");
    }else{
      res.send(users);
    }
  } catch (err) {
    res.status(500).send("Something went wrong..!");
  }
})

profileRouter.delete("/user",async (req,res)=>{
  const userId = req.body.userId;
  try {
    const user = await User.findByIdAndDelete(userId);
    res.send("User Deleted successfully");
  } catch (err) {
    res.status(500).send("Something went wrong..!");
  }
})


profileRouter.patch("/user/:userId",async (req,res)=>{
  const userId = req.params?.userId;
  const data = req.body;

  
  try{
    const ALLOWED_UPDATES =["photoUrl","about","gender","age","skills"];

    const isUpdateAllowed = Object.keys(data).every((k)=> ALLOWED_UPDATES.includes(k));

    if(!isUpdateAllowed){
      throw new Error("Update not allowed");
    }

    if(data?.skills.length>10){
      throw new Error("You can have atmost 10 skills");
    }
    const updatedUser = await User.findByIdAndUpdate({_id:userId},data,{
      runValidators:true,
    });
    res.send("User updated successfully");
  }catch (err) {
    res.status(500).send("Something went wrong..!");
  }
})

module.exports = profileRouter;