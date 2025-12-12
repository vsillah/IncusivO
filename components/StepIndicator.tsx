import React from 'react';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
}

const steps = [
  { title: "Upload Reference", description: "Provide inclusive content" },
  { title: "Analyze DNA", description: "Extract inclusive traits" },
  { title: "Upload Target", description: "Content to rewrite" },
  { title: "Review", description: "Compare changes" },
  { title: "Export", description: "Download documents" },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  // Map internal app states to visual steps (0-4)
  // AppStep: UPLOAD_REF(0), ANALYZING(1), REVIEW(2), UPLOAD_TARGET(3), REWRITING(4), RESULT(5), EXPORT(6)
  
  let activeStepIndex = 0;
  if (currentStep >= 6) activeStepIndex = 4;      // Export
  else if (currentStep >= 5) activeStepIndex = 3; // Result
  else if (currentStep >= 3) activeStepIndex = 2; // Upload Target (Review Analysis is skipped/merged visually or considered done)
  else if (currentStep >= 2) activeStepIndex = 1; // Analyze/Review
  else activeStepIndex = 0;                       // Upload Ref

  return (
    <nav aria-label="Progress" className="mb-12">
      <ol role="list" className="overflow-hidden rounded-md lg:flex lg:rounded-none lg:border-l lg:border-r lg:border-gray-200">
        {steps.map((step, stepIdx) => {
          const isComplete = activeStepIndex > stepIdx;
          const isCurrent = activeStepIndex === stepIdx;

          return (
            <li key={step.title} className="relative overflow-hidden lg:flex-1">
              <div
                className={`
                  border-b border-gray-200 overflow-hidden lg:border-0
                  ${stepIdx === 0 ? 'rounded-t-md border-t-0' : ''}
                  ${stepIdx === steps.length - 1 ? 'rounded-b-md border-b-0' : ''}
                `}
              >
                <div className="group">
                  <span
                    className={`
                      absolute left-0 top-0 h-full w-1 bg-transparent group-hover:bg-gray-200 lg:bottom-0 lg:top-auto lg:h-1 lg:w-full
                      ${isCurrent ? 'bg-indigo-600' : ''}
                      ${isComplete ? 'bg-indigo-600' : ''}
                    `}
                    aria-hidden="true"
                  />
                  <span className={`px-6 py-5 flex items-start text-sm font-medium ${isCurrent ? 'lg:pl-9' : ''}`}>
                    <span className="flex-shrink-0">
                      {isComplete ? (
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600">
                          <Check className="h-6 w-6 text-white" aria-hidden="true" />
                        </span>
                      ) : isCurrent ? (
                        <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-indigo-600">
                          <span className="text-indigo-600">{stepIdx + 1}</span>
                        </span>
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-300">
                          <span className="text-gray-500">{stepIdx + 1}</span>
                        </span>
                      )}
                    </span>
                    <span className="ml-4 mt-0.5 flex min-w-0 flex-col">
                      <span className={`text-sm font-medium ${isCurrent ? 'text-indigo-600' : 'text-gray-500'}`}>
                        {step.title}
                      </span>
                      <span className="text-sm text-gray-500">{step.description}</span>
                    </span>
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};