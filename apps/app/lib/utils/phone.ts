/**
 * 한국 전화번호 포매터.
 * 입력값에서 숫자만 추출(최대 11자리)한 뒤 지역코드에 맞는 하이픈을 붙인다.
 *
 * 02 (서울)  : 02-XXXX-XXXX (10자리) / 02-XXX-XXXX (9자리)
 * 기타(이동·지방): 0XX-XXXX-XXXX (11자리) / 0XX-XXX-XXXX (10자리)
 */
export function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (!d) return ''

  if (d.startsWith('02')) {
    if (d.length <= 2) return d
    if (d.length <= 5) return `${d.slice(0, 2)}-${d.slice(2)}`
    if (d.length <= 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`
  }

  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
}

/** 하이픈을 제거한 숫자만 반환 (서버 제출용) */
export function rawPhone(formatted: string): string {
  return formatted.replace(/-/g, '')
}
