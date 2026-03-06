import React from 'react';
import { X, CreditCard, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import RazorpayButton from './RazorpayButton';

const CREDIT_PACKS = [
  { key: 'pack_5',  label: '5 Credits',  price: '₹299', credits: 5,  perCredit: '₹59.8/credit' },
  { key: 'pack_10', label: '10 Credits', price: '₹499', credits: 10, perCredit: '₹49.9/credit' },
  { key: 'pack_25', label: '25 Credits', price: '₹999', credits: 25, perCredit: '₹39.9/credit', popular: true },
];

const BuyCreditsModal = ({ isOpen, onClose, onSuccess }) => {
  const handleSuccess = (data) => {
    onSuccess?.(data);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold text-gray-900">Buy Credits</h2>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">
                Credits never expire. 1 interview = 2 credits, 1 resume analysis = 1 credit.
              </p>

              <div className="space-y-3">
                {CREDIT_PACKS.map((pack) => (
                  <div
                    key={pack.key}
                    className={`relative rounded-xl border-2 p-4 transition-colors ${
                      pack.popular ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {pack.popular && (
                      <span className="absolute -top-2.5 left-4 bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        Best Value
                      </span>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Zap className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{pack.label}</p>
                          <p className="text-xs text-gray-500">{pack.perCredit}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900 mb-1">{pack.price}</p>
                        <RazorpayButton
                          type="credits"
                          pack={pack.key}
                          label={pack.label}
                          onSuccess={handleSuccess}
                          className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        >
                          Buy
                        </RazorpayButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default BuyCreditsModal;
