'use client';

import { useState, useCallback, useMemo } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import ParticlesBackground from '@/components/particles-background';

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
      <path
        fill="#6446fe"
        d="M59,8H5A1,1,0,0,0,4,9V55a1,1,0,0,0,1,1H59a1,1,0,0,0,1-1V9A1,1,0,0,0,59,8ZM58,54H6V10H58Z"
      />
      <path
        fill="#735DFF"
        d="M36,35H28a3,3,0,0,1-3-3V27a3,3,0,0,1,3-3h8a3,3,0,0,1,3,3v5A3,3,0,0,1,36,35Zm-8-9a1,1,0,0,0-1,1v5a1,1,0,0,0,1,1h8a1,1,0,0,0,1-1V27a1,1,0,0,0-1-1Z"
      />
      <path
        fill="#735DFF"
        d="M36 26H28a1 1 0 0 1-1-1V24a5 5 0 0 1 10 0v1A1 1 0 0 1 36 26zm-7-2h6a3 3 0 0 0-6 0zM32 31a1 1 0 0 1-1-1V29a1 1 0 0 1 2 0v1A1 1 0 0 1 32 31z"
      />
      <path
        fill="#6446fe"
        d="M59 8H5A1 1 0 0 0 4 9v8a1 1 0 0 0 1 1H20.08a1 1 0 0 0 .63-.22L25.36 14H59a1 1 0 0 0 1-1V9A1 1 0 0 0 59 8zm-1 4H25l-.21 0a1.09 1.09 0 0 0-.42.2L19.73 16H6V10H58zM50 49H14a1 1 0 0 1-1-1V39a1 1 0 0 1 1-1H50a1 1 0 0 1 1 1v9A1 1 0 0 1 50 49zM15 47H49V40H15z"
      />
      <circle cx="19.5" cy="43.5" r="1.5" fill="#735DFF" />
      <circle cx="24.5" cy="43.5" r="1.5" fill="#735DFF" />
      <circle cx="29.5" cy="43.5" r="1.5" fill="#735DFF" />
      <circle cx="34.5" cy="43.5" r="1.5" fill="#735DFF" />
      <circle cx="39.5" cy="43.5" r="1.5" fill="#735DFF" />
      <circle cx="44.5" cy="43.5" r="1.5" fill="#735DFF" />
      <path
        fill="#735DFF"
        d="M60 9a1 1 0 0 0-1-1H28.81l2.37-2.37A19.22 19.22 0 0 1 60 31zM35.19 56l-2.37 2.37A19.22 19.22 0 0 1 4 33V55a1 1 0 0 0 1 1z"
        opacity="0.3"
      />
    </svg>
  );
}

interface LoginPageProps {
  onLogin: (user: any) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [errors, setErrors] = useState<{ username?: string; password?: string; captcha?: string; general?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const captcha = useMemo(() => {
    const operations = ['+', '-'];
    const op = operations[Math.floor(Math.random() * operations.length)];
    let num1: number, num2: number, answer: number;

    if (op === '+') {
      num1 = Math.floor(Math.random() * 9) + 1;
      num2 = Math.floor(Math.random() * 9) + 1;
      answer = num1 + num2;
    } else {
      num1 = Math.floor(Math.random() * 9) + 2;
      num2 = Math.floor(Math.random() * (num1 - 1)) + 1;
      answer = num1 - num2;
    }

    return { num1, op, num2, answer };
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: { username?: string; password?: string; captcha?: string; general?: string } = {};

    if (!username.trim()) {
      newErrors.username = 'User Name is required';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    }

    if (!captchaAnswer.trim()) {
      newErrors.captcha = 'Please answer the captcha';
    } else if (parseInt(captchaAnswer) !== captcha.answer) {
      newErrors.captcha = 'Incorrect answer, please try again';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [username, password, captchaAnswer, captcha.answer]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      setIsSubmitting(true);
      setErrors({});

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          setErrors({ general: data.error || 'Login failed' });
          setIsSubmitting(false);
          return;
        }

        // Save to localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data.user);
      } catch {
        setErrors({ general: 'Network error. Please try again.' });
      } finally {
        setIsSubmitting(false);
      }
    },
    [validate, username, password, onLogin]
  );

