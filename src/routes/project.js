const express = require('express');
const mongoose = require('mongoose')
const { userAuth } = require('../middleware/auth');
const validator = require('validator');

const Project = require('../models/project');
const User = require('../models/user');
const { validateEditProjectData } = require('../utils/validation');

const projectRouter = express.Router();

projectRouter.post("/project",userAuth,async(req,res)=>{
  try {
    const loggedInUser = req.user;

    const {title,description,techStack,gitHubUrl,liveUrl} = req.body;

    if(!title || !description || !techStack){
      throw new Error("Required field missing");
    }

    if(title.length>100){
      throw new Error("Title too long")
    }
    if(description.length>1000){
      throw new Error("Description too long")
    }

    if(!Array.isArray(techStack) || techStack.length==0){
      throw new Error("Tech stack should not be a non empty array");
    }

    if(gitHubUrl && !validator.isURL(gitHubUrl)){
      throw new Error("Git Hub URL is not valid");
    }
    if(liveUrl && !validator.isURL(liveUrl)){
      throw new Error("live URL is not valid");
    }

    const project = new Project({
      ...req.body,
      ownerId:loggedInUser._id,
    })

    const data = await project.save();

    res.json({message:"Project saved successfully",data});

  } catch (err) {
    res.status(400).json({message:"ERROR: "+err.message});
  }
})

projectRouter.get("/project/my",userAuth,async(req,res)=>{
  try {
    const loggedInUser = req.user;
    const projects = await Project.find({
      ownerId:loggedInUser._id
    })

    res.json({message:"Projects fetched successfully",data:projects});

  } catch (err) {
    res.status(400).json({message:"ERROR: "+err.message});
  }
})

projectRouter.get("/project/user/:userId",userAuth,async(req,res)=>{
  try {
    const userId = req.params.userId;

    if(!mongoose.Types.ObjectId.isValid(userId)){
      throw new Error("Id is not valid");
    }

    const isUserPresent = await User.findById(userId);
    if(!isUserPresent){
      throw new Error("Invalid user");
    }

    const projects = await Project.find({
      ownerId:userId
    })

    res.json({message:"Projects fetched successfully",data:projects});
  } catch (err) {
    res.status(400).json({message:"ERROR: "+err.message});
  }
})

projectRouter.patch("/project/:projectId",userAuth,async(req,res)=>{
  try {
    const loggedInUser = req.user;
    
    if(!validateEditProjectData(req)){
      throw new Error("Invalid edit request");
    }

    const projectId = req.params.projectId;

    if(!mongoose.Types.ObjectId.isValid(projectId)){
      throw new Error("Project Id is not valid");
    }

    const project = await Project.findById(projectId);
    if(!project){
      throw new Error("Project does not exist");
    }

    if (project.ownerId.toString() !== loggedInUser._id.toString()) {
      throw new Error("You are not authorized to edit this project");
    }

    Object.keys(req.body).forEach((key)=>{
      project[key] = req.body[key]
    });

    const data = await project.save();

    res.json({message:"Project updated successfully",data});


  } catch (err) {
    res.status(400).json({message:"ERROR: "+err.message});
  }
})

projectRouter.delete("/project/:projectId",userAuth,async(req,res)=>{
  try {
    const loggedInUser = req.user;
    const projectId = req.params.projectId;

    if(!mongoose.Types.ObjectId.isValid(projectId)){
      throw new Error("Invalid project id");
    }

    const project = await Project.findById(projectId);

    if(!project){
      throw new Error("Project does not exist");
    }

    if(project.ownerId.toString()!==loggedInUser._id.toString()){
      throw new Error("You are not authorized to delete this project");
    }

    await Project.deleteOne({
      _id:projectId
    })

    res.json({message:"Project deleted Successfully"});
  } catch (err) {
    res.status(400).json({message:"ERROR: "+err.message});
  }
})

module.exports = projectRouter;