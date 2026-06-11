const express = require("express");
const requestRouter = express.Router();

requestRouter.post("/sendConnection",async(req,res)=>{
  console.log("Connection sent successfully");
  res.send("Connection sent");
})


module.exports = requestRouter;