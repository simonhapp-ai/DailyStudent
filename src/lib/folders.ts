import type { UserFolder, UserNote } from '../types'

// folderId plus every descendant subfolder id, recursively — folders can be
// nested arbitrarily deep via "Neuer Unterordner", so a delete/count that
// only looks at direct children misses grandchildren and beyond.
export function collectFolderAndDescendants(folderId: string, allFolders: UserFolder[]): string[] {
  const ids = [folderId]
  const stack = [folderId]
  while (stack.length) {
    const id = stack.pop()!
    for (const f of allFolders.filter((f) => f.parentFolderId === id)) {
      ids.push(f.id)
      stack.push(f.id)
    }
  }
  return ids
}

export function countNotesInFolderTree(folderId: string, allFolders: UserFolder[], allNotes: UserNote[]): number {
  const ids = new Set(collectFolderAndDescendants(folderId, allFolders))
  return allNotes.filter((n) => n.folderId && ids.has(n.folderId)).length
}
