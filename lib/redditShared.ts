export const DEFAULT_SUBREDDITS = [
  "all",
  "popular",
  "AskReddit",
  "todayilearned",
  "NoStupidQuestions",
  "interestingasfuck",
  "technology",
  "programming",
  "anime",
  "manga",
  "movies",
  "television",
  "horror",
  "ImaginaryLandscapes",
  "Art",
  "Oilpainting",
  "Finland",
  "Helsinki",
  "OCD",
  "lonely",
  "collapse",
  "HighStrangeness",
  "Paranormal",
  "Dreams",
  "InternetIsBeautiful",
  "ObscureMedia",
] as const;

export function cleanSubreddit(value: string) {
  return value.replace(/[^a-z0-9_]/gi, "").slice(0, 80);
}

export function cleanSort(value: string) {
  const sort = value.toLowerCase();
  return ["hot", "new", "top", "rising"].includes(sort) ? sort : "hot";
}

export function cleanTime(value: string) {
  const time = value.toLowerCase();
  return ["hour", "day", "week", "month", "year", "all"].includes(time) ? time : "day";
}

export function cleanPostId(value: string) {
  return value.replace(/[^a-z0-9_]/gi, "").slice(0, 80);
}
