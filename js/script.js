// Only hide sections for the fade-in once this script is actually running,
// so the page is never left blank if the script fails to load.
document.documentElement.classList.add("js");                       // document.documentlement is the html tag and other adds the class to the html tag

// Fade-in sections as they scroll into view
const revealItems = document.querySelectorAll(".reveal");

const revealObserver = new IntersectionObserver((entries) => {      // makes a constructor 
    entries.forEach((entry) => {                                    // selects every class one by one
        if (entry.isIntersecting) {                                 // if the portion/element is visible to us
            const el = entry.target;                                // sees which element is visible to us
            el.classList.add("visible");                            // adding visible makes the element opacity from 0 to 1
            revealObserver.unobserve(el);                           // unobserve stops watching it, so animation only happens once.
            // once the animation is done, hand control back to normal hover styles
            setTimeout(() => {
                el.classList.remove("reveal", "visible");           // remove the classes after 1.4s
                el.style.transitionDelay = "";                      // removes the inline delay
            }, 1400);
        }
    });
}, { threshold: 0.15 });                // when 15 percent of the target is visible then it triggers the observer

revealItems.forEach((item) => {
    // stagger items that sit side by side
    const index = Array.from(item.parentElement.children).indexOf(item);        // Array.from converts them in an array.
    item.style.transitionDelay = (index % 4) * 0.12 + "s";                      // transition delay. The horizontal elements appear one after another due to this delay.
    revealObserver.observe(item);                                               // This tells that tell when the element has entered the viewport
});

// Count-up numbers in the stats strip
const counters = document.querySelectorAll("[data-count]");                     // Find the elements with data-count attribute

const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const el = entry.target;
        const target = Number(el.dataset.count);                                // e1 reads the data-count but it comes as text so we convert it to number
        const suffix = el.dataset.suffix || "";                                 // reads suffix or (||) an empty string  
        const duration = 1500;
        const start = performance.now();                                        // current time in milliseconds, saved as the starting moment.

        function tick(now) {
            const progress = Math.min((now - start) / duration, 1);             // is the fraction of time passed
            el.textContent = Math.floor(progress * target) + suffix;
            if (progress < 1) requestAnimationFrame(tick);                      // Inside tick, requestAnimationFrame(tick) asks again: “run me once more on the next frame.”. This runs about 60 times a second.
        }   

        requestAnimationFrame(tick);
        counterObserver.unobserve(el);                          // Stop watching this counter. It has started counting, so it shouldn’t start again. Without this line, scrolling away and back would restart the count from 0.
    });
}, { threshold: 0.6 });

counters.forEach((c) => counterObserver.observe(c));

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