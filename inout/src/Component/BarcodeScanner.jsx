import React, { useEffect, useState } from "react";

export default function BarcodeScanner({ onScan }) {
  const [input, setInput] = useState("");

  useEffect(() => {
    let timer;

    const handleKeyDown = (e) => {
      if (timer) clearTimeout(timer);

      // Ignore special keys
      if (e.key.length === 1) {
        setInput((prev) => prev + e.key);
      } else if (e.key === "Enter") {
        if (input.length > 0) {
          onScan(input);
          setInput("");
        }
      }

      // Reset input if user stops typing for 300ms
      timer = setTimeout(() => setInput(""), 300);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [input, onScan]);

  return null; // invisible component
}
