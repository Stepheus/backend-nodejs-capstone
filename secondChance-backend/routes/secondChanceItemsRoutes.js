let DEBUG =    true;

require("dotenv").config();

const express = require('express');
const router = express.Router();
const connectToDatabase = require('../models/db');

//upload tools
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { fileTypeFromBuffer } = require("file-type");
const {body, validationResult} = require("express-validator");

//Image Sanitizer
const sharp = require("sharp");



const logger = require('../logger');
const { decode } = require('jsonwebtoken');



//Error handler
const {FileUploadError, ValidationError} = require("./errors/custom_errors");

//Database
const collectionName = process.env.MONGO_COLLECTION;

// Define the upload directory path
const directoryPath = path.join(__dirname,"..", 'public/images');
if (!fs.existsSync(directoryPath)){
    fs.mkdirSync(directoryPath);
};


// Get all secondChanceItems
router.get('/', async (req, res, next) => {
    logger.info('get all items, called');
    if (DEBUG){
        console.log("Get all items route called.")
    };
    try {
        const db = await connectToDatabase();
        const collection = db.collection(collectionName);
        const secondChanceItems = await collection.find({}).toArray();
        res.json(secondChanceItems);
    } catch (e) {
        logger.console.error('oops something went wrong', e);
        if(DEBUG){
            console.error("error getting all items", e);
        };
        next(e);
    }
});

//Upload settings for new items
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 2 * 1024 * 1024,   //2MB
    },
});

const ALLOWED_TYPES = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "application/pdf": [".pdf"],
    "image/webp": [".webp"],
};


