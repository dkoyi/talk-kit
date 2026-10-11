const isMapping = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export function validateRecordings(recordings) {
  if (!isMapping(recordings)) throw Error("Invalid recordings manifest");
  for (const lines of Object.values(recordings)) {
    if (
      !isMapping(lines) ||
      Object.values(lines).some(
        (path) =>
          typeof path !== "string" ||
          !/^assets\/audio\/[a-zA-Z0-9_/-]+\.(mp3|wav|ogg)$/.test(path) ||
          path.includes(".."),
      )
    )
      throw Error("Invalid recording path");
  }
  return recordings;
}

export const recordingFor = (recordings, character, text, legacyClips = {}) =>
  recordings[character]?.[text] || legacyClips?.[text];
