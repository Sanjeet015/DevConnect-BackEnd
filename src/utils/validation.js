const validator = require('validator');
const validateSignup = (req)=>{
  const {firstName,lastName,emailId,password} = req.body;

  if(
  !firstName?.trim() || !lastName?.trim() || !emailId?.trim() || !password?.trim()) {
  throw new Error("All fields are required");
  }else if(!validator.isEmail(emailId)){
    throw new Error("Enter valid email address");
  }else if(!validator.isStrongPassword(password)){
    throw new Error("Please enter a strong password");
  }
}

const validateEditProfileData = (req)=>{
  const allowedEditFields = ["firstName","lastName","gender","age","about","skills","photoUrl"];

  const isEditAllowed = Object.keys(req.body).every(field=>allowedEditFields.includes(field));

  return isEditAllowed;
}

const validateEditProjectData = (req)=>{
  const ALLOWED_UPDATES = [
    "title",
    "description",
    "techStack",
    "gitHubUrl",
    "liveUrl",
    "images",
  ];

  const isEditAllowed = Object.keys(req.body).every(field=>ALLOWED_UPDATES.includes(field));
  return isEditAllowed;
}

module.exports = {
  validateSignup,
  validateEditProfileData,
  validateEditProjectData,
}