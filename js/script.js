// Only hide sections for the fade-in once this script is actually running,
// so the page is never left blank if the script fails to load.
document.documentElement.classList.add("js");

// Fade-in sections as they scroll into view
const revealItems = document.querySelectorAll(".reveal");

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            const el = entry.target;
            el.classList.add("visible");
            revealObserver.unobserve(el);
            // once the animation is done, hand control back to normal hover styles
            setTimeout(() => {
                el.classList.remove("reveal", "visible");
                el.style.transitionDelay = "";
            }, 1400);
        }
    });
}, { threshold: 0.15 });

revealItems.forEach((item) => {
    // stagger items that sit side by side
    const index = Array.from(item.parentElement.children).indexOf(item);
    item.style.transitionDelay = (index % 4) * 0.12 + "s";
    revealObserver.observe(item);
});

// Count-up numbers in the stats strip
const counters = document.querySelectorAll("[data-count]");

const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const el = entry.target;
        const target = Number(el.dataset.count);
        const suffix = el.dataset.suffix || "";
        const duration = 1500;
        const start = performance.now();

        function tick(now) {
            const progress = Math.min((now - start) / duration, 1);
            el.textContent = Math.floor(progress * target) + suffix;
            if (progress < 1) requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);
        counterObserver.unobserve(el);
    });
}, { threshold: 0.6 });

counters.forEach((c) => counterObserver.observe(c));

// Smooth scroll for the Explore City button
document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
        const target = document.querySelector(link.getAttribute("href"));
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: "smooth" });
        }
    });
});

// Loading screen: show for at least 1.4s, then fade out and start the page animations
const loader = document.getElementById("loader");
const minLoadTime = 1400;

function finishLoading() {
    const wait = Math.max(0, minLoadTime - performance.now());
    setTimeout(() => {
        if (loader) loader.classList.add("hide");
        document.documentElement.classList.add("loaded");
    }, wait);
}

if (document.readyState === "complete") {
    finishLoading();
} else {
    window.addEventListener("load", finishLoading);
}   