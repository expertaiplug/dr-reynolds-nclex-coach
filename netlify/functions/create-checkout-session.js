
<script src="https://js.stripe.com/v3/"></script>
<script>
  const STRIPE_PUBLISHABLE_KEY = 'pk_live_YOUR_ACTUAL_KEY';
  const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
  window.BACKEND_URL = 'https://YOUR_SITE_NAME.netlify.app/.netlify/functions';

  document.addEventListener('click', async (event) => {
    const btn = event.target.closest('[data-upgrade="premium"]');
    if (!btn) return;

    btn.disabled = true;
    const originalLabel = btn.textContent;
    btn.textContent = '⏳ Processing…';

    try {
      const response = await fetch(`${window.BACKEND_URL}/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: 'price_YOUR_ACTUAL_PRICE_ID',
          successUrl: window.location.origin + '?success=true',
          cancelUrl: window.location.origin + '?canceled=true',
          trialPeriodDays: 7
        })
      });
      
      const { id } = await response.json();
      if (!id) throw new Error('No session ID returned');

      const result = await stripe.redirectToCheckout({ sessionId: id });
      if (result.error) throw result.error;
    } catch (err) {
      alert('Payment error: ' + err.message);
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
  });
</script>
<script>(function(){function c(){var b=a.contentDocument||a.contentWindow.document;if(b){var d=b.createElement('script');d.innerHTML="window.__CF$cv$params={r:'9779ab7b6455d7cc',t:'MTc1NjYxMzMzOS4wMDAwMDA='};var a=document.createElement('script');a.nonce='';a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';document.getElementsByTagName('head')[0].appendChild(a);";b.getElementsByTagName('head')[0].appendChild(d)}}if(document.body){var a=document.createElement('iframe');a.height=1;a.width=1;a.style.position='absolute';a.style.top=0;a.style.left=0;a.style.border='none';a.style.visibility='hidden';document.body.appendChild(a);if('loading'!==document.readyState)c();else if(window.addEventListener)document.addEventListener('DOMContentLoaded',c);else{var e=document.onreadystatechange||function(){};document.onreadystatechange=function(b){e(b);'loading'!==document.readyState&&(document.onreadystatechange=e,c())}}}})();</script>
