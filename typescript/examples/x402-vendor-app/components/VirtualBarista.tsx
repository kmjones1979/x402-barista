"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Bot, Send, Loader2, Sparkles, Coffee, User, Zap } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  paidWithX402?: boolean
  orderItem?: string
  purchaseStatus?: "pending" | "success" | "error"
  purchaseError?: string
  txHash?: string
}

interface VirtualBaristaProps {
  onOrderItem?: (itemName: string) => void
}

interface VendorItem {
  id: string
  name: string
  description: string
  price: string
  paymentRequirements: any
  imageUrl?: string
}

export function VirtualBarista({ onOrderItem }: VirtualBaristaProps) {
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hey there! I'm your Virtual Barista. Ask me anything about our coffee and tea menu, and I'll help you find the perfect drink. What sounds good today?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/barista", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Request failed: ${response.status}`)
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        paidWithX402: data.paidWithX402,
        orderItem: data.orderItem,
      }

      setMessages((prev) => [...prev, assistantMessage])

      // If an order was triggered, automatically process with agent wallet after a short delay
      if (data.orderItem) {
        setTimeout(() => {
          handleAgentPurchase(data.orderItem)
        }, 1500) // Give user time to read the message
      }
    } catch (err) {
      console.error("Error calling barista API:", err)
      setError(err instanceof Error ? err.message : "Failed to get response")
      
      // Add error message as assistant response
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Sorry, I'm having trouble connecting right now. Please try again in a moment!",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Handle agent-based purchase
  const handleAgentPurchase = async (itemName: string) => {
    setIsPurchasing(true)
    
    // Add a processing message
    const processingMessage: Message = {
      id: `processing-${Date.now()}`,
      role: "assistant",
      content: `Processing your order for ${itemName}... Please wait while I handle the payment.`,
      timestamp: new Date(),
      purchaseStatus: "pending",
    }
    setMessages((prev) => [...prev, processingMessage])

    try {
      // Get items from localStorage to find the payment requirements
      const storedItems = localStorage.getItem("x402-vendor-items")
      const items: VendorItem[] = storedItems ? JSON.parse(storedItems) : []
      
      // Find the item by name
      const item = items.find(
        (i) => i.name.toLowerCase().includes(itemName.toLowerCase()) ||
               itemName.toLowerCase().includes(i.name.toLowerCase())
      )

      if (!item) {
        throw new Error(`Item "${itemName}" not found in menu. Please add it first.`)
      }

      // Call agent purchase API
      const response = await fetch("/api/barista/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName: item.name,
          paymentRequirements: item.paymentRequirements,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Purchase failed")
      }

      // Update with success message
      setMessages((prev) => {
        const updated = [...prev]
        const lastIdx = updated.length - 1
        updated[lastIdx] = {
          ...updated[lastIdx],
          content: `Payment successful! Your ${item.name} is being prepared. ${result.settlementTxHash ? `\n\nTransaction: ${result.settlementTxHash.slice(0, 10)}...${result.settlementTxHash.slice(-8)}` : ""}`,
          purchaseStatus: "success",
          txHash: result.settlementTxHash,
        }
        return updated
      })

    } catch (error: any) {
      console.error("Agent purchase error:", error)
      
      // Update with error message
      setMessages((prev) => {
        const updated = [...prev]
        const lastIdx = updated.length - 1
        updated[lastIdx] = {
          ...updated[lastIdx],
          content: `Sorry, there was an issue processing your payment: ${error.message}`,
          purchaseStatus: "error",
          purchaseError: error.message,
        }
        return updated
      })
    } finally {
      setIsPurchasing(false)
    }
  }

  const suggestedQuestions = [
    "What's your strongest coffee?",
    "I want something sweet and cold",
    "What teas do you have?",
    "Recommend something with boba",
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-amber-100 mb-2 flex items-center gap-3">
          <Bot className="w-8 h-8 text-amber-400" />
          Virtual Barista
        </h2>
        <p className="text-stone-400">
          Chat with our AI barista for personalized recommendations
        </p>
      </div>

      <Card className="coffee-card overflow-hidden">
        <CardHeader className="border-b border-amber-900/30 bg-gradient-to-r from-amber-900/20 to-stone-900/20">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center">
                <Coffee className="w-6 h-6 text-amber-100" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-stone-900" />
            </div>
            <div>
              <CardTitle className="text-xl text-amber-100">Artisan AI</CardTitle>
              <CardDescription className="text-stone-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Powered by Gemini AI
              </CardDescription>
            </div>
            <Badge variant="outline" className="ml-auto bg-emerald-900/30 text-emerald-300 border-emerald-700/50">
              Online
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Messages area */}
          <ScrollArea className="h-[400px] p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.role === "user"
                        ? "bg-gradient-to-br from-blue-600 to-blue-800"
                        : "bg-gradient-to-br from-amber-600 to-amber-800"
                    }`}
                  >
                    {message.role === "user" ? (
                      <User className="w-4 h-4 text-blue-100" />
                    ) : (
                      <Coffee className="w-4 h-4 text-amber-100" />
                    )}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-blue-900/40 text-blue-100 rounded-tr-sm"
                        : "bg-stone-800/60 text-stone-200 rounded-tl-sm"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    {message.orderItem && !message.purchaseStatus && (
                      <Button
                        size="sm"
                        className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleAgentPurchase(message.orderItem!)}
                        disabled={isPurchasing}
                      >
                        {isPurchasing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 mr-2" />
                            Pay with Agent Wallet
                          </>
                        )}
                      </Button>
                    )}
                    {message.purchaseStatus === "pending" && (
                      <div className="mt-2 flex items-center gap-2 text-amber-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Processing payment...</span>
                      </div>
                    )}
                    {message.purchaseStatus === "success" && (
                      <div className="mt-2 flex items-center gap-2 text-emerald-400">
                        <Zap className="w-4 h-4" />
                        <span className="text-sm">Paid via x402</span>
                      </div>
                    )}
                    {message.purchaseStatus === "error" && (
                      <div className="mt-2 text-red-400 text-sm">
                        Payment failed
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs opacity-50">
                        {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {message.role === "assistant" && message.paidWithX402 && (
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          x402
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center flex-shrink-0">
                    <Coffee className="w-4 h-4 text-amber-100" />
                  </div>
                  <div className="bg-stone-800/60 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex items-center gap-2 text-stone-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Brewing a response...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Suggested questions */}
          {messages.length <= 1 && (
            <div className="px-4 pb-3">
              <p className="text-xs text-stone-500 mb-2">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question) => (
                  <Button
                    key={question}
                    variant="outline"
                    size="sm"
                    className="text-xs bg-stone-800/50 hover:bg-stone-800 text-stone-300 border-stone-700 hover:border-amber-700"
                    onClick={() => setInput(question)}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="px-4 pb-2">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Input area */}
          <div className="border-t border-amber-900/30 p-4 bg-stone-900/50">
            <div className="flex gap-3">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about our menu, get recommendations..."
                className="min-h-[48px] max-h-[120px] bg-stone-800/60 border-stone-700 focus:border-amber-600 text-stone-200 placeholder:text-stone-500 resize-none"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="coffee-button-primary h-12 w-12 p-0"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
            <p className="text-xs text-stone-500 mt-2 text-center">
              Powered by Google Gemini AI • Ready for x402 micropayments
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
