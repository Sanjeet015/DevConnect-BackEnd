const mongoose = require('mongoose');
const validator = require("validator");

const userSchema = new mongoose.Schema({
  firstName:{
    type:String,
    required:true,
    minLength:3,
    maxLength:25,
  },
  lastName:{
    type:String
  },
  emailId:{
    type:String,
    lowercase:true,
    required:true,
    unique:true,
    trim:true,
    validate(value){
      if(!validator.isEmail(value)){
        throw new Error("Invalid email address "+value);
      }
    }
  },
  password:{
    type:String,
    required:true,
    minLength:8,
    maxLength:40,
    validate(value){
      if(!validator.isStrongPassword(value)){
        throw new Error("Your password is not strong "+value);
      }
    }
  },
  age:{
    type:Number,
    min:16,
    max:90,
  },
  gender:{
    type:String,
    lowercase:true,
    validate(value){
      if(!["male","female","others"].includes(value)){
        throw new Error("Gender data is not valid");
      }
    },
  },
  photoUrl:{
    type:String,
    validate(value){
      if(!validator.isURL(value)){
        throw new Error("URL is not valid "+value);
      }
    },
    default:"https://png.pngtree.com/png-clipart/20210915/ourmid/pngtree-user-avatar-placeholder-png-image_3918418.jpg"
  },
  about:{
    type:String,
    default:"Hello, I'm using DevConnect..!"
  },
  skills:{
    type:[String],
  }
},{
  timestamps:true,
});

module.exports = mongoose.model("User",userSchema);