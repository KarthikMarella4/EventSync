import React from 'react';

interface WelcomeScreenProps {
    onGoToLogin: () => void;
    onGoToSignUp: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGoToLogin, onGoToSignUp }) => {

    return (
        <div className="min-h-screen w-full font-display bg-white flex flex-col overflow-x-hidden">
            {/* ===== HERO + NAV WRAPPER with gradient ===== */}
            <div
                style={{
                    background: 'linear-gradient(180deg, #c4f0f5 0%, #d8f6fa 20%, #e8fbfd 45%, #f5fefe 70%, #ffffff 100%)',
                }}
            >
                {/* ===== DESKTOP NAVBAR ===== */}
                <header className="hidden md:block w-full sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-6 lg:px-10 h-[72px] flex items-center justify-between">
                        {/* Brand Name */}
                        <span className="text-black text-xl font-extrabold tracking-tight italic">EventSync</span>

                        {/* Auth Buttons */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onGoToLogin}
                                className="h-10 px-6 text-black text-[15px] font-semibold rounded-full border border-gray-400/50 hover:bg-white/50 transition-all"
                            >
                                Log in
                            </button>
                            <button
                                onClick={onGoToSignUp}
                                className="h-10 px-6 bg-[#1a1a1a] text-white text-[15px] font-semibold rounded-full hover:bg-black transition-all"
                            >
                                Sign up
                            </button>
                        </div>
                    </div>
                </header>

                {/* ===== MOBILE HEADER ===== */}
                <header className="md:hidden w-full sticky top-0 z-50">
                    <div className="px-4 h-[68px] flex items-center justify-between">
                        {/* Brand Name */}
                        <span className="text-black text-lg font-extrabold tracking-tight italic">EventSync</span>

                        {/* Auth Buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onGoToLogin}
                                className="h-10 px-5 text-black text-[15px] font-semibold rounded-full border border-gray-400/50 bg-white hover:bg-gray-50 transition-all"
                            >
                                Log in
                            </button>
                            <button
                                onClick={onGoToSignUp}
                                className="h-10 px-5 bg-[#1a1a1a] text-white text-[15px] font-semibold rounded-full hover:bg-black transition-all"
                            >
                                Sign up
                            </button>
                        </div>
                    </div>
                </header>

                {/* ===== HERO SECTION ===== */}
                <section className="w-full flex flex-col items-center text-center px-5 pt-16 md:pt-24 pb-20 md:pb-28">


                    {/* Headline */}
                    <h1 className="text-[clamp(2.5rem,8vw,4.5rem)] font-extrabold tracking-tight text-black leading-[1.05] max-w-3xl mb-6 md:mb-8">
                        Sync your events,{' '}
                        <br className="hidden md:block" />
                        stay organized
                    </h1>

                    {/* Subtitle */}
                    <p className="text-base md:text-lg text-gray-600 font-medium max-w-xl leading-relaxed mb-10 md:mb-12 px-2">
                        EventSync helps you plan events, manage calendars, store tickets, and never miss a reminder.
                    </p>

                    {/* CTA Button */}
                    <button
                        onClick={onGoToSignUp}
                        className="w-full max-w-md md:w-auto h-14 md:h-[52px] px-10 bg-black text-white text-lg font-bold rounded-full hover:bg-gray-900 active:scale-[0.98] transition-all shadow-xl shadow-black/10"
                    >
                        Sign up now
                    </button>
                </section>
            </div>

            {/* ===== MAIN CONTENT ===== */}
            <main className="flex-1 flex flex-col">


                {/* ===== FOOTER ===== */}
                <footer className="w-full border-t border-gray-100 bg-white">
                    <div className="max-w-7xl mx-auto px-5 md:px-10 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-2.5">
                            <img src="/favicon.png" alt="EventSync" className="w-7 h-7 rounded-lg" />
                            <span className="text-lg font-extrabold tracking-tight text-black italic">EventSync</span>
                        </div>
                        <p className="text-sm text-gray-400 font-medium">
                            © 2026 EventSync. All rights reserved.
                        </p>
                        <div className="flex items-center gap-6">
                            <a href="#" onClick={(e) => e.preventDefault()} className="text-sm text-gray-500 font-medium hover:text-black transition-colors">Terms</a>
                            <a href="#" onClick={(e) => e.preventDefault()} className="text-sm text-gray-500 font-medium hover:text-black transition-colors">Privacy</a>
                            <a href="#" onClick={(e) => e.preventDefault()} className="text-sm text-gray-500 font-medium hover:text-black transition-colors">Contact</a>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
};

export default WelcomeScreen;