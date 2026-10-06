import React, { useState } from 'react';
import {
  loginWithGoogle,
  User,
} from '../firebase.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onPasscodeSuccess: () => void;
  isPasscodeAuthor: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onPasscodeSuccess,
  isPasscodeAuthor,
}) => {
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setErrorDetails(null);
      await loginWithGoogle();
      setLoading(false);
      onClose();
    } catch (err: unknown) {
      setLoading(false);
      const errorObj = err as { code?: string; message?: string };
      const code = errorObj?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setErrorDetails('popup closed.');
      } else {
        setErrorDetails('authorization error.');
      }
    }
  };

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === 'ieatandlovetomato444') {
      onPasscodeSuccess();
      onClose();
    } else {
      setPasscodeError(true);
    }
  };

  const isAuthorized = !!currentUser || isPasscodeAuthor;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/95 backdrop-blur-xs select-none"
      style={{ fontFamily: 'Arial, sans-serif' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs bg-white border border-black p-6 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black pb-3 mb-6">
          <span className="text-[12px] font-normal text-black">
            author access
          </span>
          <button
            onClick={onClose}
            className="text-[12px] text-black/40 hover:text-black transition-colors cursor-pointer"
          >
            close
          </button>
        </div>

        {isAuthorized ? (
          <div className="text-[13px] space-y-3 py-2">
            <p className="text-black">author access active</p>
            <button
              onClick={onClose}
              className="mt-4 w-full py-2 bg-black text-white text-[12px] cursor-pointer"
            >
              continue
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Pure solitary password input with zero hints */}
            <form onSubmit={handlePasscodeSubmit} className="space-y-3">
              <div>
                <input
                  type="password"
                  placeholder="password"
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setPasscodeError(false);
                  }}
                  autoFocus
                  className="w-full text-[13px] p-2 bg-white border border-black/30 focus:border-black outline-none"
                />
              </div>

              {passcodeError && (
                <p className="text-[11px] text-red-600">incorrect password.</p>
              )}

              <button
                type="submit"
                className="w-full py-2 bg-black text-white hover:opacity-80 transition-opacity text-[12px] cursor-pointer"
              >
                enter
              </button>
            </form>

            {errorDetails && (
              <div className="p-2 bg-neutral-100 text-[11px] text-black">
                {errorDetails}
              </div>
            )}

            {/* Optional quiet Google login */}
            <div className="pt-2 border-t border-black/10 text-center">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="text-[11px] text-black/40 hover:text-black transition-colors cursor-pointer"
              >
                {loading ? 'connecting...' : 'or sign in with google'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
