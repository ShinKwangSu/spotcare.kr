'use client'

// =============================================================================
// DashboardStatsCards — 운영 통계 카드 (총 어드민/테넌트/시설 수)
// =============================================================================
// useDashboardStats() 훅으로 서버 데이터를 소비한다.
// =============================================================================

import { Building2, ShieldCheck, Wrench } from 'lucide-react'

import { useDashboardStats } from '@/domain/stats'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@spotcare/ui/components/card'
import { Skeleton } from '@spotcare/ui/components/skeleton'

type StatCard = {
  key: 'adminCount' | 'tenantCount' | 'facilityCount'
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const CARDS: StatCard[] = [
  { key: 'adminCount', label: '총 어드민 수', icon: ShieldCheck },
  { key: 'tenantCount', label: '총 테넌트 수', icon: Building2 },
  { key: 'facilityCount', label: '총 시설 수', icon: Wrench },
]

export function DashboardStatsCards() {
  const { data, isLoading, isError } = useDashboardStats()

  if (isError) {
    return (
      <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        통계를 불러오는 중 오류가 발생했습니다.
      </p>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      {CARDS.map((card) => (
        <Card key={card.key}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.label}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading || !data ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <p className="text-3xl font-bold">
                {data[card.key].toLocaleString('ko-KR')}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
