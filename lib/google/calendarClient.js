import { google } from "googleapis";

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl(stateToken) {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
    state: stateToken,
  });
}

export async function exchangeCodeForTokens(code) {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  return tokens;
}

export function getCalendarClient(tokens) {
  const auth = createOAuth2Client();
  auth.setCredentials(tokens);
  return google.calendar({ version: "v3", auth });
}

export async function refreshAccessToken(refreshToken) {
  const client = createOAuth2Client();
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  return credentials;
}

// Returns up-to-date tokens, refreshing if the access token is expired or close to expiry.
// Caller is responsible for persisting updated tokens if refreshed (returned as second value).
export async function getValidTokens(tokenRow) {
  const oneMinuteFromNow = Date.now() + 60 * 1000;
  if (tokenRow.expiry_date && tokenRow.expiry_date < oneMinuteFromNow) {
    const refreshed = await refreshAccessToken(tokenRow.refresh_token);
    return {
      tokens: {
        access_token: refreshed.access_token,
        refresh_token: tokenRow.refresh_token,
        expiry_date: refreshed.expiry_date,
        token_type: refreshed.token_type,
      },
      refreshed: true,
      newExpiry: refreshed.expiry_date,
    };
  }
  return {
    tokens: {
      access_token: tokenRow.access_token,
      refresh_token: tokenRow.refresh_token,
      expiry_date: tokenRow.expiry_date,
      token_type: tokenRow.token_type,
    },
    refreshed: false,
  };
}
