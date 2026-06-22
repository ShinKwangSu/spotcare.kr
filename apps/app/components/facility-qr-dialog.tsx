'use client'

// =============================================================================
// spotcare.kr MVP — QR 코드 다이얼로그 (시설 점검 QR 인쇄/다운로드)
// =============================================================================

import { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { toPng } from 'html-to-image'
import { QrCode, Printer, Download } from 'lucide-react'
import type { FacilityWithChecklists } from '@/types/database'
import { floorToDisplay } from '@/lib/utils/floor'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@spotcare/ui/components/dialog'
import { Button } from '@spotcare/ui/components/button'

type Props = {
  facility: FacilityWithChecklists
}

export function FacilityQrDialog({ facility }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://spotcare.kr'
  const inspectUrl = `${appUrl}/inspect/${facility.id}`

  const floorLabel = floorToDisplay(facility.floor)
  const subtitle = [floorLabel, facility.memo]
    .filter(Boolean)
    .join(' · ')

  async function getCardPng() {
    if (!cardRef.current) return null
    return toPng(cardRef.current, { quality: 1.0, pixelRatio: 3 })
  }

  async function handlePrint() {
    const dataUrl = await getCardPng()
    if (!dataUrl) return
    const win = window.open('', '_blank', 'width=420,height=560')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>QR — ${facility.facility_name}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{display:flex;justify-content:center;align-items:center;min-height:100vh}</style>
      </head><body><img src="${dataUrl}" style="max-width:100%"/></body></html>`)
    win.document.close()
    win.onload = () => { win.print() }
  }

  async function handleDownload() {
    const dataUrl = await getCardPng()
    if (!dataUrl) return
    const link = document.createElement('a')
    link.download = `qr-${facility.facility_name}.png`
    link.href = dataUrl
    link.click()
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="QR 코드 보기">
          <QrCode className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>QR 코드</DialogTitle>
        </DialogHeader>

        {/* QR 카드 — PNG 캡처 대상 */}
        <div
          ref={cardRef}
          className="flex flex-col items-center gap-4 rounded-xl border p-8 bg-white"
        >
          <QRCodeSVG
            value={inspectUrl}
            size={200}
            level="H"
            includeMargin={false}
          />
          <div className="text-center space-y-1">
            <p className="font-semibold text-base text-black">{facility.facility_name}</p>
            {subtitle && (
              <p className="text-sm text-gray-500">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            인쇄
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            PNG 저장
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
