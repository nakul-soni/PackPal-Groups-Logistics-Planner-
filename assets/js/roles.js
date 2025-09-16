// Role utilities and constants
window.PackPal = window.PackPal || {};

(function(){
    const ROLES = Object.freeze({
        OWNER: 'owner',
        ADMIN: 'admin',
        MEMBER: 'member',
        VIEWER: 'viewer',
    });

    function canManageMembers(role){
        return role === ROLES.OWNER || role === ROLES.ADMIN;
    }

    function canManageCategories(role){
        return role === ROLES.OWNER || role === ROLES.ADMIN;
    }

    function canExport(role){
        return role === ROLES.OWNER || role === ROLES.ADMIN;
    }

    function canAssignToOthers(role){
        return role === ROLES.OWNER || role === ROLES.ADMIN;
    }

    function canCreateItems(role){
        return role === ROLES.OWNER || role === ROLES.ADMIN || role === ROLES.MEMBER;
    }

    function canEditItem(role, isOwnItem){
        if (role === ROLES.OWNER || role === ROLES.ADMIN) return true;
        if (role === ROLES.MEMBER) return !!isOwnItem;
        return false;
    }

    PackPal.roles = {
        ROLES,
        canManageMembers,
        canManageCategories,
        canExport,
        canAssignToOthers,
        canCreateItems,
        canEditItem,
    };
})();


