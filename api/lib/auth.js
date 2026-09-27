import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "03sife003-portal-kelas-super-secret-key-2026";

export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      nama_lengkap: user.nama_lengkap,
      role: user.role || "pengurus",
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function verifyToken(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (!authHeader || typeof authHeader !== "string") {
    return null;
  }
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }
  try {
    return jwt.verify(parts[1], JWT_SECRET);
  } catch {
    return null;
  }
}

export function hashPassword(plainText) {
  return bcrypt.hashSync(plainText, 10);
}

export function comparePassword(plainText, hash) {
  return bcrypt.compareSync(plainText, hash);
}
