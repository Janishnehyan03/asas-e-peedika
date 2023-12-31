const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const catchAsync = require("../utils/catchAsync");
const uuidv4 = require("uuid/v4");

exports.register = catchAsync(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({
      message: "Please enter all fields",
    });
  }
  let alreadyExists = await User.findOne({ email });
  if (alreadyExists) {
    return res.status(400).json({
      message: "Email already exists",
    });
  }

  let user = await User.create({
    username,
    email,
    password,
  });

  let token = await user.generateAuthToken();
  res.cookie("jwt", token, {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    sameSite: "none",
  });
  res.status(200).json({
    message: "User created successfully",
    user: user,
    token: token,
    success: true,
  });
});

exports.login = async (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res.status(400).json({
      message: "Please enter all fields",
    });
  }
  let user = await User.findOne({ email: req.body.email }).select("+password");
  if (!user) {
    return res.status(401).json({ message: "user not found" });
  }
  let passwordIsValid = await user.comparePassword(req.body.password);
  if (!passwordIsValid) {
    return res.status(401).json({ message: "incorrect password" });
  }
  let token = await user.generateAuthToken();
  res.cookie("jwt", token);
  res.status(200).json({
    message: "Auth successful",
    status: "success",
    user,
    token: token,
    success: true,
  });
};

// verify token
exports.verifyToken = async (req, res, next) => {
  let token;
  if (req.headers.authorization) {
    token = req.headers.authorization.split(" ")[1];
  } else {
    token = req.cookies.jwt;
  }
  if (!token) {
    return res.status(401).json({
      message: "No token provided",
    });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const user = await User.findById(decoded._id);
    req.user = user;
    next();
  } catch (error) {
    console.log(error);
    res.status(401).json({
      message: "Token is not valid",
      error: error,
    });
  }
};

// verify admin token for admin routes
exports.verifyAdminToken = async (req, res, next) => {
  try {
    const authToken = req.cookies.jwt || req.headers.authorization;
    if (!authToken) {
      return res.status(401).json({
        message: "No token provided",
      });
    }
    const token = authToken;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const user = await User.findById(decoded._id);
    if (!user.isAdmin) {
      return res.status(401).json({
        message: "You are not authorized to perform this action",
      });
    }
    req.user = user;
    next();
  } catch (error) {
    console.log(error);
    res.status(401).json({
      message: "Token is not valid",
      error: error,
    });
  }
};

exports.logout = (req, res) => {
  res.cookie("jwt", "logged out", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: "success" });
};

exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.status(200).json({
      message: "User found",
      user,
    });
  } catch (error) {
    res.status(400).json({
      error,
    });
  }
};

exports.verifyEmail = async (req, res) => {
  const { token } = req.params;
  try {
    const user = await User.findOne({ verifyToken: token });
    if (!user) {
      return res.status(400).json({
        message: "Invalid token",
      });
    }
    if (user.isVerified) {
      return res.status(400).json({
        message: "Email already verified",
      });
    }
    if (user.tokenExpriesIn > Date.now()) {
      user.isVerified = true;
      user.verifyToken = undefined;
      user.tokenExpriesIn = undefined;
      await user.save();
      res.render("email/verify", {
        username: user.username,
        email: user.email,
        message: "Email verified successfully",
      });
    } else {
      return res.status(400).json({
        message: "Token expired",
      });
    }
  } catch (error) {
    res.status(400).json({
      error,
    });
  }
};

exports.resendVerificationEmail = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        message: "Email not found",
      });
    }
    if (user.isVerified) {
      return res.status(400).json({
        message: "Email already verified",
      });
    }
    user.verifyToken = uuidv4();
    user.tokenExpriesIn = Date.now() + 10 * 60 * 1000;
    await user.save();
  } catch (error) {
    console.log(error);
    res.status(400).json({
      error,
    });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        message: "Email not found",
      });
    }
    user.resetToken = uuidv4();
    user.tokenExpriesIn = Date.now() + 10 * 60 * 1000;
    await user.save();
  } catch (error) {
    res.status(400).json({
      error,
    });
  }
};

exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  try {
    const user = await User.findOne({ resetToken: token });
    if (!user) {
      return res.status(400).json({
        message: "Invalid token",
      });
    }
    if (user.tokenExpriesIn > Date.now()) {
      user.password = password;
      user.resetToken = undefined;
      user.tokenExpriesIn = undefined;
      await user.save();
      return res.status(200).json({
        message: "Password reset successfully",
      });
    } else {
      return res.status(400).json({
        message: "Token expired",
      });
    }
  } catch (error) {
    res.status(400).json({
      error,
    });
  }
};

exports.checkLoggedIn = async (req, res) => {
  try {
    const token = req.cookies.jwt || req.headers.authorization;
    if (!token) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    } else {
      const decoded = jwt.verify(token, process.env.JWT_KEY);
      const user = await User.findById(decoded._id);
      if (!user) {
        return res.status(401).json({
          message: "Unauthorized",
          error: "User not found",
        });
      }

      res.status(200).json({
        message: "User logged in",
        user,
        success: true,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(400).json({
      error,
      success: false,
    });
  }
};
