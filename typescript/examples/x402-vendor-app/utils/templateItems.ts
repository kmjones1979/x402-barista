import type { VendorItem } from "@/types/item"
import { createPaymentRequirements } from "./payment"
import { getDefaultPayToAddress } from "./config"

const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
const defaultPayTo = getDefaultPayToAddress()

export const templateItems: Omit<VendorItem, "id" | "createdAt">[] = [
  {
    name: "Matcha Green Tea",
    description: "Premium ceremonial grade matcha powder. Rich in antioxidants, smooth and creamy texture. Perfect for traditional tea ceremony or modern lattes.",
    price: "50000", // $0.05 USDC (6 decimals: 50000 = 0.05)
    paymentRequirements: createPaymentRequirements(
      {
        name: "Matcha Green Tea",
        description: "Premium ceremonial grade matcha powder. Rich in antioxidants, smooth and creamy texture. Perfect for traditional tea ceremony or modern lattes.",
        price: "50000",
        network: "base", // Using Base mainnet with x402 v2
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base mainnet USDC
        assetName: "USDC",
        payTo: defaultPayTo || "0x0000000000000000000000000000000000000000", // Will use defaultPayTo or be replaced with user's address
        imageUrl: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80",
      },
      `${baseUrl}/api/item/matcha-green-tea`
    ),
    imageUrl: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80",
  },
  {
    name: "Classic Espresso",
    description: "Bold and rich Italian-style espresso. Made from premium Arabica beans, roasted to perfection. Intense flavor with a smooth crema finish.",
    price: "1000000", // $1.00 USDC
    paymentRequirements: createPaymentRequirements(
      {
        name: "Classic Espresso",
        description: "Bold and rich Italian-style espresso. Made from premium Arabica beans, roasted to perfection. Intense flavor with a smooth crema finish.",
        price: "1000000",
        network: "base", // Using Base mainnet with x402 v2
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base mainnet USDC
        assetName: "USDC",
        payTo: "0x0000000000000000000000000000000000000000",
        imageUrl: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=800&q=80",
      },
      `${baseUrl}/api/item/classic-espresso`
    ),
    imageUrl: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=800&q=80",
  },
  {
    name: "Boba Milk Tea",
    description: "Creamy and sweet bubble tea with chewy tapioca pearls. Available in various flavors like taro, matcha, and classic milk tea. Refreshing and fun!",
    price: "250000", // $0.25 USDC
    paymentRequirements: createPaymentRequirements(
      {
        name: "Boba Milk Tea",
        description: "Creamy and sweet bubble tea with chewy tapioca pearls. Available in various flavors like taro, matcha, and classic milk tea. Refreshing and fun!",
        price: "250000",
        network: "base", // Using Base mainnet with x402 v2
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base mainnet USDC
        assetName: "USDC",
        payTo: "0x0000000000000000000000000000000000000000",
        imageUrl: "https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=800&q=80",
      },
      `${baseUrl}/api/item/boba-milk-tea`
    ),
    imageUrl: "https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=800&q=80",
  },
  {
    name: "Iced Cold Brew Coffee",
    description: "Smooth and refreshing cold brew coffee. Steeped for 24 hours for maximum flavor extraction. Low acidity, naturally sweet, perfect for hot days.",
    price: "100000", // $0.10 USDC
    paymentRequirements: createPaymentRequirements(
      {
        name: "Iced Cold Brew Coffee",
        description: "Smooth and refreshing cold brew coffee. Steeped for 24 hours for maximum flavor extraction. Low acidity, naturally sweet, perfect for hot days.",
        price: "100000",
        network: "base", // Using Base mainnet with x402 v2
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base mainnet USDC
        assetName: "USDC",
        payTo: "0x0000000000000000000000000000000000000000",
        imageUrl: "https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=800&q=80",
      },
      `${baseUrl}/api/item/iced-cold-brew`
    ),
    imageUrl: "https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=800&q=80",
  },
  {
    name: "Earl Grey Tea",
    description: "Elegant black tea infused with bergamot oil. Fragrant, citrusy, and sophisticated. Perfect for afternoon tea or a morning pick-me-up.",
    price: "750000", // $0.75 USDC
    paymentRequirements: createPaymentRequirements(
      {
        name: "Earl Grey Tea",
        description: "Elegant black tea infused with bergamot oil. Fragrant, citrusy, and sophisticated. Perfect for afternoon tea or a morning pick-me-up.",
        price: "750000",
        network: "base", // Using Base mainnet with x402 v2
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base mainnet USDC
        assetName: "USDC",
        payTo: "0x0000000000000000000000000000000000000000",
        imageUrl: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80",
      },
      `${baseUrl}/api/item/earl-grey-tea`
    ),
    imageUrl: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80",
  },
  {
    name: "Cappuccino",
    description: "Classic Italian cappuccino with perfectly steamed milk foam. Rich espresso balanced with creamy texture. Artfully crafted with latte art.",
    price: "600000", // $0.60 USDC
    paymentRequirements: createPaymentRequirements(
      {
        name: "Cappuccino",
        description: "Classic Italian cappuccino with perfectly steamed milk foam. Rich espresso balanced with creamy texture. Artfully crafted with latte art.",
        price: "600000",
        network: "base", // Using Base mainnet with x402 v2
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base mainnet USDC
        assetName: "USDC",
        payTo: "0x0000000000000000000000000000000000000000",
        imageUrl: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800&q=80",
      },
      `${baseUrl}/api/item/cappuccino`
    ),
    imageUrl: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800&q=80",
  },
]

export function createItemFromTemplate(
  template: Omit<VendorItem, "id" | "createdAt">,
  payToAddress: string
): VendorItem {
  // Use provided address, or fall back to default from env, or use the template's default
  const finalPayTo = payToAddress || defaultPayTo || template.paymentRequirements.payTo
  
  return {
    ...template,
    id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: Date.now(),
    paymentRequirements: {
      ...template.paymentRequirements,
      payTo: finalPayTo,
    },
  }
}

