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
  ShieldAlert 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { deriveMasterKey, deriveAuthHash, exportKeyToHex } from '@/lib/crypto';

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

  // Navigation / Loading state
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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

  // Handle Standard Email/Password Auth
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
      // Derive keys
      const masterKey = await deriveMasterKey(password, email);
      const authHash = await deriveAuthHash(masterKey, password);
      const masterKeyHex = await exportKeyToHex(masterKey);

      // Call Backend API
      const endpoint = isLoginTab ? '/api/auth/login' : '/api/auth/signup';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          authHash,
          isWeb3: false
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (isLoginTab) {
        localStorage.setItem('vault_token', data.token);
        localStorage.setItem('vault_user_email', data.user.email);
        localStorage.setItem('vault_user_is_web3', 'false');
        sessionStorage.setItem('vault_master_key', masterKeyHex);
        
        setSuccessMsg('Logged in successfully! Redirecting...');
        setTimeout(() => router.push('/vault'), 1000);
      } else {
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
    <main className="landing-container">
      <div className="landing-grid">
        
        {/* Left Side: Product Intro */}
        <motion.div 
          className="hero-content"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.div className="badge-container" variants={fadeInUp}>
            <ShieldCheck size={14} className="badge-icon" style={{ color: 'var(--accent-emerald)' }} />
            <span className="badge-text">Zero-Knowledge Storage</span>
          </motion.div>

          <motion.h1 className="hero-title" variants={fadeInUp}>
            Protect Credentials <br />
            With <span className="vault-header-logo">Kraken's Vault</span>
          </motion.h1>

          <motion.p className="hero-desc" variants={fadeInUp}>
            A state-of-the-art secure credential manager. 
            All data is encrypted client-side using military-grade AES-256-GCM 
            before saving. Accessible only by you.
          </motion.p>

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
