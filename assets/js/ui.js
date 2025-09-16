// Common UI helpers and role-based visibility
(function(){
    const { db } = PackPal.firebase;

    function setRoleBadge(role){
        const badge = document.getElementById('role-badge');
        if (badge) badge.textContent = role;
    }

    function applyRoleVisibility(role){
        const map = PackPal.roles;
        document.querySelectorAll('[data-requires-role]').forEach(el => {
            const requirement = el.getAttribute('data-requires-role');
            let allowed = false;
            if (requirement === 'viewer') allowed = true;
            if (requirement === 'member') allowed = map.canCreateItems(role);
            if (requirement === 'admin') allowed = map.canManageMembers(role);
            if (!allowed){
                // If the element is a navigation link, remove it so unauthorized users don't see it
                if (el.tagName.toLowerCase() === 'a'){
                    el.parentNode && el.parentNode.removeChild(el);
                } else {
                    el.setAttribute('disabled','true');
                    el.classList.add('disabled');
                }
            }
        });
    }

    function requireAuth(){
        PackPalAuth.onAuthStateChanged((authState) => {
            if (!authState){
                window.location.replace('login.html');
                return;
            }
            const { user, role } = authState;
            setRoleBadge(role);
            applyRoleVisibility(role);
            bindLogout();
        });
    }

    function bindLogout(){
        const btn = document.getElementById('btn-logout');
        if (btn){
            btn.addEventListener('click', async ()=>{
                await PackPalAuth.signOut();
                window.location.replace('login.html');
            });
        }
    }

    // Activity logging
    async function logActivity(message){
        const user = PackPal.firebase.auth.currentUser;
        await db.ref('activity').push({
            message,
            uid: user ? user.uid : null,
            ts: Date.now()
        });
    }

    // Sidebar toggle and mobile menu handler
    function initSidebar(){
        const sidebar = document.querySelector('.sidebar');
        const menuToggle = document.querySelector('.menu-toggle');

        if (sidebar && menuToggle) {
            // Handle mobile menu toggle
            menuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                menuToggle.classList.toggle('active');
                sidebar.classList.toggle('active');
            });

            // Close mobile menu when clicking outside
            document.addEventListener('click', (e) => {
                if (window.innerWidth <= 900) {
                    if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                        sidebar.classList.remove('active');
                        menuToggle.classList.remove('active');
                    }
                }
            });

            // Prevent clicks inside sidebar from closing it
            sidebar.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            // Handle window resize
            window.addEventListener('resize', () => {
                if (window.innerWidth > 900) {
                    sidebar.classList.remove('active');
                    menuToggle.classList.remove('active');
                }
            });

            // Close mobile menu when clicking a link
            sidebar.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    if (window.innerWidth <= 900) {
                        sidebar.classList.remove('active');
                        menuToggle.classList.remove('active');
                    }
                });
            });
        }
    }

    // Theme toggle logic
    function initThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        const themeIcon = document.getElementById('theme-icon');
        const iconMoon = document.getElementById('icon-moon');
        const iconSun = document.getElementById('icon-sun');
        if (!themeToggle || !themeIcon || !iconMoon || !iconSun) return;
        // Load saved theme
        const savedTheme = localStorage.getItem('packpal-theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark');
            iconMoon.style.display = 'none';
            iconSun.style.display = '';
        } else {
            iconMoon.style.display = '';
            iconSun.style.display = 'none';
        }
        themeToggle.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark');
            if (isDark) {
                iconMoon.style.display = 'none';
                iconSun.style.display = '';
            } else {
                iconMoon.style.display = '';
                iconSun.style.display = 'none';
            }
            localStorage.setItem('packpal-theme', isDark ? 'dark' : 'light');
        });
    }

    PackPal.ui = { requireAuth, logActivity, initSidebar, initThemeToggle };
    // Auto-init theme toggle on page load
    document.addEventListener('DOMContentLoaded', function() {
      if (typeof PackPal !== 'undefined' && PackPal.ui && PackPal.ui.initThemeToggle) {
        PackPal.ui.initThemeToggle();
      } else {
        // Fallback for login/index pages
        const themeToggle = document.getElementById('theme-toggle');
        const themeIcon = document.getElementById('theme-icon');
        const iconMoon = document.getElementById('icon-moon');
        const iconSun = document.getElementById('icon-sun');
        if (!themeToggle || !themeIcon || !iconMoon || !iconSun) return;
        const savedTheme = localStorage.getItem('packpal-theme');
        if (savedTheme === 'dark') {
          document.body.classList.add('dark');
          iconMoon.style.display = 'none';
          iconSun.style.display = '';
        } else {
          iconMoon.style.display = '';
          iconSun.style.display = 'none';
        }
        themeToggle.addEventListener('click', () => {
          const isDark = document.body.classList.toggle('dark');
          if (isDark) {
            iconMoon.style.display = 'none';
            iconSun.style.display = '';
          } else {
            iconMoon.style.display = '';
            iconSun.style.display = 'none';
          }
          localStorage.setItem('packpal-theme', isDark ? 'dark' : 'light');
        });
      }
    });
})();


