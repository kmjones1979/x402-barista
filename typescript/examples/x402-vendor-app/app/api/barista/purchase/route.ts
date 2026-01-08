import { NextRequest, NextResponse } from "next/server"
import { createAmpersendTreasurer } from "@ampersend_ai/ampersend-sdk/ampersend"
import { createWalletFromConfig, type WalletConfig } from "@ampersend_ai/ampersend-sdk/x402"
import type { PaymentRequirements, FacilitatorConfig } from "x402/types"
import { facilitator } from "@coinbase/x402"

interface PurchaseRequest {
  itemName: string
  paymentRequirements: PaymentRequirements
}

// Smart account configuration
const SMART_ACCOUNT_ADDRESS = "0x6327F25caD99f9fad78A6bb0C97d106159AE6180"
const DEFAULT_VALIDATOR_ADDRESS = "0x000000000013fdB5234E4E3162a810F54d9f7E98"
const BASE_CHAIN_ID = 8453
const AMPERSEND_API_URL = "https://api.ampersend.ai"

// Get facilitator config for EOA mode
function getFacilitatorConfig(): FacilitatorConfig {
  const cdpApiKeyId = process.env.CDP_API_KEY_ID
  const cdpApiKeySecret = process.env.CDP_API_KEY_SECRET
  
  if (cdpApiKeyId && cdpApiKeySecret) {
    console.log("Using CDP facilitator with API keys")
    return facilitator
  }
  
  const facilitatorUrl = process.env.NEXT_PUBLIC_FACILITATOR_URL || 
                         process.env.FACILITATOR_URL || 
                         "https://x402.org/facilitator"
  console.log("Using facilitator URL:", facilitatorUrl)
  return { url: facilitatorUrl }
}

// Helper to convert BigInt values to strings for JSON
function toJsonSafe(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === "bigint") return obj.toString()
  if (Array.isArray(obj)) return obj.map(toJsonSafe)
  if (typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([key, val]) => [key, toJsonSafe(val)])
    )
  }
  return obj
}

export async function POST(request: NextRequest) {
  try {
    const body: PurchaseRequest = await request.json()
    const { itemName, paymentRequirements } = body

    // Validate agent private key
    const agentPrivateKey = process.env.AGENT_PRIVATE_KEY as `0x${string}` | undefined
    if (!agentPrivateKey) {
      return NextResponse.json(
        { error: "Agent wallet not configured. Set AGENT_PRIVATE_KEY in environment." },
        { status: 500 }
      )
    }

    if (!agentPrivateKey.startsWith("0x")) {
      return NextResponse.json(
        { error: "AGENT_PRIVATE_KEY must start with 0x" },
        { status: 500 }
      )
    }

    // Check if we should use smart account or EOA
    const useSmartAccount = process.env.USE_SMART_ACCOUNT === "true"
    
    if (useSmartAccount) {
      // ===== SMART ACCOUNT MODE: Use Ampersend Treasurer =====
      console.log("Using Ampersend Smart Account")
      
      const smartAccountAddress = (process.env.SMART_ACCOUNT_ADDRESS || SMART_ACCOUNT_ADDRESS) as `0x${string}`
      
      // Create Ampersend treasurer with smart account config
      const treasurer = createAmpersendTreasurer({
        apiUrl: AMPERSEND_API_URL,
        walletConfig: {
          type: "smart-account",
          smartAccountAddress,
          sessionKeyPrivateKey: agentPrivateKey,
          chainId: BASE_CHAIN_ID,
          validatorAddress: DEFAULT_VALIDATOR_ADDRESS as `0x${string}`,
        },
      })

      console.log(`Smart Account address: ${smartAccountAddress}`)
      console.log(`Processing purchase for: ${itemName}`)
      console.log(`Payment requirements:`, JSON.stringify(paymentRequirements, null, 2))

      // Use treasurer to authorize and create payment
      console.log("Requesting payment authorization from Ampersend...")
      const authorization = await treasurer.onPaymentRequired(
        [paymentRequirements],
        { toolName: `purchase:${itemName}` }
      )

      if (!authorization) {
        throw new Error("Payment not authorized by Ampersend")
      }

      console.log("Payment authorized:", JSON.stringify(toJsonSafe(authorization), null, 2))

      // Report payment as sent
      await treasurer.onStatus("sending", authorization, { toolName: `purchase:${itemName}` })

      // The authorization contains the signed payment
      // For smart accounts, Ampersend handles settlement
      await treasurer.onStatus("accepted", authorization, { toolName: `purchase:${itemName}` })

      return NextResponse.json({
        success: true,
        itemName,
        agentAddress: smartAccountAddress,
        message: `Successfully purchased ${itemName} via Ampersend!`,
      })

    } else {
      // ===== EOA MODE: Use CDP Facilitator directly =====
      console.log("Using EOA wallet with CDP facilitator")
      
      const walletConfig: WalletConfig = {
        type: "eoa",
        privateKey: agentPrivateKey,
      }
      
      // Derive address from private key
      const { privateKeyToAccount } = await import("viem/accounts")
      const account = privateKeyToAccount(agentPrivateKey)
      const agentAddress = account.address

      // Create wallet
      const wallet = createWalletFromConfig(walletConfig)

      console.log(`Agent wallet address: ${agentAddress}`)
      console.log(`Processing purchase for: ${itemName}`)
      console.log(`Payment requirements:`, JSON.stringify(paymentRequirements, null, 2))

      // Get facilitator config
      const facilitatorConfig = getFacilitatorConfig()
      const facilitatorUrl = facilitatorConfig.url || "https://api.cdp.coinbase.com/platform/v2/x402"

      // Create signed payment
      console.log("Creating signed payment...")
      const signedPayment = await wallet.createPayment(paymentRequirements)
      console.log("Payment created and signed")

      // Prepare auth headers
      let headers: Record<string, string> = { "Content-Type": "application/json" }
      if (facilitatorConfig.createAuthHeaders) {
        const authHeaders = await facilitatorConfig.createAuthHeaders()
        headers = { ...headers, ...authHeaders.settle }
      }

      // Prepare request body
      const requestBody = {
        x402Version: typeof signedPayment.x402Version === "string" 
          ? parseInt(signedPayment.x402Version, 10) 
          : signedPayment.x402Version,
        paymentPayload: toJsonSafe(signedPayment),
        paymentRequirements: toJsonSafe(paymentRequirements),
      }

      // Submit to facilitator
      console.log("Submitting payment for settlement...")
      const settleResponse = await fetch(`${facilitatorUrl}/settle`, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      })

      if (!settleResponse.ok) {
        const errorBody = await settleResponse.text()
        console.error("Settlement error:", errorBody)
        throw new Error(errorBody || `Settlement failed: ${settleResponse.status}`)
      }

      const settleData = await settleResponse.json()
      const txHash = settleData.settlementTxHash || settleData.txHash || settleData.hash
      
      console.log("Settlement successful:", txHash)

      return NextResponse.json({
        success: true,
        itemName,
        agentAddress,
        settlementTxHash: txHash,
        message: `Successfully purchased ${itemName}!`,
      })
    }

  } catch (error: any) {
    console.error("Agent purchase error:", error)
    return NextResponse.json(
      { 
        error: error.message || "Failed to process agent purchase",
        details: error.toString()
      },
      { status: 500 }
    )
  }
}
