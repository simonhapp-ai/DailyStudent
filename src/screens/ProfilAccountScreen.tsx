import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { useUser } from '../context/UserContext'
import { supabase } from '../lib/supabase'
import { createPortalSession } from '../lib/stripe'
import { restorePurchases } from '../lib/revenuecat'

const isNative = Capacitor.isNativePlatform()

export function ProfilAccountScreen() {
  const navigate = useNavigate()
  const { authUser, signOut, isPro, subscriptionSource } = useUser()

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError, setPortalError] = useState<string | null>(null)
  const [restoreLoading, setRestoreLoading] = useState(false)
  const [restoreMessage, setRestoreMessage] = useState<{ text: string; isError: boolean } | null>(null)

  const handleRestorePurchases = async () => {
    setRestoreMessage(null)
    setRestoreLoading(true)
    const result = await restorePurchases()
    setRestoreLoading(false)
    if (!result.success) {
      setRestoreMessage({ text: result.error ?? 'Wiederherstellen fehlgeschlagen. Bitte versuche es erneut.', isError: true })
    } else if (result.hasEntitlement) {
      setRestoreMessage({ text: 'Käufe wiederhergestellt — dein Pro-Zugang ist aktiv.', isError: false })
    } else {
      setRestoreMessage({ text: 'Keine früheren Käufe für diese Apple-ID gefunden.', isError: false })
    }
  }

  const handleManageSubscription = async () => {
    if (subscriptionSource === 'apple') {
      const url = 'itms-apps://apps.apple.com/account/subscriptions'
      if (isNative) await Browser.open({ url })
      else window.location.href = url
      return
    }
    setPortalError(null)
    setPortalLoading(true)
    try {
      const url = await createPortalSession()
      if (isNative) await Browser.open({ url })
      else window.location.href = url
    } catch {
      setPortalError('Konnte Abo-Verwaltung nicht öffnen. Bitte versuche es erneut.')
    } finally {
      setPortalLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteInput.toLowerCase() !== 'löschen') return
    setDeleting(true)
    setDeleteError(null)
    try {
      const { error } = await supabase.functions.invoke('delete-account')
      if (error) throw new Error(error.message)
    } catch {
      setDeleteError('Serverfehler. Lokale Daten werden trotzdem entfernt.')
    }
    localStorage.removeItem('lernapp_v1')
    await signOut()
    window.location.href = '/'
  }

  if (!authUser) return null

  return (
    <div className="flex flex-col min-h-dvh bg-background pb-10">
      <div className="px-4" style={{ paddingTop: 'max(58px, calc(env(safe-area-inset-top, 0px) + 18px))' }}>
        <button
          onClick={() => navigate('/profil')}
          className="flex items-center gap-1 text-text-primary text-[14px] font-medium mb-3 press-sm -ml-0.5"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Zurück
        </button>
        <h1 className="text-[28px] font-bold text-text-primary">Account</h1>
      </div>

      <div className="px-4 mt-5">
        <div className="bg-surface rounded-card shadow-card-adaptive border border-border/60 overflow-hidden">
          <div className="px-4 py-3.5 flex items-center justify-between border-b border-border/50">
            <span className="text-text-muted text-[13px]">E-Mail</span>
            <span className="text-text-primary text-[13px] font-medium truncate max-w-[200px]">{authUser.email}</span>
          </div>
          <div className="px-4 py-3.5 flex items-center justify-between border-b border-border/50">
            <span className="text-text-muted text-[13px]">Anmeldemethode</span>
            <span className="text-text-primary text-[13px] font-medium">
              {authUser.app_metadata?.provider === 'google' ? 'Google' : 'E-Mail'}
            </span>
          </div>
          {authUser.app_metadata?.provider !== 'google' && (
            <button
              onClick={() => navigate('/profil/2fa')}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-surface-hover transition-colors press-sm border-b border-border/50"
            >
              <span className="text-text-primary text-[15px]">Zwei-Faktor-Authentifizierung</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          {isPro && (
            <button
              onClick={() => void handleManageSubscription()}
              disabled={portalLoading}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-surface-hover transition-colors press-sm border-b border-border/50 disabled:opacity-50"
            >
              <span className="text-text-primary text-[15px]">{portalLoading ? 'Wird geöffnet…' : 'Abo verwalten'}</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          {isNative && (
            <button
              onClick={() => void handleRestorePurchases()}
              disabled={restoreLoading}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-surface-hover transition-colors press-sm border-b border-border/50 disabled:opacity-50"
            >
              <span className="text-text-primary text-[15px]">{restoreLoading ? 'Wird wiederhergestellt…' : 'Käufe wiederherstellen'}</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          <button
            onClick={() => void signOut()}
            className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-surface-hover transition-colors press-sm border-b border-border/50"
          >
            <span className="text-text-primary text-[15px]">Abmelden</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-primary">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => { setDeleteInput(''); setDeleteError(null); setDeleteOpen(true) }}
            className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-surface-hover transition-colors press-sm"
          >
            <span className="text-[15px]" style={{ color: 'rgb(var(--color-danger))', opacity: 0.75 }}>Account löschen</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'rgb(var(--color-danger))', opacity: 0.75 }}>
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        {portalError && (
          <p className="text-[13px] text-text-primary mt-2 px-1">{portalError}</p>
        )}
        {restoreMessage && (
          <p className={`text-[13px] mt-2 px-1 ${restoreMessage.isError ? 'text-text-primary' : 'text-text-secondary'}`}>{restoreMessage.text}</p>
        )}
      </div>

      {/* ── Account löschen Modal ──────────────────────────── */}
      {deleteOpen && (
        <>
          <div className="fixed inset-0 z-[50] bg-black/50" onClick={() => { if (!deleting) { setDeleteOpen(false) } }} />
          <div
            className="fixed inset-x-4 z-[51] bg-surface rounded-card shadow-float overflow-hidden"
            style={{ top: '12%' }}
          >
            <div className="px-5 pt-6 pb-5">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(var(--color-danger), 0.1)' }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-danger))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>

              <h2 className="text-[18px] font-bold text-text-primary text-center mb-2">Account unwiderruflich löschen?</h2>
              <p className="text-text-secondary text-[13px] text-center leading-relaxed mb-4">
                Alle Notizen, Karteikarten, Lernpläne, Statistiken und Zugangsdaten werden dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
              </p>

              {deleteError && (
                <div className="rounded-btn px-3 py-2.5 mb-4 border" style={{ background: 'rgba(var(--color-danger),0.08)', borderColor: 'rgba(var(--color-danger),0.2)' }}>
                  <p className="text-[12px] leading-snug" style={{ color: 'rgb(var(--color-danger))' }}>{deleteError}</p>
                </div>
              )}

              <p className="text-text-muted text-[12px] mb-2">
                Tippe <span className="font-bold text-text-primary">löschen</span> um fortzufahren:
              </p>
              <input
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder="löschen"
                autoFocus
                className="w-full bg-background border rounded-btn px-4 py-3 text-[14px] text-text-primary placeholder-text-muted focus:outline-none mb-4"
                style={{ borderColor: deleteInput.toLowerCase() === 'löschen' ? 'rgba(var(--color-danger),0.6)' : 'rgba(var(--color-border),0.8)' }}
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteOpen(false)}
                  disabled={deleting}
                  className="flex-1 py-3 rounded-icon bg-surface-hover text-text-secondary text-[14px] font-semibold press-sm disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteInput.toLowerCase() !== 'löschen' || deleting}
                  className="flex-1 py-3 rounded-icon text-white text-[14px] font-bold press-sm disabled:opacity-40 transition-all"
                  style={{
                    background: deleteInput.toLowerCase() === 'löschen'
                      ? 'rgb(var(--fill-red))'
                      : 'rgba(var(--color-danger),0.25)',
                    boxShadow: deleteInput.toLowerCase() === 'löschen' ? '0 4px 16px rgba(var(--color-danger),0.35)' : 'none',
                  }}
                >
                  {deleting ? 'Wird gelöscht…' : 'Endgültig löschen'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
