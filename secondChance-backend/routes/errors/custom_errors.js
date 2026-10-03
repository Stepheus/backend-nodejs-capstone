class FileUploadError extends Error {
    constructor(message = "File upload error.", details = {}){
        super(message);
        this.name = "FileUploadError";
        this.statusCode = 400;
       
        this.isOperational = true; //Not a system crash
        Object.assign(this, details);

        //capture stack trace, but not the constr
    };
}

class ValidationError extends Error {
    constructor(message = "Validation error.", details = {}){
        super(message);
        this.name = "ValidationError";
        this.statusCode = 400;

        this.isOperational = true; //Not a system crash
        Object.assign(this, details);
    };
}

module.exports = {FileUploadError, ValidationError};