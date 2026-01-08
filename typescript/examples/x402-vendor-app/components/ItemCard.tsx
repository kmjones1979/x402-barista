"use client"

import type { VendorItem } from "@/types/item"
import { formatPrice } from "@/utils/formatting"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Coffee, Trash2 } from "lucide-react"

interface ItemCardProps {
  item: VendorItem
  onPurchase?: (item: VendorItem) => void
  onViewDetails?: (item: VendorItem) => void
  onDelete?: (item: VendorItem) => void
}

export function ItemCard({ item, onPurchase, onViewDetails, onDelete }: ItemCardProps) {
  return (
    <Card className="coffee-card overflow-hidden group cursor-pointer" onClick={() => onViewDetails?.(item)}>
      {item.imageUrl && (
        <div className="relative h-48 overflow-hidden bg-stone-800">
          <img 
            src={item.imageUrl} 
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>
      )}
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-xl text-amber-100 group-hover:text-amber-200 transition-colors">
            {item.name}
          </CardTitle>
          <Coffee className="w-5 h-5 text-amber-500 flex-shrink-0 mt-1" />
        </div>
        <CardDescription className="text-stone-400 line-clamp-2 mt-2">
          {item.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-amber-400">
            {formatPrice(item.price, item.paymentRequirements)}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="coffee-badge text-xs">
            {item.paymentRequirements.network}
          </Badge>
          <Badge variant="outline" className="coffee-badge text-xs">
            {item.paymentRequirements.assetName || "USDC"}
          </Badge>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2 pt-0">
        {onViewDetails && (
          <Button
            variant="outline"
            className="coffee-button-secondary flex-1"
            onClick={(e) => {
              e.stopPropagation()
              onViewDetails(item)
            }}
          >
            View Details
          </Button>
        )}
        {onPurchase && (
          <Button
            className="coffee-button-primary flex-1"
            onClick={(e) => {
              e.stopPropagation()
              onPurchase(item)
            }}
          >
            Order Now
          </Button>
        )}
        {onDelete && (
          <Button
            variant="outline"
            className="bg-red-900/20 hover:bg-red-900/30 text-red-300 border-red-800/50 hover:border-red-700/50"
            onClick={(e) => {
              e.stopPropagation()
              if (confirm(`Are you sure you want to remove "${item.name}" from the menu?`)) {
                onDelete(item)
              }
            }}
            title="Remove item"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

