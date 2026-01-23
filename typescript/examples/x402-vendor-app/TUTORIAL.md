# x402 Vendor App - Technical Walkthrough Tutorial

**Duration:** 20-30 minutes  
**Level:** Intermediate  
**Prerequisites:** Basic understanding of TypeScript, React, and blockchain concepts

This tutorial provides a comprehensive walkthrough of the x402 Vendor App, covering basic x402 integrations, Ampersend SDK usage, and how LLM-powered features work with x402 micropayments.

---

## Table of Contents

1. [Introduction to x402](#introduction-to-x402)
2. [Basic x402 Payment Flow](#basic-x402-payment-flow)
3. [Ampersend SDK Integration](#ampersend-sdk-integration)
4. [LLM Integration with x402 Payments](#llm-integration-with-x402-payments)
5. [Complete Configuration Guide](#complete-configuration-guide)
6. [Putting It All Together](#putting-it-all-together)

---

## Introduction to x402

x402 is a protocol for enabling micropayments on blockchain networks. It allows users to pay for services (like AI responses) without traditional payment rails, using on-chain token transfers with EIP-712 signatures.

### Key Concepts

- **Payment Requirements**: Define what payment is needed (amount, token, recipient)
- **Payment Intent**: An unsigned payment authorization ready for signing
- **Payment Payload**: A signed payment ready for settlement
- **Facilitator**: A service that verifies and settles payments on-chain
- **EIP-712 Signing**: Structured data signing for secure payment authorizations

---

## Basic x402 Payment Flow

The app implements a complete x402 v1 payment flow. Let's walk through each step:

### Step 1: Creating Payment Requirements

Payment requirements define what needs to be paid. Here's how we create them:

```typescript
// utils/payment.ts
import type { PaymentRequirements } from "x402/types"

export function createPaymentRequirements(
  formData: CreateItemFormData,
  resource: string
): PaymentRequirements {
  return {
    asset: formData.asset,                    // Token contract address (e.g., USDC)
    scheme: "exact",                          // Payment scheme (exact amount)
    network: formData.network,                // Network (e.g., "base" for Base mainnet)
    payTo: formData.payTo,                    // Vendor address to receive payment
    description: formData.description,
    maxAmountRequired: formData.price,        // Amount in smallest unit (e.g., 50000 = 0.05 USDC)
    resource,                                  // Resource URL being paid for
    mimeType: "application/json",
    maxTimeoutSeconds: 300,                   // Payment authorization validity window
    extra: formData.assetName
      ? {
          // Critical: USDC on Base uses "USD Coin" as EIP-712 domain name (not "USDC")
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
- `extra.version` is "2" (the USDC contract's EIP-712 domain version)

### Step 2: Creating a Payment Intent

The payment intent is created server-side and contains an unsigned payment payload:

```typescript
// app/api/payment-intent/route.ts
import { exact } from "x402/schemes"
import type { PaymentRequirements, UnsignedPaymentPayload } from "x402/types"

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
    unsignedPaymentPayload,
    createdAt: new Date().toISOString(),
  })
}
```

**What happens:**
- `exact.evm.preparePaymentHeader` creates an unsigned payment authorization
- The authorization includes: `from`, `to`, `value`, `validAfter`, `validBefore`, `nonce`
- This is sent to the client for signing

### Step 3: Client-Side EIP-712 Signing

The client signs the payment using EIP-712 structured data:

```typescript
// components/PurchaseModal.tsx
import { exact } from "x402/schemes"
import { useWalletClient } from "wagmi"

export function PurchaseModal({ item, onClose, onComplete }: PurchaseModalProps) {
  const { data: walletClient } = useWalletClient()
  
  const handlePurchase = async () => {
    // Step 1: Create payment intent
    const intent = await createPaymentIntent(signingRequirements, address)
    
    // Step 2: Ensure correct EIP-712 domain name for USDC
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
    const submittedPayment = await submitPayment(
      intent, 
      signedPaymentPayload.payload.signature, 
      signedPaymentPayload
    )
  }
}
```

**EIP-712 Domain Structure for USDC on Base:**

```json
{
  "name": "USD Coin",
  "version": "2",
  "chainId": 8453,
  "verifyingContract": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
}
```

### Step 4: Payment Verification and Settlement

The server verifies and settles the payment:

```typescript
// app/api/payment/route.ts
import { useFacilitator } from "x402/verify"
import { getFacilitatorConfig } from "@/utils/payment"

export async function POST(request: NextRequest) {
  const { paymentIntent, signature, signedPaymentPayload } = await request.json()
  
  // Get facilitator configuration
  const facilitator = useFacilitator(getFacilitatorConfig())
  
  // Verify the payment first
  const verifyResult = await facilitator.verify(
    signedPaymentPayload,
    paymentIntent.requirements
  )
  
  if (!verifyResult.isValid) {
    throw new Error("Payment verification failed")
  }
  
  // Settle the payment on-chain
  const settlementResult = await facilitator.settle(
    signedPaymentPayload,
    paymentIntent.requirements
  )
  
  return NextResponse.json({
    id: `pay_${Date.now()}`,
    settlementTxHash: settlementResult.settlementTxHash,
    status: "settled",
  })
}
```

**Settlement Process:**
1. Facilitator calls `transferWithAuthorization` on the USDC contract
2. Contract verifies the EIP-712 signature
3. Transfers USDC from payer to vendor
4. Returns the transaction hash

---

## Ampersend SDK Integration

The Ampersend SDK provides two modes for automated payments: **EOA (Externally Owned Account)** mode and **Smart Account** mode. Let's explore both.

### EOA Mode: Direct Wallet Signing

EOA mode uses a traditional wallet (private key) to sign payments directly:

```typescript
// app/api/barista/purchase/route.ts
import { createWalletFromConfig, type WalletConfig } from "@ampersend_ai/ampersend-sdk/x402"
import type { PaymentRequirements } from "x402/types"

export async function POST(request: NextRequest) {
  const { itemName, paymentRequirements } = await request.json()
  
  // Get agent private key from environment
  const agentPrivateKey = process.env.AGENT_PRIVATE_KEY as `0x${string}`
  
  // Configure wallet as EOA
  const walletConfig: WalletConfig = {
    type: "eoa",
    privateKey: agentPrivateKey,
  }
  
  // Create wallet from config
  const wallet = createWalletFromConfig(walletConfig)
  
  // Create and sign payment
  const signedPayment = await wallet.createPayment(paymentRequirements)
  
  // Submit to facilitator for settlement
  const facilitatorConfig = getFacilitatorConfig()
  const facilitatorUrl = facilitatorConfig.url || "https://api.cdp.coinbase.com/platform/v2/x402"
  
  // Prepare auth headers for CDP facilitator
  let headers: Record<string, string> = { "Content-Type": "application/json" }
  if (facilitatorConfig.createAuthHeaders) {
    const authHeaders = await facilitatorConfig.createAuthHeaders()
    headers = { ...headers, ...authHeaders.settle }
  }
  
  // Submit payment
  const settleResponse = await fetch(`${facilitatorUrl}/settle`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      x402Version: signedPayment.x402Version,
      paymentPayload: signedPayment,
      paymentRequirements,
    }),
  })
  
  const settleData = await settleResponse.json()
  return NextResponse.json({
    success: true,
    settlementTxHash: settleData.settlementTxHash,
  })
}
```

**Configuration for EOA Mode:**

```bash
# .env
AGENT_PRIVATE_KEY=0x...  # Your wallet private key (must start with 0x)
USE_SMART_ACCOUNT=false  # Use EOA mode
CDP_API_KEY_ID=your_key_id
CDP_API_KEY_SECRET=your_key_secret
```

### Smart Account Mode: Ampersend with Spend Limits

Smart Account mode uses Ampersend's smart account infrastructure with spend limits and monitoring:

```typescript
// app/api/barista/purchase/route.ts
import { createAmpersendTreasurer } from "@ampersend_ai/ampersend-sdk/ampersend"
import type { PaymentRequirements } from "x402/types"

