import React, { useState } from 'react';

interface SmartPlusButtonProps {
    onCreateEvent: () => void;
    onCreateTask: () => void;
    onAddPhoto: () => void;
}

export const SmartPlusButton: React.FC<SmartPlusButtonProps> = ({ onCreateEvent, onCreateTask, onAddPhoto }) => {
    const [isOpen, setIsOpen] = useState(false);

    // Close when option selected
    const handleSelect = (cb: () => void) => {
        setIsOpen(false);
        cb();
    };

    return (
        <>
            {/* Dimmed Overlay */}
            {isOpen && (
                <div
                    onClick={() => setIsOpen(false)}
                    className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm animate-in fade-in duration-200"
                />
            )}

            {/* Button Wrapper */}
            <div className="relative -top-8 z-50 flex flex-col items-center gap-4">

                {/* Actions Menu */}
                <div className={`
           absolute bottom-full mb-4 flex flex-col items-center gap-3 transition-all duration-300 origin-bottom
           ${isOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-90 pointer-events-none'}
        `}>

                    {/* Create Task */}
                    <div className="flex items-center gap-3 w-max">
                        <span className="bg-white px-3 py-1 rounded-lg text-xs font-bold shadow-md">Create Task</span>
                        <button
                            onClick={() => handleSelect(onCreateTask)}
                            className="size-12 rounded-full bg-green-500 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                        >
                            <span className="material-symbols-outlined">check_circle</span>
                        </button>
                    </div>

                    {/* Add Photo */}
                    <div className="flex items-center gap-3 w-max">
                        <span className="bg-white px-3 py-1 rounded-lg text-xs font-bold shadow-md">Add Photo</span>
                        <button
                            onClick={() => handleSelect(onAddPhoto)}
                            className="size-12 rounded-full bg-blue-500 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                        >
                            <span className="material-symbols-outlined">add_a_photo</span>
                        </button>
                    </div>

                    {/* Create Event */}
                    <div className="flex items-center gap-3 w-max">
                        <span className="bg-white px-3 py-1 rounded-lg text-xs font-bold shadow-md">Create Event</span>
                        <button
                            onClick={() => handleSelect(onCreateEvent)}
                            className="size-12 rounded-full bg-black text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                        >
                            <span className="material-symbols-outlined">calendar_add_on</span>
                        </button>
                    </div>

                </div>

                {/* Main Floating Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`
            size-14 bg-black rounded-full flex items-center justify-center text-white shadow-float 
            transition-all duration-300 z-50
            ${isOpen ? 'rotate-45 bg-red-500' : 'hover:scale-105 active:scale-95'}
          `}
                >
                    <span className="material-symbols-outlined text-[30px]">add</span>
                </button>
            </div>
        </>
    );
};
