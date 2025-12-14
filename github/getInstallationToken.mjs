import axios from "axios";
import { generateGitHubAppJWT } from "./githubAppAuth.mjs";


/**
 * Get installation access token
 */
export async function getInstallationToken(installationId) {
  if (!installationId) {
    throw new Error("Missing GITHUB_INSTALLATION_ID");
  }

  const jwt = generateGitHubAppJWT();

  const response = await axios.post(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {},
    {
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json"
      }
    }
  );

  return response.data.token;
}