export async function POST(request: NextRequest) {
  const { itemName, paymentRequirements } = await request.json()
  
  // Get configuration from environment
  const agentPrivateKey = process.env.AGENT_PRIVATE_KEY as `0x${string}`
  const smartAccountAddress = process.env.SMART_ACCOUNT_ADDRESS as `0x${string}`
  const useSmartAccount = process.env.USE_SMART_ACCOUNT === "true"
  
  if (useSmartAccount) {
    // Create Ampersend treasurer with smart account config
    const treasurer = createAmpersendTreasurer({
      apiUrl: "https://api.ampersend.ai", // Ampersend API URL
      walletConfig: {
        type: "smart-account",
        smartAccountAddress,              // Your smart account address
        sessionKeyPrivateKey: agentPrivateKey, // Session key (not main account key)
        chainId: 8453,                    // Base mainnet
        validatorAddress: "0x000000000013fdB5234E4E3162a810F54d9f7E98", // Default validator
      },
    })
    
    // Request payment authorization from Ampersend
    // Ampersend checks spend limits and authorizes the payment
    const authorization = await treasurer.onPaymentRequired(
      [paymentRequirements],
      { toolName: `purchase:${itemName}` }
    )
    
    if (!authorization) {
      throw new Error("Payment not authorized by Ampersend")
    }
    
    // Report payment status to Ampersend
    await treasurer.onStatus("sending", authorization, { toolName: `purchase:${itemName}` })
    
    // For smart accounts, Ampersend handles settlement automatically
    await treasurer.onStatus("accepted", authorization, { toolName: `purchase:${itemName}` })
    
    return NextResponse.json({
      success: true,
      agentAddress: smartAccountAddress,
      message: `Successfully purchased ${itemName} via Ampersend!`,
    })
  }
}
```

**Configuration for Smart Account Mode:**

```bash
# .env
AGENT_PRIVATE_KEY=0x...  # Session key private key (not main account key)
USE_SMART_ACCOUNT=true   # Enable smart account mode
SMART_ACCOUNT_ADDRESS=0x...  # Your smart account address from app.ampersend.ai
```

**Key Differences:**

| Feature | EOA Mode | Smart Account Mode |
|---------|----------|-------------------|
| **Signing** | Direct wallet signing | Session key signing |
| **Spend Limits** | None | Configurable via Ampersend |
| **Monitoring** | Manual | Automatic via Ampersend dashboard |
| **Security** | Full private key control | Session key with limits |
| **Settlement** | Manual facilitator call | Automatic via Ampersend |

### MCP Client Configuration

The app can also connect to MCP servers with x402 payment support:

```typescript
// app/api/barista/route.ts
import { Client } from "@ampersend_ai/ampersend-sdk/mcp/client"
import { AccountWallet, NaiveTreasurer } from "@ampersend_ai/ampersend-sdk/x402"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"

