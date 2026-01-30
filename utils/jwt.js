import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET);
};