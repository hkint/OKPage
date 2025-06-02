import React from 'react';

const FloatingPanel: React.FC = () => {
  return (
    <div style={{ padding: '20px', backgroundColor: 'lightgreen', color: 'black', height: '100%', border: '2px solid green', boxSizing: 'border-box' }}>
      <h1>Floating Panel Test - OKPage</h1>
      <p>If you see this, the FloatingPanel component is loading correctly within the iframe.</p>
      <p>Current Time: {new Date().toLocaleTimeString()}</p>
    </div>
  );
};
export default FloatingPanel;
