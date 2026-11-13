/**
 * Convert HTML content from Mentari forum posts/replies into clean plain text
 * preserving line breaks and bullet lists safely without raw HTML injection.
 */
export function formatHtmlToText(rawHtml) {
  if (!rawHtml) return "";
  if (typeof DOMParser !== "undefined") {
    try {
      const doc = new DOMParser().parseFromString(rawHtml, "text/html");
      doc.querySelectorAll("br").forEach((el) => el.replaceWith("\n"));
      doc.querySelectorAll("p").forEach((el) => el.append("\n\n"));
      doc.querySelectorAll("li").forEach((el) => {
        el.prepend("• ");
        el.append("\n");
      });
      return (doc.body.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
    } catch {
      // Fallback to raw text
    }
  }
  return String(rawHtml).trim();
}
