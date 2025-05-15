import React from 'react';
import { createRoot } from 'react-dom/client';
import SimpleApp from './SimpleApp';

// Create root element if not already created
const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

// Render the app
root.render(<SimpleApp />);