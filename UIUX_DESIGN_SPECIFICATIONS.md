# UI/UX Designer Specifications
## Telegram Raffle Stars - Design System & Requirements

### Project Context
You are the **UI/UX Designer** for the Telegram Raffle Stars HTML5 game. This document contains all design specifications, user experience requirements, and visual guidelines needed to create the game interface.

**Reference Documents**:
- `CLAUDE.md` - Updated UI specifications from user
- `PROJECT_COORDINATION_PLAN.md` - Team coordination timeline
- `FULLSTACK_HANDOFF_SPECIFICATIONS.md` - Technical implementation requirements

---

## Design System Overview

### Platform Context
- **Target Platform**: Telegram HTML5 Game (NOT Mini App)
- **Launch Method**: Via `/game` command in Telegram bot
- **Primary Device**: Mobile (portrait orientation)
- **Secondary**: Desktop web browsers
- **Framework**: Vanilla HTML5/CSS/JS (no frameworks)

### Brand Identity
- **Game Name**: Telegram Raffle Stars
- **Currency**: Telegram Stars (⭐)
- **Theme**: Financial gaming with transparency and trust
- **Personality**: Simple, trustworthy, exciting, fair

---

## User Interface Specifications

### Layout Structure (Mobile-First)
```
┌─────────────────────────────┐
│    ⭐ 123      👥 7/10      │  <- Top Section (Status Bar)
│                             │
│                             │
│           ┌─────┐           │
│           │     │           │  <- Center Section (1/3 height)
│           │ BID │           │     Large Orange Button
│           │  ⭐  │           │
│           └─────┘           │
│                             │
│                             │
│  ⭐123  👥7/10  📊567  📖   │  <- Bottom Section (Stats + Rules)
│  Stars Active  Total Rules  │
└─────────────────────────────┘
```

### Component Specifications

#### 1. Top Status Section
**Layout**: Horizontal flex container with space-between
**Height**: 60px
**Padding**: 20px horizontal, 15px vertical

