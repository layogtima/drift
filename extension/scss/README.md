# Drift Toolbar - SCSS Architecture

## Overview

The toolbar CSS has been refactored into a modular SCSS architecture with proper organization, zero `!important` declarations, and best-in-class maintainability.

## File Structure

```
extension/scss/
├── toolbar.scss          # Main file - compile this one!
├── _variables.scss       # Design tokens & theme values
├── _mixins.scss          # Reusable patterns & utilities  
├── _base.scss            # Root styles, theme, animations
├── _toolbar.scss         # Main toolbar container
├── _buttons.scss         # All button variants
├── _dropdowns.scss       # Dropdown system & forms
├── _user-panel.scss      # User menu & stats
└── _action-bar.scss      # Approval overlay & notifications
```

## Compiling

**With VSCode Live Sass Compiler:**
1. Open `toolbar.scss` in VSCode
2. Click "Watch Sass" in the status bar
3. It will auto-compile to `../toolbar.css`

**Manually:**
```bash
sass extension/scss/toolbar.scss extension/toolbar.css --style=compressed --no-source-map
```

## Key Improvements

### No More !important Spam
Instead of:
```css
#drift-toolbar {
  all: initial !important;
  position: fixed !important;
}
```

We use high-specificity nesting:
```scss
html body {
  #drift-toolbar {
    all: initial;
    position: fixed;
  }
}
```

This gives specificity of `(0,1,2,0)` which beats most host styles without `!important`.

### Modular Organization  
- **Variables**: All design tokens in one place
- **Mixins**: Reusable patterns (buttons, cards, etc.)
- **Components**: Separated by concern

### Maintainable Code
- Nested selectors for better readability
- No magic numbers - everything is a variable
- Clear separation of concerns
- Easy to find and modify specific components

## Editing

1. **Colors/Spacing**: Edit `_variables.scss`
2. **Button Styles**: Edit `_buttons.scss`
3. **Dropdown Forms**: Edit `_dropdowns.scss`
4. **User Panel**: Edit `_user-panel.scss`
5. **Moderation**: Edit `_action-bar.scss`

Changes in any partial will automatically recompile when using watch mode.

## Notes

- Keep `toolbar-reference.css` as backup of original
- The compiled `toolbar.css` is what the extension loads
- All CSS class names remain the same (no JS changes needed)
- Dark mode theming still works via `body[data-theme="dark"]`
