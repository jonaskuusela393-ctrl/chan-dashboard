export const BOARD_GROUPS = [
  {
    title: "Japanese culture",
    boards: [
      ["a", "Anime & Manga"],
      ["c", "Anime/Cute"],
      ["w", "Anime/Wallpapers"],
      ["m", "Mecha"],
      ["jp", "Otaku Culture"],
      ["vt", "Virtual YouTubers"],
    ],
  },
  {
    title: "Video games",
    boards: [
      ["v", "Video Games"],
      ["vg", "Video Game Generals"],
      ["vm", "Multiplayer Games"],
      ["vmg", "Mobile Games"],
      ["vr", "Retro Games"],
      ["vrpg", "RPGs"],
      ["vst", "Strategy Games"],
    ],
  },
  {
    title: "Creative / interests",
    boards: [
      ["co", "Comics & Cartoons"],
      ["tv", "Television & Film"],
      ["lit", "Literature"],
      ["mu", "Music"],
      ["gd", "Graphic Design"],
      ["diy", "Do It Yourself"],
      ["out", "Outdoors"],
      ["tg", "Traditional Games"],
      ["toy", "Toys"],
    ],
  },
  {
    title: "Tech / knowledge",
    boards: [
      ["g", "Technology"],
      ["sci", "Science & Math"],
      ["his", "History"],
      ["int", "International"],
      ["biz", "Business & Finance"],
      ["ck", "Food & Cooking"],
      ["fit", "Fitness"],
      ["trv", "Travel"],
    ],
  },
  {
    title: "Other",
    boards: [
      ["x", "Paranormal"],
      ["pol", "Politically Incorrect"],
      ["news", "Current News"],
      ["sp", "Sports"],
      ["an", "Animals & Nature"],
      ["adv", "Advice"],
      ["r9k", "ROBOT9001"],
      ["qa", "Question & Answer"],
    ],
  },
  {
    title: "Adult / sensitive",
    boards: [
      ["b", "Random"],
      ["gif", "Adult GIF"],
      ["s", "Sexy Beautiful Women"],
      ["hc", "Hardcore"],
      ["hm", "Handsome Men"],
      ["h", "Hentai"],
      ["e", "Ecchi"],
      ["u", "Yuri"],
      ["y", "Yaoi"],
      ["d", "Hentai/Alternative"],
      ["aco", "Adult Cartoons"],
      ["t", "Torrents"],
      ["hr", "High Resolution"],
      ["r", "Adult Requests"],
    ],
  },
  {
    title: "All extra boards",
    boards: [
      ["3", "3DCG"],
      ["aco", "Adult Cartoons"],
      ["bant", "International/Random"],
      ["cgl", "Cosplay & EGL"],
      ["cm", "Cute/Male"],
      ["fa", "Fashion"],
      ["f", "Flash"],
      ["i", "Oekaki"],
      ["ic", "Artwork/Critique"],
      ["k", "Weapons"],
      ["lgbt", "LGBT"],
      ["mlp", "Pony"],
      ["n", "Transportation"],
      ["o", "Auto"],
      ["p", "Photography"],
      ["po", "Papercraft"],
      ["pw", "Professional Wrestling"],
      ["qst", "Quests"],
      ["s4s", "Shit 4chan Says"],
      ["soc", "Social"],
      ["vp", "Pokémon"],
      ["vip", "Very Important Posts"],
      ["wg", "Wallpapers/General"],
      ["wsg", "Worksafe GIF"],
      ["wsr", "Worksafe Requests"],
      ["xs", "Extreme Sports"],
    ],
  },
] as const;

export const BOARDS: Set<string> = new Set(BOARD_GROUPS.flatMap((group) => group.boards.map(([board]) => board)));

export function cleanBoard(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").slice(0, 10).toLowerCase();
}

export function validBoard(value: string) {
  return BOARDS.has(cleanBoard(value));
}

export function cleanExt(value: unknown) {
  if (typeof value !== "string") return undefined;
  const ext = value.trim().toLowerCase();
  return /^\.(jpg|jpeg|png|gif|webm|mp4)$/.test(ext) ? ext : undefined;
}
