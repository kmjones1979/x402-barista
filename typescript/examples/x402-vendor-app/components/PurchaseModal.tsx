"use client"

import { useState, useEffect, useRef } from "react"
import { useAccount, useWalletClient, useWaitForTransactionReceipt, useChainId, useSwitchChain } from "wagmi"
import { base, baseSepolia, mainnet } from "wagmi/chains"
import { exact } from "x402/schemes"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, CheckCircle2, Loader2, Clock } from "lucide-react"
import type { VendorItem } from "@/types/item"
import { formatPrice } from "@/utils/formatting"
import { createPaymentIntent, submitPayment } from "@/utils/payment"
import type { PaymentIntent, Payment, PaymentPayload } from "x402/types"

interface PurchaseModalProps {
  item: VendorItem
  onClose: () => void
  onComplete: () => void
}

// Helper function to extract chain ID from network (supports both friendly names and CAIP-2 format)
function getChainIdFromNetwork(network: string): number | null {
  // Handle CAIP-2 format: eip155:8453
  if (network.startsWith("eip155:")) {
    const chainId = parseInt(network.split(":")[1], 10)
    if (!isNaN(chainId)) {
      return chainId
    }
  }
  
  // Handle friendly names
  const networkMap: Record<string, number> = {
    "base-sepolia": baseSepolia.id,
    "base": base.id,
    "mainnet": mainnet.id,
    "ethereum": mainnet.id,
  }
  
  return networkMap[network] || null
}

