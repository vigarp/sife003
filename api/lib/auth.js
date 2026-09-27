import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "03sife003-portal-kelas-super-secret-key-2026";

export function generateToken(user) {
  const isAdmin = Boolean(user.isAdmin ?? (user.role === "pengurus" || user.role === "admin"));
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      nama_lengkap: user.nama_lengkap,
      role: user.role || (isAdmin ? "pengurus" : "student"),
      isAdmin,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function verifyToken(reqOrToken) {
  if (!reqOrToken) return null;

  let rawToken = reqOrToken;
  if (typeof reqOrToken === "object") {
    const authHeader = reqOrToken.headers?.authorization || reqOrToken.headers?.Authorization;
    if (!authHeader || typeof authHeader !== "string") {
      return null;
    }
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return null;
    }
    rawToken = parts[1];
  }

  if (typeof rawToken !== "string") {
    return null;
  }

  try {
    return jwt.verify(rawToken, JWT_SECRET);
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
