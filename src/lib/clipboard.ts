/**
 * Copies text, falling back when the clipboard API is unavailable.
 *
 * Mobile browsers refuse navigator.clipboard outside a trusted gesture, or when
 * the page is not focused, and answer with a rejected promise rather than
 * anything useful. The hidden-textarea route still works in those cases, which
 * matters here: copying a link is most of what the admin is for.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through
  }

  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length);
    const copied = document.execCommand("copy");
    document.body.removeChild(area);
    return copied;
  } catch {
    return false;
  }
}