async function getMcpClient(): Promise<Client | null> {
  const privateKey = process.env.AGENT_PRIVATE_KEY as `0x${string}`
  const mcpServerUrl = process.env.MCP_SERVER_URL
  
  if (!privateKey || !mcpServerUrl) {
    return null
  }
  
  // Create wallet and treasurer
  const wallet = AccountWallet.fromPrivateKey(privateKey)
  const treasurer = new NaiveTreasurer(wallet)
  
  // Create MCP client with treasurer
  const client = new Client(
    { name: "virtual-barista", version: "1.0.0" },
    {
      mcpOptions: { capabilities: { tools: {} } },
      treasurer, // Handles x402 payments automatically
    }
  )
  
  // Connect to MCP server
  const transport = new StreamableHTTPClientTransport(new URL(mcpServerUrl))
  await client.connect(transport as any)
  
  return client
}

// Use the client to call tools
const client = await getMcpClient()
if (client) {
  const result = await client.callTool({
    name: "barista_chat",
    arguments: {
      message: "What drinks do you have?",
      history: JSON.stringify(history),
    },
  })
  // Payment is handled automatically by the treasurer
}
```

**Configuration:**

```bash
# .env
AGENT_PRIVATE_KEY=0x...  # Wallet for MCP client
MCP_SERVER_URL=http://localhost:8080/mcp  # MCP server endpoint
```

---

## LLM Integration with x402 Payments

The app includes an AI barista chat feature that demonstrates x402 micropayments for LLM services. Let's see how it works:

### MCP Server with x402 Payments

The MCP server provides a barista chat tool that requires x402 payments:

```typescript
// mcp-server.ts
import { withX402Payment, type OnPayment } from "@ampersend_ai/ampersend-sdk/mcp/server/fastmcp"
import { FastMCP } from "fastmcp"
import { useFacilitator } from "x402/verify"
import { GoogleGenAI } from "@google/genai"

