import jwt from "jsonwebtoken";

const verifyAdminToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No Token Provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decodedData = jwt.verify(token, process.env.JWT_SECRET);

    req.admin = decodedData; // admin info attach

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid Token !" });
  }
};

export default verifyAdminToken;
