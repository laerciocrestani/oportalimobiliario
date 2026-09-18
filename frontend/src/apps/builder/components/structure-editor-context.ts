import { createContext, use } from 'react'
import type { SkeletonInput, StackFloor, StackTower, StackUnit } from '@/apps/builder/lib/floor-stack'

export type StructureEditorState = {
  towers: StackTower[]
  selectedTowerIndex: number
  selectedFloorNumber: number | null
  skeleton: SkeletonInput
}

export type StructureEditorActions = {
  setSkeleton: (patch: Partial<SkeletonInput>) => void
  generateSkeleton: () => void
  selectTower: (index: number) => void
  selectFloor: (number: number) => void
  updateUnit: (unitKey: string, patch: Partial<StackUnit>) => void
}

export type StructureEditorMeta = {
  selectedTower: StackTower | null
  selectedFloor: StackFloor | null
}

export type StructureEditorContextValue = {
  state: StructureEditorState
  actions: StructureEditorActions
  meta: StructureEditorMeta
}

export const StructureEditorContext = createContext<StructureEditorContextValue | null>(null)

export function useStructureEditor() {
  const value = use(StructureEditorContext)

  if (!value) {
    throw new Error('useStructureEditor must be used within StructureEditor.Provider')
  }

  return value
}
