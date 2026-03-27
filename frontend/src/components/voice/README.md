# Voice Input Component

Speech-to-text voice input system for SUVIDHA kiosk application.

## Quick Start

The voice input is **already integrated** in the app via `main.jsx`.

### Use the Floating Mic Button (Easiest)
1. Focus any text input
2. Click the mic button at bottom-left
3. Speak
4. Done!

### Add Inline Mic Button to a Field

```jsx
import { VoiceInputButton } from './components/voice';
import { useRef } from 'react';

const inputRef = useRef();

<Box sx={{ display: 'flex', gap: 1 }}>
  <TextField
    {...register('name')}
    inputRef={inputRef}
  />
  <VoiceInputButton
    inputRef={inputRef}
    setValue={setValue}
    fieldName="name"
  />
</Box>
```

## Components

- **VoiceInput** - Floating mic button (already added in main.jsx)
- **VoiceInputButton** - Inline mic button for specific fields
- **useVoiceInput** - Hook for custom implementations

## Languages

- English (en)
- Hindi (hi)
- Marathi (mr)

Voice language auto-syncs with UI language.

## Props

### VoiceInputButton

| Prop | Type | Description |
|------|------|-------------|
| inputRef | Ref | Ref to input element |
| setValue | Function | react-hook-form setValue |
| fieldName | String | Form field name |
| size | String | 'small', 'medium', 'large' |
| variant | String | 'default', 'outlined', 'contained' |
| onResult | Function | Custom callback for voice result |

## Full Documentation

See:
- `docs/VOICE_INPUT_GUIDE.md` - Complete user & developer guide
- `docs/VOICE_INPUT_TECHNICAL_SUMMARY.md` - Technical details
- `VoiceInputExamples.jsx` - Working code examples

## Browser Support

✅ Chrome, Edge, Safari
⚠️ Firefox (limited)
❌ IE11 (buttons hidden)

Requires HTTPS or localhost.
