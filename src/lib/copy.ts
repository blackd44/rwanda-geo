/**
 * Copies text to the clipboard
 * @param text - The text to copy to the clipboard
 * @returns Promise that resolves when the text has been copied, or rejects on error
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error("Failed to copy to clipboard:", err);
    throw err;
  }
}
