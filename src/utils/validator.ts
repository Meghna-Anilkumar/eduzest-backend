import { CustomError } from "./CustomError";
import { MxRecord, promises } from "dns";
import { Status } from "./enums";

// Helper function to throw required errors
const errorMessage = (field: string): string => {
    return `${field} is required`;
};

const throwRequiredError = (field: string, statusCode: Status): never => {
    throw new CustomError(errorMessage(field), statusCode, field);
};

// Helper function to check if a field is empty
const isEmpty = (value: string, field: string): void => {
    if (!value || value.trim() === "") {
        throwRequiredError(field, Status.BAD_REQUEST);
    }
};

// Validate name
export const validateName = (name: string): void => {
    isEmpty(name, "name");
    name = name.trim();

    if (name.length < 3) {
        throw new CustomError("Name must be at least 3 characters long.", Status.BAD_REQUEST, "name");
    }

    const nameRegex = /^[a-zA-Z]{3,20}(?: [a-zA-Z]+)*$/;
    if (!nameRegex.test(name)) {
        throw new CustomError("Invalid name format.", Status.BAD_REQUEST, "name");
    }
};

// Validate mobile number
export const validateMobileNumber = (mobileNumber: string): void => {
    isEmpty(mobileNumber, "mobileNumber");
    mobileNumber = mobileNumber.trim();

    if (mobileNumber.length !== 10) {
        throw new CustomError("Mobile number should be ten digits.", Status.BAD_REQUEST, "mobileNumber");
    }

    const mobileNumberRegex = /^\d{10}$/;
    if (!mobileNumberRegex.test(mobileNumber)) {
        throw new CustomError("Invalid mobile number.", Status.BAD_REQUEST, "mobileNumber");
    }
};

export const validateDOB = (dob: string): void => {
    if (!dob) {
        throw new CustomError("Date of birth is required", Status.BAD_REQUEST, "dob");
    }
    const birthDate = new Date(dob);
    const today = new Date();

    if (isNaN(birthDate.getTime())) {
        throw new CustomError("Invalid date format", Status.BAD_REQUEST, "dob");
    }

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age--;
    }

    if (age < 14) {
        throw new CustomError("You must be at least 14 years old", Status.BAD_REQUEST, "dob");
    }

    if (birthDate > today) {
        throw new CustomError("Date of birth cannot be in the future", Status.BAD_REQUEST, "dob");
    }
};

// Validate email
export const validateEmail = (email: string): void => {
    isEmpty(email, "email");
    email = email.trim();

    const emailRegex =
        /^(?=.{11,100}$)([a-zA-Z\d]+([.-_]?[a-zA-Z\d]+)*)\@([a-zA-Z]{4,9})+\.com$/;
    if (!emailRegex.test(email)) {
        throw new CustomError("Invalid email address.", Status.BAD_REQUEST, "email");
    }
};

// Validate password
export const validatePassword = (password: string): void => {
    isEmpty(password, "password");

    const regex: { [key: string]: RegExp } = {
        "upper case": /[A-Z]/,
        "lower case": /[a-z]/,
        number: /\d/,
        "special char": /[-/`~!#*$@_%+=.,^&(){}[\]|;:”<>?\\]/,
        length: /^.{6,20}$/,
    };

    for (let criteria in regex) {
        if (!regex[criteria].test(password)) {
            throw new CustomError(`Password must contain at least one ${criteria}.`, Status.BAD_REQUEST, "password");
        }
    }
};

// Verify email domain
export const verifyEmailDomain = async (email: string): Promise<void> => {
    const domain = email.split("@")[1];
    if (!domain) {
        throw new CustomError("Invalid email format", Status.BAD_REQUEST, "email");
    }

    try {
        const addresses: MxRecord[] = await promises.resolveMx(domain);
        if (!addresses.length) {
            throw new CustomError("Email domain not found", Status.BAD_REQUEST, "email");
        }
    } catch (error) {
        throw error;
    }
};
