/**
 * Virtual Barista MCP Server with x402 Payment Support
 * 
 * This server provides an AI barista chat tool that requires x402 micropayments.
 * Run with: npx tsx mcp-server.ts
 * 
 * Environment variables:
 * - PORT: Server port (default: 8080)
 * - AGENT_PAY_TO_ADDRESS: Address to receive payments
 * - GEMINI_API_KEY: Google Gemini API key for AI responses
 * - FACILITATOR_URL: x402 facilitator URL (default: https://x402.org/facilitator)
 */

import "dotenv/config"
import { withX402Payment, type OnPayment } from "@ampersend_ai/ampersend-sdk/mcp/server/fastmcp"
import { FastMCP } from "fastmcp"
import type { FacilitatorConfig, PaymentRequirements } from "x402/types"
import { useFacilitator } from "x402/verify"
import { z } from "zod"
import { GoogleGenAI } from "@google/genai"

const PORT = process.env.PORT || 8080
const PAY_TO_ADDRESS = process.env.AGENT_PAY_TO_ADDRESS || process.env.NEXT_PUBLIC_AGENT_PAY_TO_ADDRESS

// Menu context for the AI barista
const MENU_CONTEXT = `You are a friendly, knowledgeable virtual barista at "Artisan Coffee & Tea" shop. 
You help customers choose drinks and answer questions about the menu.

Our current menu includes:
1. Matcha Green Tea ($3.50) - Premium ceremonial grade matcha, whisked to perfection with a smooth, earthy flavor
2. Classic Espresso ($2.50) - Rich, bold double shot with caramel notes and a perfect crema
3. Boba Milk Tea ($4.50) - Creamy milk tea with chewy tapioca pearls, available in classic or taro flavor
4. Iced Cold Brew Coffee ($4.00) - Slow-steeped for 24 hours, smooth and refreshing with low acidity
5. Earl Grey Tea ($3.00) - Fragrant bergamot-infused black tea, perfect hot or iced
6. Cappuccino ($4.00) - Velvety steamed milk layered over espresso with artistic foam

IMPORTANT BEHAVIOR:
- When a customer confirms they want to order (says "yes", "sure", "I'll take it", "sounds good", "perfect", "order", "buy", "purchase", "get that", "let's do it"), you MUST respond with EXACTLY this format:
  "Great! Let me ring that up for you. [ORDER:Item Name]"
  Replace "Item Name" with the exact menu item name they're ordering.
- Only include [ORDER:...] when the customer has CONFIRMED they want to purchase.
- If they're just asking questions or browsing, do NOT include [ORDER:...].

Be conversational, friendly, and helpful. Make personalized recommendations based on customer preferences.
Keep responses concise (2-3 sentences max) unless they ask for detailed information.
Never use emojis. Be warm but professional.`

// Configure facilitator
const facilitatorConfig: FacilitatorConfig = (() => {
  const facilitatorUrl = process.env.FACILITATOR_URL || "https://x402.org/facilitator"
  const verifyFacilitatorUrl = (url: string): url is `${string}://${string}` => {
    return /^https?:\/\/.+/.test(url)
  }

  if (!verifyFacilitatorUrl(facilitatorUrl)) {
    throw new Error(`FACILITATOR_URL must be a valid URL: ${facilitatorUrl}`)
  }
  return { url: facilitatorUrl }
})()

// Initialize Gemini
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not set - barista will use fallback responses")
    return null
  }
  return new GoogleGenAI({ apiKey })
}

const gemini = getGeminiClient()

// Create FastMCP server
const server = new FastMCP({
  name: "Virtual Barista x402",
  version: "1.0.0",
})

// Payment requirement generator
function createPaymentRequirement(description: string): PaymentRequirements {
  if (!PAY_TO_ADDRESS) {
    throw new Error("AGENT_PAY_TO_ADDRESS must be set")
  }
  
  return {
    asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC on Base Sepolia
    scheme: "exact",
    network: "base-sepolia",
    payTo: PAY_TO_ADDRESS,
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

// Payment handler
const onPayment: OnPayment = async ({ payment, requirements }) => {
  console.log("Processing payment for barista chat...")
  return useFacilitator(facilitatorConfig).settle(payment, requirements)
}

// Generate AI response
async function generateBaristaResponse(message: string, historyJson: string): Promise<string> {
  if (!gemini) {
    return generateFallbackResponse(message, historyJson)
  }

  try {
    const history = JSON.parse(historyJson || "[]")
    
    const conversationHistory = history.map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }))

    const chat = gemini.chats.create({
      model: "gemini-2.0-flash",
      config: {
        systemInstruction: MENU_CONTEXT,
      },
      history: conversationHistory,
    })

    const result = await chat.sendMessage({ message })
    return result.text || generateFallbackResponse(message, historyJson)
  } catch (error) {
    console.error("Gemini error:", error)
    return generateFallbackResponse(message, historyJson)
  }
}

