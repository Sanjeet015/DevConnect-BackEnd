// POST   /group/create

// GET    /group/my

// GET    /group/:groupId

// PATCH  /group/:groupId

// POST   /group/:groupId/add-member

// DELETE /group/:groupId/member/:userId

// POST   /group/:groupId/leave

// PATCH  /group/:groupId/make-admin/:userId

// PATCH  /group/:groupId/remove-admin/:userId

// PATCH  /group/:groupId/transfer-ownership/:userId

// GET    /group/:groupId/members

// GET    /group/:groupId/admins

// DELETE /group/:groupId


const express = require("express");
const Group = require('../models/group');
const GroupMembers = require('../models/groupMembers');
const ConnectionRequest = require('../models/connectionRequest');
const {userAuth} = require("../middleware/auth");
const mongoose = require('mongoose')

const groupRouter = express.Router();


groupRouter.post("/groups",userAuth,async(req,res)=>{
  try {
    const loggedInUser = req.user;
    const {name,description} = req.body;

    if(!name){
      return res.status(400).json({message:"Group name is required"});
    }

    const group = await Group.create({
      name,
      description,
      createdBy:loggedInUser._id
    });

    const groupMember = await GroupMembers.create({
      groupId:group._id,
      userId:loggedInUser._id,
      role:"owner"
    })

    res.json({message:"Group created successfully",data:group})
  } catch (err) {
    res.status(400).json({message:"ERROR: "+err.message});
  }
})

groupRouter.get("/groups/my",userAuth,async(req,res)=>{
  try {
    const userId = req.user._id;
    const membership = await GroupMembers.find({userId})
      .select("groupId")
      .populate("groupId", "name description");
    
    const groups = membership.map((m)=>m.groupId);

    res.json({message:"Groups fetched successfully",data:groups});
  
  } catch (err) {
    res.status(400).json({message:"ERROR: "+err.message});
  }
})

groupRouter.get("/group/:groupId",userAuth,async(req,res)=>{
  try {
    const userId = req.user._id;
    const groupId = req.params.groupId;

    if(!mongoose.Types.ObjectId.isValid(groupId)){
      return res.status(400).json({message:"Invalid group Id"});
    }

    const group = await Group.findById(groupId);
    
    if(!group){
      return res.status(404).json({message:"Group not found"});
    }

    const membership = await GroupMembers.findOne({
      groupId,
      userId,
    })

    if(!membership){
      return res.status(400).json({message:"Group does not exist"});
    }

    res.json({message:"Group fetched successfully",data:group});

  } catch (err) {
    res.status.json({message:"ERROR: "+err.message});
  }
})

groupRouter.patch("/group/:groupId",userAuth,async(req,res)=>{
  try {
    const userId = req.user._id;
    const groupId = req.params.groupId;
    if(!mongoose.Types.ObjectId.isValid(groupId)){
      return res.status(400).json({message:"Invalid group id"});
    }

    const group = await Group.findById(groupId);
    if(!group){
      return res.status(404).json({message:"Group not found"});
    }

    const membership = await GroupMembers.findOne({
      groupId,
      userId
    })


    if(!membership || (membership.role!=="admin" && membership.role!=="owner")){
      return res.status(400).send({message:"Unauthorized access"});
    }

    const {name,description} = req.body;

    if(name) group.name = name;
    if(description) group.description = description;

    const data = await group.save();

    res.json({message:"Group updated successfully",data});

  } catch (err) {
    res.status(400).json({message:"ERROR: "+err.message});
  }
})

groupRouter.post("/group/:groupId/add-member",userAuth,async(req,res)=>{
  try {
    const requesterId = req.user._id;
    const groupId = req.params.groupId;
    const userId = req.body.userId;

    if(!mongoose.Types.ObjectId.isValid(groupId)){
      return res.status(400).json({message:"Invalid group id"});
    }
    if(!mongoose.Types.ObjectId.isValid(userId)){
      return res.status(400).json({message:"Invalid user id"});
    }

    const group = await Group.findById(groupId);
    if(!group){
      return res.status(404).json({message:"Group not found"});
    }

    const isUserConnected = await ConnectionRequest.findOne({
      $or:[
        {fromUserId:requesterId,
        toUserId:userId},
        {fromUserId:userId,
        toUserId:requesterId},
      ],
      status:"Accepted"
    })

    if(!isUserConnected){
      return res.status(400).json({message:"You can not add a person who is not in your connection"});
    }

    const membership = await GroupMembers.findOne({
      groupId,
      userId:requesterId,
    })

    if(!membership || !["owner","admin"].includes(membership.role)){
      return res.status(400).json({message:"Unauthorized access"});
    }

    const existingMember = await GroupMembers.findOne({
      groupId,
      userId,
    });
    if(existingMember){
      return res.status(400).json({message:"User is already a member"});
    }

    await GroupMembers.create({
      groupId,
      userId,
      role:"member"
    })

    res.json({message:"User successfully added to the group"});

  } catch (err) {
    res.status(400).json({message:"ERROR: "+err.message});
  }
})

