import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser } from '../../context/UserContext'

export function AttachmentToast() {
  const { localAttachmentToastVisible, hideLocalAttachmentToast } = useUser()

  useEffect(() => {
    if (!localAttachmentToastVisible) return
    const t = setTimeout(hideLocalAttachmentToast, 2600)
    return () => clearTimeout(t)
  }, [localAttachmentToastVisible, hideLocalAttachmentToast])

  return (
    <AnimatePresence>
      {localAttachmentToastVisible && (
        <motion.div
          key="attachment-toast"
          initial={{ y: 18, opacity: 0, scale: 0.88 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -14, opacity: 0, scale: 0.88, transition: { duration: 0.16, ease: [0.23, 1, 0.32, 1] } }}
          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
          className="fixed z-[200] pointer-events-none select-none
                     left-1/2 -translate-x-1/2
                     bottom-[calc(env(safe-area-inset-bottom,0px)+84px)]
                     lg:bottom-8 lg:left-auto lg:right-8 lg:translate-x-0
                     flex items-center gap-3
                     pl-3 pr-5 py-2.5 rounded-2xl
                     text-white
                     shadow-[0_8px_36px_rgba(0,0,0,0.30)]"
          style={{ background: 'rgba(20,20,22,0.92)', backdropFilter: 'blur(14px)' }}
        >
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
          <div>
            <p className="text-[12.5px] font-semibold leading-snug">Foto nur auf diesem Gerät</p>
            <p className="text-[11px] opacity-70 leading-snug">In der Notiz übertragbar</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
