// Trips: create trips, groups, and members; role-gated actions
(function(){
    PackPal.ui.requireAuth();
    const { db } = PackPal.firebase;
    const roles = PackPal.roles;

    const btnTrip = document.getElementById('btn-add-trip');
    const btnGroup = document.getElementById('btn-add-group');
    const btnMember = document.getElementById('btn-add-member');
    const selectTrip = document.getElementById('select-trip');
    const groupsList = document.getElementById('groups-list');
    const membersList = document.getElementById('members-list');

    let currentRole = 'viewer';
    let currentTripId = null;
    PackPalAuth.onAuthStateChanged((state)=>{ if (state){ currentRole = state.role; }});

    // Load trips
    db.ref('trips').on('value',(snap)=>{
        const trips = snap.val() || {};
        buildTripSelect(trips);
        if (!currentTripId){
            currentTripId = Object.keys(trips)[0] || null;
            updateTripView(trips, currentTripId);
        } else {
            updateTripView(trips, currentTripId);
        }
    });

    function buildTripSelect(trips){
        selectTrip.innerHTML = '';
        Object.entries(trips).forEach(([id, trip])=>{
            const o = document.createElement('option');
            o.value = id; o.textContent = trip.destination || 'Trip';
            if (id === currentTripId) o.selected = true;
            selectTrip.appendChild(o);
        });
    }

    selectTrip.addEventListener('change', ()=>{
        currentTripId = selectTrip.value || null;
        db.ref('trips').get().then(s => updateTripView(s.val() || {}, currentTripId));
    });

    function updateTripView(trips, id){
        groupsList.innerHTML = '';
        membersList.innerHTML = '';
        if (!id || !trips[id]) return;
        const trip = trips[id];
        const groups = trip.groups || {};
        Object.entries(groups).forEach(([gid, g])=>{
            const li = document.createElement('li');
            li.textContent = g.name || 'Group';
            groupsList.appendChild(li);
            // Members in group
            Object.entries(g.members || {}).forEach(([mid, m])=>{
                const liM = document.createElement('li');
                liM.textContent = `${m.name} • ${m.contact || ''}`;
                membersList.appendChild(liM);
            });
        });
    }

    // Modal helpers
    function showModal(id) {
        document.getElementById(id).classList.remove('hidden');
    }
    function hideModal(id) {
        document.getElementById(id).classList.add('hidden');
    }

    // Add Trip
    btnTrip.addEventListener('click', ()=>{
        if (!roles.canCreateItems(currentRole)) return;
        document.getElementById('modal-trip-destination').value = '';
        showModal('modal-trip');
    });
    document.getElementById('modal-trip-cancel').addEventListener('click', ()=>{
        hideModal('modal-trip');
    });
    document.getElementById('modal-trip-save').addEventListener('click', async ()=>{
        const destination = document.getElementById('modal-trip-destination').value.trim();
        if (!destination) return;
        const ref = await db.ref('trips').push({ destination, createdAt: Date.now(), groups: {} });
        await PackPal.ui.logActivity(`created trip '${destination}'`);
        currentTripId = ref.key;
        selectTrip.value = currentTripId;
        hideModal('modal-trip');
    });

    // Add Group
    btnGroup.addEventListener('click', ()=>{
        if (!roles.canManageMembers(currentRole)) return;
        if (!currentTripId) return alert('Select a trip first');
        document.getElementById('modal-group-name').value = '';
        showModal('modal-group');
    });
    document.getElementById('modal-group-cancel').addEventListener('click', ()=>{
        hideModal('modal-group');
    });
    document.getElementById('modal-group-save').addEventListener('click', async ()=>{
        const name = document.getElementById('modal-group-name').value.trim();
        if (!name) return;
        const groupRef = await db.ref(`trips/${currentTripId}/groups`).push({ name, members: {} });
        await PackPal.ui.logActivity(`created group '${name}'`);
        hideModal('modal-group');
    });

    // Add Member
    btnMember.addEventListener('click', ()=>{
        if (!roles.canManageMembers(currentRole)) return;
        if (!currentTripId) return alert('Select a trip first');
        document.getElementById('modal-member-name').value = '';
        document.getElementById('modal-member-contact').value = '';
        showModal('modal-member');
    });
    document.getElementById('modal-member-cancel').addEventListener('click', ()=>{
        hideModal('modal-member');
    });
    document.getElementById('modal-member-save').addEventListener('click', async ()=>{
        const name = document.getElementById('modal-member-name').value.trim();
        const contact = document.getElementById('modal-member-contact').value.trim();
        if (!name) return;
        // Add to first group (or create one if none)
        const tripSnap = await db.ref(`trips/${currentTripId}`).get();
        const trip = tripSnap.val();
        let groupId = Object.keys(trip.groups || {})[0];
        if (!groupId) {
            const groupRef = await db.ref(`trips/${currentTripId}/groups`).push({ name: 'Default Group', members: {} });
            groupId = groupRef.key;
        }
        await db.ref(`trips/${currentTripId}/groups/${groupId}/members`).push({ name, contact });
        await PackPal.ui.logActivity(`added member '${name}'`);
        hideModal('modal-member');
    });
})();


