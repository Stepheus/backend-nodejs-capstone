const DEBUG = true;

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const logger = require('./logger');
const expressPino = require('express-pino-logger')({ logger });

const {query, validationResult, matchedData} = require("express-validator");

//Sentiment analyzer
const natural = require("natural");

const { ValidationError } = require('../secondChance-backend/routes/errors/custom_errors');
const app = express();

// Task 2: initialize the express server
const port = process.env.PORT || 3000;


app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(expressPino);

// Define the sentiment analysis route
// Task 3: create the POST /sentiment analysis

validateQuery = [
    query("sentence").trim().notEmpty().withMessage("Empty sentiment")
    .isString().withMessage("Sentiment must be a string")
    .not().matches(/[<>"'\/]/)
    .withMessage('Special characters like <, > &, ", \ and / are not allowed')
    .isLength({max: 500}).withMessage("Body must not be longer than 500 charaters")
];

app.post('/sentiment', validateQuery, async (req, res) => {

    // Initialize the sentiment analyzer with the Natural's PorterStemmer and "English" language
    const Analyzer = natural.SentimentAnalyzer;
    const stemmer = natural.PorterStemmer;
    const analyzer = new Analyzer("English", stemmer, "afinn");

    // Perform sentiment analysis
    try {

        const errors = validationResult(req);
        if(!errors.isEmpty()){
            if(DEBUG){
                let errorMapped = errors.mapped();
                console.log("Error in the sentiment analysis request");
                console.table(errorMapped, ["msg"]);
            };

        const firstError = errors.array()[0];
        DEBUG && console.log({firstError});
        const errorValidation = new ValidationError (firstError.msg);
        throw errorValidation;
        };

        
       
        const {sentence} = matchedData(req, {location: ["query"]});

        console.log({sentence});

        let feels = "neutral";
        const analysisResult = analyzer.getSentiment(sentence.split(' '));

        if(analysisResult > 0.1){
            feels = "positive";
        }else if (analysisResult < 0){
            feels = "negative";
        }

        // // Logging the result
        logger.info(`Sentiment analysis result: ${analysisResult}`);

        res.status(200).json({sentimentScore: analysisResult, sentiment: feels});
    } catch (e) {
        logger.error(`Error performing sentiment analysis: ${e}`);
        res.status(e.statusCode || 500).json({error: e.message})
    }
});

app.listen(port, () => {
    logger.info(`Server running on port ${port}`);
});
