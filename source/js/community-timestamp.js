(function () {
  function mount() {
    if (!document.body || document.body.classList.contains('classic-marathon-page')) return;
    if (document.querySelector('.community-timestamp')) return;
    var stamp = document.createElement('div');
    stamp.className = 'community-timestamp';
    stamp.setAttribute('aria-label', '远程连接时间');
    stamp.innerHTML = 'REMOTE <span>--</span>';
    document.body.appendChild(stamp);
    var target = stamp.querySelector('span');
    var pad = function (value) { return String(value).padStart(2, '0'); };
    var update = function () {
      var now = new Date();
      target.textContent = pad(now.getHours()) + pad(now.getMinutes()) + ' ' + pad(now.getMonth() + 1) + '.' + pad(now.getDate()) + '.' + now.getFullYear();
    };
    update();
    window.setInterval(update, 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
}());
