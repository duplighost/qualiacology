(() => {
  'use strict';

  const ready = (fn) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  };

  ready(() => {
    document.documentElement.dataset.designVersion = '300';

    document.querySelectorAll('i[class*="fa-"]').forEach((icon) => {
      icon.setAttribute('aria-hidden', 'true');
    });

    const heroMeta = document.querySelector('.hero-meta');
    if (heroMeta && !document.querySelector('.v300-proof')) {
      const proof = document.createElement('div');
      proof.className = 'v300-proof';
      proof.setAttribute('aria-label', 'Site highlights');
      proof.innerHTML = [
        '<span><strong>14</strong>browser worlds</span>',
        '<span><strong>9</strong>records</span>',
        '<span><strong>3K+</strong>in community</span>'
      ].join('');
      heroMeta.insertAdjacentElement('afterend', proof);
    }

    const grid = document.querySelector('.games-grid-clean');
    if (grid && !document.querySelector('.v300-collection-tools')) {
      grid.setAttribute('aria-label', 'Browser games and interactive worlds');
      const cards = Array.from(grid.querySelectorAll('.game-card-clean'));
      const categoryFor = (card) => {
        const text = (card.querySelector('.game-type-clean')?.textContent || '').toLowerCase();
        const categories = [];
        if (/horror|haunted/.test(text)) categories.push('horror');
        if (/platformer|arcade|flying|tennis|fps/.test(text)) categories.push('motion');
        if (/open-world|roguelite|descent|survival/.test(text)) categories.push('worlds');
        if (/toy|sandbox|n-body|interactive/.test(text)) categories.push('toys');
        return categories.length ? categories : ['worlds'];
      };

      cards.forEach((card) => {
        card.dataset.categories = categoryFor(card).join(' ');
      });

      const tools = document.createElement('div');
      tools.className = 'v300-collection-tools';
      tools.setAttribute('role', 'group');
      tools.setAttribute('aria-label', 'Filter the game cabinet');
      tools.innerHTML = [
        `<span class="v300-collection-count" aria-live="polite">${cards.length} worlds online</span>`,
        '<button class="v300-filter" type="button" data-game-filter="all" aria-pressed="true">All</button>',
        '<button class="v300-filter" type="button" data-game-filter="horror" aria-pressed="false">Horror</button>',
        '<button class="v300-filter" type="button" data-game-filter="motion" aria-pressed="false">Motion</button>',
        '<button class="v300-filter" type="button" data-game-filter="worlds" aria-pressed="false">Worlds</button>',
        '<button class="v300-filter" type="button" data-game-filter="toys" aria-pressed="false">Toys</button>'
      ].join('');
      grid.insertAdjacentElement('beforebegin', tools);

      const swipeHint = document.createElement('div');
      swipeHint.className = 'v300-swipe-hint';
      swipeHint.setAttribute('aria-hidden', 'true');
      swipeHint.textContent = 'Swipe the cabinet';
      grid.insertAdjacentElement('beforebegin', swipeHint);

      const count = tools.querySelector('.v300-collection-count');
      tools.addEventListener('click', (event) => {
        const button = event.target.closest('[data-game-filter]');
        if (!button) return;
        const filter = button.dataset.gameFilter;

        tools.querySelectorAll('[data-game-filter]').forEach((candidate) => {
          candidate.setAttribute('aria-pressed', String(candidate === button));
        });

        let visible = 0;
        cards.forEach((card) => {
          const matches = filter === 'all' || card.dataset.categories.split(' ').includes(filter);
          card.hidden = !matches;
          if (matches) visible += 1;
        });

        if (count) count.textContent = `${visible} ${visible === 1 ? 'world' : 'worlds'} online`;
        grid.scrollTo({ left: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      });
    }

    const albumGrid = document.querySelector('.album-grid');
    if (albumGrid) {
      albumGrid.setAttribute('aria-label', 'Doopliss albums');
      const hint = document.createElement('div');
      hint.className = 'v300-swipe-hint';
      hint.setAttribute('aria-hidden', 'true');
      hint.textContent = 'Swipe the discography';
      albumGrid.insertAdjacentElement('beforebegin', hint);
    }

    const canPoint = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (canPoint && !reduceMotion) {
      document.querySelectorAll('.game-card-clean, .album-card').forEach((card) => {
        card.addEventListener('pointermove', (event) => {
          const rect = card.getBoundingClientRect();
          card.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
          card.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
        }, { passive: true });
      });
    }
  });
})();
