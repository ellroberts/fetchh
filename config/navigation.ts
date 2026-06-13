import { LayoutDashboard, MessageSquare, FolderOpen } from 'lucide-react'

export interface NavItem {
  id: string
  label: string
  icon: string
  iconHover: string
  iconDark?: string
  iconHoverDark?: string
  href: string
  badge?: number
  iconComponent?: React.ElementType
  iconColor?: string
}

export const getNavItems = (
  conversationCount: number = 0,
  claimableCount: number = 0,
  isAdmin: boolean = false
): NavItem[] => {
  const items: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/dashboard',
      icon: '',
      iconHover: '',
      iconComponent: LayoutDashboard,
    },
    {
      id: 'threads',
      label: 'Threads',
      href: '/threads',
      badge: claimableCount > 0 ? claimableCount : undefined,
      icon: '',
      iconHover: '',
      iconComponent: MessageSquare,
    },
    {
      id: 'projects',
      label: 'Projects',
      href: '/projects',
      icon: '',
      iconHover: '',
      iconComponent: FolderOpen,
    },
  ]

  if (isAdmin) {
    items.push(
      {
        id: 'thread-groups',
        label: 'Threads',
        href: '/thread-groups',
        icon: '',
        iconHover: '',
      },
      {
        id: 'pawmarks',
        label: 'Pawmarks',
        href: '/pawmarks',
        icon: '',
        iconHover: '',
      },
      {
        id: 'library',
        label: 'Library',
        href: '/library',
        icon: '',
        iconHover: '',
      },
      {
        id: 'admin',
        label: 'Admin',
        href: '/admin',
        icon: '',
        iconHover: '',
      }
    )
  }

  return items
}