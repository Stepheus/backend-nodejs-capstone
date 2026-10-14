let DEBUG = true;
require("dotenv").config();

const connectToDatabase = require("../models/db");
const collectionName = process.env.MONGO_USERS;

const {ValidationError, UserNotFound, UserAlreadyExistError, AppError} = require("./errors/custom_errors");

const express = require("express");
const router = express.Router();


const {body, validationResult, matchedData} = require("express-validator");

const bcrypt = require("bcrypt");


const validateBody = [
    body("firstname").trim().notEmpty().withMessage("Firstname required").isString().withMessage("Name must be a valid string.")
    .isLength({min:2, max:30}).withMessage("Name must be betweeen 3 and 30 charaters long.").not().matches(/[<>&"'\/]/)
    .withMessage("Special characters like <, >, &, ', '', and / are not allowed")
    .matches(/^\p{L}+$/u).withMessage("firstname's characters must be all letters"),

    body("lastname").trim().notEmpty().withMessage("Lastname required").isString().withMessage("Name must be a valid string.")
    .isLength({min:2, max:30}).withMessage("Name must be betweeen 3 and 30 charaters long.").not().matches(/[<>&"'\/]/)
    .withMessage('Special characters like <, >, & ," and / are not allowed')
    .matches(/^\p{L}+$/u).withMessage("lastname's characters must be all letters"),

    body("email").trim().notEmpty().withMessage("Email required.")
    .isEmail().withMessage("Must be a valid email.")
    .isLength({max:55}).withMessage("Email address is too long"),
    
    body("password").trim().notEmpty().withMessage("Password required")
    .isLength({min: 8, max:20}).withMessage("Password must be between 8 and 20 characters long")
    .matches(/[a-z]/).withMessage("Password must contain at least one lower case character.")
    .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase character.")
    .matches(/[\d]/).withMessage("Password must contain at least one digit")
    .matches(/[\W]/).withMessage("Password must contain at least one special character."),
    
    

];

router.post("/register", validateBody, async (req, res, next)=>{

    try {
        const validationErrors = validationResult(req);
        if (!validationErrors.isEmpty()){
            DEBUG && console.error("Validation error: \n", validationErrors.mapped());

            const firstError = validationErrors.array()[0];
            DEBUG && console.log({firstError});
            throw new ValidationError(firstError.msg, {field: firstError.path});
        };

        const db = await connectToDatabase();
        const collection = db.collection(collectionName);

        const {firstname, lastname, email, password} = matchedData(req, {location: ["body"]});

        const itemFound = await collection.findOne({email: email});

        if(itemFound){
           throw new UserAlreadyExistError("An email associated with this user already exists.", {email: email});

        };

        //Encrypt password

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        DEBUG && console.log("Password hashed. Adding new user to database");

        const newUser = {firstname, lastname, email, password: hashedPassword};
        DEBUG && console.log({newUser});

        const newUserAdded = await collection.insertOne(newUser);
        console.assert(newUserAdded.insertedId, "Failed to add new user to the database");
        if(!newUserAdded.insertedId){
            throw new AppError("Failed to add user to database", 500);
        };

        //test
        res.status(500).json({newUserId: newUserAdded.insertedId});

        //check what assigment want us to do once registered. Maybe just send us to login page


        //create token with id an return it

        




    } catch (e) {
        next(e);
    }

});

module.exports = router;