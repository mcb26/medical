import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Calendar from './Calendar';  // Import the Calendar component
import Home from './Home';  // If you have a homepage component

function App() {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<Home />} />  {/* Default Home page */}
          <Route path="/calendar" element={<Calendar />} />  {/* Calendar Route */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
