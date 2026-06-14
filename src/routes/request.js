const express = require("express");
const { userAuth } = require("../middleware/auth");
const requestRouter = express.Router();
const User = require('../models/user');
const ConnectionRequest = require("../models/connectionRequest");

requestRouter.post("/request/send/:status/:toUserId",userAuth,async(req,res)=>{
  try {
    const fromUserId = req.user._id;
    const status = req.params.status;
    const toUserId = req.params.toUserId;

    const allowedStatus = ["Interested","Ignored"];
    if(!allowedStatus.includes(status)){
      return res.status(400).json({message:"Invalid Status type: "+status});
    }

    const toUser = await User.findById(toUserId);

    if(!toUser){
      return res.status(404).json({message:"User not found"});
    }

    const existingConnectionRequest = await ConnectionRequest.findOne({
      $or:[
        {fromUserId,toUserId},
        {fromUserId:toUserId,toUserId:fromUserId}
      ]
    });

    if(existingConnectionRequest){
      return res.status(400).json({message:"Connection request already exists"});
    }

    const connectionRequest = new ConnectionRequest({
      fromUserId,
      toUserId,
      status
    });

    const data = await connectionRequest.save();

    let message = "";
    if(status=="Interested") message = `${req.user.firstName} is interested in ${toUser.firstName}`;
    else message = `${req.user.firstName} is ignored ${toUser.firstName}`;

    res.json({message:message,data});
  } catch (err) {
    res.status(400).send("ERROR: "+err.message);
  }
})


requestRouter.post("/request/review/:status/:requestId",userAuth,async (req,res)=>{
  try {
    const loggedInUser = req.user;
    const status = req.params.status;
    const requestId = req.params.requestId;
    const allowedStatus = ["Accepted","Rejected"];

    if(!allowedStatus.includes(status)){
      return res.status(400).json({message:"Invalid Status type: "+status});
    }

    const connectionRequest = await ConnectionRequest.findOne({
      _id:requestId,
      toUserId:loggedInUser._id,
      status:"Interested"
    })

    if(!connectionRequest){
      return res.status(404).json({message:"Request not found"});
    }

    connectionRequest.status = status;
    const data = await connectionRequest.save();

    res.json({message:"Connection request "+status,data});
  } catch (err) {
    res.status(400).send("ERROR: "+err.message);
  }
})


module.exports = requestRouter;