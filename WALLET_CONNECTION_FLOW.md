# 🏦 Wallet Connection Flow Diagram

## Phantom Connection Flow

```mermaid
graph TB
    A[User Clicks Connect Phantom] --> B{Mobile?}
    B -->|Yes| C{Capacitor App?}
    B -->|No| D[Check window.solana]
    
    C -->|Yes| E[window.location.href = phantom.app/ul/browse]
    C -->|No| F[window.open phantom.app/ul/browse]
    
    D --> G{Phantom Found?}
    G -->|No| H[Open phantom.app/download]
    G -->|Yes| I[sol.connect - IMMEDIATE]
    
    I --> J{Connection Success?}
    J -->|Yes| K[Save wallet to state & localStorage]
    J -->|No| L[Show error notification]
    
    K --> M[Load game progress from cloud]
    K --> N[Check for NFT boosts]
    
    style I fill:#4CAF50,color:#fff
    style K fill:#4CAF50,color:#fff
    style H fill:#f44336,color:#fff
    style L fill:#f44336,color:#fff
```

## MetaMask Connection Flow

```mermaid
graph TB
    A[User Clicks Connect MetaMask] --> B[Check window.ethereum]
    
    B --> C{Provider Exists?}
    C -->|No| D[Open metamask.io/download]
    C -->|Yes| E{Multiple Providers?}
    
    E -->|Yes| F[Find MetaMask provider]
    E -->|No| G[Use single provider]
    
    F --> H[provider.request eth_requestAccounts - IMMEDIATE]
    G --> H
    
    H --> I{Connection Success?}
    I -->|Yes| J[Save wallet to state & localStorage]
    I -->|No| K[Show error notification]
    
    J --> L[Load game progress from cloud]
    J --> M[Request SIWS signature in background]
    
    style H fill:#4CAF50,color:#fff
    style J fill:#4CAF50,color:#fff
    style D fill:#f44336,color:#fff
    style K fill:#f44336,color:#fff
```

## Wallet Detection Flow

```mermaid
graph TB
    A[Page Load] --> B[detectWalletEnvironment]
    
    B --> C{Check Phantom}
    C --> D[window.solana?.isPhantom]
    C --> E[window.phantom?.solana?.isPhantom]
    D --> F{Found?}
    E --> F
    F -->|Yes| G[phantomFound = true]
    F -->|No| H[phantomFound = false]
    
    B --> I{Check MetaMask}
    I --> J[window.ethereum.providers]
    I --> K[window.ethereum]
    J --> L{Has MetaMask?}
    K --> L
    L -->|Yes| M[metamaskFound = true]
    L -->|No| N[metamaskFound = false]
    
    G --> O[Update UI buttons]
    H --> O
    M --> O
    N --> O
    
    style G fill:#4CAF50,color:#fff
    style M fill:#4CAF50,color:#fff
    style H fill:#ff9800,color:#fff
    style N fill:#ff9800,color:#fff
```

## Key Timing Notes

### ✅ CORRECT Flow (After Fix):
```
User Click → Immediate Extension Call (< 0.5s) → Popup Appears
```

### ❌ WRONG Flow (Before Fix):
```
User Click → Async Operations → Delay → Extension Call → Timeout → Popup (too late)
```

## Critical Implementation Details

### 1. User Gesture Preservation
```typescript
// ✅ CORRECT - Synchronous call preserves gesture
onClick={() => {
  connectPhantom(); // Called directly
}}

// Inside connectPhantom():
const res = await sol.connect({ onlyIfTrusted: false });
// ^ This await is OK because it's THE FIRST async operation
```

### 2. No Blocking Operations Before Connection
```typescript
// ❌ WRONG - Don't do this before connection
await someAPI.call();  // Blocks user gesture
await loadProgress();  // Blocks user gesture
const res = await sol.connect();  // Too late!

// ✅ CORRECT - Connection first, everything else after
const res = await sol.connect();  // First!
await someAPI.call();  // Now it's OK (background)
```

### 3. Immediate Error Handling
```typescript
try {
  const res = await sol.connect();
  if (!res.publicKey) throw new Error("No key");
} catch (e) {
  // Show error immediately
  stateRef.current.notification = { text: "FAILED", life: 120 };
}
```

## Mobile Deep Link Structure

### Phantom Universal Link:
```
https://phantom.app/ul/browse/{ENCODED_URL}?ref={ENCODED_URL}
```
- Opens Phantom app if installed
- Falls back to App Store if not
- Preserves return URL for deep linking

### MetaMask Deep Link:
```
https://metamask.app.link/dapp/{DOMAIN}
```
- Opens MetaMask app if installed  
- Falls back to app store if not
- Auto-returns to dapp after approval

## Desktop Extension Injection

### Phantom:
```javascript
window.solana           // Primary
window.phantom.solana   // Fallback
```

### MetaMask:
```javascript
window.ethereum                    // Single provider
window.ethereum.providers[]        // Multiple providers (Brave, etc.)
```

## Error Recovery Strategies

| Error Type | Recovery Action |
|------------|----------------|
| Extension not found | Open download page in new tab |
| User rejects | Show error, allow retry |
| Timeout | Show error, suggest refresh |
| Network error | Retry once, then show error |
| Signature fails | Continue anyway (non-blocking) |

---

**Last Updated:** March 29, 2026  
**Purpose:** Visual documentation for wallet connection implementation
