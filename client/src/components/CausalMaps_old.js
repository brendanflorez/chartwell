import React, { useState } from 'react';

const CausalMaps = () => {
  const [inputValue, setInputValue] = useState('');
  const [causalMaps, setCausalMaps] = useState([]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const response = await fetch('/generate-typeql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userInput: inputValue }),
    });

    if (response.ok) {
      const data = await response.json();
      const typeQLCode = data.typeQLCode;
      setCausalMaps([...causalMaps, typeQLCode]);
    } else {
      console.error('Error generating TypeQL code');
    }

    setInputValue('');
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <label htmlFor="causal-input">Enter causal map input old:</label>
        <input
          id="causal-input"
          type="text"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
        />
        <button type="submit">Generate Causal Map</button>
      </form>
      <div>
        {causalMaps.map((map, index) => (
          <div key={index}>
            <h2>Causal Map {index + 1}</h2>
            <pre>{map}</pre>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CausalMaps;