// Menu items for matching
const MENU_ITEMS = [
  { name: "Matcha Green Tea", keywords: ["matcha", "green tea"] },
  { name: "Classic Espresso", keywords: ["espresso", "shot"] },
  { name: "Boba Milk Tea", keywords: ["boba", "bubble tea", "milk tea", "tapioca"] },
  { name: "Iced Cold Brew Coffee", keywords: ["cold brew", "iced coffee"] },
  { name: "Earl Grey Tea", keywords: ["earl grey", "bergamot"] },
  { name: "Cappuccino", keywords: ["cappuccino", "cap"] },
]

// Detect last mentioned item from history
function detectLastMentionedItem(historyJson: string): string | null {
  try {
    const history = JSON.parse(historyJson || "[]")
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i]
      const lower = msg.content.toLowerCase()
      for (const item of MENU_ITEMS) {
        if (lower.includes(item.name.toLowerCase())) return item.name
        for (const keyword of item.keywords) {
          if (lower.includes(keyword)) return item.name
        }
      }
    }
  } catch {}
  return null
}

// Check if message is order confirmation
function isOrderConfirmation(message: string): boolean {
  const confirmPhrases = ["yes", "yeah", "yep", "sure", "ok", "okay", "sounds good", "perfect", 
    "i'll take", "let's do", "order", "buy", "purchase", "get that", "ring it up"]
  const lower = message.toLowerCase()
  return confirmPhrases.some(phrase => lower.includes(phrase))
}

// Fallback responses
function generateFallbackResponse(message: string, historyJson: string): string {
  const lower = message.toLowerCase()
  
  // Check for order confirmation
  if (isOrderConfirmation(message)) {
    const lastItem = detectLastMentionedItem(historyJson)
    if (lastItem) {
      return `Great! Let me ring that up for you. [ORDER:${lastItem}]`
    }
  }
  
  if (lower.includes("strong") || lower.includes("caffeine")) {
    return "For a strong caffeine kick, try our Classic Espresso or Iced Cold Brew!"
  }
  if (lower.includes("espresso")) {
    return "Our Classic Espresso ($2.50) is a bold double shot. Would you like one?"
  }
  if (lower.includes("boba") || lower.includes("bubble")) {
    return "Our Boba Milk Tea ($4.50) is amazing with fresh chewy tapioca pearls!"
  }
  if (lower.includes("tea")) {
    return "We have Matcha Green Tea ($3.50) and Earl Grey ($3.00) - both excellent choices!"
  }
  if (lower.includes("cappuccino")) {
    return "Our Cappuccino ($4.00) has velvety steamed milk. Want one?"
  }
  if (lower.includes("menu") || lower.includes("options")) {
    return "We have Espresso, Cold Brew, Cappuccino, Matcha, Earl Grey, and Boba Milk Tea!"
  }
  
  return "What can I get for you? We have great coffee, tea, and boba options!"
}

// Barista chat tool with x402 payment
const baristaDescription = "Chat with the AI barista for drink recommendations"
server.addTool({
  name: "barista_chat",
  description: baristaDescription,
  parameters: z.object({
    message: z.string().describe("User's message to the barista"),
    history: z.string().optional().describe("JSON stringified conversation history"),
  }),
  execute: withX402Payment({
    onExecute: async () => {
      return createPaymentRequirement(baristaDescription)
    },
    onPayment,
  })(async (args) => {
    const response = await generateBaristaResponse(args.message, args.history || "[]")
    return response
  }),
})

// Free echo tool for testing connectivity
server.addTool({
  name: "ping",
  description: "Test connectivity (free, no payment required)",
  parameters: z.object({}),
  execute: async () => {
    return "pong - Virtual Barista MCP server is running!"
  },
})

// Start server
async function start() {
  if (!PAY_TO_ADDRESS) {
    console.error("Error: AGENT_PAY_TO_ADDRESS environment variable must be set")
    process.exit(1)
  }

  console.log(`\n☕ Virtual Barista MCP Server`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`Port: ${PORT}`)
  console.log(`Endpoint: http://localhost:${PORT}/mcp`)
  console.log(`Pay-to Address: ${PAY_TO_ADDRESS}`)
  console.log(`Gemini: ${gemini ? "Configured" : "Not configured (using fallbacks)"}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

  await server.start({
    transportType: "httpStream",
    httpStream: {
      port: Number(PORT),
      endpoint: "/mcp",
    },
  })
}

start().catch((error) => {
  console.error("Failed to start server:", error)
  process.exit(1)
})
