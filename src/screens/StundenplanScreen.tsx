import { useState } from 'react'
import { useUser } from '../context/UserContext'
import { PlanenBar } from '../components/ui/PlanenBar'
import { EmptyState } from '../components/ui/EmptyState'
import { StundenplanWeekWidget, StundenplanSetupWidget } from './KalenderScreen'

// Stundenplan als eigene Rubrik unter Planen (Version C).
//
// Bisher lag er als Untermenü im Kalender. Inhaltlich gehört er dorthin nicht: Er
// ist keine Terminliste, sondern die Grundlage, aus der die App den Tagesplan, die
// Modus-Vorwahl und die freien Zeitfenster des Lernplans ableitet.
//
// Kopfform: nur Titel — der Screen wird gezielt geöffnet, um eine Sache zu erledigen.
// Eine Bühne wäre hier verschwendet (Regel 1).
export function StundenplanScreen() {
  const { profile, updateProfile } = useUser()
  const [editing, setEditing] = useState(false)

  const stundenplan = profile?.stundenplan
  const hasSlots = (stundenplan?.slots?.length ?? 0) > 0

  return (
    <div className="min-h-dvh bg-background pb-32">
      <div className="px-4 lg:px-6" style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))' }}>
        <h1 className="text-[30px] font-extrabold tracking-[-0.035em] text-text-primary">Planen</h1>
        <p className="text-[13px] text-text-secondary mt-0.5">
          {hasSlots ? 'Dein Stundenplan — die Grundlage für Tagesplan und Lernplan.' : 'Stundenplan — noch nicht eingetragen.'}
        </p>
        <PlanenBar className="mt-4" />
      </div>

      <div className="px-4 mt-5 space-y-4 lg:px-6 lg:max-w-[1180px]">
        {editing || !hasSlots ? (
          <>
            {hasSlots && (
              <button
                onClick={() => setEditing(false)}
                className="text-[15px] font-semibold text-text-primary press-sm"
              >
                ‹ Fertig
              </button>
            )}
            <StundenplanSetupWidget
              faecher={profile?.faecher ?? []}
              initialSlots={stundenplan?.slots}
              onSave={(slots) => {
                updateProfile({ stundenplan: { slots, createdAt: new Date().toISOString() } })
                setEditing(false)
              }}
            />
          </>
        ) : (
          <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 lg:items-start lg:space-y-0">
            <div className="lg:order-1">
              <StundenplanWeekWidget stundenplan={stundenplan!} onOpen={() => setEditing(true)} />
            </div>
            <div className="space-y-3 lg:order-2">
              <p className="text-[13px] text-text-secondary leading-relaxed">
                Dein Stundenplan speist den Tagesplan im Unterrichtsmodus, die Modus-Vorwahl
                beim Öffnen der App und die freien Zeitfenster, in die der Lernplan seine
                Einheiten legt.
              </p>
              <button
                onClick={() => setEditing(true)}
                className="w-full h-12 rounded-pill text-[16px] font-semibold text-text-primary bg-[rgb(120,120,128)]/[0.12] dark:bg-[rgb(120,120,128)]/[0.24] press"
              >
                Bearbeiten oder neu scannen
              </button>
            </div>
          </div>
        )}

        {!hasSlots && !editing && (
          <EmptyState
            title="Noch kein Stundenplan"
            note="Fotografiere ihn ab oder trag die Stunden selbst ein — danach weiß die App, welche Stunde gerade läuft."
          />
        )}
      </div>
    </div>
  )
}
