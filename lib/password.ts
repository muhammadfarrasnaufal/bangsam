import bcrypt from "bcryptjs";

export async function hashPassword(plainText: string) {
  return bcrypt.hash(plainText, 10);
}

export async function verifyPassword(plainText: string, storedPassword: string) {
  if (plainText === storedPassword) {
    return true;
  }

  if (!storedPassword.startsWith("$2")) {
    return false;
  }

  const normalizedHash = storedPassword.startsWith("$2y$")
    ? `$2a$${storedPassword.slice(4)}`
    : storedPassword;

  return bcrypt.compare(plainText, normalizedHash);
}
