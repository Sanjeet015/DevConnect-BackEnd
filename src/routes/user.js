const express = require('express');
const { userAuth } = require('../middleware/auth');
const ConnectionRequest = require("../models/connectionRequest");
const User = require('../models/user');


const userRouter = express.Router();


userRouter.get("/user/request/received",userAuth,async(req,res)=>{
  try {
    const loggedInUser = req.user;

    const connectionRequest = await ConnectionRequest.find({
      toUserId:loggedInUser._id,
      status:"Interested"
    }).populate("fromUserId","firstName lastName age gender about skills photoUrl");
    // }).populate("fromUserId",["firstName", "lastName", "age", "gender", "about", "skills", "photoUrl"]);  // can be done like this too

    res.json({message:"data fetched successfully",data:connectionRequest});

  } catch (err) {
    res.status(400).send("ERROR: "+err.message);
  }
})
userRouter.get("/user/connection",userAuth,async(req,res)=>{
  try {
    const loggedInUser = req.user;

    const connections= await ConnectionRequest.find({
      $or:[
        {toUserId:loggedInUser._id},
        {fromUserId:loggedInUser._id}
      ],
      status:"Accepted"
    }).populate("fromUserId","firstName lastName age gender about skills photoUrl")
      .populate("toUserId","firstName lastName age gender about skills photoUrl");

    const data = connections.map((row) => {
      if (row.fromUserId._id.toString() === loggedInUser._id.toString()) {
        return row.toUserId;
      }
      return row.fromUserId;
    });

    res.json({message:"connection fetched successfully",data});

  } catch (err) {
    res.status(400).send("ERROR: "+err.message);
  }
})

userRouter.get("/user/feed",userAuth,async(req,res)=>{
  try {
    const loggedInUser = req.user;

    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    limit = limit>50?50:limit;
    const skip = (page-1)*limit;
    const requestSent = await ConnectionRequest.find({
      $or:[
        {fromUserId:loggedInUser._id},
        {toUserId:loggedInUser._id},
      ]
    }).select("fromUserId toUserId")

    const hideUserFromFeed = new Set();

    requestSent.forEach((req)=>{
      hideUserFromFeed.add(req.fromUserId.toString());
      hideUserFromFeed.add(req.toUserId.toString());
    })

    const users = await User.find({
      $and:[
        {_id: {$nin: Array.from(hideUserFromFeed)}},
        {_id: {$ne: loggedInUser._id}}
      ]
    }).select("firstName lastName age gender skills photoUrl")
      .skip(skip)
      .limit(limit);

    res.json({data:users});

  } catch (err) {
    res.status(400).send("ERROR: ",err.message);
  }
})

userRouter.delete("/user/connection/:userId",userAuth,async(req,res)=>{
  try {
    const loggedInUser = req.user;
    const userIdToUnfriend = req.params.userId;

    const friendship = await ConnectionRequest.findOne({
      $or: [
        { fromUserId: loggedInUser._id, toUserId: userIdToUnfriend },
        { fromUserId: userIdToUnfriend, toUserId: loggedInUser._id }
      ],
      status: "Accepted",
    });

    if (!friendship) {
      return res.status(404).json({ message: "User is not in your connections" });
    }

    const data = await ConnectionRequest.deleteOne({
    _id:friendship._id
    })

    res.json({message:"User removed from your connection",data});

  } catch (err) {
    res.status(400).send("ERROR: "+err.message);
  }
})


module.exports = userRouter;