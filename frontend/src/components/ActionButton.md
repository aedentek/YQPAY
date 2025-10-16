# Global Action Button System

This system provides consistent action buttons across all pages and components in the application.

## Features

- ✅ **Consistent Design**: All action buttons have the same look and feel
- ✅ **Predefined Icons**: Built-in icons for common actions (view, edit, delete, etc.)
- ✅ **Responsive**: Adapts to mobile screens automatically
- ✅ **Accessible**: Proper focus states and ARIA support
- ✅ **Customizable**: Easy to extend with new button types

## Usage

### Import the Components

```javascript
import { ActionButton, ActionButtons } from '../components/ActionButton';
```

### Basic Usage

```javascript
// Single action button
<ActionButton 
  type="view"
  onClick={handleViewClick}
  title="View Details"
/>

// Multiple action buttons
<ActionButtons>
  <ActionButton type="view" onClick={handleView} />
  <ActionButton type="edit" onClick={handleEdit} />
  <ActionButton type="delete" onClick={handleDelete} />
</ActionButtons>
```

## Available Button Types

| Type | Icon | Purpose | Color Theme |
|------|------|---------|-------------|
| `view` | 👁️ | View details | Blue |
| `edit` | ✏️ | Edit item | Purple |
| `delete` | 🗑️ | Delete item | Red |
| `password` | 🔑 | Change password | Orange |
| `settings` | ⚙️ | Settings | Gray |
| `download` | 📥 | Download | Green |
| `upload` | 📤 | Upload | Blue |
| `copy` | 📋 | Copy | Pink |
| `activate` | ✅ | Activate | Green |
| `deactivate` | ❌ | Deactivate | Orange |

## Advanced Usage

### Custom Icons
```javascript
<ActionButton 
  type="edit"
  onClick={handleEdit}
  title="Custom Edit"
>
  <svg viewBox="0 0 24 24" fill="currentColor">
    {/* Your custom icon */}
  </svg>
</ActionButton>
```

### Loading State
```javascript
<ActionButton 
  type="view"
  onClick={handleView}
  loading={isLoading}
  title="View Details"
/>
```

### Disabled State
```javascript
<ActionButton 
  type="delete"
  onClick={handleDelete}
  disabled={!canDelete}
  title="Delete Item"
/>
```

### Custom Styling
```javascript
<ActionButton 
  type="edit"
  onClick={handleEdit}
  className="custom-edit-btn"
  title="Edit Item"
/>
```

## CSS Classes

The system automatically applies the following CSS classes:

- `.action-btn` - Base button styling
- `.{type}-btn` - Type-specific styling (e.g., `.view-btn`, `.edit-btn`)
- `.loading` - Loading state styling
- `.action-buttons` - Container styling

## Mobile Responsive

The buttons automatically adapt to smaller screens:
- **Desktop**: 36px × 36px with 18px icons
- **Tablet**: 32px × 32px with 16px icons  
- **Mobile**: 28px × 28px with 14px icons

## Implementation Examples

### Theater List
```javascript
<ActionButtons>
  <ActionButton type="view" onClick={() => handleView(theater)} />
  <ActionButton type="edit" onClick={() => handleEdit(theater)} />
  <ActionButton type="delete" onClick={() => handleDelete(theater)} />
</ActionButtons>
```

### User Management
```javascript
<ActionButtons>
  <ActionButton type="view" onClick={() => handleView(user)} />
  <ActionButton type="password" onClick={() => handlePassword(user)} />
</ActionButtons>
```

## Customization

To add new button types, update the `ActionButton` component:

1. Add the new type to the `getButtonClass()` function
2. Add the icon in `getDefaultIcon()`
3. Add the default title in `getDefaultTitle()`
4. Add CSS styling in `action-buttons.css`

## Best Practices

1. **Always use ActionButtons container** for multiple buttons
2. **Provide meaningful titles** for accessibility
3. **Use appropriate button types** for their intended purpose
4. **Handle loading and disabled states** for better UX
5. **Test on mobile devices** to ensure proper sizing