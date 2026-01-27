import { useEffect, useRef } from 'react';
import React from 'react';

/**
 * Global hook to enable Enter key submission for forms
 * Automatically submits form when Enter is pressed (except in textarea)
 * 
 * Usage:
 * const formRef = useEnterKeySubmit<HTMLFormElement>();
 * <form ref={formRef} onSubmit={handleSubmit}>...</form>
 */
export function useEnterKeySubmit<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle Enter key
      if (e.key !== 'Enter') return;

      // Don't submit if we're in a textarea (allow newlines)
      if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;

      // Don't submit if Shift+Enter (for multiline support)
      if (e.shiftKey) return;

      // Prevent default form submission behavior
      e.preventDefault();

      // Find the form element
      const form = element.tagName === 'FORM' 
        ? element as unknown as HTMLFormElement
        : element.closest('form');

      if (!form) return;

      // Try to find and click the submit button
      const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
      if (submitButton && !submitButton.disabled) {
        submitButton.click();
        return;
      }

      // If no submit button found, trigger form submit event
      form.requestSubmit();
    };

    element.addEventListener('keydown', handleKeyDown as EventListener);

    return () => {
      element.removeEventListener('keydown', handleKeyDown as EventListener);
    };
  }, []);

  return ref;
}

/**
 * Simpler version for individual input fields
 * Usage: <input onKeyDown={handleEnterKey(handleSubmit)} />
 */
export function handleEnterKey(callback: () => void) {
  return (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      callback();
    }
  };
}

/**
 * Hook to focus next input on Enter press
 * Usage: const inputRef = useFocusNextOnEnter(nextInputRef);
 */
export function useFocusNextOnEnter(nextRef?: React.RefObject<HTMLElement>) {
  return (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRef?.current) {
        nextRef.current.focus();
      } else {
        // Focus next focusable element
        const form = (e.target as HTMLElement).closest('form');
        if (!form) return;
        
        const focusable = form.querySelectorAll(
          'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
        );
        const current = e.target as HTMLElement;
        const currentIndex = Array.from(focusable).indexOf(current);
        
        if (currentIndex !== -1 && currentIndex < focusable.length - 1) {
          (focusable[currentIndex + 1] as HTMLElement).focus();
        }
      }
    }
  };
}
