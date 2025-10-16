const Role = require('../models/Role');
const PageAccess = require('../models/PageAccess');

/**
 * Role Service - Handles role creation and management logic
 */

/**
 * Get default permissions for Theater Admin role
 * Theater Admin has access to all pages except super_admin specific pages
 */
async function getDefaultTheaterAdminPermissions() {
  try {
    // Fetch all active pages
    const allPages = await PageAccess.find({ isActive: true }).lean();
    
    // Pages that Theater Admin should NOT have access to (super_admin only)
    const restrictedPages = [
      'theaters',
      'add-theater',
      'user-management',
      'role-management'
    ];
    
    // Create permissions array with access to all pages except restricted ones
    const permissions = allPages
      .filter(page => !restrictedPages.includes(page.pageName))
      .map(page => ({
        page: page.page || page.pageName,
        pageName: page.pageName,
        hasAccess: true,
        route: page.route
      }));
    
    console.log(`✅ Generated ${permissions.length} default permissions for Theater Admin`);
    return permissions;
    
  } catch (error) {
    console.error('❌ Error fetching default permissions:', error);
    // Return basic permissions if PageAccess fetch fails
    return getBasicTheaterAdminPermissions();
  }
}

/**
 * Fallback: Get basic permissions if PageAccess is not available
 */
function getBasicTheaterAdminPermissions() {
  return [
    { page: 'dashboard', pageName: 'dashboard', hasAccess: true, route: '/' },
    { page: 'products', pageName: 'products', hasAccess: true, route: '/theater/:theaterId/products' },
    { page: 'categories', pageName: 'categories', hasAccess: true, route: '/theater/:theaterId/categories' },
    { page: 'product-types', pageName: 'product-types', hasAccess: true, route: '/theater/:theaterId/product-types' },
    { page: 'stock', pageName: 'stock', hasAccess: true, route: '/theater/:theaterId/stock' },
    { page: 'orders', pageName: 'orders', hasAccess: true, route: '/theater/:theaterId/orders' },
    { page: 'pos', pageName: 'pos', hasAccess: true, route: '/theater/:theaterId/pos' },
    { page: 'order-history', pageName: 'order-history', hasAccess: true, route: '/theater/:theaterId/order-history' },
    { page: 'qr-management', pageName: 'qr-management', hasAccess: true, route: '/theater/:theaterId/qr-management' },
    { page: 'settings', pageName: 'settings', hasAccess: true, route: '/theater/:theaterId/settings' },
    { page: 'reports', pageName: 'reports', hasAccess: true, route: '/theater/:theaterId/reports' }
  ];
}

/**
 * Create default Theater Admin role for a theater
 * This role is created automatically when a new theater is created
 * 
 * @param {ObjectId} theaterId - The theater's MongoDB ObjectId
 * @param {String} theaterName - The theater's name (for role description)
 * @returns {Promise<Object>} The created role document
 */
async function createDefaultTheaterAdminRole(theaterId, theaterName) {
  try {
    console.log(`🎭 Creating default Theater Admin role for theater: ${theaterName} (${theaterId})`);
    
    // Check if default role already exists for this theater
    const existingDefaultRole = await Role.findOne({
      theater: theaterId,
      isDefault: true
    });
    
    if (existingDefaultRole) {
      console.log(`⚠️  Default role already exists for theater ${theaterId}`);
      return existingDefaultRole;
    }
    
    // Get default permissions
    const permissions = await getDefaultTheaterAdminPermissions();
    
    // Create the Theater Admin role
    const roleData = {
      name: 'Theater Admin',
      description: `Default administrator role for ${theaterName}. This role has full access to manage all theater operations including products, orders, stock, and reports. Cannot be deleted or edited.`,
      theater: theaterId,
      permissions: permissions,
      isGlobal: false,
      priority: 1, // Highest priority
      isActive: true,
      isDefault: true, // Mark as default role
      canDelete: false, // Cannot be deleted
      canEdit: false // Cannot be edited
    };
    
    const role = new Role(roleData);
    const savedRole = await role.save();
    
    console.log(`✅ Default Theater Admin role created successfully: ${savedRole._id}`);
    console.log(`   - Permissions granted: ${permissions.length}`);
    console.log(`   - Theater: ${theaterName}`);
    console.log(`   - Protected: Cannot be edited or deleted`);
    
    return savedRole;
    
  } catch (error) {
    console.error('❌ Error creating default Theater Admin role:', error);
    throw error;
  }
}

/**
 * Check if a role is protected (default role)
 * 
 * @param {ObjectId} roleId - The role's MongoDB ObjectId
 * @returns {Promise<Boolean>} True if role is protected
 */
async function isProtectedRole(roleId) {
  try {
    const role = await Role.findById(roleId).select('isDefault canDelete canEdit').lean();
    return role && role.isDefault === true;
  } catch (error) {
    console.error('❌ Error checking if role is protected:', error);
    return false;
  }
}

