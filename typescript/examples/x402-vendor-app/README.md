# x402 Vendor App

A production-ready example application for selling items over x402. This app demonstrates a complete x402 payment integration using wagmi, viem, WalletConnect, and the CDP facilitator for Base mainnet.

## Features

- 🛒 Create items for sale with configurable payment details
- 💰 Configure payment networks, assets, and amounts
- 🔗 Wallet integration with WalletConnect and Coinbase Wallet
- 💳 Complete x402 v1 payment flow with CDP facilitator
- 🔐 EIP-712 compliant signing for USDC on Base mainnet
- 📱 Responsive, modern UI with transaction status tracking
- ✅ Payment verification and settlement tracking
- ☕ AI Barista chat with x402 micropayments (optional)
- 🤖 Automated agent purchases with smart account support (optional)
- 🔌 MCP server integration for x402-enabled tools (optional)

## Prerequisites

- Node.js 18+
- npm, pnpm, or yarn
- A WalletConnect Project ID (get one at [cloud.walletconnect.com](https://cloud.walletconnect.com))
- CDP API Keys for Base mainnet (get from [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com)) - Required for CDP facilitator
- (Optional) Google Gemini API key for AI Barista feature (get from [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey))

## SDK

Key packages used:
- `x402` - x402 protocol SDK
- `@coinbase/x402` - CDP facilitator helper
- `wagmi` - React Hooks for Ethereum
- `viem` - TypeScript interface for Ethereum
- `@web3modal/wagmi` - WalletConnect integration

## Setup

1. **Install dependencies:**

```bash
cd typescript/examples/x402-vendor-app
npm install
# or
pnpm install
```

2. **Configure environment variables:**

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Then edit `.env` with your actual values. See the [Environment Variables](#environment-variables) section below for detailed explanations of each variable.

**Quick Start (Minimum Required):**

For basic functionality, you only need:

```bash
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_wallet_connect_project_id
```

**For CDP Facilitator (Base mainnet):**

```bash
NEXT_PUBLIC_FACILITATOR_URL=https://api.cdp.coinbase.com/platform/v2/x402
CDP_API_KEY_ID=your_cdp_api_key_id
CDP_API_KEY_SECRET=your_cdp_api_key_secret
```

**For Testnet Facilitator (Base Sepolia):**

```bash
NEXT_PUBLIC_FACILITATOR_URL=https://x402.org/facilitator
# No API keys needed for testnet
```

**Note**: The `.env` file should be in the `x402-vendor-app` directory (where `next.config.js` is located), not in the repository root.

3. **Run the development server:**

```bash
npm run dev
# or
pnpm dev
```

The app will run on `http://localhost:3010` (configured in `package.json`).

## Environment Variables

The app uses environment variables for configuration. A complete `.env.example` file is provided with all available options. Below is a detailed explanation of each variable:

### Required Variables

#### `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`
- **Description**: WalletConnect Project ID for wallet connection
- **Required**: Yes
- **Where to get**: [cloud.walletconnect.com](https://cloud.walletconnect.com)
- **Usage**: Used by `@web3modal/wagmi` to enable wallet connections
- **Note**: Must have `NEXT_PUBLIC_` prefix for client-side access in Next.js

### x402 Facilitator Configuration

#### `NEXT_PUBLIC_FACILITATOR_URL`
- **Description**: URL of the x402 facilitator service
- **Required**: No (defaults to `https://x402.org/facilitator`)
- **Options**:
  - CDP Facilitator (Base mainnet): `https://api.cdp.coinbase.com/platform/v2/x402`
  - Testnet Facilitator: `https://x402.org/facilitator`
- **Usage**: Used for payment verification and settlement
- **Note**: Can also use `FACILITATOR_URL` (server-side only, no `NEXT_PUBLIC_` prefix)

#### `CDP_API_KEY_ID`
- **Description**: CDP API Key ID for authentication
- **Required**: Yes (if using CDP facilitator)
- **Where to get**: [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com)
- **Usage**: Used with `CDP_API_KEY_SECRET` for Basic Auth with CDP facilitator
- **Note**: Only needed when using CDP facilitator on Base mainnet

#### `CDP_API_KEY_SECRET`
- **Description**: CDP API Key Secret for authentication
- **Required**: Yes (if using CDP facilitator)
- **Where to get**: [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com)
- **Usage**: Used with `CDP_API_KEY_ID` for Basic Auth with CDP facilitator
- **Note**: Only needed when using CDP facilitator on Base mainnet

### Payment Address Configuration

#### `AGENT_PAY_TO_ADDRESS`
- **Description**: Default payment address for all items
- **Required**: No
- **Format**: Ethereum address (e.g., `0x...`)
- **Usage**: Used as the default `payTo` address when creating items if not specified
- **Note**: Server-side only (no `NEXT_PUBLIC_` prefix needed)

#### `NEXT_PUBLIC_AGENT_PAY_TO_ADDRESS`
- **Description**: Default payment address (client-side accessible)
- **Required**: No
- **Format**: Ethereum address (e.g., `0x...`)
- **Usage**: Same as `AGENT_PAY_TO_ADDRESS` but accessible on client-side
- **Note**: Use this if you need the address available in browser components

### Agent Wallet Configuration (Optional - for Barista/MCP features)

These variables are used for automated agent purchases via the `/api/barista/purchase` endpoint.

#### `AGENT_PRIVATE_KEY`
- **Description**: Private key for the agent wallet (must start with `0x`)
- **Required**: No (only for automated agent purchases)
- **Format**: Hex string starting with `0x` (64 characters after `0x`)
- **Usage**: Used to sign payments for automated purchases
- **Security**: ⚠️ **Never commit this to version control!** Keep it in `.env` only
- **Example**: `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`

#### `USE_SMART_ACCOUNT`
- **Description**: Enable Ampersend Smart Account mode instead of EOA
- **Required**: No
- **Values**: `"true"` or `"false"` (default: `false`)
- **Usage**: When `true`, uses Ampersend Smart Account with spend limits and monitoring
- **Note**: Requires `SMART_ACCOUNT_ADDRESS` to be set

#### `SMART_ACCOUNT_ADDRESS`
- **Description**: Smart account address for Ampersend integration
- **Required**: No (only if `USE_SMART_ACCOUNT=true`)
- **Format**: Ethereum address (e.g., `0x...`)
- **Default**: `0x6327F25caD99f9fad78A6bb0C97d106159AE6180`
- **Usage**: The smart account address that will authorize payments
- **Note**: Get this from [app.ampersend.ai](https://app.ampersend.ai) or [app.staging.ampersend.ai](https://app.staging.ampersend.ai)

### MCP Server Configuration (Optional - for Barista/MCP features)

#### `MCP_SERVER_URL`
- **Description**: URL of the MCP server for x402-enabled MCP tools
- **Required**: No (only for MCP/Barista features)
- **Format**: HTTP URL (e.g., `http://localhost:8080/mcp`)
- **Usage**: Used by `/api/barista` route to connect to MCP server
- **Example**: `http://localhost:8080/mcp`

### Google Gemini API (Optional - for AI Barista feature)

#### `GEMINI_API_KEY`
- **Description**: Google Gemini API key for AI-powered barista responses
- **Required**: No (only for AI Barista feature)
- **Where to get**: [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
- **Usage**: Used by `/api/barista` route for AI-generated responses
- **Note**: If not set, the barista will use fallback rule-based responses

### MCP Server Port (Optional - for mcp-server.ts)

#### `PORT`
- **Description**: Port for the standalone MCP server (`mcp-server.ts`)
- **Required**: No
- **Default**: `8080`
- **Usage**: Used when running the standalone MCP server
- **Note**: Only affects the standalone MCP server, not the Next.js app

### Environment Variable Best Practices

1. **Never commit `.env` files**: Add `.env` to `.gitignore`
2. **Use `.env.example`**: Commit `.env.example` with placeholder values
3. **Client vs Server**: 
   - Variables with `NEXT_PUBLIC_` prefix are exposed to the browser
   - Variables without prefix are server-side only (more secure)
4. **Restart after changes**: Next.js requires a restart to pick up new environment variables
5. **Production**: Use your hosting platform's environment variable configuration (Vercel, Railway, etc.)

### Quick Reference

| Variable | Required | Client-Side | Purpose |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | ✅ Yes | ✅ Yes | Wallet connection |
| `NEXT_PUBLIC_FACILITATOR_URL` | No | ✅ Yes | Facilitator endpoint |
| `CDP_API_KEY_ID` | If CDP | ❌ No | CDP authentication |
| `CDP_API_KEY_SECRET` | If CDP | ❌ No | CDP authentication |
| `AGENT_PAY_TO_ADDRESS` | No | ❌ No | Default payment address |
| `AGENT_PRIVATE_KEY` | No | ❌ No | Agent wallet (automated purchases) |
| `USE_SMART_ACCOUNT` | No | ❌ No | Enable smart account mode |
| `SMART_ACCOUNT_ADDRESS` | If smart account | ❌ No | Smart account address |
| `MCP_SERVER_URL` | No | ❌ No | MCP server connection |
| `GEMINI_API_KEY` | No | ❌ No | AI Barista feature |
| `PORT` | No | ❌ No | MCP server port |

## Architecture

### Project Structure

```
x402-vendor-app/
├── app/
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Main page component
│   ├── providers.tsx           # Wagmi/React Query providers
│   ├── globals.css             # Global styles
│   └── api/
│       ├── config/
│       │   └── route.ts        # API route for config (exposes AGENT_PAY_TO_ADDRESS)
│       ├── payment-intent/
│       │   └── route.ts        # Creates payment intents
│       └── payment/
│           └── route.ts        # Submits and settles payments
├── components/
│   ├── CreateItemForm.tsx      # Form for creating items
│   ├── ItemList.tsx            # List of items for sale
│   ├── ItemCard.tsx            # Individual item card
│   ├── ItemDetailsModal.tsx    # Detailed item information
│   ├── PurchaseModal.tsx       # Purchase flow modal
│   └── TemplateItems.tsx       # Template items for quick setup
├── config/
│   └── wagmi.ts                # Wagmi configuration
├── types/
│   └── item.ts                 # TypeScript types
├── utils/
│   ├── payment.ts              # Payment utilities
│   ├── itemStorage.ts          # LocalStorage management
│   ├── formatting.ts           # Price/address formatting
│   ├── constants.ts             # Network/asset constants
│   ├── config.ts                # Config utilities
│   └── templateItems.ts        # Template item definitions
├── package.json
├── next.config.js              # Next.js configuration
└── tsconfig.json               # TypeScript configuration
```

### Core Components

#### Payment Flow Architecture

The app implements a complete x402 v1 payment flow with the following steps:

1. **Payment Intent Creation** (`/api/payment-intent`)
2. **EIP-712 Signing** (client-side with wagmi/viem)
3. **Payment Verification** (`/api/payment` → facilitator `/verify`)
4. **Payment Settlement** (`/api/payment` → facilitator `/settle`)

## Technical Deep Dive

### x402 Payment Flow

The complete payment flow is implemented as follows:

#### 1. Creating Payment Requirements

Payment requirements are created using the `createPaymentRequirements` function:

```typescript
// utils/payment.ts
export function createPaymentRequirements(
  formData: CreateItemFormData,
  resource: string
): PaymentRequirements {
  return {
    asset: formData.asset,                    // Token contract address
    scheme: "exact",                          // Payment scheme
    network: formData.network,                // Network (e.g., "base")
    payTo: formData.payTo,                    // Vendor address
    description: formData.description,
    maxAmountRequired: formData.price,        // Amount in smallest unit
    resource,                                  // Resource URL
    mimeType: "application/json",
    maxTimeoutSeconds: 300,
    extra: formData.assetName
      ? {
          // Critical: USDC on Base uses "USD Coin" as EIP-712 domain name
          name: formData.assetName === "USDC" ? "USD Coin" : formData.assetName,
          version: "2", // EIP-712 domain version for USDC contract
        }
      : undefined,
  }
}
```

**Key Points:**
- Uses x402 v1 with friendly network names ("base" not "eip155:8453")
- For USDC on Base mainnet, `extra.name` must be "USD Coin" (not "USDC")
- `extra.version` is "2" (the USDC contract's EIP-712 domain version, not x402 version)

#### 2. Payment Intent Creation

Payment intents are created server-side via `/api/payment-intent`:

```typescript
// app/api/payment-intent/route.ts
export async function POST(request: NextRequest) {
  const { requirements, payer } = await request.json()
  
  // Create unsigned payment payload using x402 SDK
  const unsignedPaymentPayload = exact.evm.preparePaymentHeader(
    payer as `0x${string}`,
    1, // x402 version 1
    requirements
  )
  
  return NextResponse.json({
    id: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    requirements,
    payer,
    unsignedPaymentPayload, // Full unsigned payload for signing
    createdAt: new Date().toISOString(),
  })
}
```

**What happens:**
- `exact.evm.preparePaymentHeader` creates an unsigned payment authorization
- The authorization includes: `from`, `to`, `value`, `validAfter`, `validBefore`, `nonce`
- This is sent to the client for signing

#### 3. EIP-712 Signing (Client-Side)

The client signs the payment using EIP-712 structured data:

```typescript
// components/PurchaseModal.tsx
const handlePurchase = async () => {
  // Step 1: Create payment intent
  const intent = await createPaymentIntent(signingRequirements, address)
  
  // Step 2: Ensure correct EIP-712 domain name
  const signingRequirements = {
    ...requirements,
    extra: {
      ...requirements.extra,
      // Convert "USDC" to "USD Coin" for EIP-712 domain
      name: requirements.extra?.name === "USDC" ? "USD Coin" : requirements.extra?.name,
    },
  }
  
  // Step 3: Sign using SDK (handles EIP-712 automatically)
  const signedPaymentPayload = await exact.evm.signPaymentHeader(
    walletClient,
    signingRequirements,
    intent.unsignedPaymentPayload
  )
  
  // Step 4: Submit to facilitator
  const submittedPayment = await submitPayment(intent, signature, signedPaymentPayload)
  
  // Step 5: Extract settlement transaction hash
  if (submittedPayment.settlementTxHash) {
    setSettlementTxHash(submittedPayment.settlementTxHash)
  }
}
```

**EIP-712 Domain Structure:**

For USDC on Base mainnet, the EIP-712 domain is:

```json
{
  "name": "USD Coin",
  "version": "2",
  "chainId": 8453,
  "verifyingContract": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
}
```

**EIP-712 Message Structure:**

```json
{
  "from": "0x...",
  "to": "0x...",
  "value": "50000",
  "validAfter": "1767880158",
  "validBefore": "1767881058",
  "nonce": "0x..."
}
```

#### 4. Payment Verification

Before settlement, the payment is verified:

```typescript
// app/api/payment/route.ts
// Verify the payment first
const verifyRequestBody = {
  x402Version: 1,
  paymentPayload: toJsonSafe(paymentPayload),
  paymentRequirements: toJsonSafe(paymentIntent.requirements),
}

const verifyResponse = await fetch(`${facilitatorUrl}/verify`, {
  method: "POST",
  headers: verifyHeaders,
  body: JSON.stringify(verifyRequestBody),
})

const verifyResult = await verifyResponse.json()
// Response: { "isValid": true, "payer": "0x..." }
```

**Verification checks:**
- Signature validity
- Authorization parameter validity
- Timestamp validity
- Nonce uniqueness

#### 5. Payment Settlement

After verification passes, the payment is settled:

```typescript
// app/api/payment/route.ts
const requestBody = {
  x402Version: 1,
  paymentPayload: toJsonSafe(paymentPayload),
  paymentRequirements: toJsonSafe(paymentIntent.requirements),
}

const settleResponse = await fetch(`${facilitatorUrl}/settle`, {
  method: "POST",
  headers: settleHeaders,
  body: JSON.stringify(requestBody),
})

const settleData = await settleResponse.json()
// Response: { "settlementTxHash": "0x..." }
```

**Settlement process:**
1. Facilitator calls `transferWithAuthorization` on the USDC contract
2. Contract verifies the EIP-712 signature
3. Transfers USDC from payer to vendor
4. Returns the transaction hash

### CDP Facilitator Integration

The app uses the CDP facilitator for Base mainnet, which requires API key authentication:

```typescript
// utils/payment.ts
import { facilitator } from "@coinbase/x402"

export function getFacilitatorConfig(): FacilitatorConfig {
  const cdpApiKeyId = process.env.CDP_API_KEY_ID
  const cdpApiKeySecret = process.env.CDP_API_KEY_SECRET
  const facilitatorUrl = process.env.NEXT_PUBLIC_FACILITATOR_URL
  
  const isCDPFacilitator = facilitatorUrl?.includes("api.cdp.coinbase.com")
  
  if (cdpApiKeyId && cdpApiKeySecret && isCDPFacilitator) {
    // Use CDP facilitator helper (handles auth automatically)
    return facilitator
  }
  
  // Fallback to testnet facilitator
  return { url: FACILITATOR_URL }
}
```

**Authentication:**
- The `@coinbase/x402` package's `facilitator` helper automatically reads `CDP_API_KEY_ID` and `CDP_API_KEY_SECRET` from environment variables
- Creates Basic Auth headers for `/verify` and `/settle` endpoints
- No manual header construction needed

### Network Configuration

The app supports Base mainnet with x402 v1:

```typescript
// config/wagmi.ts
import { base } from "wagmi/chains"

export const config = createConfig({
  chains: [base], // Base mainnet (chainId: 8453)
  transports: {
    [base.id]: http(),
  },
  connectors: [
    walletConnect({ projectId }),
    coinbaseWallet({ appName: "x402 Vendor" }),
    injected(),
  ],
})
```

**Network Details:**
- **Base Mainnet**: Chain ID 8453
- **USDC Contract**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **x402 Version**: v1 (with friendly network names)
- **Network Format**: "base" (not "eip155:8453" for v1)

### API Routes

#### `/api/payment-intent` (POST)

Creates a payment intent with an unsigned payment payload.

**Request:**
```json
{
  "requirements": {
    "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "scheme": "exact",
    "network": "base",
    "payTo": "0x...",
    "maxAmountRequired": "50000",
    "extra": { "name": "USD Coin", "version": "2" }
  },
  "payer": "0x..."
}
```

**Response:**
```json
{
  "id": "pi_...",
  "requirements": { ... },
  "payer": "0x...",
  "unsignedPaymentPayload": {
    "x402Version": 1,
    "scheme": "exact",
    "network": "base",
    "payload": {
      "authorization": {
        "from": "0x...",
        "to": "0x...",
        "value": "50000",
        "validAfter": "1767880158",
        "validBefore": "1767881058",
        "nonce": "0x..."
      }
    }
  }
}
```

#### `/api/payment` (POST)

Submits a signed payment for verification and settlement.

**Request:**
```json
{
  "paymentIntent": { ... },
  "signature": "0x...",
  "signedPaymentPayload": {
    "x402Version": 1,
    "scheme": "exact",
    "network": "base",
    "payload": {
      "authorization": { ... },
      "signature": "0x..."
    }
  }
}
```

**Response:**
```json
{
  "id": "pay_...",
  "payload": { ... },
  "settlementTxHash": "0x...",
  "status": "settled"
}
```

**Process:**
1. Verifies payment with facilitator `/verify` endpoint
2. Settles payment with facilitator `/settle` endpoint
3. Returns settlement transaction hash

#### `/api/barista` (POST)

AI barista chat endpoint with optional x402 payment support via MCP.

**Request:**
```json
{
  "message": "What drinks do you have?",
  "history": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi! How can I help?" }
  ]
}
```

**Response:**
```json
{
  "response": "We have Matcha Green Tea, Classic Espresso, Boba Milk Tea...",
  "paidWithX402": true,
  "orderItem": "Matcha Green Tea"  // If customer ordered something
}
```

**Features:**
- Uses MCP server with x402 payments if `MCP_SERVER_URL` and `AGENT_PRIVATE_KEY` are configured
- Falls back to direct Gemini API if MCP not available
- Falls back to rule-based responses if Gemini not configured
- Detects order confirmations and extracts item names

**Required Environment Variables:**
- `GEMINI_API_KEY` (optional, for AI responses)
- `MCP_SERVER_URL` (optional, for x402-enabled MCP)
- `AGENT_PRIVATE_KEY` (optional, for MCP client)

#### `/api/barista/purchase` (POST)

Automated agent purchase endpoint using x402 payments.

**Request:**
```json
{
  "itemName": "Matcha Green Tea",
  "paymentRequirements": {
    "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "scheme": "exact",
    "network": "base",
    "payTo": "0x...",
    "maxAmountRequired": "350000",
    // ... other requirements
  }
}
```

**Response (EOA Mode):**
```json
{
  "success": true,
  "itemName": "Matcha Green Tea",
  "agentAddress": "0x...",
  "settlementTxHash": "0x...",
  "message": "Successfully purchased Matcha Green Tea!"
}
```

**Response (Smart Account Mode):**
```json
{
  "success": true,
  "itemName": "Matcha Green Tea",
  "agentAddress": "0x...",
  "message": "Successfully purchased Matcha Green Tea via Ampersend!"
}
```

**Modes:**
- **EOA Mode**: Direct wallet signing, requires `AGENT_PRIVATE_KEY`
- **Smart Account Mode**: Uses Ampersend with spend limits, requires `USE_SMART_ACCOUNT=true` and `SMART_ACCOUNT_ADDRESS`

**Required Environment Variables:**
- `AGENT_PRIVATE_KEY` (required)
- `USE_SMART_ACCOUNT` (optional, for smart account mode)
- `SMART_ACCOUNT_ADDRESS` (required if `USE_SMART_ACCOUNT=true`)
- `CDP_API_KEY_ID` and `CDP_API_KEY_SECRET` (for CDP facilitator)

#### `/api/config` (GET)

Returns configuration values accessible to the client.

**Response:**
```json
{
  "defaultPayToAddress": "0x..."
}
```

**Usage**: Exposes `AGENT_PAY_TO_ADDRESS` or `NEXT_PUBLIC_AGENT_PAY_TO_ADDRESS` to client-side components.

### Error Handling

The app includes comprehensive error handling:

```typescript
// Example error handling in PurchaseModal
try {
  const submittedPayment = await submitPayment(intent, signature, signedPaymentPayload)
  if (submittedPayment.settlementTxHash) {
    setSettlementTxHash(submittedPayment.settlementTxHash)
  }
} catch (err) {
  // Handle specific error types
  if (err.message.includes("settle_exact_node_failure")) {
    setError("Payment settlement failed. Check your USDC balance and try again.")
  } else {
    setError(err.message)
  }
}
```

**Common Errors:**
- `settle_exact_node_failure`: On-chain transaction failed (insufficient balance, invalid nonce, etc.)
- `Payment verification failed`: Signature or authorization invalid
- `Network mismatch`: Wallet on wrong network

## Usage

### Creating Items

1. Connect your wallet
2. Navigate to "Create Item" tab
3. Fill in item details:
   - **Item Name**: Product name
   - **Description**: Detailed description
   - **Price**: Amount in smallest unit (e.g., `50000` = 0.05 USDC)
   - **Network**: "base" (Base mainnet)
   - **Asset Address**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (Base USDC)
   - **Asset Name**: "USDC" (automatically converted to "USD Coin" for EIP-712)
   - **Payment Address**: Your vendor address (or use `AGENT_PAY_TO_ADDRESS`)
4. Click "Create Item"

### Purchasing Items

1. Browse items in "Browse Items" tab
2. Click "Purchase" on an item
3. Review payment details in modal
4. Click "Confirm Purchase"
5. Approve EIP-712 signature in wallet
6. Wait for settlement (transaction hash displayed)

### Template Items

The app includes template items for quick setup:

```typescript
// utils/templateItems.ts
export const templateItems = [
  {
    name: "Digital Art NFT - Abstract #1",
    price: "50000", // $0.05 USDC
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    // ...
  },
  // More templates...
]
```

Click "Add Template Items" to quickly populate your store.

### Optional Features

#### AI Barista Chat

The app includes an AI-powered barista chat feature that demonstrates x402 micropayments for AI services. To enable:

1. **Set up environment variables:**
   ```bash
   GEMINI_API_KEY=your_gemini_api_key
   AGENT_PAY_TO_ADDRESS=0x...  # Address to receive payments
   ```

2. **Start the MCP server** (optional, for x402-enabled MCP integration):
   ```bash
   npx tsx mcp-server.ts
   ```

3. **Configure MCP server URL** (if using MCP):
   ```bash
   MCP_SERVER_URL=http://localhost:8080/mcp
   AGENT_PRIVATE_KEY=0x...  # Agent wallet for automated purchases
   ```

The barista chat requires x402 micropayments for each AI response, demonstrating how x402 can be used for pay-per-use AI services.

#### Automated Agent Purchases

The app supports automated purchases via the `/api/barista/purchase` endpoint. This allows an agent to automatically purchase items using x402 payments.

**EOA Mode (Default):**
```bash
AGENT_PRIVATE_KEY=0x...  # EOA wallet private key
USE_SMART_ACCOUNT=false
```

**Smart Account Mode (Recommended):**
```bash
AGENT_PRIVATE_KEY=0x...  # Session key private key
USE_SMART_ACCOUNT=true
SMART_ACCOUNT_ADDRESS=0x...  # Smart account address from Ampersend
```

Smart account mode provides:
- Spend limits and monitoring via Ampersend
- Better security with session keys
- Automatic payment authorization

#### MCP Server Integration

The app can connect to an x402-enabled MCP server for tool-based interactions. The standalone MCP server (`mcp-server.ts`) provides a barista chat tool that requires x402 payments.

**Running the MCP Server:**
```bash
# Set required environment variables
export AGENT_PAY_TO_ADDRESS=0x...
export GEMINI_API_KEY=your_key  # Optional, for AI responses
export FACILITATOR_URL=https://x402.org/facilitator
export PORT=8080  # Optional, defaults to 8080

# Run the server
npx tsx mcp-server.ts
```

The server will start on `http://localhost:8080/mcp` and provide x402-enabled tools.

## Payment Configuration

### Networks

- **Base Mainnet**: Chain ID 8453, Network: "base"
- **Base Sepolia** (testnet): Chain ID 84532, Network: "base-sepolia"
- **Ethereum Mainnet**: Chain ID 1, Network: "mainnet"

### Assets

**Base Mainnet USDC:**
- Address: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Decimals: 6
- EIP-712 Domain Name: "USD Coin" (not "USDC")
- EIP-712 Domain Version: "2"

**Base Sepolia USDC:**
- Address: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- Decimals: 6

### Price Format

Prices are entered in the smallest unit:
- **USDC** (6 decimals): `50000` = 0.05 USDC, `1000000` = 1 USDC
- **ETH** (18 decimals): `1000000000000000000` = 1 ETH

## Development

### Building for Production

```bash
npm run build
npm start
```

The app runs on port 3010 by default (configured in `package.json`).

### Key Implementation Details

#### EIP-712 Domain Correction

**Critical**: The USDC contract on Base mainnet uses "USD Coin" as its EIP-712 domain name, not "USDC". The app automatically converts this:

```typescript
// components/PurchaseModal.tsx
const signingRequirements = {
  ...requirements,
  extra: {
    ...requirements.extra,
    name: requirements.extra?.name === "USDC" ? "USD Coin" : requirements.extra?.name,
  },
}
```

#### Network Switching

The app automatically switches the wallet network if needed:

```typescript
const requiredChainId = getChainIdFromNetwork(requirements.network)
if (requiredChainId && chainId !== requiredChainId) {
  await switchChain({ chainId: requiredChainId })
}
```

#### Transaction Status Tracking

The purchase modal tracks the complete payment flow:

```typescript
{paymentIntent && (
  <div>Payment Intent Created: {paymentIntent.id}</div>
)}
{payment && (
  <div>Payment Submitted: {payment.id}</div>
)}
{settlementTxHash && (
  <div>Transaction: {settlementTxHash}</div>
)}
```

## Troubleshooting

### Payment Verification Fails

**Error**: `Payment verification failed: Invalid signature`

**Solutions:**
- Ensure `extra.name` is "USD Coin" (not "USDC") for Base USDC
- Check that authorization timestamps are valid
- Verify the wallet is on the correct network

### Settlement Fails

**Error**: `settle_exact_node_failure`

**Common Causes:**
1. **Insufficient USDC balance** - Ensure payer has enough USDC
2. **Nonce already used** - Create a new payment intent
3. **Invalid authorization timestamps** - Check `validAfter`/`validBefore`

**Debug Steps:**
1. Check server logs for authorization details
2. Verify USDC balance on BaseScan
3. Check if nonce has been used before
4. Verify timestamps are within valid range

### Wallet Connection Issues

**Error**: Wallet not connecting

**Solutions:**
- Verify `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` is set
- Check browser console for errors
- Try a different wallet provider
- Restart dev server after changing env vars

### Environment Variable Issues

**Error**: Environment variable not working

**Common Issues:**
1. **Client-side variables not accessible:**
   - Variables must have `NEXT_PUBLIC_` prefix to be available in browser
   - Restart dev server after adding new variables
   - Check that variable name matches exactly (case-sensitive)

2. **CDP facilitator authentication fails:**
   - Verify `CDP_API_KEY_ID` and `CDP_API_KEY_SECRET` are set
   - Check that `NEXT_PUBLIC_FACILITATOR_URL` points to CDP facilitator
   - Ensure API keys are valid and not expired

3. **Agent purchase fails:**
   - Verify `AGENT_PRIVATE_KEY` is set and starts with `0x`
   - Check wallet has sufficient balance
   - For smart account mode, verify `SMART_ACCOUNT_ADDRESS` is correct
   - Ensure `USE_SMART_ACCOUNT` is set to `"true"` (string, not boolean)

4. **MCP server connection fails:**
   - Verify `MCP_SERVER_URL` is correct and server is running
   - Check that `AGENT_PRIVATE_KEY` is set for MCP client
   - Ensure facilitator URL is accessible from server

**Debug Steps:**
- Check server logs for environment variable values (be careful not to log secrets!)
- Use `console.log(process.env.VARIABLE_NAME)` in server-side code
- Verify `.env` file is in correct location (same directory as `next.config.js`)
- Restart dev server after any `.env` changes

### Network Mismatch

**Error**: `Provided chainId "84532" must match the active chainId "8453"`

**Solution:**
- The app automatically switches networks, but user must approve
- Ensure wallet supports Base mainnet

## API Reference

### Facilitator Endpoints

#### POST `/verify`

Verifies a payment signature and authorization.

**Request:**
```json
{
  "x402Version": 1,
  "paymentPayload": { ... },
  "paymentRequirements": { ... }
}
```

**Response:**
```json
{
  "isValid": true,
  "payer": "0x..."
}
```

#### POST `/settle`

Settles a verified payment on-chain.

**Request:**
```json
{
  "x402Version": 1,
  "paymentPayload": { ... },
  "paymentRequirements": { ... }
}
```

**Response:**
```json
{
  "settlementTxHash": "0x...",
  "success": true
}
```

## License

See the main repository license.
