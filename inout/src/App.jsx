import React, { useState } from "react";
import BarcodeScanner from "./Component/BarcodeScanner";

function App() {
  const [scanned, setScanned] = useState("");

  const handleScan = (data) => {
    setScanned(data);
    console.log("Scanned barcode:", data);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-md p-8">
        <header className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            📦 React Barcode Scanner Test
          </h2>
          <p className="mt-2 text-sm text-gray-500">Point your camera at a barcode to scan.</p>
        </header>

        <main>
          <div className="border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 p-4 flex items-center justify-center">
            <BarcodeScanner onScan={handleScan} />
          </div>

          {scanned ? (
            <div className="mt-6 flex justify-center">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-800 rounded-full text-sm font-medium border border-green-100">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Scanned: {scanned}
              </span>
            </div>
          ) : (
            <div className="mt-6 text-center text-sm text-gray-400">No barcode scanned yet</div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
