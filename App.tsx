import React, { useState } from 'react';
import { Screen } from './types';
import HomeScreen from './screens/HomeScreen';
import DashboardScreen from './screens/DashboardScreen';
import CreateEventScreen from './screens/CreateEventScreen';
import GalleryScreen from './screens/GalleryScreen';
import ProfileScreen from './screens/ProfileScreen';
import LoginScreen from './screens/LoginScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SmartPlusButton } from './components/SmartPlusButton';
import { CreateTaskModal } from './screens/CreateTaskModal';

const AppContent: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false); // Placeholder
  const [targetDate, setTargetDate] = useState<string | null>(null);
  const [eventToEdit, setEventToEdit] = useState<any>(null);
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-white"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div></div>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  const handleEditEvent = (event: any) => {
    setEventToEdit(event);
    setShowCreateModal(true);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen onNavigate={(s) => setCurrentScreen(s)} initialSelectedDate={targetDate} />;
      case 'dashboard':
        return <DashboardScreen onEditEvent={handleEditEvent} />;
      case 'gallery':
        return <GalleryScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <HomeScreen onNavigate={(s) => setCurrentScreen(s)} initialSelectedDate={targetDate} />;
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 shadow-2xl relative overflow-x-hidden flex flex-col">
      {/* Dynamic Content */}
      <div className="flex-1 w-full flex justify-center">
        <div className="w-full max-w-7xl bg-white min-h-screen shadow-xl">
          <div style={{ display: currentScreen === 'home' ? 'block' : 'none' }} className="h-full">
            <HomeScreen onNavigate={(s) => setCurrentScreen(s)} initialSelectedDate={targetDate} />
          </div>
          <div style={{ display: currentScreen === 'dashboard' ? 'block' : 'none' }} className="h-full">
            <DashboardScreen onEditEvent={handleEditEvent} />
          </div>
          <div style={{ display: currentScreen === 'gallery' ? 'block' : 'none' }} className="h-full">
            <GalleryScreen />
          </div>
          <div style={{ display: currentScreen === 'profile' ? 'block' : 'none' }} className="h-full">
            <ProfileScreen />
          </div>
        </div>
      </div>

      {/* Persistent Bottom Nav - Hidden on Desktop if we want side nav? For now keep bottom nav but centered */}
      <div className="fixed bottom-0 left-0 right-0 pointer-events-none z-50">
        <nav className="pointer-events-auto max-w-7xl mx-auto w-full glass-nav pb-8 pt-3 px-6 md:rounded-t-3xl md:mx-auto md:w-auto md:max-w-md md:mb-4 md:shadow-2xl md:border md:border-white/20">
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
              <span className={`material-symbols-outlined text-[26px] ${currentScreen === 'dashboard' ? 'fill-current' : ''}`}>calendar_month</span>
              <span className="text-[10px] font-bold">Calendar</span>
            </button>


            <SmartPlusButton
              onCreateEvent={() => { setEventToEdit(null); setShowCreateModal(true); }}
              onCreateTask={() => setShowCreateTaskModal(true)}
              onAddPhoto={() => setCurrentScreen('gallery')}
            />

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
      </div>

      {/* Modals */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full h-full sm:h-[85vh] sm:max-w-lg sm:rounded-3xl bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 flex flex-col">
            <CreateEventScreen
              initialEvent={eventToEdit}
              onClose={() => { setShowCreateModal(false); setEventToEdit(null); }}
              onEventCreated={(date) => {
                setTargetDate(date);
                // Also switch to home to see the calendar
                setCurrentScreen('home');
              }}
            />
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full h-full sm:h-[85vh] sm:max-w-lg sm:rounded-3xl bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 flex flex-col">
            <CreateTaskModal
              onClose={() => setShowCreateTaskModal(false)}
              onTaskCreated={() => {
                // Refresh home or handle caching? For now just switching to home forces re-render if key changes, but we might relying on HomeScreen polling/fetch on mount.
                // A better way is needed but for now simple close is fine as HomeScreen fetches on mount.
                setCurrentScreen('home');
              }}
            />
          </div>
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