groupRouter.delete("/group/:groupId/member/:userId",userAuth,async(req,res)=>{
  try {
    const requesterId = req.user._id;
    const {groupId,userId} = req.params;

    if(!mongoose.Types.ObjectId.isValid(groupId)){
      return res.status(400).json({message:"Invalid group id"});
    }
    if(!mongoose.Types.ObjectId.isValid(userId)){
      return res.status(400).json({message:"Invalid user id"});
    }

    if (requesterId.toString() === userId) {
        return res.status(400).json({
          message: "You cannot remove yourself from the group"
        });
    }

    const group = await Group.findById(groupId);
    if(!group){
      return res.status(404).json({message:"Group not found"});
    }

    const requesterMembership = await GroupMembers.findOne({
      groupId,
      userId:requesterId
    })

    if(!requesterMembership || !["admin","owner"].includes(requesterMembership.role)){
      return res.status(400).json({message:"Unauthorized access"});
    }

    const targetMembership = await GroupMembers.findOne({
      groupId,
      userId
    })

    if(!targetMembership){
      return res.status(400).json({message:"User is not a member of the group"});
    }

    if(targetMembership.role=="owner"){
      return res.status(400).json({message:"Owner can not be removed"});
    }

    await GroupMembers.deleteOne({
      groupId,
      userId,
    })

    res.json({message:"User removed successfully"});
  } catch (err) {
    res.status(400).json({message:"ERROR: "+err.message});
  }
})

groupRouter.post("/group/:groupId/leave",userAuth,async(req,res)=>{
  try {
    const userId = req.user._id;
    const groupId = req.params.groupId;

    if(!mongoose.Types.ObjectId.isValid(groupId)){
      return res.status(400).json({message:"Invalid group id"});
    }

    const group = await Group.findById(groupId);
    if(!group){
      return res.status(404).json({message:"Group not found"});
    }

    const membership = await GroupMembers.findOne({
      groupId,
      userId,
    })

    if(!membership){
      return res.status(400).json({message:"Invalid request"});
    }

    if(membership.role==="owner"){
      return res.status(400).json({message:"Transfer the ownership before leaving the group"});
    }

    await GroupMembers.deleteOne({
      groupId,
      userId
    })

    res.json({message:"Successfully left the group"});
  } catch (err) {
    res.status(400).json({message:"ERROR: "+err.message});
  }
})

groupRouter.patch("/group/:groupId/make-admin/:userId",userAuth,async(req,res)=>{
  try {
    const requesterId = req.user._id;
    const groupId = req.params.groupId;
    const userId = req.params.userId;

    if(!mongoose.Types.ObjectId.isValid(groupId)){
      return res.status(400).json({message:"Invalid group id"});
    }
    if(!mongoose.Types.ObjectId.isValid(userId)){
      return res.status(400).json({message:"Invalid user id"});
    }

    const group = await Group.findById(groupId);
    if(!group){
      return res.status(404).json({message:"Group not found"});
    }


    const requesterMembership = await GroupMembers.findOne({
      groupId,
      userId: requesterId,
    });

      if(targetMembership.role === "owner"){
        return res.status(400).json({
          message: "Owner cannot be promoted"
        });
      }

      if (
        !requesterMembership ||
        requesterMembership.role !== "owner"
      ) {
        return res.status(400).json({
          message: "Unauthorized access",
        });
      }



      const targetMembership = await GroupMembers.findOne({
        groupId,
        userId,
      });

      if (!targetMembership) {
        return res.status(400).json({
          message: "User is not a member of the group",
        });
      }

      if (targetMembership.role === "admin") {
        return res.status(400).json({
          message: "User is already an admin",
        });
      }

      targetMembership.role = "admin";

      await targetMembership.save();

      res.json({
        message: "User promoted to admin successfully",
      });

  } catch (err) {
    res.status(400).json({message:"ERROR: "+err.message});
  }

})

