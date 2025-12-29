import React, { useState } from 'react';
import { Screen } from './types';
import HomeScreen from './screens/HomeScreen';
import DashboardScreen from './screens/DashboardScreen';
import CreateEventScreen from './screens/CreateEventScreen';
import GalleryScreen from './screens/GalleryScreen';
import ProfileScreen from './screens/ProfileScreen';
import LoginScreen from './screens/LoginScreen';
import { AuthProvider, useAuth } from './context/AuthContext';

const AppContent: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [targetDate, setTargetDate] = useState<string | null>(null);
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-white"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div></div>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen onNavigate={(s) => setCurrentScreen(s)} initialSelectedDate={targetDate} />;
      case 'dashboard':
        return <DashboardScreen />;
      case 'gallery':
        return <GalleryScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <HomeScreen onNavigate={(s) => setCurrentScreen(s)} initialSelectedDate={targetDate} />;
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white shadow-2xl relative overflow-x-hidden flex flex-col">
      {/* Dynamic Content */}
      <div className="flex-1">
        {renderScreen()}
      </div>

      {/* Persistent Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto glass-nav pb-8 pt-3 px-6 z-50">
        <div className="flex items-center justify-between relative">
          <button
            onClick={() => setCurrentScreen('home')}
            className={`flex flex-col items-center gap-1 p-2 transition-all ${currentScreen === 'home' ? 'text-black' : 'text-text-muted'}`}
          >
            <span className={`material-symbols-outlined text-[26px] ${currentScreen === 'home' ? 'fill-current' : ''}`}>home</span>
            <span className="text-[10px] font-bold">Home</span>
          </button>

          <button
            onClick={() => setCurrentScreen('dashboard')}
            className={`flex flex-col items-center gap-1 p-2 transition-all ${currentScreen === 'dashboard' ? 'text-black' : 'text-text-muted'}`}
          >
            <span className={`material-symbols-outlined text-[26px] ${currentScreen === 'dashboard' ? 'fill-current' : ''}`}>calendar_today</span>
            <span className="text-[10px] font-bold">Events</span>
          </button>

          <div className="w-12"></div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="absolute left-1/2 -translate-x-1/2 -top-10 size-14 bg-black rounded-full flex items-center justify-center text-white shadow-float hover:scale-105 active:scale-95 transition-all group"
          >
            <span className="material-symbols-outlined text-[30px] group-hover:rotate-90 transition-transform duration-300">add</span>
          </button>

          <button
            onClick={() => setCurrentScreen('gallery')}
            className={`flex flex-col items-center gap-1 p-2 transition-all ${currentScreen === 'gallery' ? 'text-black' : 'text-text-muted'}`}
          >
            <span className={`material-symbols-outlined text-[26px] ${currentScreen === 'gallery' ? 'fill-current' : ''}`}>photo_library</span>
            <span className="text-[10px] font-bold">Gallery</span>
          </button>

          <button
            onClick={() => setCurrentScreen('profile')}
            className={`flex flex-col items-center gap-1 p-2 transition-all ${currentScreen === 'profile' ? 'text-black' : 'text-text-muted'}`}
          >
            <span className={`material-symbols-outlined text-[26px] ${currentScreen === 'profile' ? 'fill-current' : ''}`}>person</span>
            <span className="text-[10px] font-bold">Profile</span>
          </button>
        </div>
      </nav>

      {/* Modals */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[60] bg-white animate-in slide-in-from-bottom duration-300">
          <CreateEventScreen
            onClose={() => setShowCreateModal(false)}
            onEventCreated={(date) => {
              setTargetDate(date);
              // Also switch to home to see the calendar
              setCurrentScreen('home');
            }}
          />
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
