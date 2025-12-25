
import React, { useState } from 'react';

const DashboardScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'hosting' | 'past'>('upcoming');

  const invitations = [
    {
      id: 'i1',
      title: 'Design Team Happy Hour',
      time: '6:00 PM',
      location: 'The Local Pub',
      day: 'Today',
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMsB-AOwP_S2TS5nwjHCnHvpZDSyj3sRtZgKY1yVj5aX_mns_0oHUidH7dyLsSsPJIvq412OF-l1atxUlNgaCgLCIfcVTvszDzSUBNOwTa-ODfdBPTqMdbLk5Vnw6FRkhz6K-o2sBnZVEHh9Vuee53YLY7Uo7H0y8ptHlr2G6LRz9b9DbVtBiddkAtGaCec-Bq6-gd3acGq2o50Im2cjTulFFkMCcrcIIGuwmcwuM17_Xp3zXWRZ7vQcrbl0nqMd-AtdBknhFmywow'
    },
    {
      id: 'i2',
      title: 'Q4 Strategy Kickoff',
      time: '10:00 AM',
      location: 'Conf Room A',
      day: 'Tomorrow',
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC6qOHI9N7BoaqnjNXQ5PcNIprkTKohAnABMLFoRGuz2Wg8EMA4_vbQGewVvV0bJ51FpqL3d5ZpucX-Hw_Q2noRzKmPX4yr1gyJE3mp8z2kK5mQUPx5PcZ4i_HE8oz_PCLqCyLt4E47L-hR7d3fx3xg_EAJcW_Q9n7NpaIuNGjKPFOpR20RcJtyi72j3aH-hYJEJdQIBOuP6YYswJWzXZNP8u4gf9kDhvM2R8j6ms80qMYb3pniRuffZSluqg1g96YhvMtAsP_xQgTc'
    }
  ];

  return (
    <div className="pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-5 py-4 flex items-center justify-between border-b border-border-light">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-surface border border-border-light shadow-sm bg-cover" style={{ backgroundImage: 'url("https://picsum.photos/seed/alex/100")' }} />
          <div>
            <p className="text-xs text-text-muted font-semibold uppercase tracking-wide">Dashboard</p>
            <h1 className="text-xl font-bold leading-tight text-black">My Events</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button className="p-2.5 rounded-full hover:bg-surface"><span className="material-symbols-outlined">search</span></button>
           <button className="p-2.5 rounded-full hover:bg-surface relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
           </button>
        </div>
      </header>

      {/* Invitations */}
      <section className="mt-6">
        <div className="px-5 mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Invitations <span className="text-text-muted font-medium text-lg ml-1">(2)</span></h2>
          <button className="text-sm font-semibold text-black underline underline-offset-2 hover:opacity-70">View all</button>
        </div>
        <div className="flex overflow-x-auto no-scrollbar gap-4 px-5 pb-2">
          {invitations.map(inv => (
            <div key={inv.id} className="flex-none w-80 bg-white rounded-3xl p-4 shadow-soft border border-border-light flex flex-col gap-4">
              <div 
                className="h-36 w-full rounded-2xl bg-cover bg-center relative overflow-hidden" 
                style={{ backgroundImage: `url("${inv.imageUrl}")` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-3 left-3 text-white">
                  <div className="flex items-center gap-1 text-xs font-semibold bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg border border-white/20 w-fit">
                    <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                    <span>{inv.day}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-bold text-lg text-black truncate">{inv.title}</h3>
                <div className="flex items-center gap-2 text-text-muted text-sm font-medium">
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">schedule</span> {inv.time}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                  <span className="flex items-center gap-1 truncate"><span className="material-symbols-outlined text-[18px]">location_on</span> {inv.location}</span>
                </div>
              </div>
              <div className="flex gap-3 mt-1">
                <button className="flex-1 bg-black text-white py-2.5 rounded-xl text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-all">Accept</button>
                <button className="flex-1 bg-surface text-black border border-border-light py-2.5 rounded-xl text-sm font-bold hover:bg-gray-100 transition-all">Decline</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tabs */}
      <section className="mt-8">
        <div className="sticky top-[73px] z-20 bg-white pt-2 pb-4 border-b border-transparent">
          <div className="mx-5 bg-surface p-1.5 rounded-2xl flex border border-border-light">
            {['upcoming', 'hosting', 'past'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold capitalize transition-all ${
                  activeTab === tab ? 'bg-white text-black shadow-sm ring-1 ring-black/5' : 'text-text-muted hover:text-black'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="px-5 flex flex-col gap-6 mt-4">
          <div className="flex items-center gap-4">
            <p className="text-sm font-bold text-text-muted uppercase tracking-wider">This Week</p>
            <div className="h-[1px] flex-1 bg-border-light"></div>
          </div>
          
          {/* Card: Product Launch */}
          <div className="group relative bg-white rounded-3xl p-5 flex gap-5 shadow-sharp border border-border-light hover:border-black/20 active:scale-[0.99] transition-all">
            <div className="flex-none w-16 flex flex-col items-center justify-center bg-black text-white rounded-2xl py-3 h-fit shadow-md shadow-black/20">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Oct</span>
              <span className="text-2xl font-bold">24</span>
            </div>
            <div className="flex-1 flex flex-col justify-center gap-1.5">
              <h3 className="text-lg font-bold text-black leading-tight">Product Launch V2</h3>
              <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-text-muted">
                <span className="flex items-center gap-1 bg-surface px-2 py-0.5 rounded-md border border-border-light"><span className="material-symbols-outlined text-[16px]">schedule</span> 2:00 PM</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">location_on</span> Main Hall</span>
              </div>
            </div>
            <div className="flex flex-col items-end justify-between gap-2">
              <div className="h-14 w-14 rounded-full bg-cover bg-center border-2 border-surface-dark shadow-sm" style={{ backgroundImage: 'url("https://picsum.photos/seed/tech/100")' }}></div>
              <span className="px-2.5 py-1 rounded-lg bg-green-50 text-green-700 border border-green-100 text-[10px] font-bold uppercase tracking-wide">Going</span>
            </div>
          </div>

          {/* Card: UX Workshop */}
          <div className="group relative bg-white rounded-3xl p-5 flex gap-5 shadow-sharp border border-border-light hover:border-black/20 active:scale-[0.99] transition-all">
            <div className="flex-none w-16 flex flex-col items-center justify-center bg-surface text-black rounded-2xl py-3 h-fit border border-border-light">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Oct</span>
              <span className="text-2xl font-bold">28</span>
            </div>
            <div className="flex-1 flex flex-col justify-center gap-2">
              <h3 className="text-lg font-bold text-black leading-tight">UX Workshop</h3>
              <div className="flex items-center gap-1 text-sm text-text-muted font-medium">
                <span className="material-symbols-outlined text-[18px]">schedule</span>
                <span>9:00 AM - 1:00 PM</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex -space-x-2.5">
                  <img src="https://picsum.photos/seed/u1/100" className="w-7 h-7 rounded-full border-2 border-white object-cover" alt="User" />
                  <img src="https://picsum.photos/seed/u2/100" className="w-7 h-7 rounded-full border-2 border-white object-cover" alt="User" />
                  <div className="w-7 h-7 rounded-full border-2 border-white bg-black text-white text-[10px] font-bold flex items-center justify-center">+4</div>
                </div>
                <span className="text-xs font-semibold text-text-muted">attending</span>
              </div>
            </div>
            <div className="flex flex-col items-end justify-between gap-2">
              <div className="h-14 w-14 rounded-full bg-cover bg-center border-2 border-surface-dark shadow-sm" style={{ backgroundImage: 'url("https://picsum.photos/seed/design/100")' }}></div>
              <span className="px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-100 text-[10px] font-bold uppercase tracking-wide">Waitlist</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardScreen;
