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

    async createUser(userData: Partial<UserDoc>): Promise<UserDoc> {
        return this.create(userData);
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

    async updateUserProfile(email: string, profileData: Partial<UserDoc>): Promise<UserDoc | null> {
        return this.update({ email }, { $set: profileData }, { new: true });
    }

    async updateToGoogleAuth(email: string): Promise<UserDoc | null> {
        return this.update(
            { email },
            { isGoogleAuth: true, updatedAt: new Date() },
            { new: true }
        );
    }

    async submitInstructorApplication(email: string, applicationData: Partial<UserDoc>): Promise<UserDoc | null> {
        return this.update(
            { email },
            { ...applicationData, isRequested: true, isRejected: false },
            { new: true }
        );
    }

    async findUserById(id: string): Promise<UserDoc | null> {
        return this.findById(id);
    }

    async isEmailRegistered(email: string): Promise<boolean> {
        const user = await this.findByEmail(email);
        return user !== null;
    }

    async isUserVerified(email: string): Promise<boolean> {
        const user = await this.findByEmail(email);
        return user?.isVerified === true;
    }

    async isUserBlocked(email: string): Promise<boolean> {
        const user = await this.findByEmail(email);
        return user?.isBlocked === true;
    }

    async validatePassword(email: string, password: string, comparePasswordFn: Function): Promise<boolean> {
        const user = await this.findByEmail(email);
        if (!user) return false;
        return comparePasswordFn(password, user.password);
    }

    async hasRequestedInstructor(email: string): Promise<boolean> {
        const user = await this.findByEmail(email);
        return user?.isRequested === true;
    }


    async switchToInstructorRole(id: string): Promise<UserDoc | null> {
        return this.update(
            { _id: id },
            { $set: { role: 'Instructor', isRequested: false } },
            { new: true }
        );
    }

    async updateStudentProfile(email: string, updatedData: Partial<UserDoc>): Promise<UserDoc | null> {
        return this.update({ email }, { $set: updatedData }, { new: true });
    }

    async updateInstructorProfile(email: string, updatedData: Partial<UserDoc>): Promise<UserDoc | null> {
        return this.update({ email }, { $set: updatedData }, { new: true });
    }

    async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
        await this._model.updateOne(
            { _id: userId },
            { refreshToken }
        );
    }

    async getRefreshToken(userId: string): Promise<string | null> {
        const user = await this._model.findById(userId).select("refreshToken");
        return user?.refreshToken || null;
    }

    async clearRefreshToken(userId: string): Promise<void> {
        await this._model.updateOne(
            { _id: userId },
            { $unset: { refreshToken: "" } }
        );
    }
}

export default UserRepository;