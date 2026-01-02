
import React, { useState, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { geminiService } from './services/geminiService';
import { AppStatus, SavedBook } from './types';

const STORAGE_KEY = 'crowd_quest_library';

const App: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [scenery, setScenery] = useState('');
  const [pageCount, setPageCount] = useState(3);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [resultImages, setResultImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loadingStep, setLoadingStep] = useState(0);
  const [pagesCompleted, setPagesCompleted] = useState(0);
  const [library, setLibrary] = useState<SavedBook[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  
  // Hint State
  const [isLocating, setIsLocating] = useState(false);
  const [hintBox, setHintBox] = useState<[number, number, number, number] | null>(null);

  const loadingMessages = [
    "Sketching characters...",
    "Drafting the scenery...",
    "Hiding you deep in the crowd...",
    "Adding funny little details...",
    "Applying the cartoon filter..."
  ];

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setLibrary(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse library", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  }, [library]);

  useEffect(() => {
    let interval: any;
    if (status === AppStatus.GENERATING) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % loadingMessages.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [status]);

  // Reset hint when page changes
  useEffect(() => {
    setHintBox(null);
  }, [currentPage]);

  const handleGenerate = async () => {
    if (!selectedImage) {
      setError("Please upload an image first!");
      return;
    }
    if (!scenery.trim()) {
      setError("Please describe a scenery!");
      return;
    }

    setStatus(AppStatus.GENERATING);
    setError(null);
    setResultImages([]);
    setPagesCompleted(0);
    setCurrentPage(0);
    setHintBox(null);

    const generatedPages: string[] = [];
    
    try {
      for (let i = 0; i < pageCount; i++) {
        const variationPrompt = `${scenery} - unique variation #${i + 1} with different character placements and sub-themes.`;
        const generatedUrl = await geminiService.generateWaldoImage(selectedImage, variationPrompt);
        generatedPages.push(generatedUrl);
        setPagesCompleted(i + 1);
        setResultImages([...generatedPages]);
      }
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      setError(err.message || "Failed to generate. Please try again.");
      setStatus(AppStatus.ERROR);
    }
  };

  const saveToLibrary = () => {
    if (resultImages.length === 0) return;
    
    const newBook: SavedBook = {
      id: Date.now().toString(),
      title: scenery,
      images: resultImages,
      targetImage: selectedImage,
      createdAt: Date.now()
    };

    setLibrary(prev => [newBook, ...prev]);
    alert("Adventure saved to your library!");
  };

  const handleLocateMe = async () => {
    if (!selectedImage || !resultImages[currentPage]) return;
    
    setIsLocating(true);
    setHintBox(null);
    
    try {
      const box = await geminiService.locateTarget(selectedImage, resultImages[currentPage]);
      if (box) {
        setHintBox(box);
      } else {
        alert("Couldn't spot you! You're a master of disguise. Try looking harder!");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLocating(false);
    }
  };

  const deleteBook = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Delete this quest from your library?")) {
      setLibrary(prev => prev.filter(b => b.id !== id));
    }
  };

  const loadBook = (book: SavedBook) => {
    setSelectedImage(book.targetImage);
    setScenery(book.title);
    setResultImages(book.images);
    setPageCount(book.images.length);
    setCurrentPage(0);
    setStatus(AppStatus.SUCCESS);
    setShowLibrary(false);
    setHintBox(null);
  };

  const handleReset = () => {
    setStatus(AppStatus.IDLE);
    setResultImages([]);
    setScenery('');
    setPagesCompleted(0);
    setCurrentPage(0);
    setSelectedImage(null);
    setHintBox(null);
  };

  const downloadAll = () => {
    resultImages.forEach((url, idx) => {
      const link = document.createElement('a');
      link.href = url;
      link.download = `crowdquest-${scenery.replace(/\s+/g, '-')}-page-${idx + 1}.png`;
      link.click();
    });
  };

  const progressPercentage = Math.round((pagesCompleted / pageCount) * 100);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-['Fredoka']">
      {/* Header */}
      <header className="bg-white shadow-sm py-4 px-6 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl border-2 border-white shadow-md">
            Q
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 leading-none">
              Crowd<span className="text-indigo-600">Quest</span>
            </h1>
            <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mt-1">use ai to create a custom book!</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowLibrary(!showLibrary)}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${showLibrary ? 'bg-indigo-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <i className="fas fa-layer-group"></i> 
            Vault {library.length > 0 && <span className="bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">{library.length}</span>}
          </button>
          {status === AppStatus.SUCCESS && (
            <div className="flex space-x-2">
               <button onClick={saveToLibrary} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors">
                 <i className="fas fa-save"></i> Save Quest
               </button>
               <button onClick={downloadAll} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors hidden md:flex">
                 <i className="fas fa-download"></i> Download
               </button>
               <button onClick={handleReset} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-300 transition-colors">
                 Reset
               </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row p-6 gap-8 max-w-[1600px] mx-auto w-full relative">
        
        {/* Library Sidebar Overlay */}
        {showLibrary && (
          <div className="absolute inset-0 z-40 p-6 pointer-events-none">
            <div className="bg-white/95 backdrop-blur shadow-2xl rounded-2xl w-full md:w-96 h-full max-h-[80vh] border border-slate-200 flex flex-col pointer-events-auto animate-in slide-in-from-left duration-300">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-700">Quest Vault</h3>
                <button onClick={() => setShowLibrary(false)} className="text-slate-400 hover:text-slate-600">
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {library.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center">
                    <i className="fas fa-folder-open text-4xl mb-4 opacity-20"></i>
                    <p>Your vault is empty.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {library.map(book => (
                      <div 
                        key={book.id} 
                        onClick={() => loadBook(book)}
                        className="group relative flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all"
                      >
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                          <img src={book.images[0]} alt="Quest Thumbnail" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-700 truncate text-sm">{book.title}</h4>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">
                            {book.images.length} Challenges • {new Date(book.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button 
                          onClick={(e) => deleteBook(book.id, e)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-opacity"
                        >
                          <i className="fas fa-trash-alt text-xs"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Controls Sidebar */}
        <div className="w-full md:w-96 flex flex-col space-y-6 shrink-0">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
            <section className="mb-8">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-700">
                <i className="fas fa-id-badge text-indigo-500"></i>
                1. Identify Subject
              </h2>
              <ImageUploader 
                onImageSelect={(img) => {
                  setSelectedImage(img);
                  setError(null);
                }} 
                selectedImage={selectedImage} 
              />
            </section>
            
            <section className="mb-8">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-700">
                <i className="fas fa-compass text-orange-500"></i>
                2. Select Destination
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Adventure Theme</label>
                  <textarea
                    value={scenery}
                    onChange={(e) => setScenery(e.target.value)}
                    placeholder="e.g. Cyberpunk Tokyo, underwater palace, prehistoric jungle..."
                    className="w-full h-24 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none text-sm bg-slate-50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Complexity (Pages): {pageCount}</label>
                  <input 
                    type="range" min="1" max="5" step="1" 
                    value={pageCount} 
                    onChange={(e) => setPageCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1">
                    <span>1 LEVEL</span>
                    <span>5 LEVELS</span>
                  </div>
                </div>
              </div>
            </section>

            <button
              onClick={handleGenerate}
              disabled={status === AppStatus.GENERATING}
              className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center space-x-2 ${
                status === AppStatus.GENERATING 
                  ? 'bg-slate-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
              }`}
            >
              {status === AppStatus.GENERATING ? (
                <>
                  <i className="fas fa-circle-notch fa-spin"></i>
                  <span>Rendering Page {pagesCompleted + 1}...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-rocket"></i>
                  <span>Launch Quest</span>
                </>
              )}
            </button>

            {error && (
              <p className="mt-4 text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-100 text-center animate-shake">
                {error}
              </p>
            )}
          </div>
          
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-3">
            <i className="fas fa-sparkles text-indigo-400 mt-1"></i>
            <p className="text-xs text-indigo-700 leading-relaxed">
              <b>Quest Log:</b> CrowdQuest analyzes your features to hide you naturally among the cartoon denizens of your chosen world.
            </p>
          </div>
        </div>

        {/* Result Area / Book Viewer */}
        <div className="flex-1 flex flex-col min-h-[500px]">
          <div className="flex-1 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden relative flex flex-col">
            
            {status === AppStatus.IDLE && (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-40 h-40 bg-slate-50 rounded-full flex items-center justify-center mb-8 border-2 border-dashed border-slate-200">
                  <i className="fas fa-globe-americas text-6xl text-slate-300"></i>
                </div>
                <h3 className="text-2xl font-bold text-slate-700 mb-2">Begin Your CrowdQuest</h3>
                <p className="text-indigo-600 font-bold mb-4 uppercase tracking-widest text-sm">use ai to create a custom book!</p>
                <p className="max-w-md text-slate-500">Configure your adventure on the left. We'll generate a custom hide-and-seek world where you are the target!</p>
                {library.length > 0 && (
                  <button 
                    onClick={() => setShowLibrary(true)}
                    className="mt-6 text-indigo-600 font-bold hover:underline"
                  >
                    Enter the Vault
                  </button>
                )}
              </div>
            )}

            {status === AppStatus.GENERATING && (
              <div className="flex-1 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm z-10 p-12 text-center">
                <div className="w-full max-w-md">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-bold text-indigo-600 uppercase tracking-widest">{loadingMessages[loadingStep]}</span>
                    <span className="text-xs font-bold text-slate-400">{progressPercentage}%</span>
                  </div>
                  <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div 
                      className="h-full bg-indigo-600 transition-all duration-500 ease-out"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                  <p className="mt-8 text-slate-500">
                    <span className="block text-2xl font-bold text-slate-800 mb-2">Mapping Reality...</span>
                    Generating Level {pagesCompleted + 1} of {pageCount}
                  </p>
                </div>
              </div>
            )}

            {(status === AppStatus.SUCCESS || resultImages.length > 0) && (
              <div className="flex-1 flex flex-col bg-slate-50 relative">
                {/* Book Navigation Header */}
                <div className="bg-white border-b border-slate-100 p-4 flex justify-between items-center z-20">
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="bg-slate-800 text-white text-[10px] px-2 py-1 rounded font-bold uppercase shrink-0">Level {currentPage + 1} of {resultImages.length}</span>
                    <h4 className="text-sm font-bold text-slate-600 truncate">{scenery}</h4>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleLocateMe}
                      disabled={isLocating}
                      className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${hintBox ? 'bg-indigo-100 text-indigo-600 border border-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      {isLocating ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-eye"></i>}
                      {hintBox ? 'Found!' : 'Scan Crowd'}
                    </button>
                    <div className="w-px h-8 bg-slate-100 mx-1"></div>
                    <button 
                      disabled={currentPage === 0}
                      onClick={() => setCurrentPage(p => p - 1)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${currentPage === 0 ? 'text-slate-200 cursor-not-allowed' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      <i className="fas fa-chevron-left"></i>
                    </button>
                    <button 
                      disabled={currentPage === resultImages.length - 1}
                      onClick={() => setCurrentPage(p => p + 1)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${currentPage === resultImages.length - 1 ? 'text-slate-200 cursor-not-allowed' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                </div>

                {/* Main Viewport */}
                <div className="flex-1 relative overflow-hidden group">
                  {resultImages[currentPage] ? (
                    <div className="absolute inset-0 p-4 md:p-8 flex items-center justify-center">
                      <div className="relative w-full h-full max-w-5xl bg-white shadow-2xl rounded-lg overflow-hidden border-8 border-white ring-1 ring-slate-200">
                        <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/paper.png')]"></div>
                        
                        <img 
                          key={currentPage}
                          src={resultImages[currentPage]} 
                          className="w-full h-full object-contain"
                          alt={`Quest Level ${currentPage + 1}`}
                        />

                        {/* Hint Overlay */}
                        {hintBox && (
                          <div 
                            className="absolute pointer-events-none animate-ping-once"
                            style={{
                              top: `${hintBox[0] / 10}%`,
                              left: `${hintBox[1] / 10}%`,
                              width: `${(hintBox[3] - hintBox[1]) / 10}%`,
                              height: `${(hintBox[2] - hintBox[0]) / 10}%`,
                              border: '4px solid #6366f1',
                              borderRadius: '50%',
                              boxShadow: '0 0 0 9999px rgba(0,0,0,0.3)',
                              zIndex: 50,
                              transition: 'all 0.5s ease-out'
                            }}
                          >
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-lg">
                              TARGET ACQUIRED
                            </div>
                          </div>
                        )}
                        
                        {hintBox && (
                          <div 
                            className="absolute pointer-events-none"
                            style={{
                              top: `${hintBox[0] / 10}%`,
                              left: `${hintBox[1] / 10}%`,
                              width: `${(hintBox[3] - hintBox[1]) / 10}%`,
                              height: `${(hintBox[2] - hintBox[0]) / 10}%`,
                              border: '4px solid #6366f1',
                              borderRadius: '50%',
                              zIndex: 51,
                              transition: 'all 0.5s ease-out'
                            }}
                          >
                            <div className="absolute inset-0 animate-pulse border-4 border-indigo-400 rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="animate-pulse flex flex-col items-center">
                        <i className="fas fa-spinner fa-spin text-3xl text-slate-300 mb-4"></i>
                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Assembling Level...</span>
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-start pl-6 hidden md:flex"
                  >
                    <i className="fas fa-arrow-left text-white drop-shadow-lg text-2xl"></i>
                  </button>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(resultImages.length - 1, p + 1))}
                    className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end pr-6 hidden md:flex"
                  >
                    <i className="fas fa-arrow-right text-white drop-shadow-lg text-2xl"></i>
                  </button>
                </div>

                {/* Thumbnail Strip */}
                <div className="bg-white border-t border-slate-100 p-3 flex justify-center gap-2 overflow-x-auto z-20">
                  {resultImages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(idx)}
                      className={`w-10 h-10 rounded-md border-2 transition-all flex items-center justify-center font-bold text-xs shrink-0 ${currentPage === idx ? 'border-indigo-600 bg-indigo-50 text-indigo-600 scale-110 shadow-md' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                  {status === AppStatus.GENERATING && (
                    <div className="w-10 h-10 rounded-md border-2 border-dashed border-slate-200 flex items-center justify-center shrink-0">
                      <i className="fas fa-circle-notch fa-spin text-slate-300"></i>
                    </div>
                  )}
                </div>
              </div>
            )}

            {status === AppStatus.ERROR && (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6 text-red-500">
                  <i className="fas fa-exclamation-triangle text-4xl"></i>
                </div>
                <h3 className="text-xl font-bold text-slate-700 mb-2">Quest Interrupted</h3>
                <p className="text-slate-500 mb-6">{error || "The reality forge encountered an error. Please recalibrate and try again."}</p>
                <button 
                  onClick={() => setStatus(AppStatus.IDLE)}
                  className="bg-slate-800 text-white px-8 py-3 rounded-xl font-bold"
                >
                  Restart Quest
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="py-6 px-4 text-center text-slate-400 text-[10px] uppercase tracking-widest">
        Powered by AI Engine • CrowdQuest v1.0
      </footer>

      <style>{`
        @keyframes ping-once {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .animate-ping-once {
          animation: ping-once 1.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;
