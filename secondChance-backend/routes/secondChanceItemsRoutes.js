require("dotenv").config();

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const connectToDatabase = require('../models/db');
const logger = require('../logger');
const { decode } = require('jsonwebtoken');

// Define the upload directory path
const directoryPath = 'public/images';

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, directoryPath); // Specify the upload directory
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use the original file name
  },
});

const upload = multer({storage: storage});

const collectionName = process.env.MONGO_COLLECTION;


// Get all secondChanceItems
router.get('/', async (req, res, next) => {
    logger.info('get all items, called');
    try {
        const db = await connectToDatabase();
        const collection = db.collection(collectionName);
        const secondChanceItems = await collection.find({}).toArray();
        res.json(secondChanceItems);
    } catch (e) {
        logger.console.error('oops something went wrong', e)
        next(e);
    }
});

// Add a new item
router.post('/', upload.single("file"), async(req, res,next) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection(collectionName);
 
        //create new second chance item
        let secondChanceItem = req.body;decode
        //update with an id of the last one plus one
        const lastItemQuery = await collection.find().sort({"id": -1}).limit(1);
        await lastItemQuery.forEach(item => {
            secondChanceItem.id = (parseInt(item.id) + 1).toString();            
        });

        //set current date in seconds to new item
        const date_added = Math.floor(new Date().getTime()/1000); 
        secondChanceItem.date_added = date_added; 

        //insert item in database
        secondChanceItem = await collection.insertOne(secondChanceItem); 

        console.log("Item Inserted: ", secondChanceItem);

        res.status(201).json(secondChanceItem.insertedId);
    } catch (e) {
        next(e);
    }
});

// Get a single secondChanceItem by ID
router.get('/:id', async (req, res, next) => {
    try {
       const db = await connectToDatabase();
       const collection = db.collection(collectionName);
       
       const id = req.params.id;
       const secondChanceItem = collection.findOne({"id": id });

       if(!secondChanceItem){
        res.status(404).json("Ressource not found");
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
       const result = collection.deleteOne(query);

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
