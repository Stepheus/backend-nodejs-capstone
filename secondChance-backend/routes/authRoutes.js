let DEBUG = true;
require("dotenv").config();

const connectToDatabase = require("../models/db");
const collectionName = process.env.MONGO_USERS;

const {ValidationError, UserNotFound, UserAlreadyExistError, AppError} = require("./errors/custom_errors");

const express = require("express");
const router = express.Router();


const {body, validationResult, matchedData} = require("express-validator");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

const logger = require("../logger");

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
           logger.error('Email id already exists');
           throw new UserAlreadyExistError("An email associated with this user already exists.", {email: email});
           

        };

        

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        DEBUG && console.log("Password hashed. Adding new user to database");

        const futureUser = {firstname, lastname, email, password: hashedPassword, createdAt: new Date()};
        DEBUG && console.log({futureUser});

        const newUser = await collection.insertOne(futureUser);
        console.assert(newUser.insertedId, "Failed to add new user to the database");
        if(!newUser.insertedId){
            throw new AppError("Failed to add user to database", 500);
        };

        logger.info('User registered successfully');

         // token
        const payload = {
            user: {
                id: newUser.insertedId,
            }
        }
        const authToken = jwt.sign(payload, JWT_SECRET, {expiresIn: "1hr"});

        res.status(201).json({authToken, email});


    } catch (e) {
        next(e);
    }

});

module.exports = router;