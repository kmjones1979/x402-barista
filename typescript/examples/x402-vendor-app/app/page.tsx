"use client"

import { useState, useEffect } from "react"
import { useAccount } from "wagmi"
import { CreateItemForm } from "@/components/CreateItemForm"
import { ItemList } from "@/components/ItemList"
import { TemplateItems } from "@/components/TemplateItems"
import { VirtualBarista } from "@/components/VirtualBarista"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Coffee, Bot } from "lucide-react"
import type { VendorItem } from "@/types/item"

export default function Home() {
  const { address, isConnected } = useAccount()
  const [items, setItems] = useState<VendorItem[]>([])
  const [activeTab, setActiveTab] = useState<"list" | "create" | "barista">("list")
  const [web3ModalHook, setWeb3ModalHook] = useState<(() => { open: () => void }) | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [defaultPayToAddress, setDefaultPayToAddress] = useState<string>("")

  // Fix hydration mismatch by only showing wallet state after mount
  useEffect(() => {
    setIsMounted(true)
    
    // Fetch default pay-to address from API (reads AGENT_PAY_TO_ADDRESS from server)
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.defaultPayToAddress) {
          setDefaultPayToAddress(data.defaultPayToAddress)
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch default pay-to address:", err)
      })
  }, [])

  // Load Web3Modal hook only on client side
  useEffect(() => {
    const loadWeb3Modal = async () => {
      try {
        const { useWeb3Modal } = await import("@web3modal/wagmi/react")
        // Try to use the hook - it will throw if Web3Modal wasn't initialized
        const modal = useWeb3Modal()
        setWeb3ModalHook(() => () => modal)
      } catch (error) {
        // Web3Modal not initialized (missing project ID)
        console.warn("Web3Modal not available:", error)
      }
    }
    loadWeb3Modal()
  }, [])

  useEffect(() => {
    // Load items on mount
    const loadItems = () => {
      if (typeof window === "undefined") return
      const stored = localStorage.getItem("x402-vendor-items")
      if (stored) {
        try {
          setItems(JSON.parse(stored))
        } catch {
          // Ignore parse errors
        }
      }
    }
    loadItems()
  }, [])

  const handleItemCreated = (item: VendorItem) => {
    setItems([...items, item])
    setActiveTab("list")
  }

  const handleOpenWallet = () => {
    try {
      if (web3ModalHook) {
        const modal = web3ModalHook()
        modal.open()
      } else {
        alert("Please set NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID in your .env file to use WalletConnect")
      }
    } catch (error) {
      console.error("Error opening wallet modal:", error)
      alert("Please set NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID in your .env file to use WalletConnect")
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950">
      <header className="coffee-header px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Coffee className="w-8 h-8 text-amber-400" />
          <h1 className="text-3xl font-bold tracking-tight text-amber-100">Artisan Coffee & Tea</h1>
        </div>
        <div className="flex items-center gap-3">
          {!isMounted ? (
            <div className="opacity-0">
              <Badge variant="outline" className="bg-amber-800/20 text-amber-100 border-amber-700">
                Loading...
              </Badge>
            </div>
          ) : isConnected ? (
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-amber-900/30 text-amber-200 border-amber-800/50 px-3 py-1.5">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </Badge>
              <Button 
                onClick={handleOpenWallet} 
                variant="outline"
                className="bg-amber-900/20 hover:bg-amber-900/30 text-amber-100 border-amber-800/50 hover:border-amber-700/50"
              >
                Wallet
              </Button>
            </div>
          ) : (
            <Button 
              onClick={handleOpenWallet}
              className="coffee-button-primary"
            >
              Connect Wallet
            </Button>
          )}
        </div>
      </header>

      <div className="bg-stone-900/50 border-b border-amber-900/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "list" | "create" | "barista")} className="w-full">
            <TabsList className="bg-transparent h-14 gap-1">
              <TabsTrigger 
                value="list" 
                className="data-[state=active]:bg-amber-900/30 data-[state=active]:text-amber-200 data-[state=active]:border-b-2 data-[state=active]:border-amber-600 px-6 text-base font-semibold text-stone-400 hover:text-stone-200"
              >
                Browse Menu
              </TabsTrigger>
              <TabsTrigger 
                value="barista"
                className="data-[state=active]:bg-amber-900/30 data-[state=active]:text-amber-200 data-[state=active]:border-b-2 data-[state=active]:border-amber-600 px-6 text-base font-semibold text-stone-400 hover:text-stone-200 flex items-center gap-2"
              >
                <Bot className="w-4 h-4" />
                Virtual Barista
              </TabsTrigger>
              <TabsTrigger 
                value="create"
                className="data-[state=active]:bg-amber-900/30 data-[state=active]:text-amber-200 data-[state=active]:border-b-2 data-[state=active]:border-amber-600 px-6 text-base font-semibold text-stone-400 hover:text-stone-200"
              >
                ✨ Add New Item
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <main className="flex-1 px-6 py-8 max-w-7xl w-full mx-auto">
        {activeTab === "list" && <ItemList />}
        {activeTab === "barista" && <VirtualBarista />}
        {activeTab === "create" && (
          <div className="space-y-8">
            <TemplateItems 
              onItemAdded={handleItemCreated} 
              defaultPayToAddress={defaultPayToAddress || undefined}
            />
            <CreateItemForm 
              onItemCreated={handleItemCreated} 
              defaultPayToAddress={defaultPayToAddress || undefined}
            />
          </div>
        )}
      </main>
    </div>
  )
}

