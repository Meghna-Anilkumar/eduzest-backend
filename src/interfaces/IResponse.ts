export interface IResponse {
  success: boolean;
  message: string;
  data?: unknown;
  redirectURL?: string;
  error?: {
    message: string;
  };
  token?: string;
  refreshToken?: string;

}