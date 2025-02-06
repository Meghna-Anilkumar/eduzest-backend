export class CustomError extends Error {
    public statusCode: number;
    public field?: string;

    constructor(message: string, statusCode: number, field?: string) {
        super(message);
        this.statusCode = statusCode;
        this.field = field;
        Object.setPrototypeOf(this, new.target.prototype); 
    }

    toJSON() {
        return {
            success: false,
            message: this.message,
            statusCode: this.statusCode,
            field: this.field,
        };
    }
}
