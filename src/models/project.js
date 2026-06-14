const mongoose = require('mongoose');
const { trim } = require('validator');

const projectSchema = new mongoose.Schema({
  ownerId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User",
    required:true
  },
  gitHubUrl:{
    type:String,
    trim:true,
  },
  title:{
    type:String,
    required:true,
    trim:true,
    maxLength:100
  },
  description:{
    type:String,
    required:true,
    trim:true,
    maxLength:1000
  },
  liveUrl:{
    type:String,
    trim:true
  },
  images:{
    type:[String],
    default:[]
  },
  techStack:{
    type:[String],
    required:true,
    default:[]
  }
},{
  timestamps:true,
})

const projectModel = new mongoose.model("Project",projectSchema);

module.exports = projectModel;