const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  chatId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Chat",
    required:true,
  },
  senderId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User",
    required:true,
  },
  text:{
    type:String,
    required:true,
    trim:true,
    maxLength: 2000, 
  },
  seenBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: []
    }
  ]
},{
  timestamps:true
})

MessageSchema.index({
  chatId:1,
  createdAt:-1
})

const MessageModel = mongoose.model("Message",MessageSchema);
module.exports = MessageModel;