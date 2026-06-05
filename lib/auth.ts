export function getAdminCredentials() {
  return {
    user: process.env.ADMIN_USER || "admin",
    pass: process.env.ADMIN_PASS || "admin123",
  };
}

export function verifyAdmin(username: string, password: string) {
  const creds = getAdminCredentials();
  return username === creds.user && password === creds.pass;
}
