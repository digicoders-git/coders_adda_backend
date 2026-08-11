import jwt from "jsonwebtoken";

const verifyAdminToken = (req, res, next) => {
  console.log(`[Admin Access] ${req.method} ${req.originalUrl}`);
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No Token Provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    console.log("Secret used for verify:", process.env.JWT_SECRET);
    const decodedData = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded Token Data:", decodedData);

    req.admin = decodedData; // admin info attach
    next();
  } catch (error) {
    console.error("JWT Verification Error:", error.message);
    return res.status(401).json({ message: "Invalid Token !", error: error.message });
  }
};

export default verifyAdminToken;
