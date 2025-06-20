import React from 'react';
import ReactDOM from 'react-dom/client'; // Use the new import for ReactDOM
import { Provider } from 'react-redux';
import store from './store/store'; // Stelle sicher, dass dieser Pfad korrekt ist
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root')); // Use ReactDOM.createRoot
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);

reportWebVitals();
