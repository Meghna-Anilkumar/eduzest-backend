import { UserDoc } from './IUser';
import { AdminDoc } from './IAdmin';

export interface IResponse {
  success: boolean;
  message: string;
  data?: unknown;
  redirectURL?: string;
  error?: {
    message: string;
    field?: string;
    statusCode?: number;
  };
  token?: string;
  refreshToken?: string;
  userData?: UserDoc|AdminDoc|null;  
}
