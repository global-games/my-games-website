document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('.logo-anim, h1').forEach(el => {
    if (!el) return;
    const text = el.textContent;
    el.innerHTML = '';
    [...text].forEach((char, i) => {
      const span = document.createElement('span');
      span.textContent = char;
      span.style.setProperty('--char-index', i);
      el.appendChild(span);
    });
  });
});
