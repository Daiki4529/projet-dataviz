import React from 'react';
import CyberAttackMap from './CyberAttackMap';
import { useEffect, useState } from 'react';
import cyberAttackDetectionJson from './Cyberattacks Detection.json';

function App() {
  const [data, setData] = useState([]);

  useEffect(() => {
    // Assumes 'cyberattacks.csv' is in your public folder
    setData(cyberAttackDetectionJson);
  }, []);

  return (
    <div className="App">
      <h1>Cyber Attack Flux Map</h1>
      <CyberAttackMap data={data} />
    </div>
  );
}

export default App;
