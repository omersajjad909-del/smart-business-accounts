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
          // tabindex="-1" means "keyboard navigation skips this" — a row's
          // hover-only delete button says exactly that. Walking onto one parks
          // the cursor on a destructive control and stops Enter dead, because
          // this handler only moves on from inputs and selects. Honour the
          // opt-out and keep going to the next real field.
          const selector = 'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"])';
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
