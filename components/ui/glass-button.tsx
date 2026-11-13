'use client'

import * as React from 'react'

import type { VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

import { Button, type buttonVariants } from '@/components/ui/button'

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: VariantProps<typeof buttonVariants>['size']
  children: React.ReactNode
  suffix?: React.ReactNode
  className?: string
  asChild?: boolean
  primaryColor?: 'purple' | 'blue' | 'darkBlue'
}

const glassColors = {
  purple: { tint: '209, 122, 255', text: 'var(--color-button-purple)' },
  blue: { tint: '102, 153, 255', text: 'var(--color-button-blue)' },
  darkBlue: { tint: '124, 127, 178', text: 'var(--color-button-dark-blue)' }
}

function GlassButton({ children,
  suffix,
  size,
  asChild = false,
  className,
  primaryColor = 'purple',
  ...props }: GlassButtonProps) {
  return (
    <Button
      variant="default"
      size={size}
      asChild={asChild}
      style={{
        '--glass-color': glassColors[primaryColor].tint,
        '--glass-button-text': glassColors[primaryColor].text
      } as React.CSSProperties}
      className={cn(
        size === 'lg' && 'text-base has-[>svg]:px-6',
        suffix && 'justify-between',
        'relative inline-flex shrink-0 rounded-lg bg-transparent! bg-clip-padding text-(--glass-button-text) shadow-md',

        // Glass effect
        `bg-linear-to-l from-[rgba(var(--glass-color),0.15)] to-[rgba(var(--glass-color),0.25)] backdrop-blur-sm`,

        'before:pointer-events-none before:absolute before:inset-0 before:size-full before:rounded-[inherit] before:border before:border-transparent before:bg-origin-border',

        // Conic gradient
        `before:bg-[conic-gradient(from_var(--button-angle)_at_50%_50%,rgba(var(--glass-color),0.5),rgba(var(--glass-color),0)_10%_43%,rgba(var(--glass-color),0.5)_50%,rgba(var(--glass-color),0)_73%_93%,rgba(var(--glass-color),0.5))]`,

        //masking
        `before:mask-[linear-gradient(rgb(var(--glass-color))_0_0),linear-gradient(rgb(var(--glass-color))_0_0)] before:mask-exclude before:[mask-clip:content-box,border-box]`,

        // Hover
        'before:[transition-property:--button-angle] before:duration-500 before:ease-in-out hover:before:[--button-angle:-125deg]',

        className
      )}
      {...props}
    >
      {suffix ? (
        <>
          <div className='flex-1'>
            {children}
          </div>
          {suffix}
        </>
      ) : (
        children
      )}
    </Button>
  )
}

export { GlassButton, type GlassButtonProps }
