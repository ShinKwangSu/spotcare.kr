// =============================================================================
// spotcare.kr MVP — Database Types
// supabase/migrations/001_initial_schema.sql 과 1:1로 동기화된다.
// 스키마 변경 시 이 파일을 반드시 함께 갱신할 것.
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js'

// -----------------------------------------------------------------------------
// Row 타입 (DB 에서 SELECT 된 형태)
// -----------------------------------------------------------------------------

/**
 * tenants — 마스터 계정/업체.
 * password_hash 는 절대 클라이언트로 전달하지 않는다(서버 전용).
 */
export type Tenant = {
  id: string
  company_name: string
  admin_name: string
  phone: string
  email: string
  created_at: string
  deleted_at?: string | null
}

/**
 * password_hash 를 포함한 서버 전용 Tenant 형태.
 * 로그인 검증 등 서버 컨텍스트에서만 사용한다.
 */
export type TenantWithSecret = Tenant & {
  password_hash: string
}

/**
 * workspaces — 업체가 관리하는 건물/장소.
 * max_floor: 지상 최고 층(양수, 없으면 0)
 * min_floor: 지하 최저 층(음수, 없으면 0)
 */
export type Workspace = {
  id: string
  tenant_id: string
  workspace_name: string
  max_floor: number
  min_floor: number
  created_at: string
  deleted_at?: string | null
}

/**
 * facility_types — 워크스페이스별 공간 카테고리.
 */
export type FacilityType = {
  id: string
  workspace_id: string
  tenant_id: string
  type_name: string
  created_at: string
  deleted_at?: string | null
}

/**
 * facilities — 실제 관리 대상 시설.
 * floor: 정수 저장(3층=3, 지하1층=-1, 층없음=0). 표시 변환은 앱 레이어.
 */
export type Facility = {
  id: string
  workspace_id: string
  tenant_id: string
  facility_type_id: string
  facility_name: string
  floor: number
  location_description: string | null
  notes: string | null
  created_at: string
  deleted_at?: string | null
}

/**
 * inspectors — 점검 담당자. 테넌트 레벨 엔티티.
 */
export type Inspector = {
  id: string
  workspace_id: string
  tenant_id: string
  name: string
  phone: string | null
  email: string | null
  created_at: string
  deleted_at?: string | null
}

/**
 * checklists — 점검표. 워크스페이스 레벨 엔티티.
 * days: 요일 배열(0=일~6=토). repeat_cycle='weekly'일 때만 사용.
 */
export type Checklist = {
  id: string
  workspace_id: string
  tenant_id: string
  checklist_name: string
  description: string | null
  repeat_cycle: 'daily' | 'weekly' | 'monthly'
  count: number
  days: number[] | null
  created_at: string
  deleted_at?: string | null
}

/**
 * checklist_items — 점검표의 개별 항목.
 * sort_order 기준 오름차순으로 표시한다.
 */
export type ChecklistItem = {
  id: string
  checklist_id: string
  workspace_id: string
  tenant_id: string
  item_name: string
  response_type: 'checklist'
  is_required: boolean
  sort_order: number
  created_at: string
  deleted_at?: string | null
}

/** 항목이 함께 로드된 점검표 (getChecklists 반환 타입) */
export type ChecklistWithItems = Checklist & {
  checklist_items: ChecklistItem[]
}

/**
 * facility_checklists — 시설-점검표 M:N 연결 테이블.
 */
export type FacilityChecklist = {
  id: string
  facility_id: string
  checklist_id: string
  workspace_id: string
  tenant_id: string
  created_at: string
}

/** 점검표가 함께 로드된 시설 (getFacilities 반환 타입) */
export type FacilityWithChecklists = Facility & {
  facility_checklists: { checklist_id: string }[]
}

/**
 * admins — 플랫폼 운영자(슈퍼어드민, apps/admin).
 * 테넌트 격리 대상이 아니다(tenant_id 없음). service_role 전용 테이블.
 * password_hash 는 절대 클라이언트로 전달하지 않는다(서버 전용).
 */
export type Admin = {
  id: string
  email: string
  name: string
  created_at: string
  deleted_at?: string | null
}

/**
 * password_hash 를 포함한 서버 전용 Admin 형태.
 * 로그인 검증 등 서버 컨텍스트에서만 사용한다.
 */
export type AdminWithSecret = Admin & {
  password_hash: string
}

// -----------------------------------------------------------------------------
// Insert 타입 (INSERT 시 입력 형태 — DB 기본값/자동생성 컬럼은 선택적)
// -----------------------------------------------------------------------------

export type TenantInsert = {
  id?: string
  company_name: string
  admin_name: string
  phone: string
  email: string
  password_hash: string
  created_at?: string
  deleted_at?: string | null
}

export type WorkspaceInsert = {
  id?: string
  tenant_id: string
  workspace_name: string
  max_floor?: number
  min_floor?: number
  created_at?: string
  deleted_at?: string | null
}

export type FacilityTypeInsert = {
  id?: string
  workspace_id: string
  tenant_id: string
  type_name: string
  created_at?: string
  deleted_at?: string | null
}

export type FacilityInsert = {
  id?: string
  workspace_id: string
  tenant_id: string
  facility_type_id: string
  facility_name: string
  floor: number
  location_description?: string | null
  notes?: string | null
  created_at?: string
  deleted_at?: string | null
}

// -----------------------------------------------------------------------------
// Update 타입 (UPDATE 시 부분 갱신 — 모든 필드 선택적)
// 격리 키(tenant_id) 와 PK(id) 는 갱신 대상에서 제외한다.
// -----------------------------------------------------------------------------

