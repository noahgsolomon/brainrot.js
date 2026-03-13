export function srtTimeToSeconds(srtTime) {
  const [hours, minutes, secondsAndMillis] = srtTime.split(":");
  const [seconds, milliseconds] = secondsAndMillis.split(",");
  return (
    Number(hours) * 3600 +
    Number(minutes) * 60 +
    Number(seconds) +
    Number(milliseconds) / 1000
  );
}

export function parseSRT(srtContent, srtFileIndex) {
  const blocks = srtContent.split("\n\n");
  const minDurationSeconds = 0.5;

  const preliminaryEntries = blocks
    .map((block) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const indexLine = lines[0];
      const timeLine = lines[1];

      if (!indexLine || !timeLine || lines.length < 3) {
        return null;
      }

      const [startTime, endTime] = timeLine
        .split(" --> ")
        .map(srtTimeToSeconds);
      const text = lines.slice(2).join(" ");

      if (!text) {
        return null;
      }

      const words = text.split(/\s+/).filter(Boolean);
      const timePerWord = (endTime - startTime) / Math.max(words.length, 1);
      const wordTimings = words.map((word, index) => ({
        word,
        start: startTime + index * timePerWord,
        end: startTime + (index + 1) * timePerWord,
      }));

      return {
        index: indexLine,
        startTime,
        endTime,
        text,
        srtFileIndex,
        wordTimings,
      };
    })
    .filter(Boolean);

  const combinedEntries = [];
  let currentEntry = null;

  for (const entry of preliminaryEntries) {
    if (!currentEntry) {
      currentEntry = entry;
      continue;
    }

    const currentDuration = currentEntry.endTime - currentEntry.startTime;
    if (currentDuration < minDurationSeconds) {
      currentEntry = {
        ...currentEntry,
        endTime: entry.endTime,
        text: `${currentEntry.text} ${entry.text}`.trim(),
        wordTimings: [...currentEntry.wordTimings, ...entry.wordTimings],
      };
      continue;
    }

    combinedEntries.push(currentEntry);
    currentEntry = entry;
  }

  if (currentEntry) {
    combinedEntries.push(currentEntry);
  }

  return combinedEntries;
}
