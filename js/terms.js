(function () {
    'use strict';
 
    const tocLinks = [...document.querySelectorAll('.terms-toc a')];
    const sections = tocLinks
        .map(a => document.querySelector(a.getAttribute('href')))
        .filter(Boolean);
    const bar = document.querySelector('.terms-progress');
    const topBtn = document.querySelector('.terms-top');
    const nav = document.querySelector('.navbar');
 
    if (!sections.length) return;
 
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
 
    // Distance from the top of the viewport to the first heading that counts
    // as "read". Matches the scroll-margin-top in the stylesheet.
    function anchorOffset() {
        return (nav ? nav.getBoundingClientRect().height : 0) + 24;
    }
 
    let ticking = false;
 
    function paint() {
        ticking = false;
 
        // --- Reading progress + back-to-top ---
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        const progress = max > 0 ? (window.scrollY / max) * 100 : 0;
 
        if (bar) bar.style.width = Math.min(100, Math.max(0, progress)) + '%';
        if (topBtn) topBtn.classList.toggle('show', window.scrollY > 600);
 
        // --- Scrollspy ---
        // Pick the last section whose top has passed under the navbar. Earlier
        // IntersectionObserver code cleared the highlight for sections that were
        // still on screen, so on tall sections the marker vanished mid-read.
        const offset = anchorOffset();
        let current = sections[0];
 
        for (const section of sections) {
            if (section.getBoundingClientRect().top - offset <= 1) current = section;
            else break;
        }
 
        // At the very bottom of the page the last section may never cross the
        // line, so force it once the user has hit the end.
        if (max > 0 && window.scrollY >= max - 2) current = sections[sections.length - 1];
 
        tocLinks.forEach(link => {
            const active = link.getAttribute('href') === '#' + current.id;
            link.classList.toggle('active', active);
            if (active) link.setAttribute('aria-current', 'true');
            else link.removeAttribute('aria-current');
        });
    }
 
    function onScroll() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(paint);
    }
 
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
 
    if (topBtn) {
        topBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
        });
    }
 
    // Honour reduced-motion for the in-page contents links too, and keep the
    // address bar in sync when the browser doesn't handle the fragment itself.
    tocLinks.forEach(link => {
        link.addEventListener('click', event => {
            const target = document.getElementById(link.hash.slice(1));
            if (!target) return;
            event.preventDefault();
            target.scrollIntoView({
                behavior: reducedMotion.matches ? 'auto' : 'smooth',
                block: 'start'
            });
            history.pushState(null, '', link.hash);
            // Move focus so keyboard and screen-reader users land in the section.
            target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });
        });
    });
 
    paint();
})();