// Add a new item
router.post('/',upload.single("file"), [
    //Stop resource exhaustion and xss attacks
    body("name").trim()
    .notEmpty().withMessage("Name is required.")
    .isString().withMessage("Name must be a string.")
    .isLength({min:3, max:30}).withMessage("Name must be between 3 and 30 characters please.")
    .not().matches(/[<>&"'\/]/)
    .withMessage('Special characters like <, >, &, ", \', and / are not allowed'),

    body("category").trim().notEmpty()
    .isString().withMessage("Category must be letters and not empty.")
    .isLength({min:4, max:20}).withMessage("Invalid category selected")
    .isIn(["Living","Kitchen","Office","Bedroom","Bathroom"])
    .withMessage("Invalid category selected.")
    .not().matches(/[<>&"'\/]/)
    .withMessage('Special characters like <, >, &, ", \', and / are not allowed'),

    body("condition").trim().notEmpty()
    .isString().withMessage("Condition must be a string, and not empty.")
    .isIn(["New", "Like New", "Older"])
    .withMessage("Invalid condition selected.")
    .not().matches(/[<>&"'\/]/)
    .withMessage('Special characters like <, >, &, ", \', and / are not allowed'),

    //Need zipcodes check with isNumeric 
    body("zipcode").trim().notEmpty().withMessage("Zipcode required.")
    .isString().withMessage("Zipcode must be a string.")
    .isPostalCode("US").withMessage("Zipcode must be a valid US code."),
    
    body("age_days").isInt({min: 0, max:10000}).withMessage("Age must be a valid integer between 0 and 10000"),

    body("description").trim()
    .isLength({min: 1, max:300}).withMessage("Description cannot exceed 300 characters.")
    .isString().withMessage("Description must be a string.")
    .not().matches(/[<>&"'\/]/)
    .withMessage('Special characters like <, >, &, ", \', and / are not allowed'), //for <script> and other malicious and malevolent characters   

], async(req, res,next) => {
    const errors = validationResult(req);
    
   
    //test that fileupload error still works.
    //test validations errors
    //group them consoles 


    console.log("Inside Post file request");
    try {

        
        //FormData check
        if(!errors.isEmpty()){
        if(DEBUG){
            let errorsMapped = errors.mapped();
            console.log("Errors in the field values");
            console.table(errorsMapped, ["msg"]);
        };

        //We return only the first error for frontend 
        const firstError = errors.array()[0];
        DEBUG && console.log({firstError});
        const errorValidation = new ValidationError(firstError.msg, {field: firstError.path});
        throw errorValidation; 
        }


        //File upload check
        if (!req.file){
            throw new FileUploadError("No file uploaded", {type: "Missing file."});
        }

        //Defense 1. Right to Left Override attack
        let originalName = req.file.originalname;
        console.log("Original file name: ", originalName);
        if (originalName.includes("\u202E")){
            if(DEBUG){
                console.error("Malicious file");
            };       
            throw new FileUploadError("Malicious and vile character detected in filename", 
                {type: "Security Alert", fileName: originalName});
        };

        //Defense 2. Check extension with magic byte
        if(DEBUG){
            console.log("Getting the file true type:");
        };
        
        const trueType = await fileTypeFromBuffer(req.file.buffer);
        if(DEBUG){
                console.log({trueType});
            }; 
        if (!trueType || !ALLOWED_TYPES[trueType.mime]){
            if(DEBUG){
                console.error("True type is not accepted.");
            };
            throw new FileUploadError("Incorrect file type. Please upload a jpeg, png, or webp picture only.", 
                {type: "Unaccepted file type.", fileName: originalName});
        };

        //Defense 3. Cross check extension with mime
        const clientExtension = path.extname(originalName).toLocaleLowerCase();
        const allowedExtensionForMime = ALLOWED_TYPES[trueType.mime];
        if(!allowedExtensionForMime.includes(clientExtension)){
            if(DEBUG){
                console.error("Mime type does not match extension\n", {clientExtension, allowedExtensionForMime });
            };
            throw new FileUploadError("File Extension does not match file content",
                {type: "Cross Extension failure.",
                fileName: originalName,
                clientExtension: clientExtension,
                }
            );
        };

        //Defense 4. Sanitize and rebuild uploaded image
        const safeFileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${clientExtension}`;
        if(DEBUG){
            console.log("Sanitizing file to be saved: \n",{safeFileName});
        };
        
        const destinationPath = path.join(directoryPath, safeFileName);
        

        //Defense 5. Sanitization and rebuilding of the file before upload
        await sharp(req.file.buffer)
            .resize(500,500, {fit:"cover"})
            .timeout({seconds:5})
            .toFormat("webp")
            .webp({quality:80})
            .toFile(destinationPath);

        DEBUG && console.log(`File sanitized successfully and saved in ${destinationPath}`);
       
        const db = await connectToDatabase();
        console.assert(db, "Failed to connect to database.");
        const collection = db.collection(collectionName);
 
        const {name, category, condition, zipcode, age_days, description,} = req.body;
        secondChanceItem = {name, category, condition, zipcode, age_days, description};
        DEBUG && console.log({secondChanceItem});
        secondChanceItem.image = destinationPath;
        secondChanceItem.age_years = (age_days/365).toFixed(2);
        secondChanceItem.comments = [];
        DEBUG && console.log({secondChanceItem});


        //update with an id of the last one plus one
        const lastItemQuery = await collection.find().sort({"id": -1}).limit(1).toArray();
        DEBUG && console.log({lastItemQuery});
        DEBUG && console.assert(lastItemQuery, "Could not find the last item in the database");
      
        secondChanceItem.id = (+lastItemQuery[0].id + 1) + "";  

        
       
        // //set current date in seconds to new item
        const date_added = Math.floor(new Date().getTime()/1000); 
        secondChanceItem.date_added = date_added; 


        //insert item in database
        secondChanceItem = await collection.insertOne(secondChanceItem); 

        if(!secondChanceItem.acknowledged){
            throw new Error("Item could not be added. Please try again");
        }
         res.status(201).json({entry: `New item inserted. Id ${secondChanceItem.insertedId}`});
    } catch (e) {     
        next(e);
    }
});

// Get a single secondChanceItem by ID
router.get('/:id', async (req, res, next) => {
    try {
        logger.info("get one item called");
       const db = await connectToDatabase();
       const collection = db.collection(collectionName);
       
       const id = req.params.id;
       const secondChanceItem = await collection.findOne({"id": id });

       if(!secondChanceItem){
        res.status(404).json("Resource not found");
       }

       res.status(200).json(secondChanceItem);

    } catch (e) {
        next(e);
    }
});

// Update and existing item
router.put('/:id', async(req, res,next) => {
    try {
        const db = await connectToDatabase();
       const collection = db.collection(collectionName);
       
       const id = req.params.id;
       const secondChanceItem = collection.findOne({"id": id });

       if(!secondChanceItem){
        res.status(404).json("Ressource not found");
       }

       const {category, condition, age_days} = req.body;
       console.log("request body:\n", {category, condition, age_days});

       secondChanceItem.category = category;
       secondChanceItem.condition = condition;
       secondChanceItem.age_days = age_days;
       secondChanceItem.age_years = Number((age_days/365).toFixed(2));
       secondChanceItem.updatedAt = new Date();

       const updatedloveItem = await collection.findOneAndUpdate(
        {id},
        {$set: secondChanceItem},
        {returnDocument: "after"});

        if(updatedloveItem){
          res.status(200).json({"uploded": "success"});  
        } else {
            res.json({"uploaded": "failure"});
        };


    } catch (e) {
        next(e);
    }
});

// Delete an existing item
router.delete('/:id', async(req, res,next) => {
    try {
       const db = await connectToDatabase();
       const collection = db.collection(collectionName);
       
       const id = req.params.id;
       const query = {"id": id};

       //find and delete item
       const result = await collection.deleteOne(query);

       if(result.deletedCount === 1){
        console.log("Successfully deleted one item.");
        res.status(200).json({"deleted":"successfully"});
       }else{
        console.log("Resource not found");
        logger.error("second chance item not found for deletion.");
        res.status(404).json("Resource not found");
       };


    } catch (e) {
        next(e);
    }
});

module.exports = router;
