'use client'

import { useState } from 'react'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'

import { deleteWorkspace } from '@/app/actions/workspace'
import type { Workspace } from '@/types/database'
import { Button } from '@spotcare/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@spotcare/ui/components/dropdown-menu'
import { WorkspaceFormDialog } from '@/components/workspace-form-dialog'
import { ConfirmDeleteButton } from '@/components/confirm-delete-button'

export function WorkspaceRowActions({ workspace }: { workspace: Workspace }) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="더 보기">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            수정
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <WorkspaceFormDialog
        workspace={workspace}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <ConfirmDeleteButton
        onConfirm={() => deleteWorkspace(workspace.id)}
        title="워크스페이스를 삭제하시겠습니까?"
        description="하위 시설 타입과 시설 정보가 모두 함께 삭제됩니다. 되돌릴 수 없습니다."
        successMessage="워크스페이스를 삭제했습니다."
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  )
}
