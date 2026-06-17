-- =============================================================================
-- spotcare.kr MVP — 007_admins_table.sql
-- 슈퍼어드민(apps/admin) 인증용 admins 테이블.
-- STEP_2.md 기반. 001_initial_schema.sql 이후 적용한다.
-- =============================================================================

-- gen_random_uuid() 보장 (001에서 이미 활성화되었을 수 있으나 멱등하게 재명시)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- admins — 플랫폼 운영자(슈퍼어드민) 계정.
--   * 멀티테넌트 격리 대상이 아님(플랫폼 전역 운영자). tenant_id 없음.
--   * 회원가입 없음. 계정은 시딩/수동 발급만.
--   * 로그인 검증 시 email 로 SELECT 후 password_hash 비교가 필요하므로
--     service_role(서버 전용) 으로만 접근한다.
-- -----------------------------------------------------------------------------
CREATE TABLE admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(100) NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 로그인 식별자(email) 조회 최적화. UNIQUE 제약이 인덱스를 생성하므로
-- 별도 인덱스는 불필요하나, 명시적 의도 표현을 위해 주석으로 남긴다.
-- (UNIQUE(email) → 자동 b-tree 인덱스 존재)

-- -----------------------------------------------------------------------------
-- RLS 정책 — 적용하지 않음(의도적).
--   사유:
--   1) admins 는 테넌트 격리 대상이 아니다(tenant_id 컬럼 없음).
--   2) 로그인은 인증 전 단계에서 email 로 행을 조회해야 한다(세션 컨텍스트 없음).
--   3) 회원가입/셀프서비스 경로가 없어 클라이언트 직접 접근이 발생하지 않는다.
--   접근 통제 방식:
--   - 오직 service_role(서버 전용 키)로만 접근한다. anon 키로는 노출 금지.
--   - service_role 은 RLS 를 BYPASS 하므로 RLS 를 켜도 실효가 없다.
--   - 따라서 RLS 미적용 대신 "anon/authenticated 역할에 권한을 주지 않는다"가
--     실질 방어선이다. Supabase 기본 grant 정책상 신규 테이블은 anon/authenticated 에
--     자동 노출되지 않도록 아래에서 명시적으로 권한을 회수한다.
-- -----------------------------------------------------------------------------

-- anon/authenticated 역할의 모든 접근 차단(있다면 회수). service_role 전용 보장.
REVOKE ALL ON TABLE admins FROM anon, authenticated;

-- -----------------------------------------------------------------------------
-- 초기 슈퍼어드민 시딩
--   비밀번호: 1q2w#E$R
--   ⚠️ 아래 password_hash 는 PLACEHOLDER 다. 배포 전 실제 bcrypt 해시로 교체할 것.
--   해시 생성:
--     node -e "const bcrypt=require('bcryptjs'); bcrypt.hash('1q2w#E$R',10).then(h=>console.log(h))"
--   saltRounds=10 ($2b$10$...) 로 생성한 결과를 아래 값에 그대로 붙여넣는다.
--   ON CONFLICT DO NOTHING: 마이그레이션 재실행/중복 시딩 시 안전.
-- -----------------------------------------------------------------------------
INSERT INTO admins (email, password_hash, name)
VALUES (
  'admin@spotcare.kr',
  '$2b$10$PLACEHOLDER_REPLACE_WITH_REAL_HASH',
  '관리자'
)
ON CONFLICT (email) DO NOTHING;
