// export const authCookieOptions = {
//   httpOnly: true,
//   secure: process.env.NODE_ENV === "production",
//   sameSite: "lax",
//   path: "/",
//   maxAge: 60 * 60 * 24 * 7,
// };

export const authCookieOptions = {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
};

export function setAuthCookie(response, token) {
  response.cookies.set("token", token, authCookieOptions);
  return response;
}

export function clearAuthCookie(response) {
  response.cookies.set("token", "", {
    ...authCookieOptions,
    maxAge: 0,
  });
  return response;
}