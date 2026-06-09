const express = require("express");
try {
  require('dotenv').config();
} catch (err) {
  console.warn('dotenv not found; falling back to environment variables. Install with: npm install dotenv');
}
const connectDB = require("./config/database");
const User = require("./models/user");

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());

app.post("/signup", async (req, res) => {

  // console.log(req.body);
  const userObj = req.body;
  
  const user = new User(userObj);
  try {
    await user.save();
    res.send("User added successfully..!");
  } catch (err) {
    res.status(400).send("Error "+err.message);
  }
})

app.get("/user",async (req,res)=>{
  const userEmail = req.body.emailId;

  try {
    const user = await User.findOne({emailId:userEmail});
    if(user.length === 0){
      res.status(404).send("User not found");
    }else{
      res.send(user);
    }
  } catch (err) {
    res.status(400).send("Something went wrong");
  }
})


app.get("/feed",async (req,res)=>{
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

app.delete("/user",async (req,res)=>{
  const userId = req.body.userId;
  try {
    const user = await User.findByIdAndDelete(userId);
    res.send("User Deleted successfully");
  } catch (err) {
    res.status(500).send("Something went wrong..!");
  }
})


app.patch("/user/:userId",async (req,res)=>{
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


connectDB()
  .then(() => {
    console.log("Database connected successfully");
    app.listen(PORT, () => {
      console.log(`app is successfully listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database can not be connected", err);
  });