// Create payment requirement for each chat interaction
function createPaymentRequirement(description: string): PaymentRequirements {
  return {
    asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC on Base Sepolia
    scheme: "exact",
    network: "base-sepolia",
    payTo: process.env.AGENT_PAY_TO_ADDRESS!,
    description,
    maxAmountRequired: "1000", // $0.001 USDC per chat
    resource: `http://localhost:${PORT}/mcp`,
    mimeType: "application/json",
    maxTimeoutSeconds: 300,
    extra: {
      name: "USDC",
      version: "2",
    },
  }
}

// Payment handler - settles payment when tool is called
const onPayment: OnPayment = async ({ payment, requirements }) => {
  console.log("Processing payment for barista chat...")
  const facilitator = useFacilitator({ url: process.env.FACILITATOR_URL! })
  return facilitator.settle(payment, requirements)
}

// Generate AI response using Gemini
async function generateBaristaResponse(message: string, historyJson: string): Promise<string> {
  const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
  
  const history = JSON.parse(historyJson || "[]")
  const conversationHistory = history.map((msg: any) => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.content }],
  }))
  
  const chat = gemini.chats.create({
    model: "gemini-2.0-flash",
    config: {
      systemInstruction: MENU_CONTEXT, // Barista personality and menu
    },
    history: conversationHistory,
  })
  
  const result = await chat.sendMessage({ message })
  return result.text || "I'm sorry, I couldn't generate a response."
}

// Add tool with x402 payment wrapper
server.addTool({
  name: "barista_chat",
  description: "Chat with the AI barista for drink recommendations",
  parameters: z.object({
    message: z.string().describe("User's message to the barista"),
    history: z.string().optional().describe("JSON stringified conversation history"),
  }),
  execute: withX402Payment({
    onExecute: async () => {
      return createPaymentRequirement("Chat with the AI barista")
    },
    onPayment, // Handles payment settlement
  })(async (args) => {
    // This function only runs after payment is verified and settled
    const response = await generateBaristaResponse(args.message, args.history || "[]")
    return response
  }),
})
```

**How It Works:**

1. **Client calls tool**: MCP client calls `barista_chat` tool
2. **Payment required**: `withX402Payment` wrapper intercepts the call
3. **Payment flow**: Client signs and submits payment via x402
4. **Payment verified**: Server verifies payment signature
5. **Payment settled**: Server settles payment on-chain
6. **Tool executes**: Only after payment is settled, the AI generates a response
7. **Response returned**: AI response is sent back to client

### API Route Integration

The Next.js API route can use the MCP client or fall back to direct Gemini:

```typescript
// app/api/barista/route.ts
export async function POST(request: NextRequest) {
  const { message, history = [] } = await request.json()
  
  // Try MCP client first (with x402 payments)
  const client = await getMcpClient()
  if (client) {
    try {
      const result = await client.callTool({
        name: "barista_chat",
        arguments: { message, history: JSON.stringify(history) },
      })
      
      return NextResponse.json({ 
        response: result.content[0].text,
        paidWithX402: true 
      })
    } catch (mcpError) {
      // Fall through to direct Gemini
    }
  }
  
  // Fallback: Direct Gemini (no x402 payment)
  const gemini = getGeminiClient()
  if (gemini) {
    const response = await generateGeminiResponse(message, history)
    return NextResponse.json({ 
      response,
      paidWithX402: false 
    })
  }
  
  // Final fallback: Rule-based responses
  return NextResponse.json({ 
    response: generateFallbackResponse(message, history),
    paidWithX402: false 
  })
}
```

---

## Complete Configuration Guide

Here's a complete configuration example for all features:

### Environment Variables

```bash
# .env

