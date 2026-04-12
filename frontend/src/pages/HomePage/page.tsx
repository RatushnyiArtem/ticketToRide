import React from 'react';
import FeatureCard from '../../components/FeatureCard';
import Button from '../../components/Button';

const featuresData = [
  {
    icon: "🚂",
    title: "It's Free!",
    description: "Just create an account and start claiming routes — no subscriptions or payments required."
  },
  {
    icon: "🗺️",
    title: "Multiple Maps",
    description: "Play on the classic USA map, or explore Europe, Asia, and more with unique mechanics."
  },
  {
    icon: "🏆",
    title: "Ranked Modes",
    description: "Play in competitive mode to earn your title as the ultimate railway baron and climb the leaderboard."
  },
  {
    icon: "💬",
    title: "New Friends",
    description: "Find interesting players, add them as friends, and chat about your best blocking strategies."
  },
  {
    icon: "🎟️",
    title: "Collectibles",
    description: "Unlock new custom train car colors, avatars, and profile themes as you win matches."
  },
  {
    icon: "💻",
    title: "Play Anywhere",
    description: "Play on any device with a browser — whether on your home PC or on your phone during your commute."
  }
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans text-gray-800">
      
      {/* --- HERO SECTION --- */}
      <div className="bg-[#4bbda6] text-white">
        
        {/* Navigation */}
        <nav className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="font-bold text-xl tracking-wider flex items-center gap-2">
              <span className="text-2xl">🚂</span> TICKET TO RIDE
            </div>
            <div className="hidden md:flex items-center gap-4 text-sm font-medium">
              <Button variant="ghost" className="px-4 py-1.5">Find Games</Button>
              <button className="hover:text-gray-100 transition">Market</button>
            </div>
          </div>
          <Button variant="login" className="px-6 py-1.5">Login</Button>
        </nav>

        {/* Hero Content */}
        <div className="max-w-4xl mx-auto text-center mt-16 mb-8 px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Welcome to Ticket to Ride.
          </h1>
          <p className="text-lg md:text-xl text-emerald-50 mb-8">
            This is a great place to play the legendary board game with your friends online.
          </p>
          <Button variant="secondary" className="px-8 py-3 text-lg font-bold">
            Start Game
          </Button>
        </div>

        {/* Game Interface Mockup */}
        <div className="max-w-5xl mx-auto px-4 pb-0 relative translate-y-16">
          <div className="bg-[#2b2d31] rounded-t-xl shadow-2xl aspect-video flex flex-col overflow-hidden border border-gray-700">
            <div className="bg-[#1e1f22] p-3 flex gap-2 items-center">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <div className="mx-auto bg-[#2b2d31] text-xs text-gray-400 px-4 py-1 rounded-md">
                ticket-to-ride.online/game/12345
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center relative p-8">
               <div className="text-gray-500 text-xl font-medium border-2 border-dashed border-gray-600 p-12 rounded-xl">
                 Your Game Board Image Goes Here
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer to account for the translated game board */}
      <div className="h-32 bg-[#f8f9fa]"></div>

      {/* --- FEATURES SECTION --- */}
      <div className="max-w-6xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold mb-16 text-gray-800">
          Why you'll love playing with us?
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
          {featuresData.map((feature, index) => (
            <FeatureCard 
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>

        <Button variant="primary" className="mt-16 px-8 py-3 text-lg font-bold">
          Start Game
        </Button>
      </div>

      {/* --- FOOTER SECTION --- */}
      <footer className="bg-[#eef0f3] border-t border-gray-200 mt-12 py-12">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Logo & Copyright */}
          <div className="flex flex-col gap-4">
            <div className="font-bold text-3xl text-gray-400 tracking-tighter">
              R
            </div>
            <p className="text-sm text-gray-500">
              Ticket to Ride — free online game.
            </p>
          </div>


        </div>
      </footer>
    </div>
  );
}