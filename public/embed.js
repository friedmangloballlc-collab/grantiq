(function() {
  var iframe = document.createElement('iframe');
  iframe.src = 'https://grantiq-gold.vercel.app/embed/finder?partner=' +
    (document.currentScript.getAttribute('data-partner') || 'direct');
  iframe.style.width = '100%';
  iframe.style.maxWidth = '500px';
  iframe.style.height = '400px';
  iframe.style.border = 'none';
  iframe.style.borderRadius = '12px';
  iframe.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
  document.currentScript.parentNode.insertBefore(iframe, document.currentScript);
})();
