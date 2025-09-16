// Members management page logic
(function(){
    PackPal.ui.requireAuth();
    const { db } = PackPal.firebase;
    const roles = PackPal.roles;

    // New card grid
    const grid = document.getElementById('members-grid');
    const tpl = document.getElementById('member-card-template');
    const btnRefresh = document.getElementById('btn-refresh-members');

    let currentRole = 'viewer';
    let editing = null; // { tripId, groupId, memberId }

    PackPalAuth.onAuthStateChanged((state)=>{ if (state) currentRole = state.role; });

    async function loadMembers(){
        grid.innerHTML = '';
        // trips -> groups -> members
        const snap = await db.ref('trips').get();
        const trips = snap.val() || {};
        Object.entries(trips).forEach(([tid, trip])=>{
            const groups = trip.groups || {};
            Object.entries(groups).forEach(([gid, g])=>{
                const members = g.members || {};
                Object.entries(members).forEach(([mid, m])=>{
                    const node = tpl.content.firstElementChild.cloneNode(true);
                    node.dataset.trip = tid; node.dataset.group = gid; node.dataset.member = mid;
                    node.querySelector('.member-name').textContent = m.name || '';
                    node.querySelector('.member-contact').textContent = m.contact || '';
                    node.querySelector('.member-where').textContent = `${trip.destination || ''} / ${g.name || ''}`;

                    const btnEdit = node.querySelector('.btn-edit-member');
                    const btnRemove = node.querySelector('.btn-remove-member');
                    btnEdit.addEventListener('click', onEditMember);
                    btnRemove.addEventListener('click', onRemoveMember);
                    btnEdit.dataset.trip = tid; btnEdit.dataset.group = gid; btnEdit.dataset.member = mid;
                    btnRemove.dataset.trip = tid; btnRemove.dataset.group = gid; btnRemove.dataset.member = mid;

                    if (!roles.canManageMembers(currentRole)){
                        btnEdit.setAttribute('disabled','true'); btnEdit.classList.add('disabled');
                        btnRemove.setAttribute('disabled','true'); btnRemove.classList.add('disabled');
                    }

                    grid.appendChild(node);
                });
            });
        });
    }

    async function onEditMember(e){
        if (!roles.canManageMembers(currentRole)) return alert('Not authorized');
        const btn = e.currentTarget;
        const tid = btn.dataset.trip; const gid = btn.dataset.group; const mid = btn.dataset.member;
        const snap = await db.ref(`trips/${tid}/groups/${gid}/members/${mid}`).get();
        const m = snap.val() || {};
        editing = { tid, gid, mid };
        document.getElementById('modal-member-name').value = m.name || '';
        document.getElementById('modal-member-contact').value = m.contact || '';
        document.getElementById('modal-member').classList.remove('hidden');
        document.getElementById('modal-member').removeAttribute('aria-hidden');
    }

    async function onRemoveMember(e){
        if (!roles.canManageMembers(currentRole)) return alert('Not authorized');
        const btn = e.currentTarget;
        const tid = btn.dataset.trip; const gid = btn.dataset.group; const mid = btn.dataset.member;
        if (!confirm('Remove this member and all related data? This cannot be undone.')) return;

        // Read member info (name) before deleting
        const memberSnap = await db.ref(`trips/${tid}/groups/${gid}/members/${mid}`).get();
        const member = memberSnap.val() || {};
        const memberName = member.name || '';

        // 1) Remove member node(s) that match this mid (primary) and any other identical entries across trips/groups
        const tripsSnap = await db.ref('trips').get();
        const trips = tripsSnap.val() || {};
        const removals = [];
        Object.entries(trips).forEach(([tId, t])=>{
            const groups = t.groups || {};
            Object.entries(groups).forEach(([gId, g])=>{
                const members = g.members || {};
                Object.entries(members).forEach(([mId, m])=>{
                    if (mId === mid || (m && m.name === memberName)){
                        removals.push(db.ref(`trips/${tId}/groups/${gId}/members/${mId}`).remove());
                    }
                });
            });
        });

        // 2) Remove items assigned to this member by uid or by assignedToName matching name
        const itemsSnap = await db.ref('items').get();
        const items = itemsSnap.val() || {};
        Object.entries(items).forEach(([itemId, item])=>{
            // check assignedTo (uid) OR assignedToName (string)
            if (item.assignedTo === mid || item.assignedToName === memberName){
                removals.push(db.ref(`items/${itemId}`).remove());
            }
        });

        // Execute all removals
        await Promise.all(removals);
        await PackPal.ui.logActivity(`removed member '${memberName}' and related data`);
        loadMembers();
    }

    // Modal hooks
    const modal = document.getElementById('modal-member');
    const btnCancel = document.getElementById('modal-member-cancel');
    const btnSave = document.getElementById('modal-member-save');
    btnCancel.addEventListener('click', ()=>{ modal.classList.add('hidden'); modal.setAttribute('aria-hidden','true'); editing = null; });
    btnSave.addEventListener('click', async ()=>{
        if (!editing) return;
        const name = document.getElementById('modal-member-name').value.trim();
        const contact = document.getElementById('modal-member-contact').value.trim();
        if (!name) return alert('Name is required');
        await db.ref(`trips/${editing.tid}/groups/${editing.gid}/members/${editing.mid}`).update({ name, contact });
        await PackPal.ui.logActivity(`edited member '${name}'`);
        modal.classList.add('hidden'); modal.setAttribute('aria-hidden','true'); editing = null;
        loadMembers();
    });

    btnRefresh && btnRefresh.addEventListener('click', loadMembers);

    // Initial load and live updates
    db.ref('trips').on('value', loadMembers);
    // Expose for debug
    PackPal.membersPage = { loadMembers };
})();
