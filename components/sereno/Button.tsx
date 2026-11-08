import Link from 'next/link'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full text-button transition-colors disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40',
  {
    variants: {
      variant: {
        primary: 'bg-sky text-on-sky hover:bg-sky-deep',
        sun: 'bg-sun text-on-sun hover:brightness-95',
        secondary: 'border border-border-strong bg-surface text-ink hover:bg-surface-raised',
        ink: 'bg-panel text-on-panel hover:opacity-90',
        link: 'min-h-touch rounded-none px-0 text-sky hover:text-sky-deep hover:underline underline-offset-4',
      },
      size: {
        // 54px is the main phone action (handoff §2.3); 44–48px elsewhere.
        main: 'h-[54px] px-6',
        md: 'h-12 px-5',
        sm: 'h-11 px-4 text-[15px]',
      },
      block: { true: 'w-full', false: '' },
    },
    compoundVariants: [{ variant: 'link', className: 'h-auto px-0' }],
    defaultVariants: { variant: 'primary', size: 'md', block: false },
  },
)

type Variants = VariantProps<typeof buttonVariants>

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & Variants
type LinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & Variants & { href: string }

/** Pill button, verb first (handoff §5 Button). */
export function Button({ variant, size, block, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size, block }), className)} {...props} />
}

/** Same look as Button, rendered as a real link. */
export function ButtonLink({ variant, size, block, className, href, ...props }: LinkProps) {
  return <Link href={href} className={cn(buttonVariants({ variant, size, block }), className)} {...props} />
}
