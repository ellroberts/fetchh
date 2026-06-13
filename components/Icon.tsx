// components/Icon.tsx
import React from 'react'

export type IconSize = 'sm' | 'md' | 'lg' | 'xl' | 'page'

const sizeMap: Record<IconSize, number> = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  page: 64,
}

interface IconProps {
  icon: React.ElementType
  size?: IconSize
  color?: string
  className?: string
}

export const Icon: React.FC<IconProps> = ({
  icon: LucideIcon,
  size = 'md',
  color,
  className,
}) => {
  const px = sizeMap[size]
  return (
    <LucideIcon
      size={px}
      color={color}
      className={className}
    />
  )
}

export default Icon
