import { useEffect } from 'react';

export function useGlobalEnterNavigation() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const target = e.target as HTMLElement;

        // Ignore textareas (need newlines)
        if (target.tagName === 'TEXTAREA') return;

        // Ignore if Shift is pressed
        if (e.shiftKey) return;

        // Only handle inputs and selects
        if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
          e.preventDefault();

          const form = target.closest('form');
          
          // Get all focusable elements in the current form or document
          const scope = form || document.body;
          const selector = 'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])';
          const elements = Array.from(scope.querySelectorAll(selector)) as HTMLElement[];
          
          const index = elements.indexOf(target);
          
          if (index > -1 && index < elements.length - 1) {
            const nextElement = elements[index + 1];
            nextElement.focus();
          } else if (form) {
            // If last element in a form, submit
            const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
            if (submitBtn && !submitBtn.disabled) {
              submitBtn.click();
            }
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}
