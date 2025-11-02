import React from "react";
import Lottie from "lottie-react";
import loaderAnimation from "../assets/veg-loader.json"; // your downloaded Lottie JSON

const VegLoader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-6">
      <div className="w-24 h-24">
        <Lottie animationData={loaderAnimation} loop={true} />
      </div>
      <p className="mt-2 text-green-700 font-medium text-sm text-center">
        Preparing your fresh sabzi...
      </p>
    </div>
  );
};

export default VegLoader;
