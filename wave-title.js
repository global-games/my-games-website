<script>
document.addEventListener("DOMContentLoaded", () => {
  const h1 = document.querySelector('h1');
  if (!h1) return;
  const text = h1.textContent;
  h1.innerHTML = '';
  [...text].forEach((char, i) => {
    const span = document.createElement('span');
    span.textContent = char;
    span.style.setProperty('--char-index', i);
    h1.appendChild(span);
  });
});
</script>
