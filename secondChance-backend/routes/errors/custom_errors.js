class AppError extends Error {
    constructor(message, statusCode= 500){
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    };
};

class FileUploadError extends AppError {
    constructor(message = "File upload error.", details = {}){
        super(message, 400);
        this.name = this.constructor.name;
        Object.assign(this, details);
        //capture stack trace, but not the constr
    };
};

class ValidationError extends AppError {
    constructor(message = "Validation error.", details = {}){
        super(message, 400);
        this.name = this.constructor.name;
        Object.assign(this, details);
    };
};

class UserAlreadyExistError extends AppError {
    constructor(message = "User already exist", details={}){
        super(message, 409);
        this.name = this.constructor.name;
        Object.assign(this, details);
    };
};

class UserNotFound extends AppError {
    constructor(message = "User not found", details={}){
        super(message, 404);
        this.name = this.constructor.name;
        Object.assign(this, details);
    }
}

class AuthFailure extends AppError {
    constructor(message = "Authorization failure", details={}){
        super(message, 401);
        this.name = this.constructor.name;
        Object.assign(this, details);
    }
}


module.exports = {FileUploadError, ValidationError, UserAlreadyExistError, UserNotFound, AuthFailure, AppError};