import React from 'react';

const App: React.FC = () => {
  return (
    <div style={{ padding: '20px', backgroundColor: 'lightblue', color: 'black', height: '100%', boxSizing: 'border-box' }}>
      <h1>Side Panel Test - OKPage</h1>
      <p>If you see this, the basic rendering of SidePanel App.tsx is working.</p>
      <p>Current Time: {new Date().toLocaleTimeString()}</p>
    </div>
  );
};
export default App;
