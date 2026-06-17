'use client'

// =============================================================================
// AdminSidebar — 슈퍼어드민 포털 사이드바
// =============================================================================
// 단일 컨텍스트(전역 운영). 대시보드 / 어드민 관리 / 테넌트 관리 메뉴.
// =============================================================================

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2,
  LayoutDashboard,
  ShieldCheck,
  ShieldEllipsis,
} from 'lucide-react'

import { NavUser } from '@/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@spotcare/ui/components/sidebar'

type NavItem = {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  /** 정확히 일치할 때만 활성화할지 (대시보드 홈처럼 하위 경로가 겹치는 경우) */
  exact?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { title: '대시보드', href: '/dashboard', icon: LayoutDashboard, exact: true },
  { title: '어드민 관리', href: '/dashboard/admins', icon: ShieldCheck },
  { title: '테넌트 관리', href: '/dashboard/tenants', icon: Building2 },
]

type Props = React.ComponentProps<typeof Sidebar> & {
  user: { name: string; email: string }
}

export function AdminSidebar({ user, ...props }: Props) {
  const pathname = usePathname()
  const initials = user.name ? user.name.slice(0, 2).toUpperCase() : 'SA'

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/dashboard">
                <ShieldEllipsis className="h-5 w-5" />
                <span className="text-base font-semibold">spotcare 관리자</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {NAV_ITEMS.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive(item)}>
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={{ name: user.name, email: user.email, initials }} />
      </SidebarFooter>
    </Sidebar>
  )
}
