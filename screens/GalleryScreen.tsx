
import React, { useState } from 'react';
import { GALLERY_PHOTOS } from '../constants';
import { GoogleGenAI } from "@google/genai";

const GalleryScreen: React.FC = () => {
  const [isGeneratingRecap, setIsGeneratingRecap] = useState(false);
  const [recapText, setRecapText] = useState<string | null>(null);

  const generateRecap = async () => {
    setIsGeneratingRecap(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Write a short, engaging social media recap for an event called 'Summer Music Festival 2024' that happened in Austin, TX. Mention it was vibrant and full of energy.",
      });
      setRecapText(response.text || "What a night! The energy was electric.");
    } catch (error) {
      console.error("Recap generation failed", error);
    } finally {
      setIsGeneratingRecap(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between p-4 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <button className="flex size-10 items-center justify-center rounded-full hover:bg-slate-100">
          <span className="material-symbols-outlined text-text-main">arrow_back_ios_new</span>
        </button>
        <div className="flex flex-col items-center flex-1 mx-2">
          <h2 className="text-text-main text-base font-bold leading-tight tracking-tight text-center line-clamp-1">Summer Music Festival 2024</h2>
          <p className="text-xs text-text-muted font-medium">Austin, TX • July 14</p>
        </div>
        <button className="flex size-10 items-center justify-center rounded-full hover:bg-slate-100">
          <span className="material-symbols-outlined text-text-main">ios_share</span>
        </button>
      </header>

      {/* AI Recap Box */}
      {recapText && (
        <div className="m-4 p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-blue-100 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-blue-600 text-sm">auto_awesome</span>
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">AI Recap</span>
          </div>
          <p className="text-sm text-slate-700 italic leading-relaxed">"{recapText}"</p>
          <button className="mt-3 text-[10px] font-bold text-blue-600 flex items-center gap-1 hover:underline">
            <span className="material-symbols-outlined text-[14px]">content_copy</span> Copy to clipboard
          </button>
        </div>
      )}

      {/* Stats */}
      <section className="flex gap-3 px-4 py-4 w-full">
        <div className="flex flex-1 flex-col gap-1 rounded-xl bg-white p-3 border border-slate-200 items-center text-center shadow-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">photo_library</span>
            <p className="text-text-muted text-xs font-bold uppercase tracking-wider">Total</p>
          </div>
          <p className="text-text-main text-2xl font-bold leading-tight">452</p>
          <p className="text-text-muted text-[10px] font-medium">Photos uploaded</p>
        </div>
        <button 
          onClick={generateRecap}
          disabled={isGeneratingRecap}
          className="flex flex-1 flex-col gap-1 rounded-xl bg-blue-600 p-3 items-center text-center shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-white text-xl">magic_button</span>
            <p className="text-white/80 text-xs font-bold uppercase tracking-wider">Recap</p>
          </div>
          <p className="text-white text-xs font-bold mt-1">{isGeneratingRecap ? 'Magic...' : 'Generate AI Story'}</p>
        </button>
      </section>

      {/* Filter Tabs */}
      <section className="w-full overflow-x-auto no-scrollbar pb-2 px-4 sticky top-[72px] z-20 bg-white pt-2">
        <div className="flex gap-2">
          <button className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-black pl-5 pr-5 shadow-md shadow-black/20">
            <p className="text-white text-sm font-bold">All Photos</p>
          </button>
          {['Official', 'Guests', 'Favorites'].map(tab => (
            <button key={tab} className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-white border border-slate-200 px-4 hover:bg-slate-50 transition-colors">
              <p className="text-slate-700 text-sm font-semibold">{tab}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Masonry Grid */}
      <div className="flex-1 px-4 pb-12 masonry-grid mt-4">
        {GALLERY_PHOTOS.map(photo => (
          <div key={photo.id} className="masonry-item relative group overflow-hidden rounded-xl bg-slate-100">
            <img src={photo.url} className="w-full h-auto object-cover rounded-xl transition-transform duration-500 group-hover:scale-105" alt="Gallery item" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute top-2 right-2 bg-white/20 backdrop-blur-md rounded-full p-1.5 flex items-center justify-center hover:bg-white/40 cursor-pointer">
              <span className={`material-symbols-outlined text-white text-[16px] ${photo.isFavorite ? 'fill-current text-red-500' : ''}`}>
                {photo.isFavorite ? 'favorite' : 'favorite_border'}
              </span>
            </div>
            <div className="absolute bottom-3 left-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {photo.user.avatar ? (
                <img src={photo.user.avatar} className="size-6 rounded-full border border-white/30 object-cover" alt="Avatar" />
              ) : (
                <div className={`size-6 rounded-full border border-white/30 flex items-center justify-center text-[10px] text-white font-bold ${photo.user.color || 'bg-black'}`}>
                  {photo.user.initials}
                </div>
              )}
              <span className="text-white text-xs font-medium shadow-black drop-shadow-md">{photo.user.handle}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Upload */}
      <div className="fixed bottom-24 right-6 z-40">
        <button className="group flex items-center justify-center size-14 rounded-full bg-black text-white shadow-xl hover:scale-105 transition-all border border-white/10">
          <span className="material-symbols-outlined text-[28px]">add_a_photo</span>
        </button>
      </div>
    </div>
  );
};

export default GalleryScreen;
