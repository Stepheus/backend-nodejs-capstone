class FileUploadError extends Error {
    constructor(message = "File upload error.", details = {}){
        super(message);
        this.name = "FileUploadError";
        this.statusCode = 400;
       
        this.isOperational = true; //Not a system crash
        Object.assign(this, details);

        //capture stack trace, but not the constr
    }
}

module.exports = FileUploadError;