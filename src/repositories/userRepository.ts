import { UserDoc } from "../interfaces/IUser";
import { Users } from "../models/userModel";
import { BaseRepository } from "./baseRepository";


export class UserRepository extends BaseRepository<UserDoc> {
    constructor() {
        super(Users);
    }


    async findByEmail(email: string): Promise<UserDoc | null> {
        return this._model.findOne({ email });
    }

    async updateVerificationStatus(email: string, isVerified: boolean): Promise<UserDoc | null> {
        return this._model.findOneAndUpdate(
            { email },
            { isVerified },
            { new: true }
        );
    }

    async updatePassword(email: string, hashedPassword: string): Promise<UserDoc | null> {
        return this._model.findOneAndUpdate(
            { email },
            { password: hashedPassword },
            { new: true }
        );
    }


}

export default UserRepository;