# ===== Required =====
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_wallet_connect_project_id

# ===== x402 Facilitator =====
NEXT_PUBLIC_FACILITATOR_URL=https://api.cdp.coinbase.com/platform/v2/x402
CDP_API_KEY_ID=your_cdp_api_key_id
CDP_API_KEY_SECRET=your_cdp_api_key_secret

# ===== Payment Address =====
AGENT_PAY_TO_ADDRESS=0x...  # Address to receive payments

# ===== Agent Wallet (for automated purchases) =====
AGENT_PRIVATE_KEY=0x...  # Must start with 0x

# ===== Smart Account Mode (optional) =====
USE_SMART_ACCOUNT=false  # Set to "true" for smart account mode
SMART_ACCOUNT_ADDRESS=0x...  # Required if USE_SMART_ACCOUNT=true

# ===== MCP Server (optional) =====
MCP_SERVER_URL=http://localhost:8080/mcp

# ===== Google Gemini (optional, for AI Barista) =====
GEMINI_API_KEY=your_gemini_api_key

# ===== MCP Server Port (optional) =====
PORT=8080
```

### Configuration Functions

```typescript
// utils/payment.ts
import { facilitator } from "@coinbase/x402"
import type { FacilitatorConfig } from "x402/types"

export function getFacilitatorConfig(): FacilitatorConfig {
  const cdpApiKeyId = process.env.CDP_API_KEY_ID
  const cdpApiKeySecret = process.env.CDP_API_KEY_SECRET
  const facilitatorUrl = process.env.NEXT_PUBLIC_FACILITATOR_URL || 
                         process.env.FACILITATOR_URL || 
                         "https://x402.org/facilitator"
  
  const isCDPFacilitator = facilitatorUrl.includes("api.cdp.coinbase.com")
  
  if (cdpApiKeyId && cdpApiKeySecret && isCDPFacilitator) {
    // Use CDP facilitator helper (handles auth automatically)
    return facilitator
  }
  
  // Fallback to testnet facilitator
  return { url: facilitatorUrl }
}
```

### Complete Ampersend Configuration

```typescript
// Complete example: Smart Account Mode
import { createAmpersendTreasurer } from "@ampersend_ai/ampersend-sdk/ampersend"

const treasurer = createAmpersendTreasurer({
  apiUrl: "https://api.ampersend.ai", // Production
  // apiUrl: "https://api.staging.ampersend.ai", // Staging
  walletConfig: {
    type: "smart-account",
    smartAccountAddress: "0x...", // From app.ampersend.ai
    sessionKeyPrivateKey: "0x...", // Session key (not main account)
    chainId: 8453, // Base mainnet
    validatorAddress: "0x000000000013fdB5234E4E3162a810F54d9f7E98", // Default validator
  },
})

// Use treasurer for payments
const authorization = await treasurer.onPaymentRequired(
  [paymentRequirements],
  { toolName: "my-tool" }
)

// Report status
await treasurer.onStatus("sending", authorization, { toolName: "my-tool" })
await treasurer.onStatus("accepted", authorization, { toolName: "my-tool" })
```

### Complete MCP Server Configuration

```typescript
// mcp-server.ts - Complete setup
import { withX402Payment } from "@ampersend_ai/ampersend-sdk/mcp/server/fastmcp"
import { FastMCP } from "fastmcp"
import { useFacilitator } from "x402/verify"

const server = new FastMCP({
  name: "My x402 Service",
  version: "1.0.0",
})

// Configure facilitator
const facilitatorConfig = {
  url: process.env.FACILITATOR_URL || "https://x402.org/facilitator"
}

// Payment handler
const onPayment: OnPayment = async ({ payment, requirements }) => {
  const facilitator = useFacilitator(facilitatorConfig)
  return facilitator.settle(payment, requirements)
}

