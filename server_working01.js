const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
require('dotenv').config();
const { executeInsertQuery, connectToDatabase } = require('./database/typeDBUtils');


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

app.use(cors());
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

app.post('/generate-typeql', async (req, res) => {
  const userInput = req.body.userInput;

  try {
    const prompt2 = `
    I want to create valid typeQL for a TypeDB database with the following schema:
    define

closeness sub attribute,
    value double;

confidence sub attribute,
    value double;

direction sub attribute,
    value string;

name sub attribute,
    value string;

url sub attribute,
    value string;

causality sub relation,
    owns confidence,
    owns direction,
    relates cause,
    relates effect;

concept-dataset sub relation,
    relates concept,
    relates dataset;

similarity sub relation,
    owns closeness,
    owns confidence,
    relates concept-1,
    relates concept-2;

concept sub entity,
    owns name,
    plays causality:cause,
    plays causality:effect,
    plays concept-dataset:concept,
    plays similarity:concept-1,
    plays similarity:concept-2;

dataset sub entity,
    owns name,
    owns url,
    plays concept-dataset:dataset;

  -- 
The TypeQL will be used to generate, visualize, search, explore, and edit what I will here call 'causal maps'. These maps will map the cause-effect relationships between concepts. For the purposes of this explanation, let us say that the convention A --> B implies that A 'causes' or 'affects' B. For example, if I were using mermaid.js syntax, an example might be "A[Interest Rates] -->|- 0.95|B[Bond Prices]" to indicate that when interest rates go up, bond prices go down. The minus sign indicates an inverse relationship, and the 0.95 indicates the confidence level in the relationship, where 0 indicates no confidence and 1.00 indicates perfect confidence.  Another example might be A[Money Supply] -->|+ 0.90| B[Inflation]. Here, the plus sign indicates that as the money supply increases, so does inflation.

You should write valid TypeQL to store a causal map that shows multiple causes and effects related to the term the below. As a general rule, the maps should be large enough that at least one feedback loop appears. In addition to the 'direction' (i.e. positive or negative) and 'confidence level' of the causual relationship.


Here is an example of updated insert syntax for relations from the documentation:
insert
$money_supply isa concept, has name "Money Supply";
$inflation isa concept, has name "Inflation";
$interest_rates isa concept, has name "Interest Rates";
$unemployment isa concept, has name "Unemployment";
$economic_growth isa concept, has name "Economic Growth";
$currency_value isa concept, has name "Currency Value";
$consumer_spending isa concept, has name "Consumer Spending";
$government_spending isa concept, has name "Government Spending";

$causality1 (cause: $money_supply, effect: $inflation) isa causality;
$causality1 has direction "+";
$causality1 has confidence 0.90;
  
Please ONLY output the code without any other writing.

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

app.post('/execute-insert-typeql', async (req, res) => {
  const typeQLCode = req.body.typeQLCode;

  try {
    const executionResult = await executeInsertQuery(typeQLCode);
    res.status(200).send({ result: executionResult });
  } catch (error) {
    console.error('Error during TypeQL execution:', error);
    res.status(500).send({ error: 'Error executing TypeQL code', details: error.message });
  }
});


