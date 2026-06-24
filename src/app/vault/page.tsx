'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Lock, 
  Search, 
  Plus, 
  Folder, 
  CreditCard, 
  FileText, 
  User, 
  Star, 
  Trash2, 
  ShieldAlert, 
  ShieldCheck,
  Key, 
  Copy, 
  Eye, 
  EyeOff, 
  LogOut, 
  Save, 
  X, 
  Edit3, 
  RefreshCw,
  AlertCircle,
  Menu,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  importKeyFromHex, 
  encryptData, 
  encryptObject, 
  decryptData, 
  decryptObject 
} from '@/lib/crypto';

// Types
interface DecryptedVaultItem {
  id: string;
  type: 'login' | 'card' | 'note' | 'identity';
  title: string;       // Decrypted
  favorite: boolean;
  fields: any;         // Decrypted fields object
  createdAt: string;
  updatedAt: string;
  titleIv?: string;
  fieldsIv?: string;
}

// Animation Variants
const panelEntrance = {
  hidden: { opacity: 0, y: 15 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { 
      delay: i * 0.1, 
      duration: 0.45, 
      ease: [0.215, 0.61, 0.355, 1] as const
    }
  })
};

const itemStagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 }
  }
};

const listItemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' as const } }
};

const detailsTransition = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -15, transition: { duration: 0.15 } }
};

