export function mixAdditiveColors(first: string, second: string): string {
  const firstMatch = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(first);
  const secondMatch = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(second);
  if (!firstMatch || !secondMatch) {
    throw new Error("Additive color mixing requires six-digit hex colors.");
  }

  const channels = [1, 2, 3].map((channel) => {
    const firstValue = Number.parseInt(firstMatch[channel], 16);
    const secondValue = Number.parseInt(secondMatch[channel], 16);
    const mixed = 255 * (1 - (1 - firstValue / 255) * (1 - secondValue / 255));
    return Math.round(mixed).toString(16).padStart(2, "0");
  });

  return `#${channels.join("")}`;
}
