import { UserDoc } from "../interfaces/IUser";
import {Users} from "../models/userModel";
import { BaseRepository } from "./baseRepository";

class UserRepository extends BaseRepository<UserDoc>{

    constructor() {
        super(Users)
    }
 
    
}

export default UserRepository  