export default function Vault() {
  const router = useRouter();

  // Mobile viewport state for responsive layout switching
  const [activeMobileView, setActiveMobileView] = useState<'sidebar' | 'list' | 'details'>('list');

  // Session / Authentication state
  const [userEmail, setUserEmail] = useState('');
  const [masterKeyHex, setMasterKeyHex] = useState('');
  const [token, setToken] = useState('');
  const [authorized, setAuthorized] = useState(false);

  // Vault Items lists
  const [encryptedItems, setEncryptedItems] = useState<any[]>([]);
  const [decryptedItems, setDecryptedItems] = useState<DecryptedVaultItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  // UI state
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'login' | 'card' | 'note' | 'identity' | 'favorite' | 'generator' | 'audit'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<DecryptedVaultItem | null>(null);
  
  // Form states (Add / Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [itemType, setItemType] = useState<'login' | 'card' | 'note' | 'identity'>('login');
  
  // Field values
  const [formTitle, setFormTitle] = useState('');
  const [formFavorite, setFormFavorite] = useState(false);
  
  // Login fields
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginUrl, setLoginUrl] = useState('');
  
  // Card fields
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiration, setCardExpiration] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  
  // Note fields
  const [noteText, setNoteText] = useState('');
  
  // Add Dropdown open state
  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);

  // Identity fields
  const [identityFullName, setIdentityFullName] = useState('');
  const [identityType, setIdentityType] = useState('PAN');
  const [customIdentityType, setCustomIdentityType] = useState('');
  const [identityNumber, setIdentityNumber] = useState('');
  
  // Shared fields
  const [itemNotes, setItemNotes] = useState('');

  // Password Generator state
  const [genLength, setGenLength] = useState(16);
  const [genUppercase, setGenUppercase] = useState(true);
  const [genLowercase, setGenLowercase] = useState(true);
  const [genNumbers, setGenNumbers] = useState(true);
  const [genSymbols, setGenSymbols] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState('');

  // Copy toast state
  const [copyToastText, setCopyToastText] = useState('');
  const [showCopyToast, setShowCopyToast] = useState(false);

  // Field visibility mapping (itemId -> fieldKey -> boolean)
  const [visibilityMap, setVisibilityMap] = useState<Record<string, Record<string, boolean>>>({});

  // Auto-lock timer logic (15 mins of inactivity)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        handleLockVault();
      }, 900000);
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    
    resetTimer();

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      clearTimeout(timer);
    };
  }, []);

  // Check auth on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('vault_token');
    const savedEmail = localStorage.getItem('vault_user_email') || 'User';
    const savedKeyHex = sessionStorage.getItem('vault_master_key');

    if (!savedToken || !savedKeyHex) {
      router.push('/');
      return;
    }

    setToken(savedToken);
    setUserEmail(savedEmail);
    setMasterKeyHex(savedKeyHex);
    setAuthorized(true);
  }, [router]);

  // Fetch and Decrypt items once authorized and masterKeyHex is available
  useEffect(() => {
    if (!authorized || !masterKeyHex || !token) return;
    fetchAndDecryptItems();
  }, [authorized, masterKeyHex, token]);

  // Generate initial password on component load
  useEffect(() => {
    handleGeneratePassword();
  }, []);

  // Click outside to close Add Item dropdown
  useEffect(() => {
    if (!isAddDropdownOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.add-item-trigger-wrapper')) {
        setIsAddDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isAddDropdownOpen]);

  // Fetch encrypted vault items from client Local Storage and decrypt them locally
  const fetchAndDecryptItems = async () => {
    setLoadingItems(true);
    try {
      const savedEmail = localStorage.getItem('vault_user_email') || '';
      const savedUserId = localStorage.getItem('vault_user_id') || savedEmail;

      const getLocalItems = () => {
        if (typeof window === 'undefined') return [];
        const items = localStorage.getItem(`kraken_items_${savedUserId}`);
        return items ? JSON.parse(items) : [];
      };

      const localItems = getLocalItems();
      setEncryptedItems(localItems);
      
      const key = await importKeyFromHex(masterKeyHex);
      const decryptedList: DecryptedVaultItem[] = [];

      for (const item of localItems) {
        try {
          const title = await decryptData(item.title, item.titleIv, key);
          const fields = await decryptObject(item.fields, item.fieldsIv, key);
          decryptedList.push({
            id: item.id,
            type: item.type,
            title,
            favorite: item.favorite,
            fields,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            titleIv: item.titleIv,
            fieldsIv: item.fieldsIv
          });
        } catch (decErr) {
          console.error(`Failed to decrypt item ${item.id}:`, decErr);
          decryptedList.push({
            id: item.id,
            type: item.type,
            title: `[Decryption Failed] ${item.id.substring(0,6)}`,
            favorite: item.favorite,
            fields: { notes: 'Unable to decrypt data with your current key.' },
            createdAt: item.createdAt,
            updatedAt: item.updatedAt
          });
        }
      }

      setDecryptedItems(decryptedList);
    } catch (err) {
      console.error('Fetch/Decrypt items error:', err);
    } finally {
      setLoadingItems(false);
    }
  };

  // Lock Vault
  const handleLockVault = () => {
    sessionStorage.removeItem('vault_master_key');
    router.push('/');
  };

  // Sign out completely
  const handleSignOut = () => {
    localStorage.removeItem('vault_token');
    localStorage.removeItem('vault_user_email');
    localStorage.removeItem('vault_user_is_web3');
    localStorage.removeItem('vault_wallet_address');
    sessionStorage.removeItem('vault_master_key');
    router.push('/');
  };

  // Toggle field visibility
  const toggleVisibility = (itemId: string, fieldKey: string) => {
    setVisibilityMap(prev => {
      const itemMap = prev[itemId] || {};
      return {
        ...prev,
        [itemId]: {
          ...itemMap,
          [fieldKey]: !itemMap[fieldKey]
        }
      };
    });
  };

  // Copy to Clipboard
  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopyToastText(`${label} Copied!`);
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2000);
  };

  // Generate secure password
  const handleGeneratePassword = () => {
    let chars = '';
    if (genUppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (genLowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (genNumbers) chars += '0123456789';
    if (genSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (!chars) {
      setGeneratedPassword('Select options.');
      return;
    }

    let password = '';
    const array = new Uint32Array(genLength);
    crypto.getRandomValues(array);
    for (let i = 0; i < genLength; i++) {
      password += chars[array[i] % chars.length];
    }
    setGeneratedPassword(password);
  };

  // Reset Form
  const resetForm = () => {
    setFormTitle('');
    setFormFavorite(false);
    setLoginUsername('');
    setLoginPassword('');
    setLoginUrl('');
    setCardholderName('');
    setCardNumber('');
    setCardExpiration('');
    setCardCvc('');
    setNoteText('');
    setIdentityFullName('');
    setIdentityType('PAN');
    setCustomIdentityType('');
    setIdentityNumber('');
    setItemNotes('');
  };

  // Open Form for Adding New Item
  const handleOpenAddForm = (type: 'login' | 'card' | 'note' | 'identity') => {
    resetForm();
    setItemType(type);
    setFormMode('add');
    setIsFormOpen(true);
  };

  // Open Form for Editing Existing Item
  const handleOpenEditForm = (item: DecryptedVaultItem) => {
    resetForm();
    setSelectedItem(item);
    setItemType(item.type);
    setFormTitle(item.title);
    setFormFavorite(item.favorite);
    setItemNotes(item.fields.notes || '');

    if (item.type === 'login') {
      setLoginUsername(item.fields.username || '');
      setLoginPassword(item.fields.password || '');
      setLoginUrl(item.fields.url || '');
    } else if (item.type === 'card') {
      setCardholderName(item.fields.cardholderName || '');
      setCardNumber(item.fields.cardNumber || '');
      setCardExpiration(item.fields.expirationDate || '');
      setCardCvc(item.fields.cvc || '');
    } else if (item.type === 'note') {
      setNoteText(item.fields.noteText || '');
    } else if (item.type === 'identity') {
      setIdentityFullName(item.fields.fullName || '');
      const type = item.fields.identityType || 'PAN';
      if (['PAN', 'Passport', 'Aadhaar', 'SSN', 'DriversLicense'].includes(type)) {
        setIdentityType(type);
        setCustomIdentityType('');
      } else {
        setIdentityType('Other');
        setCustomIdentityType(type);
      }
      setIdentityNumber(item.fields.identityNumber || '');
    }

    setFormMode('edit');
    setIsFormOpen(true);
  };

  // Save Item (Add or Edit) - Completely Client-Side Local Storage
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    try {
      const key = await importKeyFromHex(masterKeyHex);

      let fieldsObj: any = { notes: itemNotes };
      if (itemType === 'login') {
        fieldsObj.username = loginUsername;
        fieldsObj.password = loginPassword;
        fieldsObj.url = loginUrl;
      } else if (itemType === 'card') {
        fieldsObj.cardholderName = cardholderName;
        fieldsObj.cardNumber = cardNumber;
        fieldsObj.expirationDate = cardExpiration;
        fieldsObj.cvc = cardCvc;
      } else if (itemType === 'note') {
        fieldsObj.noteText = noteText;
      } else if (itemType === 'identity') {
        fieldsObj.fullName = identityFullName;
        fieldsObj.identityType = identityType === 'Other' ? customIdentityType : identityType;
        fieldsObj.identityNumber = identityNumber;
      }

      // Encrypt Title and Fields on Client-Side
      const encryptedTitle = await encryptData(formTitle, key);
      const encryptedFields = await encryptObject(fieldsObj, key);

      const savedEmail = localStorage.getItem('vault_user_email') || '';
      const savedUserId = localStorage.getItem('vault_user_id') || savedEmail;

      const getLocalItems = () => {
        if (typeof window === 'undefined') return [];
        const items = localStorage.getItem(`kraken_items_${savedUserId}`);
        return items ? JSON.parse(items) : [];
      };

      const saveLocalItems = (items: any[]) => {
        if (typeof window === 'undefined') return;
        localStorage.setItem(`kraken_items_${savedUserId}`, JSON.stringify(items));
      };

      const localItemsList = getLocalItems();
      let savedItem: any;

      if (formMode === 'edit' && selectedItem) {
        const itemIndex = localItemsList.findIndex((item: any) => item.id === selectedItem.id);
        if (itemIndex !== -1) {
          localItemsList[itemIndex] = {
            ...localItemsList[itemIndex],
            type: itemType,
            title: encryptedTitle.ciphertext,
            titleIv: encryptedTitle.iv,
            fields: encryptedFields.ciphertext,
            fieldsIv: encryptedFields.iv,
            favorite: formFavorite,
            updatedAt: new Date().toISOString()
          };
          savedItem = localItemsList[itemIndex];
        }
      } else {
        savedItem = {
          id: Math.random().toString(36).substring(2, 15),
          userId: savedUserId,
          type: itemType,
          title: encryptedTitle.ciphertext,
          titleIv: encryptedTitle.iv,
          fields: encryptedFields.ciphertext,
          fieldsIv: encryptedFields.iv,
          favorite: formFavorite,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        localItemsList.push(savedItem);
      }

      saveLocalItems(localItemsList);

      await fetchAndDecryptItems();
      setIsFormOpen(false);
      
      if (formMode === 'edit' && selectedItem) {
        const updated = {
          id: selectedItem.id,
          type: itemType,
          title: formTitle,
          favorite: formFavorite,
          fields: fieldsObj,
          createdAt: selectedItem.createdAt,
          updatedAt: savedItem.updatedAt
        };
        setSelectedItem(updated);
      } else if (savedItem) {
        const newItem = {
          id: savedItem.id,
          type: itemType,
          title: formTitle,
          favorite: formFavorite,
          fields: fieldsObj,
          createdAt: savedItem.createdAt,
          updatedAt: savedItem.updatedAt
        };
        setSelectedItem(newItem);
      }
    } catch (err) {
      console.error('Failed to save item:', err);
      alert('Error saving vault item. Please check logs.');
    }
  };

  // Delete Vault Item - Completely Client-Side Local Storage
  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this item?')) return;

    try {
      const savedEmail = localStorage.getItem('vault_user_email') || '';
      const savedUserId = localStorage.getItem('vault_user_id') || savedEmail;

      const getLocalItems = () => {
        if (typeof window === 'undefined') return [];
        const items = localStorage.getItem(`kraken_items_${savedUserId}`);
        return items ? JSON.parse(items) : [];
      };

      const saveLocalItems = (items: any[]) => {
        if (typeof window === 'undefined') return;
        localStorage.setItem(`kraken_items_${savedUserId}`, JSON.stringify(items));
      };

      const localItemsList = getLocalItems();
      const filteredList = localItemsList.filter((item: any) => item.id !== id);

      saveLocalItems(filteredList);

      setSelectedItem(null);
      await fetchAndDecryptItems();
    } catch (err) {
      console.error('Delete item error:', err);
      alert('Error deleting item.');
    }
  };

  // Filtering items
  const filteredItems = decryptedItems.filter(item => {
    if (selectedCategory === 'login' && item.type !== 'login') return false;
    if (selectedCategory === 'card' && item.type !== 'card') return false;
    if (selectedCategory === 'note' && item.type !== 'note') return false;
    if (selectedCategory === 'identity' && item.type !== 'identity') return false;
    if (selectedCategory === 'favorite' && !item.favorite) return false;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(query);
      const matchUsername = item.fields.username?.toLowerCase().includes(query) || false;
      const matchFullName = item.fields.fullName?.toLowerCase().includes(query) || false;
      const matchNotes = item.fields.notes?.toLowerCase().includes(query) || false;
      return matchTitle || matchUsername || matchFullName || matchNotes;
    }

    return true;
  });

  // Security Audit Logic
  const getAuditResults = () => {
    const weakItems: DecryptedVaultItem[] = [];
    const reusedItems: DecryptedVaultItem[] = [];
    const passwordCounts: Record<string, number> = {};

    decryptedItems.forEach(item => {
      if (item.type === 'login' && item.fields.password) {
        const pwd = item.fields.password;
        passwordCounts[pwd] = (passwordCounts[pwd] || 0) + 1;
      }
    });

    decryptedItems.forEach(item => {
      if (item.type === 'login' && item.fields.password) {
        const pwd = item.fields.password;
        
        if (pwd.length < 10) {
          weakItems.push(item);
        }
        
        if (passwordCounts[pwd] > 1 && !reusedItems.find(i => i.id === item.id)) {
          reusedItems.push(item);
        }
      }
    });

    return { weakItems, reusedItems };
  };

  const auditResults = getAuditResults();

  if (!authorized) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <Lock size={32} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontFamily: 'var(--font-header)' }}>AUTHENTICATING KRAKEN'S VAULT...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`vault-layout text-sm show-${activeMobileView}`}>
      
      {/* Top Navbar */}
      <header className="vault-header">
        <div className="header-logo-section">
          <button 
            onClick={() => setActiveMobileView(activeMobileView === 'sidebar' ? 'list' : 'sidebar')}
            className="mobile-nav-toggle-btn"
            title="Toggle Sidebar"
          >
            <Menu size={18} />
          </button>
          <ShieldCheck size={26} style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
          <div className="details-title-wrapper">
            <h1 className="header-logo-text font-copperplate">Kraken's Vault</h1>
            <p className="header-logo-subtitle">Zero-Knowledge Encrypted</p>
          </div>
        </div>

        <div className="header-actions">
          <div className="user-profile">
            <span className="user-email">{userEmail}</span>
            <span className="user-key-type standard">Secure Vault Active</span>
          </div>

          <div className="header-divider" />

          <button 
            onClick={handleLockVault} 
            title="Lock Vault"
            className="header-btn"
          >
            <Lock size={16} />
          </button>
          
          <button 
            onClick={handleSignOut} 
            title="Log Out"
            className="header-btn"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Workspace with floating panels */}
      <div className="vault-main">
        
        {/* Left Sidebar (Floating curved card) */}
        <motion.aside 
          className="vault-sidebar"
          custom={0}
          initial="hidden"
          animate="visible"
          variants={panelEntrance}
        >
          <div className="sidebar-action">
            <div className="add-item-trigger-wrapper">
              <button 
                type="button" 
                onClick={() => setIsAddDropdownOpen(!isAddDropdownOpen)}
                className="add-item-btn"
              >
                <Plus size={15} />
                <span>Add Item</span>
              </button>
              
              <AnimatePresence>
                {isAddDropdownOpen && (
                  <motion.div 
                    className="add-item-dropdown"
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
                  >
                    <button 
                      onClick={() => { handleOpenAddForm('login'); setIsAddDropdownOpen(false); }}
                      className="dropdown-item"
                    >
                      <Key size={13} style={{ color: 'var(--accent-emerald)' }} />
                      <span>Login</span>
                    </button>
                    <button 
                      onClick={() => { handleOpenAddForm('card'); setIsAddDropdownOpen(false); }}
                      className="dropdown-item"
                    >
                      <CreditCard size={13} style={{ color: 'var(--accent-emerald)' }} />
                      <span>Card</span>
                    </button>
                    <button 
                      onClick={() => { handleOpenAddForm('note'); setIsAddDropdownOpen(false); }}
                      className="dropdown-item"
                    >
                      <FileText size={13} style={{ color: 'var(--accent-emerald)' }} />
                      <span>Secure Note</span>
                    </button>
                    <button 
                      onClick={() => { handleOpenAddForm('identity'); setIsAddDropdownOpen(false); }}
                      className="dropdown-item"
                    >
                      <User size={13} style={{ color: 'var(--accent-emerald)' }} />
                      <span>Identity (PAN/ID)</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-section-title">Categories</div>
            
            <button 
              onClick={() => { setSelectedCategory('all'); setSelectedItem(null); setIsFormOpen(false); setActiveMobileView('list'); }}
              className={`nav-item ${selectedCategory === 'all' ? 'active' : ''}`}
            >
              <Folder size={15} />
              <span>All Items</span>
            </button>
            
            <button 
              onClick={() => { setSelectedCategory('login'); setSelectedItem(null); setIsFormOpen(false); setActiveMobileView('list'); }}
              className={`nav-item ${selectedCategory === 'login' ? 'active' : ''}`}
            >
              <Key size={15} />
              <span>Logins</span>
            </button>

            <button 
              onClick={() => { setSelectedCategory('card'); setSelectedItem(null); setIsFormOpen(false); setActiveMobileView('list'); }}
              className={`nav-item ${selectedCategory === 'card' ? 'active' : ''}`}
            >
              <CreditCard size={15} />
              <span>Cards</span>
            </button>

            <button 
              onClick={() => { setSelectedCategory('note'); setSelectedItem(null); setIsFormOpen(false); setActiveMobileView('list'); }}
              className={`nav-item ${selectedCategory === 'note' ? 'active' : ''}`}
            >
              <FileText size={15} />
              <span>Secure Notes</span>
            </button>

            <button 
              onClick={() => { setSelectedCategory('identity'); setSelectedItem(null); setIsFormOpen(false); setActiveMobileView('list'); }}
              className={`nav-item ${selectedCategory === 'identity' ? 'active' : ''}`}
            >
              <User size={15} />
              <span>Identities (PAN)</span>
            </button>

            <div className="form-divider" style={{ margin: '0.6rem 0' }} />
            <div className="nav-section-title">Filters & Utilities</div>

            <button 
              onClick={() => { setSelectedCategory('favorite'); setSelectedItem(null); setIsFormOpen(false); setActiveMobileView('list'); }}
              className={`nav-item ${selectedCategory === 'favorite' ? 'active' : ''}`}
            >
              <Star size={15} style={{ color: 'var(--accent-warning)' }} />
              <span>Favorites</span>
            </button>

            <button 
              onClick={() => { setSelectedCategory('generator'); setSelectedItem(null); setIsFormOpen(false); setActiveMobileView('details'); }}
              className={`nav-item ${selectedCategory === 'generator' ? 'active' : ''}`}
            >
              <RefreshCw size={15} />
              <span>Password Generator</span>
            </button>

            <button 
              onClick={() => { setSelectedCategory('audit'); setSelectedItem(null); setIsFormOpen(false); setActiveMobileView('details'); }}
              className={`nav-item ${selectedCategory === 'audit' ? 'active' : ''}`}
            >
              <ShieldAlert size={15} style={{ color: (auditResults.weakItems.length > 0 || auditResults.reusedItems.length > 0) ? 'var(--accent-red)' : 'var(--text-secondary)' }} />
              <span>Security Audit</span>
            </button>
          </nav>
        </motion.aside>

        {/* Middle Pane: Items list (Floating curved card) */}
        <motion.section 
          className="items-panel"
          custom={1}
          initial="hidden"
          animate="visible"
          variants={panelEntrance}
        >
          {selectedCategory !== 'generator' && selectedCategory !== 'audit' && (
            <div className="search-container">
              <div className="input-wrapper">
                <span className="input-icon"><Search size={13} /></span>
                <input 
                  type="text"
                  placeholder="Search vault..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field"
                  style={{ padding: '0.45rem 0.75rem 0.45rem 2.2rem', fontSize: '0.78rem' }}
                />
              </div>
            </div>
          )}

          <div className="items-list-container">
            {selectedCategory === 'generator' && (
              <div className="list-loading">Password Generator active.</div>
            )}
            {selectedCategory === 'audit' && (
              <div className="list-loading">Security audit active.</div>
            )}
            
            {selectedCategory !== 'generator' && selectedCategory !== 'audit' && (
              <>
                {loadingItems ? (
                  <div className="list-loading">Loading items...</div>
                ) : filteredItems.length === 0 ? (
                  <div className="list-empty">No items found.</div>
                ) : (
                  <motion.div 
                    initial="hidden"
                    animate="visible"
                    variants={itemStagger}
                  >
                    {filteredItems.map(item => (
                      <motion.button
                        key={item.id}
                        type="button"
                        onClick={() => { setSelectedItem(item); setIsFormOpen(false); setActiveMobileView('details'); }}
                        className={`list-item ${selectedItem?.id === item.id ? 'selected' : ''}`}
                        variants={listItemVariants}
                        whileHover={{ x: 3 }}
                      >
                        <span className="item-icon-wrapper">
                          {item.type === 'login' && <Key size={15} style={{ color: 'var(--accent-emerald)' }} />}
                          {item.type === 'card' && <CreditCard size={15} style={{ color: 'var(--accent-emerald)' }} />}
                          {item.type === 'note' && <FileText size={15} style={{ color: 'var(--accent-emerald)' }} />}
                          {item.type === 'identity' && <User size={15} style={{ color: 'var(--accent-emerald)' }} />}
                        </span>
                        <div className="item-info">
                          <h4 className="item-title font-copperplate">{item.title}</h4>
                          <p className="item-subtitle">
                            {item.type === 'login' && (item.fields.username || 'No username')}
                            {item.type === 'card' && (item.fields.cardNumber ? `•••• ${item.fields.cardNumber.replace(/\s+/g, '').slice(-4)}` : 'No card number')}
                            {item.type === 'note' && 'Secure Note'}
                            {item.type === 'identity' && `${item.fields.identityType || 'ID'}: ${item.fields.identityNumber || 'No number'}`}
                          </p>
                        </div>
                        {item.favorite && (
                          <Star size={11} className="item-favorite-star" />
                        )}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </>
            )}
          </div>
        </motion.section>

        {/* Right Pane: Details or Utilities (Floating curved card) */}
        <motion.main 
          className="details-pane"
          custom={2}
          initial="hidden"
          animate="visible"
          variants={panelEntrance}
        >
          <div className="details-content-wrapper">
            <AnimatePresence mode="wait">
              
              {/* Category: Generator view */}
              {selectedCategory === 'generator' && (
                <motion.div 
                  key="generator"
                  className="generator-card"
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={detailsTransition}
                >
                  <div className="details-header" style={{ borderBottom: 'none', marginBottom: '0.5rem', paddingBottom: 0, height: 'auto' }}>
                    <button 
                      onClick={() => setActiveMobileView('list')}
                      className="mobile-back-btn"
                      title="Back to List"
                    >
                      <ArrowLeft size={16} />
                      <span>Back</span>
                    </button>
                  </div>
                  <h2 className="form-card-title font-copperplate" style={{ marginBottom: '0.25rem' }}>Secure Password Generator</h2>
                  <p className="details-type-badge" style={{ marginBottom: '1.25rem', textTransform: 'none' }}>Create highly secure, customizable, random passwords client-side.</p>
                  
                  <div className="generator-display-row">
                    <input 
                      type="text" 
                      readOnly 
                      value={generatedPassword}
                      className="generator-input"
                    />
                    <motion.button 
                      type="button"
                      onClick={() => copyToClipboard(generatedPassword, 'Password')}
                      className="generator-action-btn copy"
                      title="Copy Password"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Copy size={16} />
                    </motion.button>
                    <motion.button 
                      type="button"
                      onClick={handleGeneratePassword}
                      className="generator-action-btn"
                      title="Regenerate"
                      whileHover={{ rotate: 180 }}
                      transition={{ duration: 0.3 }}
                    >
                      <RefreshCw size={16} />
                    </motion.button>
                  </div>

                  <div className="generator-settings-list">
                    <div className="generator-setting-row">
                      <span style={{ fontWeight: 600 }}>Password Length: {genLength}</span>
                      <input 
                        type="range" 
                        min="8" 
                        max="64"
                        value={genLength} 
                        onChange={(e) => { setGenLength(parseInt(e.target.value)); setTimeout(handleGeneratePassword, 50); }}
                        className="generator-slider"
                      />
                    </div>

                    <div className="generator-checkbox-grid">
                      <label className="generator-checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={genUppercase} 
                          onChange={(e) => { setGenUppercase(e.target.checked); setTimeout(handleGeneratePassword, 50); }}
                        />
                        <span>Uppercase (A-Z)</span>
                      </label>
                      <label className="generator-checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={genLowercase} 
                          onChange={(e) => { setGenLowercase(e.target.checked); setTimeout(handleGeneratePassword, 50); }}
                        />
                        <span>Lowercase (a-z)</span>
                      </label>
                      <label className="generator-checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={genNumbers} 
                          onChange={(e) => { setGenNumbers(e.target.checked); setTimeout(handleGeneratePassword, 50); }}
                        />
                        <span>Numbers (0-9)</span>
                      </label>
                      <label className="generator-checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={genSymbols} 
                          onChange={(e) => { setGenSymbols(e.target.checked); setTimeout(handleGeneratePassword, 50); }}
                        />
                        <span>Symbols (!@#...)</span>
                      </label>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Category: Security Audit view */}
              {selectedCategory === 'audit' && (
                <motion.div 
                  key="audit"
                  className="audit-container"
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={detailsTransition}
                >
                  <div className="details-header" style={{ borderBottom: 'none', marginBottom: '0.5rem', paddingBottom: 0, height: 'auto' }}>
                    <button 
                      onClick={() => setActiveMobileView('list')}
                      className="mobile-back-btn"
                      title="Back to List"
                    >
                      <ArrowLeft size={16} />
                      <span>Back</span>
                    </button>
                  </div>
                  <h2 className="form-card-title font-copperplate" style={{ marginBottom: '0.25rem' }}>Security Audit Report</h2>
                  <p className="details-type-badge" style={{ marginBottom: '1.25rem', textTransform: 'none' }}>Evaluates login credentials locally for weaknesses and duplicates.</p>

                  <div className="audit-cards-grid">
                    <div className="audit-metric-card red">
                      <div className="audit-metric-header red">
                        <ShieldAlert size={18} />
                        <h4 className="audit-metric-title">Weak Passwords</h4>
                      </div>
                      <p className="audit-metric-subtitle">Passwords under 10 characters</p>
                      <div className="audit-metric-value red">
                        {auditResults.weakItems.length}
                      </div>
                    </div>

                    <div className="audit-metric-card warning">
                      <div className="audit-metric-header warning">
                        <AlertCircle size={18} />
                        <h4 className="audit-metric-title">Reused Passwords</h4>
                      </div>
                      <p className="audit-metric-subtitle">Duplicate passwords in logins</p>
                      <div className="audit-metric-value warning">
                        {auditResults.reusedItems.length}
                      </div>
                    </div>
                  </div>

                  {/* Weak Passwords details */}
                  {auditResults.weakItems.length > 0 && (
                    <div className="audit-detail-card">
                      <h3 className="audit-detail-card-title red">Weak Passwords</h3>
                      <div className="audit-items-list">
                        {auditResults.weakItems.map(item => (
                          <div key={item.id} className="audit-item-row">
                            <div className="audit-item-info">
                              <span className="audit-item-title">{item.title}</span>
                              <span className="audit-item-subtitle">{item.fields.username || 'No username'}</span>
                            </div>
                            <button 
                              type="button"
                              onClick={() => { setSelectedItem(item); handleOpenEditForm(item); }}
                              className="audit-fix-btn red"
                            >
                              Fix
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reused Passwords details */}
                  {auditResults.reusedItems.length > 0 && (
                    <div className="audit-detail-card">
                      <h3 className="audit-detail-card-title warning">Reused Passwords</h3>
                      <div className="audit-items-list">
                        {auditResults.reusedItems.map(item => (
                          <div key={item.id} className="audit-item-row">
                            <div className="audit-item-info">
                              <span className="audit-item-title">{item.title}</span>
                              <span className="audit-item-subtitle">{item.fields.username || 'No username'}</span>
                            </div>
                            <button 
                              type="button"
                              onClick={() => { setSelectedItem(item); handleOpenEditForm(item); }}
                              className="audit-fix-btn warning"
                            >
                              Change
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {auditResults.weakItems.length === 0 && auditResults.reusedItems.length === 0 && (
                    <div className="audit-detail-card">
                      <div className="audit-perfect-score">
                        <ShieldCheck size={40} style={{ color: 'var(--accent-emerald)', marginBottom: '0.5rem' }} />
                        <p style={{ fontWeight: 700, fontSize: '0.9rem', fontFamily: 'var(--font-header)' }}>Perfect Security Score!</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>No weak or reused passwords detected in your vault.</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Details card content (for selected item) */}
              {selectedCategory !== 'generator' && selectedCategory !== 'audit' && selectedItem && (
                <motion.div 
                  key={selectedItem.id}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={detailsTransition}
                  style={{ width: '100%', height: '100%' }}
                >
                  <div className="details-header">
                    <button 
                      onClick={() => setActiveMobileView('list')}
                      className="mobile-back-btn"
                      title="Back to List"
                    >
                      <ArrowLeft size={16} />
                      <span>Back</span>
                    </button>
                    <div className="details-title-area">
                      <span className="details-type-icon">
                        {selectedItem.type === 'login' && <Key size={18} />}
                        {selectedItem.type === 'card' && <CreditCard size={18} />}
                        {selectedItem.type === 'note' && <FileText size={18} />}
                        {selectedItem.type === 'identity' && <User size={18} />}
                      </span>
                      <div className="details-title-wrapper">
                        <h2 className="details-title font-copperplate">
                          {selectedItem.title}
                          {selectedItem.favorite && <Star size={13} style={{ color: 'var(--accent-warning)', fill: 'var(--accent-warning)', marginLeft: '4px' }} />}
                        </h2>
                        <span className="details-type-badge">{selectedItem.type}</span>
                      </div>
                    </div>

                    <div className="details-actions">
                      <button 
                        onClick={() => handleOpenEditForm(selectedItem)}
                        className="details-btn"
                        title="Edit Item"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button 
                        onClick={() => handleDeleteItem(selectedItem.id)}
                        className="details-btn delete"
                        title="Delete Item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="details-fields-list animate-fade-in">
                    
                    {/* LOGIN Fields */}
                    {selectedItem.type === 'login' && (
                      <>
                        <div className="fields-grid-row">
                          <div className="details-field-group">
                            <span className="details-field-label">Username</span>
                            <div className="details-field-row">
                              <span className="details-field-value">{selectedItem.fields.username || '—'}</span>
                              {selectedItem.fields.username && (
                                <div className="details-field-actions">
                                  <button 
                                    onClick={() => copyToClipboard(selectedItem.fields.username, 'Username')}
                                    className="field-action-btn"
                                    title="Copy Username"
                                  >
                                    <Copy size={13} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="details-field-group">
                            <span className="details-field-label">Password</span>
                            <div className="details-field-row">
                              <span className="details-field-value mono">
                                {visibilityMap[selectedItem.id]?.password ? selectedItem.fields.password : '••••••••••••'}
                              </span>
                              <div className="details-field-actions">
                                <button 
                                  onClick={() => toggleVisibility(selectedItem.id, 'password')}
                                  className="field-action-btn"
                                  title="Show/Hide Password"
                                >
                                  {visibilityMap[selectedItem.id]?.password ? <EyeOff size={13} /> : <Eye size={13} />}
                                </button>
                                {selectedItem.fields.password && (
                                  <button 
                                    onClick={() => copyToClipboard(selectedItem.fields.password, 'Password')}
                                    className="field-action-btn"
                                    title="Copy Password"
                                  >
                                    <Copy size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {selectedItem.fields.url && (
                          <div className="details-field-group">
                            <span className="details-field-label">Website URL</span>
                            <div className="details-field-row">
                              <a 
                                href={selectedItem.fields.url.startsWith('http') ? selectedItem.fields.url : `https://${selectedItem.fields.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="details-field-value animate-fade-in"
                                style={{ color: 'var(--accent-emerald)', textDecoration: 'underline' }}
                              >
                                {selectedItem.fields.url}
                              </a>
                              <div className="details-field-actions">
                                <button 
                                  onClick={() => copyToClipboard(selectedItem.fields.url, 'URL')}
                                  className="field-action-btn"
                                  title="Copy URL"
                                >
                                  <Copy size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* CARD Fields */}
                    {selectedItem.type === 'card' && (
                      <>
                        <div className="details-field-group">
                          <span className="details-field-label">Cardholder Name</span>
                          <div className="details-field-row">
                            <span className="details-field-value">{selectedItem.fields.cardholderName || '—'}</span>
                            {selectedItem.fields.cardholderName && (
                              <div className="details-field-actions">
                                <button 
                                  onClick={() => copyToClipboard(selectedItem.fields.cardholderName, 'Cardholder Name')}
                                  className="field-action-btn"
                                >
                                  <Copy size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="fields-grid-row">
                          <div className="details-field-group">
                            <span className="details-field-label">Card Number</span>
                            <div className="details-field-row">
                              <span className="details-field-value mono">
                                {visibilityMap[selectedItem.id]?.cardNumber 
                                  ? selectedItem.fields.cardNumber 
                                  : selectedItem.fields.cardNumber ? `•••• •••• •••• ${selectedItem.fields.cardNumber.replace(/\s+/g, '').slice(-4)}` : '—'}
                              </span>
                              <div className="details-field-actions">
                                <button 
                                  onClick={() => toggleVisibility(selectedItem.id, 'cardNumber')}
                                  className="field-action-btn"
                                >
                                  {visibilityMap[selectedItem.id]?.cardNumber ? <EyeOff size={13} /> : <Eye size={13} />}
                                </button>
                                {selectedItem.fields.cardNumber && (
                                  <button 
                                    onClick={() => copyToClipboard(selectedItem.fields.cardNumber.replace(/\s+/g, ''), 'Card Number')}
                                    className="field-action-btn"
                                  >
                                    <Copy size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="details-field-group">
                            <span className="details-field-label">Expiration / CVC</span>
                            <div className="details-field-row">
                              <span className="details-field-value mono">
                                {selectedItem.fields.expirationDate || '—'} / {visibilityMap[selectedItem.id]?.cvc ? selectedItem.fields.cvc : '•••'}
                              </span>
                              <div className="details-field-actions">
                                <button 
                                  onClick={() => toggleVisibility(selectedItem.id, 'cvc')}
                                  className="field-action-btn"
                                >
                                  {visibilityMap[selectedItem.id]?.cvc ? <EyeOff size={13} /> : <Eye size={13} />}
                                </button>
                                {selectedItem.fields.cvc && (
                                  <button 
                                    onClick={() => copyToClipboard(selectedItem.fields.cvc, 'CVC')}
                                    className="field-action-btn"
                                  >
                                    <Copy size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* SECURE NOTE Fields */}
                    {selectedItem.type === 'note' && (
                      <div className="note-textarea-display animate-fade-in">
                        {selectedItem.fields.noteText || 'Empty note.'}
                      </div>
                    )}

                    {/* IDENTITY Fields */}
                    {selectedItem.type === 'identity' && (
                      <>
                        <div className="details-field-group">
                          <span className="details-field-label">Full Name</span>
                          <div className="details-field-row">
                            <span className="details-field-value">{selectedItem.fields.fullName || '—'}</span>
                            {selectedItem.fields.fullName && (
                              <div className="details-field-actions">
                                <button 
                                  onClick={() => copyToClipboard(selectedItem.fields.fullName, 'Full Name')}
                                  className="field-action-btn"
                                >
                                  <Copy size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="fields-grid-row">
                          <div className="details-field-group">
                            <span className="details-field-label">Document Type</span>
                            <div className="details-field-row">
                              <span className="details-field-value">{selectedItem.fields.identityType || 'PAN Card'}</span>
                            </div>
                          </div>

                          <div className="details-field-group">
                            <span className="details-field-label">Document ID / PAN Number</span>
                            <div className="details-field-row">
                              <span className="details-field-value mono" style={{ textTransform: 'uppercase' }}>
                                {visibilityMap[selectedItem.id]?.identityNumber ? selectedItem.fields.identityNumber : '••••••••••'}
                              </span>
                              <div className="details-field-actions">
                                <button 
                                  onClick={() => toggleVisibility(selectedItem.id, 'identityNumber')}
                                  className="field-action-btn"
                                >
                                  {visibilityMap[selectedItem.id]?.identityNumber ? <EyeOff size={13} /> : <Eye size={13} />}
                                </button>
                                {selectedItem.fields.identityNumber && (
                                  <button 
                                    onClick={() => copyToClipboard(selectedItem.fields.identityNumber, 'Document ID')}
                                    className="field-action-btn"
                                  >
                                    <Copy size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Extra Notes */}
                    {selectedItem.type !== 'note' && selectedItem.fields.notes && (
                      <div className="details-field-group">
                        <span className="details-field-label">Notes</span>
                        <span className="details-field-value" style={{ fontWeight: 500, fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                          {selectedItem.fields.notes}
                        </span>
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="details-timestamps">
                      <span>Created: {new Date(selectedItem.createdAt).toLocaleString()}</span>
                      <span>Updated: {new Date(selectedItem.updatedAt).toLocaleString()}</span>
                    </div>

                  </div>
                </motion.div>
              )}

              {/* Blank state if nothing selected */}
              {selectedCategory !== 'generator' && selectedCategory !== 'audit' && !selectedItem && (
                <motion.div 
                  key="blank"
                  className="details-blank-state"
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={detailsTransition}
                >
                  <div className="details-header" style={{ borderBottom: 'none', position: 'absolute', top: 0, left: 0, right: 0, height: 'auto', padding: '1rem' }}>
                    <button 
                      onClick={() => setActiveMobileView('list')}
                      className="mobile-back-btn"
                      title="Back to List"
                    >
                      <ArrowLeft size={16} />
                      <span>Back</span>
                    </button>
                  </div>
                  <div className="blank-state-content">
                    <Lock size={40} className="blank-state-icon" />
                    <h3 className="blank-state-title font-copperplate">Vault Secured</h3>
                    <p className="blank-state-desc">
                      Credentials are encrypted locally in your sandbox database. 
                      Select an item from the list to decrypt, or click 
                      "Add Item" to store new credentials.
                    </p>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </motion.main>
      </div>

      {/* POPUP MODAL FOR ADD / EDIT FORMS */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div 
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="form-card"
              initial={{ y: 30, scale: 0.96, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 30, scale: 0.96, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            >
              <button 
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="form-close-btn"
              >
                <X size={16} />
              </button>

              <h2 className="form-card-title font-copperplate">
                {formMode === 'add' ? `Add ${itemType.toUpperCase()}` : `Edit ${formTitle}`}
              </h2>

              <form onSubmit={handleSaveItem} className="vault-form">
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Title</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Google Login, HDFC Credit Card, PAN Card"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ justifyContent: 'center', paddingTop: '1.25rem' }}>
                    <label className="form-checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={formFavorite} 
                        onChange={(e) => setFormFavorite(e.target.checked)}
                      />
                      <span>Mark as Favorite</span>
                    </label>
                  </div>
                </div>

                {/* Login Form Fields */}
                {itemType === 'login' && (
                  <>
                    <div className="form-divider" />
                    <div className="form-group">
                      <label className="form-label">Username</label>
                      <input 
                        type="text"
                        placeholder="Email or Username"
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Password</label>
                      <div className="form-input-action-row">
                        <input 
                          type="text"
                          placeholder="Password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="form-input"
                          style={{ fontFamily: 'monospace' }}
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
                            let password = '';
                            const array = new Uint32Array(16);
                            crypto.getRandomValues(array);
                            for (let i = 0; i < 16; i++) {
                              password += chars[array[i] % chars.length];
                            }
                            setLoginPassword(password);
                          }}
                          className="form-input-inline-btn"
                        >
                          Generate
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">URL</label>
                      <input 
                        type="text"
                        placeholder="https://accounts.google.com"
                        value={loginUrl}
                        onChange={(e) => setLoginUrl(e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </>
                )}

                {/* Card Form Fields */}
                {itemType === 'card' && (
                  <>
                    <div className="form-divider" />
                    <div className="form-group">
                      <label className="form-label">Cardholder Name</label>
                      <input 
                        type="text"
                        placeholder="Name on card"
                        value={cardholderName}
                        onChange={(e) => setCardholderName(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group" style={{ flexGrow: 2 }}>
                        <label className="form-label">Card Number</label>
                        <input 
                          type="text"
                          placeholder="e.g. 1234 5678 9876 5432"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="form-input"
                          style={{ fontFamily: 'monospace' }}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label className="form-label">Expiry / CVC</label>
                        <div className="form-input-action-row">
                          <input 
                            type="text"
                            placeholder="MM/YY"
                            value={cardExpiration}
                            onChange={(e) => setCardExpiration(e.target.value)}
                            className="form-input"
                            style={{ textAlign: 'center', fontFamily: 'monospace' }}
                          />
                          <input 
                            type="text"
                            placeholder="CVC"
                            value={cardCvc}
                            onChange={(e) => setCardCvc(e.target.value)}
                            className="form-input"
                            style={{ textAlign: 'center', fontFamily: 'monospace' }}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Note Form Fields */}
                {itemType === 'note' && (
                  <>
                    <div className="form-divider" />
                    <div className="form-group">
                      <label className="form-label">Note Content</label>
                      <textarea 
                        rows={6}
                        placeholder="Write your secret notes here..."
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        className="form-input textarea"
                      />
                    </div>
                  </>
                )}

                {/* Identity Form Fields */}
                {itemType === 'identity' && (
                  <>
                    <div className="form-divider" />
                    <div className="form-group">
                      <label className="form-label">Full Name</label>
                      <input 
                        type="text"
                        placeholder="Full Name as on Document"
                        value={identityFullName}
                        onChange={(e) => setIdentityFullName(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Document Type</label>
                        <select 
                          value={identityType}
                          onChange={(e) => {
                            setIdentityType(e.target.value);
                            if (e.target.value !== 'Other') {
                              setCustomIdentityType('');
                            }
                          }}
                          className="form-select"
                        >
                          <option value="PAN">PAN Card</option>
                          <option value="Passport">Passport</option>
                          <option value="Aadhaar">Aadhaar Card</option>
                          <option value="SSN">SSN</option>
                          <option value="DriversLicense">Driver's License</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      {identityType === 'Other' && (
                        <div className="form-group">
                          <label className="form-label">Specify Document Type</label>
                          <input 
                            type="text"
                            required
                            placeholder="e.g. Health ID, Library Card"
                            value={customIdentityType}
                            onChange={(e) => setCustomIdentityType(e.target.value)}
                            className="form-input"
                          />
                        </div>
                      )}
                      
                      <div className="form-group" style={{ flexGrow: 2 }}>
                        <label className="form-label">Document / ID Number</label>
                        <input 
                          type="text"
                          placeholder="e.g. ABCDE1234F, Passport No, etc."
                          value={identityNumber}
                          onChange={(e) => setIdentityNumber(e.target.value)}
                          className="form-input"
                          style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Notes (shared field except note type) */}
                {itemType !== 'note' && (
                  <div className="form-group">
                    <label className="form-label">Extra Notes</label>
                    <textarea 
                      rows={3}
                      placeholder="Any additional details..."
                      value={itemNotes}
                      onChange={(e) => setItemNotes(e.target.value)}
                      className="form-input textarea"
                    />
                  </div>
                )}

                <div className="form-actions">
                  <button 
                    type="button" 
                    onClick={() => setIsFormOpen(false)}
                    className="form-cancel-btn"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="form-save-btn"
                  >
                    <Save size={13} />
                    <span>Save Item</span>
                  </button>
                </div>

              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Copy Alert Toast */}
      <AnimatePresence>
        {showCopyToast && (
          <motion.div 
            className="copy-toast"
            initial={{ y: 25, x: '-50%', opacity: 0 }}
            animate={{ y: 0, x: '-50%', opacity: 1 }}
            exit={{ y: -20, x: '-50%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 240 }}
          >
            {copyToastText}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
