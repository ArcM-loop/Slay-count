import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { validateTaxData, mapToEbupotFormat, generateEbupotCSV } from '@/utils/taxExportHelper';
import { downloadCSV } from '@/logic/tax/exportFormatter';
import HudTypewriter from '@/components/hud/HudTypewriter';

export default function EbupotExportButton({ data = [], filename, disabled = false }) {
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [glitching, setGlitching] = useState(false);

  const handleExport = () => {
    const validation = validateTaxData(data);

    if (!validation.isValid) {
      setGlitching(true);
      setTimeout(() => setGlitching(false), 600);
      setTimeout(() => {
        setValidationErrors(validation.errors);
        setShowErrorModal(true);
      }, 300);
      return;
    }

    const mapped = mapToEbupotFormat(data);
    const csv = generateEbupotCSV(mapped);
    downloadCSV(csv, filename || `eBupot_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <>
      <motion.div
        animate={glitching ? {
          x: [0, -4, 4, -2, 2, 0],
          filter: ['none', 'hue-rotate(180deg) brightness(2)', 'none', 'hue-rotate(90deg)', 'none'],
        } : {}}
        transition={{ duration: 0.4 }}
      >
        <Button
          onClick={handleExport}
          disabled={disabled || data.length === 0}
          size="sm"
          className="bg-gradient-to-r from-primary to-neon-purple text-primary-foreground gap-2 glow-blue"
        >
          <Download className="w-4 h-4" />
          CSV e-Bupot ✅
        </Button>
      </motion.div>

      {/* Modal Peringatan Neon Red */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div
            className="w-full max-w-lg mx-4 p-6 rounded-2xl"
            style={{
              background: 'rgba(15, 10, 10, 0.95)',
              border: '1.5px solid rgba(239, 68, 68, 0.5)',
              boxShadow: '0 0 30px rgba(239, 68, 68, 0.4), inset 0 0 60px rgba(239,68,68,0.03)',
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2 flex-col items-start">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                  <h3 className="text-lg font-bold text-destructive tracking-wide">⚠️ Pre-Flight Validation Failed</h3>
                </div>
                <HudTypewriter
                  text="[COMPLIANCE_CHECK_FAILED]: REPAIR_DATA_BEFORE_EXPORT"
                  delay={0.1}
                  speed={30}
                  color="#ef4444"
                />
              </div>
              <button
                onClick={() => setShowErrorModal(false)}
                className="p-1 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              File CSV tidak dapat di-generate. Perbaiki data berikut sebelum upload ke DJP Online:
            </p>

            {/* Error List */}
            <div
              className="max-h-60 overflow-y-auto space-y-2 mb-5 p-3 rounded-xl"
              style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              {validationErrors.map((err, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-2 text-sm"
                >
                  <span className="text-destructive mt-0.5 flex-shrink-0 font-mono text-xs">[ERR_{String(i+1).padStart(2,'0')}]</span>
                  <span className="text-red-300">{err}</span>
                </motion.div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => setShowErrorModal(false)}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-1" /> Tutup & Perbaiki Data
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}