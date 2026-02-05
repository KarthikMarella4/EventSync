import React from 'react';

interface WelcomeScreenProps {
    onGoToLogin: () => void;
    onGoToSignUp: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGoToLogin, onGoToSignUp }) => {
    return (
        <div className="relative flex min-h-screen w-full flex-col md:flex-row overflow-x-hidden font-display bg-white">
            {/* Hero Image Section - Top on mobile, Right side on desktop */}
            <div className="relative w-full h-[45vh] md:h-screen md:w-1/2 md:order-2 shrink-0 overflow-hidden">
                <div
                    className="w-full h-full bg-cover bg-center transition-transform duration-[10000ms] hover:scale-105"
                    style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCRPb9BsmNWrpf0AeC35bkocu8QT1G0QOV13MM4kllxx64bQg1UG_H29k0UTxYcsawoylgPNjo9SNvQKUaemrT9uLNEkBDVivGVWUfwIhWapZEs9LakY0X48BAEibAO6-cs5tSnlv1ORLVapgqFR7XsX3t4kCEA7Q2E8H6OWxEwzoTxqK4XNJ4DMdtZxAX7mvmgpT-SYRKlFDAM-EOxoOhn1nEqxkqnHDFpJkvdTm7ic7wwLSSGAUMtKoRocmw9R82ymxraJJWFWw4')" }}
                />
                {/* Mobile Gradient (Bottom) */}
                <div className="absolute bottom-0 left-0 w-full h-32 md:hidden bg-gradient-to-t from-white to-transparent"></div>
                {/* Desktop Gradient (Left side of the image to blend into the content) */}
                <div className="hidden md:block absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white to-transparent"></div>
            </div>
            {/* Content Section - Bottom on mobile, Left side on desktop */}
            <div className="relative z-10 flex-1 flex flex-col items-start justify-center py-10 md:py-20 px-6 md:px-16 lg:px-24 bg-white w-full md:order-1">
                <div className="flex flex-col items-start w-full max-w-lg">
                    {/* Brand Identity */}
                    <div className="mb-6 md:mb-10 flex items-center justify-start gap-3">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30">
                            <span className="material-symbols-outlined text-[24px] md:text-[28px]">event</span>
                        </div>
                        <span className="text-2xl md:text-3xl font-bold tracking-tight text-text-main">EventSync</span>
                    </div>
                    {/* Headline */}
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-text-main mb-6 md:mb-8 leading-[1.1] text-left">
                        Events that match <br />
                        <span className="text-primary">your lifestyle.</span>
                    </h1>
                    {/* Subtext */}
                    <p className="text-lg md:text-xl font-medium text-gray-500 max-w-md leading-relaxed mb-10 md:mb-12 text-left">
                        Plan your events, never miss a reminder, store your tickets, and stay on top of daily tasks.
                    </p>
                    {/* Actions */}
                    <div className="flex flex-col gap-4 w-full max-w-md">
                        <button
                            onClick={onGoToSignUp}
                            className="group w-full h-20 bg-[#130d1b] text-white rounded-3xl flex items-center justify-between px-8 text-xl font-bold shadow-2xl shadow-black/10 hover:shadow-primary/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
                        >
                            <span>Sign Up</span>
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                <span className="material-symbols-outlined text-[22px]">arrow_forward</span>
                            </div>
                        </button>
                        <button
                            onClick={onGoToLogin}
                            className="w-full h-20 bg-transparent border-2 border-gray-200 text-[#130d1b] rounded-3xl flex items-center justify-center text-xl font-bold hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all duration-200"
                        >
                            Log In
                        </button>
                    </div>
                    {/* Footer Links */}
                    <div className="mt-12 md:mt-16">
                        <p className="text-sm text-gray-400 font-medium">
                            By joining, you agree to our
                            <a href="#" className="mx-1 text-text-main underline decoration-gray-200 hover:decoration-primary transition-all">Terms</a>
                            and
                            <a href="#" className="mx-1 text-text-main underline decoration-gray-200 hover:decoration-primary transition-all">Privacy</a>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;