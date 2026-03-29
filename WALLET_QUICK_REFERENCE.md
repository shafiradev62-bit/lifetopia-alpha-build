# 🚀 Quick Reference: Wallet Connection Implementation

## ✅ DO THIS (Best Practices)

### 1. Preserve User Gesture Context
```typescript
// ✅ CORRECT
const connectWallet = async () => {
  // First operation MUST be the connection
  const res = await provider.connect();  // or eth_requestAccounts
  
  // Everything else comes AFTER
  saveToState();
  loadProgress();
}

// ❌ WRONG
const connectWallet = async () => {
  await someAsyncOp();  // Kills user gesture!
  await anotherAsyncOp(); // Still dead
  const res = await provider.connect(); // Too late!
}
```

### 2. Fail Fast, Show Errors Immediately
```typescript
// ✅ CORRECT
try {
  if (!provider) {
    window.open('https://download.link', '_blank');
    return;
  }
  const res = await provider.connect();
} catch (e) {
  showNotification(`ERROR: ${e.message}`);
}
```

### 3. Mobile Deep Links - Open Immediately
```typescript
// ✅ CORRECT
if (isMobile) {
  window.location.href = 'phantom.app/ul/browse/...';
  return; // Done
}
```

### 4. Desktop Detection - Check Then Connect
```typescript
// ✅ CORRECT
const sol = window.solana ?? window.phantom?.solana;
if (!sol?.connect) {
  window.open('phantom.app/download', '_blank');
  return;
}
const res = await sol.connect();
```

---

## ❌ DON'T DO THIS (Anti-Patterns)

### 1. Blocking Operations Before Connection
```typescript
// ❌ NEVER DO THIS
await loadGameState();      // Blocks gesture
await checkNFTs();          // Still blocked
await verifySignature();    // Still blocked
const res = await connect(); // User gesture expired!
```

### 2. Nested Try-Catch Hell
```typescript
// ❌ AVOID
try {
  try {
    try {
      connect();
    } catch {}
  } catch {}
} catch {}

// ✅ INSTEAD
try {
  connect();
} catch (e) {
  handleError(e);
}
```

### 3. Delayed Opening
```typescript
// ❌ NEVER
setTimeout(() => {
  window.open('download.link', '_blank');
}, 1000);

// ✅ IMMEDIATE
window.open('download.link', '_blank');
```

---

## 🔧 Common Issues & Solutions

### Issue: Extension popup doesn't appear
**Cause:** User gesture expired  
**Solution:** Make connection the FIRST async operation

### Issue: "Wallet not found" but it's installed
**Cause:** Extension injects after page load  
**Solution:** Listen for `ethereum#initialized` event

### Issue: Mobile deep link fails
**Cause:** Wrong URL format  
**Solution:** Use universal links with encoded URLs

### Issue: Connection works but signature fails
**Cause:** Signature requested too early  
**Solution:** Request signature AFTER connection is saved

---

## 📝 Code Snippets (Copy-Paste Ready)

### Phantom Desktop Connect
```typescript
const connectPhantom = async () => {
  try {
    const sol = window.solana ?? window.phantom?.solana;
    if (!sol?.connect) {
      window.open('https://phantom.app/download', '_blank');
      return;
    }
    const res = await sol.connect({ onlyIfTrusted: false });
    if (!res?.publicKey) throw new Error('No key');
    onConnected(res.publicKey.toString(), 'solana');
  } catch (e) {
    console.error(e);
  }
};
```

### MetaMask Desktop Connect
```typescript
const connectMetaMask = async () => {
  try {
    let provider = window.ethereum;
    if (provider?.providers) {
      provider = provider.providers.find(p => p.isMetaMask) || provider.providers[0];
    }
    if (!provider) {
      window.open('https://metamask.io/download/', '_blank');
      return;
    }
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    if (!accounts?.[0]) throw new Error('Rejected');
    onConnected(accounts[0], 'evm');
  } catch (e) {
    console.error(e);
  }
};
```

### Mobile Phantom Deep Link
```typescript
const openPhantomMobile = () => {
  const url = encodeURIComponent(window.location.href);
  window.open(`https://phantom.app/ul/browse/${url}`, '_blank');
};
```

### Wallet Detection on Load
```typescript
useEffect(() => {
  const detect = () => {
    const phantom = !!(window.solana?.isPhantom || window.phantom?.solana?.isPhantom);
    const eth = window.ethereum;
    const metamask = Array.isArray(eth?.providers) 
      ? eth.providers.some(p => p.isMetaMask)
      : !!eth?.isMetaMask;
    
    setPhantomFound(phantom);
    setMetamaskFound(metamask);
  };
  
  detect();
  window.addEventListener('ethereum#initialized', detect, { once: true });
}, []);
```

---

## 🎯 Testing Checklist

- [ ] Phantom desktop extension opens instantly on click
- [ ] MetaMask desktop extension opens instantly on click
- [ ] Phantom mobile deep link works from Chrome/Safari
- [ ] MetaMask mobile deep link works from Chrome/Safari
- [ ] Download pages open when wallet not installed
- [ ] Error messages show for rejected connections
- [ ] Connected wallet persists after page refresh
- [ ] Game progress loads correctly after connection
- [ ] NFT boosts apply correctly after connection

---

## 🔗 Important URLs

### Download Pages
- Phantom: `https://phantom.app/download`
- MetaMask: `https://metamask.io/download/`

### Universal Links
- Phantom: `https://phantom.app/ul/browse/{ENCODED_URL}`
- MetaMask: `https://metamask.app.link/dapp/{DOMAIN}`

### Documentation
- Phantom Docs: `https://docs.phantom.app/`
- MetaMask Docs: `https://docs.metamask.io/`

---

## 💡 Pro Tips

1. **Always test on both desktop and mobile** - They use completely different code paths
2. **Preserve user gesture at all costs** - It expires in ~5 seconds
3. **Show immediate feedback** - Users need to know something is happening
4. **Never block on signature requests** - Do them in background after connection
5. **Test with wallets NOT installed** - Fallback behavior matters

---

## 🐛 Debug Commands

### Check if Phantom is injected (Console)
```javascript
console.log('Phantom:', window.solana?.isPhantom || window.phantom?.solana?.isPhantom);
```

### Check if MetaMask is injected (Console)
```javascript
console.log('MetaMask:', window.ethereum?.isMetaMask);
console.log('Providers:', window.ethereum?.providers);
```

### Force detect wallets (Console)
```javascript
window.dispatchEvent(new Event('ethereum#initialized'));
```

---

**Last Updated:** March 29, 2026  
**Maintained By:** Lifetopia Development Team  
**Purpose:** Quick reference for implementing/maintaining wallet connections
