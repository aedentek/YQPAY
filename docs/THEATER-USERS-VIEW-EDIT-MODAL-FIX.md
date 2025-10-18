# Theater Users View & Edit Modal Implementation

## Issue
When clicking **View** or **Edit** icons, the page was navigating to separate routes that showed a **white screen** instead of opening modal popups.

## User Requirement
> "in this when i have click the (view or edit button like the white screen it was showing fix that) actually (view & edit) want to be popup form instant of why did you do this"

**Translation:** View and Edit should open as **popup modals** (like the Create User form), not navigate to separate pages.

## Root Cause
The handlers were using `navigate()` to go to separate routes:
```javascript
// ❌ OLD CODE - Navigate to separate pages
const handleViewUser = (user) => {
  navigate(`/theater-user-view/${user._id}`, { state: { user, theater } });
};

const handleEditUser = (user) => {
  navigate(`/theater-user-edit/${user._id}`, { state: { user, theater } });
};
```

These routes (`/theater-user-view/:id` and `/theater-user-edit/:id`) were either:
1. Not defined in the router
2. Not implemented properly
3. Showing white screen due to missing components

## Solution Implemented

### 1. Added Modal States

```javascript
// View user modal state
const [showViewUserModal, setShowViewUserModal] = useState(false);
const [viewUserData, setViewUserData] = useState(null);

// Edit user modal state
const [showEditUserModal, setShowEditUserModal] = useState(false);
const [editUserData, setEditUserData] = useState({
  userId: '',
  username: '',
  email: '',
  fullName: '',
  phoneNumber: '',
  role: '',
  password: '',
  confirmPassword: ''
});
const [editUserErrors, setEditUserErrors] = useState({});

// Password visibility for edit form
const [showEditPassword, setShowEditPassword] = useState(false);
const [showEditConfirmPassword, setShowEditConfirmPassword] = useState(false);
```

### 2. Updated Handlers to Open Modals

```javascript
// ✅ NEW CODE - Open modals instead of navigate
const handleViewUser = (user) => {
  setViewUserData(user);
  setShowViewUserModal(true);
};

const handleEditUser = (user) => {
  setEditUserData({
    userId: user._id,
    username: user.username,
    email: user.email,
    fullName: user.fullName || '',
    phoneNumber: user.phoneNumber || '',
    role: typeof user.role === 'object' ? user.role._id : user.role,
    password: '',
    confirmPassword: ''
  });
  setEditUserErrors({});
  setShowEditPassword(false);
  setShowEditConfirmPassword(false);
  setShowEditUserModal(true);
};
```

### 3. Added Close Modal Functions

```javascript
const closeViewUserModal = () => {
  setShowViewUserModal(false);
  setViewUserData(null);
};

const closeEditUserModal = () => {
  setShowEditUserModal(false);
  setEditUserData({
    userId: '',
    username: '',
    email: '',
    fullName: '',
    phoneNumber: '',
    role: '',
    password: '',
    confirmPassword: ''
  });
  setEditUserErrors({});
  setShowEditPassword(false);
  setShowEditConfirmPassword(false);
};
```

### 4. Added Update User Handler