/**
 * Check if role can be deleted
 * 
 * @param {ObjectId} roleId - The role's MongoDB ObjectId
 * @returns {Promise<Object>} { canDelete: Boolean, reason: String }
 */
async function canDeleteRole(roleId) {
  try {
    const role = await Role.findById(roleId).select('name isDefault canDelete').lean();
    
    if (!role) {
      return { canDelete: false, reason: 'Role not found' };
    }
    
    if (role.isDefault && !role.canDelete) {
      return { 
        canDelete: false, 
        reason: `Cannot delete default Theater Admin role. This role is automatically created and protected.` 
      };
    }
    
    return { canDelete: true, reason: null };
    
  } catch (error) {
    console.error('❌ Error checking if role can be deleted:', error);
    return { canDelete: false, reason: 'Error checking role permissions' };
  }
}

/**
 * Check if role can be edited
 * 
 * @param {ObjectId} roleId - The role's MongoDB ObjectId
 * @returns {Promise<Object>} { canEdit: Boolean, reason: String }
 */
async function canEditRole(roleId) {
  try {
    const role = await Role.findById(roleId).select('name isDefault canEdit').lean();
    
    if (!role) {
      return { canEdit: false, reason: 'Role not found' };
    }
    
    if (role.isDefault && !role.canEdit) {
      return { 
        canEdit: false, 
        reason: `Cannot edit default Theater Admin role. This role is automatically managed and protected.` 
      };
    }
    
    return { canEdit: true, reason: null };
    
  } catch (error) {
    console.error('❌ Error checking if role can be edited:', error);
    return { canEdit: false, reason: 'Error checking role permissions' };
  }
}

/**
 * Get default role for a theater
 * 
 * @param {ObjectId} theaterId - The theater's MongoDB ObjectId
 * @returns {Promise<Object|null>} The default role document or null
 */
async function getDefaultRoleForTheater(theaterId) {
  try {
    return await Role.findOne({
      theater: theaterId,
      isDefault: true
    }).lean();
  } catch (error) {
    console.error('❌ Error fetching default role:', error);
    return null;
  }
}

/**
 * Check if update request is permission-only (for default roles)
 * Default roles can update permissions but not other fields
 * 
 * @param {Object} updateData - The update request data
 * @returns {Boolean} True if only permissions/isActive are being updated
 */
function isPermissionOnlyUpdate(updateData) {
  const allowedFields = ['permissions', 'isActive'];
  const restrictedFields = ['name', 'description', 'priority', 'isGlobal', 'canDelete', 'canEdit', 'isDefault'];
  
  // Check if any restricted fields are present
  const hasRestrictedFields = restrictedFields.some(field => updateData[field] !== undefined);
  
  // Check if at least permissions field is present
  const hasPermissions = updateData.permissions !== undefined;
  
  return hasPermissions && !hasRestrictedFields;
}

/**
 * Validate role update request for default roles
 * Provides detailed validation of what can/cannot be updated
 * 
 * @param {ObjectId} roleId - The role's MongoDB ObjectId
 * @param {Object} updateData - The update request data
 * @returns {Promise<Object>} Validation result with details
 */
async function validateRoleUpdate(roleId, updateData) {
  try {
    const role = await Role.findById(roleId).select('isDefault canEdit name theater').lean();
    
    if (!role) {
      return { 
        canUpdate: false, 
        reason: 'Role not found',
        updateType: null
      };
    }
    
    // Default roles have special rules
    if (role.isDefault) {
      // Check if this is a permission-only update
      if (isPermissionOnlyUpdate(updateData)) {
        return { 
          canUpdate: true, 
          reason: null,
          updateType: 'permissions_only',
          message: 'Default Theater Admin role: Only permissions can be updated'
        };
      } else {
        return { 
          canUpdate: false, 
          reason: 'Default Theater Admin role is protected. Only page access permissions can be updated. Role name, description, and other properties cannot be modified.',
          updateType: 'restricted',
          allowedFields: ['permissions', 'isActive'],
          blockedFields: ['name', 'description', 'priority', 'isGlobal', 'canDelete', 'canEdit', 'isDefault'],
          providedFields: Object.keys(updateData)
        };
      }
    }
    
    // Non-default roles can be fully edited
    return { 
      canUpdate: true, 
      reason: null, 
      updateType: 'full',
      message: 'Regular role: All fields can be updated'
    };
    
  } catch (error) {
    console.error('❌ Error validating role update:', error);
    return { 
      canUpdate: false, 
      reason: 'Error validating update request',
      updateType: null
    };
  }
}

module.exports = {
  createDefaultTheaterAdminRole,
  getDefaultTheaterAdminPermissions,
  getBasicTheaterAdminPermissions,
  isProtectedRole,
  canDeleteRole,
  canEditRole,
  getDefaultRoleForTheater,
  isPermissionOnlyUpdate,
  validateRoleUpdate
};
