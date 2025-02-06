import { CustomError } from "./CustomError";
import { MxRecord, promises } from "dns";
import { Status } from "./enums"; 

class ValidationService {
    private static nameRegex = /^[a-zA-Z]{3,20}(?: [a-zA-Z]+)*$/;
    private static emailRegex =
        /^(?=.{11,100}$)([a-zA-Z\d]+([.-_]?[a-zA-Z\d]+)*)\@([a-zA-Z]{4,9})+\.com$/;
    private static mobileNumberRegex = /^\d{10}$/;

    private static errorMessage(field: string): string {
        return `${field} is required`;
    }

    private static throwRequiredError(field: string, statusCode: Status): never {
        throw new CustomError(this.errorMessage(field), statusCode, field);
    }

    private static isEmpty(value: string, field: string): void {
        if (!value || value.trim() === "") {
            this.throwRequiredError(field, Status.BAD_REQUEST);
        }
    }

    public static validateName(name: string): void {
        this.isEmpty(name, "name");
        name = name.trim();

        if (name.length < 3) {
            throw new CustomError("Name must be at least 3 characters long.", Status.BAD_REQUEST, "name");
        }

        if (!this.nameRegex.test(name)) {
            throw new CustomError("Invalid name format.", Status.BAD_REQUEST, "name");
        }
    }

    public static validateMobileNumber(mobileNumber: string): void {
        this.isEmpty(mobileNumber, "mobileNumber");
        mobileNumber = mobileNumber.trim();

        if (mobileNumber.length !== 10) {
            throw new CustomError("Mobile number should be ten digits.", Status.BAD_REQUEST, "mobileNumber");
        }

        if (!this.mobileNumberRegex.test(mobileNumber)) {
            throw new CustomError("Invalid mobile number.", Status.BAD_REQUEST, "mobileNumber");
        }
    }

    public static validateEmail(email: string): void {
        this.isEmpty(email, "email");
        email = email.trim();

        if (!this.emailRegex.test(email)) {
            throw new CustomError("Invalid email address.", Status.BAD_REQUEST, "email");
        }
    }

    public static validatePassword(password: string): void {
        this.isEmpty(password, "password");

        const regex: { [key: string]: RegExp } = {
            "upper case": /[A-Z]/,
            "lower case": /[a-z]/,
            number: /\d/,
            "special char": /[-/`~!#*$@_%+=.,^&(){}[\]|;:”<>?\\]/,
            length: /^.{6,20}$/
        };

        for (let criteria in regex) {
            if (!regex[criteria].test(password)) {
                throw new CustomError(`Password must contain at least one ${criteria}.`, Status.BAD_REQUEST, "password");
            }
        }
    }

    public static async verifyEmailDomain(email: string): Promise<void> {
        const domain = email.split("@")[1];
        if (!domain) {
            throw new CustomError("Invalid email format", Status.BAD_REQUEST, "email");
        }

        return promises
            .resolveMx(domain)
            .then((addresses: MxRecord[]) => {
                if (!addresses.length) {
                    throw new CustomError("Email domain not found", Status.BAD_REQUEST, "email");
                }
            })
            .catch((error) => {
                throw error;
            });
    }
}

export default ValidationService;
