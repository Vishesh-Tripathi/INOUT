import React from 'react';
import { Toaster } from 'react-hot-toast';
import StudentRegistration from './components/StudentRegistration';
import './App.css';

function App() {
  return (
    <div className="App">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
      <StudentRegistration />
    </div>
  );
}

export default App
