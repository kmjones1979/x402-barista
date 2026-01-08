"use client"

import type { VendorItem } from "@/types/item"
import { formatPrice } from "@/utils/formatting"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Trash2 } from "lucide-react"

interface ItemDetailsModalProps {
  item: VendorItem
  onClose: () => void
  onDelete?: (item: VendorItem) => void
}

export function ItemDetailsModal({ item, onClose, onDelete }: ItemDetailsModalProps) {
  const requirements = item.paymentRequirements

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] coffee-modal-card border-amber-300">
        <DialogHeader>
          <DialogTitle className="text-2xl text-amber-100">{item.name}</DialogTitle>
          <DialogDescription className="text-stone-400">{item.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 overflow-y-auto max-h-[calc(90vh-200px)] pr-2">
          {item.imageUrl && (
            <div className="relative h-64 overflow-hidden rounded-lg bg-stone-800">
              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
            </div>
          )}
          
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-amber-100">Pricing</h3>
            <div className="grid grid-cols-2 gap-4 p-4 bg-stone-800/50 rounded-lg border border-amber-900/30">
              <div>
                <span className="text-sm text-stone-400 block mb-1">Price:</span>
                <span className="text-xl font-bold text-amber-400">{formatPrice(item.price, requirements)}</span>
              </div>
              <div>
                <span className="text-sm text-stone-400 block mb-1">Amount (smallest unit):</span>
                <span className="text-amber-200 font-mono text-sm">{item.price}</span>
              </div>
            </div>
          </div>

          <Separator className="bg-amber-900/30" />

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-amber-100">Payment Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-stone-800/50 rounded border border-amber-900/30">
                <span className="text-xs text-stone-400 block mb-1">Network:</span>
                <Badge variant="outline" className="coffee-badge">{requirements.network}</Badge>
              </div>
              <div className="p-3 bg-stone-800/50 rounded border border-amber-900/30">
                <span className="text-xs text-stone-400 block mb-1">Payment Scheme:</span>
                <span className="text-amber-200 text-sm font-medium">{requirements.scheme}</span>
              </div>
              <div className="p-3 bg-stone-800/50 rounded border border-amber-900/30 md:col-span-2">
                <span className="text-xs text-stone-400 block mb-1">Asset Address:</span>
                <code className="text-amber-200 font-mono text-xs break-all">{requirements.asset}</code>
              </div>
              <div className="p-3 bg-stone-800/50 rounded border border-amber-900/30">
                <span className="text-xs text-stone-400 block mb-1">Asset Name:</span>
                <span className="text-amber-200 text-sm">
                  {(requirements.extra as { name?: string })?.name || "N/A"}
                </span>
              </div>
              <div className="p-3 bg-stone-800/50 rounded border border-amber-900/30">
                <span className="text-xs text-stone-400 block mb-1">Max Timeout:</span>
                <span className="text-amber-200 text-sm">{requirements.maxTimeoutSeconds} seconds</span>
              </div>
              <div className="p-3 bg-stone-800/50 rounded border border-amber-900/30">
                <span className="text-xs text-stone-400 block mb-1">MIME Type:</span>
                <span className="text-amber-200 text-sm">{requirements.mimeType}</span>
              </div>
              <div className="p-3 bg-stone-800/50 rounded border border-amber-900/30 md:col-span-2">
                <span className="text-xs text-stone-400 block mb-1">Pay To Address:</span>
                <code className="text-amber-200 font-mono text-xs break-all">{requirements.payTo}</code>
              </div>
              <div className="p-3 bg-stone-800/50 rounded border border-amber-900/30 md:col-span-2">
                <span className="text-xs text-stone-400 block mb-1">Resource URL:</span>
                <code className="text-amber-200 font-mono text-xs break-all">{requirements.resource}</code>
              </div>
            </div>
          </div>

          <Separator className="bg-amber-900/30" />

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-amber-100">Metadata</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-stone-800/50 rounded border border-amber-900/30">
                <span className="text-xs text-stone-400 block mb-1">Item ID:</span>
                <code className="text-amber-200 font-mono text-xs break-all">{item.id}</code>
              </div>
              <div className="p-3 bg-stone-800/50 rounded border border-amber-900/30">
                <span className="text-xs text-stone-400 block mb-1">Created:</span>
                <span className="text-amber-200 text-sm">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {requirements.extra && Object.keys(requirements.extra).length > 0 && (
            <>
              <Separator className="bg-amber-900/30" />
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-amber-100">Extra Details</h3>
                <pre className="p-4 bg-stone-800/50 rounded-lg border border-amber-900/30 overflow-x-auto text-xs font-mono text-amber-200">
                  {JSON.stringify(requirements.extra, null, 2)}
                </pre>
              </div>
            </>
          )}
        </div>
        <DialogFooter className="pt-4 border-t border-amber-900/30 flex gap-2">
          {onDelete && (
            <Button
              onClick={() => {
                if (confirm(`Are you sure you want to remove "${item.name}" from the menu?`)) {
                  onDelete(item)
                  onClose()
                }
              }}
              className="bg-red-900/20 hover:bg-red-900/30 text-red-300 border border-red-800/50 hover:border-red-700/50 flex-1"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove from Menu
            </Button>
          )}
          <Button onClick={onClose} className="coffee-button-secondary flex-1">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

