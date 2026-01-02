
import React, { useState, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader.tsx';
import { geminiService } from './services/geminiService.ts';
import { AppStatus, SavedBook, QuestPage } from './types.ts';

const STORAGE_KEY = 'crowd_quest_library';

const App: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [scenery, setScenery] = useState('');
  const [pageCount, setPageCount] = useState(3);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [pages, setPages] = useState<QuestPage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loadingStep, setLoadingStep] = useState(0);
  const [pagesCompleted, setPagesCompleted] = useState(0);
  const [library, setLibrary] = useState<SavedBook[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [foundItems, setFoundItems] = useState<Record<string, boolean>>({});
  const [isSharing, setIsSharing] = useState(false);
  
  // Hint State
  const [isLocating, setIsLocating] = useState(false);
  const [hintBox, setHintBox] = useState<[number, number, number, number] | null>(null);

  const loadingMessages = [
    "Sketching characters...",
    "Drafting the scenery...",
    "Hiding you deep in the crowd...",
    "Adding themed easter eggs...",
    "Finalizing the cartoon universe..."
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

  // Reset hints and found items when changing pages
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
    setPages([]);
    setPagesCompleted(0);
    setCurrentPage(0);
    setHintBox(null);
    setFoundItems({});

    const generatedPages: QuestPage[] = [];
    
    try {
      for (let i = 0; i < pageCount; i++) {
        const variationPrompt = `${scenery} - scene variation #${i + 1}. Include specific themed characters like ${scenery.includes('space') ? 'aliens and robot dogs' : 'mythical creatures'}.`;
        const result = await geminiService.generateWaldoImage(selectedImage, variationPrompt);
        generatedPages.push(result);
        setPagesCompleted(i + 1);
        setPages([...generatedPages]);
      }
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      setError(err.message || "Failed to generate. Please try again.");
      setStatus(AppStatus.ERROR);
    }
  };

  const saveToLibrary = () => {
    if (pages.length === 0) return;
    
    const newBook: SavedBook = {
      id: Date.now().toString(),
      title: scenery,
      pages: pages,
      targetImage: selectedImage,
      createdAt: Date.now()
    };

    setLibrary(prev => [newBook, ...prev]);
    alert("Adventure saved to your library!");
  };

  const handleLocateMe = async () => {
    if (!selectedImage || !pages[currentPage]) return;
    
    setIsLocating(true);
    setHintBox(null);
    
    try {
      const box = await geminiService.locateTarget(selectedImage, pages[currentPage].imageUrl);
      if (box) {
        setHintBox(box);
      } else {
        alert("Target is too well hidden! Keep searching!");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLocating(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'CrowdQuest Adventure',
      text: `I just created a custom search-and-find adventure set in "${scenery}"! Try to find me in the crowd at CrowdQuest.`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        setIsSharing(true);
        setTimeout(() => setIsSharing(false), 2000);
      }
    } catch (err) {
      console.error('Error sharing:', err);
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
    setPages(book.pages);
    setPageCount(book.pages.length);
    setCurrentPage(0);
    setStatus(AppStatus.SUCCESS);
    setShowLibrary(false);
    setHintBox(null);
    setFoundItems({});
  };

  const handleReset = () => {
    setStatus(AppStatus.IDLE);
    setPages([]);
    setScenery('');
    setPagesCompleted(0);
    setCurrentPage(0);
    setSelectedImage(null);
    setHintBox(null);
    setFoundItems({});
  };

  const toggleItemFound = (item: string) => {
    setFoundItems(prev => ({ ...prev, [item]: !prev[item] }));
  };

  const progressPercentage = Math.round((pagesCompleted / pageCount) * 100);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-['Fredoka'] selection:bg-indigo-100">
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
        
        <div className="flex items-center gap-2 md:gap-3">
          <button 
            onClick={() => setShowLibrary(!showLibrary)}
            className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${showLibrary ? 'bg-indigo-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <i className="fas fa-layer-group"></i> 
            <span className="hidden sm:inline">Vault</span> {library.length > 0 && <span className="bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{library.length}</span>}
          </button>
          {status === AppStatus.SUCCESS && (
            <div className="flex space-x-1 md:space-x-2">
               <button onClick={handleShare} className="bg-indigo-100 text-indigo-600 px-3 py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 hover:bg-indigo-200">
                 <i className="fas fa-share-alt"></i> <span className="hidden lg:inline">Share</span>
               </button>
               <button onClick={saveToLibrary} className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 hover:bg-emerald-700">
                 <i className="fas fa-save"></i> <span className="hidden lg:inline">Save</span>
               </button>
               <button onClick={handleReset} className="bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs md:text-sm font-bold hover:bg-slate-300">
                 Reset
               </button>
            </div>
          )}
        </div>
      </header>

      {/* Share Toast */}
      {isSharing && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl z-[100] animate-bounce">
          Link copied to clipboard!
        </div>
      )}

      <main className="flex-1 flex flex-col md:flex-row p-4 md:p-6 gap-6 max-w-[1600px] mx-auto w-full relative">
        
        {/* Library Sidebar Overlay */}
        {showLibrary && (
          <div className="absolute inset-0 z-40 p-6 pointer-events-none">
            <div className="bg-white/95 backdrop-blur shadow-2xl rounded-2xl w-full md:w-96 h-full max-h-[80vh] border border-slate-200 flex flex-col pointer-events-auto animate-in slide-in-from-left duration-300">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 uppercase tracking-widest text-xs">Quest Vault</h3>
                <button onClick={() => setShowLibrary(false)} className="text-slate-400 hover:text-slate-600">
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {library.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center">
                    <i className="fas fa-book-open text-4xl mb-4 opacity-20"></i>
                    <p className="text-sm font-medium">Your library is empty.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {library.map(book => (
                      <div 
                        key={book.id} 
                        onClick={() => loadBook(book)}
                        className="group relative flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all"
                      >
                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                          <img src={book.pages[0].imageUrl} alt="Quest" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-700 truncate text-xs">{book.title}</h4>
                          <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-1">
                            {book.pages.length} Pages • {new Date(book.createdAt).toLocaleDateString()}
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
        {status !== AppStatus.SUCCESS && status !== AppStatus.GENERATING && (
          <div className="w-full md:w-96 flex flex-col space-y-6 shrink-0">
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
              <section className="mb-6">
                <h2 className="text-sm font-bold mb-4 flex items-center gap-2 text-slate-600 uppercase tracking-widest">
                  <i className="fas fa-user-ninja text-indigo-500"></i>
                  1. The Target
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
                <h2 className="text-sm font-bold mb-4 flex items-center gap-2 text-slate-600 uppercase tracking-widest">
                  <i className="fas fa-map text-orange-500"></i>
                  2. The World
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Adventure Theme</label>
                    <textarea
                      value={scenery}
                      onChange={(e) => setScenery(e.target.value)}
                      placeholder="e.g. Victorian London, Martian Outpost, Jurassic Jungle..."
                      className="w-full h-20 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none text-sm bg-slate-50 transition-all placeholder:text-slate-300"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Book Length</label>
                      <span className="text-xs font-bold text-indigo-600">{pageCount} Pages</span>
                    </div>
                    <input 
                      type="range" min="1" max="5" step="1" 
                      value={pageCount} 
                      onChange={(e) => setPageCount(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                </div>
              </section>

              <button
                onClick={handleGenerate}
                disabled={status === AppStatus.GENERATING}
                className="w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
              >
                <i className="fas fa-magic"></i>
                <span>Forge Adventure</span>
              </button>

              {error && (
                <p className="mt-4 text-red-500 text-xs font-bold bg-red-50 p-3 rounded-lg border border-red-100 text-center animate-shake">
                  {error}
                </p>
              )}
            </div>
            
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
              <i className="fas fa-lightbulb text-amber-500 mt-1"></i>
              <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                <b>Pro Tip:</b> Specific themes work best! Instead of "park", try "A crowded futuristic dog park with robot puppies".
              </p>
            </div>
          </div>
        )}

        {/* Quest View Area */}
        <div className="flex-1 flex flex-col min-h-[500px]">
          <div className="flex-1 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden relative flex flex-col">
            
            {status === AppStatus.IDLE && (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-50/50 to-white">
                <div className="w-32 h-32 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-8 border border-slate-100 rotate-3 transform hover:rotate-0 transition-transform duration-500">
                  <i className="fas fa-wand-sparkles text-5xl text-indigo-500"></i>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Create Your Legend</h3>
                <p className="text-indigo-600 font-bold mb-6 uppercase tracking-widest text-xs">AI-Powered Search & Find Books</p>
                <div className="max-w-md bg-slate-50/80 p-6 rounded-2xl border border-slate-100">
                  <ul className="text-left text-xs text-slate-500 space-y-3">
                    <li className="flex gap-3"><i className="fas fa-check-circle text-emerald-500"></i> Upload a photo of yourself or a friend</li>
                    <li className="flex gap-3"><i className="fas fa-check-circle text-emerald-500"></i> Describe any world you can imagine</li>
                    <li className="flex gap-3"><i className="fas fa-check-circle text-emerald-500"></i> We'll hide you in a custom illustrated crowd!</li>
                  </ul>
                </div>
              </div>
            )}

            {status === AppStatus.GENERATING && (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white">
                <div className="w-full max-sm:px-4">
                  <div className="relative w-24 h-24 mx-auto mb-8">
                    <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-50"></div>
                    <div className="relative w-full h-full bg-white rounded-full flex items-center justify-center border-4 border-indigo-500 shadow-lg">
                      <i className="fas fa-paint-brush text-3xl text-indigo-500 animate-bounce"></i>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest animate-pulse">{loadingMessages[loadingStep]}</span>
                    <span className="text-[10px] font-bold text-slate-400">{progressPercentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 transition-all duration-700 ease-in-out"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                  <p className="mt-8 text-slate-400 font-medium text-xs">
                    Generating Page {pagesCompleted + 1} of {pageCount}
                  </p>
                </div>
              </div>
            )}

            {(status === AppStatus.SUCCESS || pages.length > 0) && (
              <div className="flex-1 flex flex-col bg-slate-50 relative lg:flex-row overflow-hidden">
                
                {/* Left Side: The Image */}
                <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-200">
                   {/* Top Info Bar */}
                   <div className="bg-white/80 backdrop-blur border-b border-slate-200/50 p-3 flex justify-between items-center z-20 absolute top-0 left-0 right-0">
                    <div className="flex items-center gap-3">
                      <span className="bg-slate-800 text-white text-[9px] px-2 py-1 rounded font-bold uppercase">Page {currentPage + 1}</span>
                      <h4 className="text-xs font-bold text-slate-600 truncate max-w-[150px]">{scenery}</h4>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        disabled={currentPage === 0}
                        onClick={() => setCurrentPage(p => p - 1)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center bg-white text-slate-600 border border-slate-200 disabled:opacity-30 active:scale-90"
                      >
                        <i className="fas fa-chevron-left text-xs"></i>
                      </button>
                      <button 
                        disabled={currentPage === pages.length - 1}
                        onClick={() => setCurrentPage(p => p + 1)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center bg-white text-slate-600 border border-slate-200 disabled:opacity-30 active:scale-90"
                      >
                        <i className="fas fa-chevron-right text-xs"></i>
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 relative flex items-center justify-center p-4 md:p-10 pt-16">
                    <div className="relative w-full h-full max-w-5xl bg-white shadow-2xl rounded-xl overflow-hidden border-[12px] border-white ring-1 ring-slate-200/50">
                      <img 
                        key={currentPage}
                        src={pages[currentPage]?.imageUrl} 
                        className="w-full h-full object-contain"
                        alt={`Quest Page ${currentPage + 1}`}
                      />

                      {/* Found Hint Box */}
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
                            boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
                            zIndex: 50,
                            transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                          }}
                        >
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[9px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap shadow-xl">
                            <i className="fas fa-bullseye mr-2"></i> TARGET SPOTTED
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mobile Found Toggle (Floating) */}
                  <div className="lg:hidden absolute bottom-4 right-4 flex flex-col gap-2 z-30">
                     <button 
                        onClick={handleLocateMe}
                        disabled={isLocating}
                        className="w-12 h-12 bg-indigo-600 text-white rounded-full shadow-xl flex items-center justify-center active:scale-90 transition-all disabled:bg-slate-400"
                     >
                       {isLocating ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-eye"></i>}
                     </button>
                  </div>
                </div>

                {/* Right Side: Quest Items Panel */}
                <div className="w-full lg:w-72 bg-white border-l border-slate-100 flex flex-col z-30 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">
                  <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <i className="fas fa-tasks text-indigo-500"></i>
                      Quest List
                    </h3>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {/* The Main Hero (Always first) */}
                    <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 relative group overflow-hidden">
                       <div className="flex items-start gap-3 relative z-10">
                          <div className="w-10 h-10 rounded-lg bg-indigo-200 overflow-hidden shrink-0 border border-indigo-300">
                             <img src={selectedImage || ''} className="w-full h-full object-cover grayscale-[50%]" />
                          </div>
                          <div className="flex-1">
                            <h5 className="text-[10px] font-bold text-indigo-900 leading-tight">THE HERO</h5>
                            <p className="text-[9px] text-indigo-600 mt-0.5">Find the cartoon version of yourself!</p>
                          </div>
                          <button 
                            onClick={handleLocateMe}
                            disabled={isLocating}
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${hintBox ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-500 hover:bg-indigo-200'}`}
                          >
                            <i className={`fas ${isLocating ? 'fa-spinner fa-spin' : hintBox ? 'fa-check' : 'fa-search'} text-[10px]`}></i>
                          </button>
                       </div>
                    </div>

                    <div className="py-2 border-b border-slate-50">
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Themed Challenges</p>
                    </div>

                    {pages[currentPage]?.questItems.map((item, i) => (
                      <div 
                        key={`${currentPage}-${i}`}
                        onClick={() => toggleItemFound(item)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${foundItems[item] ? 'bg-emerald-50 border-emerald-100 opacity-60' : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-sm'}`}
                      >
                         <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${foundItems[item] ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 text-slate-300'}`}>
                            <i className={`fas ${foundItems[item] ? 'fa-check' : 'fa-circle'} text-[8px]`}></i>
                         </div>
                         <span className={`text-[11px] font-medium leading-tight ${foundItems[item] ? 'text-emerald-700 line-through' : 'text-slate-600'}`}>
                           {item}
                         </span>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-100">
                     <div className="flex justify-between items-center mb-2">
                       <span className="text-[9px] font-bold text-slate-400 uppercase">Progress</span>
                       <span className="text-[9px] font-bold text-indigo-600">
                        {Object.values(foundItems).filter(Boolean).length} / {pages[currentPage]?.questItems.length} FOUND
                       </span>
                     </div>
                     <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                       <div 
                        className="h-full bg-indigo-500 transition-all duration-300"
                        style={{ width: `${(Object.values(foundItems).filter(Boolean).length / (pages[currentPage]?.questItems.length || 1)) * 100}%` }}
                       ></div>
                     </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Action Footer for Success State */}
      {status === AppStatus.SUCCESS && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 z-50 animate-in fade-in slide-in-from-bottom duration-500 md:hidden">
            <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} className="text-white/70 active:text-white p-2">
              <i className="fas fa-arrow-left"></i>
            </button>
            <span className="text-xs font-bold uppercase tracking-widest">{currentPage + 1} / {pages.length}</span>
            <button onClick={() => setCurrentPage(p => Math.min(pages.length - 1, p + 1))} className="text-white/70 active:text-white p-2">
              <i className="fas fa-arrow-right"></i>
            </button>
            <div className="w-px h-6 bg-white/20"></div>
            <button onClick={handleShare} className="text-white active:text-indigo-400 p-2">
              <i className="fas fa-share-alt"></i>
            </button>
        </div>
      )}

      <footer className="py-4 px-4 text-center text-slate-300 text-[10px] uppercase tracking-widest">
        Powered by AI Engine • Built for Adventure
      </footer>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default App;
