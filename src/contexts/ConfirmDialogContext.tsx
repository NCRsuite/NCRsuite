import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';
import { Icon } from '../components/Icon';

type ConfirmTone = 'default' | 'warning' | 'danger';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputDefaultValue?: string;
  inputHint?: string;
  inputMaxLength?: number;
}

export interface ConfirmDialogResult {
  confirmed: boolean;
  value: string;
}

interface PendingConfirm {
  options: ConfirmDialogOptions;
  resolve: (result: ConfirmDialogResult) => void;
}

interface ConfirmDialogContextValue {
  confirm: (options: ConfirmDialogOptions) => Promise<ConfirmDialogResult>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [inputValue, setInputValue] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const settle = useCallback((confirmed: boolean) => {
    setPending((current) => {
      if (!current) return null;
      current.resolve({ confirmed, value: inputValue.trim() });
      return null;
    });
  }, [inputValue]);

  const confirm = useCallback((options: ConfirmDialogOptions) => new Promise<ConfirmDialogResult>((resolve) => {
    setPending((current) => {
      if (current) current.resolve({ confirmed: false, value: '' });
      return { options, resolve };
    });
    setInputValue(options.inputDefaultValue ?? '');
  }), []);

  useEffect(() => {
    if (!pending) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      if (pending.options.inputLabel) inputRef.current?.focus();
      else cancelRef.current?.focus();
    }, 0);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        settle(false);
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      ));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [pending, settle]);

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      {pending && (
        <div
          className="ncr-confirm-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) settle(false);
          }}
        >
          <div
            ref={dialogRef}
            className={`ncr-confirm-dialog tone-${pending.options.tone ?? 'default'}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ncr-confirm-title"
            aria-describedby="ncr-confirm-message"
          >
            <div className="ncr-confirm-icon" aria-hidden="true">
              <Icon
                name={pending.options.tone === 'danger' ? 'alert' : pending.options.tone === 'warning' ? 'info' : 'shield'}
                size={22}
              />
            </div>

            <div className="ncr-confirm-copy">
              <p className="eyebrow">{pending.options.tone === 'danger' ? 'CONFIRMATION REQUISE' : 'VÉRIFICATION'}</p>
              <h2 id="ncr-confirm-title">{pending.options.title}</h2>
              <p id="ncr-confirm-message">{pending.options.message}</p>
            </div>

            {pending.options.inputLabel && (
              <label className="ncr-confirm-input">
                <span>{pending.options.inputLabel}</span>
                <textarea
                  ref={inputRef}
                  rows={3}
                  value={inputValue}
                  maxLength={pending.options.inputMaxLength ?? 500}
                  placeholder={pending.options.inputPlaceholder}
                  onChange={(event) => setInputValue(event.target.value)}
                />
                {pending.options.inputHint && <small>{pending.options.inputHint}</small>}
              </label>
            )}

            <div className="ncr-confirm-actions">
              <button
                ref={cancelRef}
                type="button"
                className="secondary-button"
                onClick={() => settle(false)}
              >
                {pending.options.cancelLabel ?? 'Annuler'}
              </button>
              <button
                type="button"
                className={pending.options.tone === 'danger' ? 'danger-button' : 'primary-button'}
                onClick={() => settle(true)}
              >
                {pending.options.confirmLabel ?? 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);
  if (!context) throw new Error('useConfirmDialog doit être utilisé dans ConfirmDialogProvider.');
  return context;
}
