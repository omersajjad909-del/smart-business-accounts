"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const steps = [
  { key: "welcome", label: "Welcome" },
  { key: "profile", label: "Company Profile" },
  { key: "business", label: "Business Info" },
  { key: "team", label: "Invite Team" },
  { key: "complete", label: "Setup Complete" },
];

export default function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const router = useRouter();

  function nextStep() {
    if (step < steps.length - 1) setStep(step + 1);
    else {
      // Mark onboarding complete in backend (API call can be added here)
      // Redirect to dashboard
      router.replace("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black mb-2">Onboarding Wizard</h1>
          <div className="flex justify-center gap-2 mb-4">
            {steps.map((s, i) => (
              <div key={s.key} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${i <= step ? "bg-indigo-600" : "bg-slate-300"}`}>{i + 1}</div>
            ))}
          </div>
          <div className="text-lg font-bold text-indigo-700">{steps[step].label}</div>
        </div>
        <div className="mb-8">
          {step === 0 && <div>Welcome to Finova Accounts! Click next to begin setup.</div>}
          {step === 1 && <div>Enter your company profile details here.</div>}
          {step === 2 && <div>Add your business information here.</div>}
          {step === 3 && <div>Invite your team members to collaborate.</div>}
          {step === 4 && <div>Setup complete! You will be redirected to your dashboard.</div>}
        </div>
        <button onClick={nextStep} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition">
          {step < steps.length - 1 ? "Next" : "Go to Dashboard"}
        </button>
      </div>
    </div>
  );
}
