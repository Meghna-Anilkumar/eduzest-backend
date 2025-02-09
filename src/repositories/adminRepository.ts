import { AdminDoc } from "../interfaces/IAdmin";
import {Admin} from "../models/adminModel";
import { BaseRepository } from "./baseRepository";

class AdminRepository extends BaseRepository<AdminDoc>{

    constructor() {
        super(Admin)
    }
 
    
}

export default AdminRepository  