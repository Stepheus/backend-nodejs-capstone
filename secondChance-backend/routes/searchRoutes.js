let DEBUG = true;

require("dotenv").config();

//database
const collectionName = process.env.MONGO_COLLECTION;

const express = require('express');
const router = express.Router();
const connectToDatabase = require('../models/db');
const { query, validationResult, matchedData} = require("express-validator");
const { ValidationError } = require("./errors/custom_errors");
const logger = require("../logger");

let searchQueryValidator = [
    query("name").optional().trim()
    .isLength({max:15}).withMessage("Name has to between 2 and 30 characters long.")
    .not().matches(/[<>&"'/]/)
    .withMessage('Special characters like <, >, &, ", and / are not allowed')
    ,

    query("category").trim().optional()
    .isIn(["Living Room","Kitchen","Office","Bedroom", "Bathroom", "All"])
    .withMessage("Invalid category selected."),

    query("condition").trim().optional()
    .isIn(["New","Like New","Older", "All"])
    .withMessage("Invalid condition selected."),

    query("age_years").trim().optional()
    .isInt({min: 0, max:10}).withMessage("Age has to be an integer between 0 and 300.")
    .not().matches(/[<>&"'/]/)
    .withMessage('Special characters like <, >, &, ", and / are not allowed.')
    .toInt(),
]

// Search for gifts
router.get('/', searchQueryValidator, async (req, res, next) => {  
    logger.info("Search route reached");
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()){
            if(DEBUG){
                let errorsMapped = errors.mapped();
                console.log("Error in the search field");
                console.table(errorsMapped, ["msg"])
             };

        //We return only the first error for frontend 
            const firstError = errors.array()[0];
            DEBUG && console.log({firstError});
            const errorValidation = new ValidationError(firstError.msg, {field: firstError.path});
            throw errorValidation; 

        }
       
        const db = await connectToDatabase();
        const collection = db.collection(collectionName);

        // Initialize the query object
        const {name, age_years, category, condition} = matchedData(req);
        console.log("search parameter: \n", {name, age_years, category, condition});
        const query ={};
        // Add the name filter to the query if the name parameter is not empty
        if (name) {
            query.name = { $regex: name, $options: "i" }; // Using regex for partial match, case-insensitive
        };
        if (category && category!== "All") {
            query.category = category;
        };
        if (condition && condition !== "All") {
           
            query.condition = condition;
        };
        if (age_years) {
            query.age_years = { $lte: age_years};
        };

        console.log("searching for items matching these values: \n", query);

        let gifts = await collection.find(query).toArray();
        console.log({gifts});
        res.status(200).json(gifts);
    } catch (e) {
        next(e);
    }
});

module.exports = router;
