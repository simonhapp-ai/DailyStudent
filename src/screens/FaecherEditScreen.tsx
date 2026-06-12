import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { SUBJECT_INFO, SUBJECT_GROUPS } from '../data/subjectInfo'
import { BottomSheet } from '../components/ui/BottomSheet'
import { Button } from '../components/ui/Button'

type CustomFach = { id: string; name: string; icon?: string }

function CustomFaecherModal({
  initial,
  onSave,
  onClose,
}: {
  initial: CustomFach[]
  onSave: (faecher: CustomFach[]) => void
  onClose: () => void
}) {
  const [inputs, setInputs] = useState<string[]>(
    initial.length > 0 ? initial.map((cf) => cf.name) : [''],
  )

  const updateInput = (i: number, val: string) =>
    setInputs((prev) => prev.map((inp, idx) => (idx === i ? val : inp)))
  const removeInput = (i: number) =>
    setInputs((prev) => prev.filter((_, idx) => idx !== i))
  const addInput = () => setInputs((prev) => [...prev, ''])

  const handleSave = () => {
    const valid = inputs.filter((s) => s.trim().length > 0)
    // Preserve existing IDs for names that match; generate new IDs for new names
    const faecher: CustomFach[] = valid.map((name) => {
      const existing = initial.find((cf) => cf.name === name.trim())
      return existing ?? { id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, name: name.trim() }
    })
    onSave(faecher)
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col max-w-lg mx-auto">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h2 className="text-[17px] font-bold text-text-primary">Eigene Fächer</h2>
          <p className="text-[12px] text-text-muted mt-0.5">Trag so viele Fächer ein wie du möchtest</p>
        </div>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-secondary text-sm font-medium transition-colors"
        >
          Abbrechen
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
        {inputs.map((val, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={val}
              onChange={(e) => updateInput(i, e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addInput() }}
              placeholder={`z. B. ${['Informatik', 'BWL', 'Jura', 'Medizin', 'Psychologie'][i % 5]}`}
              className="flex-1 bg-surface border border-border rounded-card px-4 py-3.5 text-text-primary text-[15px] placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
            />
            {inputs.length > 1 && (
              <button
                onClick={() => removeInput(i)}
                className="w-11 h-11 rounded-card border border-border flex items-center justify-center text-text-muted hover:text-danger hover:border-danger/30 transition-colors shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        ))}

        <button
          onClick={addInput}
          className="w-full py-3 border border-dashed border-border rounded-card flex items-center justify-center gap-2 text-text-muted hover:border-accent/50 hover:text-accent hover:bg-accent/5 transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          <span className="text-[13px] font-medium">Weiteres Fach</span>
        </button>
      </div>

      <div className="px-5 pb-8 pt-4 border-t border-border">
        <Button variant="primary" fullWidth size="lg" onClick={handleSave}>
          Fertig
        </Button>
      </div>
    </div>
  )
}

export function FaecherEditScreen() {
  const navigate = useNavigate()
  const { profile, applyFaecherChanges } = useUser()

  const [selectedFaecher, setSelectedFaecher] = useState<string[]>([...(profile?.faecher ?? [])])
  const [localCustomFaecher, setLocalCustomFaecher] = useState<CustomFach[]>([...(profile?.customFaecher ?? [])])
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [showCustomModal, setShowCustomModal] = useState(false)

  if (!profile) return null

  function handleToggle(id: string) {
    if (selectedFaecher.includes(id)) {
      if (profile!.faecher.includes(id)) {
        setConfirmDelete(id)
      } else {
        setSelectedFaecher((prev) => prev.filter((f) => f !== id))
      }
    } else {
      setSelectedFaecher((prev) => [...prev, id])
    }
  }

  function handleConfirmDelete() {
    if (!confirmDelete) return
    setSelectedFaecher((prev) => prev.filter((f) => f !== confirmDelete))
    setConfirmDelete(null)
  }

  function handleRemoveCustomFach(id: string) {
    setLocalCustomFaecher((prev) => prev.filter((cf) => cf.id !== id))
    setSelectedFaecher((prev) => prev.filter((f) => f !== id))
  }

  function handleSaveCustomFaecher(newFaecher: CustomFach[]) {
    const oldCustomIds = new Set(localCustomFaecher.map((cf) => cf.id))
    const newCustomIds = newFaecher.map((cf) => cf.id)
    setLocalCustomFaecher(newFaecher)
    setSelectedFaecher((prev) => {
      const withoutOldCustom = prev.filter((id) => !oldCustomIds.has(id))
      return [...withoutOldCustom, ...newCustomIds]
    })
    setShowCustomModal(false)
  }

  function handleSave() {
    const deletedIds = profile!.faecher.filter((id) => !selectedFaecher.includes(id))
    applyFaecherChanges(selectedFaecher, deletedIds, localCustomFaecher)
    navigate(-1)
  }

  const confirmSubject = confirmDelete
    ? (SUBJECT_INFO[confirmDelete] ?? { name: confirmDelete, icon: '📚', color: '#7C3AED' })
    : null

  const totalSelected = selectedFaecher.length

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {showCustomModal && (
        <CustomFaecherModal
          initial={localCustomFaecher}
          onSave={handleSaveCustomFaecher}
          onClose={() => setShowCustomModal(false)}
        />
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center justify-between px-4 pt-14 pb-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-accent font-medium text-[15px] press-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Zurück
          </button>
          <button
            onClick={handleSave}
            disabled={selectedFaecher.length === 0}
            className="px-4 py-1.5 rounded-pill bg-accent text-white text-[14px] font-semibold press-sm disabled:opacity-40"
          >
            Fertig
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pt-6 pb-10 overflow-y-auto">
        <h1 className="text-[28px] font-bold text-text-primary mb-1">Deine Fächer</h1>
        <p className="text-text-muted text-sm mb-6">
          Fächer hinzufügen oder entfernen.{' '}
          <span className="text-accent font-medium">{totalSelected} ausgewählt</span>
        </p>

        {/* ── Eigene Fächer ─────────────────────────────── */}
        <div className="mb-7 rounded-[20px] border border-border/60 bg-surface overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-[15px] text-text-primary">Eigene Fächer</p>
                <p className="text-[12px] text-text-muted mt-0.5">
                  {localCustomFaecher.length > 0
                    ? `${localCustomFaecher.length} eigene${localCustomFaecher.length === 1 ? 's Fach' : ' Fächer'} angelegt`
                    : 'Fächer die oben nicht aufgeführt sind — z. B. Informatik, Latein …'}
                </p>
              </div>
              <button
                onClick={() => setShowCustomModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-[12px] grad-accent text-white text-[13px] font-semibold shrink-0 active:scale-95 transition-all"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
                {localCustomFaecher.length > 0 ? 'Bearbeiten' : 'Anlegen'}
              </button>
            </div>
          </div>

          {localCustomFaecher.length > 0 && (
            <div className="px-4 pb-4 flex flex-wrap gap-2">
              {localCustomFaecher.map((cf) => (
                <div
                  key={cf.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill"
                  style={{ background: 'rgba(var(--color-accent), 0.1)', border: '1px solid rgba(var(--color-accent), 0.25)' }}
                >
                  <span className="text-[13px] font-semibold text-accent">{cf.name}</span>
                  <button
                    onClick={() => handleRemoveCustomFach(cf.id)}
                    className="text-accent/60 hover:text-danger transition-colors"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Standard Fächer ───────────────────────────── */}
        <div className="space-y-5">
          {SUBJECT_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                {group.label}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {group.ids.map((id) => {
                  const subject = SUBJECT_INFO[id]
                  const active = selectedFaecher.includes(id)
                  const isExisting = profile.faecher.includes(id)
                  const markedForDelete = isExisting && !active
                  return (
                    <button
                      key={id}
                      onClick={() => handleToggle(id)}
                      className={`relative flex items-center gap-3 p-3 rounded-card border text-left transition-all duration-150 press-sm ${
                        active
                          ? 'border-accent bg-accent-soft'
                          : markedForDelete
                          ? 'border-danger/40 bg-danger/5'
                          : 'border-border bg-surface hover:bg-surface-hover'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-btn flex items-center justify-center text-lg shrink-0"
                        style={{ backgroundColor: `${subject.color}22` }}
                      >
                        {subject.icon}
                      </div>
                      <p className={`text-xs font-semibold leading-tight ${
                        active ? 'text-text-primary' : 'text-text-secondary'
                      }`}>
                        {subject.name}
                      </p>
                      {active && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full grad-accent flex items-center justify-center shrink-0">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      )}
                      {markedForDelete && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-danger/15 flex items-center justify-center shrink-0">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#FF453A" strokeWidth="3">
                            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                          </svg>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Info note */}
        <div className="mt-6 px-4 py-3 rounded-card bg-surface border border-border/60">
          <p className="text-xs text-text-muted leading-relaxed">
            Neue Fächer erhalten automatisch Ordner nach deinem gewählten Sortiermodus ({profile.folderSortMode === 'manual' ? 'Manuell' : profile.userType === 'student' ? 'Semester' : 'Halbjahr/Quartale'}).
          </p>
        </div>
      </div>

      {/* Deletion confirmation sheet */}
      <BottomSheet isOpen={confirmDelete !== null} onClose={() => setConfirmDelete(null)}>
        <div className="px-5 pb-2 pt-1">
          <div className="flex items-center gap-3 mb-4">
            {confirmSubject && (
              <div
                className="w-10 h-10 rounded-btn flex items-center justify-center text-xl shrink-0"
                style={{ backgroundColor: `${confirmSubject.color}22` }}
              >
                {confirmSubject.icon}
              </div>
            )}
            <div>
              <p className="text-text-primary font-bold text-[16px]">
                {confirmSubject?.name} entfernen?
              </p>
              <p className="text-text-muted text-[13px] mt-0.5">Diese Aktion kann nicht rückgängig gemacht werden.</p>
            </div>
          </div>

          <div className="px-4 py-3 rounded-card bg-danger/8 border border-danger/20 mb-5">
            <p className="text-[13px] text-text-secondary leading-relaxed">
              Alle Ordner und Smart Notes für <span className="font-semibold text-text-primary">{confirmSubject?.name}</span> werden endgültig gelöscht.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 pb-2">
            <button
              onClick={handleConfirmDelete}
              className="w-full py-3.5 rounded-card text-[15px] font-semibold text-white press-sm"
              style={{ backgroundColor: '#FF453A' }}
            >
              Fach & Daten löschen
            </button>
            <button
              onClick={() => setConfirmDelete(null)}
              className="w-full py-3.5 rounded-card text-[15px] font-semibold text-text-primary bg-surface border border-border press-sm"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}
