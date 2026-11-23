import jwt from "jsonwebtoken";

const verifyInstructorToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No Token Provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decodedData = jwt.verify(token, process.env.JWT_SECRET);
    req.instructor = decodedData; // instructor info attach
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid Token !", error: error.message });
  }
};

export default verifyInstructorToken;
