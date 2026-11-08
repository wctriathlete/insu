import { Car, CloudRain, Fuel, Shield, Wind, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProductKind } from '@/lib/contracts/display'

const ICONS: Record<ProductKind, LucideIcon> = {
  traffic: Car,
  air_quality: Wind,
  flood: CloudRain,
  fuel: Fuel,
  other: Shield,
}

/** 40px round chip with the contract type's stroke icon (handoff §4). */
export function ProductIcon({ kind, className }: { kind: ProductKind; className?: string }) {
  const Icon = ICONS[kind]
  return (
    <span
      aria-hidden
      className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-raised text-sky', className)}
    >
      <Icon size={21} strokeWidth={2} />
    </span>
  )
}
