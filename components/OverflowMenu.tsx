'use client'

import React from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Menu } from '@/components/Menu'
import { IconButton } from '@/components/IconButton'
import type { MenuOptionProps } from '@/components/Menu'

export type OverflowMenuItem = MenuOptionProps

export interface OverflowMenuProps {
  items: OverflowMenuItem[]
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
}

export function OverflowMenu({ items, tooltipPosition = 'auto' }: OverflowMenuProps) {
  return (
    <Menu
      options={items}
      align="right"
      minWidth={200}
      trigger={(open, isOpen) => (
        <IconButton
          onClick={open}
          tooltip="More actions"
          tooltipPosition={tooltipPosition}
          selected={isOpen}
          size="md"
        >
          <MoreHorizontal size={16} />
        </IconButton>
      )}
    />
  )
}

export default OverflowMenu
