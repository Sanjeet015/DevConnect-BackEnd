const jwt = require('jsonwebtoken');
const User = require("../models/user");
const SECRET_KEY = process.env.JWT_SECRET || process.env.SECRET_KEY;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || SECRET_KEY;

const isProd = process.env.NODE_ENV === "production";
const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "None" : "Lax",
};

const userAuth = async (req, res, next) => {
  try {
    const cookies = req.cookies || {};
    let token = cookies.token;
    const refreshToken = cookies.refreshToken;

    let userId = null;

    if (token) {
      try {
        const decodedObj = jwt.verify(token, SECRET_KEY);
        userId = decodedObj._id;
      } catch (err) {
        // Access token is expired/invalid. Try refresh token next.
      }
    }

    // If access token was invalid or missing, try the refresh token
    if (!userId && refreshToken) {
      try {
        const decodedRefresh = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
        const user = await User.findById(decodedRefresh._id);
        
        if (user && user.refreshToken === refreshToken) {
          // Refresh token is valid! Generate a new access token
          const newAccessToken = await user.getAccessToken();
          
          // Set the new access token cookie
          res.cookie("token", newAccessToken, {
            ...cookieOptions,
            maxAge: 15 * 60 * 1000 // 15 mins
          });
          
          userId = user._id;
        }
      } catch (err) {
        // Refresh token is also invalid or expired
      }
    }

    if (!userId) {
      return res.status(401).send("Please Login");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User does not exist");
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).send("ERROR: " + err.message);
  }
};


module.exports ={ 
  userAuth,

}