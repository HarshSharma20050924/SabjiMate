import React from 'react';

interface IntroProps {
  isAnimatingOut: boolean;
}

const Intro: React.FC<IntroProps> = ({ isAnimatingOut }) => {
  return (
    <div className={`fixed inset-0 flex items-center justify-center bg-[#00dd00] z-50 ${isAnimatingOut ? 'animate-fade-out' : ''}`}>
      <div className="relative w-80 h-80 flex items-center justify-center">
        {/* White Octagon */}
        <div 
          className="absolute w-full h-full bg-white animate-zoom-in"
          style={{ clipPath: 'polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%)' }}
        ></div>
        
        {/* Text */}
        <div className="relative z-10 text-5xl font-bold flex items-end overflow-hidden">
          <div className="animate-slide-in-left">
            <span className="text-green-600">सब्ज़ी</span>
          </div>
          <div className="animate-slide-in-right">
            <span className="text-red-600">MATE</span>
            <div className="h-1 bg-red-600 mt-1"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Intro;