"use client"

import { useAccount } from "wagmi"
import { templateItems, createItemFromTemplate } from "@/utils/templateItems"
import { saveItem } from "@/utils/itemStorage"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Coffee } from "lucide-react"
import type { VendorItem } from "@/types/item"
import { formatPrice } from "@/utils/formatting"

interface TemplateItemsProps {
  onItemAdded: (item: VendorItem) => void
  defaultPayToAddress?: string
}

export function TemplateItems({ onItemAdded, defaultPayToAddress }: TemplateItemsProps) {
  const { address } = useAccount()

  const handleAddTemplate = (template: Omit<VendorItem, "id" | "createdAt">) => {
    if (!address) {
      alert("Please connect your wallet first to add items")
      return
    }

    // Use defaultPayToAddress from env if available, otherwise use connected wallet address
    const payTo = defaultPayToAddress || address
    const item = createItemFromTemplate(template, payTo)
    saveItem(item)
    onItemAdded(item)
  }

  return (
    <Card className="coffee-card">
      <CardHeader>
        <CardTitle className="text-2xl text-amber-100 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-amber-400" />
          Quick Add Templates
        </CardTitle>
        <CardDescription className="text-stone-400">
          Click any template below to instantly add it to your menu:
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templateItems.map((template, index) => (
            <Card key={index} className="coffee-card overflow-hidden group hover:shadow-lg transition-all">
              {template.imageUrl && (
                <div className="relative h-40 overflow-hidden bg-amber-100">
                  <img 
                    src={template.imageUrl} 
                    alt={template.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg text-amber-100 line-clamp-2">{template.name}</CardTitle>
                  <Coffee className="w-4 h-4 text-amber-500 flex-shrink-0 mt-1" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-amber-400">
                    {formatPrice(template.price, template.paymentRequirements)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-stone-400 line-clamp-2 text-sm">
                  {template.description}
                </CardDescription>
              </CardContent>
              <CardFooter className="pt-0">
                <Button
                  className="coffee-button-primary w-full"
                  onClick={() => handleAddTemplate(template)}
                  disabled={!address}
                >
                  {address ? "Add to Menu" : "Connect Wallet"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