**Left Element - Player Stars Count**:
- **Icon**: ⭐ (Telegram star emoji)
- **Text**: User's current star balance
- **Font**: Telegram system font, 18px, medium weight
- **Color**: Primary text color with star in Telegram yellow (#FFA500)
- **Spacing**: 8px gap between icon and text

**Right Element - Active Players Count**:
- **Icon**: 👥 (People emoji) OR custom SVG person icon
- **Text**: "X/Y" format (current/required participants)
- **Font**: Telegram system font, 18px, medium weight
- **Color**: Primary text color with icon in Telegram blue (#0088cc)
- **Spacing**: 8px gap between icon and text

#### 2. Center BID Button
**Dimensions**: 
- Width: min(200px, 40% of viewport width)
- Height: Equal to width (perfect circle)
- Maximum size: 250px diameter

**Positioning**:
- Centered horizontally and vertically in available space
- Takes up approximately 1/3 of screen height
- Minimum 40px margin from screen edges

**Visual Properties**:
- **Background**: Orange (#FF6B35 or designer's choice)
- **Text**: High contrast color (white or dark text)
- **Font**: Telegram system font, bold, 24px
- **Text Content**: "BID 1 ⭐" or "BID" with star icon
- **Border**: None or subtle border radius for depth
- **Shadow**: Optional subtle drop shadow for depth
- **Border Radius**: 50% (perfect circle)

**Interactive States**:
- **Default**: Orange background with subtle shadow
- **Hover**: 5% scale increase, slightly darker orange
- **Active**: 2% scale decrease, pressed effect
- **Disabled**: Gray background (#CCCCCC), no interaction
- **Loading**: Spinning animation or loading indicator

#### 3. Bottom Statistics Section
**Layout**: 4-column grid with equal spacing
**Height**: 80px
**Padding**: 15px horizontal, 10px vertical

**Grid Structure**:
```css
display: grid;
grid-template-columns: 1fr 1fr 1fr 1fr;
gap: 10px;
```

**Individual Stat Items**:

**Column 1 - Player Stars**:
- **Value**: User's star count (large number)
- **Label**: "Your Stars" or "Stars"
- **Icon**: ⭐ (above or beside value)

**Column 2 - Active Players**:
- **Value**: Current participants in active raffle
- **Label**: "Active" or "Playing"
- **Icon**: 👥 or custom player icon

**Column 3 - Total Registered**:
- **Value**: Total registered users in system
- **Label**: "Registered" or "Total"
- **Icon**: 📊 or custom chart icon

**Column 4 - Game Rules** (Clickable):
- **Value**: 📖 or "?" icon
- **Label**: "Rules"
- **Behavior**: Opens modal or navigates to rules page
- **Interactive**: Hover effects, press states

**Typography for Stats**:
- **Value**: 20px, bold, primary color
- **Label**: 14px, normal weight, secondary color
- **Alignment**: Center-aligned within each column

---

## Color Scheme & Visual Identity

### Primary Colors
- **Orange (CTA)**: #FF6B35 (or designer's choice within orange spectrum)
- **Telegram Blue**: #0088CC (for accent elements)
- **Telegram Green**: #00C853 (for success states)
- **Warning Red**: #F44336 (for errors/warnings)

### Telegram Color Variables
```css
:root {
  --tg-theme-bg-color: #ffffff;
  --tg-theme-text-color: #000000;
  --tg-theme-hint-color: #999999;
  --tg-theme-link-color: #2481cc;
  --tg-theme-button-color: #40a7e3;
  --tg-theme-button-text-color: #ffffff;
  --tg-theme-secondary-bg-color: #f1f1f1;
}

/* Dark theme support */
@media (prefers-color-scheme: dark) {
  :root {
    --tg-theme-bg-color: #212121;
    --tg-theme-text-color: #ffffff;
    --tg-theme-hint-color: #708499;
    --tg-theme-link-color: #6ab7ff;
    --tg-theme-button-color: #5288c1;
    --tg-theme-button-text-color: #ffffff;
    --tg-theme-secondary-bg-color: #0f0f0f;
  }
}
```

### Background & Surface Colors
- **Primary Background**: Telegram theme background (light/dark adaptive)
- **Secondary Background**: Slightly darker/lighter than primary
- **Surface**: Card-like elements with subtle elevation
- **Border**: Light gray (#E0E0E0) in light mode, dark gray in dark mode

---

## Typography System

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
             Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
```

### Type Scale
- **Headline (Button)**: 24px, bold, high contrast
- **Title (Stats Values)**: 20px, bold, primary color
- **Body (Stats Labels)**: 14px, normal, secondary color
- **Caption (Top Status)**: 18px, medium, primary color

### Text Colors
- **Primary**: Telegram theme text color (adaptive)
- **Secondary**: Telegram hint color (muted)
- **Accent**: Telegram link color (blue)
- **Success**: Green (#00C853)
- **Error**: Red (#F44336)

---

## Responsive Design Requirements

### Mobile Portrait (Primary)
- **Viewport**: 360px - 428px width
- **Button Size**: 180px - 220px diameter
- **Top Section Height**: 60px
- **Bottom Section Height**: 80px
- **Margins**: 20px horizontal

### Mobile Landscape
- **Viewport**: 568px - 926px width
- **Adjust button size to fit screen height
- **Maintain aspect ratios and proportions

### Desktop/Tablet
- **Max Width**: 480px (centered)
- **Scale up fonts and spacing proportionally
- **Maintain mobile-first design principles

### Responsive Breakpoints
```css
/* Mobile First */
.container {
  max-width: 100%;
  padding: 20px;
}

/* Small tablets */
@media (min-width: 576px) {
  .container {
    max-width: 480px;
    margin: 0 auto;
  }
}

/* Large tablets and desktop */
@media (min-width: 768px) {
  .bid-button {
    max-width: 250px;
    max-height: 250px;
  }
}
```

---

## Interactive Design Patterns

### Button States & Animations
```css
.bid-button {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}

.bid-button:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 20px rgba(255, 107, 53, 0.3);
}

.bid-button:active {
  transform: scale(0.98);
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.2);
}

.bid-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
```

### Loading States
- **Button Loading**: Spinner inside button with "Processing..." text
- **Page Loading**: Skeleton screens for data loading
- **Real-time Updates**: Smooth number transitions for count changes

### Error States
- **Failed Bet**: Red flash animation on button
- **Connection Lost**: Banner notification at top
- **Insufficient Balance**: Disabled button with explanation tooltip

---

## Accessibility Requirements

### WCAG 2.1 AA Compliance
- **Color Contrast**: Minimum 4.5:1 ratio for text
- **Touch Targets**: Minimum 44px × 44px for interactive elements
- **Focus Indicators**: Clear keyboard navigation support
- **Screen Reader**: Semantic HTML and ARIA labels

### Implementation Details
```html
<!-- Accessible button -->
<button 
  id="bid-button" 
  class="bid-button"
  aria-label="Place bid of 1 Telegram Star"
  role="button"
  tabindex="0"
>
  BID 1 ⭐
</button>

<!-- Accessible stats -->
<div class="stat-item" role="status" aria-live="polite">
  <div class="value" aria-label="Your star balance">123</div>
  <div class="label">Your Stars</div>
</div>
```

### Color-Blind Support
- **Don't rely on color alone**: Use icons and text labels
- **High Contrast**: Ensure sufficient contrast ratios
- **Alternative Indicators**: Use shapes, patterns, or text for status

---

## Animation & Micro-Interactions

### Real-Time Updates
```css
.stat-value {
  transition: color 0.3s ease;
}

.stat-value.updated {
  color: var(--tg-theme-link-color);
  animation: flash 0.5s ease;
}

@keyframes flash {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

### Success Animations
- **Successful Bet**: Green checkmark animation
- **Winner Announcement**: Confetti or celebration animation
- **Number Updates**: Smooth counting animations

### Loading Animations
```css
.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

---

## Component Library

### Reusable Components

#### Stat Display Component
```html
<div class="stat-item" data-type="{{type}}">
  <div class="stat-icon">{{icon}}</div>
  <div class="stat-value" data-value="{{value}}">{{displayValue}}</div>
  <div class="stat-label">{{label}}</div>
</div>
```

#### Modal/Rules Component
```html
<div class="modal-overlay" id="rules-modal">
  <div class="modal-content">
    <div class="modal-header">
      <h2>Game Rules</h2>
      <button class="modal-close" aria-label="Close">&times;</button>
    </div>
    <div class="modal-body">
      <!-- Rules content -->
    </div>
  </div>
</div>
```

#### Notification Toast
```html
<div class="toast" data-type="{{type}}">
  <div class="toast-icon">{{icon}}</div>
  <div class="toast-message">{{message}}</div>
  <button class="toast-close" aria-label="Dismiss">&times;</button>
</div>
```

---

## Implementation Guidelines

### CSS Architecture
- **Methodology**: BEM (Block Element Modifier)
- **CSS Variables**: Use for theming and consistency
- **Mobile First**: Start with mobile styles, scale up
- **Performance**: Minimize reflows and repaints

### Example BEM Structure
```css
/* Block */
.bid-button { }

/* Element */
.bid-button__text { }
.bid-button__icon { }

/* Modifier */
.bid-button--disabled { }
.bid-button--loading { }

/* State */
.bid-button.is-pressed { }
```

### Asset Requirements
- **Bot Icon**: 512×512px PNG for @BotFather registration
- **Favicon**: 32×32px ICO for web browsers
- **Touch Icons**: Various sizes for mobile bookmarks
- **Loading Spinners**: SVG animations for performance

---

## Testing & Quality Assurance

### Visual Testing Checklist
- [ ] Design matches specifications exactly
- [ ] Responsive behavior on all target devices
- [ ] Color contrast meets WCAG AA standards
- [ ] Interactive states work correctly
- [ ] Animations are smooth (60fps)
- [ ] Loading states display properly
- [ ] Error states are user-friendly

### Cross-Browser Testing
- [ ] iOS Safari (primary mobile browser)
- [ ] Android Chrome (primary mobile browser)
- [ ] Desktop Chrome/Firefox/Safari
- [ ] Telegram's internal browser
- [ ] Various mobile viewport sizes

### Performance Testing
- [ ] Initial page load under 1 second
- [ ] Smooth animations (no janky frames)
- [ ] Minimal bundle size (no unnecessary assets)
- [ ] Optimized images and icons

---

## Handoff to Development

### Design Assets Delivery
1. **High-fidelity mockups** in Figma/Sketch
2. **Asset exports** (icons, images) in required formats
3. **CSS specifications** with exact values
4. **Animation specifications** with timing details
5. **Responsive breakpoints** with exact measurements

### Developer Handoff Checklist
- [ ] Pixel-perfect mockups for all screen sizes
- [ ] Interactive prototype demonstrating animations
- [ ] Complete style guide with all specifications
- [ ] Asset library with all required images/icons
- [ ] Accessibility annotations and requirements

### Communication Protocol
- **Daily sync** with Full-Stack Developer during implementation
- **Design reviews** at each milestone
- **Quick iterations** based on technical constraints
- **Final approval** before production deployment

---

## Success Metrics

### Design Quality Metrics
- **User Engagement**: Time spent on game interface
- **Conversion Rate**: Percentage of users who place bets
- **Error Rate**: User interface errors and confusion
- **Accessibility Score**: WCAG compliance rating
- **Performance Score**: Lighthouse performance rating

### User Experience Metrics
- **Task Completion**: Can users successfully place bets?
- **Interface Clarity**: Do users understand the game state?
- **Mobile Usability**: Is the interface easy to use on mobile?
- **Visual Appeal**: Does the design match Telegram's ecosystem?

---

**Document Version**: 1.0  
**Created By**: Project Manager + Memory Specialist  
**Target Recipient**: UI/UX Designer  
**Next Review**: Week 5 Design Implementation Checkpoint  
**Dependencies**: Full-Stack Developer frontend structure, DevOps deployment environment