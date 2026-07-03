'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  Key, 
  Wallet, 
  Eye, 
  EyeOff, 
  Check, 
  Activity, 
  Server, 
  ShieldAlert,
  Palette
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { deriveMasterKey, deriveAuthHash, exportKeyToHex } from '@/lib/crypto';
import { getUserByEmail, saveUser } from '@/lib/indexedDb';

// Framer Motion Animation Variants
const fadeInUp = {
  hidden: { opacity: 0, y: 25 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 1, 0.5, 1] as const } 
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } 
  }
};

export default function Home() {
  const router = useRouter();

  // Runaway logo state
  const [logoLeftPos, setLogoLeftPos] = useState({ x: 0, y: 0 });

  const shiftLogoLeft = () => {
    const rx = (Math.random() - 0.5) * 380; // Shift between -190px and +190px for high dynamic range
    const ry = (Math.random() - 0.5) * 380;
    setLogoLeftPos({ x: rx, y: ry });
  };

  // Navigation / Loading state
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Theme state
  const [theme, setTheme] = useState('theme-ocean');

  useEffect(() => {
    const savedTheme = localStorage.getItem('vault_theme') || 'theme-ocean';
    setTheme(savedTheme);
    document.documentElement.className = savedTheme;
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'theme-ocean' ? 'theme-burgundy' : 'theme-ocean';
    setTheme(newTheme);
    localStorage.setItem('vault_theme', newTheme);
    document.documentElement.className = newTheme;
  };

  // Form Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Password strength state
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    // Check if already logged in
    const token = localStorage.getItem('vault_token');
    const masterKey = sessionStorage.getItem('vault_master_key');
    if (token && masterKey) {
      router.push('/vault');
    }

    // Migrate users from localStorage to IndexedDB
    const migrateUsers = async () => {
      try {
        const legacyUsersStr = localStorage.getItem('kraken_users');
        if (legacyUsersStr) {
          const legacyUsers = JSON.parse(legacyUsersStr);
          for (const u of legacyUsers) {
            const existing = await getUserByEmail(u.email);
            if (!existing) {
              await saveUser({
                id: u.id,
                email: u.email,
                passwordHash: u.passwordHash,
                createdAt: u.createdAt || new Date().toISOString()
              });
            }
          }
          localStorage.removeItem('kraken_users');
          console.log('Successfully migrated users to IndexedDB');
        }
      } catch (err) {
        console.error('Failed to migrate users to IndexedDB:', err);
      }
    };
    migrateUsers();
  }, [router]);

  // Update password strength
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      return;
    }
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    setPasswordStrength(strength);
  }, [password]);

  // Handle Standard Email/Password Auth (Completely Client-Side Local Storage)
  const handleStandardAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !password) {
      setErrorMsg('Please enter both email and master password.');
      return;
    }

    if (!isLoginTab && password.length < 8) {
      setErrorMsg('Master password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      // Derive ZK keys
      const masterKey = await deriveMasterKey(password, email);
      const authHash = await deriveAuthHash(masterKey, password);
      const masterKeyHex = await exportKeyToHex(masterKey);

      // Secure client-side hashing of authHash using browser's SubtleCrypto
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(authHash);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      if (isLoginTab) {
        const user = await getUserByEmail(email);
        if (!user || user.passwordHash !== passwordHash) {
          throw new Error('Invalid email or master password.');
        }

        const token = `mock-jwt-token-${user.id}-${Date.now()}`;
        localStorage.setItem('vault_token', token);
        localStorage.setItem('vault_user_id', user.id);
        localStorage.setItem('vault_user_email', user.email);
        localStorage.setItem('vault_user_is_web3', 'false');
        sessionStorage.setItem('vault_master_key', masterKeyHex);
        
        setSuccessMsg('Logged in successfully! Redirecting...');
        setTimeout(() => router.push('/vault'), 1000);
      } else {
        const emailExists = await getUserByEmail(email);
        if (emailExists) {
          throw new Error('Email is already registered.');
        }

        const newUserId = Math.random().toString(36).substring(2, 15);
        await saveUser({
          id: newUserId,
          email: email.toLowerCase().trim(),
          passwordHash,
          createdAt: new Date().toISOString()
        });

        setSuccessMsg('Account registered successfully! You can now log in.');
        setIsLoginTab(true);
        setPassword('');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="landing-container" style={{ position: 'relative' }}>
      
      {/* Floating Theme Switcher */}
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 50, display: 'flex', gap: '0.25rem', background: 'rgba(255, 255, 255, 0.1)', padding: '0.2rem', borderRadius: '999px', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
        <button 
          type="button"
          onClick={() => { if (theme !== 'theme-ocean') toggleTheme(); }}
          style={{
            padding: '0.25rem 0.6rem',
            fontSize: '0.62rem',
            fontWeight: 700,
            borderRadius: '999px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: theme === 'theme-ocean' ? 'var(--bg-mint)' : 'transparent',
            color: theme === 'theme-ocean' ? 'var(--text-dark)' : 'var(--text-light)',
            opacity: theme === 'theme-ocean' ? 1 : 0.6,
          }}
        >
          Ocean
        </button>
        <button 
          type="button"
          onClick={() => { if (theme !== 'theme-burgundy') toggleTheme(); }}
          style={{
            padding: '0.25rem 0.6rem',
            fontSize: '0.62rem',
            fontWeight: 700,
            borderRadius: '999px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: theme === 'theme-burgundy' ? 'var(--bg-mint)' : 'transparent',
            color: theme === 'theme-burgundy' ? 'var(--text-dark)' : 'var(--text-light)',
            opacity: theme === 'theme-burgundy' ? 1 : 0.6,
          }}
        >
          Burgundy
        </button>
      </div>

      <div className="landing-grid">
        
        {/* Left Side: Product Intro */}
        <motion.div 
          className="hero-content"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          {/* Relative container for logo and text overlay */}
          <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column' }}>
            
            {/* The Runaway Octopus (behind the text) */}
            <motion.div 
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 0.85, opacity: 1, x: logoLeftPos.x, y: logoLeftPos.y }}
              transition={{ type: 'spring', damping: 9, stiffness: 260, delay: 0.1 }}
              onMouseEnter={shiftLogoLeft}
              style={{ 
                position: 'absolute',
                top: '55%',
                left: '20%',
                transform: 'translate(-50%, -50%)',
                cursor: 'pointer',
                zIndex: 1,
                width: 'fit-content'
              }}
            >
              <img 
                src="/logo.png" 
                alt="Kraken Logo" 
                style={{ 
                  width: '360px', 
                  height: '360px', 
                  objectFit: 'contain',
                  opacity: 1.0,
                  userSelect: 'none'
                }} 
              />
            </motion.div>

            {/* Static Content (Badge, Title, Desc) in front of the octopus */}
            <div style={{ position: 'relative', zIndex: 2, pointerEvents: 'none' }}>
              <motion.div className="badge-container" variants={fadeInUp}>
                <ShieldCheck size={14} className="badge-icon" style={{ color: 'var(--accent-emerald)' }} />
                <span className="badge-text">High-Security Storage</span>
              </motion.div>

              <motion.h1 className="hero-title" variants={fadeInUp} style={{ marginTop: '0.5rem' }}>
                Protect Credentials <br />
                With{' '}
                <span className="vault-header-logo kraken-glow">
                  Kraken's Vault
                </span>
              </motion.h1>

              <motion.p className="hero-desc" variants={fadeInUp} style={{ marginTop: '1rem', maxWidth: '480px' }}>
                A state-of-the-art secure credential manager. 
                All data is encrypted client-side using military-grade AES-256-GCM 
                before saving. Accessible only by you.
              </motion.p>
            </div>

          </div>

          <motion.div className="features-grid" variants={staggerContainer}>
            <motion.div className="feature-item light-card" variants={fadeInUp}>
              <div className="feature-icon emerald">
                <Check size={14} />
              </div>
              <div>
                <h4 className="feature-text-title">100% Client-Side Encryption</h4>
                <p className="feature-text-desc">Your master password and keys never leave your browser.</p>
              </div>
            </motion.div>

            <motion.div className="feature-item dark-card" variants={fadeInUp}>
              <div className="feature-icon blue">
                <Activity size={14} />
              </div>
              <div>
                <h4 className="feature-text-title">Security Auditing</h4>
                <p className="feature-text-desc">Scan for weak, reused, or compromised credentials automatically.</p>
              </div>
            </motion.div>

            <motion.div className="feature-item light-card" variants={fadeInUp}>
              <div className="feature-icon emerald">
                <Server size={14} />
              </div>
              <div>
                <h4 className="feature-text-title">Identity Storage</h4>
                <p className="feature-text-desc">Store credit cards and national IDs securely alongside logins.</p>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Right Side: Auth Card */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={scaleIn}
        >


          <div className="auth-card">
            <div className="auth-ambient-light" />
            
            {/* Header Tabs */}
            <div className="auth-tabs">
              <button 
                type="button"
                onClick={() => { setIsLoginTab(true); setErrorMsg(''); setSuccessMsg(''); }}
                className={`auth-tab-btn ${isLoginTab ? 'active' : ''}`}
              >
                Sign In
              </button>
              <button 
                type="button"
                onClick={() => { setIsLoginTab(false); setErrorMsg(''); setSuccessMsg(''); }}
                className={`auth-tab-btn ${!isLoginTab ? 'active' : ''}`}
              >
                Create Account
              </button>
              {/* Dynamic slider */}
              <motion.div 
                className="auth-tab-slider"
                animate={{ left: isLoginTab ? '0%' : '50%', width: '50%' }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            </div>

            {/* Error / Success Display */}
            <AnimatePresence mode="wait">
              {errorMsg && (
                <motion.div 
                  className="auth-alert error"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <ShieldAlert size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>{errorMsg}</span>
                </motion.div>
              )}
              
              {successMsg && (
                <motion.div 
                  className="auth-alert success"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <ShieldCheck size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>{successMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Auth Form */}
            <form onSubmit={handleStandardAuth} className="auth-form">
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-wrapper">
                  <span className="input-icon"><Mail size={15} /></span>
                  <input 
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Master Password</label>
                <div className="input-wrapper">
                  <span className="input-icon"><Lock size={15} /></span>
                  <input 
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder={isLoginTab ? "Enter your master password" : "Create a strong master password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="input-field"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="input-toggle-btn"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                
                {/* Password Strength indicator (for Signup) */}
                <AnimatePresence>
                  {!isLoginTab && password && (
                    <motion.div 
                      className="strength-meter"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <div className="strength-text-row">
                        <span style={{ color: 'var(--text-secondary)' }}>Password Strength:</span>
                        <span className="strength-label" style={{
                          fontWeight: 700,
                          fontFamily: 'var(--font-header)',
                          color: passwordStrength === 4 ? 'var(--accent-emerald)' : passwordStrength >= 2 ? 'var(--accent-warning)' : 'var(--accent-red)'
                        }}>
                          {passwordStrength === 4 ? 'Strong' : passwordStrength >= 2 ? 'Medium' : 'Weak'}
                        </span>
                      </div>
                      <div className="strength-bar">
                        <motion.div 
                          className={`strength-bar-fill ${
                            passwordStrength === 4 ? 'strength-strong' : passwordStrength >= 2 ? 'strength-medium' : 'strength-weak'
                          }`}
                          initial={{ width: 0 }}
                          animate={{ 
                            width: passwordStrength === 4 ? '100%' : passwordStrength >= 2 ? '66%' : '33%' 
                          }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.button 
                type="submit" 
                disabled={loading}
                className="submit-btn"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {loading ? 'Processing...' : isLoginTab ? 'Unlock Vault' : 'Initialize Vault'}
              </motion.button>
            </form>

            <p className="auth-card-footer-text">
              Derived keys are never saved on the server. Your data is decrypted locally.
            </p>
          </div>
        </motion.div>

      </div>
    </main>
  );
}
