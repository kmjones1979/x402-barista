"use client"

import { useState, useEffect, useCallback } from "react"
import type { VendorItem } from "@/types/item"
import { getItems, deleteItem } from "@/utils/itemStorage"
import { Card, CardContent } from "@/components/ui/card"
import { Coffee } from "lucide-react"
import { ItemCard } from "./ItemCard"
import { PurchaseModal } from "./PurchaseModal"
import { ItemDetailsModal } from "./ItemDetailsModal"

export function ItemList() {
  const [items, setItems] = useState<VendorItem[]>([])
  const [selectedItem, setSelectedItem] = useState<VendorItem | null>(null)
  const [detailsItem, setDetailsItem] = useState<VendorItem | null>(null)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)

  const loadItems = useCallback(() => {
    setItems(getItems())
  }, [])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const handleDeleteItem = useCallback((item: VendorItem) => {
    deleteItem(item.id)
    loadItems()
    // Close modals if the deleted item is currently open
    if (selectedItem?.id === item.id) {
      setSelectedItem(null)
      setShowPurchaseModal(false)
    }
    if (detailsItem?.id === item.id) {
      setDetailsItem(null)
    }
  }, [selectedItem, detailsItem, loadItems])

  const handlePurchase = (item: VendorItem) => {
    setSelectedItem(item)
    setShowPurchaseModal(true)
  }

  const handleViewDetails = (item: VendorItem) => {
    setDetailsItem(item)
  }

  const handlePurchaseComplete = useCallback(() => {
    // Don't close the modal automatically - let user close it manually
    // This allows them to see the transaction details and success message
    // The modal will close when user clicks the close button
  }, [])

  const handleCloseDetails = () => {
    setDetailsItem(null)
  }

  if (items.length === 0) {
    return (
      <Card className="coffee-card text-center py-12">
        <CardContent className="pt-6">
          <Coffee className="w-16 h-16 text-amber-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-amber-100 mb-2">No items on the menu yet</h3>
          <p className="text-stone-400">Create your first coffee or tea item to get started!</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-amber-100 mb-2">Our Menu</h2>
          <p className="text-stone-400">Browse our selection of artisan coffee and tea</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onPurchase={handlePurchase}
              onViewDetails={handleViewDetails}
              onDelete={handleDeleteItem}
            />
          ))}
        </div>
      </div>
      {detailsItem && (
        <ItemDetailsModal 
          item={detailsItem} 
          onClose={handleCloseDetails}
          onDelete={handleDeleteItem}
        />
      )}
      {selectedItem && showPurchaseModal && (
        <PurchaseModal
          item={selectedItem}
          onClose={() => {
            setSelectedItem(null)
            setShowPurchaseModal(false)
          }}
          onComplete={handlePurchaseComplete}
        />
      )}
    </>
  )
}