export type WorkspaceUpdate = Partial<
  Omit<Workspace, 'id' | 'tenant_id' | 'created_at'>
>

export type FacilityTypeUpdate = Partial<
  Omit<FacilityType, 'id' | 'tenant_id' | 'workspace_id' | 'created_at'>
>

export type FacilityUpdate = Partial<
  Omit<Facility, 'id' | 'tenant_id' | 'workspace_id' | 'created_at'>
>

export type InspectorInsert = {
  id?: string
  workspace_id: string
  tenant_id: string
  name: string
  phone?: string | null
  email?: string | null
  created_at?: string
  deleted_at?: string | null
}

export type ChecklistItemInsert = {
  id?: string
  checklist_id: string
  workspace_id: string
  tenant_id: string
  item_name: string
  response_type?: 'checklist'
  is_required?: boolean
  sort_order?: number
  created_at?: string
  deleted_at?: string | null
}

export type ChecklistInsert = {
  id?: string
  workspace_id: string
  tenant_id: string
  checklist_name: string
  description?: string | null
  repeat_cycle: 'daily' | 'weekly' | 'monthly'
  count: number
  days?: number[] | null
  created_at?: string
  deleted_at?: string | null
}

export type FacilityChecklistInsert = {
  id?: string
  facility_id: string
  checklist_id: string
  workspace_id: string
  tenant_id: string
  created_at?: string
}

export type AdminInsert = {
  id?: string
  email: string
  password_hash: string
  name: string
  created_at?: string
  deleted_at?: string | null
}

/** admins Update — id/created_at 은 갱신 대상에서 제외한다. */
export type AdminUpdate = Partial<Omit<Admin, 'id' | 'created_at'>>

/**
 * inspection_sessions — QR 스캔 시 생성되는 5분 유효 점검 세션.
 * id(UUID)가 일회성 토큰 역할을 한다.
 */
export type InspectionSession = {
  id: string
  facility_id: string
  inspector_id: string | null
  status: 'active' | 'completed' | 'expired'
  created_at: string
  expires_at: string
  completed_at: string | null
}

export type InspectionSessionInsert = {
  id?: string
  facility_id: string
  inspector_id?: string | null
  status?: 'active' | 'completed' | 'expired'
  expires_at?: string
  completed_at?: string | null
}

/**
 * inspection_results — 점검 제출 결과.
 * item_results: { "<checklist_item_id>": true|false }
 */
export type InspectionResult = {
  id: string
  session_id: string
  facility_id: string
  submitted_at: string
  item_results: Record<string, boolean>
}

export type InspectionResultInsert = {
  id?: string
  session_id: string
  facility_id: string
  item_results: Record<string, boolean>
}

// -----------------------------------------------------------------------------
// Supabase 클라이언트 제네릭용 Database 인터페이스
// createClient<Database>(...) 형태로 사용한다.
// -----------------------------------------------------------------------------

export type Database = {
  public: {
    // @supabase/supabase-js 의 GenericSchema 제약을 만족시키기 위해
    // Views/Functions 키가 반드시 존재해야 한다(없으면 insert/update 가 never 추론).
    Views: Record<string, never>
    Tables: {
      tenants: {
        Row: TenantWithSecret
        Insert: TenantInsert
        Update: Partial<TenantInsert>
        Relationships: []
      }
      workspaces: {
        Row: Workspace
        Insert: WorkspaceInsert
        Update: Partial<WorkspaceInsert>
        Relationships: []
      }
      facility_types: {
        Row: FacilityType
        Insert: FacilityTypeInsert
        Update: Partial<FacilityTypeInsert>
        Relationships: []
      }
      facilities: {
        Row: Facility
        Insert: FacilityInsert
        Update: Partial<FacilityInsert>
        Relationships: []
      }
      inspectors: {
        Row: Inspector
        Insert: InspectorInsert
        Update: Partial<InspectorInsert>
        Relationships: []
      }
      checklists: {
        Row: Checklist
        Insert: ChecklistInsert
        Update: Partial<ChecklistInsert>
        Relationships: []
      }
      checklist_items: {
        Row: ChecklistItem
        Insert: ChecklistItemInsert
        Update: Partial<ChecklistItemInsert>
        Relationships: []
      }
      facility_checklists: {
        Row: FacilityChecklist
        Insert: FacilityChecklistInsert
        Update: Partial<FacilityChecklistInsert>
        Relationships: []
      }
      admins: {
        Row: AdminWithSecret
        Insert: AdminInsert
        Update: Partial<AdminInsert>
        Relationships: []
      }
      inspection_sessions: {
        Row: InspectionSession
        Insert: InspectionSessionInsert
        Update: Partial<InspectionSessionInsert>
        Relationships: []
      }
      inspection_results: {
        Row: InspectionResult
        Insert: InspectionResultInsert
        Update: Partial<InspectionResultInsert>
        Relationships: []
      }
    }
    Functions: {
      app_current_tenant_id: {
        Args: Record<string, never>
        Returns: string
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Supabase 클라이언트 타입 별칭
// 도메인 repository/service 가 주입받는 클라이언트의 타입.
// raw `@supabase/supabase-js` 를 앱에서 직접 의존하지 않도록 여기서 재노출한다.
// -----------------------------------------------------------------------------

/** Database 제네릭이 적용된 Supabase 클라이언트 타입. */
export type TypedSupabaseClient = SupabaseClient<Database>
