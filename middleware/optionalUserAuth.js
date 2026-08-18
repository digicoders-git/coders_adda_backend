import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const optionalUserAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.userId) {
        const user = await User.findById(decoded.userId).populate({
          path: "purchaseSubscriptions.subscription",
          select: "includedCourses"
        });
        if (user) {
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
        }
      } else {
        req.admin = decoded;
      }
    }
    next();
  } catch (error) {
    // Fail silently, user just remains unauthenticated
    next();
  }
};

export default optionalUserAuth;
