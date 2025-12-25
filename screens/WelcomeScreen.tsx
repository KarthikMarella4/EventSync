import React from 'react';

interface WelcomeScreenProps {
    onGoToLogin: () => void;
    onGoToSignUp: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGoToLogin, onGoToSignUp }) => {
    return (
        <div className="bg-white font-display text-text-main min-h-screen flex flex-col antialiased selection:bg-black selection:text-white relative overflow-hidden">
            {/* Hero Image Section */}
            <div className="relative w-full h-[55vh] shrink-0 overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center scale-105"
                    style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDWOaLuihEGqj0sxMHsKjtjVNkTkfpLJc_6pX6XnE9mjUAkWAup8_4DtSSvTcw9akEhcHHIHrlX0FJxL1MCSc40117OFkFvDDyaRrQqgTsjJapsbNlGkqP6ythDRjPZeEPiSH93L7dN2FjSnRpN-j16eC4RrJXt7SdiU7qI6IT_Fh70tpH2aRPutCUpoWHQYkosoLnuFnlqgxbSx-B4tYuI3FQn9msGmBvlh0PsPhbi0svVGweJXn3AiAn0pTHIJeQGlFQ7S_87UXa1')" }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent"></div>

                {/* Floating Card */}
                <div className="absolute top-[20%] right-6 bg-white/80 backdrop-blur-md p-3 pr-5 rounded-2xl shadow-float border border-white/60 flex items-center gap-3 transform rotate-[-2deg] opacity-90">
                    <div className="bg-black/5 p-2 rounded-full">
                        <span className="material-symbols-outlined text-[20px] text-black">confirmation_number</span>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Upcoming</p>
                        <p className="text-xs font-bold text-text-main">Tech Summit 2024</p>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 flex flex-col justify-end px-8 pb-12 pt-4 z-10 relative -mt-20">
                <div className="mb-auto">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm mb-8">
                        <span className="material-symbols-outlined text-[20px] text-black">event_note</span>
                        <span className="text-xs font-extrabold uppercase tracking-wide text-black">EventSync</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-black leading-[1.15] mb-4 tracking-tight">
                        Events that <br />
                        match your <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-black to-gray-500">lifestyle.</span>
                    </h1>
                    <p className="text-text-muted text-[15px] font-medium leading-relaxed max-w-xs text-opacity-90">
                        Discover the best concerts, workshops, and meetups in your area. Sync your calendar and never miss out.
                    </p>
                </div>

                <div className="flex flex-col gap-4 mt-8">
                    <button
                        onClick={onGoToSignUp}
                        className="w-full bg-black text-white font-bold text-[16px] py-4.5 rounded-2xl shadow-xl shadow-black/20 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group">
                        Sign Up
                        <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </button>
                    <button
                        onClick={onGoToLogin}
                        className="w-full bg-white text-black font-bold text-[16px] py-4.5 rounded-2xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all shadow-sm"
                    >
                        Log In
                    </button>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-[11px] text-gray-400 font-medium">
                        By continuing, you agree to our
                        <a className="text-black underline decoration-gray-300 hover:decoration-black transition-all mx-1" href="#">Terms of Service</a>
                        &
                        <a className="text-black underline decoration-gray-300 hover:decoration-black transition-all mx-1" href="#">Privacy Policy</a>.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;
