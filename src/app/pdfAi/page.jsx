"use client";
import { useState, useRef, useEffect } from "react";

export default function Home() {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastCommand, setLastCommand] = useState(""); // For displaying last command
  const utteranceRef = useRef(null);
  const fileInputRef = useRef(null);

  // ---------- Voice Recognition Setup (runs once) ----------
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.log("Voice commands not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const lastResult = event.results[event.results.length - 1];
      if (lastResult.isFinal) {
        const command = lastResult[0].transcript.trim().toLowerCase();
        console.log("Voice command:", command);
        setLastCommand(command);
        handleVoiceCommand(command);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
    };

    // Restart recognition when it ends to ensure continuous listening.
    recognition.onend = () => {
      recognition.start();
    };

    recognition.start();

    return () => {
      recognition.stop();
    };
  }, []);

  // ---------- Space Bar Listener ----------
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === " ") {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ---------- Voice Command Handler ----------
  const handleVoiceCommand = (command) => {
    if (command.includes("upload pdf")) {
      // Dispatch a synthetic click on the file input (if allowed)
      if (fileInputRef.current) {
        fileInputRef.current.dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true })
        );
        const utter = new SpeechSynthesisUtterance("Please select a PDF file to upload.");
        window.speechSynthesis.speak(utter);
      }
    } else if (command.includes("process pdf")) {
      if (pdfFile) {
        const utter = new SpeechSynthesisUtterance("Processing");
        window.speechSynthesis.speak(utter);
        processPDF();
      } else {
        const utter = new SpeechSynthesisUtterance("No PDF selected. Please upload a PDF first.");
        window.speechSynthesis.speak(utter);
      }
    } else if (command.includes("next page")) {
      handleNext();
    } else if (command.includes("previous page")) {
      handlePrevious();
    } else if (command.includes("read page") || command.includes("go to page")) {
      const matches = command.match(/page (\d+)/);
      if (matches && matches[1]) {
        const pageNumber = parseInt(matches[1], 10) - 1; // zero-indexed
        if (result && result.pages && pageNumber >= 0 && pageNumber < result.pages.length) {
          setCurrentPage(pageNumber);
          speakPage(pageNumber);
        }
      }
    } else if (command.includes("how many pages")) {
      if (result && result.pages) {
        const utter = new SpeechSynthesisUtterance(`The PDF has ${result.pages.length} pages.`);
        window.speechSynthesis.speak(utter);
      } else {
        const utter = new SpeechSynthesisUtterance("No PDF processed yet.");
        window.speechSynthesis.speak(utter);
      }
    } else if (command.includes("pause")) {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        togglePlayback();
        const utter = new SpeechSynthesisUtterance("Paused");
        window.speechSynthesis.speak(utter);
      }
    } else if (command.includes("play") || command.includes("resume")) {
      if (window.speechSynthesis.paused) {
        togglePlayback();
        const utter = new SpeechSynthesisUtterance("Resumed");
        window.speechSynthesis.speak(utter);
      } else if (!window.speechSynthesis.speaking) {
        speakPage(currentPage);
      }
    }
  };

  // ---------- File Selection ----------
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      console.log("File selected:", file);
      setPdfFile(file);
      setPdfPreview(URL.createObjectURL(file));
      setResult(null);
      setCurrentPage(0);
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      const utter = new SpeechSynthesisUtterance("PDF selected");
      window.speechSynthesis.speak(utter);
    }
  };

  // ---------- Text-to-Speech for a Page ----------
  const speakPage = (pageIndex) => {
    if (!result || !result.pages || !result.pages[pageIndex]) return;
    const page = result.pages[pageIndex];
    const imageDescriptions = page.images.length
      ? page.images
          .map(
            (img) =>
              `Image ${img.image_index}: ${img.description || "No description available."}`
          )
          .join(". ")
      : "No images on this page.";
    const combinedText = [page.ocr_text, page.page_text]
      .filter(Boolean)
      .join(" ");
    const speechText = `Page ${page.page_number}. Image descriptions: ${imageDescriptions}. Page content: ${combinedText}`;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.onend = () => {
      setIsPlaying(false);
    };
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  // ---------- PDF Processing ----------
  const processPDF = async () => {
    if (!pdfFile) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", pdfFile);
      // Replace with your actual backend URL
      const response = await fetch("http://127.0.0.1:8000/analyze-pdf/", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      setResult(data);
      setCurrentPage(0);
      speakPage(0);
      if (data.pages && data.pages.length) {
        const utterDone = new SpeechSynthesisUtterance(
          `Processing done. The PDF has ${data.pages.length} pages.`
        );
        window.speechSynthesis.speak(utterDone);
      } else {
        const utterDone = new SpeechSynthesisUtterance("Processing done. No pages found.");
        window.speechSynthesis.speak(utterDone);
      }
    } catch (error) {
      console.error("Error processing PDF:", error);
    } finally {
      setLoading(false);
    }
  };

  // ---------- Handle Form Submission (Manual) ----------
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!pdfFile) return;
    processPDF();
  };

  // ---------- Toggle Playback ----------
  const togglePlayback = () => {
    if (window.speechSynthesis.speaking) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsPlaying(true);
      } else {
        window.speechSynthesis.pause();
        setIsPlaying(false);
      }
    } else {
      speakPage(currentPage);
    }
  };

  // ---------- Slider & Navigation ----------
  const handleSliderChange = (e) => {
    const newPage = parseInt(e.target.value, 10);
    setCurrentPage(newPage);
    speakPage(newPage);
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      speakPage(newPage);
    }
  };

  const handleNext = () => {
    if (result && result.pages && currentPage < result.pages.length - 1) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      speakPage(newPage);
    }
  };

  // ---------- Render UI ----------
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 flex flex-col items-center py-10 px-4">
      {/* Display last recognized command */}
      {lastCommand && (
        <div className="mb-4 p-2 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-100 rounded">
          Last command: <strong>{lastCommand}</strong>
        </div>
      )}
      <h1 className="text-3xl font-bold mb-6">PDF Analyzer & Reader</h1>
      <form
        onSubmit={handleUpload}
        className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 w-full max-w-md"
      >
        <label htmlFor="pdf" className="block text-sm font-bold mb-2">
          Upload a PDF
        </label>
        <input
          id="pdf"
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          ref={fileInputRef}
          className="block w-full text-sm text-gray-500 dark:text-gray-300
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 dark:file:bg-blue-900 file:text-blue-700 dark:file:text-blue-300
            hover:file:bg-blue-100 dark:hover:file:bg-blue-800
            mb-4"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 hover:bg-blue-600 transition-colors text-white py-2 px-4 rounded"
        >
          {loading ? "Processing..." : "Process PDF"}
        </button>
      </form>

      {/* PDF Preview */}
      {pdfPreview && (
        <div className="mt-8 w-full max-w-md">
          <h2 className="text-xl font-semibold mb-2">PDF Preview</h2>
          <embed
            src={pdfPreview}
            type="application/pdf"
            className="w-full h-96 border rounded"
          />
        </div>
      )}

      {/* Speech Controls & Navigation */}
      {result && (
        <div className="mt-4 flex flex-col items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlayback}
              className="bg-purple-500 hover:bg-purple-600 transition-colors text-white py-2 px-4 rounded"
            >
              {isPlaying ? (
                <span className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 9v6m4-6v6"
                    />
                  </svg>
                  Pause
                </span>
              ) : (
                <span className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M14.752 11.168l-5.197-3.028A1 1 0 008 9v6a1 1 0 001.555.832l5.197-3.028a1 1 0 000-1.664z"
                    />
                  </svg>
                  Play
                </span>
              )}
            </button>
            <button
              onClick={handlePrevious}
              className="bg-gray-500 hover:bg-gray-600 transition-colors text-white py-2 px-4 rounded"
            >
              Previous
            </button>
            <input
              type="range"
              min="0"
              max={result.pages.length - 1}
              value={currentPage}
              onChange={handleSliderChange}
              className="w-64"
            />
            <button
              onClick={handleNext}
              className="bg-gray-500 hover:bg-gray-600 transition-colors text-white py-2 px-4 rounded"
            >
              Next
            </button>
          </div>
          <p>
            Currently reading page: <strong>{currentPage + 1}</strong> of{" "}
            {result.pages.length}
          </p>
        </div>
      )}

      {/* Page-wise Analysis Results */}
      {result && result.pages && (
        <div className="mt-8 w-full max-w-4xl">
          <h2 className="text-2xl font-semibold mb-4">Analysis Results</h2>
          {result.pages.map((page, index) => (
            <div
              key={page.page_number}
              className={`bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-6 border-2 ${
                currentPage === index ? "border-blue-500" : "border-transparent"
              }`}
            >
              <h3 className="text-xl font-bold mb-2">Page {page.page_number}</h3>
              <div className="mb-2">
                <h4 className="font-semibold">Extracted Text:</h4>
                <p className="whitespace-pre-line">{page.page_text}</p>
              </div>
              <div className="mb-2">
                <h4 className="font-semibold">OCR Text:</h4>
                <p className="whitespace-pre-line">{page.ocr_text}</p>
              </div>
              <div>
                <h4 className="font-semibold">Images &amp; Descriptions:</h4>
                {page.images.length > 0 ? (
                  <ul className="list-disc ml-5">
                    {page.images.map((img) => (
                      <li key={img.image_index}>
                        Image {img.image_index}: {img.description}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No images found on this page.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
