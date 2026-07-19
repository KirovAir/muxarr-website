// Theme toggle, mirrors the light/dark switch in the app.
(function () {
    var root = document.documentElement;
    var btn = document.getElementById('theme-toggle');
    var icon = btn.querySelector('i');
    var system = window.matchMedia('(prefers-color-scheme: light)');

    function paint() {
        var dark = root.getAttribute('data-bs-theme') === 'dark';
        icon.className = dark ? 'bi bi-sun' : 'bi bi-moon-stars';
    }

    btn.addEventListener('click', function () {
        var next = root.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-bs-theme', next);
        localStorage.setItem('theme', next);
        paint();
    });

    // Follow the OS until someone picks a theme by hand.
    system.addEventListener('change', function (e) {
        if (localStorage.getItem('theme')) {
            return;
        }

        root.setAttribute('data-bs-theme', e.matches ? 'light' : 'dark');
        paint();
    });

    paint();
})();

// Don't autoplay the demo for anyone who asked for less motion.
(function () {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    document.querySelectorAll('video[autoplay]').forEach(function (video) {
        video.removeAttribute('autoplay');
        video.setAttribute('controls', '');
        video.pause();
    });
})();

// Copy buttons on the install snippets.
document.querySelectorAll('.mux-copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
        var src = document.getElementById(btn.dataset.copy);

        navigator.clipboard.writeText(src.innerText.trim()).then(function () {
            btn.textContent = 'Copied';
            setTimeout(function () { btn.textContent = 'Copy'; }, 1500);
        });
    });
});
