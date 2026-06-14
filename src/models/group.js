const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  name:{
    type:String,
    required:true,
  },
  description:{
    type:String,
    trim:true,
  },
  createdBy:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User",
    required:true,
  },
}, {
  timestamps:true,
})

const GroupModel = new mongoose.model("Group",GroupSchema);

module.exports = GroupModel;