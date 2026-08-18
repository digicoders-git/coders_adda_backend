import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const userAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Token check
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Token missing"
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    const user = await User.findById(decoded.userId).populate({
      path: "purchaseSubscriptions.subscription",
      select: "includedCourses"
    });
    // console.log(user)

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not found"
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Your account is blocked by admin",
        code: "USER_BLOCKED"
      });
    }

    // Attach user to request
    const now = new Date();
    user.purchaseSubscriptions?.forEach(sub => {
      if (sub.subscription && sub.subscription.includedCourses) {
        if (!sub.endDate || new Date(sub.endDate) > now) {
          sub.subscription.includedCourses.forEach(courseId => {
            if (!user.purchaseCourses.some(id => id.toString() === courseId.toString())) {
              user.purchaseCourses.push(courseId);
            }
          });
        }
      }
    });

    req.user = user;
    req.userId = user._id;

    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or expired token",
      error: error.message
    });
  }
};

export default userAuth;
