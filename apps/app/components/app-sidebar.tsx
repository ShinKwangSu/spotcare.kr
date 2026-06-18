"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowLeftIcon,
  BuildingIcon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  LayoutGridIcon,
  ListIcon,
  MapPinIcon,
  UsersIcon,
} from "lucide-react"

import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@spotcare/ui/components/sidebar"

type Workspace = { id: string; workspace_name: string }

type Props = React.ComponentProps<typeof Sidebar> & {
  workspaces: Workspace[]
  user: { name: string; email: string }
}

export function AppSidebar({ workspaces, user, ...props }: Props) {
  const pathname = usePathname()

  // /dashboard/workspaces 이외의 /dashboard/[id]/... 패턴이면 워크스페이스 컨텍스트
  const segments = pathname.split("/").filter(Boolean)
  const NON_WORKSPACE_SEGMENTS = new Set(["workspaces"])
  const workspaceId =
    segments[0] === "dashboard" &&
    segments[1] &&
    !NON_WORKSPACE_SEGMENTS.has(segments[1])
      ? segments[1]
      : null
  const activeWorkspace = workspaceId
    ? workspaces.find((w) => w.id === workspaceId)
    : null

  const { isMobile, setOpenMobile } = useSidebar()
  const closeOnMobile = () => { if (isMobile) setOpenMobile(false) }

  const initials = user.name ? user.name.slice(0, 2).toUpperCase() : "SP"

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {activeWorkspace ? (
              <SidebarMenuButton
                className="data-[slot=sidebar-menu-button]:!p-1.5 cursor-default hover:bg-transparent active:bg-transparent"
              >
                <BuildingIcon className="h-5 w-5 shrink-0" />
                <span className="text-lg font-semibold truncate">
                  {activeWorkspace.workspace_name}
                </span>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton
                asChild
                className="data-[slot=sidebar-menu-button]:!p-1.5"
              >
                <Link href="/dashboard/workspaces">
                  <BuildingIcon className="h-5 w-5" />
                  <span className="text-base font-semibold">spotcare</span>
                </Link>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {activeWorkspace ? (
          /* ── 워크스페이스 컨텍스트 ── */
          <>
            <SidebarGroup>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild size="sm" className="text-xs text-muted-foreground" onClick={closeOnMobile}>
                    <Link href="/dashboard/workspaces">
                      <ArrowLeftIcon className="h-3.5 w-3.5" />
                      <span>전체 워크스페이스</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>

            <SidebarSeparator />

            <SidebarGroup>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.includes("/facility-types")}
                    onClick={closeOnMobile}
                  >
                    <Link href={`/dashboard/${workspaceId}/facility-types`}>
                      <ListIcon />
                      <span>시설 타입 관리</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.includes("/facilities") && !pathname.includes("/facility-types")}
                    onClick={closeOnMobile}
                  >
                    <Link href={`/dashboard/${workspaceId}/facilities`}>
                      <MapPinIcon />
                      <span>시설 정보 관리</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.includes("/inspectors")}
                    onClick={closeOnMobile}
                  >
                    <Link href={`/dashboard/${workspaceId}/inspectors`}>
                      <UsersIcon />
                      <span>점검자 관리</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.includes("/checklists")}
                    onClick={closeOnMobile}
                  >
                    <Link href={`/dashboard/${workspaceId}/checklists`}>
                      <ClipboardListIcon />
                      <span>점검표 관리</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </>
        ) : (
          /* ── 메인(대시보드) 컨텍스트 ── */
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/dashboard"}
                  onClick={closeOnMobile}
                >
                  <Link href="/dashboard">
                    <LayoutDashboardIcon />
                    <span>대시보드</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/dashboard/workspaces"}
                  onClick={closeOnMobile}
                >
                  <Link href="/dashboard/workspaces">
                    <LayoutGridIcon />
                    <span>워크스페이스 목록</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={{ name: user.name, email: user.email, initials }} />
      </SidebarFooter>
    </Sidebar>
  )
}
