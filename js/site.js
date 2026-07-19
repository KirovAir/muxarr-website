// Theme toggle, mirrors the light/dark switch in the app.
(function () {
    var root = document.documentElement;
    var btn = document.getElementById('theme-toggle');
    var icon = btn.querySelector('i');

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

    paint();
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
