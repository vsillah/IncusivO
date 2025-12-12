import React from 'react';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
}

const steps = [
  { title: "Reference" },
  { title: "Analyze" },
  { title: "Target" },
  { title: "Review" },
  { title: "Export" },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  // Map internal app states to visual steps
  let activeStepIndex = 0;
  if (currentStep >= 6) activeStepIndex = 4;      // Export
  else if (currentStep >= 5) activeStepIndex = 3; // Result
  else if (currentStep >= 3) activeStepIndex = 2; // Upload Target
  else if (currentStep >= 2) activeStepIndex = 1; // Analyze/Review
  else activeStepIndex = 0;                       // Upload Ref

  return (
    <nav aria-label="Progress" className="mb-8">
      <ol role="list" className="divide-y divide-gray-300 rounded-lg border border-gray-300 md:flex md:divide-y-0 bg-white shadow-sm">
        {steps.map((step, stepIdx) => {
          const isComplete = activeStepIndex > stepIdx;
          const isCurrent = activeStepIndex === stepIdx;
          const isLast = stepIdx === steps.length - 1;

          // Determine styles based on state
          let bgClass = "bg-white";
          let textClass = "text-gray-500";
          let iconBorder = "border-gray-300";
          let iconText = "text-gray-500";
          
          if (isComplete) {
            bgClass = "bg-indigo-600";
            textClass = "text-white";
          } else if (isCurrent) {
            bgClass = "bg-indigo-50";
            textClass = "text-indigo-700";
            iconBorder = "border-indigo-600";
            iconText = "text-indigo-600";
          } else {
             // Default pending state
             textClass = "text-gray-500 group-hover:text-gray-900";
             iconBorder = "border-gray-300 group-hover:border-gray-400";
          }

          // Dynamic fill color for the arrow SVG
          const arrowFillColor = isComplete ? '#4f46e5' : isCurrent ? '#eef2ff' : '#ffffff';

          return (
            <li 
              key={step.title} 
              className={`relative md:flex md:flex-1`}
              style={{ zIndex: steps.length - stepIdx }} // Stack earlier steps on top of later ones
            >
              <div className={`
                group flex items-center w-full
                ${bgClass}
                ${stepIdx === 0 ? 'rounded-l-lg' : ''} 
                ${isLast ? 'rounded-r-lg' : ''}
                transition-colors duration-200 ease-in-out
              `}>
                <span className="flex items-center px-6 py-4 text-sm font-medium">
                  {isComplete ? (
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-800 border-2 border-indigo-800 transition-colors">
                      <Check className="h-5 w-5 text-white" aria-hidden="true" />
                    </span>
                  ) : (
                    <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 ${iconBorder} transition-colors`}>
                      <span className={`font-bold ${isCurrent ? iconText : 'text-gray-500 group-hover:text-gray-900'}`}>{stepIdx + 1}</span>
                    </span>
                  )}
                  <span className={`ml-4 text-sm font-medium ${textClass} transition-colors`}>{step.title}</span>
                </span>
              </div>

              {!isLast && (
                <div 
                  className="hidden md:block absolute top-0 right-0 h-full w-5 pointer-events-none" 
                  aria-hidden="true"
                  style={{ right: '-12px' }} // Position it hanging off the right edge
                >
                  <svg
                    className="h-full w-full"
                    viewBox="0 0 22 80"
                    fill="none"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0 -2L20 40L0 82"
                      vectorEffect="non-scaling-stroke"
                      stroke="current"
                      className="stroke-gray-300" 
                      strokeWidth={1}
                      fill={arrowFillColor} // Fill the triangle with the current step's background color
                    />
                  </svg>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};