import { UserDoc } from "./IUser";
import { IResponse } from "./IResponse";


export interface IUserService{
    signupUser(data:UserDoc):Promise<IResponse>;
}