// Add tool with payment
server.addTool({
  name: "my_tool",
  description: "My tool that requires payment",
  parameters: z.object({
    input: z.string(),
  }),
  execute: withX402Payment({
    onExecute: async () => {
      return {
        asset: "0x...",
        scheme: "exact",
        network: "base-sepolia",
        payTo: process.env.AGENT_PAY_TO_ADDRESS!,
        maxAmountRequired: "1000",
        description: "Tool usage fee",
        resource: "http://localhost:8080/mcp",
        mimeType: "application/json",
        maxTimeoutSeconds: 300,
      }
    },
    onPayment,
  })(async (args) => {
    // Your tool logic here
    return "Tool result"
  }),
})

// Start server
await server.start({
  transportType: "httpStream",
  httpStream: {
    port: Number(process.env.PORT || 8080),
    endpoint: "/mcp",
  },
})
```

---

## Putting It All Together

### Architecture Overview

```
┌─────────────────┐
│   User Wallet   │
│  (Browser/App)  │
└────────┬────────┘
         │
         │ 1. Create Payment Intent
         ▼
┌─────────────────┐
│  Next.js API    │
│  /payment-intent│
└────────┬────────┘
         │
         │ 2. Sign Payment (EIP-712)
         ▼
┌─────────────────┐
│  Next.js API    │
│    /payment     │
└────────┬────────┘
         │
         │ 3. Verify & Settle
         ▼
┌─────────────────┐
│   Facilitator   │
│  (CDP/Testnet)  │
└────────┬────────┘
         │
         │ 4. On-chain Transfer
         ▼
┌─────────────────┐
│  USDC Contract  │
│   (Base/Test)   │
└─────────────────┘
```

### For Automated Purchases (Agent Mode)

```
┌─────────────────┐
│  Agent/Server   │
│  (EOA or Smart) │
└────────┬────────┘
         │
         │ 1. Create Payment
         ▼
┌─────────────────┐
│ Ampersend SDK   │
│  (if Smart Acct) │
└────────┬────────┘
         │
         │ 2. Authorize & Sign
         ▼
┌─────────────────┐
│   Facilitator   │
└────────┬────────┘
         │
         │ 3. Settle
         ▼
┌─────────────────┐
│  USDC Contract  │
└─────────────────┘
```

### For LLM with x402 Payments

```
┌─────────────────┐
│  MCP Client     │
│  (Next.js API)  │
└────────┬────────┘
         │
         │ 1. Call Tool
         ▼
┌─────────────────┐
│  MCP Server     │
│ (withX402Payment)│
└────────┬────────┘
         │
         │ 2. Payment Required
         │ 3. Client Signs
         │ 4. Payment Settled
         ▼
┌─────────────────┐
│  LLM (Gemini)   │
│  Generate Response│
└────────┬────────┘
         │
         │ 5. Return Response
         ▼
┌─────────────────┐
│  MCP Client     │
└─────────────────┘
```

---

## Key Takeaways

1. **x402 enables micropayments** without traditional payment rails
2. **EIP-712 signing** provides secure, structured payment authorizations
3. **Facilitators** handle verification and on-chain settlement
4. **Ampersend SDK** adds smart account features with spend limits
5. **MCP integration** enables pay-per-use LLM services
6. **Smart Account mode** provides better security and monitoring than EOA

---

## Next Steps

- Explore the codebase in `app/api/`, `components/`, and `utils/`
- Try running the MCP server: `npm run mcp-server`
- Experiment with different payment amounts and networks
- Set up a smart account at [app.ampersend.ai](https://app.ampersend.ai)
- Build your own x402-enabled service!

---

## Resources

- [x402 Protocol Documentation](https://x402.org)
- [Ampersend SDK Documentation](https://github.com/edgeandnode/ampersend-sdk)
- [CDP Facilitator](https://portal.cdp.coinbase.com)
- [EIP-712 Specification](https://eips.ethereum.org/EIPS/eip-712)

---

**Questions?** Check the main README.md for more details or open an issue on GitHub.
