export const BOARDS = new Set([
  "a","b","c","d","e","f","g","gif","h","hr","k","m","o","p","r","s","t","u","v","vg","vm","vmg","vr","vrpg","vst","w","wg","i","ic","r9k","s4s","vip","qa","cm","hm","lgbt","y","3","aco","adv","an","bant","biz","cgl","ck","co","diy","fa","fit","gd","hc","his","int","jp","lit","mlp","mu","n","news","out","po","pol","pw","qst","sci","soc","sp","tg","toy","trv","tv","vp","vt","wsg","wsr","x","xs"
]);

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
