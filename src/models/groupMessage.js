const mongoose = require("mongoose");

const GroupMessageSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxLength: 2000,
    },
  },
  {
    timestamps: true,
  }
);

GroupMessageSchema.index({ groupId: 1, createdAt: -1 });

const GroupMessageModel = mongoose.model("GroupMessage", GroupMessageSchema);

module.exports = GroupMessageModel;