groupRouter.patch("/group/:groupId/remove-admin/:userId",userAuth,async(req,res)=>{
  try {
    const requesterId = req.user._id;
      const { groupId, userId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(groupId)) {
        return res.status(400).json({
          message: "Invalid group id",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          message: "Invalid user id",
        });
      }

      const group = await Group.findById(groupId);

      if (!group) {
        return res.status(404).json({
          message: "Group not found",
        });
      }

      const requesterMembership = await GroupMembers.findOne({
        groupId,
        userId: requesterId,
      });

      if (
        !requesterMembership ||
        requesterMembership.role !== "owner"
      ) {
        return res.status(400).json({
          message: "Unauthorized access",
        });
      }

      const targetMembership = await GroupMembers.findOne({
        groupId,
        userId,
      });

      if (!targetMembership) {
        return res.status(400).json({
          message: "User is not a member of the group",
        });
      }

      if (targetMembership.role === "owner") {
        return res.status(400).json({
          message: "Owner role cannot be removed",
        });
      }

      if (targetMembership.role !== "admin") {
        return res.status(400).json({
          message: "User is not an admin",
        });
      }

      targetMembership.role = "member";

      await targetMembership.save();

      res.json({
        message: "Admin role removed successfully",
      });
  } catch (err) {
    res.status(400).json({message:"ERROR: "+err.message});
  }
})

groupRouter.patch("/group/:groupId/transfer-ownership/:userId",userAuth,async(req,res)=>{
  try {
      const requesterId = req.user._id;
      const { groupId, userId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(groupId)) {
        return res.status(400).json({
          message: "Invalid group id",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          message: "Invalid user id",
        });
      }

      const group = await Group.findById(groupId);

      if (!group) {
        return res.status(404).json({
          message: "Group not found",
        });
      }

      const currentOwner = await GroupMembers.findOne({
        groupId,
        userId: requesterId,
      });

      if (!currentOwner || currentOwner.role !== "owner") {
        return res.status(400).json({
          message: "Unauthorized access",
        });
      }

      const newOwner = await GroupMembers.findOne({
        groupId,
        userId,
      });

      if (!newOwner) {
        return res.status(400).json({
          message: "User is not a member of the group",
        });
      }

      if (newOwner.role === "owner") {
        return res.status(400).json({
          message: "User is already the owner",
        });
      }

      currentOwner.role = "admin";
      newOwner.role = "owner";

      await currentOwner.save();
      await newOwner.save();

      res.json({
        message: "Ownership transferred successfully",
      });
  } catch (err) {
    res.status(400).json({message:"ERROR: "+err.message});
  }
})

groupRouter.get("/group/:groupId/members",userAuth,async(req,res)=>{
  try {
    const userId = req.user._id;
    const { groupId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({
        message: "Invalid group id",
      });
    }

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    const membership = await GroupMembers.findOne({
      groupId,
      userId,
    });

    if (!membership) {
      return res.status(400).json({
        message: "Unauthorized access",
      });
    }

    const members = await GroupMembers.find({
      groupId,
    }).populate(
      "userId",
      "firstName lastName photoUrl"
    );

    res.json({
      message: "Members fetched successfully",
      data: members,
    });
  } catch (err) {
    res.status(400).json({message:"ERROR: "+err.message});
  }
})


groupRouter.get("/group/:groupId/admins",userAuth,async(req,res)=>{
  try {
    const userId = req.user._id;
    const { groupId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({
        message: "Invalid group id",
      });
    }

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    const membership = await GroupMembers.findOne({
      groupId,
      userId,
    });

    if (!membership) {
      return res.status(400).json({
        message: "Unauthorized access",
      });
    }

    const admins = await GroupMembers.find({
      groupId,
      role: { $in: ["owner", "admin"] },
    }).populate(
      "userId",
      "firstName lastName photoUrl"
    );

    res.json({
      message: "Admins fetched successfully",
      data: admins,
    });
  } catch (err) {
    res.status(400).json({message:"ERROR: "+err.message});
  }
})

groupRouter.delete("/group/:groupId", userAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({
        message: "Invalid group id",
      });
    }

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    const membership = await GroupMembers.findOne({
      groupId,
      userId,
    });

    if (!membership || membership.role !== "owner") {
      return res.status(400).json({
        message: "Unauthorized access",
      });
    }

    await GroupMembers.deleteMany({
      groupId,
    });

    await Group.findByIdAndDelete(groupId);

    res.json({
      message: "Group deleted successfully",
    });

  } catch (err) {
    res.status(400).json({
      message: "ERROR: " + err.message,
    });
  }
});

// try {
    
//   } catch (err) {
//     res.status(400).json({message:"ERROR: "+err.message});
//   }

module.exports = groupRouter