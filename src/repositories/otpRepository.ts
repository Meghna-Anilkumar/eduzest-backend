import { BaseRepository } from "./baseRepository";
import { IOtpRepository } from "../interfaces/IRepositories";
import { OtpDoc } from "../interfaces/IOtp";
import { OTP} from "../models/otpModel";

export class OtpRepository
    extends BaseRepository<OtpDoc>
    implements IOtpRepository {

    constructor() {
        super(OTP); 
    }
    async findByEmail(email: string): Promise<OtpDoc | null> {
        return this.findByQuery({ email });
    }

    async createOtp(otpData: { email: string; otp: number; expiresAt: Date }): Promise<OtpDoc> {
        return this.create(otpData);
    }

    async updateOtp(email: string, otpData: { otp: number; expiresAt: Date }): Promise<OtpDoc | null> {
        return this.update({ email }, otpData);
    }

    async deleteOtp(id: string): Promise<boolean> {
        return this.delete(id);
    }

    async deleteOtpByEmail(email: string): Promise<boolean> {
        const otpRecord = await this.findByQuery({ email });

        if (otpRecord) {
            return this.delete(otpRecord._id.toString());
        }

        return false;
    }


    async clearExpiredOtp(email: string): Promise<OtpDoc | null> {
        return this.update({ email }, { otp: null });
    }

    async isOtpValid(email: string, otp: number): Promise<boolean> {
        const otpRecord = await this.findByQuery({ email });
        if (!otpRecord) return false;

        const currentTime = new Date();
        if (currentTime > otpRecord.expiresAt) return false;

        return otpRecord.otp === otp;
    }

    async isOtpExpired(email: string): Promise<boolean> {
        const otpRecord = await this.findByQuery({ email });
        if (!otpRecord) return true;

        const currentTime = new Date();
        return currentTime > otpRecord.expiresAt;
    }
}

export default OtpRepository;