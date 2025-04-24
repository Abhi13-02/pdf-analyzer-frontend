"use client";
import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function Home() {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastCommand, setLastCommand] = useState("");
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
        const pageNumber = parseInt(matches[1], 10) - 1;
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

  // ---------- Handle Form Submission ----------
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

  // ---------- Navigation Controls ----------
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
    <main className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-4xl"
      >
        {/* Command Display */}
        {lastCommand && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6"
          >
            <Card className="bg-white/80 backdrop-blur">
              <CardContent className="p-4">
                <p className="text-gray-800">
                  Last command: <span className="font-semibold">{lastCommand}</span>
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Main Content */}
        <Card className="bg-white/80 backdrop-blur shadow-xl">
          <CardContent className="p-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">PDF Analyzer & Reader</h1>
            
            <form onSubmit={handleUpload} className="mb-8">
              <label htmlFor="pdf" className="block text-lg font-semibold text-gray-700 mb-3">
                Upload a PDF
              </label>
              <input
                id="pdf"
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-purple-50 file:text-purple-700
                  hover:file:bg-purple-100
                  mb-4"
              />
              <Button 
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-full transition-colors"
              >
                {loading ? "Processing..." : "Process PDF"}
              </Button>
            </form>

            {/* PDF Preview */}
            {pdfPreview && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">PDF Preview</h2>
                <div className="border rounded-xl overflow-hidden">
                  <embed
                    src={pdfPreview}
                    type="application/pdf"
                    className="w-full h-96"
                  />
                </div>
              </motion.div>
            )}

            {/* Speech Controls */}
            {result && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-4 flex-wrap justify-center">
                    <Button
                      onClick={togglePlayback}
                      className={`${
                        isPlaying ? "bg-purple-600" : "bg-purple-600"
                      } hover:bg-opacity-90 text-white px-6`}
                    >
                      <span className="flex items-center">
                        {isPlaying ? (
                          <>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              className="h-5 w-5 mr-2"
                              strokeWidth="2"
                            >
                              <rect x="6" y="4" width="4" height="16" rx="1" />
                              <rect x="14" y="4" width="4" height="16" rx="1" />
                            </svg>
                            Pause
                          </>
                        ) : (
                          <>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              className="h-5 w-5 mr-2"
                              strokeWidth="2"
                            >
                              <path
                                d="M8 5.14v14.72a1 1 0 001.5.86l11-7.36a1 1 0 000-1.72l-11-7.36a1 1 0 00-1.5.86z"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            Play
                          </>
                        )}
                      </span>
                    </Button>
                    <Button onClick={handlePrevious} className="bg-gray-600 hover:bg-gray-700">
                      Previous
                    </Button>
                    <input
                      type="range"
                      min="0"
                      max={result.pages.length - 1}
                      value={currentPage}
                      onChange={handleSliderChange}
                      className="w-64"
                    />
                    <Button onClick={handleNext} className="bg-gray-600 hover:bg-gray-700">
                      Next
                    </Button>
                  </div>
                  <p className="text-gray-700 font-medium">
                    Page <span className="font-bold">{currentPage + 1}</span> of{" "}
                    <span className="font-bold">{result.pages.length}</span>
                  </p>
                </div>

                {/* Analysis Results */}
                <div className="mt-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Analysis Results</h2>
                  {result.pages.map((page, index) => (
                    <motion.div
                      key={page.page_number}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className={`mb-4 ${
                        currentPage === index ? "ring-2 ring-purple-500" : ""
                      }`}>
                        <CardContent className="p-6">
                          <h3 className="text-xl font-bold text-gray-800 mb-4">
                            Page {page.page_number}
                          </h3>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold text-gray-700 mb-2">Extracted Text:</h4>
                              <p className="text-gray-600 whitespace-pre-line">{page.page_text}</p>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-700 mb-2">OCR Text:</h4>
                              <p className="text-gray-600 whitespace-pre-line">{page.ocr_text}</p>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-700 mb-2">
                                Images & Descriptions:
                              </h4>
                              {page.images.length > 0 ? (
                                <ul className="list-disc ml-5 text-gray-600">
                                  {page.images.map((img) => (
                                    <li key={img.image_index}>
                                      Image {img.image_index}: {img.description}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-gray-600">No images found on this page.</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
} 