import React, { useState } from 'react';
import api from '../../../service/api';

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (document.getElementById('razorpay-script')) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const RazorpayButton = ({ type, plan, pack, label, amount, onSuccess, onError, className = '', children }) => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Razorpay SDK failed to load');

      const { data: accountData } = await api.get('billing/account/');
      const razorpayKeyId = accountData.razorpay_key_id;

      const payload = { type };
      if (type === 'plan') {
        payload.plan = plan;
        // Derive billing_cycle from plan key suffix
        if (plan && plan.endsWith('_yearly')) payload.billing_cycle = 'yearly';
        else if (plan && plan.endsWith('_monthly')) payload.billing_cycle = 'monthly';
      }
      if (type === 'credits') payload.pack = pack;

      const { data: order } = await api.post('billing/create-order/', payload);

      const options = {
        key: razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Interviewsta.AI',
        description: label,
        order_id: order.order_id,
        handler: async (response) => {
          try {
            const { data: verifyData } = await api.post('billing/verify-payment/', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            onSuccess?.(verifyData);
          } catch (err) {
            onError?.(err);
          }
        },
        prefill: {},
        theme: { color: '#3b82f6' },
        modal: { ondismiss: () => setLoading(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        onError?.(response.error);
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className={`${className} disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Processing…
        </span>
      ) : children || label}
    </button>
  );
};

export default RazorpayButton;
