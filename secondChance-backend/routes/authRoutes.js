let DEBUG = true;
require("dotenv").config();

const connectToDatabase = require("../models/db");
const collectionName = process.env.MONGO_USERS;

const {ValidationError, UserNotFound, UserAlreadyExistError, AuthFailure, AppError} = require("./errors/custom_errors");

const express = require("express");
const router = express.Router();


const {header, body, validationResult, matchedData} = require("express-validator");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

const logger = require("../logger");

const validateRegisterBody = [
    body("firstName").trim().notEmpty().withMessage("Firstname required").isString().withMessage("Name must be a valid string.")
    .isLength({min:2, max:30}).withMessage("Name must be betweeen 3 and 30 charaters long.").not().matches(/[<>&"/]/)
    .withMessage("Special characters like <, >, &, ', '', and / are not allowed")
    .matches(/^\p{L}+$/u).withMessage("firstname's characters must be all letters"),

    body("lastName").trim().notEmpty().withMessage("Lastname required").isString().withMessage("Name must be a valid string.")
    .isLength({min:2, max:30}).withMessage("Name must be betweeen 3 and 30 charaters long.").not().matches(/[<>&"'/]/)
    .withMessage('Special characters like <, >, & ," and / are not allowed')
    .matches(/^\p{L}+$/u).withMessage("lastname's characters must be all letters"),

    body("email").trim().notEmpty().withMessage("Email required.")
    .isEmail().withMessage("Must be a valid email.")
    .isLength({max:55}).withMessage("Email address is too long")
    .not().matches(/[<>&"'/]/)
    .withMessage("Special characters like <, >, &, ', '', and / are not allowed").normalizeEmail(),
    
    body("password").trim().notEmpty().withMessage("Password required")
    .isLength({min: 8, max:20}).withMessage("Password must be between 8 and 20 characters long")
    .matches(/[a-z]/).withMessage("Password must contain at least one lower case character.")
    .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase character.")
    .matches(/[\d]/).withMessage("Password must contain at least one digit")
    .matches(/[\W]/).withMessage("Password must contain at least one special character."),
    
    

];

router.post("/register", validateRegisterBody, async (req, res, next)=>{

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

        const {firstName, lastName, email, password} = matchedData(req, {locations: ["body"]});

        const itemFound = await collection.findOne({email: email});

        if(itemFound){
           logger.error('Email id already exists');
           throw new UserAlreadyExistError("An email associated with this user already exists.", {email: email});
           

        };

        

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        DEBUG && console.log("Password hashed. Adding new user to database");

        const futureUser = {firstName, lastName, email, password: hashedPassword, createdAt: new Date()};
        DEBUG && console.log({futureUser});

        const newUser = await collection.insertOne(futureUser);
        console.assert(newUser.insertedId, "Failed to add new user to the database");
        if(!newUser.insertedId){
            throw new AppError("Failed to add user to database", 500);
        };


         // token
        const payload = {
            user: {
                id: newUser.insertedId,
            }
        }
        const authToken = jwt.sign(payload, JWT_SECRET, {expiresIn: "1hr"});

        res.status(201).json({authToken, email});

        logger.info('User registered successfully');


    } catch (e) {
        next(e);
    }

});


const validateLoginBody = [
    body("email").trim().notEmpty().withMessage("Email Required.")
    .not().matches(/[<>&"'/]/)
    .withMessage("Special characters like <, >, &, ', and / are not allowed")
    .isLength({max:55}).withMessage("Email address is too long")
    .isEmail().withMessage("Must be a valid email ")
    .normalizeEmail(),

    body("password").trim().notEmpty().withMessage("Password required.")
    .isLength({max: 20}).withMessage("Error in the field"),


]

router.post("/login", validateLoginBody, async (req, res, next)=>{
    try {
         const validationErrors = validationResult(req);
        if (!validationErrors.isEmpty()){
            DEBUG && console.error("Validation error: \n", validationErrors.mapped());
            logger.error('Validation errors in login request', validationErrors.array());
            const firstError = validationErrors.array()[0];
            DEBUG && console.log({firstError});
            throw new ValidationError(firstError.msg, {field: firstError.path});
        };

        const db = await connectToDatabase();
        const collection = db.collection(collectionName);
        
        const {email, password} = matchedData(req, {locations:["body"]});

        //check email 
        const user = await collection.findOne({email});
        if(!user){
            throw new UserNotFound("User does not exist.", {email});
        }

        //check password
        const goodPassword = await bcrypt.compare(password, user.password);
        console.log({goodPassword});
        if (!goodPassword){
            logger.error("Passports do not match");
            throw new AuthFailure("Incorrect Password", {email});
        }

        //user's info for future use
        const userName = user.firstName;

        //create token
        const payload = {
            user: {
                id: user._id.toString(),
            }
        }
        
        const authToken = jwt.sign(payload, JWT_SECRET, {expiresIn: "1hr"});

        const userEmail = email;

        res.status(201).json({authToken, userEmail, userName});

    } catch (e) {
        next(e)
    }
});

const validateUpdate = [
    header("email").notEmpty().withMessage("Email required in the header")
    .isLength({max:55}).withMessage("Email is too long. 55 characters maximum allowed.")
    .not().matches(/[<>&"'/]/)
    .withMessage("Special characters like <, >, &, ', '', and / are not allowed")
    .isEmail().withMessage("Must be a valid email.").normalizeEmail(),

    header("authorization").notEmpty().withMessage("authorization token must be included in the header")
    .isLength({max:200}).withMessage("Token header can't have more than 110 characters.")
    .custom((value)=>{
        //Must start with Bearer
        if(!value.startsWith("Bearer")){
            logger.error("Token inside put isn't properly formatted.");
            throw new AuthFailure("Auth token isn't formatted properly");
        };

        //check token
        const token = value.split(" ")[1];
        if(!token){
            logger.error("Token missing in put req header");
            throw new AuthFailure("Token missing from req header for update");
        }
        return true;
    }),

    //Only update first name 

    body("name").trim().notEmpty().withMessage("Firstname required").isString().withMessage("Name must be a valid string.")
    .isLength({min:2, max:30}).withMessage("Name must be betweeen 3 and 30 charaters long.").not().matches(/[<>&"'/]/)
    .withMessage("Special characters like <, >, &, ', '', and / are not allowed")
    .matches(/^\p{L}+$/u).withMessage("Name must contain only letters"),
];

router.put("/update", validateUpdate, async(req, res, next)=>{
    
    //test api by loging and using a token in a request header {"Authorization": "Bearer ${autoken}, "Content-Type": "application/json", "Email": email} along with body {name: newname}. 
    // Test if we receive authorization sentence, and email.
    
    try {

        const updateValidationErrors = validationResult(req);
        if (!updateValidationErrors.isEmpty()){
            logger.error("Validation error in update request",
                updateValidationErrors.array()
            );

            throw new ValidationError(updateValidationErrors.array()[0].msg);
        };

        const {email, authorization} = matchedData(req, {locations: ["headers"]});

        const {name} = matchedData(req, {locations: ["body"]});
        logger.info("Update info sent from frontend:\n", {email, authorization, name});
     
        //Database connect
        const db = await connectToDatabase();
        if(!db){
            logger.error("Failed to connect to database");
            throw new AppError("Failed to connect to database");
        }
        const collection = db.collection(collectionName);

        //check if it exist first
        const userExist = await collection.findOne({email});

        if(!userExist){
            logger.error("Email for the put request does not exist", {email});
            throw new UserNotFound("Email does not exist for put request");
        };
        
        //check token id matches id of email
        const emailId = userExist._id;

        const authToken = authorization.split(" ")[1];
        const tokenId = (jwt.verify(authToken, JWT_SECRET)).user.id;

        if (String(emailId) !== String(tokenId)){
            logger.error("Malicious resource access detected. Email does not match token", {authToken, email});
            throw new AuthFailure("Your token does not give you access to that resource.");
        }

        //Edit new name in database
        const updatedUser = await collection.findOneAndUpdate({email}, {$set: {firstName: name}}, {returnDocument: "after"});

        const payload = {
            user:{
                id: updatedUser._id.toString(),
            }
        }

        const newToken = jwt.sign(payload, JWT_SECRET, {expiresIn: "1hr"});

        res.status(200).json({newToken});


        
    } catch (e) {
        logger.error(e.message);
        next(e); 
    }
});


module.exports = router;