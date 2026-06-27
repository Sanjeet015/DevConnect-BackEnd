const mongoose = require('mongoose');
const validator = require("validator");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const SECRET_KEY = process.env.SECRET_KEY;

const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || process.env.SECRET_KEY;

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
  },
  age:{
    type:Number,
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
  },
  refreshToken:{
    type:String
  }
},{
  timestamps:true,
});


userSchema.methods.getAccessToken = async function(){
  const user = this;
  return await jwt.sign({_id:user._id},SECRET_KEY,{
    expiresIn:"15m"
  });
}

userSchema.methods.getRefreshToken = async function(){
  const user = this;
  const rToken = await jwt.sign({_id:user._id}, REFRESH_TOKEN_SECRET,{
    expiresIn:"7d"
  });
  user.refreshToken = rToken;
  await user.save();
  return rToken;
}

userSchema.methods.validatePassword = async function(password){
  const user = this;
  const isValidPassword = await bcrypt.compare(password,user.password);

  return isValidPassword;
}

module.exports = mongoose.model("User",userSchema);