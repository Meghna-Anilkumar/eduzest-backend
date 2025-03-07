import { AdminDoc } from "../interfaces/IAdmin";
import { Admin } from "../models/adminModel";
import { BaseRepository } from "./baseRepository";

export class AdminRepository extends BaseRepository<AdminDoc> {
    constructor() {
        super(Admin);
    }
    
    async findByEmail(email: string): Promise<AdminDoc | null> {
        return this._model.findOne({ email });
    }
}

export default AdminRepository;