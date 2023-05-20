const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
require('dotenv').config();
const { executeInsertQuery, connectToDatabase, mergeDuplicateConcepts } = require('./database/typeDBUtils');


const { Configuration, OpenAIApi } = require('openai');
const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);


const isDevelopment = process.env.NODE_ENV !== 'production';

if (isDevelopment) {
  const webpack = require('webpack');
  const webpackDevMiddleware = require('webpack-dev-middleware');
  const config = require('./webpack.config');
  const compiler = webpack(config);

  app.use(webpackDevMiddleware(compiler, {
    publicPath: config.output.publicPath
  }));
} else {
  app.use(express.static(path.join(__dirname, 'client/build')));
  app.use('/static/js', express.static(path.join(__dirname, 'client/build/static/js')));
}

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('*', (req, res) => {
  if (isDevelopment) {
    res.write(compiler.outputFileSystem.readFileSync(path.join(__dirname, 'client/public/index.html')));
    res.end();
  } else {
    res.sendFile(path.join(__dirname, 'client/build/index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.post('/api/generate-typeql', async (req, res) => {
  const userInput = req.body.userInput;

  try {
    const prompt2 = `
    I want to create valid typeQL for a TypeDB database with the following schema:

define

first_name sub attribute, value string;
last_name sub attribute, value string;
gender sub attribute, value string;
DOB sub attribute, value datetime;
ID sub attribute, value long;
description sub attribute, value string;

name sub attribute,
    value string,
    owns first_name,
    owns last_name;

url sub attribute,
    value string;
    
informative sub relation,
    abstract;
    
affective_strength sub attribute, value double;  #how strongly does the affector change the affected
confidence_in_affective_strength sub attribute, value double; #how confident are we in our estimate of affective strength?
    
affective sub informative, abstract,
    owns affective_strength, 
    owns confidence_in_affective_strength;
    
direction_is_positive sub attribute, value boolean; #TRUE if an increase in the cause increases the effect; FALSE if it decreases it
confidence_in_direction sub attribute, value double; #how confidence are we that we have the direction
relationship_is_linear sub attribute, value boolean; #TRUE if linear; FALSE if non-linear
time_delay_estimated sub attribute, value long; #estimated time delay in seconds (for now)
time_delay_actual sub attribute, value long; #actual

causality_correlational sub affective, abstract,
    owns direction_is_positive,
    owns confidence_in_direction,
    owns relationship_is_linear,
    owns time_delay_estimated,
    owns time_delay_actual,
    plays causality_correlational-dataset:causality_correlational_relation;
    
causality_correlational-dataset sub relation,
    relates causality_correlational_relation,
    relates dataset;

calculated_causal_strength sub attribute, value double; #the result of actual causal inference calculations

causality sub casuality_correlational,
    owns calculated_causal_strength,
    relates cause,
    relates effect;
    
correlation_strength sub attribute, value double;
correlation_strength_confidence sub attribute, value double;
    
correlational sub casuality_correlational,
    owns correlation_strength,
    owns correlation_strength_confidence,
    relates concept_1, relates concept_2;

data_source-dataset sub relation,
    relates data_source,
    relates dataset;
    
concept sub entity,
    owns name,
    owns stock_and_flow_type,
    plays causality:cause,
    plays causality:effect,
    plays concept-dataset:concept,
    plays similarity:concept_1,
    plays similarity:concept_2,
    plays evidentiary:hypothesis,
    plays evidentiary:evidence,
    plays component_whole:component,
    plays component_whole:whole,
    plays subclass_superclass:subclass,
    plays subclass_superclass:superclass,
    plays correlational:concept_1,
    plays correlational:concept_2;

dataset sub entity,
    owns name,
    owns url,
    plays concept-dataset:dataset,
    plays data_source-dataset:dataset,
    plays causality_correlational-dataset:dataset;

    
data_source sub entity,
    owns name,
    owns description,
    plays data_source-dataset:data_source;
    

-- 
The TypeQL will be used to generate, visualize, search, explore, and edit what I will here call 'causal maps'. These maps will map the cause-effect relationships between concepts. 


For example, here is an example of some code that starts creating a causal map:
insert
$money_supply isa concept, has name "Money Supply", has stock_and_flow_type "Stock";
$inflation isa concept, has name "Inflation", has stock_and_flow_type "Flow";
$interest_rates isa concept, has name "Interest Rates", has stock_and_flow_type "Flow";
$unemployment isa concept, has name "Unemployment", has stock_and_flow_type "Flow";
$economic_growth isa concept, has name "Economic Growth", has stock_and_flow_type "Flow";
$currency_value isa concept, has name "Currency Value", has stock_and_flow_type "Flow";
$consumer_spending isa concept, has name "Consumer Spending", has stock_and_flow_type "Flow";
$government_spending isa concept, has name "Government Spending", has stock_and_flow_type "Flow";

$causality1 (cause: $money_supply, effect: $inflation) isa causality;
$causality1 has direction_is_positive true;
$causality1 has affective_strength 0.85;
$causality1 has confidence_in_affective_strength: 0.80;
$causality1 has confidence_in_direction .90;

-

Here I'm defining a number of concepts and then a relation that indicates that an increase in the money supply increases inflation (direction_is_positive=true), that I'm very confident that the direction is positive (confidence_in_direction=0.90), that strength of the influence that the money supply has on inflation is fairly high (affective_strength=0.85) and that I'm reasonably confident that it's fairly high (confidence_in_affective_strength=0.80). Also note that for each of the concepts I'm defining, I'm also indicating whether or not the entity is a "Stock" or a "Flow," for the purposes of a stock-and-flow diagram.

You should write valid TypeQL to store a causal map that shows multiple causes and effects related to the terms the below. As a general rule, the maps should be large enough that at least one feedback loop appears, but the general idea is to be quite comprehensive and show at least 15-20 concepts. It is VERY important that you ONLY output the code without any other writing.

Given all this, generate TypeQL code to store the causal map based on this input: "${userInput}".
  `;
    
    //const prompt = `Generate TypeQL code to store the causal map based on this input: "${userInput}".`;
    const response = await openai.createCompletion({
  model: 'text-davinci-003',
  prompt: prompt2,
  max_tokens: 2048,
  n: 1,
  stop: null,
  temperature: 0.7,
});

    const typeQLCode = response.data.choices[0].text.trim();
    res.status(200).send({ typeQLCode: typeQLCode });
  } catch (error) {
  console.error('Error with ChatGPT:', error);
  res.status(500).send({ error: 'Error generating TypeQL code', details: error.message });
}
});

app.post('/api/execute-insert-typeql', async (req, res) => {
  const typeQLCode = req.body.typeQLCode;

  try {
    const executionResult = await executeInsertQuery(typeQLCode);
    res.status(200).send({ result: executionResult });
  } catch (error) {
    console.error('Error during TypeQL execution:', error);
    res.status(500).send({ error: 'Error executing TypeQL code', details: error.message });
  }
});

app.post('/api/merge-duplicate-concepts', async (req, res) => {
  try{
    const mergeDupeConceptsResults = await mergeDuplicateConcepts();
    res.status(200).send({ result: mergeDupeConceptsResults });
  } catch (error) {
    console.error('Error during merging duplicate concepts:', error);
    res.status(500).send({ error: 'Error during merging duplicate concepts:',       details: error.message });
    }
  } 
  );

//app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

