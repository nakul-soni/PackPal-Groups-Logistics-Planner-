// Authentication helpers for PackPal using Firebase Anonymous auth
window.PackPalAuth = window.PackPalAuth || {};

(function(){
    const { auth, db } = PackPal.firebase;

    // Ensure a user document exists with a role; seed first user as owner
    async function ensureUserRole(uid){
        const ref = db.ref(`users/${uid}`);
        const snap = await ref.get();
        if (!snap.exists()){
            // First user becomes owner; subsequent users default viewer until promoted
            const firstUserSnap = await db.ref('meta/hasOwner').get();
            const isFirst = !firstUserSnap.exists();
            const role = isFirst ? 'owner' : 'viewer';
            const userData = {
                role,
                createdAt: Date.now(),
            };
            await ref.set(userData);
            if (isFirst){
                await db.ref('meta/hasOwner').set(true);
            }
            return role;
        }
        const val = snap.val();
        return val.role || 'viewer';
    }

    async function signInAnonymouslyWithRoleSeed(){
        const result = await auth.signInAnonymously();
        const user = result.user;
        const role = await ensureUserRole(user.uid);
        return { user, role };
    }

    // New: explicit chosen role with passcode already validated in UI
    async function signInAnonymouslyWithChosenRole(chosenRole){
        const result = await auth.signInAnonymously();
        const user = result.user;
        // If first owner is not set and chosen is owner, set meta and role; else just set role
        if (chosenRole === 'owner'){
            const firstUserSnap = await db.ref('meta/hasOwner').get();
            if (!firstUserSnap.exists()){
                await db.ref('meta/hasOwner').set(true);
            }
        }
        await db.ref(`users/${user.uid}`).set({ role: chosenRole, createdAt: Date.now() });
        return { user, role: chosenRole };
    }

    function onAuthStateChanged(callback){
        return auth.onAuthStateChanged(async (user) => {
            if (!user) return callback(null);
            const role = await ensureUserRole(user.uid);
            callback({ user, role });
        });
    }

    async function signOut(){
        await auth.signOut();
    }

    PackPalAuth = {
        signInAnonymouslyWithRoleSeed,
        signInAnonymouslyWithChosenRole,
        onAuthStateChanged,
        signOut,
    };
})();


