/** Lets the global "/" and Cmd+K hotkeys focus whichever search box is most prominent on screen. */
const boxes = new Map()
export function registerSearchBox(id, priority, focus) { boxes.set(id, { priority, focus }); return () => boxes.delete(id) }
export function focusBestSearchBox() {
  const best = [...boxes.values()].sort((a, b) => b.priority - a.priority)[0]
  best?.focus()
}
