import { OTP } from "../models/otpModel";
import { OtpDoc } from "../interfaces/IOtp";
import { BaseRepository } from "./baseRepository";



class OtpRepository extends BaseRepository<OtpDoc> { 
    constructor() {
        super(OTP)
    }

    
}

export default OtpRepository