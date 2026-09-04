
(() => {
  const input = document.getElementById('navSearch');
  const links = [...document.querySelectorAll('.nav-link')];
  const groups = [...document.querySelectorAll('.nav-group')];
  const menuButton = document.getElementById('menuButton');
  const scrim = document.getElementById('scrim');

  if (input) {
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      links.forEach(link => {
        const match = !q || link.textContent.toLowerCase().includes(q) || (link.dataset.search || '').includes(q);
        link.style.display = match ? '' : 'none';
      });
      groups.forEach(group => {
        const visible = [...group.querySelectorAll('.nav-link')].some(link => link.style.display !== 'none');
        group.style.display = visible ? '' : 'none';
      });
    });
  }

  const closeNav = () => document.body.classList.remove('nav-open');
  if (menuButton) menuButton.addEventListener('click', () => document.body.classList.toggle('nav-open'));
  if (scrim) scrim.addEventListener('click', closeNav);
  document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', closeNav));
})();
