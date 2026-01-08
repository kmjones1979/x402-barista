import { NextRequest, NextResponse } from "next/server"
import { Client } from "@ampersend_ai/ampersend-sdk/mcp/client"
import { AccountWallet, NaiveTreasurer } from "@ampersend_ai/ampersend-sdk/x402"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { GoogleGenAI } from "@google/genai"

// Menu items with exact names for matching
const MENU_ITEMS = [
  { name: "Matcha Green Tea", price: "$3.50", keywords: ["matcha", "green tea"] },
  { name: "Classic Espresso", price: "$2.50", keywords: ["espresso", "shot"] },
  { name: "Boba Milk Tea", price: "$4.50", keywords: ["boba", "bubble tea", "milk tea", "tapioca"] },
  { name: "Iced Cold Brew Coffee", price: "$4.00", keywords: ["cold brew", "iced coffee"] },
  { name: "Earl Grey Tea", price: "$3.00", keywords: ["earl grey", "bergamot"] },
  { name: "Cappuccino", price: "$4.00", keywords: ["cappuccino", "cap"] },
]

// Menu context for the AI
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

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

interface BaristaRequest {
  message: string
  history?: ChatMessage[]
}

// Singleton MCP client
let mcpClient: Client | null = null
let mcpClientPromise: Promise<Client> | null = null

async function getMcpClient(): Promise<Client | null> {
  const privateKey = process.env.AGENT_PRIVATE_KEY as `0x${string}` | undefined
  const mcpServerUrl = process.env.MCP_SERVER_URL

  if (!privateKey || !mcpServerUrl) {
    return null
  }

  // Return existing client if available
  if (mcpClient) {
    return mcpClient
  }

  // If connection is in progress, wait for it
  if (mcpClientPromise) {
    return mcpClientPromise
  }

  // Start new connection
  mcpClientPromise = (async () => {
    try {
      const wallet = AccountWallet.fromPrivateKey(privateKey)
      const treasurer = new NaiveTreasurer(wallet)

      const client = new Client(
        { name: "virtual-barista", version: "1.0.0" },
        {
          mcpOptions: { capabilities: { tools: {} } },
          treasurer,
        }
      )

      const transport = new StreamableHTTPClientTransport(new URL(mcpServerUrl))
      await client.connect(transport as any)
      
      console.log("Connected to MCP server:", mcpServerUrl)
      mcpClient = client
      return client
    } catch (error) {
      console.error("Failed to connect to MCP server:", error)
      mcpClientPromise = null
      return null
    }
  })()

  return mcpClientPromise
}

// Initialize Gemini client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return null
  }
  return new GoogleGenAI({ apiKey })
}

// Generate response using Gemini
async function generateGeminiResponse(message: string, history: ChatMessage[]): Promise<string> {
  const gemini = getGeminiClient()
  
  if (!gemini) {
    throw new Error("Gemini not configured")
  }

  // Build conversation history for Gemini
  const conversationHistory = history.map((msg) => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.content }],
  }))

  // Create the chat with system instruction
  const chat = gemini.chats.create({
    model: "gemini-2.0-flash",
    config: {
      systemInstruction: MENU_CONTEXT,
    },
    history: conversationHistory,
  })

  // Send the message and get response
  const result = await chat.sendMessage({
    message: message,
  })

  return result.text || "I'm sorry, I couldn't generate a response. Could you try asking again?"
}

export async function POST(request: NextRequest) {
  try {
    const body: BaristaRequest = await request.json()
    const { message, history = [] } = body

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    // Try to use MCP client with x402 payments if configured
    const client = await getMcpClient()
    
    if (client) {
      try {
        // Call the barista tool via MCP with x402 payment
        const result = await client.callTool({
          name: "barista_chat",
          arguments: {
            message: message,
            history: JSON.stringify(history),
          },
        })

        // Extract text content from result
        const textContent = result.content?.find((c: any) => c.type === "text")
        if (textContent && "text" in textContent) {
          return NextResponse.json({ 
            response: textContent.text,
            paidWithX402: true 
          })
        }
      } catch (mcpError: any) {
        console.error("MCP call failed:", mcpError)
        // Fall through to Gemini if MCP fails
      }
    }

    // Fallback to direct Gemini call if MCP not configured or fails
    const gemini = getGeminiClient()
    
    if (gemini) {
      try {
        const response = await generateGeminiResponse(message, history)
        const parsed = parseOrderFromResponse(response)
        return NextResponse.json({ 
          response: parsed.cleanResponse,
          paidWithX402: false,
          orderItem: parsed.orderItem,
        })
      } catch (geminiError) {
        console.error("Gemini API error:", geminiError)
      }
    }

    // Final fallback to rule-based responses
    const response = generateFallbackResponse(message, history)
    const parsed = parseOrderFromResponse(response)
    return NextResponse.json({ 
      response: parsed.cleanResponse,
      paidWithX402: false,
      orderItem: parsed.orderItem,
    })

  } catch (error) {
    console.error("Barista API error:", error)
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
}

// Parse [ORDER:Item Name] from response
function parseOrderFromResponse(response: string): { cleanResponse: string; orderItem: string | null } {
  const orderMatch = response.match(/\[ORDER:([^\]]+)\]/)
  if (orderMatch) {
    const orderItem = orderMatch[1].trim()
    const cleanResponse = response.replace(/\[ORDER:[^\]]+\]/g, "").trim()
    return { cleanResponse, orderItem }
  }
  return { cleanResponse: response, orderItem: null }
}

