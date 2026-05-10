import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, HelpCircle, CheckCircle, X } from 'lucide-react';

// ─── Hook ────────────────────────────────────────────────────────────────────
export const useDialog = () => {
  const [state, setState] = useState({ open: false });
  const resolveRef = useRef(null);

  const showAlert = useCallback((message, options = {}) => {
    return new Promise(resolve => {
      resolveRef.current = resolve;
      setState({ open: true, kind: 'alert', title: options.title || 'Notice', message, ...options });
    });
  }, []);

  const showConfirm = useCallback((message, options = {}) => {
    return new Promise(resolve => {
      resolveRef.current = resolve;
      setState({ open: true, kind: 'confirm', title: options.title || 'Confirm', message, ...options });
    });
  }, []);

  const close = (result) => {
    resolveRef.current?.(result);
    setState(prev => ({ ...prev, open: false }));
  };

  return { showAlert, showConfirm, dialogState: state, closeDialog: close };
};

// ─── Component ────────────────────────────────────────────────────────────────
const AppDialog = ({ dialogState, closeDialog }) => {
  const { open, kind, title, message, content, danger, confirmLabel, cancelLabel } = dialogState;

  const IconComp = kind === 'confirm'
    ? (danger ? AlertCircle : HelpCircle)
    : CheckCircle;

  const iconColor = danger ? 'text-red-400' : kind === 'confirm' ? 'text-amber-400' : 'text-green-400';
  const iconBg    = danger ? 'bg-red-500/10 border-red-500/20' : kind === 'confirm' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-green-500/10 border-green-500/20';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9998] flex items-center justify-center p-4"
          onClick={() => kind === 'alert' && closeDialog(true)}
        >
          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] max-w-sm w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            {/* Icon + Title */}
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${iconBg}`}>
                <IconComp size={20} className={iconColor} strokeWidth={1.5} />
              </div>
              <div className="flex-1 pt-0.5">
                <h3 className="font-serif font-black text-gray-100 text-lg leading-tight">{title}</h3>
                <p className="text-gray-400 text-sm mt-1 leading-relaxed">{message}</p>
              </div>
              {kind === 'alert' && (
                <button onClick={() => closeDialog(true)} className="text-gray-600 hover:text-gray-300 bg-white/5 rounded-full p-1 transition-colors mt-0.5 shrink-0">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Extra content slot (e.g. payment selector) */}
            {content && <div className="mb-5">{content}</div>}

            {/* Actions */}
            <div className={`flex gap-2 ${kind === 'alert' ? 'justify-center' : 'justify-end'}`}>
              {kind === 'confirm' && (
                <button
                  onClick={() => closeDialog(false)}
                  className="px-5 py-2.5 bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/10 rounded-xl font-medium text-sm transition-all"
                >
                  {cancelLabel || 'Cancel'}
                </button>
              )}
              <button
                onClick={() => closeDialog(true)}
                className={`px-6 py-2.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all ${
                  danger
                    ? 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30'
                    : 'bg-gradient-to-r from-amber-600 to-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.35)]'
                }`}
              >
                {confirmLabel || (kind === 'alert' ? 'OK' : 'Confirm')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AppDialog;
