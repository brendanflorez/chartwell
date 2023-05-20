import React, { useState } from 'react';
import axios from 'axios';
//import { mergeDuplicateConcepts } from '../../../database/typeDBUtils';

const CausalMaps = () => {
  const [inputValue, setInputValue] = useState('');
  const [causalMaps, setCausalMaps] = useState([]);
  console.log('CausalMaps component rendered');

  const formatResponse = (responseText) => {
    return responseText.replace(/\n/g, '<br/>').replace(/\\/g, '');
  };
  
  
  const handleSubmit = async (event) => {
    event.preventDefault();
    console.log('handleSubmit called');

    try {
      //const response = await axios.post('/api/generate-causal-map', { input: inputValue });
      const response = await axios.post('/generate-typeql', { userInput: inputValue });
      console.log('API response:', response);

      if (response.data && response.data.typeQLCode) {
        const rawTypeQLCode = response.data.typeQLCode;
        const formattedTypeQLCode = formatResponse(response.data.typeQLCode);
        setCausalMaps([...causalMaps, formattedTypeQLCode]);
      
        // Call the executeTypeQL function to insert the data into the TypeDB database
        //const executionResult = await executeInsertTypeQL(rawTypeQLCode);
        const executionResult = awa
        console.log('TypeDB execution result:', executionResult);

        // Automatically call the mergeDuplicateConcepts function to de-duplicate the results
        //const mergeDupeConceptsResults = await mergeDuplicateConcepts();
        //console.log('mergeDuplicateConsepts() Run');
        
      } else {
        console.error('Unexpected API response:', response);
        }

    } catch (error) {
      console.error('Error during API call:', error);
    }

    setInputValue('');
  };

  const executeInsertTypeQL = async (typeQLCode) => {
  try {
    const response = await axios.post('/execute-insert-typeql', { typeQLCode });
    console.log('TypeQL execution response:', response);
    return response.data;
  } catch (error) {
    console.error('Error during TypeQL execution:', error);
    throw error;
  }
};


  return (
  <div>
    <form onSubmit={handleSubmit}>
      <label htmlFor="causal-input">Please enter causal map input:</label>
      <input
        id="causal-input"
        type="text"
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
      />
      <button type="submit" onClick={() => console.log('Button clicked')}>Generate Causal Map</button>
    </form>
    <div>
      {causalMaps.map((map, index) => (
        <div key={index}>
          <h2>Causal Map {index + 1}</h2>
          
          <p dangerouslySetInnerHTML={{ __html: map }}></p>
        </div>
      ))}
    </div>
  </div>
);
};

export default CausalMaps;