// Detect the last mentioned item from conversation history
function detectLastMentionedItem(history: ChatMessage[]): string | null {
  // Look through history in reverse to find the last mentioned item
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i]
    const lower = msg.content.toLowerCase()
    
    for (const item of MENU_ITEMS) {
      if (lower.includes(item.name.toLowerCase())) {
        return item.name
      }
      for (const keyword of item.keywords) {
        if (lower.includes(keyword)) {
          return item.name
        }
      }
    }
  }
  return null
}

// Check if message is a confirmation
function isOrderConfirmation(message: string): boolean {
  const confirmPhrases = [
    "yes", "yeah", "yep", "sure", "ok", "okay", "sounds good", "perfect", 
    "i'll take", "i will take", "let's do", "let's get", "order", "buy",
    "purchase", "get that", "get it", "that's all", "ring it up", "checkout"
  ]
  const lower = message.toLowerCase()
  return confirmPhrases.some(phrase => lower.includes(phrase))
}

// Fallback response generator when AI services are not available
function generateFallbackResponse(message: string, history: ChatMessage[]): string {
  const lowerMessage = message.toLowerCase()

  // Check for order confirmation
  if (isOrderConfirmation(message)) {
    const lastItem = detectLastMentionedItem(history)
    if (lastItem) {
      return `Great! Let me ring that up for you. [ORDER:${lastItem}]`
    }
  }

  if (lowerMessage.includes("strong") || lowerMessage.includes("caffeine")) {
    return "For a strong caffeine kick, I'd recommend our Classic Espresso - it's a bold double shot with rich caramel notes. If you want something larger, try the Iced Cold Brew!"
  }

  if (lowerMessage.includes("espresso")) {
    return "Our Classic Espresso ($2.50) is a customer favorite! It's a rich double shot with beautiful crema. Would you like to order one?"
  }

  if (lowerMessage.includes("tea") && !lowerMessage.includes("boba")) {
    return "We have wonderful teas! Our Matcha Green Tea ($3.50) is ceremonial grade and super smooth, while the Earl Grey ($3.00) has that classic bergamot aroma."
  }

  if (lowerMessage.includes("boba") || lowerMessage.includes("bubble")) {
    return "Our Boba Milk Tea ($4.50) is amazing! You can get it in classic milk tea flavor or try our popular taro version. The tapioca pearls are made fresh!"
  }

  if (lowerMessage.includes("cold") || lowerMessage.includes("refreshing")) {
    return "For something cold and refreshing, try our Iced Cold Brew ($4.00) - super smooth with low acidity. Or our Boba Milk Tea served over ice!"
  }

  if (lowerMessage.includes("cappuccino")) {
    return "Our Cappuccino ($4.00) is beautifully crafted with velvety steamed milk. Would you like one?"
  }

  if (lowerMessage.includes("menu") || lowerMessage.includes("options")) {
    return "We have a great selection! Coffee: Espresso, Cold Brew, Cappuccino. Tea: Matcha and Earl Grey. Plus our popular Boba Milk Tea! What sounds interesting?"
  }

  if (lowerMessage.includes("recommend") || lowerMessage.includes("suggest")) {
    return "Our most popular drinks are the Boba Milk Tea and the Iced Cold Brew. If you're into matcha, ours is ceremonial grade and delicious!"
  }

  return "We've got coffee drinks like Espresso, Cold Brew, and Cappuccino, plus teas like Matcha and Earl Grey, and our famous Boba Milk Tea. What sounds good?"
}
