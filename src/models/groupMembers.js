const mongoose = require('mongoose');

const GroupMembersSchema = new mongoose.Schema({
  groupId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Group",
    required:true,
  },
  userId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User",
    required:true,
  },
  role:{
    type:String,
    enum:["owner","admin","member"],
    default:"member"
  }
},
{
  timestamps:true
})

GroupMembersSchema.index(
  { groupId: 1, userId: 1 },
  { unique: true }
);

const GroupMembersModel = new mongoose.model("GroupMembers",GroupMembersSchema);

module.exports = GroupMembersModel;