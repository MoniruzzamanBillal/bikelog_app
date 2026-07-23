// export const baseURL = "http://localhost:5000";
export const baseURL = "https://bikelog-server.vercel.app";

export const getBaseUrl = (): string => {
  return `${baseURL}/api`;
};
