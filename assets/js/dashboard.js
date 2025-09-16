// Dashboard logic: stats, progress, activity feed
(function(){
    PackPal.ui.requireAuth();
    const { db } = PackPal.firebase;

    const elTotal = document.getElementById('stat-total-items');
    const elPacked = document.getElementById('stat-packed-items');
    const elTotalProgress = document.getElementById('stat-total-items-progress');
    const elPackedProgress = document.getElementById('stat-packed-items-progress');
    const elMembers = document.getElementById('stat-total-members');
    const circle = document.getElementById('progress-indicator');
    const pctText = document.getElementById('progress-percent');
    const feed = document.getElementById('activity-feed');

    // Items stats
    db.ref('items').on('value', (snap)=>{
        const items = snap.val() || {};
        const list = Object.values(items);
        const total = list.length;
        const packed = list.filter(i => i.status === 'packed').length;
        if (elTotal) elTotal.textContent = total;
        if (elPacked) elPacked.textContent = packed;
        if (elTotalProgress) elTotalProgress.textContent = total;
        if (elPackedProgress) elPackedProgress.textContent = packed;
        const pct = total ? Math.round((packed/total)*100) : 0;
        animateCircularProgress(pct);
    });

    // Members count across trips
    db.ref('trips').on('value',(snap)=>{
        const trips = snap.val() || {};
        let memberCount = 0;
        Object.values(trips).forEach(t => {
            const groups = t.groups || {};
            Object.values(groups).forEach(g => {
                memberCount += Object.keys(g.members || {}).length;
            });
        });
        elMembers.textContent = memberCount;
    });

    // Activity feed (latest 9)
    db.ref('activity').limitToLast(9).on('value', (snap)=>{
        const val = snap.val() || {};
        const arr = Object.values(val).sort((a,b)=>b.ts-a.ts);
        feed.innerHTML = '';
        arr.forEach(entry => {
            const li = document.createElement('li');
            const d = new Date(entry.ts);
            li.textContent = `${d.toLocaleString()}: ${entry.message}`;
            feed.appendChild(li);
        });
    });

    function animateCircularProgress(pct){
        if (!circle || !pctText) return;
        const r = 90; // radius used in SVG
        const circumference = 2 * Math.PI * r;
        const offset = circumference * (1 - (pct/100));
        circle.setAttribute('stroke-dasharray', String(circumference.toFixed(2)));
        circle.style.strokeDashoffset = String(offset.toFixed(2));
        pctText.textContent = `${pct}%`;
    }
})();