  return (
    <main className="authentication-page">
      <ParticlesBackground />

      <div className="relative z-10 w-full max-w-[900px]">
        <div className="auth-card flex flex-col xl:flex-row">
          {/* Left cover section */}
          <div className="hidden xl:flex xl:w-[45%]">
            <div className="auth-cover w-full py-10 px-8">
              <div className="relative z-10 flex flex-col items-center justify-center h-full">
                <div className="mb-6">
                  <img
                    src="/images/sms-illustration.svg"
                    alt="SMS messaging illustration"
                    className="w-[280px] h-[280px] object-contain"
                  />
                </div>
                <h2
                  className="text-white text-[1.1rem] font-semibold text-center leading-relaxed max-w-[320px]"
                >
                  &quot;Welcome to Fly SMS. Your one stop solutions for all A2P, P2P SMS with
                  High Availabilty and Worldwide Access&quot;
                </h2>
              </div>
            </div>
          </div>

          {/* Right login form section */}
          <div className="flex-1 w-full">
            <div className="flex items-center justify-center h-full min-h-[500px] xl:min-h-0">
              <div className="w-full max-w-[420px] px-6 py-8 sm:px-10 sm:py-10 xl:py-12">
                {/* Lock icon */}
                <div className="flex items-center justify-center mb-4">
                  <div className="auth-icon">
                    <LockIcon />
                  </div>
                </div>

                {/* Sign In heading */}
                <h1
                  className="text-center font-semibold mb-1"
                  style={{ color: '#222F36', fontSize: '1.5rem' }}
                >
                  Sign In
                </h1>

                <p
                  className="text-center mb-6 font-normal"
                  style={{ color: '#6B7280', fontSize: '0.85rem' }}
                >
                  Welcome back!
                </p>

                {/* General error */}
                {errors.general && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs font-medium">
                    {errors.general}
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  <div className="flex flex-col gap-4">
                    {/* Username field */}
                    <div>
                      <label htmlFor="username" className="flysms-label" style={{ color: '#222F36' }}>
                        User Name
                      </label>
                      <div className="relative">
                        <input
                          id="username"
                          type="text"
                          className="flysms-input"
                          style={{ borderColor: errors.username ? '#ef4444' : undefined }}
                          placeholder="Enter User Name"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          autoComplete="username"
                        />
                      </div>
                      {errors.username && (
                        <p className="text-red-500 text-xs mt-1">{errors.username}</p>
                      )}
                    </div>

                    {/* Password field */}
                    <div>
                      <label htmlFor="password" className="flysms-label" style={{ color: '#222F36' }}>
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          className="flysms-input"
                          style={{
                            borderColor: errors.password ? '#ef4444' : undefined,
                            paddingRight: '44px',
                          }}
                          placeholder="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => setShowPassword(!showPassword)}
                          tabIndex={-1}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <EyeOff size={18} strokeWidth={1.5} />
                          ) : (
                            <Eye size={18} strokeWidth={1.5} />
                          )}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                      )}
                    </div>

                    {/* Math captcha */}
                    <div className="captcha-section mt-1">
                      <div className="captcha-question">
                        <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#222F36' }}>
                          What is {captcha.num1} {captcha.op} {captcha.num2} = ? :
                        </span>
                      </div>
                      <div className="captcha-answer">
                        <input
                          type="number"
                          className="flysms-input"
                          style={{
                            borderColor: errors.captcha ? '#ef4444' : undefined,
                            fontSize: '14px',
                            padding: '6px 12px',
                          }}
                          placeholder="Answer"
                          value={captchaAnswer}
                          onChange={(e) => setCaptchaAnswer(e.target.value)}
                        />
                      </div>
                    </div>
                    {errors.captcha && (
                      <p className="text-red-500 text-xs -mt-2">{errors.captcha}</p>
                    )}

                    {/* Sign-In button */}
                    <div className="mt-4">
                      <button
                        type="submit"
                        className="flysms-btn-primary"
                        disabled={isSubmitting}
                        style={{ opacity: isSubmitting ? 0.7 : 1 }}
                      >
                        {isSubmitting ? (
                          <span className="flex items-center gap-2">
                            <svg
                              className="animate-spin"
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <circle
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeDasharray="31.416"
                                strokeDashoffset="10.472"
                                strokeLinecap="round"
                              />
                            </svg>
                            Signing In...
                          </span>
                        ) : (
                          'Sign-In'
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
