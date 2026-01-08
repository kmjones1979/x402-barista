"use client"

import { useState, useEffect } from "react"
import { useAccount } from "wagmi"
import { NETWORKS } from "@/utils/constants"
import { createPaymentRequirements } from "@/utils/payment"
import { saveItem } from "@/utils/itemStorage"
import { getDefaultPayToAddress } from "@/utils/config"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import type { VendorItem } from "@/types/item"

interface CreateItemFormProps {
  onItemCreated: (item: VendorItem) => void
  defaultPayToAddress?: string // Pass from server component
}

export function CreateItemForm({ onItemCreated, defaultPayToAddress }: CreateItemFormProps) {
  const { address } = useAccount()
  // Use passed prop first, then fall back to client-side env var
  const defaultPayTo = defaultPayToAddress || getDefaultPayToAddress()
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    network: "base", // Using Base mainnet with x402 v2
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base mainnet USDC
    assetName: "USDC",
    payTo: defaultPayTo || address || "",
    imageUrl: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Update payTo when address changes, but prefer defaultPayTo
  useEffect(() => {
    if (defaultPayTo) {
      setFormData((prev) => ({ ...prev, payTo: defaultPayTo }))
    } else if (address) {
      setFormData((prev) => ({ ...prev, payTo: address }))
    }
  }, [address, defaultPayTo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address) {
      alert("Please connect your wallet first")
      return
    }

    setIsSubmitting(true)
    try {
      const resource = typeof window !== "undefined" 
        ? `${window.location.origin}/api/item/${Date.now()}`
        : `/api/item/${Date.now()}`
      const paymentRequirements = createPaymentRequirements(formData, resource)

      const item: VendorItem = {
        id: `item-${Date.now()}`,
        name: formData.name,
        description: formData.description,
        price: formData.price,
        paymentRequirements,
        createdAt: Date.now(),
        ...(formData.imageUrl && { imageUrl: formData.imageUrl }),
      }

      saveItem(item)
      onItemCreated(item)

      // Reset form
      setFormData({
        name: "",
        description: "",
        price: "",
        network: "base",
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        assetName: "USDC",
        payTo: defaultPayTo || address || "",
        imageUrl: "",
      })
    } catch (error) {
      console.error("Error creating item:", error)
      alert("Failed to create item. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="coffee-card">
      <CardHeader>
        <CardTitle className="text-2xl text-amber-100 flex items-center gap-2">
          <PlusCircle className="w-6 h-6 text-amber-400" />
          Add New Item to Menu
        </CardTitle>
        <CardDescription className="text-stone-400">
          Create a new coffee or tea item for your shop
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-amber-200 font-semibold">Item Name</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Matcha Latte"
              className="coffee-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-amber-200 font-semibold">Description</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
              placeholder="Describe your item..."
              rows={4}
              className="coffee-input w-full resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price" className="text-amber-200 font-semibold">Price (in smallest unit)</Label>
            <Input
              id="price"
              type="text"
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: e.target.value })
              }
              required
              placeholder="e.g., 1000000 (for 1 USDC with 6 decimals)"
              className="coffee-input"
            />
            <p className="text-sm text-stone-400">
              For USDC (6 decimals), enter amount × 1,000,000. For ETH (18 decimals), enter amount × 10^18
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="network" className="text-amber-200 font-semibold">Network</Label>
              <select
                id="network"
                value={formData.network}
                onChange={(e) =>
                  setFormData({ ...formData, network: e.target.value })
                }
                required
                className="coffee-input"
              >
                {Object.values(NETWORKS).map((network) => (
                  <option key={network.id} value={network.id}>
                    {network.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assetName" className="text-amber-200 font-semibold">Asset Name (optional)</Label>
              <Input
                id="assetName"
                type="text"
                value={formData.assetName}
                onChange={(e) =>
                  setFormData({ ...formData, assetName: e.target.value })
                }
                placeholder="e.g., USDC"
                className="coffee-input"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="asset" className="text-amber-200 font-semibold">Asset Address</Label>
            <Input
              id="asset"
              type="text"
              value={formData.asset}
              onChange={(e) =>
                setFormData({ ...formData, asset: e.target.value })
              }
              required
              placeholder="0x..."
              className="coffee-input font-mono text-sm"
            />
            <p className="text-sm text-stone-400">
              Common assets: USDC on Base Sepolia: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payTo" className="text-amber-200 font-semibold">Payment Address</Label>
            <Input
              id="payTo"
              type="text"
              value={formData.payTo}
              onChange={(e) =>
                setFormData({ ...formData, payTo: e.target.value })
              }
              required
              placeholder="0x..."
              className="coffee-input font-mono text-sm"
            />
            <p className="text-sm text-stone-400">Address where payments will be sent</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageUrl" className="text-amber-200 font-semibold">Image URL (optional)</Label>
            <Input
              id="imageUrl"
              type="url"
              value={formData.imageUrl}
              onChange={(e) =>
                setFormData({ ...formData, imageUrl: e.target.value })
              }
              placeholder="https://..."
              className="coffee-input"
            />
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting || !address}
            className="coffee-button-primary w-full"
            size="lg"
          >
            {isSubmitting ? "Creating..." : "Add to Menu"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