```javascript
const handleUpdateUser = async () => {
  // Validate fields
  const errors = {};
  if (!editUserData.fullName?.trim()) errors.fullName = 'Full name is required';
  if (!editUserData.email?.trim()) errors.email = 'Email is required';
  if (!editUserData.phoneNumber?.trim()) errors.phoneNumber = 'Phone number is required';
  if (!editUserData.role) errors.role = 'Role is required';
  
  // Validate password if provided
  if (editUserData.password) {
    if (editUserData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    if (editUserData.password !== editUserData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
  }

  if (Object.keys(errors).length > 0) {
    setEditUserErrors(errors);
    return;
  }

  try {
    setLoadingUsers(true);
    
    const updateData = {
      theaterId: theaterId,
      fullName: editUserData.fullName,
      email: editUserData.email,
      phoneNumber: editUserData.phoneNumber,
      role: editUserData.role
    };
    
    // Only include password if provided
    if (editUserData.password) {
      updateData.password = editUserData.password;
    }

    const response = await fetch(`${config.api.baseUrl}/theater-users/${editUserData.userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify(updateData)
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      closeEditUserModal();
      await fetchUsers();
      alert('✅ User updated successfully!');
    } else {
      setEditUserErrors({ submit: result.message || 'Failed to update user' });
    }
  } catch (error) {
    setEditUserErrors({ submit: 'Network error. Please try again.' });
  } finally {
    setLoadingUsers(false);
  }
};
```

### 5. Added View User Modal UI

**Features:**
- ✅ Read-only form fields
- ✅ Displays all user information
- ✅ Shows theater name
- ✅ Shows username (cannot be changed)
- ✅ Shows full name, email, phone
- ✅ Shows role name
- ✅ Shows active status with color coding
- ✅ Shows last login date
- ✅ "Edit User" button that opens edit modal
- ✅ "Close" button to dismiss

```javascript
{showViewUserModal && viewUserData && (
  <div className="modal-overlay" onClick={closeViewUserModal}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2>👤 View User Details</h2>
        <button className="close-btn" onClick={closeViewUserModal}>×</button>
      </div>
      
      <div className="modal-body">
        {/* Read-only fields showing user data */}
      </div>
    </div>
  </div>
)}
```

### 6. Added Edit User Modal UI

**Features:**
- ✅ Theater field (read-only)
- ✅ Username field (read-only - cannot be changed)
- ✅ Full Name (editable)
- ✅ Email Address (editable)
- ✅ Phone Number (editable)
- ✅ Role dropdown (editable)
- ✅ New Password (optional - leave blank to keep current)
- ✅ Confirm New Password (only shown if password entered)
- ✅ Password visibility toggles
- ✅ Password match indicator
- ✅ Validation errors display
- ✅ "Update User" button
- ✅ "Cancel" button

```javascript
{showEditUserModal && (
  <div className="modal-overlay" onClick={closeEditUserModal}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2>✏️ Edit User</h2>
        <button className="close-btn" onClick={closeEditUserModal}>×</button>
      </div>
      
      <div className="modal-body">
        {/* Editable form fields */}
      </div>
    </div>
  </div>
)}
```

## User Flow

### View User Flow:
1. Click **👁️ View** icon on any user
2. View modal opens with all user details (read-only)
3. Can click "Edit User" button to switch to edit modal
4. Can click "Close" or X to dismiss

### Edit User Flow:
1. Click **✏️ Edit** icon on any user (or "Edit User" from view modal)
2. Edit modal opens with pre-filled form
3. Username field is disabled (cannot be changed)
4. Update any editable fields
5. Optionally change password (leave blank to keep current)
6. Click "Update User" to save
7. Success alert and modal closes
8. User list refreshes automatically

## API Integration

### Update User Endpoint
```
PUT /api/theater-users/:userId
Headers: Authorization: Bearer <token>
Body: {
  theaterId: "...",
  fullName: "...",
  email: "...",
  phoneNumber: "...",
  role: "...",
  password: "..." // optional
}
```

## Password Handling

### In Edit Modal:
- Password field is **optional**
- If left **blank** → keeps current password (not sent to backend)
- If filled → requires confirmation and minimum 6 characters
- Only sends password to backend if provided

```javascript
// Only include password if provided
if (editUserData.password) {
  updateData.password = editUserData.password;
}
```

## Styling

Both modals use the same global CSS classes as the Create User modal:
- `.modal-overlay` - Dark backdrop
- `.modal-content` - White centered popup
- `.modal-header` - Title bar with close button
- `.modal-body` - Content area
- `.edit-form` - Form styling
- `.form-group` - Field groups
- `.form-control` - Input fields
- `.error-message` - Validation errors
- `.modal-actions` - Button container

## Button Icons in Table

The table buttons remain unchanged:
```javascript
{/* View button */}
<button className="btn btn-view" onClick={() => handleViewUser(user)}>
  <svg>...</svg>
</button>

{/* Edit button */}
<button className="btn btn-edit" onClick={() => handleEditUser(user)}>
  <svg>...</svg>
</button>

{/* Delete button */}
<button className="btn btn-delete" onClick={() => handleDeleteUser(user._id)}>
  <svg>...</svg>
</button>
```

## Testing Checklist

### View Modal:
- ✅ Click view icon opens modal
- ✅ All fields display correctly
- ✅ Role name shows (not ID)
- ✅ Status shows with color
- ✅ Last login shows formatted date
- ✅ Close button works
- ✅ Clicking outside modal closes it
- ✅ "Edit User" button opens edit modal

### Edit Modal:
- ✅ Click edit icon opens modal
- ✅ All fields pre-filled correctly
- ✅ Username is disabled
- ✅ Can update full name
- ✅ Can update email
- ✅ Can update phone
- ✅ Can change role
- ✅ Can leave password blank (keeps current)
- ✅ Can change password (requires confirmation)
- ✅ Password visibility toggles work
- ✅ Validation errors show
- ✅ "Update User" saves changes
- ✅ Success alert shows
- ✅ Modal closes after update
- ✅ User list refreshes

### Error Handling:
- ✅ Network errors show error message
- ✅ Validation errors show per field
- ✅ Password mismatch shows error
- ✅ Missing required fields show errors

## Files Modified
1. `frontend/src/pages/TheaterUserDetails.js`
   - Added view/edit modal states
   - Updated `handleViewUser` to open modal
   - Updated `handleEditUser` to open modal
   - Added `closeViewUserModal` function
   - Added `closeEditUserModal` function
   - Added `handleUpdateUser` function
   - Added view user modal JSX
   - Added edit user modal JSX

## Benefits

### Before:
- ❌ Navigate to separate pages
- ❌ White screen (routes not defined)
- ❌ Lose context of current page
- ❌ Slower user experience

### After:
- ✅ Instant modal popups
- ✅ No navigation or loading
- ✅ Keep context of current page
- ✅ Consistent with create user flow
- ✅ Better UX

## Completion Date
October 19, 2025

## Status
✅ **IMPLEMENTED** - View and Edit now open as popup modals (no more white screen).

## Additional Notes
- Removed the need for separate view/edit routes
- Consistent modal pattern across all CRUD operations
- Username cannot be changed (business rule)
- Password is optional when editing (keeps current if blank)
- All modals use the same global CSS classes for consistency