export function PurchaseModal({
  item,
  onClose,
  onComplete,
}: PurchaseModalProps) {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null)
  const [payment, setPayment] = useState<Payment | null>(null)
  const [settlementTxHash, setSettlementTxHash] = useState<string | null>(null)
  const hasCalledOnComplete = useRef(false)

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: settlementTxHash as `0x${string}` | undefined,
    enabled: !!settlementTxHash,
  })

  // Note: Settlement happens immediately via the facilitator API
  // The settlementTxHash is returned directly in the submitPayment response
  // No need to poll - the hash is set immediately when payment is submitted

  // Handle transaction confirmation - don't auto-close, let user close manually
  useEffect(() => {
    if (isConfirmed && settlementTxHash && !hasCalledOnComplete.current) {
      // Call onComplete to update parent state, but don't close modal
      // The modal will stay open until user manually closes it
      hasCalledOnComplete.current = true
      onComplete()
    }
  }, [isConfirmed, settlementTxHash, onComplete])

  // Reset the ref when the modal is closed/reopened
  useEffect(() => {
    if (!settlementTxHash) {
      hasCalledOnComplete.current = false
    }
  }, [settlementTxHash])

  const handlePurchase = async () => {
    if (!isConnected || !walletClient || !address) {
      setError("Please connect your wallet first")
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const requirements = item.paymentRequirements

      // Step 0: Switch to the correct network if needed
      const requiredChainId = getChainIdFromNetwork(requirements.network)
      if (requiredChainId && chainId !== requiredChainId) {
        try {
          await switchChain({ chainId: requiredChainId })
          // Wait a bit for the chain switch to complete
          await new Promise((resolve) => setTimeout(resolve, 1000))
        } catch (switchError) {
          throw new Error(
            `Please switch to ${requirements.network} network in your wallet`
          )
        }
      }

      // Step 1: Create payment intent via x402 facilitator
      // Ensure extra.name is "USD Coin" for USDC (not "USDC") to match the contract's EIP-712 domain
      const signingRequirements = {
        ...requirements,
        extra: requirements.extra
          ? {
              ...requirements.extra,
              // Convert "USDC" to "USD Coin" for the EIP-712 domain (required for USDC contract on Base)
              name:
                (requirements.extra as { name?: string })?.name === "USDC"
                  ? "USD Coin"
                  : (requirements.extra as { name?: string })?.name || undefined,
            }
          : undefined,
      }
      
      const intent = await createPaymentIntent(signingRequirements, address)
      setPaymentIntent(intent)

      if (!intent.unsignedPaymentPayload) {
        throw new Error("Payment intent missing unsigned payment payload")
      }

      // Step 2: Sign the payment using EIP-712
      // For x402 v1 with friendly network names, we can use the SDK's signPaymentHeader
      // Use signingRequirements (with corrected "USD Coin") instead of original requirements
      const signedPaymentPayload = await exact.evm.signPaymentHeader(
        walletClient,
        signingRequirements,
        intent.unsignedPaymentPayload
      )

      // Step 3: Submit the signed payment to the facilitator
      // Send the full signed payload to ensure we use exactly what the SDK created
      const signature = signedPaymentPayload.payload.signature
      const submittedPayment = await submitPayment(intent, signature, signedPaymentPayload)
      setPayment(submittedPayment)

      // Step 4: The facilitator settles the payment immediately
      // Extract the settlement transaction hash from the response
      if (submittedPayment.settlementTxHash) {
        setSettlementTxHash(submittedPayment.settlementTxHash)
        setIsProcessing(false)
        onComplete()
      } else {
        // If no hash yet, the payment might still be processing
        setIsProcessing(false)
      }
    } catch (err) {
      console.error("Payment error:", err)
      setError(
        err instanceof Error ? err.message : "Payment failed. Please try again."
      )
      setIsProcessing(false)
      setPaymentIntent(null)
      setPayment(null)
    }
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && !isConfirmed && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] coffee-modal-card border-amber-300">
        <DialogHeader>
          <DialogTitle className="text-2xl text-amber-100">Order {item.name}</DialogTitle>
          <DialogDescription className="text-stone-400">{item.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-200px)] pr-2">
          <div className="space-y-3 p-4 bg-stone-800/50 rounded-lg border border-amber-900/30">
            <div className="flex justify-between items-center">
              <span className="text-stone-300 font-medium">Price:</span>
              <strong className="text-2xl text-amber-400">{formatPrice(item.price, item.paymentRequirements)}</strong>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-400">Network:</span>
              <Badge variant="outline" className="coffee-badge">{item.paymentRequirements.network}</Badge>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-400">Asset:</span>
              <span className="text-amber-200 font-mono text-xs">{item.paymentRequirements.asset.slice(0, 20)}...</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-400">Pay To:</span>
              <span className="text-amber-200 font-mono text-xs">{item.paymentRequirements.payTo.slice(0, 20)}...</span>
            </div>
          </div>
          {error && (
            <div className="p-4 bg-red-900/30 border border-red-800/50 rounded-lg text-red-300">
              {error}
            </div>
          )}
          {paymentIntent && (
            <div className="p-4 bg-stone-800/50 rounded-lg border border-amber-900/30 space-y-4">
              <div className="flex items-center gap-3">
                {isConfirmed ? (
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                ) : payment ? (
                  <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                ) : (
                  <Clock className="w-6 h-6 text-amber-500" />
                )}
                <span className="font-semibold text-amber-100">
                  {isConfirmed
                    ? "Payment Settled"
                    : payment
                      ? "Waiting for Settlement"
                      : "Payment Intent Created"}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                {paymentIntent && (
                  <div>
                    <span className="text-stone-400">Payment Intent ID: </span>
                    <code className="text-amber-200 font-mono text-xs">{paymentIntent.id}</code>
                  </div>
                )}
                {payment && (
                  <div>
                    <span className="text-stone-400">Payment ID: </span>
                    <code className="text-amber-200 font-mono text-xs">{payment.id}</code>
                  </div>
                )}
                {settlementTxHash && (
                  <div className="space-y-1">
                    <span className="text-stone-400 block">Settlement Transaction Hash:</span>
                    <div className="flex items-center gap-2 p-2 bg-stone-900 rounded border border-amber-900/30">
                      <code className="text-amber-200 font-mono text-xs flex-1 break-all">{settlementTxHash}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(settlementTxHash)
                          alert("Transaction hash copied to clipboard!")
                        }}
                        className="h-8 w-8 p-0 hover:bg-stone-700"
                      >
                        <Copy className="w-4 h-4 text-stone-300" />
                      </Button>
                    </div>
                  </div>
                )}
                {payment && !settlementTxHash && (
                  <div className="space-y-2">
                    <p className="text-stone-400">Waiting for facilitator to settle payment...</p>
                    <div className="w-full h-2 bg-stone-700 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-600 animate-pulse" style={{ width: "60%" }}></div>
                    </div>
                  </div>
                )}
                {isConfirming && settlementTxHash && (
                  <div className="space-y-2">
                    <p className="text-stone-400">Confirming settlement transaction...</p>
                    <div className="w-full h-2 bg-stone-700 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-600 animate-pulse" style={{ width: "80%" }}></div>
                    </div>
                  </div>
                )}
                {isConfirmed && (
                  <div className="p-3 bg-green-900/30 border border-green-700/50 rounded-lg">
                    <p className="text-green-300 font-medium">✅ Payment successful! Your order is complete.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="pt-4 border-t border-amber-900/30">
          <Button 
            variant="outline"
            onClick={onClose} 
            disabled={isProcessing || isConfirming}
            className="coffee-button-secondary"
          >
            {isConfirmed ? "Close" : "Cancel"}
          </Button>
          {!isConfirmed && (
            <Button
              onClick={handlePurchase}
              disabled={isProcessing || isConfirming || !isConnected}
              className="coffee-button-primary"
            >
              {isProcessing || isConfirming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Order"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

