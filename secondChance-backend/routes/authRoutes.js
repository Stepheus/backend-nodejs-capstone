let DEBUG = true;
require("dotenv").config();

const connectToDatabase = require("../models/db");
const collectionName = process.env.MONGO_COLLECTION;

const {ValidationError} = require("./errors/custom_errors");

const express = require("express");
const router = express.Router();

const {body, validationResult, matchedData} = require("express-validator")


const validateBody = [
    body("email").trim().notEmpty().withMessage("Email required.")
    .isEmail().withMessage("Must be a valid email.")
    .isLength({max:55}).withMessage("Email address is too long"),

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

        const {email, password} = matchedData(req, {location: ["body"]});

        const itemFound = await collection.findOne({email: email});

        if(!itemFound){
            res.status(200).json({item: itemFound})

        };

    } catch (e) {
        next(e);
    }

});

module.exports = router;