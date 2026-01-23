---
description: CDP Master browser automation workflow - no subagent dependency
---

# CDP Master Workflow

## 1. Connect
```python
cdp = CDPClient()
await cdp.connect()
```

## 2. Analyze Page
```
analyze
```
- Screenshot captured
- Check for overlays/popups

## 3. Prepare Viewport (fixes coordinates)
```
viewport
```

## 4. Dismiss Popups (if any)
```
popups
```

## 5. Navigate (if needed)
```
navigate https://target-url.com
```

## 6. Interact
// turbo
```
click input#searchbox
type input#searchbox search term
```

## 7. Extract Data
```
eval [...document.querySelectorAll('selector')].map(el => el.innerText)
```

## 8. Screenshot to Verify
```
screenshot
```

## CDP Commands Reference:
- `navigate <url>` - Go to URL
- `screenshot` - Capture page  
- `analyze` - Screenshot + page state
- `viewport` - Set 1280x720
- `popups` - Dismiss overlays
- `click <selector>` - Smart click
- `pixelclick <x> <y>` - Direct coords
- `type <sel> <text>` - Keystroke typing
- `eval <js>` - Run JavaScript
- `scroll <y>` - Scroll page
- `quit` - Exit

## Rules:
1. Always analyze first
2. Set viewport before pixel clicks
3. Use Input.insertText for typing (triggers React)
4. Wait between actions
5. Extract data via evaluate()
