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

    limit = limit > 50 ? 50 : limit;
    const skip = (page - 1) * limit;

    const requestSent = await ConnectionRequest.find({
      $or: [
        { fromUserId: loggedInUser._id },
        { toUserId: loggedInUser._id },
      ]
    })
      .select("fromUserId toUserId")
      .lean();

    
    const hideUserFromFeed = new Set([loggedInUser._id.toString()]);

    requestSent.forEach((req) => {
      if (req.fromUserId) hideUserFromFeed.add(req.fromUserId.toString());
      if (req.toUserId) hideUserFromFeed.add(req.toUserId.toString());
    });

    const users = await User.find({
      _id: { $nin: Array.from(hideUserFromFeed) }
    })
      .select("firstName lastName age gender about skills photoUrl")
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({data:users});

  } catch (err) {
    res.status(400).send("ERROR: " + err.message);
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


userRouter.get("/user/search", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    const query = req.query.q || "";

    if (!query.trim()) {
      return res.json({ data: [] });
    }

    
    const users = await User.find({
      $and: [
        { _id: { $ne: loggedInUser._id } },
        {
          $or: [
            { firstName: { $regex: query, $options: "i" } },
            { lastName: { $regex: query, $options: "i" } },
            { skills: { $in: [new RegExp(query, "i")] } },
          ],
        },
      ],
    })
      .select("firstName lastName age gender about skills photoUrl")
      .limit(50)
      .lean();

    
    const connections = await ConnectionRequest.find({
      $or: [
        { fromUserId: loggedInUser._id },
        { toUserId: loggedInUser._id },
      ],
    }).lean();

    const statusMap = {};
    connections.forEach((conn) => {
      const otherUserId = conn.fromUserId.toString() === loggedInUser._id.toString()
        ? conn.toUserId.toString()
        : conn.fromUserId.toString();
      
      statusMap[otherUserId] = {
        status: conn.status,
        senderId: conn.fromUserId.toString(),
        requestId: conn._id,
      };
    });

    const data = users.map((u) => {
      const conn = statusMap[u._id.toString()];
      let connectionStatus = "None";
      let requestId = null;

      if (conn) {
        if (conn.status === "Accepted") {
          connectionStatus = "Connected";
        } else if (conn.status === "Interested") {
          if (conn.senderId === loggedInUser._id.toString()) {
            connectionStatus = "RequestSent";
          } else {
            connectionStatus = "RequestReceived";
          }
        } else if (conn.status === "Ignored") {
          connectionStatus = "Ignored";
        } else if (conn.status === "Rejected") {
          connectionStatus = "Rejected";
        }
        requestId = conn.requestId;
      }

      return {
        ...u,
        connectionStatus,
        requestId,
      };
    });

    res.json({ data });

  } catch (err) {
    res.status(400).send("ERROR: " + err.message);
  }
});


module.exports = userRouter;