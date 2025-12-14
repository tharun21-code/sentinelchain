import fs from "fs";
import jwt from "jsonwebtoken";

/**
 * Generate a GitHub App JWT
 */
export function generateGitHubAppJWT() {
  const appId = process.env.GITHUB_APP_ID;
  const privateKeyPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH;

  if (!appId || !privateKeyPath) {
    throw new Error("Missing GITHUB_APP_ID or GITHUB_APP_PRIVATE_KEY_PATH");
  }

  const privateKey = fs.readFileSync(privateKeyPath, "utf8");
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iat: now - 60,
    exp: now + 9 * 60,
    iss: appId
  };

  return jwt.sign(payload, privateKey, { algorithm: "RS256" });
}
