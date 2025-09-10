# Telegram Raffle Stars - Design System Documentation

## Overview

This document outlines the complete design system for the Telegram Raffle Stars game, including visual identity, component specifications, accessibility guidelines, and implementation details.

## Visual Identity

### Brand Colors

#### Primary Palette
- **Orange (Primary)**: `#FF6B35` - Main brand color for CTAs and highlights
- **Orange Hover**: `#FF8C42` - Interactive hover state
- **Orange Active**: `#E55A30` - Active/pressed state

#### Telegram Integration Colors
- **Telegram Blue**: `#0088CC` - Secondary actions and accents
- **Telegram Green**: `#00C853` - Success states and confirmations
- **Warning Red**: `#F44336` - Errors and critical actions

#### Neutral Colors
- Dynamically adapt to Telegram's theme variables for seamless integration

### Typography

#### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
             Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
```

#### Type Scale
- **Headline**: 24px, weight 700 (Main BID button)
- **Title**: 20px, weight 600 (Statistics values)
- **Caption**: 18px, weight 500 (Top status bar)
- **Body**: 14px, weight 400 (General text)
- **Small**: 12px, weight 500 (Labels)

## Layout Specifications

### Game Interface Layout

The game interface follows the exact specifications provided:

#### Top Status Section (60px height)
- **Left**: Player stars count with star icon (⭐)
- **Right**: Active players count with users icon (👥)
- **Format**: "X/Y" for current/required participants

#### Center Section (1/3 of screen height)
- **Large BID Button**: Circular, orange gradient, responsive sizing
- **Minimum Size**: 180px × 180px
- **Maximum Size**: 250px × 250px
- **Progress Bar**: Below button showing raffle completion status

#### Bottom Statistics Section (80px height)
- **Four-column grid layout**:
  1. Player stars count
  2. Active players count  
  3. Total registered users
  4. Game rules (clickable)

## Component Library

### Primary BID Button

```css
.bid-button {
  /* Responsive sizing - 1/3 of screen height with constraints */
  width: min(220px, calc(100vh * 0.25));
  height: min(220px, calc(100vh * 0.25));
  max-width: 250px;
  max-height: 250px;
  min-width: 180px;
  min-height: 180px;
  
  /* Visual Design */
  border-radius: 50%;
  background: linear-gradient(135deg, #FF6B35, #FF8C42);
  color: white;
  font-size: 24px;
  font-weight: 700;
}
```

#### Interactive States
- **Hover**: 5% scale increase with enhanced shadow
- **Active**: 2% scale decrease with reduced shadow  
- **Disabled**: Gray background, no interactions
- **Loading**: Spinner animation with status text

### Statistics Cards

```css
.bottom-stat {
  background: var(--tg-theme-secondary-bg-color);
  border-radius: 12px;
  padding: 12px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
```

#### Features
- **Hover Animation**: Subtle lift with shadow
- **Update Animation**: Flash effect for real-time changes
- **Top Border**: Animated accent line on interaction

### Progress Indicator

- **Height**: 6px
- **Background**: Theme-aware secondary color
- **Fill**: Green gradient with animated highlight
- **Animation**: Smooth width transitions (0.5s)

## Responsive Design

### Breakpoint System

```css
/* Extra small devices (< 350px) */
@media (max-width: 349px) {
  .bid-button {
    min-width: 160px;
    min-height: 160px;
  }
}

/* Medium devices (≥ 576px) */
@media (min-width: 576px) {
  .container {
    max-width: 480px;
    margin: 0 auto;
  }
}

/* Large devices (≥ 768px) */
@media (min-width: 768px) {
  .bid-button {
    max-width: 250px;
    max-height: 250px;
  }
}
```

### Orientation Support

- **Portrait**: Standard layout optimized for mobile
- **Landscape**: Compressed layout with adjusted proportions
- **Height-based scaling**: Button size adapts to available screen height

## Animation System

### Keyframes

```css
@keyframes flash {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes slideInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Micro-Interactions

- **Real-time Updates**: Flash animation for changing values
- **Button Interactions**: Scale and shadow transitions
- **Loading States**: Smooth spinner animations
- **Success States**: Celebration animations for wins

## Accessibility (WCAG 2.1 AA)

### Color Contrast
- **Text**: Minimum 4.5:1 contrast ratio
- **Interactive Elements**: High contrast for visibility
- **Focus Indicators**: 3px orange outline with 2px offset

### Touch Targets
- **Minimum Size**: 44px × 44px for all interactive elements
- **BID Button**: Exceeds minimum with 180px+ diameter
- **Statistics Cards**: Adequate touch area with padding

### Screen Reader Support

```html
<button 
  id="bidButton" 
  class="bid-button"
  aria-label="Place bid of 1 Telegram Star"
  role="button"
  tabindex="0"
>
```

### ARIA Labels
- **Live Regions**: `aria-live="polite"` for status updates
- **Progress Bar**: `role="progressbar"` with proper labeling
- **Statistical Data**: `role="status"` for live updates

## Admin Panel Design

### Visual Theme
- **Primary Color**: Consistent orange branding (`#FF6B35`)
- **Background**: Subtle gradient with geometric overlays
- **Cards**: Elevated design with gradient borders
- **Sidebar**: Glass morphism effect with gradient background

### Enhanced Features
- **Statistics Cards**: Icon overlays and gradient borders
- **Navigation**: Smooth transitions and hover effects
- **Tables**: Modern styling with hover states
- **Forms**: Consistent styling with focus states

## Assets

### Icons
- **Game Icon**: 512×512 SVG with star motif and brand colors
- **Favicon**: 32×32 simplified version for browsers
- **Apple Touch Icon**: High-resolution for mobile bookmarks

### Implementation Files

1. **game.html**: Main game interface
2. **design-system.css**: Comprehensive CSS system
3. **game.js**: Enhanced JavaScript with animations
4. **admin/index.html**: Modernized admin panel

## Browser Support

- **iOS Safari**: Primary mobile browser for Telegram
- **Android Chrome**: Primary Android browser
- **Desktop Browsers**: Chrome, Firefox, Safari, Edge
- **Telegram WebView**: Optimized for Telegram's internal browser

## Performance Considerations

- **CSS Variables**: Efficient theming and customization
- **Minimal JavaScript**: Lightweight animations and interactions
- **SVG Icons**: Scalable vector graphics for crisp display
- **Optimized Animations**: 60fps performance with hardware acceleration

## Future Enhancements

- **Dark Mode**: Enhanced dark theme support
- **Localization**: Multi-language typography support
- **Advanced Animations**: Celebration effects for winners
- **Progressive Enhancement**: Additional features for capable browsers

---

**Version**: 1.0  
**Created**: 2025-01-09  
**Last Updated**: 2025-01-09  
**Author**: UI/UX Designer - Telegram Raffle Stars Team