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
  ArrowLeft,
  Palette
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  importKeyFromHex, 
  encryptData, 
  encryptObject, 
  decryptData, 
  decryptObject 
} from '@/lib/crypto';
import { getItems, saveItem, deleteItem } from '@/lib/indexedDb';

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

  // 3D Flip Card state for in-place editing
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Delete Confirmation modal state
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  // Mobile viewport state for responsive layout switching
  const [activeMobileView, setActiveMobileView] = useState<'sidebar' | 'list' | 'details'>('list');

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

  // Details Visual popup state
  const [isDetailPopupOpen, setIsDetailPopupOpen] = useState(false);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rX = -(y - centerY) / 8; // Max ~12 degrees
    const rY = (x - centerX) / 8;
    setRotateX(rX);
    setRotateY(rY);
  };

  const handleCardMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };
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

  // Click outside to unflip card
  useEffect(() => {
    if (!flippedCardId) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.flip-card')) {
        setFlippedCardId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [flippedCardId]);

  // Fetch encrypted vault items from client IndexedDB and decrypt them locally
  const fetchAndDecryptItems = async () => {
    setLoadingItems(true);
    try {
      const savedEmail = localStorage.getItem('vault_user_email') || '';
      const savedUserId = localStorage.getItem('vault_user_id') || savedEmail;

      // Migrate items from localStorage to IndexedDB if they exist
      const legacyItemsStr = localStorage.getItem(`kraken_items_${savedUserId}`);
      if (legacyItemsStr) {
        try {
          const legacyItems = JSON.parse(legacyItemsStr);
          for (const item of legacyItems) {
            await saveItem(item);
          }
          localStorage.removeItem(`kraken_items_${savedUserId}`);
          console.log(`Migrated ${legacyItems.length} items to IndexedDB`);
        } catch (migErr) {
          console.error('Failed to migrate items from localStorage:', migErr);
        }
      }

      const dbItems = await getItems(savedUserId);
      setEncryptedItems(dbItems);
      
      const key = await importKeyFromHex(masterKeyHex);
      const decryptedList: DecryptedVaultItem[] = [];

      for (const item of dbItems) {
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

  // Flip card to edit in-place
  const handleFlipToEdit = (item: DecryptedVaultItem) => {
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
    setFlippedCardId(item.id);
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

  // Save Item (Add or Edit) - Completely Client-Side IndexedDB
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

      const updatedAt = new Date().toISOString();
      let finalItem: any;

      if (formMode === 'edit' && selectedItem) {
        finalItem = {
          id: selectedItem.id,
          userId: savedUserId,
          type: itemType,
          title: encryptedTitle.ciphertext,
          titleIv: encryptedTitle.iv,
          fields: encryptedFields.ciphertext,
          fieldsIv: encryptedFields.iv,
          favorite: formFavorite,
          createdAt: selectedItem.createdAt,
          updatedAt: updatedAt
        };
      } else {
        finalItem = {
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
      }

      // Save to IndexedDB
      await saveItem(finalItem);

      await fetchAndDecryptItems();
      setIsFormOpen(false);
      setFlippedCardId(null);
      
      const updated = {
        id: finalItem.id,
        type: itemType,
        title: formTitle,
        favorite: formFavorite,
        fields: fieldsObj,
        createdAt: finalItem.createdAt,
        updatedAt: finalItem.updatedAt
      };
      setSelectedItem(updated);
    } catch (err) {
      console.error('Failed to save item:', err);
      alert('Error saving vault item. Please check logs.');
    }
  };

  // Save Item for Flipped Card - Completely Client-Side IndexedDB
  const handleSaveFlippedItem = async (e: React.FormEvent, item: DecryptedVaultItem) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    try {
      const key = await importKeyFromHex(masterKeyHex);

      let fieldsObj: any = { notes: itemNotes };
      if (item.type === 'login') {
        fieldsObj.username = loginUsername;
        fieldsObj.password = loginPassword;
        fieldsObj.url = loginUrl;
      } else if (item.type === 'card') {
        fieldsObj.cardholderName = cardholderName;
        fieldsObj.cardNumber = cardNumber;
        fieldsObj.expirationDate = cardExpiration;
        fieldsObj.cvc = cardCvc;
      } else if (item.type === 'note') {
        fieldsObj.noteText = noteText;
      } else if (item.type === 'identity') {
        fieldsObj.fullName = identityFullName;
        fieldsObj.identityType = identityType === 'Other' ? customIdentityType : identityType;
        fieldsObj.identityNumber = identityNumber;
      }

      // Encrypt Title and Fields on Client-Side
      const encryptedTitle = await encryptData(formTitle, key);
      const encryptedFields = await encryptObject(fieldsObj, key);

      const savedEmail = localStorage.getItem('vault_user_email') || '';
      const savedUserId = localStorage.getItem('vault_user_id') || savedEmail;

      const updatedAt = new Date().toISOString();
      
      const finalItem = {
        id: item.id, // Explicitly use the mapped item's original ID!
        userId: savedUserId,
        type: item.type,
        title: encryptedTitle.ciphertext,
        titleIv: encryptedTitle.iv,
        fields: encryptedFields.ciphertext,
        fieldsIv: encryptedFields.iv,
        favorite: formFavorite,
        createdAt: item.createdAt,
        updatedAt: updatedAt
      };

      // Save to IndexedDB
      await saveItem(finalItem);

      await fetchAndDecryptItems();
      setFlippedCardId(null);
      
      const updated = {
        id: finalItem.id,
        type: item.type,
        title: formTitle,
        favorite: formFavorite,
        fields: fieldsObj,
        createdAt: finalItem.createdAt,
        updatedAt: finalItem.updatedAt
      };
      setSelectedItem(updated);
    } catch (err) {
      console.error('Failed to save item:', err);
      alert('Error saving vault item. Please check logs.');
    }
  };

  // Delete Vault Item - Completely Client-Side IndexedDB
  const handleDeleteItem = (id: string) => {
    setDeleteItemId(id);
  };

  const confirmDelete = async (id: string) => {
    try {
      await deleteItem(id);
      setSelectedItem(null);
      setDeleteItemId(null);
      setFlippedCardId(null);
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
          <img 
            src="/logo.png" 
            alt="Kraken logo" 
            style={{ 
              width: '42px', 
              height: '56px', 
              objectFit: 'contain',
              flexShrink: 0,
              filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.2))'
            }} 
          />
          <div className="details-title-wrapper">
            <motion.h1 
              className="header-logo-text font-copperplate kraken-glow"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ 
                scale: 1.08, 
                y: -2, 
                transition: { type: 'spring', stiffness: 400, damping: 10 } 
              }}
              style={{ cursor: 'pointer', originX: 0 }}
            >
              Kraken's Vault
            </motion.h1>
            <p className="header-logo-subtitle">Client-Side Encrypted</p>
          </div>
        </div>

        <div className="header-actions">
          <div className="user-profile">
            <span className="user-email">User</span>
            <span className="user-key-type standard">Secure Vault Active</span>
          </div>

          <div style={{ display: 'flex', gap: '0.2rem', background: 'rgba(255, 255, 255, 0.08)', padding: '0.15rem', borderRadius: '999px', border: '1px solid rgba(255, 255, 255, 0.12)', marginRight: '0.5rem' }}>
            <button 
              type="button"
              onClick={() => { if (theme !== 'theme-ocean') toggleTheme(); }}
              style={{
                padding: '0.2rem 0.5rem',
                fontSize: '0.6rem',
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
                padding: '0.2rem 0.5rem',
                fontSize: '0.6rem',
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

            {/* Removed Filters & Utilities */}
          </nav>
        </motion.aside>

        {/* Middle Pane: Items list (Floating curved card) */}
        <motion.section 
          className={`items-panel ${(selectedCategory === 'generator' || selectedCategory === 'audit') ? 'split-view' : ''}`}
          custom={1}
          initial="hidden"
          animate="visible"
          variants={panelEntrance}
        >
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
                    className="items-list-grid"
                  >
                    {filteredItems.map(item => (
                      <motion.div
                        key={item.id}
                        variants={listItemVariants}
                        className={`flip-card ${flippedCardId === item.id ? 'flipped' : ''}`}
                      >
                        <div className="flip-card-inner">
                          {/* FRONT OF THE CARD */}
                          <div 
                            className={`flip-card-front solid-details-card card-type-${item.type} dashboard-card`}
                            onClick={() => handleFlipToEdit(item)}
                            style={{ cursor: 'pointer' }}
                          >
                            {/* Header Row */}
                            <div className="card-header-row">
                              <div className="card-icon-badge-round">
                                {item.type === 'login' && <Key size={20} />}
                                {item.type === 'card' && <CreditCard size={20} />}
                                {item.type === 'note' && <FileText size={20} />}
                                {item.type === 'identity' && <User size={20} />}
                              </div>
                              <div className="card-pill-tag" style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '999px',
                                textTransform: 'uppercase',
                                color: 'var(--text-mint)',
                                fontSize: '0.54rem',
                                fontWeight: 800,
                                letterSpacing: '0.08em',
                                display: 'inline-flex',
                                alignItems: 'center'
                              }}>
                                {item.type === 'login' && 'LOGIN'}
                                {item.type === 'card' && 'CARD'}
                                {item.type === 'note' && 'NOTE'}
                                {item.type === 'identity' && (item.fields.identityType ? item.fields.identityType.toUpperCase() : 'IDENTITY')}
                              </div>
                            </div>

                            {/* Main Title */}
                            <h2 className="card-main-title font-copperplate">
                              {item.title}
                              {item.favorite && <Star size={13} style={{ color: 'var(--accent-warning)', fill: 'var(--accent-warning)', marginLeft: '6px', display: 'inline-block' }} />}
                            </h2>

                            {/* Separator Line */}
                            <div className="card-divider-line" />

                            {/* Detailed Info (Uses all space) */}
                            {item.type === 'login' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.4rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                                  <span style={{ opacity: 0.6 }}>Username:</span>
                                  <span style={{ fontWeight: 600 }}>{item.fields.username || '—'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', alignItems: 'center' }}>
                                  <span style={{ opacity: 0.6 }}>Password:</span>
                                  <div 
                                    className="card-password-pill"
                                    onClick={(e) => { e.stopPropagation(); copyToClipboard(item.fields.password, 'Password'); }}
                                    title="Click to copy Password"
                                  >
                                    <span>••••••••</span>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                                  <span style={{ opacity: 0.6 }}>URL:</span>
                                  <span style={{ fontWeight: 600, maxWidth: '75%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.fields.url || '—'}
                                  </span>
                                </div>
                              </div>
                            )}

                            {item.type === 'card' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.4rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                                  <span style={{ opacity: 0.6 }}>Cardholder:</span>
                                  <span style={{ fontWeight: 600 }}>{item.fields.cardholderName || '—'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                                  <span style={{ opacity: 0.6 }}>Card Number:</span>
                                  <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                                    {item.fields.cardNumber ? item.fields.cardNumber.replace(/\s+/g, '').replace(/(\d{4})/g, '$1 ').trim() : '—'}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                                  <span style={{ opacity: 0.6 }}>Expiry / CVC:</span>
                                  <span style={{ fontWeight: 600 }}>
                                    {item.fields.expirationDate || 'MM/YY'} / CVC {item.fields.cvc || '•••'}
                                  </span>
                                </div>
                              </div>
                            )}

                            {item.type === 'identity' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.4rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                                  <span style={{ opacity: 0.6 }}>Full Name:</span>
                                  <span style={{ fontWeight: 600 }}>{item.fields.fullName || '—'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', alignItems: 'center' }}>
                                  <span style={{ opacity: 0.6 }}>Document No:</span>
                                  <div 
                                    className="card-password-pill"
                                    onClick={(e) => { e.stopPropagation(); copyToClipboard(item.fields.identityNumber, 'Document ID'); }}
                                    title="Click to copy ID"
                                  >
                                    <span>••••••••</span>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                                  <span style={{ opacity: 0.6 }}>Type:</span>
                                  <span style={{ fontWeight: 600 }}>{item.fields.identityType || '—'}</span>
                                </div>
                              </div>
                            )}

                            {item.type === 'note' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', height: '80px', marginTop: '0.4rem' }}>
                                <span style={{ opacity: 0.6, fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 700 }}>Note Preview:</span>
                                <div 
                                  style={{ 
                                    fontSize: '0.74rem', 
                                    lineHeight: 1.3, 
                                    opacity: 0.85, 
                                    overflow: 'hidden', 
                                    display: '-webkit-box', 
                                    WebkitLineClamp: 3, 
                                    WebkitBoxOrient: 'vertical',
                                    wordBreak: 'break-all'
                                  }}
                                >
                                  {item.fields.noteText || 'No text content'}
                                </div>
                              </div>
                            )}

                          </div>

                          {/* BACK OF THE CARD */}
                          <div 
                            className={`flip-card-back solid-details-card card-type-${item.type} dashboard-card`}
                          >
                            <form 
                              onSubmit={(e) => handleSaveFlippedItem(e, item)}
                              className="card-edit-form"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="card-edit-fields">
                                <div className="card-edit-group" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8 }}>
                                    Edit {item.type.toUpperCase()}
                                  </span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <input 
                                      type="checkbox" 
                                      id={`fav-${item.id}`} 
                                      checked={formFavorite} 
                                      onChange={(e) => setFormFavorite(e.target.checked)} 
                                      style={{ width: 'auto', accentColor: 'var(--bg-mint)' }}
                                    />
                                    <label htmlFor={`fav-${item.id}`} className="card-edit-label" style={{ cursor: 'pointer', marginBottom: 0 }}>Favorite</label>
                                  </div>
                                </div>

                                {item.type === 'login' && (
                                  <>
                                    <div className="card-edit-group">
                                      <label className="card-edit-label">Title</label>
                                      <input 
                                        type="text" 
                                        required 
                                        className="card-edit-input" 
                                        value={formTitle} 
                                        onChange={(e) => setFormTitle(e.target.value)} 
                                      />
                                    </div>
                                    <div className="card-edit-group">
                                      <label className="card-edit-label">Username</label>
                                      <input 
                                        type="text" 
                                        className="card-edit-input" 
                                        value={loginUsername} 
                                        onChange={(e) => setLoginUsername(e.target.value)} 
                                      />
                                    </div>
                                    <div className="card-edit-group">
                                      <label className="card-edit-label">Password</label>
                                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <input 
                                          type={showEditPassword ? "text" : "password"} 
                                          className="card-edit-input" 
                                          style={{ paddingRight: '2rem' }}
                                          value={loginPassword} 
                                          onChange={(e) => setLoginPassword(e.target.value)} 
                                        />
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); setShowEditPassword(!showEditPassword); }}
                                          style={{ position: 'absolute', right: '0.5rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                          {showEditPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                      </div>
                                    </div>
                                    <div className="card-edit-group">
                                      <label className="card-edit-label">URL</label>
                                      <input 
                                        type="text" 
                                        className="card-edit-input" 
                                        value={loginUrl} 
                                        onChange={(e) => setLoginUrl(e.target.value)} 
                                      />
                                    </div>
                                  </>
                                )}

                                {item.type === 'card' && (
                                  <>
                                    <div className="card-edit-group">
                                      <label className="card-edit-label">Title</label>
                                      <input 
                                        type="text" 
                                        required 
                                        className="card-edit-input" 
                                        value={formTitle} 
                                        onChange={(e) => setFormTitle(e.target.value)} 
                                      />
                                    </div>
                                    <div className="card-edit-group">
                                      <label className="card-edit-label">Cardholder Name</label>
                                      <input 
                                        type="text" 
                                        className="card-edit-input" 
                                        value={cardholderName} 
                                        onChange={(e) => setCardholderName(e.target.value)} 
                                      />
                                    </div>
                                    <div className="card-edit-group">
                                      <label className="card-edit-label">Card Number</label>
                                      <input 
                                        type="text" 
                                        className="card-edit-input" 
                                        value={cardNumber} 
                                        onChange={(e) => setCardNumber(e.target.value)} 
                                      />
                                    </div>
                                    <div className="card-edit-group" style={{ display: 'flex', flexDirection: 'row', gap: '0.4rem' }}>
                                      <div style={{ flex: 1 }}>
                                        <label className="card-edit-label">Expiry</label>
                                        <input 
                                          type="text" 
                                          className="card-edit-input" 
                                          placeholder="MM/YY" 
                                          value={cardExpiration} 
                                          onChange={(e) => setCardExpiration(e.target.value)} 
                                        />
                                      </div>
                                      <div style={{ flex: 1 }}>
                                        <label className="card-edit-label">CVC</label>
                                        <input 
                                          type="text" 
                                          className="card-edit-input" 
                                          placeholder="CVC" 
                                          value={cardCvc} 
                                          onChange={(e) => setCardCvc(e.target.value)} 
                                        />
                                      </div>
                                    </div>
                                  </>
                                )}

                                {item.type === 'note' && (
                                  <>
                                    <div className="card-edit-group">
                                      <label className="card-edit-label">Title</label>
                                      <input 
                                        type="text" 
                                        required 
                                        className="card-edit-input" 
                                        value={formTitle} 
                                        onChange={(e) => setFormTitle(e.target.value)} 
                                      />
                                    </div>
                                    <div className="card-edit-group">
                                      <label className="card-edit-label">Note Content</label>
                                      <textarea 
                                        className="card-edit-input" 
                                        rows={4} 
                                        style={{ resize: 'none' }}
                                        value={noteText} 
                                        onChange={(e) => setNoteText(e.target.value)} 
                                      />
                                    </div>
                                  </>
                                )}

                                {item.type === 'identity' && (
                                  <>
                                    <div className="card-edit-group">
                                      <label className="card-edit-label">Title</label>
                                      <input 
                                        type="text" 
                                        required 
                                        className="card-edit-input" 
                                        value={formTitle} 
                                        onChange={(e) => setFormTitle(e.target.value)} 
                                      />
                                    </div>
                                    <div className="card-edit-group">
                                      <label className="card-edit-label">Full Name</label>
                                      <input 
                                        type="text" 
                                        className="card-edit-input" 
                                        value={identityFullName} 
                                        onChange={(e) => setIdentityFullName(e.target.value)} 
                                      />
                                    </div>
                                    <div className="card-edit-group">
                                      <label className="card-edit-label">Document Type</label>
                                      <select 
                                        className="card-edit-input" 
                                        value={identityType} 
                                        onChange={(e) => {
                                          setIdentityType(e.target.value);
                                          if (e.target.value !== 'Other') {
                                            setCustomIdentityType('');
                                          }
                                        }}
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
                                      <div className="card-edit-group">
                                        <label className="card-edit-label">Specify Type</label>
                                        <input 
                                          type="text" 
                                          required 
                                          className="card-edit-input" 
                                          value={customIdentityType} 
                                          onChange={(e) => setCustomIdentityType(e.target.value)} 
                                        />
                                      </div>
                                    )}
                                    <div className="card-edit-group">
                                      <label className="card-edit-label">Document Number</label>
                                      <input 
                                        type="text" 
                                        className="card-edit-input" 
                                        value={identityNumber} 
                                        onChange={(e) => setIdentityNumber(e.target.value)} 
                                      />
                                    </div>
                                  </>
                                )}
                              </div>

                              <div className="card-edit-actions">
                                <button 
                                  type="button" 
                                  className="card-edit-btn cancel"
                                  onClick={(e) => { e.stopPropagation(); setFlippedCardId(null); }}
                                >
                                  Cancel
                                </button>
                                <button 
                                  type="button" 
                                  className="card-edit-btn delete"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                                  style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ff6b6b', border: '1px solid rgba(239, 68, 68, 0.25)', fontWeight: 700 }}
                                >
                                  Delete
                                </button>
                                <button 
                                  type="submit" 
                                  className="card-edit-btn save"
                                >
                                  Save
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </>
            )}
          </div>
        </motion.section>

        {/* Right Pane: Details or Utilities (Floating curved card) */}
        {(selectedCategory === 'generator' || selectedCategory === 'audit') && (
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

                    <div className="generator-settings">
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.62rem' }}>Length: {genLength}</label>
                        <input 
                          type="range" 
                          min={8} 
                          max={32} 
                          value={genLength} 
                          onChange={(e) => setGenLength(parseInt(e.target.value))}
                          className="generator-range"
                        />
                      </div>

                      <div className="generator-options-grid">
                        <label className="form-checkbox-label">
                          <input 
                            type="checkbox" 
                            checked={genUppercase} 
                            onChange={(e) => setGenUppercase(e.target.checked)}
                          />
                          <span>Uppercase (A-Z)</span>
                        </label>

                        <label className="form-checkbox-label">
                          <input 
                            type="checkbox" 
                            checked={genLowercase} 
                            onChange={(e) => setGenLowercase(e.target.checked)}
                          />
                          <span>Lowercase (a-z)</span>
                        </label>

                        <label className="form-checkbox-label">
                          <input 
                            type="checkbox" 
                            checked={genNumbers} 
                            onChange={(e) => setGenNumbers(e.target.checked)}
                          />
                          <span>Numbers (0-9)</span>
                        </label>

                        <label className="form-checkbox-label">
                          <input 
                            type="checkbox" 
                            checked={genSymbols} 
                            onChange={(e) => setGenSymbols(e.target.checked)}
                          />
                          <span>Symbols (!@#$)</span>
                        </label>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Category: Security Audit view */}
                {selectedCategory === 'audit' && (
                  <motion.div 
                    key="audit"
                    className="audit-card-container"
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
                    <h2 className="form-card-title font-copperplate" style={{ marginBottom: '0.25rem' }}>Security Audit</h2>
                    <p className="details-type-badge" style={{ marginBottom: '1.5rem', textTransform: 'none' }}>Scan credentials for potential security issues.</p>

                    <div className="audit-metrics-grid">
                      <div className="audit-metric-card">
                        <div className="audit-metric-header">
                          <ShieldAlert size={18} style={{ color: 'var(--accent-red)' }} />
                          <h4 className="audit-metric-title">Weak Passwords</h4>
                        </div>
                        <p className="audit-metric-subtitle">Passwords under 8 chars or simple combinations</p>
                        <div className="audit-metric-value red">
                          {auditResults.weakItems.length}
                        </div>
                      </div>

                      <div className="audit-metric-card">
                        <div className="audit-metric-header">
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

              </AnimatePresence>
            </div>
          </motion.main>
        )}
      </div>

      {/* POPUP MODAL FOR ADD / EDIT FORMS */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div 
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsFormOpen(false)}
          >
            <motion.div 
              className="form-card glass-modal glowing-card-border"
              initial={{ y: 30, scale: 0.96, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 30, scale: 0.96, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="form-card-header">
                <h2 className="form-card-title font-copperplate" style={{ margin: 0 }}>
                  {formMode === 'add' ? `Add ${itemType.toUpperCase()}` : `Edit ${formTitle}`}
                </h2>
                <button 
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="form-close-btn"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Real-time Interactive Visual Card Preview */}
              {itemType === 'card' && (
                <div className="card-preview-wrapper">
                  <div className="virtual-credit-card glowing-card-border">
                    <div className="credit-card-header">
                      <span className="credit-card-logo">SECURE CARD</span>
                      <CreditCard size={18} style={{ opacity: 0.6 }} />
                    </div>
                    <div className="credit-card-chip" />
                    <div className="credit-card-number">
                      {cardNumber ? cardNumber.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim() : '•••• •••• •••• ••••'}
                    </div>
                    <div className="credit-card-footer">
                      <div className="credit-card-holder-area">
                        <span className="credit-card-label">Cardholder</span>
                        <span className="credit-card-holder-name">{cardholderName || 'Cardholder Name'}</span>
                      </div>
                      <div className="credit-card-expiry-area">
                        <span className="credit-card-label">Expires</span>
                        <div className="credit-card-expiry-value">{cardExpiration || 'MM/YY'}</div>
                      </div>
                      {cardCvc && (
                        <div style={{ marginLeft: '10px' }}>
                          <span className="credit-card-label">CVC</span>
                          <div style={{ fontSize: '0.74rem', fontWeight: 700 }}>{cardCvc}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {itemType === 'login' && (
                <div className="card-preview-wrapper">
                  <div className="virtual-login-card glowing-card-border">
                    <div className="login-card-header">
                      <div className="login-card-icon-badge">
                        <Key size={18} />
                      </div>
                      <span className="login-card-type">Login Credential</span>
                    </div>
                    <div className="login-card-body">
                      <h4 className="login-card-title">{formTitle || 'Login Title'}</h4>
                      <p className="login-card-username">{loginUsername || 'username@email.com'}</p>
                    </div>
                    <div className="login-card-footer">
                      <span className="login-card-url">{loginUrl || 'accounts.google.com'}</span>
                      {loginPassword && (
                        <span style={{ fontSize: '0.62rem', background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                          ••••••••
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {itemType === 'identity' && (
                <div className="card-preview-wrapper">
                  <div className="virtual-identity-card glowing-card-border">
                    <div className="identity-card-photo">
                      <User size={26} />
                      <span style={{ fontSize: '0.52rem', fontWeight: 700 }}>PHOTO</span>
                    </div>
                    <div className="identity-card-details">
                      <div className="identity-card-header">
                        <span className="identity-card-label">
                          {identityType === 'Other' ? (customIdentityType || 'Identity') : `${identityType} Card`}
                        </span>
                        <h4 className="identity-card-title">{formTitle || 'Document Name'}</h4>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="identity-card-name">{identityFullName || 'Full Name'}</span>
                        <span className="identity-card-number">{identityNumber || 'Document Number'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {itemType === 'note' && (
                <div className="card-preview-wrapper">
                  <div className="virtual-note-card">
                    <div className="note-card-spiral">
                      <div className="note-card-spiral-dot" />
                      <div className="note-card-spiral-dot" />
                    </div>
                    <h4 style={{ fontFamily: 'var(--font-header)', fontSize: '0.85rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.25rem', color: 'inherit' }}>
                      {formTitle || 'Secure Note'}
                    </h4>
                    <div className="note-card-lines">
                      {noteText || 'Write your secret note...'}
                    </div>
                    <div className="note-card-footer">
                      <span>Secure Note</span>
                      <span>High-Security</span>
                    </div>
                  </div>
                </div>
              )}

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
                      <div className="form-input-action-row" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input 
                          type={showEditPassword ? "text" : "password"}
                          placeholder="Password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="form-input"
                          style={{ fontFamily: 'monospace', paddingRight: '2.5rem' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditPassword(!showEditPassword)}
                          style={{ position: 'absolute', right: '1rem', background: 'none', border: 'none', color: 'rgba(0,0,0,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
                        >
                          {showEditPassword ? <EyeOff size={14} /> : <Eye size={14} />}
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
                    style={{
                      background: 'rgba(239, 68, 68, 0.22)',
                      border: '1px solid rgba(239, 68, 68, 0.45)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ color: '#ffffff', fontWeight: 600 }}>Cancel</span>
                  </button>
                  <button 
                    type="submit" 
                    className="form-save-btn"
                    style={{
                      background: '#ffffff',
                      color: '#000000',
                      border: 'none',
                    }}
                  >
                    <span>Save</span>
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

      {/* POPUP MODAL FOR DETAILED CARD PREVIEW */}
      <AnimatePresence>
        {isDetailPopupOpen && selectedItem && (
          <motion.div 
            className="card-details-popup-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsDetailPopupOpen(false)}
          >
            {/* Close Button floating at top-right of the backdrop, outside the card */}
            <button 
              type="button"
              onClick={() => setIsDetailPopupOpen(false)}
              className="card-details-popup-close"
              title="Close Preview"
              style={{ position: 'fixed', top: '2rem', right: '2rem', width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <X size={16} />
            </button>

            <motion.div 
              className={`solid-details-card card-type-${selectedItem.type}`}
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 30, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()} // Prevent close on clicking card itself
            >
              {/* Header Row */}
              <div className="card-header-row">
                <div className="card-icon-badge-round">
                  {selectedItem.type === 'login' && <Key size={20} />}
                  {selectedItem.type === 'card' && <CreditCard size={20} />}
                  {selectedItem.type === 'note' && <FileText size={20} />}
                  {selectedItem.type === 'identity' && <User size={20} />}
                </div>
                <div className="card-pill-tag">
                  {selectedItem.type === 'login' && 'LOGIN CREDENTIAL'}
                  {selectedItem.type === 'card' && 'PAYMENT CARD'}
                  {selectedItem.type === 'note' && 'SECURE NOTE'}
                  {selectedItem.type === 'identity' && (selectedItem.fields.identityType ? `${selectedItem.fields.identityType.toUpperCase()} DOCUMENT` : 'IDENTITY')}
                </div>
              </div>

              {/* Main Title (Cinzel Font) */}
              <h2 className="card-main-title font-copperplate">
                {selectedItem.title}
              </h2>

              {/* Primary Text */}
              <div className="card-primary-text">
                {selectedItem.type === 'login' && (selectedItem.fields.username || 'No username')}
                {selectedItem.type === 'card' && (selectedItem.fields.cardholderName || 'Cardholder Name')}
                {selectedItem.type === 'identity' && (selectedItem.fields.fullName || 'Full Name')}
                {selectedItem.type === 'note' && 'Secure Memorandum'}
              </div>

              {/* Separator Line */}
              <div className="card-divider-line" />

              {/* Bottom Row */}
              <div className="card-bottom-row">
                {/* Bottom Left Secondary Field */}
                <div className="card-bottom-left-field">
                  {selectedItem.type === 'login' && (selectedItem.fields.url || '—')}
                  {selectedItem.type === 'card' && (selectedItem.fields.cardNumber ? `•••• •••• •••• ${selectedItem.fields.cardNumber.replace(/\s+/g, '').slice(-4)}` : '—')}
                  {selectedItem.type === 'identity' && (selectedItem.fields.identityNumber || '—')}
                  {selectedItem.type === 'note' && (selectedItem.fields.noteText ? (selectedItem.fields.noteText.substring(0, 28) + '...') : 'No text content')}
                </div>

                {/* Bottom Right Interactive Password Pill Box */}
                {selectedItem.type === 'login' && selectedItem.fields.password && (
                  <div 
                    className="card-password-pill"
                    onClick={() => copyToClipboard(selectedItem.fields.password, 'Password')}
                    title="Click to copy Password"
                  >
                    <span>••••••••</span>
                  </div>
                )}
                {selectedItem.type === 'card' && selectedItem.fields.cvc && (
                  <div 
                    className="card-password-pill"
                    onClick={() => copyToClipboard(selectedItem.fields.cvc, 'CVC')}
                    title="Click to copy CVC"
                  >
                    <span>CVC •••</span>
                  </div>
                )}
                {selectedItem.type === 'identity' && selectedItem.fields.identityNumber && (
                  <div 
                    className="card-password-pill"
                    onClick={() => copyToClipboard(selectedItem.fields.identityNumber, 'Document ID')}
                    title="Click to copy ID"
                  >
                    <span>COPY ID</span>
                  </div>
                )}
                {selectedItem.type === 'note' && selectedItem.fields.noteText && (
                  <div 
                    className="card-password-pill"
                    onClick={() => copyToClipboard(selectedItem.fields.noteText, 'Note Content')}
                    title="Click to copy Note"
                  >
                    <span>COPY NOTE</span>
                  </div>
                )}
              </div>

              {/* Popup Action Buttons inside card at bottom */}
              <div className="details-popup-actions" style={{ marginTop: '2.5rem' }}>
                <button 
                  onClick={() => { setIsDetailPopupOpen(false); handleOpenEditForm(selectedItem); }}
                  className="details-popup-btn edit"
                >
                  <Edit3 size={14} />
                  <span>Edit Credential</span>
                </button>
                <button 
                  onClick={() => { setIsDetailPopupOpen(false); handleDeleteItem(selectedItem.id); }}
                  className="details-popup-btn delete"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Modern Red Delete Confirmation Popup */}
      <AnimatePresence>
        {deleteItemId && (
          <motion.div 
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ zIndex: 100 }}
          >
            <motion.div 
              className="form-card glass-modal glowing-card-border"
              initial={{ y: 30, scale: 0.96, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 30, scale: 0.96, opacity: 0 }}
              style={{ 
                maxWidth: '360px', 
                border: '1px solid rgba(239, 68, 68, 0.4)', 
                boxShadow: '0 8px 32px rgba(239, 68, 68, 0.15)',
                margin: 'auto'
              }}
            >
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '50%', 
                  background: 'rgba(239, 68, 68, 0.15)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 1rem auto',
                  color: '#ef4444'
                }}>
                  <Trash2 size={24} />
                </div>
                <h3 className="font-copperplate" style={{ fontSize: '1rem', color: '#ef4444', marginBottom: '0.5rem' }}>
                  Delete Credential?
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '1.5rem' }}>
                  Are you sure you want to permanently delete this item? This action is irreversible.
                </p>
                
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <button 
                    type="button" 
                    onClick={() => setDeleteItemId(null)}
                    style={{ 
                      padding: '0.4rem 1.2rem', 
                      fontSize: '0.74rem', 
                      fontWeight: 700, 
                      borderRadius: '6px', 
                      border: '1px solid rgba(255,255,255,0.15)', 
                      background: 'transparent', 
                      color: 'var(--text-light)', 
                      cursor: 'pointer' 
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      if (deleteItemId) {
                        confirmDelete(deleteItemId);
                      }
                    }}
                    style={{ 
                      padding: '0.4rem 1.2rem', 
                      fontSize: '0.74rem', 
                      fontWeight: 700, 
                      borderRadius: '6px', 
                      border: 'none', 
                      background: 'rgba(239, 68, 68, 0.2)', 
                      color: '#ff6b6b', 
                      cursor: 'pointer' 
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
