// Checklist: items and categories CRUD, filters, animations, and export hook
(function(){
    PackPal.ui.requireAuth();
    const { db } = PackPal.firebase;
    const roles = PackPal.roles;

    const grid = document.getElementById('items-grid');
    const filter = document.getElementById('filter-category');
    const btnAddItem = document.getElementById('btn-add-item');
    const btnAddCategory = document.getElementById('btn-add-category');
    const btnExport = document.getElementById('btn-export');
    const tpl = document.getElementById('item-card-template');
    const modalItem = document.getElementById('modal-item');
    const modalItemTitle = document.getElementById('modal-item-title');
    const modalItemName = document.getElementById('modal-item-name');
    const modalItemCategory = document.getElementById('modal-item-category');
    const modalItemMember = document.getElementById('modal-item-member');
    const modalItemStatus = document.getElementById('modal-item-status');
    const modalItemQty = document.getElementById('modal-item-qty');
    const modalItemTrip = document.getElementById('modal-item-trip');
    const modalItemCancel = document.getElementById('modal-item-cancel');
    const modalItemSave = document.getElementById('modal-item-save');
    const modalCategory = document.getElementById('modal-category');
    const modalCategoryName = document.getElementById('modal-category-name');
    // Icon field removed from modal
    const modalCategoryCancel = document.getElementById('modal-category-cancel');
    const modalCategorySave = document.getElementById('modal-category-save');
    const modalConfirm = document.getElementById('modal-confirm');
    const modalConfirmCancel = document.getElementById('modal-confirm-cancel');
    const modalConfirmOk = document.getElementById('modal-confirm-ok');
    const toast = document.getElementById('toast');

    let currentRole = 'viewer';
    PackPalAuth.onAuthStateChanged((state)=>{ if (state){ currentRole = state.role; }});

    // Preset category -> icon map for auto selection
    const presetCategoryIconMap = {
        'Clothing': '👕',
        'Tech': '💻',
        'Accessories': '🧢',
        'Medical': '🩺',
        'Toiletries': '🧴',
        'Food': '🍎',
        'Documents': '📄',
        'Camping': '🏕️',
        'Sports': '🏈',
        'Kids': '🧸',
        'Pets': '🐾',
        'Tools': '🛠️',
        'Footwear': '👟',
        'Hygiene': '🪥',
        'Others': '📦'
    };

    // Prepare a list of preset category names for the item category dropdown
    const presetCategoryNames = Object.keys(presetCategoryIconMap);

    // Load categories into filter and modal, and include preset categories for quick selection
    db.ref('categories').on('value', (snap)=>{
        const categories = snap.val() || {};
        filter.innerHTML = '';
        const optAll = document.createElement('option');
        optAll.value = 'all'; optAll.textContent = 'All Items';
        filter.appendChild(optAll);
        // Append categories from DB
        Object.entries(categories).forEach(([key, cat])=>{
            const o = document.createElement('option');
            o.value = key; o.textContent = cat.name || 'Category';
            filter.appendChild(o);
        });
        // Append preset names if not already present in filter
        presetCategoryNames.forEach(name => {
            const exists = Array.from(filter.options).some(opt => opt.text === name);
            if (!exists){
                const o = document.createElement('option'); o.value = `preset:${name}`; o.textContent = name; filter.appendChild(o);
            }
        });

        // Fill modal category select (Add Item) with DB categories and presets
        modalItemCategory.innerHTML = '';
        Object.entries(categories).forEach(([key, cat])=>{
            const o = document.createElement('option'); o.value = key; o.textContent = cat.name || 'Category'; modalItemCategory.appendChild(o);
        });
        presetCategoryNames.forEach(name => {
            const exists = Array.from(modalItemCategory.options).some(opt => opt.text === name);
            if (!exists){
                const o = document.createElement('option'); o.value = `preset:${name}`; o.textContent = name; modalItemCategory.appendChild(o);
            }
        });
    });

    // Members list for assignment (aggregate from all trips/groups) and trips list
    db.ref('trips').on('value', (snap)=>{
        const trips = snap.val() || {};
        const members = [];
        const tripOptions = [];
        Object.values(trips).forEach(t => {
            tripOptions.push(t.destination || 'Trip');
            const groups = t.groups || {};
            Object.values(groups).forEach(g => {
                Object.entries(g.members || {}).forEach(([id, m])=>{
                    members.push({ id, name: m.name, contact: m.contact || '' });
                });
            });
        });
        modalItemMember.innerHTML = '';
        const unassigned = document.createElement('option');
        unassigned.value = ''; unassigned.textContent = 'Unassigned';
        // For members, restrict to self assignment only
        if (currentRole === 'member'){
            const selfOpt = document.createElement('option');
            selfOpt.value = 'you'; selfOpt.textContent = 'You';
            modalItemMember.appendChild(selfOpt);
        } else {
            modalItemMember.appendChild(unassigned);
            members.forEach(m => {
                const o = document.createElement('option');
                o.value = m.name;
                o.textContent = m.name;
                modalItemMember.appendChild(o);
            });
        }
        modalItemTrip.innerHTML = '';
        const noTrip = document.createElement('option');
        noTrip.value = ''; noTrip.textContent = 'No Trip';
        modalItemTrip.appendChild(noTrip);
        tripOptions.forEach(name => {
            const o = document.createElement('option');
            o.value = name; o.textContent = name;
            modalItemTrip.appendChild(o);
        });
    });

    // Wire modal category name input to auto-select icon and update preview
    // Icon field and preview removed from modal logic

    // Render items with filter
    let latestItems = {};
    db.ref('items').on('value', (snap)=>{
        latestItems = snap.val() || {};
        renderItems(latestItems);
    });

    filter.addEventListener('change', ()=>{
        db.ref('items').get().then(s => renderItems(s.val() || {}));
    });

    function renderItems(items){
        const selected = filter.value || 'all';
        grid.innerHTML = '';
        Object.entries(items).forEach(([id, item])=>{
            if (selected !== 'all' && item.categoryId !== selected) return;
            const node = tpl.content.firstElementChild.cloneNode(true);
            node.dataset.id = id;
            node.querySelector('.item-name').textContent = item.name;
            node.querySelector('.item-trip').textContent = item.trip || '-';
            const qtyEl = node.querySelector('.item-qty');
            if (qtyEl) qtyEl.textContent = item.quantity || 1;
            node.querySelector('.item-assigned').textContent = item.assignedToName || 'Unassigned';
            const statusChip = node.querySelector('.status');
            const isPacked = item.status === 'packed';
            statusChip.textContent = isPacked ? 'Packed' : 'Unpacked';
            statusChip.classList.toggle('packed', isPacked);
            statusChip.classList.toggle('unpacked', !isPacked);

            const btnEdit = node.querySelector('.btn-edit');
            const btnDelete = node.querySelector('.btn-delete');
            const isOwn = (item.assignedTo === (PackPal.firebase.auth.currentUser?.uid)) || (currentRole === 'member' && item.assignedToName === 'You');
            if (!(currentRole === 'owner' || currentRole === 'admin') && !roles.canEditItem(currentRole, isOwn)) btnEdit.setAttribute('disabled','true');
            if (!roles.canAssignToOthers(currentRole)) btnDelete.setAttribute('disabled','true');

            grid.appendChild(node);
        });
    }

    // Robust event delegation for edit/delete actions
    grid.addEventListener('click', (event)=>{
        const editBtn = event.target.closest('.btn-edit');
        const delBtn = event.target.closest('.btn-delete');
        const card = event.target.closest('.item-card');
        if (!card) return;
        const id = card.dataset.id;
        const item = latestItems[id];
        if (editBtn && !editBtn.hasAttribute('disabled') && item){
            openItemModal({ id, ...item });
        }
        if (delBtn && !delBtn.hasAttribute('disabled') && item){
            openConfirm(async ()=>{
                await db.ref(`items/${id}`).remove();
                await PackPal.ui.logActivity(`deleted item '${item.name}'`);
                showToast('Item deleted');
            });
        }
    });

    // Add Item via modal
    btnAddItem.addEventListener('click', ()=>{
        if (!roles.canCreateItems(currentRole)) return;
        openItemModal(null);
    });

    // Add Category via modal
    btnAddCategory.addEventListener('click', ()=>{
        if (!roles.canManageCategories(currentRole)) return;
        openCategoryModal();
    });

    // Export
    btnExport.addEventListener('click', ()=>{
        PackPalExport.exportChecklistToPDF();
    });
    // Modal helpers
    function openItemModal(item){
        modalItemTitle.textContent = item ? 'Edit Item' : 'Add Item';
        modalItemName.value = item?.name || '';
        modalItemCategory.value = item?.categoryId || '';
        // Member select handling
        if (currentRole === 'member'){
            modalItemMember.value = 'you';
            modalItemMember.setAttribute('disabled','true');
        } else {
            modalItemMember.removeAttribute('disabled');
            modalItemMember.value = item?.assignedToName || '';
        }
        modalItemStatus.value = item?.status || 'unpacked';
        modalItemQty.value = item?.quantity || 1;
        modalItemTrip.value = item?.trip || '';
        modalItem.classList.remove('hidden');

        const offCancel = () => { modalItem.classList.add('hidden'); cleanup(); };
        const offSave = async () => {
            const name = modalItemName.value.trim(); if (!name) return;
            const categoryId = modalItemCategory.value || null;
            let assignedTo = null;
            let assignedToName = modalItemMember.value || '';
            if (currentRole === 'member'){
                assignedTo = PackPal.firebase.auth.currentUser?.uid || null;
                assignedToName = 'You';
            }
            const status = modalItemStatus.value || 'unpacked';
            const quantity = Math.max(1, parseInt(modalItemQty.value, 10) || 1);
            const trip = modalItemTrip.value || '';
            const payload = { name, categoryId, assignedToName, assignedTo, status, trip, quantity };
            if (item && item.id){
                await db.ref(`items/${item.id}`).update(payload);
                await PackPal.ui.logActivity(`updated item '${name}'`);
            } else {
                payload.createdAt = Date.now();
                await db.ref('items').push(payload);
                await PackPal.ui.logActivity(`added item '${name}'`);
            }
            modalItem.classList.add('hidden');
            cleanup();
        };
        function cleanup(){
            modalItemCancel.removeEventListener('click', offCancel);
            modalItemSave.removeEventListener('click', offSave);
        }
        modalItemCancel.addEventListener('click', offCancel);
        modalItemSave.addEventListener('click', offSave);
    }

    function openConfirm(onConfirm){
        modalConfirm.classList.remove('hidden');
        const offCancel = ()=>{ modalConfirm.classList.add('hidden'); cleanup(); };
        const offOk = async ()=>{ await onConfirm(); modalConfirm.classList.add('hidden'); cleanup(); };
        function cleanup(){
            modalConfirmCancel.removeEventListener('click', offCancel);
            modalConfirmOk.removeEventListener('click', offOk);
        }
        modalConfirmCancel.addEventListener('click', offCancel);
        modalConfirmOk.addEventListener('click', offOk);
    }

    function showToast(message){
        if (!toast) return;
        toast.textContent = message;
        toast.classList.remove('hidden');
        setTimeout(()=>{ toast.classList.add('hidden'); }, 2200);
    }

    function openCategoryModal(){
        modalCategoryName.value = '';
        modalCategory.classList.remove('hidden');
        const offCancel = () => { modalCategory.classList.add('hidden'); cleanup(); };
        const offSave = async () => {
            const name = modalCategoryName.value.trim(); if (!name) return;
            await db.ref('categories').push({ name, createdAt: Date.now() });
            await PackPal.ui.logActivity(`added category '${name}'`);
            modalCategory.classList.add('hidden');
            cleanup();
        };
        function cleanup(){
            modalCategoryCancel.removeEventListener('click', offCancel);
            modalCategorySave.removeEventListener('click', offSave);
        }
        modalCategoryCancel.addEventListener('click', offCancel);
        modalCategorySave.addEventListener('click', offSave);
    }

})();


